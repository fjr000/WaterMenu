# 优化一键部署脚本支持低配服务器

## Goal

针对 2核2GB 低配服务器优化现有部署脚本，避免构建时 OOM，提升部署成功率和稳定性。

## What I already know

### 现有部署流程 (scripts/deploy.sh)
- 8 步流程：Docker 安装 → 环境变量 → 证书检查 → 备份 → 构建镜像 → 启动服务 → 健康检查 → Seed 数据
- 已有自动回滚机制（健康检查失败时）
- 并行构建两个镜像（backend + frontend）
- 使用阿里云 Docker 镜像加速

### 技术栈资源需求
- PostgreSQL 17-alpine: ~150-250MB
- Node.js backend (NestJS + Prisma): ~200-350MB
- Nginx + React frontend: ~10-20MB
- 构建时峰值: ~1.5-1.8GB（pnpm install + TypeScript 编译）
- **实际可用内存**: 2GB 服务器实际可用约 1.5GB（系统占用 ~500MB）

### 当前问题
- 2核2GB 服务器实际可用内存仅 1.5GB，构建阶段极易 OOM
- `docker compose build` 默认并行构建，内存消耗高
- 没有内存限制和 swap 检查
- 没有构建策略选项（本地构建 vs 远程构建）

## Assumptions (temporary)

- 目标服务器是阿里云 ECS 或类似云服务器
- 用户有 root/sudo 权限
- 部署环境是全新服务器或现有生产环境
- 用户希望最小化手动操作

## Acceptance Criteria

* [ ] 部署前自动检查可用内存，< 1.5GB 时提示创建 swap
* [ ] 用户确认后自动创建 2GB swap（验证不重复创建）
* [ ] 构建采用串行模式 `--parallel 1` + 内存限制 `--memory=1g`
* [ ] docker-compose.prod.yml 添加容器内存限制
* [ ] 预检查包含：内存、磁盘、Docker 版本、端口占用
* [ ] 预检查失败时给出明确修复指引
* [ ] 2核2GB 服务器完整部署流程测试通过

## Definition of Done

* 脚本通过 shellcheck 检查
* 在 2核2GB 测试环境部署成功
* 更新 `.trellis/spec/deployment.md` 添加低配优化说明
* 部署日志包含内存使用监控信息

## Out of Scope

* CI/CD 远程构建方案（未来优化）
* 动态调整内存限制（根据实际可用内存）
* Kubernetes / 容器编排平台支持

## Requirements

### 1. Swap 空间管理
- ✅ **选项 A**: 自动检查并提示创建 swap
- 检测可用内存 < 3GB 时提示用户
- 提供一键创建 2GB swap 的选项（用户确认后执行）
- 验证 swap 是否已启用（避免重复创建）

### 2. Docker 构建策略
- ✅ **选项 A**: 串行构建 + 内存限制
- `docker compose build --parallel 1`（一次只构建一个镜像）
- 设置 Docker 构建内存限制 `--memory=1g`
- 构建时间增加 2-3 分钟，但稳定性大幅提升

### 3. 运行时内存优化
- ✅ **调整后的选项 A**: 保守的容器内存限制（适配 1.5GB 可用内存）
- PostgreSQL: `mem_limit: 384m`
- Backend: `mem_limit: 640m` + `NODE_OPTIONS=--max-old-space-size=480`
- Nginx: `mem_limit: 128m`
- 总计约 1.15GB，为系统保留 350MB

### 4. 部署前环境检查
- ✅ **选项 A**: 完整的预检查
- 检查可用内存（< 1.5GB 强制要求 swap）
- 检查磁盘空间（至少 10GB 可用）
- 检查 Docker 版本兼容性
- 检查端口占用（8080/8443）
- 预检查失败时给出明确修复指引

## Technical Approach

### 实施步骤

**1. 创建预检查模块 (`scripts/lib/pre-check.sh`)**
- 检查可用内存函数 `check_memory()`
- 检查磁盘空间函数 `check_disk_space()`
- 检查端口占用函数 `check_ports()`
- 检查 Docker 版本函数 `check_docker_version()`

**2. 创建 swap 管理模块 (`scripts/lib/swap-manager.sh`)**
- 检测 swap 是否启用 `check_swap()`
- 创建 swap 函数 `create_swap(size_gb)`
- 验证 swap 创建成功 `verify_swap()`

**3. 修改 `scripts/deploy.sh`**
- 步骤 0: 运行预检查（新增）
- 步骤 0.5: Swap 检查和创建（新增）
- 步骤 5: 构建镜像时使用 `--parallel 1 --memory=1g`

**4. 修改 `docker-compose.prod.yml`**
- 添加服务内存限制 `mem_limit`
- Backend 添加 `NODE_OPTIONS` 环境变量

**5. 更新文档**
- `.trellis/spec/deployment.md` 添加低配优化章节

## Decision (ADR-lite)

**Context**: 2核2GB 低配服务器实际可用内存仅 1.5GB，并行构建和无内存限制会导致 OOM

**Decision**: 
1. 强制要求 swap（部署前自动检查和创建）
2. 串行构建 + 构建时内存限制
3. 运行时容器内存限制

**Consequences**:
- ✅ 大幅提升低配服务器部署成功率
- ✅ 避免 OOM 导致的系统崩溃
- ⚠️ 构建时间增加 2-3 分钟
- ⚠️ 性能受内存限制影响，适合小流量场景 (<100 并发)

