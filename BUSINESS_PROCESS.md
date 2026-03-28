# RedEdge 系统：业务流程图知识抽取（Desktop / Web Admin）

本文只基于当前代码库的既有实现整理业务流程图绘制所需信息；不画流程图、不补全不存在的业务。

---



## Part 1：Desktop（`rededge_desktop_application` + 本地 `python_service`）

### 1. 业务对象清单（Business Objects List）

#### desktop（Electron Main / Renderer）

- 相机设备（RedEdge Camera，HTTP API）
  - 模块：desktop（外部设备）
  - 类型：状态/数据对象
  - 作用：提供 `/status`、`/capture`、`/files`、`/jpeg_url`、`/timer`、`/config` 等相机控制与数据接口
  - 依据：`rededge_desktop_application/electron/services/camera-api.js`

- 相机配置（Camera Profile）
  - 模块：desktop
  - 类型：配置对象
  - 作用：保存相机访问参数（protocol/host/port/path_prefix/is_active），用于创建 CameraApiClient 并完成所有相机 HTTP 调用
  - 依据：`rededge_desktop_application/electron/services/database.js`（`camera_profiles`），`rededge_desktop_application/electron/ipc/handlers.js`（`camera:*Profile`）

- 应用设置（App Settings）
  - 模块：desktop
  - 类型：配置对象
  - 作用：保存下载目录、并发、预览/状态刷新率、请求超时、相机代理、语言等
  - 依据：`rededge_desktop_application/electron/services/database.js`（`app_settings`、`getSetting/setSetting/getAllSettings`），`rededge_desktop_application/src/views/SettingsView.vue`

- 管理服务器设置（Admin Server Settings）
  - 模块：desktop
  - 类型：配置/状态对象
  - 作用：保存心跳间隔、客户端是否已注册、最后心跳时间；同时本地强制覆盖 `admin_server_url/admin_server_enabled` 为常量值
  - 依据：`rededge_desktop_application/electron/services/database.js`（`FORCED_ADMIN_SERVER_URL/FORCED_ADMIN_SERVER_ENABLED`、`getAdminSettings/updateAdminSettings`）

- 设备指纹（device_fingerprint）
  - 模块：desktop
  - 类型：状态对象
  - 作用：作为客户端唯一标识，参与管理端的 `/clients/register`、`/clients/heartbeat`、`/licenses/activate`、`/licenses/validate`
  - 依据：`rededge_desktop_application/electron/services/database.js`（`buildDeviceFingerprint`、`license_state.device_fingerprint`），`rededge_desktop_application/electron/services/admin-client.js`

- 授权状态（License State）
  - 模块：desktop
  - 类型：状态对象
  - 作用：记录 `trial/activated/expired/revoked/invalid`、到期时间、offline_mode、last_check_at，用于决定是否需要联机校验与是否发送心跳
  - 依据：`rededge_desktop_application/electron/services/database.js`（`license_state`），`rededge_desktop_application/electron/services/license.js`，`rededge_desktop_application/electron/services/admin-client.js`

- Python 服务进程状态（Python Service Process State）
  - 模块：desktop
  - 类型：状态对象
  - 作用：管理本地 `python_service` 的启动/停止/健康检查（`/api/health`）、PID 与 baseUrl
  - 依据：`rededge_desktop_application/electron/services/python-service.js`，`python_service/app.py`

- 拍照历史条目（Capture History Entry / Recent Capture）
  - 模块：desktop
  - 类型：数据/状态对象
  - 作用：记录 `capture_id/type/status/timestamp/previewFiles`，用于 UI 的“最近拍照”与批量导出/删除
  - 依据：`rededge_desktop_application/electron/services/database.js`（`recent_captures`），`rededge_desktop_application/electron/ipc/handlers.js`（`captureHistory:*`），`rededge_desktop_application/src/views/CaptureView.vue`

- 预览图片文件（Capture Preview Files）
  - 模块：desktop
  - 类型：数据对象（本地文件）
  - 作用：把 dataURL 预览图保存到 `userData/capture-previews`；通过 `preview://` 协议提供给 renderer 加载
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`savePreviewDataUrl`、`captureHistory:set`），`rededge_desktop_application/electron/main.js`（`protocol.registerFileProtocol('preview', ...)`）

- 下载任务（Download Queue Item）
  - 模块：desktop
  - 类型：任务对象
  - 作用：管理从相机下载文件/目录的队列（pending/downloading/paused/completed/failed）与落盘路径
  - 依据：`rededge_desktop_application/electron/services/database.js`（`download_queue`），`rededge_desktop_application/electron/services/download.js`，`rededge_desktop_application/electron/ipc/handlers.js`（`download:*`）

- 删除任务（Delete Task）
  - 模块：desktop
  - 类型：任务对象
  - 作用：对相机文件/目录执行递归删除，记录任务进度与错误
  - 依据：`rededge_desktop_application/electron/services/delete.js`，`rededge_desktop_application/electron/ipc/handlers.js`（`camera:deletePaths/getDeleteTask/getActiveDeleteTask`）

- 辐射定标记录（Calibration Record）
  - 模块：desktop
  - 类型：数据/配置对象
  - 作用：保存定标板 serial/panel_version、反射率参数、`band_reflectances`、`panel_irradiance`；并可标记 `is_active`
  - 依据：`rededge_desktop_application/electron/services/database.js`（`calibration_records`），`rededge_desktop_application/electron/ipc/handlers.js`（`calibration:save/getAll/getActive/setActive`）

- 配准矩阵记录（Warp Matrices Record）
  - 模块：desktop
  - 类型：数据/配置对象
  - 作用：保存每台相机（camera_serial）的 `.npy` 矩阵文件路径、方法、reference_band、裁剪范围、质量分数；并可标记 `is_active`
  - 依据：`rededge_desktop_application/electron/services/database.js`（`warp_matrices_records`），`rededge_desktop_application/electron/ipc/handlers.js`（`alignment:getWarpMatrices/setActiveMatrix/deleteMatrix`）

- 配准矩阵计算任务（Warp Matrix Job）
  - 模块：desktop
  - 类型：任务对象
  - 作用：跟踪 python_service 异步计算矩阵的 `job_id/status/progress/output_path`，并在完成后落库为 Warp Matrices Record
  - 依据：`rededge_desktop_application/electron/services/database.js`（`warp_matrix_jobs`），`rededge_desktop_application/electron/ipc/handlers.js`（`alignment:computeWarpMatrices/getComputeWarpMatricesStatus`）

- 配准任务记录（Alignment Job）
  - 模块：desktop
  - 类型：任务对象
  - 作用：保存批量配准的输入目录、输出目录、warp_matrix_id、total_captures 等（任务历史）
  - 依据：`rededge_desktop_application/electron/services/database.js`（`alignment_jobs`），`rededge_desktop_application/electron/ipc/handlers.js`（`alignment:alignBatch/getJobHistory`）

- 批处理任务记录（Batch Processing Job）
  - 模块：desktop
  - 类型：任务对象
  - 作用：保存批量处理的输入/输出目录、calibration_id、total_captures 等（任务历史）
  - 依据：`rededge_desktop_application/electron/services/database.js`（`batch_jobs`），`rededge_desktop_application/electron/ipc/handlers.js`（`batch:start/getJobHistory`）

#### python_service（本地 Flask 图像处理服务）

- 多波段影像组（micasense `Capture`）
  - 模块：python_service
  - 类型：数据对象
  - 作用：由 5 个单波段 TIF 组成的核心输入对象（定标/配准/批处理均使用）
  - 依据：`python_service/services/capture_service.py`（`load_capture`）

- 定标板 QR 检测结果（QR Detection Result）
  - 模块：python_service
  - 类型：数据对象
  - 作用：从 JPEG/base64 输入中识别定标板序列号 `serial` 与二维码边界/面积
  - 依据：`python_service/api/calibration.py`（`/detect-qr`），`python_service/services/panel_service.py`（`detect_qr_from_image`）

