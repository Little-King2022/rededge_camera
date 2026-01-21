"""
辐射定标API
提供QR码识别、定标板检测、照度计算等接口
"""
import os
import logging
from flask import Blueprint, request, jsonify

from services.panel_service import PanelService
from services.capture_service import CaptureService

logger = logging.getLogger(__name__)

calibration_bp = Blueprint('calibration', __name__)


@calibration_bp.route('/detect-qr', methods=['POST'])
def detect_qr():
    """
    从JPEG图像中检测QR码

    Request Body:
        image: base64编码的JPEG图像

    Returns:
        {
            success: bool,
            serial: str,
            panel_version: int,
            min_wavelength: float,
            min_reflectance: float,
            max_wavelength: float,
            max_reflectance: float,
            band_reflectances: {0: float, 1: float, ...}
        }
    """
    try:
        data = request.get_json()

        if 'image' not in data:
            return jsonify({'success': False, 'error': 'Missing image data'}), 400

        # 检测QR码
        result = PanelService.detect_qr_from_image(data['image'])

        if not result['success']:
            return jsonify(result), 200

        # 解析序列号
        serial_info = PanelService.parse_serial(result['serial'])

        # 计算各波段反射率
        if serial_info['panel_version'] >= 4:
            band_reflectances = PanelService.calculate_band_reflectances(serial_info)
            serial_info['band_reflectances'] = band_reflectances

        return jsonify({
            'success': True,
            **serial_info,
            'qr_bounds': result.get('qr_bounds'),
            'qr_area': result.get('qr_area')
        })

    except Exception as e:
        logger.exception('Error in detect_qr')
        return jsonify({'success': False, 'error': str(e)}), 500


@calibration_bp.route('/detect-from-files', methods=['POST'])
def detect_from_files():
    """
    从TIF文件中检测定标板

    Request Body:
        panel_image_paths: ["/path/to/IMG_0001_1.tif", ...]

    Returns:
        {
            success: bool,
            serial: str,
            panel_version: int,
            reflectances: [float, ...],
            irradiance: [float, ...],
            band_info: [{name, wavelength, irradiance}, ...]
        }
    """
    try:
        data = request.get_json()

        if 'panel_image_paths' not in data:
            return jsonify({'success': False, 'error': 'Missing panel_image_paths'}), 400

        image_paths = data['panel_image_paths']

        # 加载图像
        capture = CaptureService.load_capture(image_paths)

        # 获取capture信息
        capture_info = CaptureService.get_capture_info(capture)

        # 检测面板
        panel_result = CaptureService.detect_panel(capture)

        if not panel_result['success']:
            return jsonify(panel_result), 200

        # 获取反射率
        reflectances = panel_result.get('panel_albedo')

        # 计算照度
        irradiances = None
        if reflectances is not None:
            irradiances = CaptureService.calculate_panel_irradiance(capture, reflectances)

        # 组装波段信息
        band_info = []
        for i, band in enumerate(capture_info.get('bands', [])):
            info = {
                'index': i,
                'name': band.get('name'),
                'wavelength': band.get('wavelength'),
            }
            if reflectances and i < len(reflectances):
                info['reflectance'] = reflectances[i]
            if irradiances and i < len(irradiances):
                info['irradiance'] = irradiances[i]
            band_info.append(info)

        return jsonify({
            'success': True,
            'serial': panel_result.get('serial'),
            'panel_version': panel_result.get('panel_version'),
            'camera_model': capture_info.get('camera_model'),
            'camera_serial': capture_info.get('camera_serial'),
            'reflectances': reflectances,
            'irradiance': irradiances,
            'band_info': band_info
        })

    except Exception as e:
        logger.exception('Error in detect_from_files')
        return jsonify({'success': False, 'error': str(e)}), 500


@calibration_bp.route('/calculate-irradiance', methods=['POST'])
def calculate_irradiance():
    """
    计算照度

    Request Body:
        panel_image_paths: ["/path/to/IMG_0001_1.tif", ...]
        reflectances: [0.68, 0.69, ...]  (可选，不提供则自动检测)

    Returns:
        {
            success: bool,
            irradiance: [float, ...]
        }
    """
    try:
        data = request.get_json()

        if 'panel_image_paths' not in data:
            return jsonify({'success': False, 'error': 'Missing panel_image_paths'}), 400

        image_paths = data['panel_image_paths']
        reflectances = data.get('reflectances')

        # 加载图像
        capture = CaptureService.load_capture(image_paths)

        # 计算照度
        irradiances = CaptureService.calculate_panel_irradiance(capture, reflectances)

        return jsonify({
            'success': True,
            'irradiance': irradiances
        })

    except Exception as e:
        logger.exception('Error in calculate_irradiance')
        return jsonify({'success': False, 'error': str(e)}), 500


@calibration_bp.route('/parse-serial', methods=['POST'])
def parse_serial():
    """
    解析定标板序列号

    Request Body:
        serial: "RP06-1234567-SC47506800540573"

    Returns:
        {
            success: bool,
            panel_version: int,
            min_wavelength: float,
            min_reflectance: float,
            max_wavelength: float,
            max_reflectance: float,
            band_reflectances: {0: float, ...}
        }
    """
    try:
        data = request.get_json()

        if 'serial' not in data:
            return jsonify({'success': False, 'error': 'Missing serial'}), 400

        # 解析序列号
        serial_info = PanelService.parse_serial(data['serial'])

        # 计算各波段反射率
        if serial_info['panel_version'] >= 4:
            band_reflectances = PanelService.calculate_band_reflectances(serial_info)
            serial_info['band_reflectances'] = band_reflectances

        return jsonify({
            'success': True,
            **serial_info
        })

    except Exception as e:
        logger.exception('Error in parse_serial')
        return jsonify({'success': False, 'error': str(e)}), 500
