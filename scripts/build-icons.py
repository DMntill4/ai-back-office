import struct
import os
import shutil
from io import BytesIO
from PIL import Image

def create_ico_entry_dib(im: Image.Image, size: int) -> bytes:
    """Creates a standard Windows DIB (BMP) icon payload for a given square size."""
    resized = im.resize((size, size), Image.Resampling.LANCZOS)
    if resized.mode != 'RGBA':
        resized = resized.convert('RGBA')

    width = size
    height = size
    
    # Bottom-up BGRA pixel data
    # biHeight in icon DIB is 2 * height (XOR mask height + AND mask height)
    biHeight = height * 2
    
    # 40-byte BITMAPINFOHEADER
    biSize = 40
    biWidth = width
    biPlanes = 1
    biBitCount = 32
    biCompression = 0 # BI_RGB
    
    # Pixel bytes (XOR mask)
    raw_pixels = bytearray()
    for y in reversed(range(height)):
        for x in range(width):
            r, g, b, a = resized.getpixel((x, y))
            raw_pixels.extend([b, g, r, a])
            
    # 1-bit AND mask: width bits per row, padded to 32-bit (4 bytes) boundary
    row_bytes = ((width + 31) // 32) * 4
    and_mask = bytearray(row_bytes * height)
    for y in range(height):
        for x in range(width):
            r, g, b, a = resized.getpixel((x, height - 1 - y))
            if a == 0:
                byte_idx = y * row_bytes + (x // 8)
                bit_idx = 7 - (x % 8)
                and_mask[byte_idx] |= (1 << bit_idx)

    biSizeImage = len(raw_pixels) + len(and_mask)
    
    header = struct.pack(
        '<IIIHHIIIIII',
        biSize,
        biWidth,
        biHeight,
        biPlanes,
        biBitCount,
        biCompression,
        biSizeImage,
        0, # biXPelsPerMeter
        0, # biYPelsPerMeter
        0, # biClrUsed
        0  # biClrImportant
    )
    
    return header + bytes(raw_pixels) + bytes(and_mask)

def create_ico_entry_png(im: Image.Image, size: int) -> bytes:
    """Creates a PNG payload for size=256."""
    resized = im.resize((size, size), Image.Resampling.LANCZOS)
    if resized.mode != 'RGBA':
        resized = resized.convert('RGBA')
    buf = BytesIO()
    resized.save(buf, format='PNG')
    return buf.getvalue()

def build_windows_ico(src_png_path: str, target_ico_path: str):
    im = Image.open(src_png_path)
    if im.mode != 'RGBA':
        im = im.convert('RGBA')

    sizes = [16, 24, 32, 48, 64, 128, 256]
    entries = []

    for s in sizes:
        if s == 256:
            data = create_ico_entry_png(im, s)
        else:
            data = create_ico_entry_dib(im, s)
        entries.append((s, data))

    count = len(entries)
    # Header: 6 bytes
    # Entries: 16 bytes each
    offset = 6 + (16 * count)

    ico_data = bytearray()
    # ICONDIR
    ico_data.extend(struct.pack('<HHH', 0, 1, count))

    # ICONDIRENTRY
    for s, data in entries:
        b_width = 0 if s >= 256 else s
        b_height = 0 if s >= 256 else s
        b_colors = 0
        b_reserved = 0
        w_planes = 1
        w_bpp = 32
        dw_bytes = len(data)
        dw_offset = offset

        ico_data.extend(struct.pack(
            '<BBBBHHII',
            b_width, b_height, b_colors, b_reserved,
            w_planes, w_bpp, dw_bytes, dw_offset
        ))
        offset += len(data)

    for _, data in entries:
        ico_data.extend(data)

    with open(target_ico_path, 'wb') as f:
        f.write(ico_data)

    im.close()
    print(f"Wrote {target_ico_path} ({len(ico_data)} bytes)")

def generate_all():
    src_png = os.path.abspath('packages/web/public/icon.png')
    scripts_ico = os.path.abspath('scripts/icon.ico')
    tauri_ico = os.path.abspath('packages/web/src-tauri/icons/icon.ico')
    public_fav = os.path.abspath('packages/web/public/favicon.ico')

    build_windows_ico(src_png, scripts_ico)
    shutil.copyfile(scripts_ico, tauri_ico)
    shutil.copyfile(scripts_ico, public_fav)

    # Verification
    with open(scripts_ico, 'rb') as f:
        _, _, count = struct.unpack('<HHH', f.read(6))
        print(f"\nVerification of {scripts_ico}: count={count}")
        for i in range(count):
            w, h, _, _, _, bpp, size, offset = struct.unpack('<BBBBHHII', f.read(16))
            pos = f.tell()
            f.seek(offset)
            sig = f.read(8)
            f.seek(pos)
            fmt = "PNG" if sig.startswith(b'\x89PNG') else "Win32 DIB (BMP 32bpp ARGB)"
            print(f"  Frame {i}: {w or 256}x{h or 256}, {bpp}bpp, {size} bytes, format={fmt}")

if __name__ == '__main__':
    generate_all()
