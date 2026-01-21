你是一名资深桌面端全栈工程师（Electron Main/Preload + Vue3 Renderer + SQLite + 设备 HTTP API 集成）。请在一个全新仓库中（rededge_desktop_application文件夹）实现一套“农田遥感监测桌面软件（RedEdge-M + 4G 路由器 + FRP 内网穿透）”的可运行 MVP，并为后续扩展预留清晰接口与模块边界。

### 0. 已知部署与硬约束（必须遵守）

* 农田端：RedEdge-M 相机 + 4G OpenWrt 路由器；路由器运行 frpc，将相机 HTTP API 穿透到公网端口。
* 公网访问基址示例：`http://8.154.28.218:20010`（下文称 `CAMERA_BASE_URL`）。
* 相机一次拍照产生 **5 个波段 tif**（落 SD 卡）。
* 技术栈固定：
  * Electron + Vue3 + Vite
  * UI：Ant Design（Vue 侧使用 ant-design-vue）
  * 本地数据库：SQLite
* UI 风格：农业/科研场景，克制配色、低饱和、不花哨。

---

### 1. 目标功能清单（MVP 必须完成）

#### 1.1 相机连接管理

* 可配置并保存多个 profile：协议（http/https）、host/ip、port、可选 path_prefix。
* 可切换当前 profile。
* “连接测试”以 `GET /status` 成功返回为准；记录 `last_ok_at` 与连续失败次数。

#### 1.2 实时预览（重点：`/jpeg_url` 一次性链接）

* 预览 API 事实（必须按此实现）：

  * `GET {CAMERA_BASE_URL}/jpeg_url`
  * 响应：
    * `content-type: application/json`
    * body：`{"jpeg_url":"/previews/preview00001.jpg?31041561000"}`
  * 语义：每调用一次 `/jpeg_url` 都会返回一个 **新的预览图链接**；该预览图 **仅可访问一次**，访问后相机会删除。
* 因此预览必须采用“两步拉取”且必须在 Main 进程完成：

  1. Main 请求 `/jpeg_url` 得到 `jpeg_url`（相对路径，可能含 query）。
  2. Main 立即用 `GET {CAMERA_BASE_URL}{jpeg_url}` 拉取 JPEG 二进制。
  3. Main 将 JPEG bytes 转为 `data:image/jpeg;base64,...`（或用 `nativeImage`/Buffer 转 dataURL），通过 IPC 返回给 Renderer 渲染。
* Renderer 端禁止直接请求 `jpeg_url`（否则容易“链接已失效/被删”）。
* 刷新频率可配置（默认 1 Hz），支持开始/停止；实现错误退避（指数退避）与超时（避免堵塞）。
* 需展示：当前帧时间戳、最近一次成功拉帧时间、连续失败次数、当前刷新频率。

#### 1.3 拍照控制（手动 + 相机端定时）

* 手动单次拍照：

  * 调用 `/capture`（GET 或 POST，按官方 API 支持的方式实现）。
  * 展示 capture id；必要时轮询 `/capture/:id` 直到完成。
* **定时拍照必须实现“相机端定时”，不实现桌面端本地 scheduler**：

  * UI 配置：间隔（秒/分钟）、启停按钮、运行状态展示。
  * 实现路径（按相机 API 的 timer 模式）：

    1. `GET|POST /config` 设置：

       * `auto_cap_mode=timer`
       * `timer_period=<间隔秒>`
         -（如需）其他与自动拍照相关字段一并写入（以相机 API 为准）
    2. 启动：`GET /timer?enable=true`
    3. 停止：`GET /timer?enable=false`
  * 如果 `/timer` 或相关 config 字段返回 404/不支持：在 UI 明确提示“固件不支持相机端定时”，并不提供本地替代调度（但代码可保留 capability 探测与提示逻辑）。

#### 1.4 相机状态查看（/status）

