# 修复 Docker 网络与 Clash 的 172.19.0.0/16 冲突

## Goal

修复 WSL 环境下 Docker 默认网络 `watermenu_default` (172.19.0.0/16) 与 Windows Clash 代理服务的网段冲突，导致 DNS 解析失败的问题。在不影响现有部署和调试的前提下，将 Docker 网络迁移到不冲突的网段。

## What I already know

* 当前 `docker-compose.yml` 未显式定义 networks，使用 Docker 默认网络（自动分配为 172.19.0.0/16）
* 冲突根本原因：Clash 在 172.19.0.1 运行服务，与 Docker 网桥 `br-28b08764439a` 网段重叠
* DNS 查询被劫持到 Docker 网段不存在的地址（如 172.19.0.7），导致 "Destination Host Unreachable"
* postgres 容器当前已停止（Exited 5 hours ago）
* 容器名称：`watermenu-postgres`，映射端口 5432:5432
* 数据持久化在 named volume `postgres_data`
* 用户要求：不影响部署和调试

## Assumptions (temporary)

* 目标网段 172.20.0.0/16 不与其他服务冲突
* 数据卷 `postgres_data` 不受网络配置变更影响
* 应用代码通过 `localhost:5432` 连接数据库，不依赖容器内网 IP

## Open Questions

（无）

## Requirements

* 在 `docker-compose.yml` 中显式定义 networks 配置
* 将网段从默认 172.19.0.0/16 改为 172.20.0.0/16
* 确保 postgres 容器使用新网络
* 保留所有现有配置（镜像、环境变量、端口映射、数据卷、健康检查）
* 变更后容器能正常启动并通过健康检查
* 外部通过 `localhost:5432` 访问数据库的方式不变

## Acceptance Criteria

* [ ] `docker-compose.yml` 增加 networks 配置，指定 subnet 172.20.0.0/16
* [ ] postgres 服务关联到新网络
* [ ] `docker-compose up -d` 成功启动容器
* [ ] 容器健康检查通过（`docker ps` 显示 healthy）
* [ ] `docker network ls` 显示新网络名称和驱动
* [ ] `docker network inspect <network>` 确认 subnet 为 172.20.0.0/16
* [ ] 旧的 `watermenu_default` 网络已被清理或不再使用

## Definition of Done

* 配置文件已修改并测试
* 容器成功启动并健康检查通过
* 网络配置验证完成（subnet 正确）
* 更新文档或添加注释说明网络配置的原因（防止未来误改回 172.19）

## Technical Approach

修改 `docker-compose.yml`，在顶层添加 `networks` 定义，指定自定义网段 172.20.0.0/16，并在 postgres 服务中引用该网络。

## Out of Scope

* 修改 Clash 配置（Windows 侧）
* 删除现有 Docker 网络（会自动处理）
* 修改 WSL DNS 配置（已在报告中完成）
* 应用代码的数据库连接配置（假设使用 localhost）
* 添加 DNS 缓存清理别名到 `.bashrc`（用户选择不做）

## Technical Notes

* 参考文件：`/tmp/wsl_clash_dns_diagnosis_report.md` - 方案 2
* Docker Compose 会自动创建新网络，旧网络在容器停止后会被 prune 清理
* Named volume `postgres_data` 独立于网络配置，不会丢失数据
* 容器名称 `watermenu-postgres` 保持不变，外部访问方式不变
