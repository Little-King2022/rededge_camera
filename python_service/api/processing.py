"""
批处理API
提供批量反射率校正等接口
"""
import os
import uuid
import time
import logging
import threading
from flask import Blueprint, request, jsonify

from services.capture_service import CaptureService
from services.alignment_service import AlignmentService

logger = logging.getLogger(__name__)

processing_bp = Blueprint('processing', __name__)

# 存储正在运行的任务
_running_jobs = {}
_job_lock = threading.Lock()


@processing_bp.route('/start', methods=['POST'])
def start_processing():
    """
    启动批量处理任务

    Request Body:
        input_directory: str
        output_directory: str
        panel_image_paths: [str, ...] (可选，定标板图像路径)
        panel_reflectances: [float, ...] (可选，面板反射率)
        warp_matrices_path: str (可选，配准矩阵路径)
        options: {
            use_dls: bool,
            generate_thumbnails: bool,
            output_format: "tiff" | "geotiff",
            apply_alignment: bool,
            generate_rgb_preview: bool,
            generate_ndvi: bool
        }

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
        if 'input_directory' not in data:
            return jsonify({'success': False, 'error': 'Missing input_directory'}), 400
        if 'output_directory' not in data:
            return jsonify({'success': False, 'error': 'Missing output_directory'}), 400

        input_directory = data['input_directory']
        output_directory = data['output_directory']
        options = data.get('options', {})

        # 验证目录存在
        if not os.path.isdir(input_directory):
            return jsonify({'success': False, 'error': 'Input directory not found'}), 400

        # 计算照度（如果提供了定标板图像）
        irradiance_list = None
        if 'panel_image_paths' in data:
            panel_capture = CaptureService.load_capture(data['panel_image_paths'])
            reflectances = data.get('panel_reflectances')
            irradiance_list = CaptureService.calculate_panel_irradiance(panel_capture, reflectances)

        # 加载配准矩阵（如果提供）
        warp_matrices = None
        if 'warp_matrices_path' in data and options.get('apply_alignment', False):
            warp_matrices = AlignmentService.load_warp_matrices(data['warp_matrices_path'])

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
            'irradiance_list': irradiance_list,
            'warp_matrices': warp_matrices,
            'options': options,
            'captures': captures,
            'total_captures': total_captures,
            'processed_captures': 0,
            'current_capture': None,
            'error_message': None,
            'errors': [],
            'started_at': None,
            'completed_at': None
        }

        with _job_lock:
            _running_jobs[job_id] = job_info

        # 启动后台线程处理
        thread = threading.Thread(target=_process_job, args=(job_id,))
        thread.daemon = True
        thread.start()

        return jsonify({
            'success': True,
            'job_id': job_id,
            'status': 'pending',
            'total_captures': total_captures
        })

    except Exception as e:
        logger.exception('Error in start_processing')
        return jsonify({'success': False, 'error': str(e)}), 500


@processing_bp.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
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
        'errors': job.get('errors', [])[-10:],  # 只返回最近10个错误
        'started_at': job['started_at'],
        'completed_at': job['completed_at'],
        'progress': job['processed_captures'] / job['total_captures'] * 100 if job['total_captures'] > 0 else 0
    })


@processing_bp.route('/cancel/<job_id>', methods=['POST'])
def cancel_job(job_id):
    """取消任务"""
    with _job_lock:
        job = _running_jobs.get(job_id)
        if job:
            job['status'] = 'cancelled'

    return jsonify({'success': True})


@processing_bp.route('/list-jobs', methods=['GET'])
def list_jobs():
    """列出所有任务"""
    with _job_lock:
        jobs = []
        for job_id, job in _running_jobs.items():
            jobs.append({
                'job_id': job['id'],
                'status': job['status'],
                'total_captures': job['total_captures'],
                'processed_captures': job['processed_captures'],
                'started_at': job['started_at'],
                'completed_at': job['completed_at']
            })

    return jsonify({
        'success': True,
        'jobs': jobs
    })


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


def _process_job(job_id):
    """后台处理任务"""
    with _job_lock:
        job = _running_jobs.get(job_id)
        if not job:
            return

        job['status'] = 'running'
        job['started_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')

    try:
        output_directory = job['output_directory']
        irradiance_list = job['irradiance_list']
        warp_matrices = job['warp_matrices']
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
                logger.info(f'Loaded capture {capture_id} with {len(capture.images)} images')

                # 转换为反射率
                if irradiance_list is not None:
                    reflectance_images = CaptureService.convert_to_reflectance(capture, irradiance_list)
                    logger.info(f'Converted to reflectance: {len(reflectance_images)} images')
                else:
                    # 如果没有照度，输出辐射亮度
                    reflectance_images = [img.radiance() for img in capture.images]
                    logger.info(f'Using radiance: {len(reflectance_images)} images')

                # 应用配准
                if warp_matrices is not None and options.get('apply_alignment', False):
                    reference_band = options.get('reference_band', 1)
                    cropped_dimensions = AlignmentService._calculate_crop_dimensions(
                        capture, warp_matrices, reference_band
                    )

                    aligned_stack = AlignmentService.apply_alignment(
                        capture,
                        warp_matrices,
                        cropped_dimensions=cropped_dimensions,
                        reference_band=reference_band,
                        img_type='reflectance' if irradiance_list else 'radiance',
                        irradiance_list=irradiance_list
                    )
                    output_images = [aligned_stack[:, :, i] for i in range(aligned_stack.shape[2])]
                    logger.info(f'Applied alignment: {len(output_images)} output images')
                else:
                    output_images = reflectance_images
                    logger.info(f'No alignment: {len(output_images)} output images')

                # 保存结果
                output_path = os.path.join(output_directory, f'{capture_id}.tif')
                CaptureService.save_as_geotiff(output_images, output_path, capture)

                # 生成RGB预览
                if options.get('generate_rgb_preview', False) and len(output_images) >= 3:
                    import numpy as np
                    import cv2
                    stack = np.stack(output_images, axis=-1)
                    rgb_path = os.path.join(output_directory, f'{capture_id}_rgb.jpg')
                    AlignmentService.generate_rgb_preview(stack, rgb_path)

                # 生成NDVI
                if options.get('generate_ndvi', False) and len(output_images) >= 5:
                    import numpy as np
                    stack = np.stack(output_images, axis=-1)
                    ndvi_path = os.path.join(output_directory, f'{capture_id}_ndvi.jpg')
                    ndvi = AlignmentService.calculate_ndvi(stack)
                    AlignmentService.save_ndvi(ndvi, ndvi_path)

                # 生成缩略图
                if options.get('generate_thumbnails', False):
                    _generate_thumbnail(output_images[0], output_directory, capture_id)

            except Exception as e:
                logger.warning(f'Failed to process capture {capture_id}: {e}')
                with _job_lock:
                    job['errors'].append({
                        'capture_id': capture_id,
                        'error': str(e)
                    })

            with _job_lock:
                job['processed_captures'] += 1

        with _job_lock:
            job['status'] = 'completed'
            job['completed_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
            job['current_capture'] = None

    except Exception as e:
        logger.exception(f'Error processing job {job_id}')
        with _job_lock:
            job['status'] = 'failed'
            job['error_message'] = str(e)


def _generate_thumbnail(image, output_directory, capture_id, max_size=256):
    """生成缩略图"""
    import cv2
    import numpy as np

    # 归一化
    img = np.clip(image, 0, 1)
    img = (img * 255).astype(np.uint8)

    # 缩放
    h, w = img.shape[:2]
    scale = max_size / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    thumbnail = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # 保存
    thumb_path = os.path.join(output_directory, 'thumbnails', f'{capture_id}_thumb.jpg')
    os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
    cv2.imwrite(thumb_path, thumbnail)

    return thumb_path
