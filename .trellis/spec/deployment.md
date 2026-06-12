# 部署规范与问题记录

本文档记录生产部署的关键配置、常见问题及解决方案。

---

## 1. 环境配置

### 1.1 必需的环境变量

生产环境 `deploy/env/prod.env` 必须配置以下变量：

```bash
NODE_ENV=production
PORT=3000

# 数据库配置
POSTGRES_DB=watermenu
POSTGRES_USER=watermenu
POSTGRES_PASSWORD=<强密码>
DATABASE_URL=postgresql://watermenu:<强密码>@postgres:5432/watermenu?schema=public

# Session 配置
SESSION_SECRET=<至少32字符的随机字符串>
SESSION_COOKIE_NAME=watermenu.sid
SESSION_MAX_AGE_MS=604800000

# HTTP 环境下的 Session 支持
SESSION_SECURE=false  # HTTP 环境必须设为 false，HTTPS 环境设为 true

# Seed 配置（首次部署后手动执行 seed）
SEED_WORKSPACE_NAME=WaterMenu
SEED_USER_EMAIL=admin@example.com
SEED_USER_PASSWORD=<管理员密码>
SEED_USER_NAME=Admin
```

### 1.2 配置验证规则

**验证点：**
1. `POSTGRES_PASSWORD` 必须与 `DATABASE_URL` 中的密码一致
2. `SESSION_SECRET` 长度必须 >= 32 字符
3. `SEED_USER_EMAIL` 必须是有效邮箱格式
4. HTTP 环境下 `SESSION_SECURE` 必须为 `false`

**错误检测：**
- 脚本 `scripts/deploy.sh` 会检查配置文件中的 `change-me` 字符串
- 只检查非注释行（`grep -v '^#'`）

---

## 2. Session Cookie 配置

### 2.1 场景：HTTP 环境下的登录问题

**触发条件：**
- 生产环境（`NODE_ENV=production`）
- 使用 HTTP 协议访问（无 HTTPS 证书）
- 登录后无法保持会话，Cookie 未生效

**原因：**
默认生产环境 Cookie 设置 `secure: true`，只在 HTTPS 下工作。

**签名（后端）：**
```typescript
// backend/src/session/session.config.ts
export function getSessionCookieOptions(): CookieOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SESSION_SECURE === 'false' ? false : process.env.NODE_ENV === 'production',
  };
}
```

**环境变量契约：**
- `SESSION_SECURE=false` - 允许 HTTP 环境下使用 Session
- `SESSION_SECURE=true` 或未设置 - 生产环境强制 HTTPS

**验证：**
```bash
# 测试登录接口
curl -v -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -c /tmp/cookies.txt

# 检查 Cookie
cat /tmp/cookies.txt | grep watermenu.sid
```

**预期结果：**
- HTTP 环境 + `SESSION_SECURE=false`：Cookie 正常设置
- HTTPS 环境：Cookie 带 `secure` 标记

**Good/Base/Bad Cases：**

| Case | `NODE_ENV` | `SESSION_SECURE` | Protocol | Result |
|------|-----------|------------------|----------|--------|
| Good | production | false | HTTP | ✅ Cookie 生效 |
| Good | production | true | HTTPS | ✅ Cookie 生效 |
| Bad | production | 未设置 | HTTP | ❌ Cookie 不生效 |
| Bad | production | false | HTTPS | ⚠️ 可用但不安全 |

**测试要求：**
- 单元测试：验证 `getSessionCookieOptions()` 根据环境变量返回正确配置
- 集成测试：HTTP 环境下登录并验证 Cookie
- E2E 测试：完整登录流程，包括会话保持

---

## 3. Nginx 配置

### 3.1 场景：HTTP-only 部署（无证书）

**触发条件：**
- 无域名或域名未备案
- 未配置 HTTPS 证书
- 需要通过 IP + 非标准端口访问

