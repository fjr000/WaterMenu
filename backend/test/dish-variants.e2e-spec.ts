import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DishVariantType, MealType, Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const workspace = { id: 'workspace-1', name: 'WaterMenu' };
const otherWorkspace = { id: 'workspace-2', name: 'Other' };
const user = { id: 'user-1', workspaceId: workspace.id };
const otherUser = { id: 'user-2', workspaceId: otherWorkspace.id };

type Dish = {
  id: string;
  workspaceId: string;
  name: string;
  mealTypes: MealType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type DishVariant = {
  id: string;
  workspaceId: string;
  dishId: string;
  name: string;
  type: DishVariantType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

describe('Dish variants API', () => {
  let app: INestApplication;
  let dishes: Dish[];
  let variants: DishVariant[];
  let prisma: {
    user: { findUnique: jest.Mock };
    dish: { findFirst: jest.Mock };
    dishVariant: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeAll(async () => {
    dishes = [];
    variants = [];
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
          const dish = dishes.find((item) => item.id === where.id && item.workspaceId === where.workspaceId);
          return Promise.resolve(dish ? { id: dish.id } : null);
        }),
      },
      dishVariant: {
        findMany: jest.fn(({ where }: { where: { workspaceId: string; dishId: string } }) => {
          return Promise.resolve(
            variants
              .filter((item) => item.workspaceId === where.workspaceId && item.dishId === where.dishId)
              .sort(
                (left, right) =>
                  Number(right.isActive) - Number(left.isActive) ||
                  left.createdAt.getTime() - right.createdAt.getTime() ||
                  left.id.localeCompare(right.id),
              ),
          );
        }),
        create: jest.fn(({ data }: { data: Omit<DishVariant, 'id' | 'createdAt' | 'updatedAt'> }) => {
          if (variants.some((item) => item.dishId === data.dishId && item.name === data.name)) {
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: 'test',
            });
          }

          const now = new Date();
          const variant = {
            id: `variant-${variants.length + 1}`,
            workspaceId: data.workspaceId,
            dishId: data.dishId,
            name: data.name,
            type: data.type,
            isActive: data.isActive,
            createdAt: now,
            updatedAt: now,
          };
          variants.push(variant);
          return Promise.resolve(variant);
        }),
        findFirst: jest.fn(({ where, select }: { where: { id?: string; workspaceId: string }; select?: { id?: boolean } }) => {
          const variant = variants.find(
            (item) => (where.id === undefined || item.id === where.id) && item.workspaceId === where.workspaceId,
          );
          if (!variant) {
            return Promise.resolve(null);
          }
          if (select?.id) {
            return Promise.resolve({ id: variant.id });
          }
          return Promise.resolve(variant);
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<Pick<DishVariant, 'name' | 'type' | 'isActive'>> }) => {
          const variant = variants.find((item) => item.id === where.id);
          if (!variant) {
            return Promise.resolve(null);
          }

          const nextName = data.name ?? variant.name;
          if (variants.some((item) => item.id !== variant.id && item.dishId === variant.dishId && item.name === nextName)) {
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: 'test',
            });
          }

          Object.assign(variant, {
            name: nextName,
            type: data.type ?? variant.type,
            isActive: data.isActive ?? variant.isActive,
            updatedAt: new Date(),
          });
          return Promise.resolve(variant);
        }),
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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
        cookie: { httpOnly: true, sameSite: 'lax', secure: false },
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
    variants.length = 0;
    const now = new Date();
    dishes.push(
      { id: 'dish-1', workspaceId: workspace.id, name: '番茄炒蛋', mealTypes: [MealType.LUNCH], isActive: true, createdAt: now, updatedAt: now },
      { id: 'other-dish-1', workspaceId: otherWorkspace.id, name: '他人菜品', mealTypes: [MealType.DINNER], isActive: true, createdAt: now, updatedAt: now },
    );
    variants.push(
      { id: 'variant-1', workspaceId: workspace.id, dishId: 'dish-1', name: '外卖店1', type: DishVariantType.TAKEOUT, isActive: true, createdAt: now, updatedAt: now },
      { id: 'variant-2', workspaceId: workspace.id, dishId: 'dish-1', name: '家常版', type: DishVariantType.HOME_RECIPE, isActive: false, createdAt: new Date(now.getTime() + 1_000), updatedAt: new Date(now.getTime() + 1_000) },
      { id: 'other-variant-1', workspaceId: otherWorkspace.id, dishId: 'other-dish-1', name: '他人版本', type: DishVariantType.OTHER, isActive: true, createdAt: now, updatedAt: now },
    );
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

  it('未登录访问版本 API 返回 401', async () => {
    await request(app.getHttpServer()).get('/api/dishes/dish-1/variants').expect(401);
    await request(app.getHttpServer()).post('/api/dishes/dish-1/variants').send({}).expect(401);
  });

  it('列表只返回当前 workspace 指定菜品的版本，并按启用优先排序', async () => {
    await loginAs(user.id)
      .get('/api/dishes/dish-1/variants')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
        expect(body.map((item: DishVariant) => item.id)).toEqual(['variant-1', 'variant-2']);
      });
  });

  it('创建版本写入当前 workspace，并在同菜品重名时返回 409', async () => {
    const agent = loginAs(user.id);

    await agent
      .post('/api/dishes/dish-1/variants')
      .send({ name: ' 到店 ', type: DishVariantType.DINE_IN })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ workspaceId: workspace.id, dishId: 'dish-1', name: '到店', type: DishVariantType.DINE_IN, isActive: true });
      });

    await agent
      .post('/api/dishes/dish-1/variants')
      .send({ name: '外卖店1', type: DishVariantType.TAKEOUT })
      .expect(409);
  });

  it('跨 workspace 菜品创建和读取版本返回 404', async () => {
    const agent = loginAs(user.id);
    await agent.get('/api/dishes/other-dish-1/variants').expect(404);
    await agent.post('/api/dishes/other-dish-1/variants').send({ name: '越界', type: DishVariantType.OTHER }).expect(404);
  });

  it('更新版本支持改名和启停，跨 workspace 返回 404', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    await agent
      .patch('/api/dish-variants/variant-1')
      .send({ name: '外卖店A', isActive: false })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: 'variant-1', name: '外卖店A', isActive: false });
      });

    await otherAgent.patch('/api/dish-variants/variant-1').send({ isActive: false }).expect(404);
  });

  it('更新版本重名返回 409，非法类型返回 400', async () => {
    const agent = loginAs(user.id);

    await agent.patch('/api/dish-variants/variant-1').send({ name: '家常版' }).expect(409);
    await agent.post('/api/dishes/dish-1/variants').send({ name: '新版本', type: 'ALL' }).expect(400);
    await agent.patch('/api/dish-variants/variant-1').send({ type: 'ALL' }).expect(400);
  });
});
