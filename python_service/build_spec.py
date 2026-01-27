"""
PyInstaller 打包配置生成脚本
用于生成 app.spec 配置文件
"""
import os
import sys

# 基础配置
APP_NAME = 'app'
ENTRY_POINT = 'app.py'
ICON_PATH = None  # 可选：指定图标文件路径

# 需要包含的数据文件和目录
# 格式: (源路径, 目标目录)
def get_datas():
    """动态获取需要打包的数据文件"""
    datas = []

    # GDAL 数据文件
    try:
        from osgeo import gdal
        gdal_data = gdal.GetConfigOption('GDAL_DATA')
        if gdal_data and os.path.exists(gdal_data):
            datas.append((gdal_data, 'gdal-data'))
            print(f'[INFO] 找到 GDAL 数据目录: {gdal_data}')
        else:
            # 尝试从 osgeo 安装位置查找
            import osgeo
            osgeo_path = os.path.dirname(osgeo.__file__)
            possible_data_paths = [
                os.path.join(osgeo_path, 'data', 'gdal'),
                os.path.join(os.path.dirname(osgeo_path), 'Library', 'share', 'gdal'),
                os.path.join(os.path.dirname(osgeo_path), 'share', 'gdal'),
            ]
            for data_path in possible_data_paths:
                if os.path.exists(data_path):
                    datas.append((data_path, 'gdal-data'))
                    print(f'[INFO] 找到 GDAL 数据目录: {data_path}')
                    break
            else:
                print('[WARN] 未找到 GDAL 数据目录')
    except Exception as e:
        print(f'[WARN] 处理 GDAL 数据文件时出错: {e}')

    return datas

DATAS = get_datas()

# 需要包含的二进制文件(动态链接库等)
# 格式: (源路径, 目标目录)
def get_binaries():
    """动态获取需要打包的二进制文件"""
    binaries = []

    # pyzbar 依赖的 DLL 文件
    try:
        import pyzbar
        pyzbar_path = os.path.dirname(pyzbar.__file__)
        dll_files = ['libiconv.dll', 'libzbar-64.dll']

        def find_dll(dll_name, search_dirs):
            for dll_dir in search_dirs:
                if not dll_dir or not os.path.exists(dll_dir):
                    continue
                dll_path = os.path.join(dll_dir, dll_name)
                if os.path.exists(dll_path):
                    return dll_path
            return None

        # 可能的 DLL 搜索路径
        search_dirs = [pyzbar_path]

        conda_prefix = os.environ.get('CONDA_PREFIX')
        if conda_prefix:
            search_dirs.append(os.path.join(conda_prefix, 'Library', 'bin'))
            search_dirs.append(os.path.join(conda_prefix, 'DLLs'))

        # PATH 中的目录
        for path_dir in os.environ.get('PATH', '').split(os.pathsep):
            if path_dir:
                search_dirs.append(path_dir.strip('"'))

        for dll_name in dll_files:
            dll_path = find_dll(dll_name, search_dirs)
            if dll_path:
                binaries.append((dll_path, 'pyzbar'))
                print(f'[INFO] 找到 pyzbar DLL: {dll_path}')
            else:
                print(f'[WARN] 未找到 {dll_name}，已搜索目录: {search_dirs}')
    except Exception as e:
        print(f'[WARN] 处理 pyzbar DLL 时出错: {e}')

    # GDAL 依赖的 DLL 文件
    try:
        import osgeo
        osgeo_path = os.path.dirname(osgeo.__file__)

        # 查找 GDAL DLLs
        # conda 环境中，DLL 通常在 Library/bin 目录下
        possible_dll_dirs = []

        # 1. 从 conda 环境变量获取
        conda_prefix = os.environ.get('CONDA_PREFIX')
        if conda_prefix:
            possible_dll_dirs.append(os.path.join(conda_prefix, 'Library', 'bin'))
            possible_dll_dirs.append(os.path.join(conda_prefix, 'DLLs'))

        # 2. 从 osgeo 路径推导
        # 通常 osgeo 在 site-packages 中，conda Library 在上层
        site_packages = os.path.dirname(osgeo_path)
        conda_root = os.path.dirname(os.path.dirname(site_packages))  # 向上两级
        possible_dll_dirs.append(os.path.join(conda_root, 'Library', 'bin'))
        possible_dll_dirs.append(os.path.join(conda_root, 'DLLs'))

        # 3. osgeo 包本身
        possible_dll_dirs.append(osgeo_path)

        gdal_dlls_found = False
        for dll_dir in possible_dll_dirs:
            if not os.path.exists(dll_dir):
                continue

            # 查找所有 gdal/proj 相关的 DLL
            for filename in os.listdir(dll_dir):
                if filename.lower().endswith('.dll'):
                    # 包含 GDAL, PROJ, 和其他地理空间库
                    if any(prefix in filename.lower() for prefix in [
                        'gdal', 'proj', 'geos', 'sqlite', 'expat',
                        'kea', 'hdf', 'netcdf', 'openjp2', 'xerces',
                        'spatialite', 'freexl', 'libcurl', 'crypto',
                        'ssl', 'zlib', 'lzma', 'zstd', 'tiff', 'geotiff',
                        'jpeg', 'png', 'webp', 'gif', 'xml2'
                    ]):
                        dll_path = os.path.join(dll_dir, filename)
                        binaries.append((dll_path, '.'))
                        if not gdal_dlls_found:
                            print(f'[INFO] 从 {dll_dir} 收集 GDAL 相关 DLL')
                        gdal_dlls_found = True

            # 如果在这个目录找到了 DLL，就不再继续搜索其他目录
            if gdal_dlls_found:
                print(f'[INFO] 共找到 {sum(1 for b in binaries if "gdal" in b[0].lower() or "proj" in b[0].lower())} 个 GDAL/PROJ DLL')
                break

        if not gdal_dlls_found:
            print('[WARN] 未找到 GDAL DLL 文件')
            print(f'[DEBUG] 搜索的目录: {possible_dll_dirs}')
    except Exception as e:
        print(f'[WARN] 处理 GDAL DLL 时出错: {e}')
        import traceback
        traceback.print_exc()

    return binaries

