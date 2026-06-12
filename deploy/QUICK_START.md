# WaterMenu 快速部署指南

本文档提供最简化的部署步骤，适合快速上手。完整文档请查看 [deploy/README.md](./README.md)。

## 前置要求

- 一台 Ubuntu/Debian 服务器（推荐 Ubuntu 24.04）
- root 权限或 sudo 权限
- 域名已解析到服务器（可选，支持 IP 访问）
- 80/443 端口开放

## 方案一：自动化脚本（推荐）

**1. 克隆代码**

```bash
git clone <你的仓库地址> WaterMenu
cd WaterMenu
```

**2. 运行一键部署脚本**

```bash
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

脚本会自动完成：
- ✅ 检测并安装 Docker（如果未安装）
- ✅ 配置 Docker 镜像加速
- ✅ 创建环境变量配置文件
- ✅ 引导你编辑必要配置
- ✅ 构建并启动所有服务
- ✅ 创建初始管理员账号

**3. 按提示编辑配置**

脚本会自动打开编辑器，你需要修改：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `POSTGRES_PASSWORD` | 数据库密码 | `MySecureDB@2026` |
| `DATABASE_URL` | 数据库连接（密码需与上面一致） | `postgresql://watermenu:MySecureDB@2026@postgres:5432/watermenu?schema=public` |
| `SESSION_SECRET` | Session 密钥（32+ 字符） | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |
| `SEED_USER_EMAIL` | 管理员邮箱 | `admin@example.com` |
| `SEED_USER_PASSWORD` | 管理员密码 | `Admin@123456` |

保存退出后（Ctrl+O, Enter, Ctrl+X），脚本会自动完成剩余步骤。

---

## 方案二：手动部署

### 1. 安装 Docker

**Ubuntu/Debian:**

```bash
# 快速安装（使用阿里云镜像）
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**配置镜像加速:**

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.1panel.live",
    "https://hub.rat.dev"
  ]
}
EOF
systemctl restart docker
systemctl enable docker
```

### 2. 准备配置

```bash
cd ~/WaterMenu
cp deploy/env/prod.env.example deploy/env/prod.env
nano deploy/env/prod.env
```

修改以下配置（参考上面的表格）：
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `SESSION_SECRET`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`

### 3. 部署服务

```bash
# 构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 创建管理员账号
docker compose -f docker-compose.prod.yml exec backend pnpm prisma:seed

# 查看状态
docker compose -f docker-compose.prod.yml ps
```

### 4. 验证部署

```bash
# 检查服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

访问 `http://你的服务器IP/` 或 `https://你的域名/` 进行测试。

---

## HTTPS 配置（可选）

### 方案 1: 已有证书

将证书文件放置到：
```
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
```

然后重启 Nginx：
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

### 方案 2: 使用 Let's Encrypt

```bash
# 安装 certbot
apt install -y certbot

# 停止 Nginx（避免端口冲突）
docker compose -f docker-compose.prod.yml stop nginx

# 申请证书
certbot certonly --standalone -d 你的域名

# 复制证书
cp /etc/letsencrypt/live/你的域名/fullchain.pem deploy/certs/
cp /etc/letsencrypt/live/你的域名/privkey.pem deploy/certs/

# 重启 Nginx
docker compose -f docker-compose.prod.yml start nginx
```

### 方案 3: 暂不使用 HTTPS

修改 `deploy/nginx/conf.d/watermenu.conf`，注释掉 HTTPS 相关配置，只保留 HTTP 80 端口监听。

---

## 常用命令

```bash
# 查看日志
docker compose -f docker-compose.prod.yml logs -f [服务名]

# 重启服务
docker compose -f docker-compose.prod.yml restart

# 停止服务
docker compose -f docker-compose.prod.yml down

# 数据库备份
./scripts/backup-postgres.sh

# 数据库恢复
./scripts/restore-postgres.sh <备份文件路径>

# 升级应用
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml logs nginx
```

### 登录后 Cookie 不生效

确认使用 HTTPS 访问（生产环境 Cookie 设置了 `secure=true`）。

### 端口被占用

```bash
# 检查 80/443 端口占用
netstat -tlnp | grep -E ':(80|443)'

# 停止占用端口的服务
systemctl stop nginx  # 如果系统安装了 Nginx
```

### 数据库连接失败

检查 `deploy/env/prod.env` 中：
- `POSTGRES_PASSWORD` 是否与 `DATABASE_URL` 中的密码一致
- `DATABASE_URL` 主机名是否为 `postgres`（而非 `localhost`）

---

## 自动备份配置

添加定时任务（每天凌晨 3:30 备份）：

```bash
crontab -e
```

添加以下行：

```cron
30 3 * * * cd /root/WaterMenu && ./scripts/backup-postgres.sh >> /var/log/watermenu-backup.log 2>&1
```

备份文件位置：`deploy/backups/postgres/`

---

## 性能优化建议

1. **配置 swap**（推荐至少 2GB）
2. **启用防火墙**，只开放必要端口
3. **配置自动更新**系统安全补丁
4. **异地备份** `deploy/backups/` 和 `deploy/uploads/`
5. **监控磁盘空间**，定期清理旧备份

---

## 下一步

- 📖 完整部署文档：[deploy/README.md](./README.md)
- 🔧 开发环境配置：[README.md](../README.md)
- 🐛 问题反馈：提交 Issue
