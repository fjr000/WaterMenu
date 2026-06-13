#!/bin/bash
set -e

# WaterMenu 一键部署脚本
# 适用于全新服务器或已有 Docker 环境的服务器

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source utilities
# shellcheck source=scripts/lib/logger.sh
source "${SCRIPT_DIR}/lib/logger.sh"
# shellcheck source=scripts/lib/health-check.sh
source "${SCRIPT_DIR}/lib/health-check.sh"
# shellcheck source=scripts/lib/pre-check.sh
source "${SCRIPT_DIR}/lib/pre-check.sh"
# shellcheck source=scripts/lib/swap-manager.sh
source "${SCRIPT_DIR}/lib/swap-manager.sh"

# Parse command-line arguments
SKIP_BACKUP=false
SKIP_HEALTH_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-backup] [--skip-health-check]"
            exit 1
            ;;
    esac
done

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "\033[0;31m[ERROR]\033[0m 请使用 root 用户或 sudo 运行此脚本"
    exit 1
fi

# Initialize logging
cd "$PROJECT_ROOT"
init_log
cleanup_old_logs 30

# Log git commit info
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log_info "Git commit: ${COMMIT_HASH}"

log_info "=== WaterMenu 一键部署脚本 ==="
echo ""

# 步骤 0: 预检查
log_info "步骤 0/9: 运行预检查"
if ! run_pre_checks; then
    log_error "预检查失败，部署已中止"
    exit 1
fi
echo ""

# 步骤 1: 检查 Docker 安装
log_info "步骤 1/9: 检查 Docker 环境"
if ! command -v docker &> /dev/null; then
    log_warning "未检测到 Docker，开始安装..."

    # 安装依赖
    apt update
    apt install -y ca-certificates curl gnupg lsb-release jq

    # 添加 Docker GPG key（使用阿里云镜像）
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # 添加 Docker 仓库（阿里云镜像）
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # 安装 Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # 配置镜像加速
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.1panel.live",
    "https://hub.rat.dev"
  ]
}
EOF

    # 启动 Docker
    systemctl daemon-reload
    systemctl restart docker
    systemctl enable docker

    log_success "Docker 安装完成"
else
    log_success "Docker 已安装: $(docker --version)"
fi

# 验证 Docker Compose
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose 未正确安装"
    exit 1
fi
log_success "Docker Compose 已安装: $(docker compose version)"

# 步骤 2: 准备环境变量
echo ""
log_info "步骤 2/9: 配置环境变量"
if [ ! -f deploy/env/prod.env ]; then
    cp deploy/env/prod.env.example deploy/env/prod.env
    log_warning "已创建 deploy/env/prod.env，请立即编辑以下配置："
    echo ""
    echo "  1. POSTGRES_PASSWORD - 数据库密码"
    echo "  2. DATABASE_URL - 确保密码与 POSTGRES_PASSWORD 一致"
    echo "  3. SESSION_SECRET - 至少 32 字符的随机字符串"
    echo "  4. SEED_USER_EMAIL - 管理员邮箱"
    echo "  5. SEED_USER_PASSWORD - 管理员密码"
    echo ""
    log_warning "按任意键打开编辑器..."
    read -n 1 -s
    nano deploy/env/prod.env
else
    log_success "环境变量文件已存在"
fi

# 验证关键配置（排除注释行）
if grep -v '^#' deploy/env/prod.env | grep -q "change-me"; then
    log_error "检测到未修改的 'change-me' 配置，请完整填写 deploy/env/prod.env"
    exit 1
fi
log_success "环境变量配置验证通过"

# 步骤 3: 检查证书（可选）
echo ""
log_info "步骤 3/9: 检查 HTTPS 证书"
if [ -f deploy/certs/fullchain.pem ] && [ -f deploy/certs/privkey.pem ]; then
    log_success "检测到 HTTPS 证书"
else
    log_warning "未检测到 HTTPS 证书文件"
    echo "  证书路径: deploy/certs/fullchain.pem 和 deploy/certs/privkey.pem"
    echo "  如果暂时不配置 HTTPS，需要修改 Nginx 配置为 HTTP only"
    echo ""
    echo "是否继续部署？(y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_error "部署已取消"
        exit 1
    fi
fi

# 步骤 4: 预部署备份
echo ""
log_info "步骤 4/9: 预部署数据库备份"
if [ "$SKIP_BACKUP" = true ]; then
    log_warning "跳过预部署备份 (--skip-backup)"
else
    # Check if postgres container is running
    if docker compose -f docker-compose.prod.yml ps postgres 2>/dev/null | grep -q "running"; then
        log_info "执行数据库备份..."
        if bash "${SCRIPT_DIR}/backup-postgres.sh"; then
            log_success "数据库备份完成"
        else
            log_error "数据库备份失败，部署已中止"
            log_error "使用 --skip-backup 标志跳过备份（不推荐）"
            exit 1
        fi
    else
        log_info "PostgreSQL 容器未运行，跳过备份（首次部署）"
    fi
fi

# 步骤 5: 构建镜像
echo ""
log_info "步骤 5/9: 构建 Docker 镜像（可能需要几分钟）"
log_info "使用串行构建模式以节省内存..."

# Tag current images before building new ones (for rollback)
log_info "标记当前镜像用于回滚..."
TIMESTAMP=$(date +%s)
docker tag watermenu-backend:latest "watermenu-backend:backup-${TIMESTAMP}" 2>/dev/null || log_info "后端镜像不存在（首次部署）"
docker tag watermenu-frontend:latest "watermenu-frontend:backup-${TIMESTAMP}" 2>/dev/null || log_info "前端镜像不存在（首次部署）"

