import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MealType, Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
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
  description?: string | null;
  mealTypes: MealType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

describe('Dishes API', () => {
  let app: INestApplication;
  let dishes: Dish[];
  let prisma: {
    user: { findUnique: jest.Mock };
    dish: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeAll(async () => {
    dishes = [];
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
        findMany: jest.fn(
          ({ where }: { where: { workspaceId: string; mealTypes?: { has: MealType }; isActive?: boolean } }) => {
            return Promise.resolve(
              dishes.filter((dish) => {
                if (dish.workspaceId !== where.workspaceId) {
                return false;
              }
              if (where.mealTypes?.has && !dish.mealTypes.includes(where.mealTypes.has)) {
                return false;
              }
              if (where.isActive !== undefined && dish.isActive !== where.isActive) {
                return false;
              }
                return true;
              }),
            );
          },
        ),
        create: jest.fn(({ data }: { data: Pick<Dish, 'workspaceId' | 'name' | 'mealTypes' | 'isActive'> & { description?: string } }) => {
          if (
            dishes.some((dish) => dish.workspaceId === data.workspaceId && dish.name === data.name)
          ) {
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: 'test',
            });
          }

          const now = new Date();
          const dish = {
            id: `dish-${dishes.length + 1}`,
            workspaceId: data.workspaceId,
            name: data.name,
            description: data.description ?? null,
            mealTypes: data.mealTypes,
            isActive: data.isActive,
            createdAt: now,
            updatedAt: now,
          };
          dishes.push(dish);
          return Promise.resolve(dish);
        }),
        findFirst: jest.fn(({ where, select }: { where: { id: string; workspaceId: string }; select?: { id?: boolean } }) => {
          const dish = dishes.find(
            (item) => item.id === where.id && item.workspaceId === where.workspaceId,
          );

          if (!dish) {
            return Promise.resolve(null);
          }

          if (select?.id) {
            return Promise.resolve({ id: dish.id });
          }

          return Promise.resolve(dish);
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<Pick<Dish, 'name' | 'description' | 'mealTypes' | 'isActive'>> }) => {
          const dish = dishes.find((item) => item.id === where.id);
          if (!dish) {
            return Promise.resolve(null);
          }

          Object.assign(dish, {
            name: data.name ?? dish.name,
            description: data.description === undefined ? dish.description : data.description,
            mealTypes: data.mealTypes ?? dish.mealTypes,
            isActive: data.isActive ?? dish.isActive,
            updatedAt: new Date(),
          });

          return Promise.resolve(dish);
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
    dishes.length = 0;
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
      patch: (url: string) => request(server).patch(url).set('x-test-user-id', userId),
    };
  }

  it('未登录访问菜品 API 返回 401', async () => {
    await request(app.getHttpServer()).get('/api/dishes').expect(401);
    await request(app.getHttpServer()).post('/api/dishes').send({ name: '番茄炒蛋' }).expect(401);
  });

  it('登录后创建菜品归属当前 workspace，并应用默认值', async () => {
    const agent = loginAs(user.id);

    await agent
      .post('/api/dishes')
      .send({ name: '番茄炒蛋', description: '家常菜' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'dish-1',
          workspaceId: workspace.id,
          name: '番茄炒蛋',
          description: '家常菜',
          mealTypes: [MealType.LUNCH, MealType.DINNER],
          isActive: true,
        });
      });
  });

  it('同一 workspace 内重名菜品返回 409，不同 workspace 可以同名', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    await agent.post('/api/dishes').send({ name: '番茄炒蛋' }).expect(201);
    await agent.post('/api/dishes').send({ name: '番茄炒蛋' }).expect(409);
    await otherAgent.post('/api/dishes').send({ name: '番茄炒蛋' }).expect(201);
  });

  it('列表只返回当前 workspace 菜品，并支持 mealType 与 isActive 筛选', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    await agent
      .post('/api/dishes')
      .send({ name: '燕麦粥', mealTypes: [MealType.BREAKFAST], isActive: true })
      .expect(201);
    await agent
      .post('/api/dishes')
      .send({ name: '夜宵面', mealTypes: [MealType.SNACK], isActive: false })
      .expect(201);
    await otherAgent.post('/api/dishes').send({ name: '他人菜品' }).expect(201);

    await agent
      .get(`/api/dishes?mealType=${MealType.BREAKFAST}&isActive=true`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ name: '燕麦粥', workspaceId: workspace.id });
      });
  });

  it('详情和更新按 workspace 隔离，跨 workspace 返回 404', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    const createRes = await agent.post('/api/dishes').send({ name: '番茄炒蛋' }).expect(201);

    await agent.get(`/api/dishes/${createRes.body.id}`).expect(200);
    await otherAgent.get(`/api/dishes/${createRes.body.id}`).expect(404);
    await otherAgent.patch(`/api/dishes/${createRes.body.id}`).send({ isActive: false }).expect(404);

    await agent
      .patch(`/api/dishes/${createRes.body.id}`)
      .send({ isActive: false, mealTypes: [MealType.SNACK] })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          isActive: false,
          mealTypes: [MealType.SNACK],
        });
      });
  });

  it('非法餐次由 DTO 校验拒绝', async () => {
    const agent = loginAs(user.id);

    const createRes = await agent.post('/api/dishes').send({ name: '番茄炒蛋' }).expect(201);

    await agent.post('/api/dishes').send({ name: '错误餐次', mealTypes: ['ALL'] }).expect(400);
    await agent.patch(`/api/dishes/${createRes.body.id}`).send({ mealTypes: ['ALL'] }).expect(400);
    await agent.get('/api/dishes?mealType=ALL').expect(400);
  });
});
