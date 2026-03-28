## rededge_desktop_application - 桌面控制软件

### 技术栈
Electron 28 + Vue 3 + Vite + Ant Design Vue + SQLite（electron-store）

### 架构设计
**三层分离架构**：
- **Main 进程**：相机 HTTP 客户端、数据库、下载队列、授权服务
- **Preload 层**：IPC 桥接，暴露安全 API
- **Renderer 进程**：Vue 组件、Pinia 状态、Ant Design UI

### 主要功能
1. 相机连接管理与状态监控
2. 实时预览与拍照控制
3. 文件管理与下载队列
4. 定标/配准/批处理调用（依赖 python_service）
5. 授权与本地配置存储

### 各Tab页面功能：
- Connection：配置相机连接信息、测试连通性并激活配置
- Preview：实时预览画面与刷新率设置
- Capture：手动拍摄、定时拍摄、最近拍摄列表
- Files：浏览相机文件、下载/删除、下载队列管理
- Status：相机状态、存储、GPS、DLS/IMU 等信息展示
- Calibration：定标板检测、保存/管理定标记录、批处理定标
- Alignment：生成配准矩阵、单张/批量配准、结果预览
- Analysis：预留分析功能入口
- Settings：应用/网络/授权/关于等设置

### 数据持久化
配置与业务数据存储在 `app.getPath('userData')/config.json`，包含：
- `camera_profiles`
- `app_settings`
- `download_queue`
- `capture_jobs`
- `license_state`
- `calibration_records`
- `warp_matrix_jobs`
- `alignment_jobs`
- `batch_jobs`

---

## 近期改动要点
- **底部状态栏**：新增36px高度状态栏，显示版本、激活状态、实时时间、内存/CPU监控、系统消息（带角标）、可拖拽调整大小的帮助悬浮窗口。
- **配准任务异步化**：compute-warp-matrices 改为异步 + 轮询，前端显示进度，任务状态持久化并支持窗口重启恢复。
- **配准记录存储**：新增 `warp_matrix_jobs` 持久化表结构与 IPC/Store 管理接口。
- **配准参数对齐官方教程**：OpenCV(ECC) 默认 `max_iterations=10`、`pyramid_levels=0`；前端可配置并提供 i18n 说明。
- **配准流程简化**：移除单张 5 波段堆栈 TIFF 兼容与相关前端入口，强制 5 张单波段 TIFF。
- **SIFT 稳定性修复**：修复 `ref_image_SIFT`/`kpi` 未初始化问题，并对缺失 `rig_relatives` 做容错，避免 SIFT 配准崩溃。
- **配准应用一致性**：对齐 reference band 的传递逻辑，避免计算与应用矩阵不一致。
- **Python 服务启动**：dev 环境增加 conda 路径探测与 Python 回退，支持 `REDEDGE_CONDA_EXE` / `REDEDGE_CONDA_ENV` / `REDEDGE_PYTHON_EXE` / `REDEDGE_PYTHON_SERVICE_PATH` 覆盖。
- **崩溃取证与自恢复**：启用 crashReporter（dump 输出到 `userData/crashDumps`），Main 进程记录 renderer 崩溃并尝试自动重启，同时弹出提示 UI。
- **下载稳定性**：下载任务对 `AbortSignal` 事件监听做了清理，避免监听器累积导致警告与潜在崩溃。
- **Calibration 视图**：记录只在首次进入 `records/batch` 标签时加载，减少初始渲染压力。
- **i18n**：重建 `zh-CN.js` 且补齐缺失翻译；新增 `preview.bandvisualization_title`。
- **构建体积**：路由改为懒加载；Vite 手动拆分 vendor（Vue/AntD/Three/UTIF）以降低单包体积。

---

## 开发备注
- **dev 环境稳定性**：已知 Calibration 页面多次切换可能触发 renderer crash；打包环境未复现。
- **崩溃取证**：crashReporter 已启用，dump 默认输出到 `userData/crashDumps`。
- **GPU 相关问题**：可通过 `REDEDGE_DISABLE_HW_ACCELERATION=1` 禁用硬件加速。