BINARIES = get_binaries()

# 隐藏导入(PyInstaller无法自动检测的模块)
HIDDEN_IMPORTS = [
    'flask',
    'flask_cors',
    'numpy',
    'cv2',
    'skimage',
    'PIL',
    'pyzbar',
    'pysolar',
    'tifffile',
    'exiftool',
    # micasense 模块
    'micasense',
    'micasense.image',
    'micasense.capture',
    'micasense.panel',
    'micasense.metadata',
    'micasense.imageutils',
    'micasense.dls',
    'micasense.utils',
    'micasense.plotutils',
    'micasense.imageset',
    # API 模块
    'api.calibration',
    'api.alignment',
    'api.processing',
    # Service 模块
    'services.panel_service',
    'services.capture_service',
    'services.alignment_service',
    # 其他可能需要的模块
    'scipy',
    'scipy.ndimage',
    'scipy.optimize',
    # matplotlib (micasense 依赖)
    'matplotlib',
    'matplotlib.pyplot',
    'matplotlib.backends',
    'matplotlib.backends.backend_agg',
    # GDAL/GEOS (地理空间处理)
    'osgeo',
    'osgeo.gdal',
    'osgeo.ogr',
    'osgeo.osr',
    'osgeo.gdalconst',
    'osgeo.gdal_array',
]

# 需要排除的模块(减小包体积)
EXCLUDES = [
    'tkinter',
    'PyQt5',
    'PyQt6',
    'PySide2',
    'PySide6',
    'jupyter',
    'IPython',
    'notebook',
    'pytest',
    'sphinx',
    # 排除 matplotlib 的 GUI 后端（我们只使用 Agg 后端）
    'matplotlib.backends.backend_qt5agg',
    'matplotlib.backends.backend_qt4agg',
    'matplotlib.backends.backend_tkagg',
    'matplotlib.backends.backend_wxagg',
    'matplotlib.backends.backend_gtk3agg',
]

def generate_spec():
    """生成 PyInstaller spec 文件内容"""

    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['{ENTRY_POINT}'],
    pathex=[],
    binaries={BINARIES},
    datas={DATAS},
    hiddenimports={HIDDEN_IMPORTS},
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes={EXCLUDES},
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='{APP_NAME}',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # 保留控制台窗口以便查看日志
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon={repr(ICON_PATH)},
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='{APP_NAME}',
)
'''

    return spec_content

if __name__ == '__main__':
    spec_content = generate_spec()
    spec_path = os.path.join(os.path.dirname(__file__), f'{APP_NAME}.spec')

    with open(spec_path, 'w', encoding='utf-8') as f:
        f.write(spec_content)

    print(f'已生成 spec 文件: {spec_path}')
    print(f'使用以下命令打包:')
    print(f'  pyinstaller {APP_NAME}.spec')
