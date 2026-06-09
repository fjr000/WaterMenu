# Logging Guidelines

> 当前后端没有统一的结构化日志规范，代码主要通过 HTTP 异常与测试暴露问题。

## Overview

当前代码库未建立统一日志层，也未引入自定义 logger 抽象。默认行为依赖 NestJS 内置运行输出与测试失败信息。

Reference files:
- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/test/dishes.e2e-spec.ts`

## Current Practice

当前最稳定的信息传递方式是：

- 业务失败通过 Nest 异常返回给调用方
- 开发阶段通过 e2e 测试确认行为
- 运行状态主要依赖容器进程输出

如果未来添加日志，建议优先围绕这些事件：

- 登录失败
- 邀请创建/撤销/接受
- 图片上传失败
- 资源冲突或权限拦截

Reference files:
- `backend/src/auth/auth.controller.ts`
- `backend/src/invites/invites.service.ts`
- `backend/src/dish-images/dish-images.service.ts`

## Common Mistakes

### Don: 记录敏感信息

如果未来补日志，不要记录密码、原始邀请 token、完整 session secret。

Instead:
- 记录用户 id、workspace id、资源 id、错误类型
- 保留请求关键字段即可，不要保留完整密钥材料

### Don't: 用 print/debug 代替异常反馈

当前代码库更适合把失败原因通过 Nest 异常带回 API 边界，而不是把错误藏进日志并返回模糊成功。

## Verification

当前没有强制日志检查命令。如果后续引入日志规范，请同步更新这个文件并补充验证方式。

```bash
pnpm backend:typecheck
pnpm backend:test
```
