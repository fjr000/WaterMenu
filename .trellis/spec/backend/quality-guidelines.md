# 后端质量规范

> 当前后端已接入 NestJS + TypeScript。本规范记录真实质量命令和认证测试边界。

---

## 基础原则

1. **先思考，零假设**：需求不清、能力不明、实现路径有分歧时停止并询问。
2. **最小可用**：只写完成当前任务所需的最少代码，不添加未请求功能。
3. **复用优先**：已有工具、模块、模式可用时优先复用。
4. **手术式修改**：严格限制改动范围，不重构无关代码。
5. **简单命名**：变量、方法、文件名保持直观、容易搜索。
6. **清理自己的变更**：只删除本次改动造成的死代码或无用导入；既有问题只说明，不擅自处理。

---

## 禁止模式

- 不基于真实源码编造框架、目录、工具或测试命令。
- 不为了兼容未知旧逻辑写臃肿代码。
- 不用临时 hack 掩盖根因。
- 不顺手格式化或优化无关文件。

---

## 验证要求

- MVP 后端关键测试优先：workspace 数据隔离、登录态访问控制、推荐规则、用餐记录关联/未关联菜品、反馈权重。
当前后端质量命令：

```bash
pnpm --filter @watermenu/backend typecheck
pnpm --filter @watermenu/backend lint
pnpm --filter @watermenu/backend test
pnpm --filter @watermenu/backend build
pnpm --filter @watermenu/backend prisma:generate
```

认证闭环测试位于 `backend/test/auth.e2e-spec.ts`，至少应断言：

- 未登录访问 `GET /api/auth/me` 返回 401。
- 正确 email/password 登录成功并设置 `Set-Cookie`。
- 登录后携带 cookie 访问 `GET /api/auth/me` 返回 user/workspace。
- 错误密码和不存在用户返回 401，且不泄露差异化原因。
- API 返回体不包含 `password` / `passwordHash`。
- `POST /api/auth/logout` 后原 cookie 不再能访问 `GET /api/auth/me`。
- 修复 bug 时应先复现，再修复，再运行相关验证。

---

## 源码示例

实际参考路径：

- `backend/test/auth.e2e-spec.ts`
- `backend/eslint.config.mjs`
- `backend/jest.config.cjs`
- `backend/package.json`
