# WaterMenu 项目定性与技术方案

> 本文记录当前阶段已确认的产品边界、技术选型和关键架构决策。当前只做前期定性，不实现功能。

---

## 1. 项目定位

WaterMenu 是一个手机优先的菜单推荐与饮食记录 Web 应用，用来解决日常问题：

- 今天吃什么？
- 早餐吃什么？
- 午餐吃什么？
- 晚餐吃什么？
- 哪些菜好吃或不好吃？
- 某个菜怎么做？
- 什么时候吃过，反馈怎么样？

项目从少数人使用起步，但预留小产品扩展能力。

---

## 2. 使用场景

### 2.1 主要使用端

- 手机浏览器为主。
- 电脑浏览器用于调试、批量录入和管理数据。

### 2.2 使用方式

- 公网部署。
- 通过浏览器访问。
- 需要简单登录保护。
- MVP 支持基础 PWA，可以添加到手机桌面。
- MVP 不做复杂离线记录或离线同步。

---

## 3. 用户与数据归属

采用 `workspace` / 家庭空间模型。

- 用户属于 workspace。
- 菜品属于 workspace。
- 食谱属于 workspace。
- 用餐记录属于 workspace。
- 反馈由具体用户提交。

这样同时支持：

- 单人使用。
- 两个人共用。
- 家庭或小组共享。
- 未来小产品多空间扩展。

### 3.1 注册策略

MVP 不开放注册。

- 管理员创建初始用户。
- 后续支持邀请码加入 workspace。
- 未登录用户只能看到登录页。

---

## 4. MVP 范围

MVP 聚焦完整闭环：

1. 登录。
2. 菜品管理。
3. 食谱 / 做法记录。
4. 用餐记录。
5. 好吃 / 一般 / 不好吃反馈。
6. 基于历史和反馈的规则推荐。
7. 盲盒功能：带约束随机推荐。

### 4.1 暂缓事项

以下功能不进入 MVP：

- AI 自动生成食谱。
- 营养分析。
- 复杂机器学习推荐。
- 购物清单。
- 库存管理。
- 公开菜谱分享。
- 开放注册。
- 精细权限系统。
- 复杂离线同步。

---

## 5. 技术栈

### 5.1 前端

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod

前端定位：

- 手机优先。
- 响应式 Web。
- 基础 PWA。
- 不使用 Next.js。
- MVP 不引入 Redux。
- MVP 不引入 Zustand。

### 5.2 后端

- NestJS
- TypeScript
- REST JSON API
- OpenAPI 文档
- Session Cookie 登录
- DTO + class-validator 校验

后端定位：

- 统一 API 入口。
- 处理登录、权限、workspace 数据隔离。
- 处理菜品、食谱、记录、反馈、推荐逻辑。
- 未来作为 Python AI 服务的调用入口。

### 5.3 数据库

- PostgreSQL
- Prisma

Prisma 用于：

- 定义数据模型。
- 管理迁移。
- 生成类型安全数据库客户端。
- 执行常规 CRUD 查询。

复杂推荐或统计后续可以使用：

- Prisma raw SQL。
- 独立 Python AI / 算法服务。

### 5.4 包管理和仓库组织

使用 pnpm workspace。

当前目录结构：

```text
backend/
frontend/
docs/
scripts/
```

推荐后续结构：

```text
WaterMenu/
  package.json
  pnpm-workspace.yaml

  frontend/
    package.json
    src/

  backend/
    package.json
    src/

  docs/
  scripts/
```

未来有明确共享类型需求时，再增加：

```text
packages/shared/
```

当前不提前创建空的共享包。

---

## 6. 部署方案

采用单服务器 + Docker Compose。

推荐部署结构：

```text
一台云服务器
Docker Compose 管理服务
Nginx 做入口
frontend 构建为静态文件
backend 运行 NestJS API
PostgreSQL 持久化数据
uploads 持久化图片文件
```

推荐访问方式：

```text
https://watermenu.example.com/
```

路由建议：

```text
/       前端 React 页面
/api    后端 NestJS API
```

前后端尽量同域部署，方便 Session Cookie。

---

## 7. 登录方案

采用账号密码 + Session Cookie。

