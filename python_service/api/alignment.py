"""
影像配准API
提供配准矩阵计算、单张/批量配准等接口
"""
import os
import uuid
import time
import logging
import threading
from flask import Blueprint, request, jsonify

from services.alignment_service import AlignmentService
from services.capture_service import CaptureService

logger = logging.getLogger(__name__)

alignment_bp = Blueprint('alignment', __name__)

# 存储正在运行的任务
_running_jobs = {}
_job_lock = threading.Lock()


@alignment_bp.route('/compute-warp-matrices', methods=['POST'])
def compute_warp_matrices():
    """
    计算配准矩阵

    Request Body:
        image_paths: ["/path/to/IMG_0001_1.tif", ...]
        method: "opencv" | "sift"
        reference_band: int (0-4, 默认1-绿色波段)
        output_path: str (可选, .npy文件保存路径)

    Returns:
        {
            success: bool,
            camera_serial: str,
            camera_model: str,
            warp_matrices: [[...], ...],
            warp_matrices_path: str,
            cropped_dimensions: [left, top, width, height],
            alignment_quality: float,
            elapsed_time: float
        }
    """
    try:
        data = request.get_json()

        if 'image_paths' not in data:
            return jsonify({'success': False, 'error': 'Missing image_paths'}), 400

        image_paths = data['image_paths']
        method = data.get('method', 'opencv')
        reference_band = data.get('reference_band', 1)
        output_path = data.get('output_path')

        # 计算配准矩阵
        result = AlignmentService.compute_warp_matrices(
            image_paths,
            method=method,
            reference_band=reference_band
        )

        # 如果指定了输出路径，保存矩阵
        if output_path and result['success']:
            # 确保目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            AlignmentService.save_warp_matrices(result['warp_matrices'], output_path)
            result['warp_matrices_path'] = output_path

        # 计算配准质量评分 (简单的启发式评分)
        alignment_quality = 95 if result['success'] else 0
        result['alignment_quality'] = alignment_quality

        return jsonify(result)

    except Exception as e:
        logger.exception('Error in compute_warp_matrices')
        return jsonify({'success': False, 'error': str(e)}), 500


@alignment_bp.route('/align-single', methods=['POST'])
def align_single():
    """
    单张图像配准

    Request Body:
        image_paths: ["/path/to/IMG_0020_1.tif", ...]
        warp_matrices_path: "/path/to/matrices.npy"
        或 warp_matrices: [[...], ...]
        output_path: "/path/to/output.tif"
        options: {
            sort_by_wavelength: bool,
            generate_rgb_preview: bool,
            generate_ndvi: bool,
            img_type: "reflectance" | "radiance" | "raw",
            irradiance_list: [float, ...] (reflectance类型需要)
        }

    Returns:
        {
            success: bool,
            output_path: str,
            rgb_preview_path: str | null,
            ndvi_path: str | null,
            cropped_dimensions: [left, top, width, height]
        }
    """
    try:
        data = request.get_json()

        # 验证必要参数
        if 'image_paths' not in data:
            return jsonify({'success': False, 'error': 'Missing image_paths'}), 400
        if 'output_path' not in data:
            return jsonify({'success': False, 'error': 'Missing output_path'}), 400

        image_paths = data['image_paths']
        output_path = data['output_path']
        options = data.get('options', {})

        # 加载配准矩阵
        if 'warp_matrices_path' in data:
            warp_matrices = AlignmentService.load_warp_matrices(data['warp_matrices_path'])
        elif 'warp_matrices' in data:
            warp_matrices = data['warp_matrices']
        else:
            return jsonify({'success': False, 'error': 'Missing warp_matrices or warp_matrices_path'}), 400

        # 加载图像
        capture = CaptureService.load_capture(image_paths)

        # 获取选项
        img_type = options.get('img_type', 'radiance')
        irradiance_list = options.get('irradiance_list')
        reference_band = options.get('reference_band', 1)

        # 计算裁剪尺寸
        cropped_dimensions = AlignmentService._calculate_crop_dimensions(
            capture, warp_matrices, reference_band
        )

        # 应用配准
        aligned_stack = AlignmentService.apply_alignment(
            capture,
            warp_matrices,
            cropped_dimensions=cropped_dimensions,
            reference_band=reference_band,
            img_type=img_type,
            irradiance_list=irradiance_list
        )

        # 按波长排序
        if options.get('sort_by_wavelength', True):
            # 获取波长信息
            wavelengths = [img.center_wavelength for img in capture.images]
            sorted_indices = sorted(range(len(wavelengths)), key=lambda i: wavelengths[i])
            aligned_stack = aligned_stack[:, :, sorted_indices]

        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # 保存结果
        CaptureService.save_as_geotiff([aligned_stack[:, :, i] for i in range(aligned_stack.shape[2])], output_path)

        result = {
            'success': True,
            'output_path': output_path,
            'cropped_dimensions': cropped_dimensions,
            'rgb_preview_path': None,
            'ndvi_path': None
        }

        # 生成RGB预览
        if options.get('generate_rgb_preview', False):
            rgb_path = output_path.rsplit('.', 1)[0] + '_rgb.jpg'
            AlignmentService.generate_rgb_preview(aligned_stack, rgb_path)
            result['rgb_preview_path'] = rgb_path

        # 生成NDVI
        if options.get('generate_ndvi', False):
            ndvi_path = output_path.rsplit('.', 1)[0] + '_ndvi.jpg'
            ndvi = AlignmentService.calculate_ndvi(aligned_stack)
            AlignmentService.save_ndvi(ndvi, ndvi_path)
            result['ndvi_path'] = ndvi_path

        return jsonify(result)

    except Exception as e:
        logger.exception('Error in align_single')
        return jsonify({'success': False, 'error': str(e)}), 500


