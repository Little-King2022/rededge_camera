# RedEdge 后台管理系统

基于 Flask + MySQL + Vue 3 的后台管理系统，用于集中管理 RedEdge 桌面客户端的授权、配置和版本分发。

---

## 后端服务 (admin_backend)

### 技术栈
- **Flask** - Python Web 框架
- **MySQL** - 数据库
- **SQLAlchemy** - ORM
- **Flask-JWT-Extended** - JWT 认证
- **python-dotenv** - 环境变量管理

### 快速启动

#### 1. 安装依赖

```bash
cd admin_backend
pip install -r requirements.txt
```

#### 2. 配置环境变量

**方式一：复制配置模板（推荐）**
```bash
cp .env.example .env
```
然后编辑 `.env` 文件，修改数据库密码等配置。

**方式二：直接使用默认配置**
项目已包含默认的 `.env` 文件，适用于开发环境（MySQL 无密码）。

**关键配置项**：
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
```

📖 **完整配置说明**：请参考 [ENV_CONFIG.md](admin_backend/ENV_CONFIG.md)

#### 3. 初始化数据库

```bash
# 确保 MySQL 服务已启动
# 创建数据库
mysql -u root -p -e "CREATE DATABASE rededge_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 初始化表结构和默认数据
python init_db.py
```

默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

#### 4. 启动服务

```bash
python run.py
```

服务将在 `http://127.0.0.1:5000` 启动。

### API 文档

所有 API 接口详情请参考 [admin_IMPLEMENTATION_COMPLETE.md](admin_IMPLEMENTATION_COMPLETE.md)

### 环境变量说明

所有环境变量从 `.env` 文件读取，包括：
- 运行配置（主机、端口）
- 数据库连接
- JWT Token 配置
- 文件上传配置
- CORS 跨域配置
- 授权策略
- 心跳监控

---

## 前端应用 (admin_frontend)

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Ant Design Vue** - 企业级 UI 组件库
- **Pinia** - Vue 3 官方状态管理库
- **Vue Router** - 官方路由管理器
- **Axios** - HTTP 客户端

## 项目结构

```
admin_frontend/
├── src/
│   ├── api/              # API 接口封装 (7个模块)
│   ├── stores/           # Pinia 状态管理 (5个store)
│   ├── views/            # 页面视图 (8个页面)
│   ├── layouts/          # 布局组件
│   ├── router/           # 路由配置
│   ├── utils/            # 工具函数
│   ├── App.vue           # 根组件
│   ├── main.js           # 入口文件
│   └── style.css         # 全局样式
├── package.json
├── vite.config.js
├── index.html
└── .env.development      # 开发环境配置
```

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

## 构建生产版本

```bash
npm run build
```

## 功能模块

### 1. 登录页面 (Login.vue)
- 用户名/密码登录
- JWT Token 认证
- 自动跳转

### 2. 仪表盘 (Dashboard.vue)
- 客户端总数/在线数/离线数统计
- 授权状态分布图表
- 最近客户端活动列表

### 3. 相机配置管理 (CameraManagement.vue)
- 相机配置 CRUD
- 激活/停用配置
- 配置列表查看

### 4. 客户端管理 (ClientManagement.vue)
- 客户端列表（支持筛选）
- 客户端详情（含扩展信息）
- 分配相机配置
- 分配授权码
- 吊销授权

### 5. 授权管理 (LicenseManagement.vue)
- 批量生成授权码
- 在线/离线模式配置
- 授权码详情查看
- 导出授权码

### 6. 版本管理 (VersionManagement.vue)
- 上传安装包（带进度）
- 版本列表
- 设置最新版本
- 下载安装包

### 7. 用户管理 (UserManagement.vue)
- 后台用户 CRUD
- 角色分配（超级管理员/管理员/操作员）
- 重置密码

### 8. 系统设置 (SystemSettings.vue)
- 通用设置（站点名称、邮箱等）
- 授权设置（试用期、宽限期等）
- 心跳设置（超时阈值等）
- 系统统计信息
- 审计日志查看

## API 配置

开发环境 API 地址配置在 `.env.development` 中：

```
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

生产环境配置在 `.env.production` 中。

## 权限控制

路由守卫会检查：
1. 是否已登录（JWT Token）
2. 角色权限（用户管理和系统设置需要管理员权限）

角色层级：
- **super_admin** (超级管理员) - 最高权限
- **admin** (管理员) - 可管理用户和系统设置
- **operator** (操作员) - 基础操作权限

## 状态管理

使用 Pinia 管理全局状态：
- **authStore** - 认证状态（Token、用户信息）
- **cameraStore** - 相机配置
- **clientStore** - 客户端信息
- **licenseStore** - 授权码
- **statsStore** - 系统统计

## 注意事项

1. 确保后端服务已启动并监听 `127.0.0.1:5000`
2. 首次使用请使用默认管理员账号登录（admin/admin123）
3. 上传安装包文件大小限制为 500MB
4. 授权码格式：REDEDGE-XXXX-XXXX-XXXX-XXXX

## 下一步

前端项目已完成，接下来可以：
1. 启动后端服务进行联调测试
2. 集成桌面客户端（实现 admin-client.js 服务）
3. 进行端到端测试
