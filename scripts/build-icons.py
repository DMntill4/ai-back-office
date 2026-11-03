"""
Generador de íconos oficial de Mint Studio.
Utiliza Pillow para generar icon.ico multi-resolución en formato PNG nativo para Windows (Vista/7/8/10/11)
garantizando transparencia ARGB perfecta y eliminando fondos negros en el explorador de Windows.
"""
import os
import shutil
from PIL import Image

def generate_all():
    src_png = os.path.abspath('packages/web/public/icon.png')
    tauri_ico = os.path.abspath('packages/web/src-tauri/icons/icon.ico')
    public_fav = os.path.abspath('packages/web/public/favicon.ico')
    scripts_ico = os.path.abspath('scripts/icon.ico')

    im = Image.open(src_png)
    if im.mode != 'RGBA':
        im = im.convert('RGBA')

    # Tamaños estándar para Windows Explorer, barra de tareas, bandeja y diálogo Alt+Tab
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    im.save(tauri_ico, sizes=ico_sizes)
    shutil.copyfile(tauri_ico, public_fav)
    shutil.copyfile(tauri_ico, scripts_ico)

    # PNGs requeridos por Tauri
    im.resize((32, 32), Image.Resampling.LANCZOS).save('packages/web/src-tauri/icons/32x32.png')
    im.resize((128, 128), Image.Resampling.LANCZOS).save('packages/web/src-tauri/icons/128x128.png')
    im.resize((256, 256), Image.Resampling.LANCZOS).save('packages/web/src-tauri/icons/128x128@2x.png')
    im.resize((512, 512), Image.Resampling.LANCZOS).save('packages/web/src-tauri/icons/icon.png')

    print(f"[OK] Iconos generados exitosamente a partir de {src_png}")

if __name__ == '__main__':
    generate_all()