@alignment_bp.route('/align-batch', methods=['POST'])
def align_batch():
    """
    批量图像配准（异步）

    Request Body:
        input_directory: "/path/to/images"
        output_directory: "/path/to/output"
        warp_matrices_path: "/path/to/matrices.npy"
        options: { ... }

    Returns:
        {
            success: bool,
            job_id: str,
            status: "pending",
            total_captures: int
        }
    """
    try:
        data = request.get_json()

        # 验证必要参数
        required = ['input_directory', 'output_directory', 'warp_matrices_path']
        for field in required:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing {field}'}), 400

        input_directory = data['input_directory']
        output_directory = data['output_directory']
        warp_matrices_path = data['warp_matrices_path']
        options = data.get('options', {})

        # 验证目录存在
        if not os.path.isdir(input_directory):
            return jsonify({'success': False, 'error': 'Input directory not found'}), 400

        # 扫描capture
        captures = _scan_captures(input_directory)
        total_captures = len(captures)

        if total_captures == 0:
            return jsonify({'success': False, 'error': 'No captures found in input directory'}), 400

        # 创建任务
        job_id = str(uuid.uuid4())

        job_info = {
            'id': job_id,
            'status': 'pending',
            'input_directory': input_directory,
            'output_directory': output_directory,
            'warp_matrices_path': warp_matrices_path,
            'options': options,
            'captures': captures,
            'total_captures': total_captures,
            'processed_captures': 0,
            'current_capture': None,
            'error_message': None,
            'started_at': None,
            'completed_at': None
        }

        with _job_lock:
            _running_jobs[job_id] = job_info

        # 启动后台线程处理
        thread = threading.Thread(target=_process_batch_job, args=(job_id,))
        thread.daemon = True
        thread.start()

        return jsonify({
            'success': True,
            'job_id': job_id,
            'status': 'pending',
            'total_captures': total_captures
        })

    except Exception as e:
        logger.exception('Error in align_batch')
        return jsonify({'success': False, 'error': str(e)}), 500


