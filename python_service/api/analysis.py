"""
影像分析API
提供光谱指数计算等遥感分析功能
"""
import os
import uuid
import time
import logging
import threading
import traceback
import numpy as np
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

analysis_bp = Blueprint('analysis', __name__)

# 存储正在运行的任务
_running_jobs = {}
_job_lock = threading.Lock()

# RedEdge-M 5波段定义（波段索引从0开始）
BAND_NAMES = {
    'blue': 0,      # Band 1: ~475nm
    'green': 1,     # Band 2: ~560nm
    'red': 2,       # Band 3: ~668nm
    'rededge': 3,   # Band 4: ~717nm
    'nir': 4        # Band 5: ~840nm
}

# 预设光谱指数
PRESET_INDICES = {
    'ndvi': {
        'name': 'NDVI',
        'description': '归一化植被指数',
        'formula_display': '(NIR - Red) / (NIR + Red)',
        'vmin': -1.0,
        'vmax': 1.0,
        'colormap': 'RdYlGn'
    },
    'ndre': {
        'name': 'NDRE',
        'description': '归一化红边指数',
        'formula_display': '(NIR - RedEdge) / (NIR + RedEdge)',
        'vmin': -1.0,
        'vmax': 1.0,
        'colormap': 'RdYlGn'
    },
    'gndvi': {
        'name': 'GNDVI',
        'description': '绿光归一化植被指数',
        'formula_display': '(NIR - Green) / (NIR + Green)',
        'vmin': -1.0,
        'vmax': 1.0,
        'colormap': 'RdYlGn'
    },
    'exg': {
        'name': 'ExG',
        'description': '超绿指数',
        'formula_display': '2×Green - Red - Blue',
        'vmin': -1.0,
        'vmax': 2.0,
        'colormap': 'Greens'
    },
    'evi': {
        'name': 'EVI',
        'description': '增强植被指数',
        'formula_display': '2.5×(NIR-Red)/(NIR+6×Red-7.5×Blue+1)',
        'vmin': -1.0,
        'vmax': 1.0,
        'colormap': 'RdYlGn'
    },
    'savi': {
        'name': 'SAVI',
        'description': '土壤调节植被指数',
        'formula_display': '1.5×(NIR-Red)/(NIR+Red+0.5)',
        'vmin': -1.0,
        'vmax': 1.0,
        'colormap': 'RdYlGn'
    },
    'ccci': {
        'name': 'CCCI',
        'description': '冠层叶绿素含量指数',
        'formula_display': 'NDRE / NDVI',
        'vmin': 0.0,
        'vmax': 2.0,
        'colormap': 'YlOrRd'
    }
}


def _load_bands(tif_path):
    """
    加载5波段TIF文件，返回各波段float32数组

    Args:
        tif_path: TIF文件路径

    Returns:
        dict: {'blue', 'green', 'red', 'rededge', 'nir'} -> numpy array (H, W)
    """
    try:
        import tifffile
        img = tifffile.imread(tif_path)
    except ImportError:
        # 尝试用GDAL
        from osgeo import gdal
        ds = gdal.Open(tif_path)
        if ds is None:
            raise ValueError(f'Cannot open TIF file: {tif_path}')
        bands_count = ds.RasterCount
        img = np.stack([ds.GetRasterBand(i + 1).ReadAsArray() for i in range(bands_count)], axis=0)
        ds = None

    img = np.array(img, dtype=np.float32)

    # 处理不同形状：(H, W, C) 或 (C, H, W)
    if img.ndim == 2:
        raise ValueError('Input TIF must have 5 bands, got 1 band (grayscale image)')
    elif img.ndim == 3:
        if img.shape[0] == 5:
            # (5, H, W) -> keep
            pass
        elif img.shape[2] == 5:
            # (H, W, 5) -> (5, H, W)
            img = np.transpose(img, (2, 0, 1))
        else:
            raise ValueError(f'Expected 5-band TIF, got shape {img.shape}')
    else:
        raise ValueError(f'Unexpected TIF shape: {img.shape}')

    return {
        'blue': img[0],
        'green': img[1],
        'red': img[2],
        'rededge': img[3],
        'nir': img[4]
    }


