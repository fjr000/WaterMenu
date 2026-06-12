#!/bin/bash
set -e

# WaterMenu 回滚脚本
# 回滚到上一次成功部署的版本

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source utilities
# shellcheck source=scripts/lib/logger.sh
source "${SCRIPT_DIR}/lib/logger.sh"
# shellcheck source=scripts/lib/health-check.sh
source "${SCRIPT_DIR}/lib/health-check.sh"

# Parse command-line arguments
RESTORE_DB=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --restore-db)
            RESTORE_DB=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--restore-db]"
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

log_info "=== WaterMenu 回滚脚本 ==="
log_warning "此操作将回滚到上一次成功部署的版本"

# Check if .last-deployment exists
LAST_DEPLOYMENT_FILE="deploy/.last-deployment"
if [ ! -f "$LAST_DEPLOYMENT_FILE" ]; then
    log_error "未找到上次部署记录: ${LAST_DEPLOYMENT_FILE}"
    log_error "无法执行回滚"
    exit 1
fi

# Read last deployment info
log_info "读取上次部署记录..."
source "$LAST_DEPLOYMENT_FILE"

if [ -z "$BACKEND_IMAGE" ] || [ -z "$FRONTEND_IMAGE" ]; then
    log_error "部署记录格式错误"
    exit 1
fi

log_info "上次部署信息:"
log_info "  后端镜像: ${BACKEND_IMAGE}"
log_info "  前端镜像: ${FRONTEND_IMAGE}"
log_info "  提交哈希: ${COMMIT_HASH}"
log_info "  部署时间: ${DEPLOYED_AT}"

# Confirm rollback
echo ""
echo "确认回滚？(y/n)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    log_info "回滚已取消"
    exit 0
fi

# Step 1: Stop current services
log_info "步骤 1/4: 停止当前服务..."
docker compose -f docker-compose.prod.yml down
log_success "服务已停止"

# Step 2: Tag current images (in case we need to roll back the rollback)
log_info "步骤 2/4: 保存当前镜像标签..."
ROLLBACK_TIMESTAMP=$(date +%s)
docker tag watermenu-backend:latest "watermenu-backend:before-rollback-${ROLLBACK_TIMESTAMP}" 2>/dev/null || true
docker tag watermenu-frontend:latest "watermenu-frontend:before-rollback-${ROLLBACK_TIMESTAMP}" 2>/dev/null || true
log_success "当前镜像已备份"

# Step 3: Restore old images
log_info "步骤 3/4: 恢复旧版本镜像..."

# Tag old images as latest
if docker image inspect "$BACKEND_IMAGE" &>/dev/null; then
    docker tag "$BACKEND_IMAGE" watermenu-backend:latest
    log_success "后端镜像已恢复"
else
    log_error "未找到后端镜像: ${BACKEND_IMAGE}"
    exit 1
fi

if docker image inspect "$FRONTEND_IMAGE" &>/dev/null; then
    docker tag "$FRONTEND_IMAGE" watermenu-frontend:latest
    log_success "前端镜像已恢复"
else
    log_error "未找到前端镜像: ${FRONTEND_IMAGE}"
    exit 1
fi

# Restart services with old images
log_info "启动服务..."
docker compose -f docker-compose.prod.yml up -d
log_success "服务已启动"

# Wait for services to start
log_info "等待服务启动..."
sleep 5

# Step 4: Health check
log_info "步骤 4/4: 运行健康检查..."
if run_health_checks 8080; then
    log_success "健康检查通过"
else
    log_error "回滚后健康检查失败"
    log_error "请手动检查服务状态"
    exit 1
fi

# Database restore (optional)
if [ "$RESTORE_DB" = true ]; then
    echo ""
    log_warning "=== 数据库恢复 ==="
    log_warning "此操作将恢复数据库到备份时的状态"
    log_warning "所有备份后的数据将丢失"
    echo ""
    echo "确认恢复数据库？(yes/no)"
    read -r db_response
    if [ "$db_response" = "yes" ]; then
        # List recent backups
        log_info "最近的备份文件:"
        ls -lht deploy/backups/postgres/*.dump 2>/dev/null | head -5 || {
            log_error "未找到备份文件"
            exit 1
        }
        echo ""
        echo "请输入备份文件路径:"
        read -r backup_file

        if [ -f "$backup_file" ]; then
            log_info "恢复数据库: ${backup_file}"
            if bash "${SCRIPT_DIR}/restore-postgres.sh" "$backup_file"; then
                log_success "数据库恢复成功"
            else
                log_error "数据库恢复失败"
                exit 1
            fi
        else
            log_error "备份文件不存在: ${backup_file}"
            exit 1
        fi
    else
        log_info "跳过数据库恢复"
    fi
fi

# Success
echo ""
log_success "=== 回滚完成 ==="
log_info "已回滚到提交: ${COMMIT_HASH}"
log_info "回滚日志: ${LOG_FILE}"
echo ""
log_warning "注意: 如需回滚数据库，请运行: $0 --restore-db"
