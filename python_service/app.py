"""
RedEdge Camera Python Service
Flask服务入口，提供辐射定标和影像配准API
"""
import os
import sys
import logging
import multiprocessing
from flask import Flask, jsonify
from flask_cors import CORS

# 配置 GDAL 数据路径（打包环境需要）
if getattr(sys, 'frozen', False):
    # PyInstaller 打包环境
    base_path = sys._MEIPASS
    gdal_data_path = os.path.join(base_path, 'gdal-data')
    if os.path.exists(gdal_data_path):
        os.environ['GDAL_DATA'] = gdal_data_path
        os.environ['PROJ_LIB'] = gdal_data_path  # PROJ 库也可能需要

# 配置 matplotlib 使用非交互式后端（必须在导入 matplotlib 之前）
import matplotlib
matplotlib.use('Agg')  # 使用非 GUI 后端

# 禁用 matplotlib 的日志输出
logging.getLogger('matplotlib').setLevel(logging.WARNING)
logging.getLogger('matplotlib.font_manager').setLevel(logging.WARNING)
logging.getLogger('PIL').setLevel(logging.WARNING)

# 添加micasense库到路径
IMAGEPROCESSING_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'imageprocessing')
if IMAGEPROCESSING_PATH not in sys.path:
    sys.path.insert(0, IMAGEPROCESSING_PATH)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """创建Flask应用实例"""
    app = Flask(__name__)

    # 启用CORS，允许来自Electron的请求
    CORS(app, origins=['http://localhost:*', 'file://*'])

    # 配置
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
    app.config['JSON_AS_ASCII'] = False

    # 注册蓝图
    from api.calibration import calibration_bp
    from api.alignment import alignment_bp
    from api.processing import processing_bp
    from api.analysis import analysis_bp

    app.register_blueprint(calibration_bp, url_prefix='/api/calibration')
    app.register_blueprint(alignment_bp, url_prefix='/api/alignment')
    app.register_blueprint(processing_bp, url_prefix='/api/processing')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')

    # 健康检查端点
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'ok',
            'service': 'rededge-python-service',
            'version': '1.0.0'
        })

    # 全局错误处理
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception('Unhandled exception')
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

    return app


# 用于直接运行
if __name__ == '__main__':
    # 支持 Windows 下的 multiprocessing 和 PyInstaller 打包
    multiprocessing.freeze_support()

    # 设置 multiprocessing 启动方法为 spawn（跨平台兼容）
    try:
        if multiprocessing.get_start_method(allow_none=True) is None:
            multiprocessing.set_start_method('spawn')
    except RuntimeError:
        pass  # 已经设置过了

    app = create_app()
    port = int(os.environ.get('PYTHON_SERVICE_PORT', 5001))

    # 强制禁用 debug 模式（打包环境下 debug 模式不稳定）
    debug = False
    if not getattr(sys, 'frozen', False):  # 仅在开发环境允许 debug
        debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    logger.info(f'Starting RedEdge Python Service on port {port}')
    app.run(host='127.0.0.1', port=port, debug=debug, threaded=True, use_reloader=False)
