# 环境变量配置说明

## 快速开始

1. **复制配置模板**
   ```bash
   cp .env.example .env
   ```

2. **修改配置**
   编辑 `.env` 文件，修改数据库密码等配置：
   ```bash
   MYSQL_PASSWORD=your_actual_password
   ```

3. **启动应用**
   ```bash
   python run.py
   ```

## 配置文件说明

### .env
- 实际使用的环境变量配置文件
- **包含敏感信息，不应提交到 Git**
- 已在 `.gitignore` 中忽略

### .env.example
- 环境变量配置模板
- 不包含敏感信息，可以提交到 Git
- 新环境部署时复制此文件为 `.env`

## 配置项详解

### 运行环境配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `FLASK_ENV` | 运行环境（development/production） | development | 否 |
| `FLASK_RUN_HOST` | Flask 监听地址 | 127.0.0.1 | 否 |
| `FLASK_RUN_PORT` | Flask 监听端口 | 5000 | 否 |

### 安全配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `SECRET_KEY` | Flask 密钥（会话加密） | - | **生产环境必需** |
| `JWT_SECRET_KEY` | JWT Token 签名密钥 | - | **生产环境必需** |

**生产环境密钥生成建议**：
```python
import secrets
print(secrets.token_hex(32))
```

### 数据库配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `MYSQL_HOST` | MySQL 主机地址 | localhost | 是 |
| `MYSQL_PORT` | MySQL 端口 | 3306 | 是 |
| `MYSQL_USER` | MySQL 用户名 | root | 是 |
| `MYSQL_PASSWORD` | MySQL 密码 | 空 | 是 |
| `MYSQL_DATABASE` | 数据库名 | rededge_admin | 是 |
| `SQLALCHEMY_ECHO` | 是否打印 SQL 语句 | false | 否 |

### JWT Token 配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `JWT_ACCESS_TOKEN_HOURS` | Access Token 有效期（小时） | 2 | 否 |
| `JWT_REFRESH_TOKEN_DAYS` | Refresh Token 有效期（天） | 7 | 否 |

### 文件上传配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `UPLOAD_FOLDER` | 上传文件存储路径 | ./uploads | 否 |
| `MAX_CONTENT_LENGTH` | 最大上传文件大小（字节） | 524288000 (500MB) | 否 |

### CORS 配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `CORS_ORIGINS` | 允许的前端域名（逗号分隔） | http://localhost:5173,http://127.0.0.1:5173 | 是 |

**生产环境示例**：
```bash
CORS_ORIGINS=https://admin.yourdomain.com,https://app.yourdomain.com
```

### API 限流配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `RATELIMIT_STORAGE_URL` | 限流存储方式 | memory:// | 否 |

**使用 Redis**：
```bash
RATELIMIT_STORAGE_URL=redis://localhost:6379
```

### 授权策略配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `TRIAL_DAYS` | 试用期天数 | 7 | 否 |
| `ONLINE_MODE_GRACE_PERIOD_DAYS` | 在线模式宽限期（天） | 3 | 否 |

### 心跳监控配置

| 配置项 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `HEARTBEAT_TIMEOUT_MINUTES` | 心跳超时时间（分钟） | 10 | 否 |
| `OFFLINE_THRESHOLD_MINUTES` | 离线判定时间（分钟） | 15 | 否 |

## 环境优先级

环境变量加载优先级（从高到低）：
1. **系统环境变量**
2. **`.env` 文件**
3. **代码中的默认值**

## 不同环境配置示例

### 开发环境
```bash
FLASK_ENV=development
FLASK_RUN_HOST=127.0.0.1
FLASK_RUN_PORT=5000
MYSQL_HOST=localhost
MYSQL_PASSWORD=dev_password
SQLALCHEMY_ECHO=true
```

### 生产环境
```bash
FLASK_ENV=production
FLASK_RUN_HOST=0.0.0.0
FLASK_RUN_PORT=5000
SECRET_KEY=<生成的64字符随机字符串>
JWT_SECRET_KEY=<生成的64字符随机字符串>
MYSQL_HOST=db.example.com
MYSQL_PASSWORD=<强密码>
SQLALCHEMY_ECHO=false
CORS_ORIGINS=https://admin.yourdomain.com
```

## 安全建议

1. **永远不要提交 `.env` 文件到 Git**
2. **生产环境必须修改所有密钥和密码**
3. **定期轮换密钥和密码**
4. **使用强密码（至少16位，包含字母、数字、特殊字符）**
5. **生产环境使用 HTTPS**
6. **限制数据库访问权限**

## 故障排查

### 环境变量未生效
- 确认 `.env` 文件位于 `admin_backend` 目录下
- 确认文件名正确（不是 `.env.txt` 或其他）
- 重启 Flask 应用

### 数据库连接失败
- 检查 MySQL 服务是否运行
- 确认数据库配置正确
- 确认数据库用户有足够权限
- 检查防火墙设置

### CORS 错误
- 确认 `CORS_ORIGINS` 包含前端实际访问的地址
- 注意协议（http/https）和端口必须完全匹配