- 定标板序列号解析信息（Panel Serial Info）
  - 模块：python_service
  - 类型：数据对象
  - 作用：解析 `panel_version/min_wavelength/min_reflectance/max_wavelength/max_reflectance`；当 `panel_version>=4` 计算 `band_reflectances`
  - 依据：`python_service/api/calibration.py`（`/parse-serial`、`/detect-qr`），`python_service/services/panel_service.py`（`parse_serial/calculate_band_reflectances`）

- 面板检测与照度（Panel Detection & Irradiance）
  - 模块：python_service
  - 类型：数据对象
  - 作用：从 5 波段 TIF 检测面板反射率（panel_albedo/reflectances），并计算各波段照度 irradiance
  - 依据：`python_service/api/calibration.py`（`/detect-from-files`、`/calculate-irradiance`），`python_service/services/capture_service.py`（`detect_panel/calculate_panel_irradiance`）

- 配准矩阵（Warp Matrices）与 `.npy` 文件
  - 模块：python_service
  - 类型：数据对象（内存矩阵 + 本地文件）
  - 作用：用于对 5 波段影像进行配准；支持保存/加载 `.npy`
  - 依据：`python_service/services/alignment_service.py`（`compute_warp_matrices/save_warp_matrices/load_warp_matrices`）

- 异步配准矩阵计算任务（Warp Matrix Async Job）
  - 模块：python_service
  - 类型：任务对象
  - 作用：后台线程计算配准矩阵，并提供状态查询（pending/running/completed/failed）、进度与结果
  - 依据：`python_service/api/alignment.py`（`_warp_jobs`、`/compute-warp-matrices-status/<job_id>`）

- 批量配准任务（Alignment Batch Job）
  - 模块：python_service
  - 类型：任务对象
  - 作用：扫描输入目录，按 `IMG_xxxx_<band>.tif` 分组为 capture，后台逐组配准并输出
  - 依据：`python_service/api/alignment.py`（`/align-batch`、`_scan_captures/_process_batch_job`、`/job-status/<job_id>`、`/cancel-job/<job_id>`）

- 批量处理任务（Processing Job）
  - 模块：python_service
  - 类型：任务对象
  - 作用：批量输出 reflectance/radiance GeoTIFF，并可选应用配准/生成 RGB/NDVI/缩略图
  - 依据：`python_service/api/processing.py`（`/start`、`/status/<job_id>`、`/cancel/<job_id>`、`_process_job`）

- 输出产物（Output Artifacts）
  - 模块：python_service
  - 类型：数据对象（本地文件）
  - 作用：输出 `<capture_id>.tif`、`*_rgb.jpg`、`*_ndvi.jpg`、`thumbnails/*_thumb.jpg`
  - 依据：`python_service/api/alignment.py`（保存/生成 RGB/NDVI），`python_service/api/processing.py`（保存/缩略图）

---


### 2. 关键业务动作清单（Business Actions List）

#### desktop：Renderer/UI → IPC → Electron Main

- 初始化应用（启动数据库、授权与管理端客户端）
  - 触发方：系统（App 启动）
  - 输入对象：应用设置、授权状态、管理服务器设置
  - 输出对象：IPC 已注册、授权本地校验结果；当 `client_registered !== "true"` 时调用客户端注册；当 `offline_mode === false` 时启动心跳
  - 关键节点：是
  - 依据：`rededge_desktop_application/electron/main.js`（`initialize()`），`rededge_desktop_application/electron/services/license.js`，`rededge_desktop_application/electron/services/admin-client.js`

- 维护相机配置（创建/更新/删除/设为当前）
  - 触发方：用户（ConnectView）
  - 输入对象：相机配置（Camera Profile）
  - 输出对象：相机配置（Camera Profile，含 `is_active/last_ok_at/consecutive_failures` 等）
  - 关键节点：是（决定后续所有相机 HTTP 调用目标）
  - 依据：`rededge_desktop_application/electron/preload.cjs`（`camera:*Profile`），`rededge_desktop_application/electron/ipc/handlers.js`（`camera:*Profile`），`rededge_desktop_application/src/views/ConnectView.vue`

- 测试相机连接（GET `/status`）
  - 触发方：用户（ConnectView）
  - 输入对象：相机配置（Camera Profile）
  - 输出对象：相机设备状态（Status JSON）+ 连接统计（`last_ok_at/consecutive_failures`）
  - 关键节点：是（决定是否进入采集/文件管理）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`camera:testConnection`），`rededge_desktop_application/electron/services/camera-api.js`（`getStatus()`）

- 获取相机状态/信息（状态、版本、波段信息、DLS/IMU）
  - 触发方：用户/系统（StatusView/轮询）
  - 输入对象：相机设备（active Camera Profile）
  - 输出对象：状态/版本/波段/IMU 数据
  - 关键节点：否
  - 依据：`rededge_desktop_application/electron/preload.cjs`（`camera:getStatus/getVersion/getCameraInfo/getDlsImu`），`rededge_desktop_application/src/views/StatusView.vue`

- 获取实时预览帧 / 停止预览流（GET `/jpeg_url` + 立即拉取 JPEG）
  - 触发方：用户/系统（PreviewView 定时刷新 / 离开页面）
  - 输入对象：相机设备（active Camera Profile）
  - 输出对象：预览帧（`dataURL/timestamp/size`）或停止结果（`stopped`）
  - 关键节点：否
  - 依据：`rededge_desktop_application/electron/preload.cjs`（`preview:getFrame/stopStream`），`rededge_desktop_application/electron/services/camera-api.js`（`getOneTimePreviewFrame/stopPreviewStreaming`），`rededge_desktop_application/src/views/PreviewView.vue`

- 手动拍照（触发 capture 并获取 capture_id）
  - 触发方：用户（CaptureView）
  - 输入对象：相机设备（active Camera Profile）
  - 输出对象：拍照响应（含 `id` 等字段，后续用于查询状态）
  - 关键节点：是（数据采集起点）
  - 依据：`rededge_desktop_application/electron/preload.cjs`（`camera:capture`），`rededge_desktop_application/electron/services/camera-api.js`（`capture()`），`rededge_desktop_application/src/views/CaptureView.vue`

- 轮询拍照状态并生成“最近拍照”预览
  - 触发方：系统（CaptureView 轮询定时器）
  - 输入对象：拍照响应（capture_id）+ 相机设备（active Camera Profile）
  - 输出对象：拍照历史条目（状态从 `pending→downloading→complete/failed/timeout`）+ 预览图片（dataURL）
  - 关键节点：是（用户感知的“拍照完成/失败/超时”）
  - 依据：`rededge_desktop_application/src/views/CaptureView.vue`（`startCapturePolling/loadCapturePreviews`），`rededge_desktop_application/electron/ipc/handlers.js`（`camera:getCaptureStatus`）

- 开启/停止相机定时拍照（timer）
  - 触发方：用户（CaptureView）
  - 输入对象：定时参数（intervalSec）+ 相机设备
  - 输出对象：相机端定时模式开关结果
  - 关键节点：是（进入连续采集模式）
  - 依据：`rededge_desktop_application/electron/services/camera-api.js`（`startCameraTimer/stopCameraTimer/probeCapabilities`），`rededge_desktop_application/src/views/CaptureView.vue`

- 浏览相机文件（目录列表）
  - 触发方：用户（FilesView）
  - 输入对象：相机路径（remotePath）
  - 输出对象：文件列表（来自 GET `/files{remotePath}`）
  - 关键节点：是（文件管理起点）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`camera:listFiles`），`rededge_desktop_application/electron/services/camera-api.js`（`listFiles()`），`rededge_desktop_application/src/views/FilesView.vue`

- 删除相机文件/目录（递归删除任务）
  - 触发方：用户（FilesView）
  - 输入对象：删除项列表（路径 + 类型）
  - 输出对象：删除任务（`status/total/completed/error_message`）及其状态查询结果
  - 关键节点：是（影响相机存储与数据保留）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`camera:deletePaths/getDeleteTask/getActiveDeleteTask`），`rededge_desktop_application/electron/services/delete.js`

