# 部署自动化增强功能

## 概述

本次更新为 WaterMenu 的部署脚本添加了自动备份、健康检查和自动回滚功能，提升生产部署的安全性和可靠性。

## 新增功能

### 1. 预部署自动备份

每次部署前自动备份数据库，确保可以在出现问题时恢复数据：

```bash
sudo ./scripts/deploy.sh
# 自动执行数据库备份
# 备份失败时中止部署
```

跳过备份（不推荐）：
```bash
sudo ./scripts/deploy.sh --skip-backup
```

### 2. 健康检查

部署完成后自动验证所有服务：

- **容器状态检查**：postgres, backend, nginx 是否运行
- **API 健康检查**：调用 `/api/health` 端点
- **重试机制**：3 次尝试，每次间隔 5 秒

```bash
sudo ./scripts/deploy.sh
# 自动运行健康检查
# 失败时触发自动回滚
```

跳过健康检查（不推荐）：
```bash
sudo ./scripts/deploy.sh --skip-health-check
```

### 3. 自动回滚

健康检查失败时自动回滚到上一个成功的版本：

```bash
# 自动回滚触发条件：
# - 容器无法启动
# - API 健康检查失败
# - 服务响应超时

# 自动回滚操作：
# 1. 恢复上一次的 Docker 镜像
# 2. 重启服务
# 3. 验证回滚后的健康状态
```

### 4. 手动回滚

如需手动回滚到上一版本：

```bash
# 仅回滚应用（不含数据库）
sudo ./scripts/rollback.sh

# 回滚应用并恢复数据库
sudo ./scripts/rollback.sh --restore-db
```

### 5. 部署日志

所有部署操作记录到日志文件：

```bash
# 查看最近的部署日志
ls -lht deploy/logs/

# 查看特定部署的详细日志
tail -f deploy/logs/deployment-20260612-164500.log

# 搜索错误
grep -i error deploy/logs/deployment-*.log
```

日志包含：
- 部署开始/结束时间
- Git commit 哈希
- 每个步骤的执行结果
- 备份状态
- 健康检查结果
- 回滚事件

### 6. 自动清理

部署成功后自动清理旧文件：

- 保留最近 10 个数据库备份
- 保留最近 5 个 Docker 镜像备份
- 保留最近 30 个部署日志

## 使用方法

### 首次部署

```bash
git clone <你的仓库地址> WaterMenu
cd WaterMenu
sudo ./scripts/deploy.sh
```

首次部署会自动跳过备份步骤（因为数据库不存在）。

### 升级部署

```bash
cd WaterMenu
git pull
sudo ./scripts/deploy.sh
```

升级部署流程：
1. ✅ 自动备份数据库
2. ✅ 标记当前镜像（用于回滚）
3. ✅ 构建新镜像
4. ✅ 启动服务
5. ✅ 运行健康检查
6. ✅ 保存部署记录
7. ✅ 清理旧备份

如果第 5 步健康检查失败，自动回滚到第 2 步标记的镜像。

### 回滚部署

```bash
# 回滚应用
sudo ./scripts/rollback.sh

# 回滚应用并恢复数据库
sudo ./scripts/rollback.sh --restore-db
```

回滚流程：
1. 停止当前服务
2. 恢复上一版本的镜像
3. 重启服务
4. 运行健康检查
5. （可选）恢复数据库备份

### 查看部署状态

```bash
# 查看最近一次部署记录
cat deploy/.last-deployment

# 查看可回滚的镜像
docker images | grep backup

# 查看可恢复的数据库备份
ls -lht deploy/backups/postgres/
```

## 文件结构

```
scripts/
├── deploy.sh              # 主部署脚本（增强版）
├── rollback.sh            # 回滚脚本（新增）
├── backup-postgres.sh     # 数据库备份（已有）
├── restore-postgres.sh    # 数据库恢复（已有）
└── lib/
    ├── logger.sh          # 日志工具（新增）
    └── health-check.sh    # 健康检查工具（新增）

deploy/
├── .last-deployment       # 最近一次部署记录（新增）
├── logs/                  # 部署日志目录（新增）
│   └── deployment-*.log
└── backups/
    └── postgres/          # 数据库备份目录
```

## 故障排查

### 部署失败

```bash
# 1. 查看部署日志
tail -f deploy/logs/deployment-*.log

# 2. 查看服务日志
docker compose -f docker-compose.prod.yml logs -f

# 3. 检查容器状态
docker compose -f docker-compose.prod.yml ps

# 4. 手动运行健康检查
curl http://localhost:8080/api/health
```

### 回滚失败

```bash
# 1. 查看回滚日志
tail -f deploy/logs/deployment-*.log

# 2. 检查可用的备份镜像
docker images | grep backup

# 3. 手动恢复镜像
docker tag watermenu-backend:backup-<timestamp> watermenu-backend:latest
docker tag watermenu-frontend:backup-<timestamp> watermenu-frontend:latest
docker compose -f docker-compose.prod.yml up -d
```

### 备份失败

```bash
# 1. 检查 PostgreSQL 容器状态
docker compose -f docker-compose.prod.yml ps postgres

# 2. 检查磁盘空间
df -h deploy/backups/

# 3. 手动运行备份
./scripts/backup-postgres.sh

# 4. 跳过备份继续部署（不推荐）
sudo ./scripts/deploy.sh --skip-backup
```

## 性能影响

| 操作 | 增加时间 | 说明 |
|------|---------|------|
| 预部署备份 | ~10-30秒 | 取决于数据库大小 |
| 镜像标记 | <1秒 | 几乎无影响 |
| 健康检查 | ~5-15秒 | 3次重试，每次5秒 |
| 清理旧文件 | ~1-5秒 | 取决于文件数量 |
| **总计** | **~20-50秒** | 为安全性付出的合理代价 |

## 安全注意事项

1. **备份重要性**：不要使用 `--skip-backup`，备份是数据安全的最后防线
2. **健康检查**：不要使用 `--skip-health-check`，它是自动回滚的触发器
3. **数据库回滚**：使用 `--restore-db` 前请三思，会丢失备份后的所有数据
4. **日志安全**：部署日志可能包含敏感信息，注意保护 `deploy/logs/` 目录
5. **磁盘空间**：定期检查 `deploy/backups/` 和 Docker 镜像占用的空间

## 相关文档

- [快速部署指南](../deploy/QUICK_START.md)
- [部署规范与问题记录](../.trellis/spec/deployment.md)
- [完整部署文档](../deploy/README.md)
