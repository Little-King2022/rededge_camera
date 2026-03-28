# RedEdge 后台管理系统 - 项目状态

## 项目概述

已完成基于 Web 的后台管理系统，用于集中管理 RedEdge 桌面客户端的授权、配置和版本分发。

### 技术栈
- **后端**: Flask + MySQL + SQLAlchemy + JWT + RSA 加密
- **前端**: Vue 3 + Vite + Ant Design Vue + Pinia
- **安全**: bcrypt 密码哈希 + RSA 传输加密 + JWT 认证

---

## 已完成功能

### ✅ 后端服务 (admin_backend)

**核心框架**
- ✅ Flask 应用工厂模式
- ✅ MySQL 数据库配置（开发/生产环境）
- ✅ CORS 跨域支持
- ✅ Flask-Limiter API 限流
- ✅ JWT 认证与刷新令牌
- ✅ RSA 加密/解密工具

**数据库模型** (8个表)
- ✅ admin_users - 后台用户
- ✅ camera_configs - 相机配置
- ✅ clients - 客户端信息（含扩展字段：CPU、内存、IP、MAC）
- ✅ license_codes - 授权码（支持在线/离线模式）
- ✅ software_versions - 软件版本
- ✅ audit_logs - 审计日志
- ✅ client_usage_stats - 使用统计
- ✅ system_settings - 系统配置

**API 端点** (41个)
1. **认证 API** (`/api/auth`)
   - ✅ `GET /public-key` - 获取 RSA 公钥
   - ✅ `POST /login` - 登录（RSA 加密密码）
   - ✅ `POST /logout` - 登出
   - ✅ `GET /profile` - 获取用户信息
   - ✅ `PUT /profile` - 更新用户信息
   - ✅ `POST /refresh` - 刷新 Token

2. **相机配置 API** (`/api/cameras`)
   - ✅ CRUD 操作（6个端点）
   - ✅ 激活/停用配置

3. **客户端管理 API** (`/api/clients`)
   - ✅ 列表查询（分页、筛选）
   - ✅ 详情、统计
   - ✅ 分配相机/授权
   - ✅ 吊销授权
   - ✅ **无需 JWT**: 注册、心跳上报

4. **授权管理 API** (`/api/licenses`)
   - ✅ 批量生成授权码（REDEDGE-XXXX-XXXX-XXXX-XXXX 格式）
   - ✅ CRUD 操作
   - ✅ **无需 JWT**: 激活（RSA 加密激活码）、验证
   - ✅ 导出授权码

5. **版本管理 API** (`/api/versions`)
   - ✅ 上传安装包（含进度、SHA256 校验）
   - ✅ CRUD 操作
   - ✅ 设为最新版本
   - ✅ **无需 JWT**: 检查更新、下载安装包

6. **用户管理 API** (`/api/users`)
   - ✅ CRUD 操作
   - ✅ 角色权限控制
   - ✅ 重置密码

7. **系统 API** (`/api/system`)
   - ✅ 系统设置管理
   - ✅ 仪表盘数据
   - ✅ 使用统计
   - ✅ 审计日志

**工具模块**
- ✅ `rsa_utils.py` - RSA 2048位密钥对生成与加解密
- ✅ `jwt_utils.py` - JWT 认证装饰器
- ✅ `file_utils.py` - 文件上传处理与校验
- ✅ `license_generator.py` - 授权码生成工具

---

### ✅ 前端应用 (admin_frontend)

**项目架构**
- ✅ Vue 3 + Composition API
- ✅ Vite 构建工具（代码分割、懒加载）
- ✅ Ant Design Vue 组件库
- ✅ Pinia 状态管理
- ✅ Vue Router 路由守卫

**API 封装层** (7个模块)
- ✅ auth.js - 认证（RSA 加密登录）
- ✅ camera.js - 相机配置
- ✅ client.js - 客户端管理
- ✅ license.js - 授权管理
- ✅ version.js - 版本管理
- ✅ user.js - 用户管理
- ✅ system.js - 系统设置
- ✅ client-license.js - 客户端激活（RSA 加密激活码）

**状态管理** (5个 stores)
- ✅ authStore - 认证状态、权限检查
- ✅ cameraStore - 相机配置列表
- ✅ clientStore - 客户端信息、在线状态统计
- ✅ licenseStore - 授权码管理、类型分组
- ✅ statsStore - 系统统计、仪表盘数据