- 格式化相机 SD 卡（危险操作）
  - 触发方：用户（FilesView）
  - 输入对象：相机设备
  - 输出对象：格式化结果（POST `/reformatsdcard`）
  - 关键节点：是（不可逆数据删除）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`camera:formatSDCard`），`rededge_desktop_application/electron/services/camera-api.js`（`formatSDCard()`）

- 添加下载任务并管理队列（暂停/恢复/重试/删除/清理已完成/打开目录）
  - 触发方：用户（FilesView/Download 列表）
  - 输入对象：下载项（文件/目录路径）
  - 输出对象：下载队列条目（`status/progress/bytes/files`）+ 本地落盘文件
  - 关键节点：是（数据落盘与批处理输入来源）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`download:*`），`rededge_desktop_application/electron/services/download.js`，`rededge_desktop_application/src/stores/download.js`

- 读取/写入应用设置
  - 触发方：用户（SettingsView）
  - 输入对象：设置项（download_directory、download_max_concurrent、refresh_rate、proxy 等）
  - 输出对象：持久化设置（本地 DB）
  - 关键节点：否
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`settings:get/set/getAll`），`rededge_desktop_application/electron/services/database.js`（`app_settings`），`rededge_desktop_application/src/views/SettingsView.vue`

- 读取/写入/导出拍照历史（含预览落盘与清理）
  - 触发方：用户/系统（CaptureView、导出按钮）
  - 输入对象：拍照历史条目 + 预览 dataURL/文件引用
  - 输出对象：本地 DB 中的 recent_captures + `userData/capture-previews/*` 文件 + 导出目录结构（含 `metadata.json`）
  - 关键节点：否
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`captureHistory:get/set/export`），`rededge_desktop_application/electron/main.js`（`preview://` 协议），`rededge_desktop_application/src/views/CaptureView.vue`

- 获取/激活/验证授权（本地校验 + 管理端校验）
  - 触发方：用户（SettingsView）/系统（启动校验）
  - 输入对象：激活码（Activation Code）+ 设备指纹（device_fingerprint）
  - 输出对象：授权状态更新（`status/offline_mode/expiry_at/last_check_at`）
  - 关键节点：是（决定是否允许继续使用与是否联机/心跳）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`license:*`、`admin:activateLicense/admin:validateLicense`），`rededge_desktop_application/electron/services/license.js`，`rededge_desktop_application/electron/services/admin-client.js`

- 启动/停止/查询本地 python_service
  - 触发方：用户/系统（Calibration/Alignment Store 触发）
  - 输入对象：无（或启动环境：conda/env/port）
  - 输出对象：python_service 运行状态（`isRunning/isHealthy/baseUrl/pid`）
  - 关键节点：是（定标/配准/批处理的前置条件）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`python:*`），`rededge_desktop_application/electron/services/python-service.js`，`rededge_desktop_application/src/stores/calibration.js`，`rededge_desktop_application/src/stores/alignment.js`

- 定标：选择面板影像/扫描 QR/解析序列号/检测面板/计算照度/保存与切换定标记录
  - 触发方：用户（CalibrationView）
  - 输入对象：面板 5 波段 TIF 路径、面板序列号或 QR 图像、反射率
  - 输出对象：面板检测结果（reflectances/irradiance/band_info）+ Calibration Record（落库，可设为 active）
  - 关键节点：是（批处理 reflectance 计算的输入）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`calibration:*`），`rededge_desktop_application/src/stores/calibration.js`，`python_service/api/calibration.py`

- 配准：选择影像/读取相机信息/计算配准矩阵（异步）/管理矩阵记录/单张或批量配准/查询与取消任务
  - 触发方：用户（AlignmentView）
  - 输入对象：5 波段 TIF 路径（或输入目录）+ Warp Matrices（record_id/path）+ 输出目录 + options
  - 输出对象：Warp Matrix Job/Record（落库）+ Alignment Job（job_id/status/progress）+ 输出影像（GeoTIFF/RGB/NDVI）
  - 关键节点：是（后续批处理可复用矩阵）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`alignment:*`），`rededge_desktop_application/src/stores/alignment.js`，`python_service/api/alignment.py`

- 批处理：选择输入/输出目录并启动处理任务（异步），查询/取消任务
  - 触发方：用户（CalibrationView 的批处理页签）
  - 输入对象：输入目录、输出目录、（可选）面板影像/反射率、（可选）配准矩阵路径、processing options
  - 输出对象：Processing Job（job_id/status/progress/errors）+ 输出产物（GeoTIFF/RGB/NDVI/缩略图）
  - 关键节点：是（数据处理终点：生成可用结果文件）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`batch:*`），`rededge_desktop_application/src/views/CalibrationView.vue`，`python_service/api/processing.py`

- 管理端交互：检查连接/心跳状态/检查更新与下载/同步相机配置
  - 触发方：用户（SettingsView）/系统（启动后心跳定时器）
  - 输入对象：Admin Server Settings、设备指纹、当前版本号、激活码
  - 输出对象：心跳上报结果、更新信息与安装包文件、相机配置同步结果
  - 关键节点：是（授权、更新、集中配置下发）
  - 依据：`rededge_desktop_application/electron/ipc/handlers.js`（`admin:*`），`rededge_desktop_application/electron/services/admin-client.js`，`admin/admin_backend/app/api/*`

#### python_service：HTTP API（由 desktop 调用）

- 健康检查（GET `/api/health`）
  - 触发方：系统（python-service 启动等待、健康检查定时器）
  - 输入对象：无
  - 输出对象：`{status: "ok"}` 等健康信息
  - 关键节点：是（决定后续 API 是否可用）
  - 依据：`python_service/app.py`（`/api/health`），`rededge_desktop_application/electron/services/python-service.js`（`checkHealth()`）

- QR 检测（POST `/api/calibration/detect-qr`）
  - 触发方：用户（CalibrationView）
  - 输入对象：base64 JPEG（image）
  - 输出对象：序列号解析信息（含 `panel_version`、可选 `band_reflectances`）与二维码边界信息
  - 关键节点：是（驱动定标流程）
  - 依据：`python_service/api/calibration.py`（`detect_qr`）

- 面板检测（POST `/api/calibration/detect-from-files`）与照度计算（POST `/api/calibration/calculate-irradiance`）
  - 触发方：用户（CalibrationView）
  - 输入对象：面板 5 波段 TIF 路径 +（可选）reflectances
  - 输出对象：reflectances、irradiance、band_info
  - 关键节点：是（为 reflectance/配准提供 irradiance）
  - 依据：`python_service/api/calibration.py`（`detect_from_files/calculate_irradiance`）

- 配准矩阵计算（异步）（POST `/api/alignment/compute-warp-matrices-async` + GET `/api/alignment/compute-warp-matrices-status/<job_id>`）
  - 触发方：用户（AlignmentView）
  - 输入对象：5 波段 TIF 路径 + method/reference_band/output_path 等参数
  - 输出对象：job_id + 状态/进度 + 结果（含 `warp_matrices_path/camera_serial/cropped_dimensions` 等）
  - 关键节点：是（生成可复用的 Warp Matrices）
  - 依据：`python_service/api/alignment.py`（`compute_warp_matrices_async/get_warp_job_status`）

- 单张配准（POST `/api/alignment/align-single`）
  - 触发方：用户（AlignmentView）
  - 输入对象：5 波段 TIF 路径 + warp_matrices_path/output_path/options
  - 输出对象：输出 GeoTIFF +（可选）RGB/NDVI 路径 + cropped_dimensions
  - 关键节点：否
  - 依据：`python_service/api/alignment.py`（`align_single`）

- 批量配准（异步）（POST `/api/alignment/align-batch` + GET `/api/alignment/job-status/<job_id>` + POST `/api/alignment/cancel-job/<job_id>`）
  - 触发方：用户（AlignmentView）
  - 输入对象：input_directory/output_directory/warp_matrices_path/options
  - 输出对象：job_id + 进度/当前处理 capture + 输出目录文件
  - 关键节点：是（批量产出配准结果）
  - 依据：`python_service/api/alignment.py`（`align_batch/get_job_status/cancel_job`）

