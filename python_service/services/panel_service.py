"""
定标板检测服务
提供QR码识别、序列号解析、反射率计算等功能
"""
import os
import re
import math
import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)

# 尝试导入pyzbar
try:
    from pyzbar import pyzbar
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False
    logger.warning('pyzbar not available, QR code detection disabled')


class PanelService:
    """定标板服务类"""

    # 波段信息（RedEdge-MX）
    REDEDGE_BANDS = [
        {'index': 0, 'name': 'Blue', 'wavelength': 475},
        {'index': 1, 'name': 'Green', 'wavelength': 560},
        {'index': 2, 'name': 'Red', 'wavelength': 668},
        {'index': 3, 'name': 'RedEdge', 'wavelength': 717},
        {'index': 4, 'name': 'NIR', 'wavelength': 842},
    ]

    @staticmethod
    def detect_qr_from_image(image_data):
        """
        从图像数据中检测QR码

        Args:
            image_data: numpy数组（BGR格式）或base64字符串

        Returns:
            dict: 包含serial和其他信息
        """
        if not PYZBAR_AVAILABLE:
            raise RuntimeError('pyzbar library not available')

        # 如果是base64，先解码
        if isinstance(image_data, str):
            import base64
            img_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        elif len(image_data.shape) == 3:
            image = cv2.cvtColor(image_data, cv2.COLOR_BGR2GRAY)
        else:
            image = image_data

        # 转换为8位图像
        if image.dtype != np.uint8:
            image = ((image - image.min()) / (image.max() - image.min()) * 255).astype(np.uint8)

        # 解码QR码
        decoded = pyzbar.decode(image, symbols=[pyzbar.ZBarSymbol.QRCODE])

        for symbol in decoded:
            serial_str = symbol.data.decode('UTF-8')
            # 匹配MicaSense定标板序列号格式
            m = re.search(r'RP\d{2}-\d{7}-\D{2}', serial_str)
            if m:
                # 获取QR码边界
                qr_bounds = [[p.x, p.y] for p in symbol.polygon]

                return {
                    'success': True,
                    'serial': serial_str,
                    'qr_bounds': qr_bounds,
                    'qr_area': cv2.contourArea(np.array(qr_bounds, dtype=np.int32))
                }

        return {
            'success': False,
            'error': 'No valid calibration panel QR code found'
        }

    @staticmethod
    def parse_serial(serial):
        """
        解析定标板序列号，提取版本和反射率参数

        序列号格式: RP[VV]-[7位]-[XX][minWL][minRf][maxWL][maxRf]
        示例: RP06-1234567-SC47506800540573

        Args:
            serial: 序列号字符串

        Returns:
            dict: 解析结果
        """
        if not serial or len(serial) < 20:
            raise ValueError(f'Invalid serial format: {serial}')

        result = {
            'serial': serial,
            'panel_version': int(serial[2:4]),
        }

        # 版本4及以上从序列号提取反射率参数
        if result['panel_version'] >= 4:
            try:
                result['min_wavelength'] = float(serial[-14:-10])
                result['min_reflectance'] = float(serial[-10:-7]) / 1000.0
                result['max_wavelength'] = float(serial[-7:-3])
                result['max_reflectance'] = float(serial[-3:]) / 1000.0
            except (ValueError, IndexError) as e:
                raise ValueError(f'Failed to parse reflectance from serial: {e}')

        return result

    @staticmethod
    def calculate_reflectance(serial_info, wavelength):
        """
        根据波长计算反射率（线性插值）

        Args:
            serial_info: parse_serial的返回结果
            wavelength: 波长（nm）

        Returns:
            float: 反射率（0-1）
        """
        if serial_info['panel_version'] < 4:
            raise ValueError('Panel version < 4 does not support reflectance calculation from serial')

        min_wl = serial_info['min_wavelength']
        max_wl = serial_info['max_wavelength']
        min_rf = serial_info['min_reflectance']
        max_rf = serial_info['max_reflectance']

        # 线性插值
        if max_wl == min_wl:
            return (min_rf + max_rf) / 2

        reflectance = min_rf + (max_rf - min_rf) * (wavelength - min_wl) / (max_wl - min_wl)
        return reflectance

    @classmethod
    def calculate_band_reflectances(cls, serial_info, bands=None):
        """
        计算各波段的反射率

        Args:
            serial_info: parse_serial的返回结果
            bands: 波段列表，默认使用REDEDGE_BANDS

        Returns:
            dict: 波段索引到反射率的映射
        """
        if bands is None:
            bands = cls.REDEDGE_BANDS

        reflectances = {}
        for band in bands:
            reflectances[band['index']] = cls.calculate_reflectance(
                serial_info, band['wavelength']
            )

        return reflectances

    @staticmethod
    def detect_panel_region(image, qr_bounds, panel_version):
        """
        根据QR码位置推断面板区域

        Args:
            image: 灰度图像
            qr_bounds: QR码边界点
            panel_version: 面板版本

        Returns:
            dict: 面板区域信息
        """
        qr_bounds = np.array(qr_bounds, dtype=np.float32)

        # 根据版本确定尺寸和偏移
        if panel_version < 3:
            s = 76.2  # 面板尺寸
            p = 42    # QR码尺寸
            T = np.array([-143.2, 0])
        elif panel_version < 6:
            s = 50
            p = 45
            T = np.array([-145.8, 0])
        else:  # version >= 6
            s = 50
            p = 41
            T = np.array([0, -130.84])

        # 面板参考点（相对于QR码）
        half = s / 2
        panel_ref = np.array([
            [-half, -half],
            [half, -half],
            [half, half],
            [-half, half]
        ], dtype=np.float32)

        # QR码参考点
        half_qr = p / 2
        qr_ref = np.array([
            [-half_qr, -half_qr],
            [half_qr, -half_qr],
            [half_qr, half_qr],
            [-half_qr, half_qr]
        ], dtype=np.float32)

        # 尝试4种旋转，选择最佳的
        best_cost = float('inf')
        best_bounds = None

        for rotation in range(4):
            # 旋转QR参考点
            rot_angle = rotation * 90
            rot_matrix = cv2.getRotationMatrix2D((0, 0), rot_angle, 1)[:, :2]
            rotated_qr = np.dot(qr_ref, rot_matrix.T)

            # 计算变换矩阵
            try:
                warp_matrix = cv2.getPerspectiveTransform(rotated_qr, qr_bounds)
            except:
                continue

            # 变换面板点
            panel_pts = panel_ref + T
            panel_pts_h = np.hstack([panel_pts, np.ones((4, 1))]).T
            transformed = np.dot(warp_matrix, panel_pts_h).T
            transformed = transformed[:, :2] / transformed[:, 2:3]

            # 计算成本（面板区域的标准差/均值，越小越好）
            hull = cv2.convexHull(transformed.astype(np.int32))
            mask = np.zeros(image.shape[:2], dtype=np.uint8)
            cv2.fillConvexPoly(mask, hull, 255)

            mean, std = cv2.meanStdDev(image, mask=mask)
            if mean[0][0] > 0:
                cost = std[0][0] / mean[0][0]
                if cost < best_cost:
                    best_cost = cost
                    best_bounds = transformed.tolist()

        if best_bounds is None:
            raise ValueError('Failed to detect panel region')

        return {
            'panel_bounds': best_bounds,
            'uniformity_score': 1.0 - min(best_cost, 1.0)  # 越高越均匀
        }

    @staticmethod
    def calculate_irradiance(radiance_mean, reflectance):
        """
        从面板的平均辐射亮度和反射率计算照度

        公式: irradiance = π × radiance / reflectance

        Args:
            radiance_mean: 面板区域平均辐射亮度 (W/m²/sr/nm)
            reflectance: 面板反射率 (0-1)

        Returns:
            float: 照度 (W/m²/nm)
        """
        return math.pi * radiance_mean / reflectance

    @staticmethod
    def calculate_reflectance_image(radiance_image, irradiance):
        """
        将辐射亮度图像转换为反射率图像

        公式: reflectance = π × radiance / irradiance

        Args:
            radiance_image: 辐射亮度图像
            irradiance: 照度

        Returns:
            numpy array: 反射率图像 (0-1)
        """
        return math.pi * radiance_image / irradiance
