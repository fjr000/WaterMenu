# 前端技术契约

> 决策来源：`docs/project-definition.md`。当前尚无前端源码，本文件记录已确认的实现契约；后续接入源码后，必须用真实文件路径和组件示例刷新。

---

## 场景：手机优先 React 前端

### 1. 范围 / 触发

- 触发：项目已确定前端技术栈、PWA、状态管理、表单校验和 API 风格。
- 范围：`frontend/` 下的浏览器端实现。
- 当前不实现功能，只记录后续实现必须遵守的契约。

### 2. 签名

前端主技术栈：

```text
React + Vite + TypeScript
Tailwind CSS
TanStack Query
React Hook Form + Zod
REST JSON API + OpenAPI
基础 PWA
```

MVP 不使用：

```text
Next.js
Redux
Zustand
复杂离线同步
```

### 3. 契约

使用端契约：

```text
手机浏览器为主
电脑浏览器用于调试、批量录入和管理
先按手机宽度设计，再兼容电脑宽度
```

PWA 契约：

```text
支持添加到手机桌面
配置应用名称、图标、manifest、主题色
允许基础静态资源缓存
不承诺离线新增、离线编辑、离线图片上传或离线同步
```

服务端数据契约：

```text
TanStack Query 管理服务端数据
React useState/useReducer 管理本地 UI 状态
不把后端数据复制到 Redux/Zustand 类全局 store
```

表单契约：

```text
React Hook Form 管理表单
Zod 做前端即时校验
后端 DTO + class-validator 是最终校验防线
```

API 契约：

```text
前端调用 REST JSON API
登录态通过 Session Cookie 维持
前端不手动保存 JWT
后续可基于 OpenAPI 生成类型
```

UI 契约：

```text
Tailwind CSS 实现手机优先界面
优先自定义轻量组件
不在 MVP 引入大型桌面组件库
```

### 4. 校验与错误矩阵

| 条件 | 前端处理 |
|------|----------|
| 未登录 | 显示登录页或跳转登录 |
| API 返回未认证 | 清理当前用户查询缓存并引导登录 |
| 表单字段非法 | Zod 即时提示，不提交无效表单 |
| 后端返回校验错误 | 显示字段级或表单级错误 |
| 推荐候选为空 | 显示可解释空状态，不显示崩溃页面 |
| 手机网络慢 | 显示加载状态，避免重复提交 |
| PWA 离线访问动态数据 | 不承诺可用，应提示需要网络 |

### 5. Good / Base / Bad Cases

- Good：菜品列表、食谱、用餐记录、当前用户等服务端数据通过 TanStack Query 获取和刷新。
- Good：弹窗开关、当前 tab、盲盒动画状态使用 React 本地状态。
- Base：MVP 页面以手机布局为主，电脑端自然响应式兼容。
- Bad：把菜品列表和用餐记录放入 Redux/Zustand 作为真实数据源。
- Bad：前端把 JWT 存入 localStorage；本项目登录态使用 Session Cookie。
- Bad：MVP 承诺离线记录和自动同步。

### 6. 测试要求

MVP 前端验证：

- TypeScript type-check。
- 移动端宽度 DevTools 检查。
- 手机真机访问。
- 表单校验手动检查。
- PWA 添加到桌面检查。

E2E 暂缓到核心流程稳定后补，优先覆盖：

```text
登录 -> 新增菜品 -> 记录用餐 -> 提交反馈 -> 获取推荐
```

### 7. Wrong vs Correct

#### Wrong

```text
服务端数据 -> Zustand/Redux 全局 store -> 页面读取
```

问题：后端数据容易和前端缓存不同步。

#### Correct

```text
服务端数据 -> TanStack Query -> 页面读取
本地 UI 状态 -> useState/useReducer
```

原因：服务端数据和本地 UI 状态边界清晰，提交后可通过 query invalidation 刷新。

---

## 源码示例

当前无前端源码示例，禁止臆造示例。接入 React 源码后，补充真实页面、组件、hook、query key 和表单路径。
