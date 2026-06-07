import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
};

type Recipe = {
  id: string;
  workspaceId: string;
  dishId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('Recipes API', () => {
  let app: INestApplication;
  let dishes: Dish[];
  let recipes: Recipe[];
  let prisma: {
    user: { findUnique: jest.Mock };
    dish: { findFirst: jest.Mock };
    recipe: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeAll(async () => {
    dishes = [];
    recipes = [];

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
      recipe: {
        findMany: jest.fn(({ where }: { where: { workspaceId: string; dishId: string } }) => {
          return Promise.resolve(
            recipes
              .filter((recipe) => recipe.workspaceId === where.workspaceId && recipe.dishId === where.dishId)
              .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
          );
        }),
        create: jest.fn(({ data }: { data: Pick<Recipe, 'workspaceId' | 'dishId' | 'title' | 'content'> }) => {
          const now = new Date(Date.UTC(2026, 5, 7, 0, recipes.length));
          const recipe = {
            id: `recipe-${recipes.length + 1}`,
            workspaceId: data.workspaceId,
            dishId: data.dishId,
            title: data.title,
            content: data.content,
            createdAt: now,
            updatedAt: now,
          };
          recipes.push(recipe);
          return Promise.resolve(recipe);
        }),
        findFirst: jest.fn(({ where, select }: { where: { id: string; workspaceId: string }; select?: { id?: boolean } }) => {
          const recipe = recipes.find((item) => item.id === where.id && item.workspaceId === where.workspaceId);
          if (!recipe) {
            return Promise.resolve(null);
          }
          if (select?.id) {
            return Promise.resolve({ id: recipe.id });
          }
          return Promise.resolve(recipe);
        }),
        update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<Pick<Recipe, 'title' | 'content'>> }) => {
          const recipe = recipes.find((item) => item.id === where.id);
          if (!recipe) {
            return Promise.resolve(null);
          }

          Object.assign(recipe, {
            title: data.title ?? recipe.title,
            content: data.content ?? recipe.content,
            updatedAt: new Date(),
          });

          return Promise.resolve(recipe);
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
    recipes.length = 0;
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

  function loginAs(userId: string) {
    const server = app.getHttpServer();

    return {
      get: (url: string) => request(server).get(url).set('x-test-user-id', userId),
      post: (url: string) => request(server).post(url).set('x-test-user-id', userId),
      patch: (url: string) => request(server).patch(url).set('x-test-user-id', userId),
    };
  }

  it('未登录访问 recipes API 返回 401', async () => {
    await request(app.getHttpServer()).get('/api/dishes/dish-1/recipes').expect(401);
    await request(app.getHttpServer()).post('/api/dishes/dish-1/recipes').send({ title: '做法', content: '内容' }).expect(401);
    await request(app.getHttpServer()).patch('/api/recipes/recipe-1').send({ title: '做法' }).expect(401);
  });

  it('登录后能给当前 workspace 的 dish 创建 recipe，并 trim 字段', async () => {
    const agent = loginAs(user.id);

    await agent
      .post('/api/dishes/dish-1/recipes')
      .send({ title: '  家常版  ', content: '  先炒蛋再炒番茄  ' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'recipe-1',
          workspaceId: workspace.id,
          dishId: 'dish-1',
          title: '家常版',
          content: '先炒蛋再炒番茄',
        });
      });
  });

  it('列表只返回当前 workspace 当前 dish 的 recipe，并按 createdAt asc', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);

    await agent.post('/api/dishes/dish-1/recipes').send({ title: '第二版', content: '内容 2' }).expect(201);
    await agent.post('/api/dishes/dish-2/recipes').send({ title: '其他菜', content: '内容' }).expect(201);
    await otherAgent.post('/api/dishes/other-dish-1/recipes').send({ title: '他人做法', content: '内容' }).expect(201);
    await agent.post('/api/dishes/dish-1/recipes').send({ title: '第三版', content: '内容 3' }).expect(201);

    await agent
      .get('/api/dishes/dish-1/recipes')
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((recipe: Recipe) => recipe.title)).toEqual(['第二版', '第三版']);
        expect(body.every((recipe: Recipe) => recipe.workspaceId === workspace.id && recipe.dishId === 'dish-1')).toBe(true);
      });
  });

  it('不能给其他 workspace 的 dish 创建 recipe', async () => {
    const agent = loginAs(user.id);

    await agent.post('/api/dishes/other-dish-1/recipes').send({ title: '越界', content: '内容' }).expect(404);
  });

  it('不能编辑其他 workspace 的 recipe', async () => {
    const agent = loginAs(user.id);
    const otherAgent = loginAs(otherUser.id);
    const createRes = await otherAgent
      .post('/api/dishes/other-dish-1/recipes')
      .send({ title: '他人做法', content: '内容' })
      .expect(201);

    await agent.patch(`/api/recipes/${createRes.body.id}`).send({ title: '越界编辑' }).expect(404);
  });

  it('编辑后返回更新后的 title/content，并 trim 字段', async () => {
    const agent = loginAs(user.id);
    const createRes = await agent
      .post('/api/dishes/dish-1/recipes')
      .send({ title: '家常版', content: '原内容' })
      .expect(201);

    await agent
      .patch(`/api/recipes/${createRes.body.id}`)
      .send({ title: '  新标题  ', content: '  新内容  ' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ title: '新标题', content: '新内容' });
      });
  });

  it('空 title/content 和纯空白 title/content 被拒绝', async () => {
    const agent = loginAs(user.id);
    const createRes = await agent
      .post('/api/dishes/dish-1/recipes')
      .send({ title: '家常版', content: '原内容' })
      .expect(201);

    await agent.post('/api/dishes/dish-1/recipes').send({ title: '', content: '内容' }).expect(400);
    await agent.post('/api/dishes/dish-1/recipes').send({ title: '标题', content: '' }).expect(400);
    await agent.post('/api/dishes/dish-1/recipes').send({ title: '   ', content: '内容' }).expect(400);
    await agent.post('/api/dishes/dish-1/recipes').send({ title: '标题', content: '   ' }).expect(400);
    await agent.patch(`/api/recipes/${createRes.body.id}`).send({ title: '   ' }).expect(400);
    await agent.patch(`/api/recipes/${createRes.body.id}`).send({ content: '   ' }).expect(400);
  });
});
