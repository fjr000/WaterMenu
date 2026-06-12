#!/bin/bash
set -e

# WaterMenu 一键部署脚本
# 适用于全新服务器或已有 Docker 环境的服务器

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

echo_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

echo_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} $1"
}

echo_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo_error "请使用 root 用户或 sudo 运行此脚本"
    exit 1
fi

echo_info "=== WaterMenu 一键部署脚本 ==="
echo ""

# 步骤 1: 检查 Docker 安装
echo_info "步骤 1/7: 检查 Docker 环境"
if ! command -v docker &> /dev/null; then
    echo_warning "未检测到 Docker，开始安装..."

    # 安装依赖
    apt update
    apt install -y ca-certificates curl gnupg lsb-release

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

    echo_success "Docker 安装完成"
else
    echo_success "Docker 已安装: $(docker --version)"
fi

# 验证 Docker Compose
if ! docker compose version &> /dev/null; then
    echo_error "Docker Compose 未正确安装"
    exit 1
fi
echo_success "Docker Compose 已安装: $(docker compose version)"

# 步骤 2: 准备环境变量
echo ""
echo_info "步骤 2/7: 配置环境变量"
if [ ! -f deploy/env/prod.env ]; then
    cp deploy/env/prod.env.example deploy/env/prod.env
    echo_warning "已创建 deploy/env/prod.env，请立即编辑以下配置："
    echo ""
    echo "  1. POSTGRES_PASSWORD - 数据库密码"
    echo "  2. DATABASE_URL - 确保密码与 POSTGRES_PASSWORD 一致"
    echo "  3. SESSION_SECRET - 至少 32 字符的随机字符串"
    echo "  4. SEED_USER_EMAIL - 管理员邮箱"
    echo "  5. SEED_USER_PASSWORD - 管理员密码"
    echo ""
    echo_warning "按任意键打开编辑器..."
    read -n 1 -s
    nano deploy/env/prod.env
else
    echo_success "环境变量文件已存在"
fi

# 验证关键配置（排除注释行）
if grep -v '^#' deploy/env/prod.env | grep -q "change-me"; then
    echo_error "检测到未修改的 'change-me' 配置，请完整填写 deploy/env/prod.env"
    exit 1
fi
echo_success "环境变量配置验证通过"

# 步骤 3: 检查证书（可选）
echo ""
echo_info "步骤 3/7: 检查 HTTPS 证书"
if [ -f deploy/certs/fullchain.pem ] && [ -f deploy/certs/privkey.pem ]; then
    echo_success "检测到 HTTPS 证书"
else
    echo_warning "未检测到 HTTPS 证书文件"
    echo "  证书路径: deploy/certs/fullchain.pem 和 deploy/certs/privkey.pem"
    echo "  如果暂时不配置 HTTPS，需要修改 Nginx 配置为 HTTP only"
    echo ""
    echo "是否继续部署？(y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo_error "部署已取消"
        exit 1
    fi
fi

# 步骤 4: 构建镜像
echo ""
echo_info "步骤 4/7: 构建 Docker 镜像（可能需要几分钟）"
docker compose -f docker-compose.prod.yml build
echo_success "镜像构建完成"

# 步骤 5: 启动服务
echo ""
echo_info "步骤 5/7: 启动服务"
docker compose -f docker-compose.prod.yml up -d
echo_success "服务已启动"

# 等待后端健康检查
echo_info "等待服务启动..."
sleep 5

# 步骤 6: 创建初始管理员
echo ""
echo_info "步骤 6/7: 创建初始管理员账号"
if docker compose -f docker-compose.prod.yml exec -T backend pnpm prisma:seed; then
    echo_success "管理员账号创建成功"
else
    echo_warning "管理员账号创建失败（可能已存在）"
fi

# 步骤 7: 显示状态和访问信息
echo ""
echo_info "步骤 7/7: 验证部署状态"
docker compose -f docker-compose.prod.yml ps

echo ""
echo_success "=== 部署完成 ==="
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
echo ""
echo_warning "提示: 请定期执行数据库备份！"