@alignment_bp.route('/job-status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """获取任务状态"""
    with _job_lock:
        job = _running_jobs.get(job_id)

    if job is None:
        return jsonify({'success': False, 'error': 'Job not found'}), 404

    return jsonify({
        'success': True,
        'job_id': job['id'],
        'status': job['status'],
        'total_captures': job['total_captures'],
        'processed_captures': job['processed_captures'],
        'current_capture': job['current_capture'],
        'error_message': job['error_message'],
        'started_at': job['started_at'],
        'completed_at': job['completed_at'],
        'progress': job['processed_captures'] / job['total_captures'] * 100 if job['total_captures'] > 0 else 0
    })


@alignment_bp.route('/cancel-job/<job_id>', methods=['POST'])
def cancel_job(job_id):
    """取消任务"""
    with _job_lock:
        job = _running_jobs.get(job_id)
        if job:
            job['status'] = 'cancelled'

    return jsonify({'success': True})


def _scan_captures(directory):
    """扫描目录中的capture（按capture_id分组）"""
    from collections import defaultdict
    import re

    captures = defaultdict(list)

    for filename in os.listdir(directory):
        if not filename.lower().endswith('.tif'):
            continue

        # 解析文件名: IMG_XXXX_N.tif
        match = re.match(r'(.+)_(\d+)\.tif$', filename, re.IGNORECASE)
        if match:
            capture_id = match.group(1)
            band_index = int(match.group(2))
            captures[capture_id].append({
                'band_index': band_index,
                'path': os.path.join(directory, filename)
            })

    # 只保留有5个波段的capture
    valid_captures = []
    for capture_id, bands in captures.items():
        if len(bands) >= 5:
            # 按波段索引排序
            bands.sort(key=lambda x: x['band_index'])
            valid_captures.append({
                'capture_id': capture_id,
                'image_paths': [b['path'] for b in bands[:5]]
            })

    return valid_captures


def _process_batch_job(job_id):
    """后台处理批量任务"""
    with _job_lock:
        job = _running_jobs.get(job_id)
        if not job:
            return

        job['status'] = 'running'
        job['started_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')

    try:
        warp_matrices = AlignmentService.load_warp_matrices(job['warp_matrices_path'])
        output_directory = job['output_directory']
        options = job['options']

        os.makedirs(output_directory, exist_ok=True)

        for capture_info in job['captures']:
            # 检查是否取消
            with _job_lock:
                if job['status'] == 'cancelled':
                    return

            capture_id = capture_info['capture_id']
            image_paths = capture_info['image_paths']

            with _job_lock:
                job['current_capture'] = capture_id

            try:
                # 加载capture
                capture = CaptureService.load_capture(image_paths)

                # 计算裁剪尺寸
                reference_band = options.get('reference_band', 1)
                cropped_dimensions = AlignmentService._calculate_crop_dimensions(
                    capture, warp_matrices, reference_band
                )

                # 应用配准
                img_type = options.get('img_type', 'radiance')
                irradiance_list = options.get('irradiance_list')

                aligned_stack = AlignmentService.apply_alignment(
                    capture,
                    warp_matrices,
                    cropped_dimensions=cropped_dimensions,
                    reference_band=reference_band,
                    img_type=img_type,
                    irradiance_list=irradiance_list
                )

                # 按波长排序
                if options.get('sort_by_wavelength', True):
                    wavelengths = [img.center_wavelength for img in capture.images]
                    sorted_indices = sorted(range(len(wavelengths)), key=lambda i: wavelengths[i])
                    aligned_stack = aligned_stack[:, :, sorted_indices]

                # 保存结果
                output_path = os.path.join(output_directory, f'{capture_id}.tif')
                CaptureService.save_as_geotiff(
                    [aligned_stack[:, :, i] for i in range(aligned_stack.shape[2])],
                    output_path
                )

                # 生成RGB预览
                if options.get('generate_rgb_preview', False):
                    rgb_path = os.path.join(output_directory, f'{capture_id}_rgb.jpg')
                    AlignmentService.generate_rgb_preview(aligned_stack, rgb_path)

                # 生成NDVI
                if options.get('generate_ndvi', False):
                    ndvi_path = os.path.join(output_directory, f'{capture_id}_ndvi.jpg')
                    ndvi = AlignmentService.calculate_ndvi(aligned_stack)
                    AlignmentService.save_ndvi(ndvi, ndvi_path)

            except Exception as e:
                logger.warning(f'Failed to process capture {capture_id}: {e}')

            with _job_lock:
                job['processed_captures'] += 1

        with _job_lock:
            job['status'] = 'completed'
            job['completed_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
            job['current_capture'] = None

    except Exception as e:
        logger.exception(f'Error processing batch job {job_id}')
        with _job_lock:
            job['status'] = 'failed'
            job['error_message'] = str(e)


@alignment_bp.route('/get-camera-info', methods=['POST'])
def get_camera_info():
    """
    获取图像的相机信息

    Request Body:
        image_paths: ["/path/to/IMG_0001_1.tif", ...]

    Returns:
        {
            success: bool,
            camera_model: str,
            camera_serial: str,
            recommended_method: str,
            bands: [...]
        }
    """
    try:
        data = request.get_json()

        if 'image_paths' not in data:
            return jsonify({'success': False, 'error': 'Missing image_paths'}), 400

        # 加载capture获取信息
        capture = CaptureService.load_capture(data['image_paths'])
        capture_info = CaptureService.get_capture_info(capture)

        camera_model = capture_info.get('camera_model', 'Unknown')

        return jsonify({
            'success': True,
            'camera_model': camera_model,
            'camera_serial': capture_info.get('camera_serial'),
            'recommended_method': AlignmentService.get_recommended_method(camera_model),
            'bands': capture_info.get('bands', []),
            'location': capture_info.get('location'),
            'utc_time': capture_info.get('utc_time')
        })

    except Exception as e:
        logger.exception('Error in get_camera_info')
        return jsonify({'success': False, 'error': str(e)}), 500


@alignment_bp.route('/check-tif-bands', methods=['POST'])
def check_tif_bands():
    """
    检查TIF文件的波段数

    Request Body:
        file_path: "/path/to/image.tif"

    Returns:
        {
            success: bool,
            band_count: int,
            is_multiband: bool,
            width: int,
            height: int
        }
    """
    try:
        from osgeo import gdal
        
        data = request.get_json()

        if 'file_path' not in data:
            return jsonify({'success': False, 'error': 'Missing file_path'}), 400

        file_path = data['file_path']

        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404

        # 打开TIF文件
        dataset = gdal.Open(file_path, gdal.GA_ReadOnly)
        if dataset is None:
            return jsonify({'success': False, 'error': 'Failed to open TIF file'}), 400

        band_count = dataset.RasterCount
        width = dataset.RasterXSize
        height = dataset.RasterYSize

        dataset = None  # 关闭文件

        return jsonify({
            'success': True,
            'band_count': band_count,
            'is_multiband': band_count > 1,
            'width': width,
            'height': height
        })

    except Exception as e:
        logger.exception('Error in check_tif_bands')
        return jsonify({'success': False, 'error': str(e)}), 500
