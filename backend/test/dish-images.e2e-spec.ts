import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const workspace = {
  id: 'workspace-1',
  name: 'WaterMenu',
};

const otherWorkspace = {
  id: 'workspace-2',
  name: 'Other',
};

const user = {
  id: 'user-1',
  workspaceId: workspace.id,
};

const otherUser = {
  id: 'user-2',
  workspaceId: otherWorkspace.id,
};

type Dish = {
  id: string;
  workspaceId: string;
  name: string;
};

type DishImage = {
  id: string;
  workspaceId: string;
  dishId: string;
  storageKey: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  sortOrder: number;
  isCover: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

describe('Dish images API', () => {
  let app: INestApplication;
  let uploadsDir: string;
  let dishes: Dish[];
  let images: DishImage[];
  let prisma: {
    user: { findUnique: jest.Mock };
    dish: { findFirst: jest.Mock };
    dishImage: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeAll(async () => {
    uploadsDir = await mkdtemp(path.join(tmpdir(), 'watermenu-images-'));
    process.env.UPLOADS_DIR = uploadsDir;
    dishes = [];
    images = [];

    prisma = {
      user: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) => {
          if (where.id === user.id) {
            return Promise.resolve(user);
          }
          if (where.id === otherUser.id) {
            return Promise.resolve(otherUser);
          }
          return Promise.resolve(null);
        }),
      },
      dish: {
        findFirst: jest.fn(({ where }: { where: { id: string; workspaceId: string } }) => {
          return Promise.resolve(
            dishes.find((dish) => dish.id === where.id && dish.workspaceId === where.workspaceId) ?? null,
          );
        }),
      },
      dishImage: {
        findMany: jest.fn(({ where }: { where: { workspaceId: string; dishId: string } }) => {
          return Promise.resolve(
            images
              .filter((image) => image.workspaceId === where.workspaceId && image.dishId === where.dishId)
              .sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.getTime() - right.createdAt.getTime()),
          );
        }),
        count: jest.fn(({ where }: { where: { workspaceId: string; dishId: string } }) => {
          return Promise.resolve(
            images.filter((image) => image.workspaceId === where.workspaceId && image.dishId === where.dishId).length,
          );
        }),
        create: jest.fn(({ data }: { data: Omit<DishImage, 'id' | 'createdAt' | 'updatedAt'> }) => {
          const now = new Date(Date.UTC(2026, 5, 8, 0, images.length));
          const image = {
            id: `image-${images.length + 1}`,
            ...data,
            createdAt: now,
            updatedAt: now,
          };
          images.push(image);
          return Promise.resolve(image);
        }),
        updateMany: jest.fn(({ where, data }: { where: { workspaceId: string; dishId: string; isCover?: boolean }; data: Partial<DishImage> }) => {
          let count = 0;
          for (const image of images) {
            if (
              image.workspaceId === where.workspaceId &&
              image.dishId === where.dishId &&
              (where.isCover === undefined || image.isCover === where.isCover)
            ) {
              Object.assign(image, data, { updatedAt: new Date() });
              count += 1;
            }
          }
          return Promise.resolve({ count });
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<DishImage> }) => {
          const image = images.find((item) => item.id === where.id);
          if (!image) {
            return Promise.resolve(null);
          }
          Object.assign(image, data, { updatedAt: new Date() });
          return Promise.resolve(image);
        }),
        delete: jest.fn(({ where }: { where: { id: string } }) => {
          const index = images.findIndex((image) => image.id === where.id);
          const [deleted] = images.splice(index, 1);
          return Promise.resolve(deleted);
        }),
        findFirst: jest.fn(({ where }: { where: { id?: string; workspaceId: string; dishId?: string } }) => {
          return Promise.resolve(
            images
              .filter((image) => {
                if (where.id && image.id !== where.id) {
                  return false;
                }
                if (image.workspaceId !== where.workspaceId) {
                  return false;
                }
                if (where.dishId && image.dishId !== where.dishId) {
                  return false;
                }
                return true;
              })
              .sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.getTime() - right.createdAt.getTime())[0] ?? null,
          );
        }),
      },
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) => callback(prisma)),
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

  beforeEach(async () => {
    dishes = [
      { id: 'dish-1', workspaceId: workspace.id, name: '番茄炒蛋' },
      { id: 'dish-2', workspaceId: otherWorkspace.id, name: '他人菜品' },
    ];
    images.length = 0;
    await rm(path.join(uploadsDir, 'dish-images'), { recursive: true, force: true });
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadsDir, { recursive: true, force: true });
    delete process.env.UPLOADS_DIR;
  });

  function loginAs(userId: string) {
    const server = app.getHttpServer();

    return {
      get: (url: string) => request(server).get(url).set('x-test-user-id', userId),
      post: (url: string) => request(server).post(url).set('x-test-user-id', userId),
      patch: (url: string) => request(server).patch(url).set('x-test-user-id', userId),
      delete: (url: string) => request(server).delete(url).set('x-test-user-id', userId),
    };
  }

  function uploadImage(agent = loginAs(user.id), dishId = 'dish-1') {
    return agent.post(`/api/dishes/${dishId}/images`).attach('file', pngBuffer, {
      filename: 'dish.png',
      contentType: 'image/png',
    });
  }

  it('未登录访问图片 API 返回 401', async () => {
    await request(app.getHttpServer()).get('/api/dishes/dish-1/images').expect(401);
    await request(app.getHttpServer()).post('/api/dishes/dish-1/images').expect(401);
  });

  it('上传图片保存元数据、写入文件，并第一张自动设为封面', async () => {
    await uploadImage()
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'image-1',
          workspaceId: workspace.id,
          dishId: 'dish-1',
          mimeType: 'image/png',
          width: 1,
          height: 1,
          sortOrder: 0,
          isCover: true,
          fileUrl: '/api/dish-images/image-1/file',
        });
        expect(body.storageKey).toContain(`dish-images/${workspace.id}/dish-1/`);
      });

    expect(images).toHaveLength(1);
    await expect(readFile(path.join(uploadsDir, images[0].storageKey))).resolves.toEqual(pngBuffer);
  });

  it('列表和文件读取按 workspace 隔离', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    await uploadImage(agent).expect(201);

    await agent.get('/api/dishes/dish-1/images').expect(200).expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe('image-1');
    });
    await otherAgent.get('/api/dishes/dish-1/images').expect(404);
    await otherAgent.get('/api/dish-images/image-1/file').expect(404);
    await agent.get('/api/dish-images/image-1/file').expect(200).expect('Content-Type', /image\/png/);
  });

  it('拒绝非法类型、伪造 MIME 和超过 9 张，并清理超限落盘文件', async () => {
    const agent = loginAs(user.id);

    await agent
      .post('/api/dishes/dish-1/images')
      .attach('file', Buffer.from('hello'), { filename: 'dish.txt', contentType: 'text/plain' })
      .expect(400);

    await agent
      .post('/api/dishes/dish-1/images')
      .attach('file', pngBuffer, { filename: 'dish.jpg', contentType: 'image/jpeg' })
      .expect(400);

    for (let i = 0; i < 9; i += 1) {
      await uploadImage(agent).expect(201);
    }
    const before = await readFile(path.join(uploadsDir, images[0].storageKey));
    expect(before).toEqual(pngBuffer);

    await uploadImage(agent).expect(400);
    expect(images).toHaveLength(9);
  });

  it('设置封面只影响当前菜品图片', async () => {
    const agent = loginAs(user.id);

    await uploadImage(agent).expect(201);
    await uploadImage(agent).expect(201);

    await agent.patch('/api/dish-images/image-2/cover').send({}).expect(200).expect(({ body }) => {
      expect(body.id).toBe('image-2');
      expect(body.isCover).toBe(true);
    });

    expect(images.find((image) => image.id === 'image-1')?.isCover).toBe(false);
    expect(images.find((image) => image.id === 'image-2')?.isCover).toBe(true);
  });

  it('删除图片会删除文件，删除封面后自动补选最早剩余图片', async () => {
    const agent = loginAs(user.id);

    await uploadImage(agent).expect(201);
    await uploadImage(agent).expect(201);
    const deletedPath = path.join(uploadsDir, images[0].storageKey);

    await agent.delete('/api/dish-images/image-1').expect(200).expect({ ok: true });

    await expect(readFile(deletedPath)).rejects.toThrow();
    expect(images.map((image) => ({ id: image.id, isCover: image.isCover }))).toEqual([
      { id: 'image-2', isCover: true },
    ]);
  });

  it('删除其他 workspace 图片返回 404', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    await uploadImage(agent).expect(201);

    await otherAgent.patch('/api/dish-images/image-1/cover').send({}).expect(404);
    await otherAgent.delete('/api/dish-images/image-1').expect(404);
  });

  it('文件记录存在但本地文件缺失时返回 404', async () => {
    const agent = loginAs(user.id);

    await uploadImage(agent).expect(201);
    await rm(path.join(uploadsDir, images[0].storageKey), { force: true });

    await agent.get('/api/dish-images/image-1/file').expect(404);
  });
});
