"""
图像处理服务
提供多波段图像加载、辐射定标、反射率转换等功能
"""
import os
import logging
import numpy as np

logger = logging.getLogger(__name__)

# 尝试导入micasense库
try:
    from micasense.capture import Capture
    from micasense.image import Image
    from micasense.panel import Panel
    MICASENSE_AVAILABLE = True
except ImportError as e:
    MICASENSE_AVAILABLE = False
    logger.warning(f'micasense library not available: {e}')


class CaptureService:
    """图像处理服务类"""

    @staticmethod
    def check_micasense():
        """检查micasense库是否可用"""
        if not MICASENSE_AVAILABLE:
            raise RuntimeError('micasense library not available')

    @staticmethod
    def load_capture(image_paths):
        """
        加载多波段图像组

        Args:
            image_paths: 5个TIF文件路径列表，或单个5波段堆栈TIF文件路径

        Returns:
            Capture对象或MultiBandImage对象（用于单个多波段文件）
        """
        CaptureService.check_micasense()

        # 验证文件存在
        for path in image_paths:
            if not os.path.exists(path):
                raise FileNotFoundError(f'Image file not found: {path}')

        # 如果是单个文件，检查是否是多波段TIF
        if len(image_paths) == 1:
            from osgeo import gdal
            dataset = gdal.Open(image_paths[0], gdal.GA_ReadOnly)
            if dataset is not None:
                band_count = dataset.RasterCount
                
                if band_count >= 5:
                    # 单个多波段TIF文件
                    # 返回一个包装对象而不是Capture对象
                    logger.info(f'Loading single multi-band TIF file with {band_count} bands')
                    
                    from services.multiband_image import MultiBandImage
                    multiband = MultiBandImage(image_paths[0], dataset)
                    dataset = None
                    return multiband
                
                dataset = None

        # 创建Capture对象（多个单波段文件）
        capture = Capture.from_filelist(image_paths)
        return capture

    @staticmethod
    def get_capture_info(capture):
        """
        获取Capture的元数据信息

        Args:
            capture: Capture对象

        Returns:
            dict: 元数据信息
        """
        images = capture.images

        # 基础信息
        info = {
            'num_bands': len(images),
            'camera_model': capture.camera_model if hasattr(capture, 'camera_model') else None,
            'camera_serial': capture.camera_serial if hasattr(capture, 'camera_serial') else None,
            'capture_id': capture.uuid if hasattr(capture, 'uuid') else None,
        }

        # 波段信息
        bands = []
        for i, img in enumerate(images):
            band_info = {
                'index': i,
                'name': img.band_name if hasattr(img, 'band_name') else f'Band_{i+1}',
                'wavelength': img.center_wavelength if hasattr(img, 'center_wavelength') else None,
            }

            # 图像尺寸
            if hasattr(img, 'raw'):
                raw = img.raw()
                band_info['width'] = raw.shape[1]
                band_info['height'] = raw.shape[0]

            bands.append(band_info)

        info['bands'] = bands

        # GPS信息
        if hasattr(capture, 'location') and capture.location():
            lat, lon, alt = capture.location()
            info['location'] = {
                'latitude': lat,
                'longitude': lon,
                'altitude': alt
            }

        # 时间信息
        if hasattr(capture, 'utc_time') and capture.utc_time():
            info['utc_time'] = capture.utc_time().isoformat()

        return info

    @staticmethod
    def detect_panel(capture):
        """
        在Capture中检测定标板

        Args:
            capture: Capture对象

        Returns:
            dict: 检测结果
        """
        CaptureService.check_micasense()

        # 检测面板
        capture.detect_panels()

        # 检查是否检测到
        if not capture.panels_in_all_expected_images():
            return {
                'success': False,
                'error': 'Panel not detected in all bands'
            }

        # 获取面板信息（从第一个panel获取）
        panel = capture.panels[0]
        result = {
            'success': True,
            'serial': panel.serial if hasattr(panel, 'serial') else None,
            'panel_version': panel.panel_version if hasattr(panel, 'panel_version') else None,
        }

        # 获取面板反射率（从序列号解析或预设）
        try:
            albedos = capture.panel_albedo()
            result['panel_albedo'] = list(albedos) if albedos is not None else None
        except Exception as e:
            logger.warning(f'Failed to get panel albedo: {e}')
            result['panel_albedo'] = None

        return result

    @staticmethod
    def calculate_panel_irradiance(capture, reflectances=None):
        """
        计算定标板各波段的照度

        Args:
            capture: Capture对象
            reflectances: 面板反射率列表（可选，如果不提供则从面板自动获取）

        Returns:
            list: 各波段照度
        """
        CaptureService.check_micasense()

        # 如果没有提供反射率，从面板获取
        if reflectances is None:
            capture.detect_panels()
            reflectances = capture.panel_albedo()
            if reflectances is None:
                raise ValueError('Cannot determine panel reflectance')

        # 计算照度
        irradiances = capture.panel_irradiance(reflectances)
        return list(irradiances)

    @staticmethod
    def convert_to_reflectance(capture, irradiances):
        """
        将Capture转换为反射率图像

        Args:
            capture: Capture对象
            irradiances: 各波段照度列表

        Returns:
            list: 各波段反射率图像
        """
        CaptureService.check_micasense()

        reflectance_images = []
        for i, img in enumerate(capture.images):
            refl = img.reflectance(irradiances[i])
            reflectance_images.append(refl)

        return reflectance_images

    @staticmethod
    def get_radiance_mean_in_region(image, region_bounds):
        """
        计算指定区域的平均辐射亮度

        Args:
            image: Image对象
            region_bounds: 区域边界点列表

        Returns:
            float: 平均辐射亮度
        """
        import cv2

        radiance = image.radiance()

        # 创建掩膜
        pts = np.array(region_bounds, dtype=np.int32)
        mask = np.zeros(radiance.shape[:2], dtype=np.uint8)
        cv2.fillConvexPoly(mask, pts, 255)

        # 计算均值
        mean = cv2.mean(radiance, mask=mask)[0]
        return mean

    @staticmethod
    def save_as_geotiff(images, output_path, capture=None, wavelengths=None):
        """
        将多波段图像保存为GeoTIFF

        Args:
            images: 图像列表，每个元素是一个2D数组 (height, width)
            output_path: 输出路径
            capture: Capture对象（可选，用于获取地理信息）
            wavelengths: 波长列表（可选）
        """
        from osgeo import gdal, osr
        from osgeo.gdal import GetDriverByName, GDT_Float32
        
        gdal.UseExceptions()

        logger.info(f'Saving GeoTIFF with {len(images)} bands using GDAL')
        
        # 检查每个图像的形状
        for i, img in enumerate(images):
            logger.info(f'Band {i}: shape={img.shape}, dtype={img.dtype}')

        # 获取图像尺寸
        if len(images) == 0:
            raise ValueError("No images to save")
        
        rows, cols = images[0].shape
        bands = len(images)
        
        logger.info(f'Creating GeoTIFF: {cols}x{rows} pixels, {bands} bands')

        # 创建 GeoTIFF
        driver = GetDriverByName('GTiff')
        outRaster = driver.Create(
            output_path,
            cols,
            rows,
            bands,
            GDT_Float32,
            options=['INTERLEAVE=BAND', 'COMPRESS=DEFLATE', 'PHOTOMETRIC=MINISBLACK']
        )

        try:
            if outRaster is None:
                raise IOError("Could not create GeoTIFF file")

            # 设置地理参考信息
            if capture is not None:
                try:
                    # 获取GPS位置
                    location = capture.location()
                    if location is not None:
                        lat, lon, alt = location
                        logger.info(f'Setting georeference: lat={lat}, lon={lon}, alt={alt}')
                        
                        # 创建WGS84坐标系统
                        srs = osr.SpatialReference()
                        srs.ImportFromEPSG(4326)  # WGS84
                        outRaster.SetProjection(srs.ExportToWkt())
                        
                        # 计算地理变换参数
                        # 假设图像中心在GPS位置
                        # 需要估算像素分辨率（米/像素）
                        # 对于RedEdge相机，典型的GSD（地面采样距离）约为8cm @ 120m高度
                        if hasattr(capture.images[0], 'focal_length') and capture.images[0].focal_length:
                            focal_length = capture.images[0].focal_length  # mm
                            sensor_width = 4.8  # mm (RedEdge sensor width)
                            image_width = cols
                            
                            # 计算地面分辨率 (GSD)
                            # GSD = (sensor_width * altitude) / (focal_length * image_width)
                            gsd = (sensor_width * alt) / (focal_length * image_width)
                            logger.info(f'Calculated GSD: {gsd} meters/pixel')
                        else:
                            # 默认分辨率（如果无法计算）
                            gsd = 0.08  # 8cm/pixel
                            logger.warning(f'Using default GSD: {gsd} meters/pixel')
                        
                        # 将GSD转换为度（近似）
                        # 1度纬度 ≈ 111,320米
                        # 1度经度 ≈ 111,320 * cos(latitude)米
                        import math
                        meters_per_degree_lat = 111320.0
                        meters_per_degree_lon = 111320.0 * math.cos(math.radians(lat))
                        
                        pixel_size_lat = gsd / meters_per_degree_lat
                        pixel_size_lon = gsd / meters_per_degree_lon
                        
                        # 计算左上角坐标（图像中心在GPS位置）
                        center_lon = lon
                        center_lat = lat
                        top_left_lon = center_lon - (cols / 2.0) * pixel_size_lon
                        top_left_lat = center_lat + (rows / 2.0) * pixel_size_lat
                        
                        # 设置地理变换
                        # [左上角X, 像素宽度, 旋转, 左上角Y, 旋转, 像素高度(负值)]
                        geotransform = [
                            top_left_lon,
                            pixel_size_lon,
                            0,
                            top_left_lat,
                            0,
                            -pixel_size_lat  # 负值因为Y轴向下
                        ]
                        outRaster.SetGeoTransform(geotransform)
                        logger.info(f'Set geotransform: {geotransform}')
                        
                except Exception as e:
                    logger.warning(f'Failed to set georeference: {e}')

            # 写入每个波段
            for band_idx, img in enumerate(images):
                outband = outRaster.GetRasterBand(band_idx + 1)
                outband.WriteArray(img.astype(np.float32))
                
                # 设置波段描述
                if wavelengths and band_idx < len(wavelengths):
                    outband.SetDescription(f'Band_{band_idx+1}_{wavelengths[band_idx]}nm')
                elif capture and band_idx < len(capture.images):
                    band_name = capture.images[band_idx].band_name
                    outband.SetDescription(band_name)
                else:
                    outband.SetDescription(f'Band_{band_idx+1}')
                
                outband.FlushCache()
                logger.info(f'Wrote band {band_idx + 1}')

        finally:
            outRaster = None  # 关闭文件

        logger.info(f'Saved GeoTIFF: {output_path}')
        return output_path