- 批处理（异步）（POST `/api/processing/start` + GET `/api/processing/status/<job_id>` + POST `/api/processing/cancel/<job_id>`）
  - 触发方：用户（CalibrationView 批处理页签）
  - 输入对象：input_directory/output_directory +（可选）panel_image_paths/panel_reflectances/warp_matrices_path/options
  - 输出对象：job_id + 进度/错误列表 + 输出产物文件
  - 关键节点：是（处理流程终点）
  - 依据：`python_service/api/processing.py`（`start_processing/get_status/cancel_job`）

### 3. 跨模块数据流总结（Data Flow Summary）

- Renderer（Vue）→ Electron Main：IPC（异步）
  - 数据从哪里来：页面交互（Connect/Capture/Files/Settings/Calibration/Alignment 等）
  - 经过哪些模块：`window.electronAPI.*` → `ipcRenderer.invoke` → `ipcMain.handle`
  - 传输形式：Electron IPC
  - 是否同步/异步：异步（Promise）
  - 依据：`rededge_desktop_application/electron/preload.cjs`，`rededge_desktop_application/electron/ipc/handlers.js`

- Renderer → 相机：HTTP（直接拉取拍照预览的 TIF 二进制）
  - 数据从哪里来：相机拍照状态返回的 `raw_cache_path/*`（各波段文件路径）
  - 经过哪些模块：renderer `fetch(cameraBaseUrl + raw_cache_path)` → 解码 TIF → dataURL
  - 传输形式：HTTP（二进制 TIF）
  - 是否同步/异步：异步（fetch）
  - 依据：`rededge_desktop_application/src/views/CaptureView.vue`（`buildImageUrl/loadCapturePreviews`）

- Electron Main → 相机：HTTP（控制/文件/预览）
  - 数据从哪里来：IPC 参数（profileId/remotePath/intervalSec 等）
  - 经过哪些模块：main → `CameraApiClient` → 相机 HTTP API（`/status`、`/capture`、`/config`、`/timer`、`/files*`、`/jpeg_url` 等）
  - 传输形式：HTTP（JSON + 二进制下载）
  - 是否同步/异步：异步请求；GET 请求网络错误可重试（指数退避）
  - 依据：`rededge_desktop_application/electron/services/camera-api.js`

- Electron Main ↔ 本地存储：electron-store（KV）/本地文件
  - 数据从哪里来：设置、任务进度、授权状态、下载/配准/批处理记录、预览与输出文件
  - 经过哪些模块：`database.js`（electron-store 键值/数组集合）+ `fs`（下载目录、`userData/*`、输出目录）
  - 传输形式：本地 DB + 本地文件系统
  - 是否同步/异步：DB 多为同步调用；文件 I/O 多为异步
  - 依据：`rededge_desktop_application/electron/services/database.js`，`rededge_desktop_application/electron/services/download.js`，`rededge_desktop_application/electron/ipc/handlers.js`

- Electron Main → python_service：HTTP（本地 Flask 图像处理）
  - 数据从哪里来：用户选择的影像路径/目录与处理参数
  - 经过哪些模块：main `python-service.js` → `http://127.0.0.1:<PYTHON_SERVICE_PORT>/api/*` → python_service 内部处理并输出文件
  - 传输形式：HTTP（JSON）；结果文件通过本地路径（`output_path/output_directory`）交付
  - 是否同步/异步：健康检查与部分接口同步；`compute-warp-matrices-async/align-batch/processing/start` 为异步（返回 `job_id`，由客户端轮询 status）
  - 依据：`rededge_desktop_application/electron/services/python-service.js`，`python_service/app.py`，`python_service/api/*`

- Electron Main → Web Admin（admin_backend）：HTTP（授权/心跳/更新/配置同步）
  - 数据从哪里来：device_fingerprint、系统信息（hostname/platform/arch/ip/mac）、激活码、当前版本号
  - 经过哪些模块：main `admin-client.js` → admin_backend `/api/*`
  - 传输形式：HTTP（JSON）；激活码用 RSA 公钥加密后发送；更新包下载为二进制流写入本地
  - 是否同步/异步：心跳为定时异步；激活/校验/检查更新为按需异步
  - 依据：`rededge_desktop_application/electron/services/admin-client.js`，`admin/admin_backend/app/api/*`，`admin/admin_backend/app/utils/rsa_utils.py`

### 4. 业务阶段划分（Business Stages）

- 启动与初始化阶段
  - 包含业务动作：初始化应用（DB/授权/管理端客户端）、注册 IPC
  - 输入边界：本地 DB（`app_settings/license_state/admin_settings`）
  - 输出边界：IPC 可用；license_state 更新；当 `client_registered !== "true"` 时完成客户端注册；当 `offline_mode === false` 时启动心跳
  - 依据：`rededge_desktop_application/electron/main.js`，`rededge_desktop_application/electron/services/license.js`，`rededge_desktop_application/electron/services/admin-client.js`

- 设备接入阶段（相机配置/连接）
  - 包含业务动作：维护相机配置、测试相机连接、探测相机能力（timer 等）
  - 输入边界：Camera Profile（protocol/host/port/path_prefix）
  - 输出边界：active profile + 连接统计（`last_ok_at/consecutive_failures`）+ capabilities
  - 依据：`rededge_desktop_application/src/views/ConnectView.vue`，`rededge_desktop_application/electron/services/camera-api.js`

- 监控与预览阶段
  - 包含业务动作：获取 status/version/camera_info/dls_imu；获取预览帧/停止预览流
  - 输入边界：active profile
  - 输出边界：状态信息 + 预览 dataURL
  - 依据：`rededge_desktop_application/src/views/StatusView.vue`，`rededge_desktop_application/src/views/PreviewView.vue`

- 数据采集阶段
  - 包含业务动作：手动拍照、轮询拍照状态、（可选）开启/停止 timer、生成“最近拍照”预览与历史
  - 输入边界：用户触发 capture / timer 参数
  - 输出边界：capture_id + captureHistory（`pending/downloading/complete/failed/timeout`）+ 预览文件
  - 依据：`rededge_desktop_application/src/views/CaptureView.vue`，`rededge_desktop_application/electron/ipc/handlers.js`

- 文件管理阶段
  - 包含业务动作：浏览文件列表、加入下载队列并落盘、删除任务、格式化 SD 卡
  - 输入边界：相机路径（remotePath）/下载目录设置
  - 输出边界：本地下载文件 + 下载队列记录 + 删除任务状态
  - 依据：`rededge_desktop_application/src/views/FilesView.vue`，`rededge_desktop_application/electron/services/download.js`，`rededge_desktop_application/electron/services/delete.js`

- 定标阶段
  - 包含业务动作：扫描 QR/解析序列号、面板检测、照度计算、保存与切换 Calibration Record
  - 输入边界：面板 5 波段 TIF（或 QR 图像/serial）+（可选）reflectances
  - 输出边界：reflectances/irradiance/band_info + Calibration Record（可设为 active）
  - 依据：`python_service/api/calibration.py`，`rededge_desktop_application/src/stores/calibration.js`

- 配准阶段
  - 包含业务动作：读取相机信息、计算 Warp Matrices（异步）并落库、管理矩阵记录、单张/批量配准（含轮询与取消）
  - 输入边界：5 波段 TIF/输入目录 + warp_matrices_path/record_id + 输出目录 + options
  - 输出边界：Warp Matrices Record + Alignment Job（job_id/status）+ 输出影像文件
  - 依据：`python_service/api/alignment.py`，`rededge_desktop_application/src/stores/alignment.js`，`rededge_desktop_application/electron/ipc/handlers.js`