* 周期拉取 `/status`（默认 2s，配置项可改）。
* 渲染这些业务字段（按你提供的显示需求组织 UI，含状态图标/颜色但克制）：

  1. Storage（示例：`⛔ No storage media`）
  2. GPS Sats（Used / Visible）
  3. DLS Status
  4. Time（示例：`⛔ 1970-01-01... UTC`）
  5. Location（lat, lon）
  6. Altitude（MSL / AGL）
  7. Speed
  8. Heading
  9. Capture Config（Disabled / Timer(period=xx) 等）
* UI 必须展示：当前连接 profile、上次成功更新时间、连续失败次数。
* 示例响应：
  ```json
  {"alt_agl":-17,"alt_msl":-17,"auto_cap_active":false,"bus_volts":4.393787384033203,"course":0,"dls_status":"Ok","gps_lat":0,"gps_lon":0,"gps_time":"1980-01-06T00:23:05Z","gps_type":"Ublox","gps_used_sats":0,"gps_vis_sats":1,"gps_warn":true,"p_acc":6495843,"sd_gb_free":14.73348999023438,"sd_gb_total":29.71142578125,"sd_status":"Ok","sd_type":"FAT32","sd_warn":false,"sv_info":[],"time_source":"None","utc_time":"1970-01-01T00:22:56.243066Z","utc_time_valid":false,"vel_2d":0}
  ```

#### 1.5 相机文件管理（/files + 下载队列）

* 文件浏览：

  * `GET /files/<path>`：目录返回 JSON 列表；文件路径可直接二进制下载。
* 队列能力：

  * 选中文件加入下载列表（支持多选）。
  * 下载队列页/抽屉：显示状态、进度（bytes）、失败原因、重试。
  * 默认保存路径：系统下载目录下 `RedEdgeDownloads/`，可在设置页修改。
  * 下载列表需持久化到 SQLite，支持暂停、恢复、重试（4G网络不稳定，必须具备断点续传或失败重试逻辑）。
* 文件删除：

  * `GET /deletefile/<path>`：支持删除文件/空目录（按相机 API 行为）。
* 格式化 SD：

  * `POST /reformatsdcard` JSON：`{"erase_all_data": true}`
  * 必须强二次确认（弹窗 + 输入确认短语，如 `ERASE` 才能执行）。

#### 1.6 授权与激活（试用 7 天 + 服务器下发激活时长/用户信息）

* 试用策略：**7 天**。
* 激活方式：用户输入激活码，客户端连接授权服务器激活；服务器下发：

  * 软件激活时长（expiry）
  * 用户信息（user_id、name、org、contact 等）
* MVP 不实现真实计费，但必须实现完整架构与占位接口：

  * `LicenseService`（Main 进程）封装 HTTP 调用：

    * `<LICENSE_SERVER_BASE_URL>`
    * `<LICENSE_API_ACTIVATE_PATH>`
    * `<LICENSE_API_VALIDATE_PATH>`
  * 建议响应结构（若实际不同，用适配层转换；先按以下占位实现）：

    * Activate response（示例）：`{ ok: true, expiry_at: "2026-12-31T23:59:59Z", user: {...}, issued_at: "...", signature: "..." }`
  * 本地存储（SQLite）：license 状态、激活码（可加密/至少不明文展示）、设备指纹（占位算法）、上次校验时间、expiry、用户信息 raw_payload。
  * UI：授权页（输入激活码→激活→展示到期时间/用户信息/当前状态）。
  * 校验策略：启动时校验 + 定期校验（如每日一次）。

---

### 2. 工程与架构要求（必须落地）

* Electron 分层：Main / Preload / Renderer（Vue3）。
* **所有相机 HTTP 请求必须在 Main 执行**，Renderer 通过 IPC 调用（避免 CORS、集中超时/重试/日志）。
* Main 网络层要求：

  * 统一 `timeout`、AbortController 取消、重试（仅 GET 幂等，且对 `/jpeg_url` 的两步请求需整体看作一次拉帧事务）。
  * 对 `/jpeg_url`：严禁复用旧链接；每次都“先取 JSON 再立即取 JPEG 二进制”。