**页面视图** (8个)
1. ✅ **Login.vue** - 登录页（RSA 加密）
2. ✅ **Dashboard.vue** - 仪表盘
   - 客户端总数/在线/离线/今日新增
   - 授权状态分布图表
   - 最近客户端活动列表
3. ✅ **CameraManagement.vue** - 相机配置管理
   - 配置 CRUD
   - 激活/停用
4. ✅ **ClientManagement.vue** - 客户端管理
   - 列表（筛选：授权状态、平台）
   - 详情抽屉（扩展信息：CPU、内存、IP、MAC）
   - 分配相机/授权
   - 吊销授权
5. ✅ **LicenseManagement.vue** - 授权管理
   - 批量生成（支持离线模式选项）
   - 授权码详情
   - 导出 CSV
6. ✅ **VersionManagement.vue** - 版本管理
   - 上传安装包（带进度条）
   - 版本列表
   - 设为最新/下载
7. ✅ **UserManagement.vue** - 用户管理
   - CRUD 操作
   - 角色分配
   - 重置密码
8. ✅ **SystemSettings.vue** - 系统设置
   - 通用设置（站点名称、邮箱）
   - 授权设置（试用期、宽限期、离线模式说明）
   - 心跳设置（超时阈值、离线判定）
   - 系统统计
   - 审计日志

**工具函数**
- ✅ `request.js` - Axios 封装（请求/响应拦截、错误处理）
- ✅ `auth.js` - Token 管理（localStorage）
- ✅ `format.js` - 格式化工具（文件大小、日期、状态等）
- ✅ `rsa.js` - RSA 加密工具（jsencrypt）

**布局组件**
- ✅ `MainLayout.vue` - 主布局（侧边栏、顶栏、用户菜单）
- ✅ 路由守卫（认证检查、权限控制）

---

## 安全特性

### 🔒 RSA 加密（新增）
- ✅ **登录密码加密**: 前端使用公钥加密 → 后端私钥解密
- ✅ **激活码加密**: 客户端使用公钥加密 → 后端私钥解密
- ✅ **2048 位密钥**: 符合安全标准
- ✅ **公钥缓存**: 减少重复请求

### 🔐 其他安全措施
- ✅ **密码哈希**: bcrypt (cost=12)
- ✅ **JWT 认证**: Access Token 2小时 + Refresh Token 7天
- ✅ **API 限流**:
  - 登录: 5次/分钟
  - 注册: 10次/小时
  - 激活: 20次/小时
  - 心跳: 60次/小时
- ✅ **文件上传校验**: 类型白名单 + SHA256 校验
- ✅ **角色权限**: super_admin > admin > operator

---

## 核心功能

### 📊 离线/在线模式
- ✅ 授权码生成时可选离线模式
- ✅ 离线模式客户端激活后不再连接服务器
- ✅ 在线模式客户端定期心跳验证

### 📈 客户端管理
- ✅ 扩展信息收集（CPU型号、内存、IP、MAC）
- ✅ 使用统计（启动次数、使用时长）
- ✅ 在线状态监控（基于心跳时间）

### 🔑 授权管理
- ✅ 标准授权码格式：REDEDGE-XXXX-XXXX-XXXX-XXXX
- ✅ 四种授权类型：trial/standard/professional/enterprise
- ✅ 灵活的有效期配置
- ✅ 一次激活限制（max_activations=1）

### 📦 版本管理
- ✅ 多平台支持（Windows/macOS/Linux）
- ✅ 多架构支持（x64/ARM64）
- ✅ 文件上传进度反馈
- ✅ SHA256 完整性校验
- ✅ 下载计数统计

---

## 待完成工作

### ⏳ 桌面客户端集成 (阶段 5)

**需要创建的文件**:
1. `admin-client.js` - 后台服务客户端
   - 系统信息收集（CPU、内存、IP、MAC）
   - 智能心跳（离线模式不上报）
   - 授权验证（在线/离线分支）
   - 更新检查与下载
   - 相机配置同步