- 批处理阶段
  - 包含业务动作：启动 processing job（异步）、轮询 status、取消、任务历史落库
  - 输入边界：输入/输出目录 +（可选）面板影像/反射率 +（可选）配准矩阵 + options
  - 输出边界：Processing Job（job_id/status/errors）+ 输出产物（GeoTIFF/RGB/NDVI/缩略图）
  - 依据：`python_service/api/processing.py`，`rededge_desktop_application/src/views/CalibrationView.vue`

- 管理与维护阶段（授权/更新/配置下发）
  - 包含业务动作：激活/验证授权、心跳上报、检查更新与下载安装包、同步相机配置
  - 输入边界：device_fingerprint、activation code、current_version
  - 输出边界：license_state 更新、更新安装包文件；当返回 `camera_config` 且本地不存在同名 profile 时新增相机配置
  - 依据：`rededge_desktop_application/electron/services/admin-client.js`，`admin/admin_backend/app/api/*`

### 5. 关键决策点（Decision Points）

- 是否启用管理端连接
  - 分支条件：`admin_server_enabled` 为 `false` 时跳过初始化与后续请求
  - 影响：不注册客户端、不发送心跳、不走联机授权与更新检查
  - 依据：`rededge_desktop_application/electron/services/admin-client.js`（`initialize()`），`rededge_desktop_application/electron/services/database.js`（强制覆盖 admin_server_* 常量）

- 授权模式（试用/在线/离线）与过期判定
  - 分支条件：
    - `license_state.status === "trial"` 且 `expiry_at` 为空时写入试用到期时间（+7 天）
    - 当前时间 > `expiry_at` 时置为 `expired`
    - `offline_mode === true` 时仅本地验证并跳过服务器校验
  - 影响：决定是否允许继续使用、是否启动心跳、是否必须联机校验
  - 依据：`rededge_desktop_application/electron/services/license.js`，`rededge_desktop_application/electron/services/admin-client.js`（`validateLicense/reportHeartbeat`）

- 激活授权时的“未注册客户端”重试分支
  - 分支条件：desktop 捕获到 `/licenses/activate` 返回 `404` 且 `error === "客户端未注册"` 时会先调用 `/clients/register` 再重试激活
  - 影响：决定激活失败时是否自动补注册并恢复流程
  - 依据：`rededge_desktop_application/electron/services/admin-client.js`（`activateLicense()`）；`admin/admin_backend/app/api/license.py`（`/activate` 中客户端不存在时 `error` 字符串为 `'??????'`，与客户端重试条件不一致）

- 相机接口兼容分支（POST/GET fallback）
  - 分支条件：
    - `POST /capture` 失败且 HTTP 状态为 `404/405` 时回退到 `GET /capture`
    - `POST /config` 失败且 HTTP 状态为 `404/405` 时回退到 `GET /config`（query）
  - 影响：决定是否能兼容不同相机固件的接口实现
  - 依据：`rededge_desktop_application/electron/services/camera-api.js`（`capture()/setConfig()`）

- 定时拍照能力分支（/timer 是否支持）
  - 分支条件：`probeCapabilities()` 通过调用 `GET /timer?enable=false` 成功与否判定 `timer` 能力
  - 影响：UI 是否允许进入 timer 模式；timer 调用失败会直接报错
  - 依据：`rededge_desktop_application/electron/services/camera-api.js`（`probeCapabilities/startCameraTimer`），`rededge_desktop_application/src/views/CaptureView.vue`

- 预览帧获取分支（streaming_enable + one-time jpeg_url）
  - 分支条件：
    - `streamingEnabled` 为 false 时尝试 `POST /config`（form）开启 streaming；失败仅记录 warning，并继续请求 `/jpeg_url`
    - `/jpeg_url` 返回的一次性 URL 必须立即拉取，不可复用
    - `stopPreviewStreaming()` 仅在 `streamingEnabled` 为 true 时发送关闭请求
  - 影响：预览是否可用、预览退出时是否关闭 streaming
  - 依据：`rededge_desktop_application/electron/services/camera-api.js`（`getOneTimePreviewFrame/stopPreviewStreaming`）

- 拍照状态轮询分支（complete/failed/timeout）
  - 分支条件：
    - `status.status === "complete"`：加载各波段预览并将历史状态置为 `complete`
    - `status.status === "failed"|"error"`：标记失败并提示错误
    - 轮询次数达到 `CAPTURE_POLL_MAX_ATTEMPTS`：标记 `timeout`
  - 影响：决定拍照流程的“完成/失败/超时”终态与 UI 呈现
  - 依据：`rededge_desktop_application/src/views/CaptureView.vue`（`startCapturePolling`）

- 下载任务类型与状态分支（file vs folder / paused）
  - 分支条件：
    - `type === "folder"` 时先递归列文件并逐个下载；否则直接下载单文件
    - 状态为 `paused` 时中止进行中的下载并保留进度
  - 影响：决定下载进度计算方式（bytes vs files）与可恢复性
  - 依据：`rededge_desktop_application/electron/services/download.js`

- python_service 可用性分支（isRunning/allowWhenStopped）
  - 分支条件：
    - `request()` 在 `isRunning === false` 且 `allowWhenStopped !== true` 时直接抛错
    - `checkHealth()` 成功后将 `isRunning` 置为 true；连接拒绝/重置则置为 false
  - 影响：决定定标/配准/批处理是否能发起与是否需要先启动服务
  - 依据：`rededge_desktop_application/electron/services/python-service.js`（`request/checkHealth`）

- 影像输入校验分支（必须 5 波段）
  - 分支条件：
    - `compute-warp-matrices-async/get-camera-info/align-single`：`image_paths` 长度必须为 5
    - `align-batch/processing/start`：输入目录必须存在且扫描到至少一个 “>=5 波段” capture
  - 影响：不满足条件时直接返回 `400`，流程终止
  - 依据：`python_service/api/alignment.py`，`python_service/api/processing.py`

- 异步任务状态分支（pending/running/completed/failed/cancelled）
  - 分支条件：任务状态由后台线程更新；客户端按 status 选择“继续轮询/落库记录/标记失败/取消”
  - 影响：配准矩阵、批量配准、批处理的进度展示与最终产物是否生成
  - 依据：`python_service/api/alignment.py`（`_running_jobs/_warp_jobs`），`python_service/api/processing.py`（`_running_jobs`），`rededge_desktop_application/electron/ipc/handlers.js`（更新本地 job 记录并生成 Warp Matrices Record）

- 批处理输出分支（reflectance vs radiance / apply_alignment / RGB/NDVI/缩略图）
  - 分支条件：
    - 提供 `panel_image_paths` 时计算 irradiance 并输出 reflectance；否则输出 radiance
    - `options.apply_alignment === true` 且提供 `warp_matrices_path` 时才应用配准
    - `generate_rgb_preview` 需至少 3 通道；`generate_ndvi` 需至少 5 通道
  - 影响：决定输出产品类型与附加产物是否生成
  - 依据：`python_service/api/processing.py`

- 同步相机配置接口路径不一致
  - 分支条件：desktop 调用 `GET /api/clients/<device_fingerprint>` 获取相机配置；后端仅提供 `GET /api/clients/<int:client_id>`（且需 JWT）
  - 影响：同步相机配置动作返回失败，无法通过管理端下发配置到 desktop
  - 依据：`rededge_desktop_application/electron/services/admin-client.js`（`syncCameraConfigs()`），`admin/admin_backend/app/api/client.py`（路由定义）

---

## Part 2：Web Admin（`admin_frontend` + `admin_backend`）

### 1. 业务对象清单（Business Objects List）

#### admin_backend（Flask + SQLAlchemy）

- 管理员用户（AdminUser）
  - 模块：web_admin（admin_backend）
  - 类型：数据/状态对象
  - 作用：保存管理员账号、密码哈希、角色与启用状态，用于登录与权限控制
  - 依据：`admin/admin_backend/app/models/admin_user.py`，`admin/admin_backend/app/api/auth.py`，`admin/admin_backend/app/api/user.py`

