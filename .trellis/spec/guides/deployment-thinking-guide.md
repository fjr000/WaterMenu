# Deployment Thinking Guide

> **Purpose**: 部署前检查，避免 Docker 构建失败和生产环境依赖问题。

## 依赖变更检查清单

当你移动、添加或删除依赖时：

- [ ] `pnpm-lock.yaml` 是否已更新？（运行 `pnpm install` 后提交 lockfile）
- [ ] 移动依赖（devDependencies ↔ dependencies）后 lockfile 是否同步？
- [ ] Dockerfile 中 `--frozen-lockfile` 能否通过？

### Common Mistake: 忘记更新 lockfile

**Symptom**: Docker 构建报错 `ERR_PNPM_OUTDATED_LOCKFILE`

**Cause**: 修改了 `package.json` 的依赖分类但没有运行 `pnpm install` 更新 lockfile

**Fix**:
```bash
pnpm install          # 更新 lockfile
git add pnpm-lock.yaml
git commit
```

**Prevention**: 修改 `package.json` 后立即运行 `pnpm install` 并提交 lockfile。

## Dockerfile 多阶段构建检查清单

当你修改 Dockerfile 时：

- [ ] 生产依赖（`--prod`）是否包含运行时需要的所有包？
- [ ] CLI 工具（prisma、nest 等）是否在正确的 dependencies 分类中？
- [ ] 构建产物是否从正确的阶段和路径复制？

### Common Mistake: 生产阶段缺少运行时依赖

**Symptom**: 容器启动报错 `Cannot find module 'xxx'`

**Cause**: 包在 `devDependencies` 中，但生产环境用 `pnpm install --prod` 不会安装它

**Decision Rule**:
- 运行时需要（`prisma migrate deploy`、`multer` 等）→ `dependencies`
- 仅构建/开发需要（`@types/*`、`eslint`、`jest` 等）→ `devDependencies`

### Common Mistake: Prisma Client 路径问题

**Symptom**: Docker COPY 找不到 Prisma Client 文件

**Cause**: pnpm workspace 中包的依赖位置取决于 hoisting 策略

**当前方案**: 将 `prisma` 放在 dependencies，容器启动时运行 `prisma generate`

```dockerfile
CMD ["sh", "-c", "pnpm prisma:generate && pnpm prisma:deploy && pnpm start"]
```

## Quick Reference

```
修改 package.json 依赖？
  └─ pnpm install → 提交 lockfile → 推送

修改 Dockerfile？
  └─ 确认 --prod 依赖完整 → 构建测试 → 推送

移动包到 dependencies？
  └─ 确认 lockfile 更新 → 确认 Dockerfile 兼容 → 推送
```

---

**Core Principle**: 本地能跑 ≠ Docker 能构建。依赖变更必须同时验证 lockfile 和 Dockerfile。
