import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FeedbackRating, MealType } from '@prisma/client';
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
  description: string | null;
  mealTypes: MealType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MealRecord = {
  id: string;
  workspaceId: string;
  dishId: string | null;
  title: string;
  mealType: MealType;
  eatenAt: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Feedback = {
  id: string;
  workspaceId: string;
  mealRecordId: string;
  userId: string;
  rating: FeedbackRating;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

describe('Recommendations and blind box API', () => {
  let app: INestApplication;
  let dishes: Dish[];
  let mealRecords: MealRecord[];
  let feedbacks: Feedback[];
  let prisma: {
    user: { findUnique: jest.Mock };
    dish: { findMany: jest.Mock };
    mealRecord: { findMany: jest.Mock };
  };

  beforeAll(async () => {
    dishes = [];
    mealRecords = [];
    feedbacks = [];

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
        findMany: jest.fn(({ where }: { where: { workspaceId: string; isActive: boolean; mealTypes?: { has: MealType } } }) => {
          return Promise.resolve(
            dishes.filter((dish) => {
              if (dish.workspaceId !== where.workspaceId || dish.isActive !== where.isActive) {
                return false;
              }
              return where.mealTypes ? dish.mealTypes.includes(where.mealTypes.has) : true;
            }),
          );
        }),
      },
      mealRecord: {
        findMany: jest.fn(({ where }: { where: { workspaceId: string; dishId: { in: string[] } } }) => {
          return Promise.resolve(
            mealRecords
              .filter((mealRecord) => mealRecord.workspaceId === where.workspaceId && mealRecord.dishId && where.dishId.in.includes(mealRecord.dishId))
              .map((mealRecord) => ({
                ...mealRecord,
                feedbacks: feedbacks
                  .filter((feedback) => feedback.workspaceId === mealRecord.workspaceId && feedback.mealRecordId === mealRecord.id)
                  .map(({ rating }) => ({ rating })),
              })),
          );
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
    mealRecords.length = 0;
    feedbacks.length = 0;
    dishes.push(
      createDish('dish-breakfast', workspace.id, '燕麦粥', [MealType.BREAKFAST]),
      createDish('dish-good', workspace.id, '番茄炒蛋', [MealType.LUNCH, MealType.DINNER]),
      createDish('dish-bad', workspace.id, '苦瓜炒蛋', [MealType.LUNCH]),
      createDish('dish-recent', workspace.id, '青椒肉丝', [MealType.LUNCH]),
      createDish('dish-inactive', workspace.id, '下架菜品', [MealType.LUNCH], false),
      createDish('other-dish', otherWorkspace.id, '他人菜品', [MealType.LUNCH]),
    );
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function createDish(id: string, workspaceId: string, name: string, mealTypes: MealType[], isActive = true): Dish {
    const now = new Date();
    return { id, workspaceId, name, description: null, mealTypes, isActive, createdAt: now, updatedAt: now };
  }

  function addMealRecord(id: string, dishId: string, eatenAt: Date, workspaceId = workspace.id) {
    const now = new Date();
    mealRecords.push({
      id,
      workspaceId,
      dishId,
      title: id,
      mealType: MealType.LUNCH,
      eatenAt,
      note: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  function addFeedback(id: string, mealRecordId: string, rating: FeedbackRating, workspaceId = workspace.id) {
    const now = new Date();
    feedbacks.push({ id, workspaceId, mealRecordId, userId: user.id, rating, note: null, createdAt: now, updatedAt: now });
  }

  function daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  function loginAs(userId: string) {
    const server = app.getHttpServer();

    return {
      post: (url: string) => request(server).post(url).set('x-test-user-id', userId),
    };
  }

  it('未登录调用推荐和盲盒接口返回 401', async () => {
    await request(app.getHttpServer()).post('/api/recommendations').send({}).expect(401);
    await request(app.getHttpServer()).post('/api/blind-box').send({}).expect(401);
  });

  it('推荐只返回当前 workspace 启用菜品，并按餐次筛选', async () => {
    await loginAs(user.id)
      .post('/api/recommendations')
      .send({ mealType: MealType.BREAKFAST })
      .expect(201)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0].dish).toMatchObject({ id: 'dish-breakfast', workspaceId: workspace.id, isActive: true });
        expect(body.items[0].reasons).toEqual(expect.arrayContaining([`适合${MealType.BREAKFAST}`]));
      });

    await loginAs(user.id)
      .post('/api/recommendations')
      .send({ mealType: 'ALL' })
      .expect(400);
  });

  it('推荐默认排除最近 3 天吃过的菜，并在无候选时放宽限制', async () => {
    addMealRecord('recent-1', 'dish-recent', daysAgo(1));

    await loginAs(user.id)
      .post('/api/recommendations')
      .send({ mealType: MealType.LUNCH })
      .expect(201)
      .expect(({ body }) => {
        const ids = body.items.map((item: { dish: Dish }) => item.dish.id);
        expect(ids).toEqual(['dish-good', 'dish-bad']);
        expect(ids).not.toContain('dish-recent');
      });

    addMealRecord('recent-2', 'dish-good', daysAgo(1));
    addMealRecord('recent-3', 'dish-bad', daysAgo(1));

    await loginAs(user.id)
      .post('/api/recommendations')
      .send({ mealType: MealType.LUNCH })
      .expect(201)
      .expect(({ body }) => {
        expect(body.items.map((item: { dish: Dish }) => item.dish.id).sort()).toEqual(['dish-bad', 'dish-good', 'dish-recent']);
        expect(body.items[0].reasons).toEqual(expect.arrayContaining(['候选不足，已放宽最近 3 天限制']));
      });
  });

  it('反馈权重影响推荐排序，BAD 降权但不排除', async () => {
    addMealRecord('old-good', 'dish-good', daysAgo(10));
    addMealRecord('old-bad', 'dish-bad', daysAgo(10));
    addFeedback('feedback-good', 'old-good', FeedbackRating.GOOD);
    addFeedback('feedback-bad', 'old-bad', FeedbackRating.BAD);

    await loginAs(user.id)
      .post('/api/recommendations')
      .send({ mealType: MealType.LUNCH })
      .expect(201)
      .expect(({ body }) => {
        expect(body.items.map((item: { dish: Dish }) => item.dish.id)).toEqual(['dish-good', 'dish-recent', 'dish-bad']);
        expect(body.items[0]).toMatchObject({ score: 120, weight: 120 });
        expect(body.items[2]).toMatchObject({ score: 85, weight: 85 });
        expect(body.items[2].reasons).toEqual(expect.arrayContaining(['收到 1 次不好吃反馈，已降低权重']));
      });
  });

  it('推荐最多返回 5 个候选', async () => {
    dishes.push(
      createDish('dish-extra-1', workspace.id, '额外 1', [MealType.LUNCH]),
      createDish('dish-extra-2', workspace.id, '额外 2', [MealType.LUNCH]),
      createDish('dish-extra-3', workspace.id, '额外 3', [MealType.LUNCH]),
    );

    await loginAs(user.id)
      .post('/api/recommendations')
      .send({ mealType: MealType.LUNCH })
      .expect(201)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(5);
        expect(body.items.every((item: { reasons: string[] }) => item.reasons.length > 0)).toBe(true);
      });
  });

  it('盲盒按权重随机返回单个候选和 reasons', async () => {
    addMealRecord('old-good', 'dish-good', daysAgo(10));
    addFeedback('feedback-good', 'old-good', FeedbackRating.GOOD);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    try {
      await loginAs(user.id)
        .post('/api/blind-box')
        .send({ mealType: MealType.LUNCH })
        .expect(201)
        .expect(({ body }) => {
          expect(body.item).toMatchObject({ dish: { id: 'dish-good' }, score: 120, weight: 120 });
          expect(body.item.reasons).toEqual(expect.arrayContaining([`适合${MealType.LUNCH}`, '收到 1 次好吃反馈']));
        });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('盲盒无候选时返回 null', async () => {
    dishes.length = 0;

    await loginAs(user.id)
      .post('/api/blind-box')
      .send({})
      .expect(201)
      .expect(({ body }) => {
        expect(body.item).toBeNull();
      });
  });
});