- 后端负责登录态。
- 浏览器通过 Cookie 保持登录。
- 前端不手动保存 JWT。
- MVP 不开放注册。
- 密码必须哈希存储。

---

## 8. 图片策略

PostgreSQL 不直接存图片本体。

### 8.1 MVP 阶段

- 图片文件存后端本地 `uploads/`。
- PostgreSQL 存图片路径、元数据和关联关系。

### 8.2 扩展阶段

未来迁移到对象存储：

- S3
- Cloudflare R2
- 阿里云 OSS
- 腾讯云 COS
- MinIO

### 8.3 图片数据关系

菜品和图片推荐采用一对多关系：

```text
Dish 1:N DishImage
```

一个菜品可以有 0 张、1 张或多张图片。

图片元数据建议包含：

```text
id
workspaceId
dishId
storageKey 或 path
mimeType
size
width
height
sortOrder
isCover
createdAt
```

---

## 9. 核心数据模型初稿

### 9.1 Workspace

表示家庭空间或小组空间。

### 9.2 User

表示用户。用户加入 workspace。

### 9.3 Dish

表示菜品。

- 属于 workspace。
- 可选择多个适用餐次。
- 可关联多张图片。
- 可关联多个食谱。

### 9.4 Recipe

表示食谱或做法。

- 属于 workspace。
- 关联 Dish。
- 一个 Dish 可以有 0 到多个 Recipe。

### 9.5 MealRecord

表示用餐记录。

用餐记录可以关联菜品，也可以只写文本。

```text
dishId 可选
title 必填
mealType 必填
eatenAt 必填
note 可选
```

规则：

- 如果关联菜品，反馈可以回流到菜品推荐权重。
- 如果不关联菜品，只作为历史记录，暂不参与推荐权重。

### 9.6 Feedback

表示用餐反馈。

反馈使用三档：

```text
好吃
一般
不好吃
```

并支持可选备注。

反馈应关联用餐记录，而不是只挂在菜品上。

### 9.7 Recommendation

表示推荐结果或推荐历史。MVP 可以按需要决定是否持久化推荐历史。

---

## 10. 餐次模型

菜品适用餐次只保留具体餐次：

```text
早餐
午餐
晚餐
加餐/夜宵
```

菜品可以多选。

新建菜品默认选择：

```text
午餐
晚餐
```

“通用 / 全部 / 不限”不是菜品属性，而是推荐入口的筛选条件。

推荐入口：

```text
今天吃什么        -> 不限餐次，从全部菜品推荐
早餐吃什么        -> 从早餐菜品推荐
午餐吃什么        -> 从午餐菜品推荐
晚餐吃什么        -> 从晚餐菜品推荐
加餐/夜宵吃什么   -> 从加餐/夜宵菜品推荐
```

---

## 11. 推荐与盲盒规则

### 11.1 推荐模式

推荐模式偏理性。

- 按分数排序。
- 展示推荐理由。

推荐理由示例：

```text
适合晚餐
最近没吃过
之前反馈好吃
```

### 11.2 盲盒模式

盲盒模式是带约束的随机推荐。

不是完全随机，而是：

```text
先得到合理候选池，再按权重随机抽取
```

### 11.3 第一版规则

默认规则：

```text
默认排除最近 3 天吃过的菜
好吃提高权重
一般保持中性
不好吃降低权重但不完全排除
候选不足时自动放宽近期限制
推荐模式按分数排序
盲盒模式按权重随机
```

### 11.4 候选池规则

候选池来自当前 workspace 的菜品。

如果指定餐次：

```text
只选择适配该餐次的菜品
```

如果不指定餐次：

```text
从全部菜品中选择
```

---

## 12. API 风格

采用 REST JSON API + OpenAPI。

示例接口方向：

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/dishes
POST   /api/dishes
GET    /api/dishes/:id
PATCH  /api/dishes/:id

POST   /api/meal-records
POST   /api/feedback