# Build new images with memory limit and serial mode
log_info "开始构建（串行模式 + 内存限制）..."
export DOCKER_BUILDKIT=1

# Build backend first
log_info "构建后端镜像..."
docker compose -f docker-compose.prod.yml build --memory 1g backend

# Build frontend second
log_info "构建前端镜像..."
docker compose -f docker-compose.prod.yml build --memory 1g nginx

log_success "镜像构建完成"

# 步骤 6: 启动服务
echo ""
log_info "步骤 6/9: 启动服务"
docker compose -f docker-compose.prod.yml up -d
log_success "服务已启动"

# 等待后端健康检查
log_info "等待服务启动..."
sleep 5

# 步骤 7: 运行健康检查
echo ""
log_info "步骤 7/9: 运行健康检查"
HEALTH_CHECK_PASSED=false

if [ "$SKIP_HEALTH_CHECK" = true ]; then
    log_warning "跳过健康检查 (--skip-health-check)"
    HEALTH_CHECK_PASSED=true
else
    if run_health_checks 8080; then
        log_success "健康检查通过"
        HEALTH_CHECK_PASSED=true
    else
        log_error "健康检查失败，开始自动回滚..."

        # Auto-rollback: restore previous images
        if [ -n "$TIMESTAMP" ]; then
            log_info "恢复之前的镜像..."
            # Check if backup images exist
            if docker image inspect "watermenu-backend:backup-${TIMESTAMP}" &>/dev/null && \
               docker image inspect "watermenu-frontend:backup-${TIMESTAMP}" &>/dev/null; then
                docker tag "watermenu-backend:backup-${TIMESTAMP}" watermenu-backend:latest && \
                docker tag "watermenu-frontend:backup-${TIMESTAMP}" watermenu-frontend:latest && \
                docker compose -f docker-compose.prod.yml up -d && \
                sleep 5 && \
                log_success "已回滚到之前的版本" || log_error "自动回滚失败"
            else
                log_error "未找到备份镜像，无法自动回滚（可能是首次部署）"
            fi
        else
            log_error "未标记备份镜像，无法回滚"
        fi

        log_error "部署失败"
        log_error "请检查日志: docker compose -f docker-compose.prod.yml logs"
        exit 1
    fi
fi

# Save deployment info for rollback (only if health check passed)
if [ "$HEALTH_CHECK_PASSED" = true ]; then
    log_info "保存部署记录..."
    LAST_DEPLOYMENT_FILE="deploy/.last-deployment"

    # Check if we have valid backup images
    if docker image inspect "watermenu-backend:backup-${TIMESTAMP}" &>/dev/null && \
       docker image inspect "watermenu-frontend:backup-${TIMESTAMP}" &>/dev/null; then
        cat > "$LAST_DEPLOYMENT_FILE" <<EOF
BACKEND_IMAGE=watermenu-backend:backup-${TIMESTAMP}
FRONTEND_IMAGE=watermenu-frontend:backup-${TIMESTAMP}
COMMIT_HASH=${COMMIT_HASH}
DEPLOYED_AT=$(date -Iseconds)
EOF
        log_success "部署记录已保存: ${LAST_DEPLOYMENT_FILE}"
    else
        log_info "首次部署，跳过回滚记录保存"
    fi
fi

# 步骤 8: 创建初始管理员
echo ""
log_info "步骤 8/9: 创建初始管理员账号"
if docker compose -f docker-compose.prod.yml exec -T backend pnpm prisma:seed; then
    log_success "管理员账号创建成功"
else
    log_warning "管理员账号创建失败（可能已存在）"
fi

# 显示状态和访问信息
echo ""
log_info "步骤 9/9: 验证部署状态"
docker compose -f docker-compose.prod.yml ps

# Show memory usage
echo ""
log_info "当前内存使用情况:"
free -h | grep -E '^(Mem|Swap):'

# Cleanup old backups and images
echo ""
log_info "清理旧备份和镜像..."
# Keep last 10 backups
if [ -d deploy/backups/postgres ]; then
    BACKUP_COUNT=$(find deploy/backups/postgres -name "*.dump" | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        log_info "清理旧数据库备份（保留最近 10 个）"
        find deploy/backups/postgres -name "*.dump" -type f | sort | head -n -10 | xargs rm -f
    fi
fi

# Keep last 5 image backups
log_info "清理旧镜像备份（保留最近 5 个）"
docker images --format "{{.Repository}}:{{.Tag}}" | grep "watermenu-backend:backup-" | sort -r | tail -n +6 | xargs -r docker rmi 2>/dev/null || true
docker images --format "{{.Repository}}:{{.Tag}}" | grep "watermenu-frontend:backup-" | sort -r | tail -n +6 | xargs -r docker rmi 2>/dev/null || true
log_success "清理完成"

echo ""
log_success "=== 部署完成 ==="
log_info "Git commit: ${COMMIT_HASH}"
log_info "部署日志: ${LOG_FILE}"
echo ""
echo "服务访问地址:"
echo "  - 前端页面: https://你的域名/"
echo "  - API 文档: https://你的域名/api/docs"
echo "  - 健康检查: https://你的域名/api/health"
echo ""
echo "管理员登录信息（在 deploy/env/prod.env 中配置）:"
echo "  - 邮箱: $(grep SEED_USER_EMAIL deploy/env/prod.env | cut -d= -f2)"
echo ""
echo "常用命令:"
echo "  - 查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo "  - 重启服务: docker compose -f docker-compose.prod.yml restart"
echo "  - 停止服务: docker compose -f docker-compose.prod.yml down"
echo "  - 数据备份: ./scripts/backup-postgres.sh"
echo "  - 手动回滚: ./scripts/rollback.sh"
echo ""
log_warning "提示: 请定期执行数据库备份！"