def _compute_index(index_type, bands, custom_formula=None):
    """
    计算光谱指数

    Args:
        index_type: 预设类型字符串 or 'custom'
        bands: dict of band arrays
        custom_formula: 自定义公式字符串

    Returns:
        result_array (H, W), info dict
    """
    b = bands['blue'].astype(np.float32)
    g = bands['green'].astype(np.float32)
    r = bands['red'].astype(np.float32)
    re = bands['rededge'].astype(np.float32)
    nir = bands['nir'].astype(np.float32)

    eps = 1e-10  # 避免除零

    if index_type == 'ndvi':
        result = (nir - r) / (nir + r + eps)
        info = PRESET_INDICES['ndvi']

    elif index_type == 'ndre':
        result = (nir - re) / (nir + re + eps)
        info = PRESET_INDICES['ndre']

    elif index_type == 'gndvi':
        result = (nir - g) / (nir + g + eps)
        info = PRESET_INDICES['gndvi']

    elif index_type == 'exg':
        result = 2 * g - r - b
        info = PRESET_INDICES['exg']

    elif index_type == 'evi':
        result = 2.5 * (nir - r) / (nir + 6 * r - 7.5 * b + 1 + eps)
        info = PRESET_INDICES['evi']

    elif index_type == 'savi':
        result = 1.5 * (nir - r) / (nir + r + 0.5 + eps)
        info = PRESET_INDICES['savi']

    elif index_type == 'ccci':
        ndvi = (nir - r) / (nir + r + eps)
        ndre = (nir - re) / (nir + re + eps)
        result = np.where(np.abs(ndvi) > eps, ndre / (ndvi + eps), 0.0)
        info = PRESET_INDICES['ccci']

    elif index_type == 'custom':
        if not custom_formula:
            raise ValueError('Custom formula is required when index_type is "custom"')
        result = _eval_custom_formula(custom_formula, b, g, r, re, nir)
        info = {
            'name': 'Custom',
            'description': '自定义光谱公式',
            'formula_display': custom_formula,
            'vmin': float(np.nanpercentile(result, 2)),
            'vmax': float(np.nanpercentile(result, 98)),
            'colormap': 'RdYlGn'
        }
    else:
        raise ValueError(f'Unknown index type: {index_type}')

    # 清除无效值
    result = np.where(np.isfinite(result), result, np.nan)
    return result, info


def _eval_custom_formula(formula, blue, green, red, rededge, nir):
    """
    安全地执行用户自定义公式，仅允许numpy数学运算

    支持变量名：blue, green, red, rededge, nir (大小写均可)
    支持运算符：+, -, *, /, **, ()
    """
    allowed_names = {
        'blue': blue, 'Blue': blue, 'BLUE': blue,
        'green': green, 'Green': green, 'GREEN': green,
        'red': red, 'Red': red, 'RED': red,
        'rededge': rededge, 'RedEdge': rededge, 'REDEDGE': rededge, 're': rededge,
        'nir': nir, 'NIR': nir, 'Nir': nir,
        'np': np,
        'abs': np.abs,
        'sqrt': np.sqrt,
        'log': np.log,
        'exp': np.exp,
        'nan': np.nan,
        'pi': np.pi
    }

    # 安全检查：禁止危险字符串
    forbidden = ['import', 'exec', 'eval', 'open', 'os', 'sys', '__']
    formula_lower = formula.lower()
    for f in forbidden:
        if f in formula_lower:
            raise ValueError(f'Formula contains forbidden keyword: {f}')

    try:
        result = eval(formula, {"__builtins__": {}}, allowed_names)  # noqa: S307
        return np.array(result, dtype=np.float32)
    except Exception as e:
        raise ValueError(f'Formula evaluation failed: {e}')


def _save_result_tif(result_array, output_path, source_tif_path=None):
    """
    保存计算结果为单波段GeoTIF

    Args:
        result_array: (H, W) float32 array
        output_path: 输出TIF路径
        source_tif_path: 参考的源TIF（用于复制地理参考信息，可选）
    """
    import tifffile

    # 将nan替换为nodata值(-9999)用于保存
    save_array = np.where(np.isnan(result_array), -9999.0, result_array).astype(np.float32)

    # 尝试获取地理参考信息并保存为GeoTIFF
    saved_with_geo = False
    if source_tif_path and os.path.exists(source_tif_path):
        try:
            from osgeo import gdal
            src_ds = gdal.Open(source_tif_path)
            if src_ds is not None:
                driver = gdal.GetDriverByName('GTiff')
                dst_ds = driver.Create(
                    output_path,
                    save_array.shape[1], save_array.shape[0],
                    1, gdal.GDT_Float32,
                    ['COMPRESS=LZW', 'PREDICTOR=3']
                )
                dst_ds.SetGeoTransform(src_ds.GetGeoTransform())
                dst_ds.SetProjection(src_ds.GetProjection())
                band = dst_ds.GetRasterBand(1)
                band.WriteArray(save_array)
                band.SetNoDataValue(-9999.0)
                dst_ds.FlushCache()
                dst_ds = None
                src_ds = None
                saved_with_geo = True
        except Exception as e:
            logger.warning(f'Failed to copy georeference: {e}')

    if not saved_with_geo:
        tifffile.imwrite(output_path, save_array, compression='lzw')


