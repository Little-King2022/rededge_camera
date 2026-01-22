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
                              max_iterations=10, pyramid_levels=0, progress_callback=None):
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

        if len(image_paths) != 5:
            raise ValueError('Expected 5 single-band TIF files for alignment')

        if progress_callback:
            progress_callback(5, '正在验证输入...')

        # 验证文件
        for path in image_paths:
            if not os.path.exists(path):
                raise FileNotFoundError(f'Image file not found: {path}')

        if progress_callback:
            progress_callback(15, '正在加载图像...')

        # 加载图像
        capture = Capture.from_filelist(image_paths)

        # Alignment v2 defaults: keep iterations and pyramid levels low for speed and stability.
        if max_iterations is None:
            max_iterations = 10
        if pyramid_levels is None:
            pyramid_levels = 0

        # 获取相机信息
        camera_model = capture.camera_model if hasattr(capture, 'camera_model') else 'Unknown'
        camera_serial = capture.camera_serial if hasattr(capture, 'camera_serial') else 'Unknown'

        # 执行配准
        if progress_callback:
            progress_callback(25, '正在配准图像，根据所选方法和计算机性能，这可能需要一些时间...')

        if method == AlignmentService.METHOD_SIFT:
            warp_matrices, alignment_pairs = AlignmentService._align_sift(
                capture, reference_band
            )
        else:
            warp_matrices, alignment_pairs = AlignmentService._align_opencv(
                capture, reference_band, max_iterations, pyramid_levels
            )

        if progress_callback:
            progress_callback(80, '正在计算裁剪边界...')

        # 获取裁剪尺寸
        cropped_dimensions = AlignmentService._calculate_crop_dimensions(
            capture, warp_matrices, reference_band
        )

        if progress_callback:
            progress_callback(90, '即将完成...')

        elapsed_time = time.time() - start_time

        return {
            'success': True,
            'camera_model': camera_model,
            'camera_serial': camera_serial,
            'method': method,
            'reference_band': reference_band,
            'warp_matrices': [m.tolist() for m in warp_matrices],
            'cropped_dimensions': cropped_dimensions,
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
            max_iterations=max_iterations,
            pyramid_levels=pyramid_levels
        )

        return warp_matrices, alignment_pairs

    @staticmethod
    def _align_sift(capture, reference_band):
        """使用SIFT特征点方法进行配准"""
        for img in capture.images:
            if img.rig_relatives is None:
                img.rig_relatives = [0.0, 0.0, 0.0]
            elif len(img.rig_relatives) < 3:
                img.rig_relatives = list(img.rig_relatives) + [0.0] * (3 - len(img.rig_relatives))

        # 调用capture的SIFT配准方法
        warp_matrices = capture.SIFT_align_capture(
            ref=reference_band,
            min_matches=10
        )

        alignment_pairs = []  # SIFT方法不返回alignment_pairs

        return warp_matrices, alignment_pairs

    @staticmethod
    def _calculate_crop_dimensions(capture, warp_matrices, reference_band, warp_mode=cv2.MOTION_HOMOGRAPHY):
        """
        计算配准后的有效裁剪区域

        Returns:
            list: [left, top, width, height]
        """
        warp_matrices = [np.array(m, dtype=np.float32) for m in warp_matrices]
        cropped_dimensions, _ = imageutils.find_crop_bounds(
            capture,
            warp_matrices,
            warp_mode=warp_mode,
            reference_band=reference_band
        )

        return [int(value) for value in cropped_dimensions]

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

        warp_mode = cv2.MOTION_HOMOGRAPHY
        warp_matrices = [np.array(m, dtype=np.float32) for m in warp_matrices]

        if cropped_dimensions is None:
            cropped_dimensions = AlignmentService._calculate_crop_dimensions(
                capture, warp_matrices, reference_band, warp_mode=warp_mode
            )

        if img_type in ('reflectance', 'radiance'):
            if img_type == 'reflectance':
                capture.compute_undistorted_reflectance(irradiance_list)
            else:
                capture.compute_undistorted_radiance()

            return imageutils.aligned_capture(
                capture,
                warp_matrices,
                warp_mode,
                cropped_dimensions,
                reference_band,
                img_type=img_type
            )

        # Raw alignment fallback for non-standard output types.
        aligned_stack = np.zeros((height, width, len(warp_matrices)), dtype=np.float32)
        for i, warp_matrix in enumerate(warp_matrices):
            img = capture.images[i]
            source = img.undistorted(img.raw()).astype(np.float32)

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

        left, top, crop_width, crop_height = cropped_dimensions
        return aligned_stack[top:top + crop_height, left:left + crop_width, :]

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
