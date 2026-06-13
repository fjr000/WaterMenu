#!/bin/bash
# 测试低配服务器优化功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=== 低配服务器优化功能测试 ==="
echo ""

# Source required modules
source scripts/lib/logger.sh
source scripts/lib/pre-check.sh
source scripts/lib/swap-manager.sh

# Initialize logger (test mode - use /tmp)
export LOG_FILE="/tmp/watermenu-test-$(date +%s).log"
echo "[TEST] Log file: $LOG_FILE"
echo ""

# Test 1: Logger functions
echo "测试 1: 日志函数"
log_info "Info 消息测试"
log_success "Success 消息测试"
log_warning "Warning 消息测试"
echo "✓ 日志函数正常"
echo ""

# Test 2: Memory check
echo "测试 2: 内存检查"
if check_memory; then
    echo "✓ 内存充足"
else
    echo "⚠ 内存不足 (预期行为)"
fi
echo ""

# Test 3: Swap check
echo "测试 3: Swap 检查"
if check_swap_status; then
    echo "✓ Swap 已启用"
else
    echo "⚠ Swap 未启用"
fi
echo ""

# Test 4: Disk space check
echo "测试 4: 磁盘空间检查"
if check_disk_space; then
    echo "✓ 磁盘空间充足"
else
    echo "✗ 磁盘空间不足"
    exit 1
fi
echo ""

# Test 5: Docker version check
echo "测试 5: Docker 版本检查"
if check_docker_version; then
    echo "✓ Docker 版本满足要求"
else
    echo "⚠ Docker 版本可能过低或未安装"
fi
echo ""

# Test 6: Port check
echo "测试 6: 端口检查"
if check_ports; then
    echo "✓ 端口可用"
else
    echo "⚠ 部分端口被占用 (预期行为)"
fi
echo ""

# Test 7: Docker Compose config validation
echo "测试 7: Docker Compose 配置验证"
if docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo "✓ docker-compose.prod.yml 配置有效"
else
    echo "✗ docker-compose.prod.yml 配置错误"
    exit 1
fi
echo ""

# Test 8: Check memory limits in compose file
echo "测试 8: 检查内存限制配置"
if grep -q "mem_limit:" docker-compose.prod.yml; then
    echo "✓ 内存限制已配置"
    echo "  容器内存限制："
    grep -A 1 "mem_limit:" docker-compose.prod.yml | grep -v "^--$"
else
    echo "✗ 未找到内存限制配置"
    exit 1
fi
echo ""

# Test 9: Check NODE_OPTIONS
echo "测试 9: 检查 Node.js 内存限制"
if grep -q "NODE_OPTIONS" docker-compose.prod.yml; then
    echo "✓ NODE_OPTIONS 已配置"
    grep "NODE_OPTIONS" docker-compose.prod.yml
else
    echo "✗ 未找到 NODE_OPTIONS 配置"
    exit 1
fi
echo ""

# Test 10: Check deployment script modifications
echo "测试 10: 检查部署脚本修改"
if grep -q "run_pre_checks" scripts/deploy.sh && \
   grep -q "parallel 1" scripts/deploy.sh && \
   grep -q "memory 1g" scripts/deploy.sh; then
    echo "✓ 部署脚本已集成优化"
else
    echo "✗ 部署脚本优化未完整集成"
    exit 1
fi
echo ""

echo "=== 所有测试通过 ✓ ==="
echo ""
echo "测试日志: $LOG_FILE"
