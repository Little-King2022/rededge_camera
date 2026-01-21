"""
影像配准服务
提供多波段图像配准、变换矩阵计算等功能
"""
import os
import time
import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)

# 尝试导入micasense库
try:
    from micasense.capture import Capture
    from micasense import imageutils
    MICASENSE_AVAILABLE = True
except ImportError as e:
    MICASENSE_AVAILABLE = False
    logger.warning(f'micasense library not available: {e}')


class AlignmentService:
    """配准服务类"""

    # 配准方法
    METHOD_OPENCV = 'opencv'
    METHOD_SIFT = 'sift'

    # 相机模型与推荐方法的映射
    CAMERA_METHOD_RECOMMENDATION = {
        'RedEdge': METHOD_OPENCV,
        'RedEdge-M': METHOD_OPENCV,
        'RedEdge-MX': METHOD_OPENCV,
        'RedEdge-MX Dual': METHOD_OPENCV,
        'Altum': METHOD_OPENCV,
        'RedEdge-P': METHOD_SIFT,
        'Altum-PT': METHOD_SIFT,
    }

    @staticmethod
    def check_micasense():
        """检查micasense库是否可用"""
        if not MICASENSE_AVAILABLE:
            raise RuntimeError('micasense library not available')

    @staticmethod
    def get_recommended_method(camera_model):
        """
        根据相机型号获取推荐的配准方法

        Args:
            camera_model: 相机型号

        Returns:
            str: 推荐方法 ('opencv' 或 'sift')
        """
        return AlignmentService.CAMERA_METHOD_RECOMMENDATION.get(
            camera_model, AlignmentService.METHOD_OPENCV
        )

    @staticmethod
    def compute_warp_matrices(image_paths, method='opencv', reference_band=1,
                              max_iterations=2500, pyramid_levels=None):
        """
        计算多波段图像的配准变换矩阵

        Args:
            image_paths: 5个TIF文件路径列表
            method: 配准方法 ('opencv' 或 'sift')
            reference_band: 参考波段索引（0-4）
            max_iterations: 最大迭代次数（仅opencv方法）
            pyramid_levels: 金字塔层级（None表示自动）

        Returns:
            dict: 包含配准矩阵和元信息
        """
        AlignmentService.check_micasense()

        start_time = time.time()

        # 验证文件
        for path in image_paths:
            if not os.path.exists(path):
                raise FileNotFoundError(f'Image file not found: {path}')

        # 加载图像
        capture = Capture.from_filelist(image_paths)

        # 获取相机信息
        camera_model = capture.camera_model if hasattr(capture, 'camera_model') else 'Unknown'
        camera_serial = capture.camera_serial if hasattr(capture, 'camera_serial') else 'Unknown'

        # 执行配准
        if method == AlignmentService.METHOD_SIFT:
            warp_matrices, alignment_pairs = AlignmentService._align_sift(
                capture, reference_band
            )
        else:
            warp_matrices, alignment_pairs = AlignmentService._align_opencv(
                capture, reference_band, max_iterations, pyramid_levels
            )

        # 获取裁剪尺寸
        cropped_dimensions = AlignmentService._calculate_crop_dimensions(
            capture, warp_matrices, reference_band
        )

        elapsed_time = time.time() - start_time

        return {
            'success': True,
            'camera_model': camera_model,
            'camera_serial': camera_serial,
            'method': method,
            'reference_band': reference_band,
            'warp_matrices': [m.tolist() for m in warp_matrices],
            'cropped_dimensions': cropped_dimensions,
            'alignment_pairs': alignment_pairs,
            'elapsed_time': elapsed_time
        }

    @staticmethod
    def _align_opencv(capture, reference_band, max_iterations, pyramid_levels):
        """使用OpenCV ECC方法进行配准"""
        warp_mode = cv2.MOTION_HOMOGRAPHY

        # 调用imageutils的配准函数
        warp_matrices, alignment_pairs = imageutils.align_capture(
            capture,
            ref_index=reference_band,
            warp_mode=warp_mode,
            max_iterations=max_iterations
        )

        return warp_matrices, alignment_pairs

    @staticmethod
    def _align_sift(capture, reference_band):
        """使用SIFT特征点方法进行配准"""
        # 调用capture的SIFT配准方法
        aligned_capture = capture.SIFT_align_capture(
            ref=reference_band,
            min_matches=10
        )

        # 提取变换矩阵
        warp_matrices = []
        for i, img in enumerate(capture.images):
            if hasattr(img, 'warp_matrix') and img.warp_matrix is not None:
                warp_matrices.append(img.warp_matrix)
            else:
                # 参考波段使用单位矩阵
                warp_matrices.append(np.eye(3, dtype=np.float32))

        alignment_pairs = []  # SIFT方法不返回alignment_pairs

        return warp_matrices, alignment_pairs

    @staticmethod
    def _calculate_crop_dimensions(capture, warp_matrices, reference_band):
        """
        计算配准后的有效裁剪区域

        Returns:
            list: [left, top, width, height]
        """
        ref_img = capture.images[reference_band]
        height, width = ref_img.raw().shape[:2]

        # 计算所有变换后图像的有效区域交集
        min_x, min_y = 0, 0
        max_x, max_y = width, height

        for i, warp_matrix in enumerate(warp_matrices):
            if warp_matrix is None:
                continue

            warp_matrix = np.array(warp_matrix, dtype=np.float32)

            # 四个角点
            corners = np.array([
                [0, 0],
                [width, 0],
                [width, height],
                [0, height]
            ], dtype=np.float32).reshape(-1, 1, 2)

            # 变换角点
            if warp_matrix.shape[0] == 3:
                transformed = cv2.perspectiveTransform(corners, warp_matrix)
            else:
                transformed = cv2.transform(corners, warp_matrix)

            transformed = transformed.reshape(-1, 2)

            # 更新边界
            min_x = max(min_x, transformed[:, 0].min())
            min_y = max(min_y, transformed[:, 1].min())
            max_x = min(max_x, transformed[:, 0].max())
            max_y = min(max_y, transformed[:, 1].max())

        # 确保为整数
        left = int(np.ceil(min_x))
        top = int(np.ceil(min_y))
        crop_width = int(np.floor(max_x)) - left
        crop_height = int(np.floor(max_y)) - top

        return [left, top, crop_width, crop_height]

    @staticmethod
    def apply_alignment(capture, warp_matrices, cropped_dimensions=None,
                        reference_band=1, img_type='reflectance', irradiance_list=None):
        """
        应用配准变换到图像

        Args:
            capture: Capture对象
            warp_matrices: 变换矩阵列表
            cropped_dimensions: 裁剪尺寸 [left, top, width, height]
            reference_band: 参考波段索引
            img_type: 输出类型 ('radiance', 'reflectance', 'raw')
            irradiance_list: 照度列表（仅reflectance类型需要）

        Returns:
            numpy array: 配准后的图像堆栈 [height, width, bands]
        """
        AlignmentService.check_micasense()

        ref_img = capture.images[reference_band]
        height, width = ref_img.raw().shape[:2]

        # 准备输出数组
        aligned_stack = np.zeros((height, width, len(warp_matrices)), dtype=np.float32)

        warp_mode = cv2.MOTION_HOMOGRAPHY

        for i, warp_matrix in enumerate(warp_matrices):
            # 获取源图像
            img = capture.images[i]

            if img_type == 'reflectance' and irradiance_list is not None:
                source = img.undistorted_reflectance(irradiance_list[i])
            elif img_type == 'radiance':
                source = img.undistorted_radiance()
            else:
                source = img.undistorted(img.raw()).astype(np.float32)

            # 应用变换
            warp_matrix = np.array(warp_matrix, dtype=np.float32)

            if warp_matrix.shape[0] == 3:
                aligned = cv2.warpPerspective(
                    source, warp_matrix, (width, height),
                    flags=cv2.INTER_LANCZOS4 + cv2.WARP_INVERSE_MAP
                )
            else:
                aligned = cv2.warpAffine(
                    source, warp_matrix, (width, height),
                    flags=cv2.INTER_LANCZOS4 + cv2.WARP_INVERSE_MAP
                )

            aligned_stack[:, :, i] = aligned

        # 裁剪
        if cropped_dimensions is not None:
            left, top, crop_width, crop_height = cropped_dimensions
            aligned_stack = aligned_stack[top:top+crop_height, left:left+crop_width, :]

        return aligned_stack

    @staticmethod
    def save_warp_matrices(warp_matrices, output_path):
        """
        保存配准矩阵到.npy文件

        Args:
            warp_matrices: 变换矩阵列表
            output_path: 输出文件路径

        Returns:
            str: 保存的文件路径
        """
        # 转换为numpy数组
        matrices = [np.array(m, dtype=np.float32) for m in warp_matrices]

        # 保存
        np.save(output_path, matrices, allow_pickle=True)

        logger.info(f'Saved warp matrices to: {output_path}')
        return output_path

    @staticmethod
    def load_warp_matrices(file_path):
        """
        从.npy文件加载配准矩阵

        Args:
            file_path: .npy文件路径

        Returns:
            list: 变换矩阵列表
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f'Warp matrices file not found: {file_path}')

        matrices = np.load(file_path, allow_pickle=True)

        # 确保返回列表
        if isinstance(matrices, np.ndarray) and matrices.ndim == 0:
            matrices = matrices.item()

        return [np.array(m, dtype=np.float32) for m in matrices]

    @staticmethod
    def generate_rgb_preview(aligned_stack, output_path, bands=(2, 1, 0)):
        """
        生成RGB预览图

        Args:
            aligned_stack: 配准后的图像堆栈 [height, width, bands]
            output_path: 输出JPEG路径
            bands: RGB波段索引，默认(2,1,0)对应(Red, Green, Blue)

        Returns:
            str: 输出文件路径
        """
        # 提取RGB波段
        rgb = np.stack([
            aligned_stack[:, :, bands[0]],
            aligned_stack[:, :, bands[1]],
            aligned_stack[:, :, bands[2]]
        ], axis=-1)

        # 归一化到0-255
        rgb = np.clip(rgb, 0, 1)
        rgb = (rgb * 255).astype(np.uint8)

        # 保存
        cv2.imwrite(output_path, cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))

        logger.info(f'Saved RGB preview: {output_path}')
        return output_path

    @staticmethod
    def calculate_ndvi(aligned_stack, nir_band=4, red_band=2):
        """
        计算NDVI

        NDVI = (NIR - Red) / (NIR + Red)

        Args:
            aligned_stack: 配准后的图像堆栈
            nir_band: NIR波段索引
            red_band: Red波段索引

        Returns:
            numpy array: NDVI图像 (-1 to 1)
        """
        nir = aligned_stack[:, :, nir_band].astype(np.float32)
        red = aligned_stack[:, :, red_band].astype(np.float32)

        # 避免除零
        denominator = nir + red
        ndvi = np.where(denominator > 0, (nir - red) / denominator, 0)

        return np.clip(ndvi, -1, 1)

    @staticmethod
    def save_ndvi(ndvi, output_path, colormap=True):
        """
        保存NDVI图像

        Args:
            ndvi: NDVI数组
            output_path: 输出路径
            colormap: 是否应用伪彩色

        Returns:
            str: 输出文件路径
        """
        if colormap:
            # 归一化到0-255
            ndvi_norm = ((ndvi + 1) / 2 * 255).astype(np.uint8)
            # 应用伪彩色
            ndvi_color = cv2.applyColorMap(ndvi_norm, cv2.COLORMAP_JET)
            cv2.imwrite(output_path, ndvi_color)
        else:
            # 保存为浮点TIFF
            import tifffile
            tifffile.imwrite(output_path, ndvi.astype(np.float32))

        logger.info(f'Saved NDVI: {output_path}')
        return output_path