2. 修改现有文件:
   - `license.js` - 对接后台验证
   - `database.js` - 扩展配置字段
   - `handlers.js` - 添加 IPC handlers
   - `preload.cjs` - 暴露 admin API
   - `main.js` - 启动时初始化
   - `SettingsView.vue` - 添加后台配置界面

---

## 快速开始

### 后端启动
```bash
cd admin_backend

# 安装依赖
pip install -r requirements.txt

# 初始化数据库
python init_db.py

# 启动服务（监听 127.0.0.1:5000）
python run.py
```

**默认管理员账号**: admin / admin123

### 前端启动
```bash
cd admin_frontend

# 安装依赖（包含 jsencrypt）
npm install

# 启动开发服务器（http://localhost:5173）
npm run dev
```

### 测试 RSA 加密
1. 访问 http://localhost:5173
2. 使用默认账号登录（密码会自动 RSA 加密）
3. 查看浏览器网络请求，确认密码已加密

---

## 文件清单

### 后端文件 (已创建)
```
admin_backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── admin_user.py
│   │   ├── camera_config.py
│   │   ├── client.py
│   │   ├── license.py
│   │   ├── software_version.py
│   │   ├── audit_log.py
│   │   ├── client_usage_stats.py
│   │   └── system_setting.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py (✅ RSA 解密)
│   │   ├── camera.py
│   │   ├── client.py
│   │   ├── license.py (✅ RSA 解密)
│   │   ├── version.py
│   │   ├── user.py
│   │   └── system.py
│   └── utils/
│       ├── __init__.py
│       ├── jwt_utils.py
│       ├── file_utils.py
│       ├── license_generator.py
│       └── rsa_utils.py (✅ 新增)
├── run.py
├── init_db.py
└── requirements.txt
```

### 前端文件 (已创建)
```
admin_frontend/
├── src/
│   ├── api/
│   │   ├── auth.js (✅ RSA 加密)
│   │   ├── camera.js
│   │   ├── client.js
│   │   ├── license.js
│   │   ├── version.js
│   │   ├── user.js
│   │   ├── system.js
│   │   └── client-license.js (✅ 新增)
│   ├── stores/
│   │   ├── auth.js
│   │   ├── camera.js
│   │   ├── client.js
│   │   ├── license.js
│   │   └── stats.js
│   ├── views/
│   │   ├── Login.vue
│   │   ├── Dashboard.vue
│   │   ├── CameraManagement.vue
│   │   ├── ClientManagement.vue
│   │   ├── LicenseManagement.vue
│   │   ├── VersionManagement.vue
│   │   ├── UserManagement.vue
│   │   └── SystemSettings.vue
│   ├── layouts/
│   │   └── MainLayout.vue
│   ├── router/
│   │   └── index.js
│   ├── utils/
│   │   ├── request.js
│   │   ├── auth.js
│   │   ├── format.js
│   │   └── rsa.js (✅ 新增)
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── package.json (✅ 添加 jsencrypt)
├── vite.config.js
├── .env.development
├── .env.production
├── README.md
└── RSA_ENCRYPTION.md (✅ 新增)
```

---

## 下一步建议

1. **安装依赖并测试**
   ```bash
   cd admin_frontend && npm install
   ```

2. **启动服务进行联调**
   - 启动后端服务
   - 启动前端服务
   - 测试登录（验证 RSA 加密）
   - 测试各功能模块

3. **继续桌面客户端集成** (任务 #7)
   - 实现 admin-client.js
   - 修改授权验证逻辑
   - 添加后台配置界面

4. **端到端测试**
   - 测试 6 个核心场景
   - 验证在线/离线模式
   - 测试更新机制

---

## 技术亮点

1. ✨ **RSA 加密传输** - 敏感数据（密码、激活码）传输加密
2. ✨ **智能授权模式** - 支持在线验证和离线激活两种模式
3. ✨ **扩展信息采集** - 客户端硬件信息完整收集
4. ✨ **使用统计分析** - 启动次数、使用时长追踪
5. ✨ **文件上传优化** - 分块上传、进度反馈、完整性校验
6. ✨ **角色权限体系** - 三级权限控制
7. ✨ **审计日志** - 完整的操作记录
8. ✨ **API 限流保护** - 防止恶意请求

项目已完成后台管理系统的全部功能开发，可以开始测试和桌面客户端集成工作。
