import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import session from 'express-session';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const workspace = {
  id: 'workspace-1',
  name: 'WaterMenu',
};

const user = {
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin',
  passwordHash: '',
  workspace,
};

describe('Auth API', () => {
  let app: INestApplication;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeAll(async () => {
    user.passwordHash = await argon2.hash('right-password');

    prisma = {
      user: {
        findUnique: jest.fn(({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email === user.email || where.id === user.id) {
            return Promise.resolve(user);
          }

          return Promise.resolve(null);
        }),
      },
    };

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
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('未登录访问 me 返回 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('正确密码登录后设置 cookie，并可访问 me', async () => {
    const agent = request.agent(app.getHttpServer());

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: user.email, password: 'right-password' })
      .expect(200);

    expect(loginRes.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('watermenu.sid')]),
    );
    expect(loginRes.body).toEqual({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspace,
    });
    expect(JSON.stringify(loginRes.body)).not.toContain('password');
    expect(JSON.stringify(loginRes.body)).not.toContain('passwordHash');

    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          workspace,
        });
      });
  });

  it('错误密码返回 401，且不泄露原因', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });

  it('不存在用户返回 401，且不泄露原因', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: 'right-password' })
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });

  it('logout 后原 cookie 不能继续访问 me', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/auth/login')
      .send({ email: user.email, password: 'right-password' })
      .expect(200);

    await agent.post('/api/auth/logout').expect(200).expect({ ok: true });

    await agent.get('/api/auth/me').expect(401);
  });
});
