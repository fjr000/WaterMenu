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
const secondUser = { id: 'user-3', workspaceId: workspace.id };

type Dish = {
  id: string;
  workspaceId: string;
  name: string;
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

type MealRecordWhere = {
  workspaceId: string;
  mealType?: MealType;
  dishId?: string;
  eatenAt?: { gte?: Date; lte?: Date };
  feedbacks?: { some: { workspaceId: string; rating: FeedbackRating; userId?: string } };
  OR?: ({ title: { contains: string; mode: string } } | { note: { contains: string; mode: string } })[];
};

function sortMealRecords(left: MealRecord, right: MealRecord) {
  return (
    right.eatenAt.getTime() - left.eatenAt.getTime() ||
    right.createdAt.getTime() - left.createdAt.getTime() ||
    right.id.localeCompare(left.id)
  );
}

describe('Meal records and feedback API', () => {
  let app: INestApplication;
  let dishes: Dish[];
  let mealRecords: MealRecord[];
  let feedbacks: Feedback[];
  let prisma: {
    user: { findUnique: jest.Mock };
    dish: { findFirst: jest.Mock };
    mealRecord: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    feedback: { upsert: jest.Mock };
    $transaction: jest.Mock;
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
          if (where.id === secondUser.id) {
            return Promise.resolve(secondUser);
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
      mealRecord: {
        findMany: jest.fn(({ where, skip = 0, take }: { where: MealRecordWhere; skip?: number; take?: number }) => {
          const filtered = filterMealRecords(where).sort(sortMealRecords);
          return Promise.resolve(filtered.slice(skip, take === undefined ? undefined : skip + take).map(withFeedbacks));
        }),
        count: jest.fn(({ where }: { where: MealRecordWhere }) => Promise.resolve(filterMealRecords(where).length)),
        create: jest.fn(({ data }: { data: Omit<MealRecord, 'id' | 'createdAt' | 'updatedAt'> }) => {
          const now = new Date();
          const mealRecord = {
            id: `meal-record-${mealRecords.length + 1}`,
            workspaceId: data.workspaceId,
            dishId: data.dishId,
            title: data.title,
            mealType: data.mealType,
            eatenAt: data.eatenAt,
            note: data.note,
            createdAt: now,
            updatedAt: now,
          };
          mealRecords.push(mealRecord);
          return Promise.resolve(withFeedbacks(mealRecord));
        }),
        findFirst: jest.fn(({ where, select }: { where: { id: string; workspaceId: string }; select?: { id?: boolean } }) => {
          const mealRecord = mealRecords.find((item) => item.id === where.id && item.workspaceId === where.workspaceId);
          if (!mealRecord) {
            return Promise.resolve(null);
          }
          if (select?.id) {
            return Promise.resolve({ id: mealRecord.id });
          }
          return Promise.resolve(withFeedbacks(mealRecord));
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<MealRecord> }) => {
          const mealRecord = mealRecords.find((item) => item.id === where.id);
          if (!mealRecord) {
            return Promise.resolve(null);
          }

          Object.assign(mealRecord, {
            dishId: data.dishId === undefined ? mealRecord.dishId : data.dishId,
            title: data.title ?? mealRecord.title,
            mealType: data.mealType ?? mealRecord.mealType,
            eatenAt: data.eatenAt ?? mealRecord.eatenAt,
            note: data.note === undefined ? mealRecord.note : data.note,
            updatedAt: new Date(),
          });

          return Promise.resolve(withFeedbacks(mealRecord));
        }),
      },
      feedback: {
        upsert: jest.fn(({ where, create, update }: { where: { mealRecordId_userId: { mealRecordId: string; userId: string } }; create: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>; update: Pick<Feedback, 'rating' | 'note'> }) => {
          const existing = feedbacks.find(
            (item) => item.mealRecordId === where.mealRecordId_userId.mealRecordId && item.userId === where.mealRecordId_userId.userId,
          );
          if (existing) {
            Object.assign(existing, { rating: update.rating, note: update.note, updatedAt: new Date() });
            return Promise.resolve(existing);
          }

          const now = new Date();
          const feedback = {
            id: `feedback-${feedbacks.length + 1}`,
            workspaceId: create.workspaceId,
            mealRecordId: create.mealRecordId,
            userId: create.userId,
            rating: create.rating,
            note: create.note,
            createdAt: now,
            updatedAt: now,
          };
          feedbacks.push(feedback);
          return Promise.resolve(feedback);
        }),
      },
      $transaction: jest.fn((promises: Promise<unknown>[]) => Promise.all(promises)),
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
      { id: 'dish-1', workspaceId: workspace.id, name: '番茄炒蛋' },
      { id: 'dish-2', workspaceId: workspace.id, name: '青椒肉丝' },
      { id: 'other-dish-1', workspaceId: otherWorkspace.id, name: '他人菜品' },
    );
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function filterMealRecords(where: MealRecordWhere) {
    return mealRecords.filter((mealRecord) => {
      if (mealRecord.workspaceId !== where.workspaceId) {
        return false;
      }
      if (where.mealType && mealRecord.mealType !== where.mealType) {
        return false;
      }
      if (where.dishId && mealRecord.dishId !== where.dishId) {
        return false;
      }
      if (where.eatenAt?.gte && mealRecord.eatenAt < where.eatenAt.gte) {
        return false;
      }
      if (where.eatenAt?.lte && mealRecord.eatenAt > where.eatenAt.lte) {
        return false;
      }
      if (where.feedbacks) {
        const feedbackWhere = where.feedbacks.some;
        const matchedFeedback = feedbacks.some(
          (feedback) =>
            feedback.mealRecordId === mealRecord.id &&
            feedback.workspaceId === feedbackWhere.workspaceId &&
            feedback.rating === feedbackWhere.rating &&
            (feedbackWhere.userId === undefined || feedback.userId === feedbackWhere.userId),
        );
        if (!matchedFeedback) {
          return false;
        }
      }
      if (where.OR?.length) {
        const keyword = 'title' in where.OR[0] ? where.OR[0].title.contains : where.OR[0].note.contains;
        const loweredKeyword = keyword.toLowerCase();
        const titleMatched = mealRecord.title.toLowerCase().includes(loweredKeyword);
        const noteMatched = mealRecord.note?.toLowerCase().includes(loweredKeyword) ?? false;
        if (!titleMatched && !noteMatched) {
          return false;
        }
      }
      return true;
    });
  }

  function withFeedbacks(mealRecord: MealRecord) {
    return {
      ...mealRecord,
      feedbacks: feedbacks
        .filter((feedback) => feedback.mealRecordId === mealRecord.id && feedback.workspaceId === mealRecord.workspaceId)
        .map(({ id, userId, rating, note, createdAt, updatedAt }) => ({ id, userId, rating, note, createdAt, updatedAt })),
    };
  }

  function loginAs(userId: string) {
    const server = app.getHttpServer();

    return {
      get: (url: string) => request(server).get(url).set('x-test-user-id', userId),
      post: (url: string) => request(server).post(url).set('x-test-user-id', userId),
      patch: (url: string) => request(server).patch(url).set('x-test-user-id', userId),
    };
  }

  it('未登录访问用餐记录与反馈 API 返回 401', async () => {
    await request(app.getHttpServer()).get('/api/meal-records').expect(401);
    await request(app.getHttpServer()).post('/api/meal-records').send({}).expect(401);
    await request(app.getHttpServer()).post('/api/feedback').send({}).expect(401);
  });

  it('登录后可以创建文本用餐记录和关联当前 workspace 菜品的用餐记录', async () => {
    const agent = loginAs(user.id);

    await agent
      .post('/api/meal-records')
      .send({ title: '外食米粉', mealType: MealType.BREAKFAST, eatenAt: '2026-06-07T00:00:00.000Z' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ workspaceId: workspace.id, dishId: null, title: '外食米粉', feedbacks: [] });
      });

    await agent
      .post('/api/meal-records')
      .send({ dishId: 'dish-1', title: '午餐番茄炒蛋', mealType: MealType.LUNCH, eatenAt: '2026-06-07T04:00:00.000Z', note: '少油' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ workspaceId: workspace.id, dishId: 'dish-1', title: '午餐番茄炒蛋', note: '少油' });
      });
  });

  it('不能用其他 workspace 的 dishId 创建或更新用餐记录', async () => {
    const agent = loginAs(user.id);
    const createRes = await agent
      .post('/api/meal-records')
      .send({ title: '晚餐', mealType: MealType.DINNER, eatenAt: '2026-06-07T10:00:00.000Z' })
      .expect(201);

    await agent
      .post('/api/meal-records')
      .send({ dishId: 'other-dish-1', title: '越界菜品', mealType: MealType.LUNCH, eatenAt: '2026-06-07T04:00:00.000Z' })
      .expect(404);
    await agent.patch(`/api/meal-records/${createRes.body.id}`).send({ dishId: 'other-dish-1' }).expect(404);
  });

  it('列表与详情只返回当前 workspace 记录，并包含反馈基础信息', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);
    const secondAgent = loginAs(secondUser.id);

    const createRes = await agent
      .post('/api/meal-records')
      .send({ dishId: 'dish-1', title: '午餐', mealType: MealType.LUNCH, eatenAt: '2026-06-07T04:00:00.000Z' })
      .expect(201);
    await otherAgent
      .post('/api/meal-records')
      .send({ title: '他人晚餐', mealType: MealType.DINNER, eatenAt: '2026-06-07T10:00:00.000Z' })
      .expect(201);
    await secondAgent
      .post('/api/feedback')
      .send({ mealRecordId: createRes.body.id, rating: FeedbackRating.GOOD, note: '好吃' })
      .expect(201);

    await agent
      .get('/api/meal-records')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
        expect(body.items).toHaveLength(1);
        expect(body.items[0].id).toBe(createRes.body.id);
        expect(body.items[0].feedbacks).toHaveLength(1);
        expect(body.items[0].feedbacks[0]).toMatchObject({ userId: secondUser.id, rating: FeedbackRating.GOOD, note: '好吃' });
        expect(body.items[0].feedbacks[0]).not.toHaveProperty('workspaceId');
        expect(body.items[0].feedbacks[0]).not.toHaveProperty('mealRecordId');
      });

    await agent
      .get(`/api/meal-records/${createRes.body.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.feedbacks).toHaveLength(1);
      });
    await otherAgent.get(`/api/meal-records/${createRes.body.id}`).expect(404);
  });

  it('更新用餐记录支持修改、解除和保持 dishId', async () => {
    const agent = loginAs(user.id);
    const createRes = await agent
      .post('/api/meal-records')
      .send({ dishId: 'dish-1', title: '午餐', mealType: MealType.LUNCH, eatenAt: '2026-06-07T04:00:00.000Z' })
      .expect(201);

    await agent.patch(`/api/meal-records/${createRes.body.id}`).send({ dishId: 'dish-2' }).expect(200).expect(({ body }) => {
      expect(body.dishId).toBe('dish-2');
    });
    await agent.patch(`/api/meal-records/${createRes.body.id}`).send({ title: '改名午餐' }).expect(200).expect(({ body }) => {
      expect(body.dishId).toBe('dish-2');
      expect(body.title).toBe('改名午餐');
    });
    await agent.patch(`/api/meal-records/${createRes.body.id}`).send({ dishId: null }).expect(200).expect(({ body }) => {
      expect(body.dishId).toBeNull();
    });
  });

  it('反馈按当前用户与用餐记录 upsert，且不能提交到其他 workspace 记录', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);
    const createRes = await agent
      .post('/api/meal-records')
      .send({ title: '晚餐', mealType: MealType.DINNER, eatenAt: '2026-06-07T10:00:00.000Z' })
      .expect(201);

    const firstRes = await agent
      .post('/api/feedback')
      .send({ mealRecordId: createRes.body.id, rating: FeedbackRating.OK, note: '一般' })
      .expect(201);
    await agent
      .post('/api/feedback')
      .send({ mealRecordId: createRes.body.id, rating: FeedbackRating.BAD, note: '太咸' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: firstRes.body.id, userId: user.id, rating: FeedbackRating.BAD, note: '太咸' });
      });

    expect(feedbacks).toHaveLength(1);
    await otherAgent.post('/api/feedback').send({ mealRecordId: createRes.body.id, rating: FeedbackRating.GOOD }).expect(404);
  });

  it('用餐记录列表支持分页、排序和基础筛选', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    await agent
      .post('/api/meal-records')
      .send({ dishId: 'dish-1', title: '早餐米粉', mealType: MealType.BREAKFAST, eatenAt: '2026-06-06T00:00:00.000Z', note: '清淡' })
      .expect(201);
    const lunchRes = await agent
      .post('/api/meal-records')
      .send({ dishId: 'dish-1', title: '午餐番茄炒蛋', mealType: MealType.LUNCH, eatenAt: '2026-06-07T04:00:00.000Z', note: '少油' })
      .expect(201);
    const dinnerRes = await agent
      .post('/api/meal-records')
      .send({ dishId: 'dish-2', title: '晚餐青椒肉丝', mealType: MealType.DINNER, eatenAt: '2026-06-08T10:00:00.000Z', note: '微辣' })
      .expect(201);
    await otherAgent
      .post('/api/meal-records')
      .send({ title: '他人午餐', mealType: MealType.LUNCH, eatenAt: '2026-06-09T04:00:00.000Z' })
      .expect(201);

    await agent
      .get('/api/meal-records?page=1&pageSize=2')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ total: 3, page: 1, pageSize: 2 });
        expect(body.items.map((item: MealRecord) => item.id)).toEqual([dinnerRes.body.id, lunchRes.body.id]);
      });

    await agent
      .get('/api/meal-records?mealType=LUNCH&dishId=dish-1')
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items[0].id).toBe(lunchRes.body.id);
      });

    await agent
      .get('/api/meal-records?from=2026-06-07T00:00:00.000Z&to=2026-06-08T23:59:59.999Z')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items.map((item: MealRecord) => item.id)).toEqual([dinnerRes.body.id, lunchRes.body.id]);
      });
  });

  it('用餐记录列表支持关键词搜索和反馈范围筛选', async () => {
    const agent = loginAs(user.id);
    const secondAgent = loginAs(secondUser.id);

    const mineGoodRes = await agent
      .post('/api/meal-records')
      .send({ title: '番茄炒蛋', mealType: MealType.LUNCH, eatenAt: '2026-06-07T04:00:00.000Z', note: '家常少油' })
      .expect(201);
    const memberGoodRes = await agent
      .post('/api/meal-records')
      .send({ title: '青椒肉丝', mealType: MealType.DINNER, eatenAt: '2026-06-08T10:00:00.000Z', note: '适合晚餐' })
      .expect(201);

    await agent.post('/api/feedback').send({ mealRecordId: mineGoodRes.body.id, rating: FeedbackRating.GOOD }).expect(201);
    await secondAgent.post('/api/feedback').send({ mealRecordId: memberGoodRes.body.id, rating: FeedbackRating.GOOD }).expect(201);

    await agent
      .get('/api/meal-records?q=少油')
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items[0].id).toBe(mineGoodRes.body.id);
      });

    await agent
      .get(`/api/meal-records?q=${encodeURIComponent('  番茄  ')}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items[0].id).toBe(mineGoodRes.body.id);
      });

    await agent
      .get('/api/meal-records?rating=GOOD')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items.map((item: MealRecord) => item.id)).toEqual([mineGoodRes.body.id]);
      });

    await agent
      .get('/api/meal-records?rating=GOOD&ratingScope=workspace')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items.map((item: MealRecord) => item.id)).toEqual([memberGoodRes.body.id, mineGoodRes.body.id]);
      });
  });

  it('非法列表 query 由 DTO 校验拒绝', async () => {
    const agent = loginAs(user.id);

    await agent.get('/api/meal-records?page=0').expect(400);
    await agent.get('/api/meal-records?pageSize=100').expect(400);
    await agent.get('/api/meal-records?mealType=ALL').expect(400);
    await agent.get('/api/meal-records?rating=DELICIOUS').expect(400);
    await agent.get('/api/meal-records?ratingScope=team').expect(400);
    await agent.get('/api/meal-records?from=not-a-date').expect(400);
  });

  it('非法 mealType 与非法反馈值由 DTO 校验拒绝', async () => {
    const agent = loginAs(user.id);
    const createRes = await agent
      .post('/api/meal-records')
      .send({ title: '晚餐', mealType: MealType.DINNER, eatenAt: '2026-06-07T10:00:00.000Z' })
      .expect(201);

    await agent
      .post('/api/meal-records')
      .send({ title: '错误餐次', mealType: 'ALL', eatenAt: '2026-06-07T10:00:00.000Z' })
      .expect(400);
    await agent.patch(`/api/meal-records/${createRes.body.id}`).send({ mealType: 'ALL' }).expect(400);
    await agent.post('/api/feedback').send({ mealRecordId: createRes.body.id, rating: 'DELICIOUS' }).expect(400);
  });
});