**配置文件：**
`deploy/nginx/conf.d/watermenu.conf`（HTTP 版本）

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location /api {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Real-IP $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

**Docker Compose 端口映射：**
```yaml
nginx:
  ports:
    - "8080:80"   # HTTP
    - "8443:443"  # HTTPS（可选）
```

**访问地址：**
- `http://<服务器IP>:8080`
- `http://<域名>:8080`

### 3.2 常见错误：配置文件冲突

**症状：**
```
nginx: [warn] conflicting server name "_" on 0.0.0.0:80, ignored
```

**原因：**
`deploy/nginx/conf.d/` 目录下有多个 `.conf` 文件监听相同端口。

**诊断：**
```bash
# 列出所有配置文件
ls -la deploy/nginx/conf.d/

# 查看所有 .conf 文件内容
cat deploy/nginx/conf.d/*.conf | grep "listen"
```

**修复：**
```bash
cd deploy/nginx/conf.d

# 只保留一个 watermenu.conf，其他重命名为 .bak
mv watermenu-http.conf watermenu-http.conf.bak
mv watermenu-https.conf watermenu-https.conf.bak

# 确保只有一个 .conf 文件
ls *.conf
# 应该只输出: watermenu.conf

# 重启 Nginx
docker compose -f docker-compose.prod.yml restart nginx
```

**验证：**
```bash
# 检查 Nginx 日志，应该没有 conflicting 警告
docker compose -f docker-compose.prod.yml logs nginx | grep -i "warn\|error"

# 测试访问
curl http://localhost:8080/api/health
# 预期: {"status":"ok"}
```

**Wrong vs Correct：**

#### Wrong
```bash
deploy/nginx/conf.d/
├── watermenu.conf          # listen 80
├── watermenu-http.conf     # listen 80 ❌ 冲突
└── watermenu-https.conf    # listen 80 + 443 ❌ 冲突
```

#### Correct
```bash
deploy/nginx/conf.d/
├── watermenu.conf              # listen 80 ✅ 唯一
├── watermenu-http.conf.bak     # 备份
└── watermenu-https.conf.bak    # 备份
```

---

## 4. 依赖管理

### 4.1 场景：运行时依赖缺失

**症状：**
```
Error: Cannot find module 'multer'
```

**原因：**
`multer` 在生产环境运行时需要，但只在 `devDependencies` 中或未显式声明。

**签名：**
```json
// backend/package.json
{
  "dependencies": {
    "@nestjs/platform-express": "^11.0.0",
    "multer": "^2.0.1"  // 必须显式声明
  },
  "devDependencies": {
    "@types/multer": "^2.1.0"
  }
}
```

**验证矩阵：**

| 情况 | multer 在 dependencies | lockfile 更新 | Docker 构建 | 运行结果 |
|------|----------------------|--------------|------------|---------|
| 缺失 | ❌ | - | ✅ | ❌ 运行时报错 |
| 添加但未更新 lockfile | ✅ | ❌ | ❌ | ❌ 构建失败 |
| 完整修复 | ✅ | ✅ | ✅ | ✅ 正常运行 |

**修复步骤：**
```bash
# 1. 添加依赖到 package.json
# (编辑 backend/package.json)

# 2. 本地更新 lockfile
pnpm install

# 3. 提交更改
git add backend/package.json pnpm-lock.yaml
git commit -m "fix: add multer to dependencies"
git push

# 4. 服务器端重新构建
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**测试要求：**
- 构建测试：`docker compose build` 成功
- 启动测试：容器启动无错误
- 运行时测试：文件上传功能正常

---

## 5. 网络与防火墙

### 5.1 场景：阿里云安全组配置

**触发条件：**
- 服务器在阿里云 ECS
- 使用非标准端口（8080/8443）
- 外网无法访问，但 `localhost` 可以

**诊断：**
```bash
# 服务器内部测试（成功）
curl http://localhost:8080/api/health
# {"status":"ok"}

# 外网访问测试（超时）
curl http:<服务器公网IP>:8080/api/health
# curl: (7) Failed to connect
```

**原因：**
阿里云安全组未开放 8080 端口。

**修复步骤：**
1. 登录阿里云控制台
2. 进入 **云服务器 ECS** → 找到实例
3. 点击 **安全组** → **配置规则**
4. **添加入方向规则：**
   - 授权策略：允许
   - 优先级：1
   - 协议类型：TCP
   - 端口范围：`8080/8080`
   - 授权对象：`0.0.0.0/0`
   - 描述：WaterMenu HTTP

**验证：**
```bash
# 服务器测试外网访问
curl http://<公网IP>:8080/api/health

# 浏览器访问
http://<公网IP>:8080
```

### 5.2 502 Bad Gateway 排查

**症状：**
```
< HTTP/1.1 502 Bad Gateway
```

**诊断流程：**
```bash
# 1. 检查容器状态
docker compose -f docker-compose.prod.yml ps
# 后端必须是 healthy

# 2. 测试后端直接访问（绕过 Nginx）
docker compose -f docker-compose.prod.yml exec nginx wget -qO- http://backend:3000/api/health
# 应该返回 {"status":"ok"}

# 3. 检查 Nginx 配置
cat deploy/nginx/conf.d/watermenu.conf | grep proxy_pass
# 应该是: proxy_pass http://backend:3000;

# 4. 检查 Docker 网络
docker network inspect watermenu_default
# backend 和 nginx 必须在同一网络
```

**常见原因：**
1. 后端容器未启动或不健康
2. Nginx 配置错误（proxy_pass 地址错误）
3. Docker 网络问题
4. 配置文件冲突（多个 .conf 监听同一端口）

---

## 6. 部署检查清单

### 6.1 首次部署前

- [ ] `deploy/env/prod.env` 已配置且无 `change-me`
- [ ] `SESSION_SECURE=false`（HTTP 环境）
- [ ] 阿里云安全组已开放 8080 端口
- [ ] `deploy/nginx/conf.d/` 只有一个 `.conf` 文件
- [ ] 证书文件存在（如果使用 HTTPS）

### 6.2 部署后验证

```bash
# 1. 容器状态
docker compose -f docker-compose.prod.yml ps
# postgres: healthy
# backend: healthy
# nginx: running

# 2. 健康检查
curl http://localhost:8080/api/health
# {"status":"ok"}

# 3. 外网访问
curl http://<公网IP>:8080/api/health
# {"status":"ok"}

# 4. 登录测试
# 浏览器访问并登录

# 5. 查看日志
docker compose -f docker-compose.prod.yml logs -f
# 无错误信息
```

### 6.3 常见问题快速诊断

| 症状 | 可能原因 | 检查命令 |
|------|---------|---------|
| 登录后无法保持会话 | SESSION_SECURE 配置错误 | `grep SESSION_SECURE deploy/env/prod.env` |
| 502 Bad Gateway | 后端未启动或 Nginx 配置冲突 | `docker compose ps` + `ls deploy/nginx/conf.d/*.conf` |
| 外网无法访问 | 安全组未开放端口 | `curl http://localhost:8080` vs `curl http://<公网IP>:8080` |
| 容器启动失败 | 依赖缺失或环境变量错误 | `docker compose logs backend` |

---

## 7. 运维命令

### 7.1 日常维护

```bash
# 查看日志
docker compose -f docker-compose.prod.yml logs -f [服务名]

# 重启服务
docker compose -f docker-compose.prod.yml restart [服务名]

# 查看容器状态
docker compose -f docker-compose.prod.yml ps

# 进入容器
docker compose -f docker-compose.prod.yml exec [服务名] sh
```

### 7.2 数据备份

```bash
# 手动备份
./scripts/backup-postgres.sh

# 定时备份（crontab）
30 3 * * * cd /path/to/WaterMenu && ./scripts/backup-postgres.sh >> /var/log/watermenu-backup.log 2>&1
```

### 7.3 升级部署

```bash
# 1. 备份数据
./scripts/backup-postgres.sh

# 2. 拉取代码
git pull

# 3. 重新构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 4. 验证
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/api/health
```

---

## 8. 设计决策

### 8.1 为什么使用非标准端口 8080/8443？

**Context：**
未备案域名在阿里云无法使用 80/443 端口（被拦截）。

**Options Considered：**
1. 备案域名（需要几周时间）
2. 使用非标准端口（8080/8443）

**Decision：**
使用非标准端口，快速上线。

**Trade-offs：**
- ✅ 立即可用
- ✅ 无需备案
- ❌ URL 需要带端口号
- ❌ 部分企业防火墙可能拦截

### 8.2 为什么支持 SESSION_SECURE 环境变量？

**Context：**
生产环境默认 Cookie `secure=true`，但部分部署场景无法配置 HTTPS。

**Options Considered：**
1. 强制要求 HTTPS
2. 通过环境变量控制

**Decision：**
添加 `SESSION_SECURE` 环境变量，默认保持安全，但允许 HTTP 环境。

**Security Note：**
HTTP 环境下 Session Cookie 可能被中间人攻击。仅在测试或内网环境使用。

---

## 9. 未来改进

- [ ] 自动化 HTTPS 证书申请（Let's Encrypt）
- [ ] 支持多域名配置
- [ ] 健康检查告警
- [ ] 自动备份到对象存储
- [ ] 部署回滚机制