def _save_result_png(result_array, output_path, title, index_info):
    """
    生成带标题和图例的PNG可视化预览图

    Args:
        result_array: (H, W) float32 array
        output_path: 输出PNG路径
        title: 图表标题
        index_info: 指数信息字典（含colormap, vmin, vmax等）
    """
    import matplotlib.pyplot as plt
    import matplotlib.colors as mcolors
    from matplotlib.colorbar import ColorbarBase

    colormap = index_info.get('colormap', 'RdYlGn')
    vmin = index_info.get('vmin', -1.0)
    vmax = index_info.get('vmax', 1.0)

    # 动态调整vmin/vmax到数据实际范围（不超过预设边界）
    valid = result_array[np.isfinite(result_array)]
    if len(valid) > 0:
        data_min = float(np.percentile(valid, 2))
        data_max = float(np.percentile(valid, 98))
        vmin = max(vmin, data_min) if data_min > vmin else vmin
        vmax = min(vmax, data_max) if data_max < vmax else vmax

    fig, axes = plt.subplots(1, 2, figsize=(12, 6),
                              gridspec_kw={'width_ratios': [20, 1]})

    ax_img = axes[0]
    ax_cbar = axes[1]

    cmap = plt.get_cmap(colormap)
    cmap.set_bad(color='#888888')  # NaN显示灰色

    img_plot = ax_img.imshow(result_array, cmap=cmap, vmin=vmin, vmax=vmax,
                              interpolation='nearest')

    ax_img.set_title(title, fontsize=14, fontweight='bold', pad=10)
    ax_img.set_xlabel('Pixel X')
    ax_img.set_ylabel('Pixel Y')

    # 图例（颜色条）
    norm = mcolors.Normalize(vmin=vmin, vmax=vmax)
    cb = ColorbarBase(ax_cbar, cmap=cmap, norm=norm, orientation='vertical')
    cb.set_label(index_info.get('name', 'Value'), fontsize=11)

    # 添加统计信息
    if len(valid) > 0:
        stats_text = (
            f"Min: {float(np.nanmin(result_array)):.4f}\n"
            f"Max: {float(np.nanmax(result_array)):.4f}\n"
            f"Mean: {float(np.nanmean(result_array)):.4f}\n"
            f"Std: {float(np.nanstd(result_array)):.4f}"
        )
        ax_img.text(0.02, 0.02, stats_text, transform=ax_img.transAxes,
                    fontsize=9, verticalalignment='bottom',
                    bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

    # 公式说明
    formula_display = index_info.get('formula_display', '')
    if formula_display:
        ax_img.text(0.98, 0.02, f'Formula: {formula_display}',
                    transform=ax_img.transAxes, fontsize=8,
                    horizontalalignment='right', verticalalignment='bottom',
                    bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8))

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)


def _process_analysis_job(job_id, tif_path, index_type, custom_formula,
                           output_dir, output_basename, colormap_override):
    """在后台线程中执行分析任务"""

    def update_job(updates):
        with _job_lock:
            if job_id in _running_jobs:
                _running_jobs[job_id].update(updates)

    try:
        update_job({'status': 'running', 'progress': 5,
                    'message': '加载影像波段', 'started_at': time.time()})

        # 1. 加载波段
        bands = _load_bands(tif_path)
        update_job({'progress': 30, 'message': '计算光谱指数'})

        # 2. 计算指数
        result_array, index_info = _compute_index(index_type, bands, custom_formula)

        if colormap_override:
            index_info = dict(index_info)
            index_info['colormap'] = colormap_override

        update_job({'progress': 60, 'message': '保存结果TIF'})

        # 3. 保存TIF
        os.makedirs(output_dir, exist_ok=True)
        tif_output = os.path.join(output_dir, f'{output_basename}.tif')
        _save_result_tif(result_array, tif_output, tif_path)

        update_job({'progress': 80, 'message': '生成PNG预览图'})

        # 4. 保存PNG
        png_output = os.path.join(output_dir, f'{output_basename}.png')
        index_name = index_info.get('name', index_type.upper())
        title = f'{index_name} - {os.path.basename(tif_path)}'
        _save_result_png(result_array, png_output, title, index_info)

        # 5. 统计信息
        valid = result_array[np.isfinite(result_array)]
        stats = {}
        if len(valid) > 0:
            stats = {
                'min': float(np.nanmin(result_array)),
                'max': float(np.nanmax(result_array)),
                'mean': float(np.nanmean(result_array)),
                'std': float(np.nanstd(result_array)),
                'valid_pixels': int(len(valid)),
                'total_pixels': int(result_array.size)
            }

        update_job({
            'status': 'completed',
            'progress': 100,
            'message': '处理完成',
            'completed_at': time.time(),
            'result': {
                'tif_path': tif_output,
                'png_path': png_output,
                'index_type': index_type,
                'index_name': index_name,
                'stats': stats
            }
        })

    except Exception as e:
        logger.exception(f'Analysis job {job_id} failed')
        update_job({
            'status': 'failed',
            'progress': 100,
            'message': '处理失败',
            'error_message': str(e),
            'completed_at': time.time()
        })


