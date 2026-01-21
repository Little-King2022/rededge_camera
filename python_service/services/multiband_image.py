"""
MultiBandImage - 单个多波段TIF文件的包装类
用于处理辐射定标后输出的5波段堆栈TIF文件
"""
import numpy as np
from osgeo import gdal


class MultiBandImage:
    """
    包装单个多波段TIF文件，提供与MicaSense Capture类相似的接口
    """
    
    def __init__(self, file_path, dataset=None):
        """
        初始化MultiBandImage
        
        Args:
            file_path: TIF文件路径
            dataset: 可选的已打开的GDAL dataset
        """
        self.file_path = file_path
        
        # 打开dataset
        if dataset is None:
            self.dataset = gdal.Open(file_path, gdal.GA_ReadOnly)
        else:
            self.dataset = dataset
        
        if self.dataset is None:
            raise ValueError(f'Failed to open file: {file_path}')
        
        self.band_count = self.dataset.RasterCount
        self.width = self.dataset.RasterXSize
        self.height = self.dataset.RasterYSize
        
        # 读取元数据
        self.metadata = self.dataset.GetMetadata()
        
        # 创建伪Image对象列表以兼容Capture接口
        self.images = []
        for band_idx in range(1, min(self.band_count, 5) + 1):
            band = self.dataset.GetRasterBand(band_idx)
            pseudo_image = PseudoImage(self, band_idx, band)
            self.images.append(pseudo_image)
        
        # 从元数据中提取相机信息
        self.camera_model = self.metadata.get('camera_model', 'Unknown')
        self.camera_serial = self.metadata.get('camera_serial', 'Unknown')
        self.uuid = self.metadata.get('capture_id', 'Unknown')
    
    def location(self):
        """返回GPS位置 (lat, lon, alt)"""
        lat = float(self.metadata.get('latitude', 0))
        lon = float(self.metadata.get('longitude', 0))
        alt = float(self.metadata.get('altitude', 0))
        return (lat, lon, alt)
    
    def utc_time(self):
        """返回UTC时间"""
        import datetime
        utc_str = self.metadata.get('utc_time', '')
        if utc_str:
            try:
                return datetime.datetime.fromisoformat(utc_str)
            except:
                pass
        return None
    
    def __del__(self):
        """清理资源"""
        if hasattr(self, 'dataset') and self.dataset is not None:
            self.dataset = None


class PseudoImage:
    """
    伪Image对象，用于兼容MicaSense Capture接口
    """
    
    def __init__(self, parent, band_index, gdal_band):
        """
        初始化PseudoImage
        
        Args:
            parent: MultiBandImage父对象
            band_index: 波段索引 (1-based)
            gdal_band: GDAL波段对象
        """
        self.parent = parent
        self.band_index = band_index
        self.gdal_band = gdal_band
        
        # 从波段描述或元数据中获取波段信息
        band_desc = gdal_band.GetDescription()
        band_metadata = gdal_band.GetMetadata()
        
        # 波段名称
        self.band_name = band_metadata.get('band_name', f'Band_{band_index}')
        if not self.band_name and band_desc:
            self.band_name = band_desc
        
        # 中心波长
        wavelength_str = band_metadata.get('wavelength', '0')
        try:
            self.center_wavelength = float(wavelength_str)
        except:
            # 默认波长（假设是RedEdge相机的标准波长）
            default_wavelengths = [475, 560, 668, 840, 717]  # Blue, Green, Red, NIR, RedEdge
            self.center_wavelength = default_wavelengths[band_index - 1] if band_index <= 5 else 0
        
        # 图像尺寸
        self.width = parent.width
        self.height = parent.height
    
    def raw(self):
        """返回原始图像数据"""
        return self.gdal_band.ReadAsArray()
    
    def radiance(self):
        """返回辐射率图像（对于已定标的图像，与raw相同）"""
        return self.raw()
    
    def reflectance(self, irradiance=None):
        """返回反射率图像（对于已定标的图像，与raw相同）"""
        return self.raw()
    
    def undistorted(self, image_data):
        """返回未畸变校正的图像（对于已定标的图像，直接返回）"""
        return image_data