- JWT 会话令牌（access_token / refresh_token）
  - 模块：web_admin（admin_backend）
  - 类型：状态对象
  - 作用：登录成功后签发访问/刷新令牌，供后续管理接口鉴权
  - 依据：`admin/admin_backend/app/api/auth.py`（`create_access_token/create_refresh_token`），`admin/admin_backend/app/__init__.py`（JWT 错误处理器）

- RSA 密钥对与公钥（in-memory）
  - 模块：web_admin（admin_backend）
  - 类型：配置/状态对象
  - 作用：提供 `/api/auth/public-key` 给客户端获取；用于解密登录密码与授权激活码（PKCS1v15）
  - 依据：`admin/admin_backend/app/utils/rsa_utils.py`，`admin/admin_backend/app/api/auth.py`，`admin/admin_backend/app/api/license.py`

- 客户端（Client）
  - 模块：web_admin（admin_backend）
  - 类型：数据/状态对象
  - 作用：记录 desktop 客户端的 device_fingerprint、系统信息、授权状态、离线模式、心跳时间与分配的相机配置
  - 依据：`admin/admin_backend/app/models/client.py`，`admin/admin_backend/app/api/client.py`

- 客户端使用统计（ClientUsageStats）
  - 模块：web_admin（admin_backend）
  - 类型：数据对象
  - 作用：按天记录 app 启动次数与使用时长，用于管理端统计报表
  - 依据：`admin/admin_backend/app/models/client_usage_stats.py`，`admin/admin_backend/app/api/client.py`（`heartbeat` 更新），`admin/admin_backend/app/api/system.py`（`/usage-stats`）

- 相机配置（CameraConfig）
  - 模块：web_admin（admin_backend）
  - 类型：配置对象
  - 作用：保存可分配给客户端的相机访问参数（name/protocol/host/port/path_prefix/auth_token）
  - 依据：`admin/admin_backend/app/models/camera_config.py`，`admin/admin_backend/app/api/camera.py`，`admin/admin_backend/app/api/client.py`（`assign-camera/heartbeat`）

- 授权码（LicenseCode）
  - 模块：web_admin（admin_backend）
  - 类型：数据/状态对象
  - 作用：保存激活码、授权类型、有效期、离线模式、激活/释放/吊销记录与当前占用情况
  - 依据：`admin/admin_backend/app/models/license.py`，`admin/admin_backend/app/api/license.py`，`admin/admin_backend/app/api/client.py`（`assign-license`）

- 软件版本（SoftwareVersion）
  - 模块：web_admin（admin_backend）
  - 类型：数据/配置对象
  - 作用：保存安装包版本号、平台/架构、是否最新、校验和、发布说明、下载计数与文件路径
  - 依据：`admin/admin_backend/app/models/software_version.py`，`admin/admin_backend/app/api/version.py`

- 安装包文件（Installer Artifact）
  - 模块：web_admin（admin_backend）
  - 类型：数据对象（本地文件）
  - 作用：上传后保存到 `UPLOAD_FOLDER/<subfolder>`，供客户端下载更新
  - 依据：`admin/admin_backend/app/utils/file_utils.py`，`admin/admin_backend/app/api/version.py`，`admin/admin_backend/app/config.py`（`UPLOAD_FOLDER/ALLOWED_EXTENSIONS`）

- 系统设置（SystemSetting）
  - 模块：web_admin（admin_backend）
  - 类型：配置对象
  - 作用：保存系统级 key/value（如心跳超时分钟数），影响在线判定与管理策略
  - 依据：`admin/admin_backend/app/models/system_setting.py`，`admin/admin_backend/app/api/system.py`

- 审计日志（AuditLog）
  - 模块：web_admin（admin_backend）
  - 类型：数据对象
  - 作用：记录管理员操作（login/logout/创建资源/分配授权等）的时间、操作者、IP、详情
  - 依据：`admin/admin_backend/app/models/audit_log.py`，`admin/admin_backend/app/api/*`（多处 `AuditLog.log`）

#### admin_frontend（Vue + Ant Design）

- Token 与用户信息缓存（localStorage）
  - 模块：web_admin（admin_frontend）
  - 类型：状态对象
  - 作用：前端保存 `access_token/user_info`，并在请求中自动携带 `Authorization: Bearer <token>`
  - 依据：`admin/admin_frontend/src/utils/request.js`

- RSA 公钥缓存（cachedPublicKey）
  - 模块：web_admin（admin_frontend）
  - 类型：状态对象
  - 作用：缓存从 `/auth/public-key` 获取的公钥，用于加密登录密码与激活码
  - 依据：`admin/admin_frontend/src/utils/rsa.js`

- 分页/筛选参数（page/per_page 等）
  - 模块：web_admin（admin_frontend）
  - 类型：数据对象
  - 作用：驱动列表型管理页面的分页与筛选请求
  - 依据：`admin/admin_frontend/src/api/client.js`，`admin/admin_frontend/src/api/license.js`，`admin/admin_frontend/src/api/camera.js`，`admin/admin_frontend/src/api/version.js`

### 2. 关键业务动作清单（Business Actions List）

#### admin_frontend：管理员可感知操作（页面/按钮）

- 管理员登录（RSA 加密密码 → 获取 token）
  - 触发方：用户（登录页）
  - 输入对象：登录凭据（username/password）
  - 输出对象：JWT token（access_token/refresh_token）+ 当前用户信息
  - 关键节点：是（进入管理后台的起点）
  - 依据：`admin/admin_frontend/src/api/auth.js`，`admin/admin_frontend/src/utils/rsa.js`，`admin/admin_backend/app/api/auth.py`

- 管理员登出
  - 触发方：用户
  - 输入对象：JWT access_token
  - 输出对象：登出审计日志（后端）+ 前端清理 token 并回到登录页
  - 关键节点：否
  - 依据：`admin/admin_frontend/src/api/auth.js`，`admin/admin_backend/app/api/auth.py`，`admin/admin_frontend/src/utils/request.js`

- 获取/更新个人资料（profile）
  - 触发方：用户
  - 输入对象：JWT access_token + profile 字段（email/new_password 等）
  - 输出对象：更新后的用户信息 + 审计日志
  - 关键节点：否
  - 依据：`admin/admin_backend/app/api/auth.py`（`/profile` GET/PUT），`admin/admin_frontend/src/api/auth.js`

- 用户管理（列出/创建/更新/删除/重置密码）
  - 触发方：用户（UserManagement）
  - 输入对象：AdminUser 字段（username/email/role/is_active 等）
  - 输出对象：AdminUser 列表/变更结果 + 审计日志
  - 关键节点：是（管理端账号体系）
  - 依据：`admin/admin_backend/app/api/user.py`，`admin/admin_frontend/src/api/user.js`

- 客户端管理（查看列表/详情/更新备注与启用状态）
  - 触发方：用户（ClientManagement）
  - 输入对象：分页筛选参数、Client 字段（notes/is_active）
  - 输出对象：客户端列表/详情 + 审计日志
  - 关键节点：是（授权与配置分配的对象）
  - 依据：`admin/admin_backend/app/api/client.py`（GET/PUT），`admin/admin_frontend/src/api/client.js`

- 分配相机配置 / 分配授权码 / 吊销授权
  - 触发方：用户（ClientManagement）
  - 输入对象：client_id + camera_config_id / license_code
  - 输出对象：Client 的 `camera_config_id/license_status/offline_mode/license_expiry_at` 更新 + 审计日志
  - 关键节点：是（影响客户端实际可用功能与配置）
  - 依据：`admin/admin_backend/app/api/client.py`（`assign-camera/assign-license/revoke-license`），`admin/admin_frontend/src/api/client.js`

- 相机配置管理（列出/创建/更新/删除/激活）
  - 触发方：用户（CameraManagement）
  - 输入对象：CameraConfig 字段（name/protocol/host/port/path_prefix/auth_token）
  - 输出对象：CameraConfig 列表/变更结果 + 审计日志
  - 关键节点：是（用于下发到客户端）
  - 依据：`admin/admin_backend/app/api/camera.py`，`admin/admin_frontend/src/api/camera.js`

