# RedEdge 后台管理系统 - 后端服务

基于 Flask 的后台管理 API 服务。

## 技术栈

- Flask 3.0
- MySQL 8.0+
- SQLAlchemy (ORM)
- Flask-JWT-Extended (认证)
- Flask-Limiter (限流)

## 安装步骤

### 1. 创建虚拟环境

```bash
cd admin_backend
python -m venv venv
```

### 2. 激活虚拟环境

Windows:
```bash
venv\Scripts\activate
```

Linux/Mac:
```bash
source venv/bin/activate
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 配置环境变量

**方式一：使用默认配置（开发环境）**

项目已包含默认的 `.env` 文件，配置了开发环境的默认值（MySQL 无密码）。

**方式二：自定义配置**

```bash
cp .env.example .env
```

然后编辑 `.env` 文件，修改配置：

```bash
# 数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=rededge_admin

# Flask 运行配置
FLASK_RUN_HOST=127.0.0.1
FLASK_RUN_PORT=5000

# 安全配置（生产环境必须修改）
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
```

📖 **完整的环境变量配置说明**请参考 [ENV_CONFIG.md](ENV_CONFIG.md)，包含：
- 所有可配置项详解
- 开发/生产环境配置示例
- 安全建议
- 故障排查

### 5. 创建数据库

在 MySQL 中创建数据库：

```sql
CREATE DATABASE rededge_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6. 初始化数据库

```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

或运行初始化脚本：

```bash
python init_db.py
```

### 7. 运行服务

开发环境：

```bash
python run.py
```

生产环境（使用 gunicorn）：

```bash
gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app()"
```

## API 文档

服务启动后访问：http://127.0.0.1:5000/api/health

### 主要端点

- `/api/auth/*` - 认证相关
- `/api/cameras/*` - 相机配置管理
- `/api/clients/*` - 客户端管理
- `/api/licenses/*` - 授权码管理
- `/api/versions/*` - 版本管理
- `/api/users/*` - 后台用户管理
- `/api/system/*` - 系统设置

## 目录结构

```
admin_backend/
├── app/
│   ├── __init__.py          # Flask 应用工厂
│   ├── config.py            # 配置
│   ├── models/              # 数据库模型
│   ├── api/                 # API 蓝图
│   ├── services/            # 业务逻辑
│   └── utils/               # 工具函数
├── migrations/              # 数据库迁移
├── uploads/                 # 上传文件
├── run.py                   # 启动脚本
└── requirements.txt         # 依赖列表
```

## 开发说明

- 默认监听 `127.0.0.1:5000`
- 开发环境自动启用 CORS（允许 localhost:5173）
- API 限流：登录接口 5次/分钟，其他接口 100次/分钟
- JWT Token 有效期：2小时

## 注意事项

1. 生产环境必须设置 `SECRET_KEY` 和 `JWT_SECRET_KEY` 环境变量
2. 生产环境使用 HTTPS
3. 定期备份数据库
4. 上传文件最大 500MB