* SQLite 在 Main 进程；Renderer 通过 IPC 调用数据服务。
* Renderer：Pinia + vue-router；UI 组件 ant-design-vue。
* 反馈: 所有操作（拍照、删除、保存）必须有 Message 或 Notification 反馈。网络请求失败必须有明确的 Error Tips。
* 日志：

  * Main：网络/下载/授权日志可开关。
  * Renderer：错误 toast + 可展开详情（便于运维）。

---

### 3. SQLite 数据模型（MVP 至少这些表）

* `camera_profiles`：id、name、protocol、host、port、path_prefix、created_at、updated_at、last_ok_at
* `app_settings`：key、value(JSON string)
* `download_queue`：id、camera_profile_id、remote_path、local_path、status、total_bytes、downloaded_bytes、error_message、created_at、updated_at
* `capture_jobs`：id、type(manual/timer_camera)、interval_sec、status、last_capture_id、created_at、updated_at
* `license_state`：status、activation_code、device_fingerprint、last_check_at、expiry_at、user_json、raw_payload

输出建表 SQL + Repository 封装。

---

### 4. 页面路由（建议）

* `/connect`：连接配置管理
* `/preview`：实时预览（必须走 `/jpeg_url` 两步拉取）
* `/capture`：手动拍照 + 相机端定时
* `/status`：状态面板
* `/files`：文件管理 + 下载队列
* `/license`：授权与激活
* `/settings`：通用设置（下载目录、刷新率、超时、日志开关）

---

### 5. 相机 API 约定（按此实现 Client）

以 `CAMERA_BASE_URL` 为前缀：

* `GET /jpeg_url` → `{ jpeg_url: string }`（一次性链接）
* `GET /status`
* `GET|POST /capture`；`GET /capture/:id`
* `GET|POST /config`（支持 query 或 JSON body；按相机 API）
* `GET /timer?enable=true|false`
* `GET /files/<path>`（目录 JSON；文件二进制）
* `GET /deletefile/<path>`
* `POST /reformatsdcard` body：`{"erase_all_data": true}`

实现 `CameraApiClient`：

* `requestJson(method, path, query, body)`
* `requestBinary(method, path, query)`
* `getOneTimePreviewFrame()`：内部完成 `/jpeg_url` + 拉取 jpeg 二进制 + 转 dataURL
* `probeCapabilities()`：探测 `/timer` 与关键 config 字段可用性；用于 UI 显示与禁用不支持功能。

---

### 6. 交付与验收

必须输出：

1. 可运行工程代码（npm scripts：dev、build、package 占位）
2. README：环境、启动、profile 示例、常见故障排查
3. 开发者文档：模块划分、IPC 通道、DB 结构、预览两步拉取与一次性链接处理
4. MVP 验收：

   * `/status` 可拉取并展示
   * 预览页稳定刷新（1 Hz 默认）
   * 手动拍照可用
   * 相机端定时可启停（/config + /timer）
   * /files 可浏览并下载到本地、可删除、可格式化（强确认）
   * 授权流程 UI 可跑通（接口可 mock，但结构必须完整，能存储 expiry/user）

---

### 7. 授权服务器占位符（需要用户后续填入，但先把接口框架和授权激活逻辑写好）

* `<LICENSE_SERVER_BASE_URL>`
* `<LICENSE_API_ACTIVATE_PATH>`
* `<LICENSE_API_VALIDATE_PATH>`
* 默认 3 天离线宽限期、7天试用期
* 设备指纹算法：`sha256(osInfo + cpuModel + machineId + appSalt)`

### 参考文档
1. RedEdge-M相机HTTP API接口参考文档：https://micasense.github.io/rededge-api/api/http.html
2. Ant Design组件库：https://ant.design/components/


