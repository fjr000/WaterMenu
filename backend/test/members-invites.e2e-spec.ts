import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

type TestWorkspace = {
  id: string;
  name: string;
};

type TestUser = {
  id: string;
  workspaceId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  workspace: TestWorkspace;
  createdAt: Date;
  updatedAt: Date;
};

type TestInvite = {
  id: string;
  workspaceId: string;
  tokenHash: string;
  createdByUserId: string;
  expiresAt: Date;
  usedAt: Date | null;
  usedByUserId: string | null;
  revokedAt: Date | null;
  workspace: TestWorkspace;
  createdAt: Date;
  updatedAt: Date;
};

describe('Members and Invites API', () => {
  let app: INestApplication;
  let users: TestUser[];
  let invites: TestInvite[];
  let userSeq: number;
  let inviteSeq: number;
  let prisma: {
    $transaction: jest.Mock;
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    workspaceInvite: {
      count: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const workspace = { id: 'workspace-1', name: 'WaterMenu' };
  const otherWorkspace = { id: 'workspace-2', name: 'Other' };
  const admin = makeUser('admin-1', workspace, 'admin@example.com', 'Admin', UserRole.ADMIN);
  const member = makeUser('member-1', workspace, 'member@example.com', 'Member', UserRole.MEMBER);
  const otherAdmin = makeUser('admin-2', otherWorkspace, 'other@example.com', 'Other', UserRole.ADMIN);

  beforeAll(async () => {
    prisma = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(
      session({
        name: 'watermenu.sid',
        secret: 'test-session-secret-at-least-32-characters',
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
        },
      }),
    );
    app.use((request: Request, _response: Response, next: NextFunction) => {
      const userId = request.header('x-test-user-id');
      if (userId) {
        request.session.userId = userId;
      }
      next();
    });
    setupApp(app);
    await app.init();
  });

  beforeEach(() => {
    users = [admin, member, otherAdmin].map((user) => ({ ...user }));
    invites = [];
    userSeq = 1;
    inviteSeq = 1;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function loginAs(userId: string) {
    const server = app.getHttpServer();

    return {
      get: (url: string) => request(server).get(url).set('x-test-user-id', userId),
      post: (url: string) => request(server).post(url).set('x-test-user-id', userId),
      delete: (url: string) => request(server).delete(url).set('x-test-user-id', userId),
    };
  }

  function createPrismaMock() {
    const mock = {
      $transaction: jest.fn(),
      user: {
        findUnique: jest.fn(({ where }: { where: { id?: string; email?: string } }) => {
          const user = users.find((item) => item.id === where.id || item.email === where.email);
          return Promise.resolve(user ?? null);
        }),
        findMany: jest.fn(({ where }: { where: { workspaceId: string } }) =>
          Promise.resolve(
            users
              .filter((user) => user.workspaceId === where.workspaceId)
              .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id)),
          ),
        ),
        create: jest.fn(
          ({ data }: { data: { workspaceId: string; email: string; name: string; passwordHash: string; role: UserRole } }) => {
            if (users.some((user) => user.email === data.email)) {
              throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: 'test',
              });
            }

            const now = new Date();
            const workspaceForUser = data.workspaceId === workspace.id ? workspace : otherWorkspace;
            const user: TestUser = {
              id: `created-user-${userSeq++}`,
              workspaceId: data.workspaceId,
              email: data.email,
              name: data.name,
              passwordHash: data.passwordHash,
              role: data.role,
              workspace: workspaceForUser,
              createdAt: now,
              updatedAt: now,
            };
            users.push(user);
            return Promise.resolve(user);
          },
        ),
      },
      workspaceInvite: {
        count: jest.fn(({ where }: { where: PendingWhere }) =>
          Promise.resolve(invites.filter((invite) => isPendingInvite(invite, where)).length),
        ),
        findMany: jest.fn(({ where }: { where: PendingWhere }) =>
          Promise.resolve(
            invites
              .filter((invite) => isPendingInvite(invite, where))
              .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id))
              .map(({ id, createdAt, expiresAt }) => ({ id, createdAt, expiresAt })),
          ),
        ),
        create: jest.fn(
          ({ data }: { data: { workspaceId: string; createdByUserId: string; tokenHash: string; expiresAt: Date } }) => {
            const now = new Date();
            const workspaceForInvite = data.workspaceId === workspace.id ? workspace : otherWorkspace;
            const invite: TestInvite = {
              id: `invite-${inviteSeq++}`,
              workspaceId: data.workspaceId,
              tokenHash: data.tokenHash,
              createdByUserId: data.createdByUserId,
              expiresAt: data.expiresAt,
              usedAt: null,
              usedByUserId: null,
              revokedAt: null,
              workspace: workspaceForInvite,
              createdAt: now,
              updatedAt: now,
            };
            invites.push(invite);
            return Promise.resolve({ id: invite.id, createdAt: invite.createdAt, expiresAt: invite.expiresAt });
          },
        ),
        findFirst: jest.fn(({ where }: { where: PendingWhere & { id: string } }) => {
          const invite = invites.find((item) => item.id === where.id && isPendingInvite(item, where));
          return Promise.resolve(invite ? { id: invite.id } : null);
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<TestInvite> }) => {
          const invite = invites.find((item) => item.id === where.id);
          if (!invite) {
            return Promise.resolve(null);
          }
          Object.assign(invite, data, { updatedAt: new Date() });
          return Promise.resolve(invite);
        }),
        updateMany: jest.fn(({ where, data }: { where: PendingWhere & { id: string }; data: Partial<TestInvite> }) => {
          const invite = invites.find((item) => item.id === where.id && isPendingInvite(item, where));
          if (!invite) {
            return Promise.resolve({ count: 0 });
          }
          Object.assign(invite, data, { updatedAt: new Date() });
          return Promise.resolve({ count: 1 });
        }),
        findUnique: jest.fn(({ where }: { where: { tokenHash: string } }) => {
          const invite = invites.find((item) => item.tokenHash === where.tokenHash);
          return Promise.resolve(invite ?? null);
        }),
      },
    };

    mock.$transaction.mockImplementation((callback: (tx: typeof mock) => unknown) => callback(mock));

    return mock;
  }

  it('成员列表按角色控制邮箱字段，并只返回当前 workspace 成员', async () => {
    await loginAs(admin.id)
      .get('/api/members')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: admin.id, email: admin.email, role: UserRole.ADMIN }),
            expect.objectContaining({ id: member.id, email: member.email, role: UserRole.MEMBER }),
          ]),
        );
        expect(body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: otherAdmin.id })]));
      });

    await loginAs(member.id)
      .get('/api/members')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
        expect(body[0]).not.toHaveProperty('email');
        expect(body[1]).not.toHaveProperty('email');
      });
  });

  it('只有 ADMIN 能创建邀请，且数据库只保存 token 哈希', async () => {
    await loginAs(member.id).post('/api/invites').send({}).expect(403);

    await loginAs(admin.id)
      .post('/api/invites')
      .set('Origin', 'https://watermenu.test')
      .send({})
      .expect(201)
      .expect(({ body }) => {
        expect(body.inviteLink).toMatch(/^https:\/\/watermenu\.test\/invite\/.+/);
        const token = String(body.inviteLink).split('/invite/')[1];
        expect(invites[0]?.tokenHash).toBe(hashToken(token));
        expect(invites[0]?.tokenHash).not.toBe(token);
      });
  });

  it('邀请列表只返回当前 workspace 待处理邀请，且达到 10 个后拒绝继续创建', async () => {
    const adminAgent = loginAs(admin.id);
    const memberAgent = loginAs(member.id);

    for (let index = 0; index < 10; index += 1) {
      await adminAgent.post('/api/invites').send({}).expect(201);
    }

    await adminAgent.post('/api/invites').send({}).expect(409);

    invites.push(makeInvite('other-invite', otherWorkspace.id, otherAdmin.id, 'other-token', futureDate(), otherWorkspace));
    invites[0]!.usedAt = new Date();
    invites[1]!.revokedAt = new Date();
    invites[2]!.expiresAt = pastDate();

    await adminAgent
      .get('/api/invites')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(7);
        expect(JSON.stringify(body)).not.toContain('inviteLink');
        expect(body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'other-invite' })]));
      });

    await memberAgent.get('/api/invites').expect(403);
  });

  it('可撤销未使用邀请，撤销后不能预览为有效或接受', async () => {
    const createRes = await loginAs(admin.id).post('/api/invites').send({}).expect(201);
    const token = String(createRes.body.inviteLink).split('/invite/')[1];

    await loginAs(admin.id).delete(`/api/invites/${createRes.body.id}`).expect(200).expect({ ok: true });

    await request(app.getHttpServer())
      .get(`/api/invites/${token}/preview`)
      .expect(200)
      .expect({ canAccept: false, reason: 'REVOKED' });

    await request(app.getHttpServer())
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'New', email: 'new@example.com', password: 'password-1' })
      .expect(400);
  });

  it('接受邀请会创建 MEMBER、标记 used、写入 session，并拒绝重复邮箱和重复使用', async () => {
    const createRes = await loginAs(admin.id).post('/api/invites').send({}).expect(201);
    const token = String(createRes.body.inviteLink).split('/invite/')[1];

    await request(app.getHttpServer())
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'Dup', email: admin.email, password: 'password-1' })
      .expect(409);

    const agent = request.agent(app.getHttpServer());
    await agent
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'New Member', email: 'new@example.com', password: 'password-1' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          user: {
            email: 'new@example.com',
            name: 'New Member',
            role: UserRole.MEMBER,
          },
          workspace,
        });
      });

    const createdUser = users.find((user) => user.email === 'new@example.com');
    expect(createdUser).toMatchObject({ workspaceId: workspace.id, role: UserRole.MEMBER });
    expect(invites[0]).toMatchObject({ usedByUserId: createdUser?.id });
    expect(invites[0]?.usedAt).toBeInstanceOf(Date);

    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.email).toBe('new@example.com');
        expect(body.workspace).toEqual(workspace);
      });

    await request(app.getHttpServer())
      .get(`/api/invites/${token}/preview`)
      .expect(200)
      .expect({ canAccept: false, reason: 'USED' });

    await request(app.getHttpServer())
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'Again', email: 'again@example.com', password: 'password-1' })
      .expect(400);
  });

  it('预览会区分过期、已使用、已撤销，并隐藏不存在 token 细节', async () => {
    const expired = makeInvite('expired', workspace.id, admin.id, 'expired-token', pastDate(), workspace);
    const used = makeInvite('used', workspace.id, admin.id, 'used-token', futureDate(), workspace);
    used.usedAt = new Date();
    const revoked = makeInvite('revoked', workspace.id, admin.id, 'revoked-token', futureDate(), workspace);
    revoked.revokedAt = new Date();
    invites.push(expired, used, revoked);

    await request(app.getHttpServer())
      .get('/api/invites/expired-token/preview')
      .expect(200)
      .expect({ canAccept: false, reason: 'EXPIRED' });

    await request(app.getHttpServer())
      .get('/api/invites/used-token/preview')
      .expect(200)
      .expect({ canAccept: false, reason: 'USED' });

    await request(app.getHttpServer())
      .get('/api/invites/revoked-token/preview')
      .expect(200)
      .expect({ canAccept: false, reason: 'REVOKED' });

    await request(app.getHttpServer())
      .get('/api/invites/missing-token/preview')
      .expect(200)
      .expect({ canAccept: false, reason: 'UNAVAILABLE' });
  });

  it('已登录用户不能接受邀请，短密码由 DTO 拒绝', async () => {
    const createRes = await loginAs(admin.id).post('/api/invites').send({}).expect(201);
    const token = String(createRes.body.inviteLink).split('/invite/')[1];

    await loginAs(member.id)
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'Logged In', email: 'logged@example.com', password: 'password-1' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/invites/${token}/accept`)
      .send({ name: 'Short', email: 'short@example.com', password: 'short' })
      .expect(400);
  });
});

type PendingWhere = {
  workspaceId: string;
  usedAt: null;
  revokedAt: null;
  expiresAt: { gt: Date };
};

function makeUser(id: string, workspace: TestWorkspace, email: string, name: string, role: UserRole): TestUser {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id,
    workspaceId: workspace.id,
    email,
    name,
    passwordHash: 'hash',
    role,
    workspace,
    createdAt: now,
    updatedAt: now,
  };
}

function makeInvite(
  id: string,
  workspaceId: string,
  createdByUserId: string,
  token: string,
  expiresAt: Date,
  workspace: TestWorkspace,
): TestInvite {
  const now = new Date();
  return {
    id,
    workspaceId,
    tokenHash: hashToken(token),
    createdByUserId,
    expiresAt,
    usedAt: null,
    usedByUserId: null,
    revokedAt: null,
    workspace,
    createdAt: now,
    updatedAt: now,
  };
}

function isPendingInvite(invite: TestInvite, where: PendingWhere) {
  return (
    invite.workspaceId === where.workspaceId &&
    invite.usedAt === where.usedAt &&
    invite.revokedAt === where.revokedAt &&
    invite.expiresAt.getTime() > where.expiresAt.gt.getTime()
  );
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function futureDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function pastDate() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}