@analysis_bp.route('/presets', methods=['GET'])
def get_presets():
    """获取所有预设光谱指数信息"""
    return jsonify({
        'success': True,
        'presets': PRESET_INDICES
    })


@analysis_bp.route('/submit', methods=['POST'])
def submit_job():
    """
    提交光谱分析任务（异步）

    Request Body:
        tif_path: str           - 5波段TIF文件路径
        index_type: str         - 指数类型（ndvi/ndre/gndvi/exg/evi/savi/ccci/custom）
        custom_formula: str     - 自定义公式（index_type='custom'时必填）
        output_dir: str         - 输出目录
        output_basename: str    - 输出文件名（不含扩展名）
        colormap: str           - 可选，覆盖colormap

    Returns:
        { success, job_id, status }
    """
    try:
        data = request.get_json()

        if not data.get('tif_path'):
            return jsonify({'success': False, 'error': 'Missing tif_path'}), 400
        if not data.get('index_type'):
            return jsonify({'success': False, 'error': 'Missing index_type'}), 400
        if not data.get('output_dir'):
            return jsonify({'success': False, 'error': 'Missing output_dir'}), 400

        tif_path = data['tif_path']
        index_type = data['index_type'].lower()
        custom_formula = data.get('custom_formula', '')
        output_dir = data['output_dir']
        output_basename = data.get('output_basename') or f'{index_type}_{int(time.time())}'
        colormap_override = data.get('colormap', '')

        if not os.path.exists(tif_path):
            return jsonify({'success': False, 'error': f'TIF file not found: {tif_path}'}), 400

        if index_type not in list(PRESET_INDICES.keys()) + ['custom']:
            return jsonify({'success': False,
                            'error': f'Unknown index type: {index_type}'}), 400

        if index_type == 'custom' and not custom_formula.strip():
            return jsonify({'success': False,
                            'error': 'custom_formula is required for custom index'}), 400

        job_id = str(uuid.uuid4())
        job_info = {
            'id': job_id,
            'status': 'pending',
            'progress': 0,
            'message': '排队等待',
            'result': None,
            'error_message': None,
            'started_at': None,
            'completed_at': None,
            'created_at': time.time()
        }

        with _job_lock:
            _running_jobs[job_id] = job_info

        thread = threading.Thread(
            target=_process_analysis_job,
            args=(job_id, tif_path, index_type, custom_formula,
                  output_dir, output_basename, colormap_override),
            daemon=True
        )
        thread.start()

        return jsonify({'success': True, 'job_id': job_id, 'status': 'pending'})

    except Exception as e:
        logger.exception('Error in submit_job')
        return jsonify({'success': False, 'error': str(e)}), 500


@analysis_bp.route('/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """获取分析任务状态"""
    with _job_lock:
        job = _running_jobs.get(job_id)

    if not job:
        return jsonify({'success': False, 'error': 'Job not found'}), 404

    return jsonify({'success': True, **job})


@analysis_bp.route('/cancel/<job_id>', methods=['POST'])
def cancel_job(job_id):
    """取消分析任务（仅对排队中的任务有效）"""
    with _job_lock:
        job = _running_jobs.get(job_id)
        if not job:
            return jsonify({'success': False, 'error': 'Job not found'}), 404
        if job['status'] == 'pending':
            job['status'] = 'cancelled'
            job['message'] = '已取消'
            job['completed_at'] = time.time()

    return jsonify({'success': True, 'message': 'Cancel requested'})