- 授权码管理（列出/生成/更新/删除/吊销）
  - 触发方：用户（LicenseManagement）
  - 输入对象：生成参数（count/license_type/duration_days/offline_mode）或 LicenseCode 字段
  - 输出对象：LicenseCode 列表/变更结果 + 审计日志
  - 关键节点：是（授权生命周期管理）
  - 依据：`admin/admin_backend/app/api/license.py`（JWT 管理接口），`admin/admin_frontend/src/api/license.js`

- 导出授权码（前端定义）
  - 触发方：用户（LicenseManagement）
  - 输入对象：导出筛选参数
  - 输出对象：文件下载（blob）
  - 关键节点：否
  - 依据：`admin/admin_frontend/src/api/license.js`（`GET /licenses/export`）；`admin/admin_backend/app/api/license.py`（无对应路由）

- 版本管理（上传/设为最新/更新/删除/获取下载链接）
  - 触发方：用户（VersionManagement）
  - 输入对象：安装包文件（multipart/form-data）+ 版本元数据（version/platform/arch/is_latest 等）
  - 输出对象：SoftwareVersion 记录 + 安装包文件落盘 + 审计日志
  - 关键节点：是（客户端更新分发前置）
  - 依据：`admin/admin_backend/app/api/version.py`（`/upload/set-latest` 等），`admin/admin_frontend/src/api/version.js`

- 系统设置与监控（settings/stats/usage-stats/logs/dashboard）
  - 触发方：用户（SystemSettings/Dashboard）
  - 输入对象：SystemSetting key/value、分页参数
  - 输出对象：系统统计与审计日志列表；（更新 settings 时）写入 SystemSetting + 审计日志
  - 关键节点：是（在线判定、审计与运营数据）
  - 依据：`admin/admin_backend/app/api/system.py`，`admin/admin_frontend/src/api/system.js`

#### admin_backend：desktop 客户端调用接口（无需 JWT）

- 获取 RSA 公钥（GET `/api/auth/public-key`）
  - 触发方：系统（desktop/admin_frontend 在加密前调用）
  - 输入对象：无
  - 输出对象：public_key（PEM）
  - 关键节点：是（登录/激活码加密前置）
  - 依据：`admin/admin_backend/app/api/auth.py`，`admin/admin_backend/app/utils/rsa_utils.py`

- 客户端注册（POST `/api/clients/register`）
  - 触发方：系统（desktop 启动后）
  - 输入对象：device_fingerprint + 系统信息（hostname/platform/arch/ip/mac/app_version）
  - 输出对象：Client（创建或更新）+ client_registered 依据
  - 关键节点：是（后续心跳/授权激活/校验的前置）
  - 依据：`admin/admin_backend/app/api/client.py`（`register_client`），`rededge_desktop_application/electron/services/admin-client.js`（`registerClient`）

- 客户端心跳（POST `/api/clients/heartbeat`）
  - 触发方：系统（desktop 定时器）
  - 输入对象：device_fingerprint + usage_stats +（可选）系统信息
  - 输出对象：更新 `last_heartbeat_at`；返回 `license_status/license_expiry_at` 与（可选）`camera_config`
  - 关键节点：是（在线状态与配置下发入口）
  - 依据：`admin/admin_backend/app/api/client.py`（`heartbeat`），`rededge_desktop_application/electron/services/admin-client.js`（`reportHeartbeat`）

- 激活授权码（POST `/api/licenses/activate`）
  - 触发方：用户（desktop 或管理端触发激活）
  - 输入对象：device_fingerprint + activation_code（RSA 加密）
  - 输出对象：Client 的授权字段（activated/offline_mode/expires_at）更新
  - 关键节点：是（授权流程起点）
  - 依据：`admin/admin_backend/app/api/license.py`（`/activate`），`rededge_desktop_application/electron/services/admin-client.js`（`activateLicense`）

- 验证授权（POST `/api/licenses/validate`）
  - 触发方：系统（desktop 在线模式校验）
  - 输入对象：device_fingerprint
  - 输出对象：valid/原因（revoked/not_activated/expired）或有效授权信息
  - 关键节点：是（在线授权控制点）
  - 依据：`admin/admin_backend/app/api/license.py`（`/validate`），`rededge_desktop_application/electron/services/admin-client.js`（`validateWithServer`）

- 检查更新（POST `/api/versions/check-update`）与下载更新包（GET `/api/versions/<id>/download`）
  - 触发方：用户/系统（desktop SettingsView）
  - 输入对象：platform/arch/current_version
  - 输出对象：has_update/latest_version 或安装包二进制流
  - 关键节点：是（版本分发）
  - 依据：`admin/admin_backend/app/api/version.py`（`check_update/download_version`），`rededge_desktop_application/electron/services/admin-client.js`（`checkForUpdates/downloadUpdate`）

### 3. 跨模块数据流总结（Data Flow Summary）

- admin_frontend → admin_backend：HTTP（Axios）
  - 数据从哪里来：管理页面表单输入（登录、创建资源、分配授权、上传安装包等）
  - 经过哪些模块：`src/api/*` → `src/utils/request.js`（拦截器注入 Bearer token）→ `/api/*`
  - 传输形式：HTTP JSON；上传为 `multipart/form-data`；下载为 `blob`
  - 是否同步/异步：异步（Promise）
  - 依据：`admin/admin_frontend/src/utils/request.js`，`admin/admin_frontend/src/api/*`

- admin_frontend ↔ admin_backend：RSA 公钥与加密数据流
  - 数据从哪里来：`/api/auth/public-key` 返回的 PEM 公钥；登录密码/激活码明文
  - 经过哪些模块：前端 `JSEncrypt` 加密 → 后端 `cryptography` 私钥解密（PKCS1v15）
  - 传输形式：HTTP JSON（base64/字符串）
  - 是否同步/异步：异步
  - 依据：`admin/admin_frontend/src/utils/rsa.js`，`admin/admin_backend/app/utils/rsa_utils.py`，`admin/admin_backend/app/api/auth.py`，`admin/admin_backend/app/api/license.py`

- admin_backend ↔ 数据库：SQLAlchemy（资源与审计日志持久化）
  - 数据从哪里来：管理接口参数、客户端注册/心跳/激活请求
  - 经过哪些模块：API → Model → `db.session.commit/rollback`
  - 传输形式：DB（SQLAlchemy ORM）
  - 是否同步/异步：同步（请求内事务）
  - 依据：`admin/admin_backend/app/__init__.py`（`db`），`admin/admin_backend/app/models/*`，`admin/admin_backend/app/api/*`

- admin_backend ↔ 文件系统：安装包上传与分发
  - 数据从哪里来：上传文件 `request.files['file']`
  - 经过哪些模块：`save_uploaded_file`（扩展名校验、去重命名、计算 sha256）→ `UPLOAD_FOLDER`
  - 传输形式：本地文件；下载时 `send_file` 返回二进制流
  - 是否同步/异步：同步（请求内写文件/读文件）
  - 依据：`admin/admin_backend/app/utils/file_utils.py`，`admin/admin_backend/app/api/version.py`，`admin/admin_backend/app/config.py`

- desktop → admin_backend：客户端运营数据与授权数据流
  - 数据从哪里来：device_fingerprint、系统信息、usage_stats、RSA 加密激活码、当前版本号
  - 经过哪些模块：desktop `admin-client.js` → `/api/clients/*`、`/api/licenses/*`、`/api/versions/*`
  - 传输形式：HTTP JSON；更新包为二进制流
  - 是否同步/异步：心跳为定时异步；激活/校验/更新为按需异步
  - 依据：`rededge_desktop_application/electron/services/admin-client.js`，`admin/admin_backend/app/api/client.py`，`admin/admin_backend/app/api/license.py`，`admin/admin_backend/app/api/version.py`

### 4. 业务阶段划分（Business Stages）

