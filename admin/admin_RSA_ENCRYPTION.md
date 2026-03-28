# RSA 加密增强说明

## 前端改动

### 1. 添加依赖
```json
"jsencrypt": "^3.3.2"
```

### 2. RSA 加密工具 (`src/utils/rsa.js`)
- `getPublicKey()` - 从后端获取公钥并缓存
- `rsaEncrypt(plainText)` - 使用公钥加密明文
- `encryptLoginCredentials(username, password)` - 加密登录凭据
- `encryptActivationCode(code)` - 加密激活码

### 3. 修改的 API
- `src/api/auth.js` - `login()` 函数现在会自动加密密码
- `src/api/client-license.js` - 新增客户端激活 API，自动加密激活码

## 后端改动

### 1. RSA 工具模块 (`app/utils/rsa_utils.py`)
- 使用 `cryptography` 库生成 2048 位 RSA 密钥对
- `get_public_key()` - 获取 PEM 格式公钥
- `decrypt_rsa(encrypted_text)` - 解密 Base64 编码的加密文本
- 密钥对在进程启动时生成并缓存

### 2. 认证 API (`app/api/auth.py`)
- **新增** `GET /auth/public-key` - 获取 RSA 公钥端点
- **修改** `POST /auth/login` - 解密 RSA 加密的密码

### 3. 授权 API (`app/api/license.py`)
- **修改** `POST /licenses/activate` - 解密 RSA 加密的激活码

## 工作流程

### 登录流程
1. 前端请求公钥（首次或缓存失效时）
2. 前端使用公钥 RSA 加密用户密码
3. 前端发送加密后的密码到后端
4. 后端使用私钥解密密码
5. 后端验证明文密码并返回 JWT Token

### 激活流程
1. 客户端请求公钥
2. 客户端使用公钥 RSA 加密激活码
3. 客户端发送加密后的激活码到后端
4. 后端使用私钥解密激活码
5. 后端验证激活码并更新客户端授权状态

## 安全性说明

1. **RSA 2048 位密钥** - 提供足够的安全强度
2. **PKCS1v15 填充** - 标准 RSA 填充方案
3. **传输层加密** - 敏感数据在传输过程中加密
4. **密钥持久化** - 进程内存中缓存，重启后重新生成
5. **公钥缓存** - 前端缓存公钥，减少请求次数

## 注意事项

1. **生产环境建议**：
   - 使用固定的 RSA 密钥对（从环境变量或文件加载）
   - 配合 HTTPS 使用以防止中间人攻击
   - 定期轮换密钥对

2. **密钥管理**：
   - 私钥永远不离开服务器
   - 公钥可以安全地分发给客户端
   - 每次进程重启会生成新的密钥对（开发环境）

3. **错误处理**：
   - 加密失败时前端会抛出异常
   - 解密失败时后端返回 400 错误
   - 公钥获取失败会阻止登录/激活操作