POST   /api/recommendations
POST   /api/blind-box
```

OpenAPI 文档建议路径：

```text
/api/docs
```

---

## 13. 前端状态管理

### 13.1 服务端数据

使用 TanStack Query 管理：

- 菜品列表。
- 菜品详情。
- 食谱。
- 用餐记录。
- 推荐结果。
- 当前用户。

### 13.2 本地 UI 状态

使用 React 内置状态：

- `useState`
- `useReducer`

用于：

- 弹窗开关。
- 当前 tab。
- 表单输入。
- 筛选条件。
- 盲盒动画状态。

MVP 不引入 Redux / Zustand。

---

## 14. 表单与校验

### 14.1 前端

- React Hook Form 管理表单。
- Zod 做前端校验。

### 14.2 后端

- NestJS DTO 描述请求数据。
- class-validator 做后端校验。

后端校验是最终防线，不能只依赖前端校验。

---

## 15. 测试策略

MVP 后端关键测试优先。

### 15.1 后端必测

- workspace 数据隔离。
- 登录态访问控制。
- 推荐规则。
- 用餐记录关联菜品 / 不关联菜品。
- 反馈权重。

### 15.2 前端 MVP 验证

- TypeScript type-check。
- 移动端宽度 DevTools 检查。
- 手机真机访问。
- 表单校验手动检查。
- PWA 添加到桌面检查。

### 15.3 E2E

E2E 暂缓到核心流程稳定后补。

后续优先覆盖：

```text
登录 -> 新增菜品 -> 记录用餐 -> 提交反馈 -> 获取推荐
```

---

## 16. 备份策略

单服务器部署必须备份。

MVP 配置每日备份：

- PostgreSQL。
- uploads 图片目录。

至少保留最近 7 天。

正式长期使用前，必须增加异地备份到对象存储。

需要重点保护：

```text
数据库
uploads 图片目录
.env 配置
docker-compose.yml
```

---

## 17. 未来 AI / 算法扩展

当前 MVP 不实现 AI 服务。

未来如有需要，再增加 Python 服务：

```text
ai-service/
```

推荐调用关系：

```text
frontend -> backend -> ai-service
```

不要让前端直接调用 Python AI 服务。

原因：

- 登录统一。
- 权限统一。
- 数据访问统一。
- API 契约统一。
- Python 服务只负责算法或 AI 能力。

未来 AI 方向包括：

- 自然语言生成菜单。
- 根据历史反馈学习偏好。
- 营养分析。
- 菜谱生成。
- 食材识别。
- 复杂推荐排序。

---

## 18. 已确认决策清单

- [x] 需要手机和电脑共享数据。
- [x] 接受公网部署，需要登录保护。
- [x] 采用前后端分离。
- [x] 扩展目标为小产品扩展 + AI / 算法扩展。
- [x] 前端使用 React + Vite + TypeScript。
- [x] 后端使用 NestJS + TypeScript。
- [x] 数据库使用 PostgreSQL。
- [x] ORM 使用 Prisma。
- [x] 登录使用账号密码 + Session Cookie。
- [x] 图片本体不入库，早期本地 uploads，未来对象存储。
- [x] 部署使用单服务器 + Docker Compose。
- [x] UI 使用 Tailwind CSS。
- [x] 使用 pnpm workspace。
- [x] MVP 包含推荐闭环和盲盒功能。
- [x] 盲盒采用带约束随机。
- [x] 餐次采用具体餐次枚举，“不限”只作为推荐筛选条件。
- [x] 反馈使用好吃 / 一般 / 不好吃 + 可选备注。
- [x] 菜品和食谱分开建模。
- [x] 用餐记录允许只写文本。
- [x] 采用 workspace / 家庭空间模型。
- [x] MVP 不开放注册，后续支持邀请码。
- [x] 推荐默认排除最近 3 天，候选不足时放宽。
- [x] 每日备份数据库和 uploads，正式使用前增加异地备份。
- [x] MVP 支持基础 PWA，不做复杂离线。
- [x] API 使用 REST JSON API + OpenAPI。
- [x] 前端使用 TanStack Query + React 本地状态。
- [x] 表单使用 React Hook Form + Zod，后端 DTO + class-validator。
- [x] MVP 后端关键测试优先，前端先 type-check + 手动真机测试。

---

## 19. 后续实现前需要细化

进入实现前，需要继续明确：

- 具体 Prisma 数据模型。
- 具体 API 路径和请求/响应结构。
- 具体页面结构。
- 具体 Docker Compose 和 Nginx 配置。
- Session 存储方式。
- uploads 文件访问权限。
- 备份脚本和恢复流程。
- 初始管理员 seed 方式。