- 认证与会话阶段
  - 包含业务动作：获取 RSA 公钥、管理员登录、刷新 token、登出、获取/更新 profile
  - 输入边界：用户名/密码（RSA 加密）、JWT token
  - 输出边界：access_token/refresh_token + 当前用户信息 + 审计日志
  - 依据：`admin/admin_backend/app/api/auth.py`，`admin/admin_frontend/src/api/auth.js`

- 基础资源管理阶段（用户/相机配置/授权码/版本）
  - 包含业务动作：用户管理、相机配置 CRUD、授权码生成与维护、版本上传与维护
  - 输入边界：管理页面表单（JSON 或文件上传）
  - 输出边界：数据库资源变更 + 审计日志 +（版本）文件落盘
  - 依据：`admin/admin_backend/app/api/user.py`，`admin/admin_backend/app/api/camera.py`，`admin/admin_backend/app/api/license.py`（JWT 部分），`admin/admin_backend/app/api/version.py`（JWT 部分）

- 客户端接入阶段
  - 包含业务动作：客户端注册（register）
  - 输入边界：device_fingerprint + 系统信息
  - 输出边界：Client 记录创建/更新
  - 依据：`admin/admin_backend/app/api/client.py`（`/register`）

- 授权生命周期阶段（分配/激活/校验/吊销）
  - 包含业务动作：分配授权码、客户端激活授权、客户端校验授权、吊销授权码/客户端授权
  - 输入边界：license_code（激活码）、device_fingerprint、client_id
  - 输出边界：Client 的 `license_status/offline_mode/license_expiry_at` 与 LicenseCode 激活日志更新
  - 依据：`admin/admin_backend/app/api/client.py`（`assign-license/revoke-license`），`admin/admin_backend/app/api/license.py`（`/activate/validate/revoke`）

- 配置下发与在线监控阶段
  - 包含业务动作：分配相机配置、客户端心跳、在线统计、审计日志查询
  - 输入边界：camera_config_id、device_fingerprint、heartbeat_timeout_minutes、分页参数
  - 输出边界：heartbeat 返回 `camera_config/license_status`；管理端获得在线/离线统计与日志列表
  - 依据：`admin/admin_backend/app/api/client.py`（`assign-camera/heartbeat`），`admin/admin_backend/app/api/system.py`（`stats/logs/dashboard`）

- 版本发布与分发阶段
  - 包含业务动作：上传安装包、设为最新、客户端检查更新、客户端下载更新包
  - 输入边界：安装包文件 + version/platform/arch；客户端 current_version
  - 输出边界：SoftwareVersion.is_latest 更新；客户端获得 latest_version 或二进制安装包
  - 依据：`admin/admin_backend/app/api/version.py`（`/upload/set-latest/check-update/download`）

### 5. 关键决策点（Decision Points）

- 登录与激活的 RSA 解密是否成功
  - 分支条件：后端 `decrypt_rsa()` 抛错则返回 `400`
  - 影响：登录/激活流程直接失败
  - 依据：`admin/admin_backend/app/api/auth.py`（login），`admin/admin_backend/app/api/license.py`（activate），`admin/admin_backend/app/utils/rsa_utils.py`

- 管理员登录校验（用户存在/密码正确/账号启用）
  - 分支条件：用户名或密码错误、`is_active` 为 false 时返回 `401`
  - 影响：无法获取 JWT token，不能进入管理后台
  - 依据：`admin/admin_backend/app/api/auth.py`

- JWT/权限控制分支（jwt_required_custom / admin_required）
  - 分支条件：缺少 token/过期/无效/被吊销 → `401`；部分接口需管理员权限（如 system settings 更新、审计日志）
  - 影响：前端请求被拒绝；`request.js` 在 401 时清理 token 并跳转登录
  - 依据：`admin/admin_backend/app/__init__.py`（JWT 错误处理器），`admin/admin_backend/app/api/system.py`（`admin_required`），`admin/admin_frontend/src/utils/request.js`

- 客户端注册分支（已存在则更新，否则创建）
  - 分支条件：按 `device_fingerprint` 查询到 Client 则更新系统信息与心跳时间
  - 影响：同一设备重复注册不会产生重复记录
  - 依据：`admin/admin_backend/app/api/client.py`（`register_client`）

- 心跳分支（客户端存在/离线模式）
  - 分支条件：
    - Client 不存在返回 `404`
    - `client.offline_mode` 为 true 返回 `400`（“离线模式客户端无需心跳”）
  - 影响：影响在线状态更新与管理端统计；离线客户端不纳入在线心跳流程
  - 依据：`admin/admin_backend/app/api/client.py`（`heartbeat`）

- 授权激活分支（客户端存在/授权码存在/旧授权释放）
  - 分支条件：
    - Client 不存在返回 `404`（`/activate` 中对应 `error` 字符串为 `'??????'`）
    - LicenseCode 不存在返回 `404`（`/activate` 中对应 `error` 字符串为 `'??????'`）
    - client 已有不同 activation_code 时先释放旧授权占用
    - `license.activate(...)` 抛 `ValueError` 返回 `400`
  - 影响：决定授权是否能成功绑定到客户端与是否切换 offline_mode
  - 依据：`admin/admin_backend/app/api/license.py`（`/activate`），`admin/admin_backend/app/api/client.py`（`assign-license`）

- 授权校验分支（revoked/not_activated/expired）
  - 分支条件：
    - `license_status == "revoked"` → 返回 revoked
    - `license_status != "activated"` → 返回 not_activated
    - `now > license_expiry_at` → 写入 `expired` 并返回 expired
  - 影响：决定客户端在线校验结果与状态落库
  - 依据：`admin/admin_backend/app/api/license.py`（`/validate`）

- 授权码删除限制（已激活不可删除）
  - 分支条件：`license.current_activations > 0` 时返回 `400`
  - 影响：避免删除正在被客户端占用的授权码
  - 依据：`admin/admin_backend/app/api/license.py`（`delete_license`）

- 版本检查更新分支（latest_version 是否存在 / 版本号比较方式）
  - 分支条件：
    - 找不到 `is_latest` 版本 → `has_update: false`
    - `has_update = latest_version.version != current_version`（字符串不等判定）
  - 影响：是否提示可用更新
  - 依据：`admin/admin_backend/app/api/version.py`（`check_update`）

- 安装包下载分支（版本存在/文件存在）
  - 分支条件：版本不存在或安装包文件不存在 → `404`；否则 `send_file` 并增加下载计数
  - 影响：客户端下载更新是否成功
  - 依据：`admin/admin_backend/app/api/version.py`（`download_version`）

- 安装包上传分支（扩展名/重名/版本重复）
  - 分支条件：
    - `allowed_file()` 扩展名不在允许集合 → 抛错
    - 文件重名 → `save_uploaded_file` 自动追加序号避免覆盖
    - 同 platform/arch/version 已存在 → 返回 `400`
  - 影响：版本发布能否入库并落盘
  - 依据：`admin/admin_backend/app/utils/file_utils.py`，`admin/admin_backend/app/api/version.py`，`admin/admin_backend/app/config.py`

- 前后端/客户端接口契约不一致（直接导致流程失败）
  - 分支条件与影响：
    - 前端定义 `GET /licenses/export` 导出授权码，但后端无路由 → 404，导出失败
      - 依据：`admin/admin_frontend/src/api/license.js`，`admin/admin_backend/app/api/license.py`
    - 前端 `SystemSettings.vue` 期望 `res.data.general/license/heartbeat` 与 `res.data.items`（日志），但后端返回 `data` 为扁平 dict 或列表 + 分页字段在顶层 → 页面数据绑定失败
      - 依据：`admin/admin_frontend/src/views/SystemSettings.vue`，`admin/admin_backend/app/api/system.py`
    - desktop `syncCameraConfigs()` 调用 `GET /api/clients/<device_fingerprint>`，后端仅提供 `GET /api/clients/<int:client_id>` 且需 JWT → 同步相机配置失败
      - 依据：`rededge_desktop_application/electron/services/admin-client.js`，`admin/admin_backend/app/api/client.py`
