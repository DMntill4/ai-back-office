Add-Type -AssemblyName System.Drawing

function Create-MultiResIco {
    param(
        [string]$SourcePngPath,
        [string]$TargetIcoPath
    )

    $sizes = @(16, 24, 32, 48, 64, 128, 256)
    $srcImg = [System.Drawing.Bitmap]::FromFile($SourcePngPath)

    $pngBytesList = @()

    foreach ($size in $sizes) {
        $destBmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($destBmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)

        $g.DrawImage($srcImg, 0, 0, $size, $size)
        $g.Dispose()

        $ms = New-Object System.IO.MemoryStream
        $destBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $destBmp.Dispose()

        $pngBytes = $ms.ToArray()
        $ms.Dispose()

        $pngBytesList += ,@($size, $pngBytes)
    }

    $srcImg.Dispose()

    # Build ICO file
    # Header: 6 bytes
    # Entries: 16 bytes * count
    # Data: concatenated PNG bytes
    $count = $pngBytesList.Count
    $headerSize = 6 + (16 * $count)

    $icoStream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter $icoStream

    # ICONDIR
    $writer.Write([uint16]0) # Reserved
    $writer.Write([uint16]1) # Type (1 = ICO)
    $writer.Write([uint16]$count)

    $currentOffset = $headerSize

    # ICONDIRENTRY for each
    foreach ($item in $pngBytesList) {
        $size = $item[0]
        $bytes = $item[1]

        $bWidth = if ($size -ge 256) { [byte]0 } else { [byte]$size }
        $bHeight = if ($size -ge 256) { [byte]0 } else { [byte]$size }

        $writer.Write($bWidth)
        $writer.Write($bHeight)
        $writer.Write([byte]0) # Color count
        $writer.Write([byte]0) # Reserved
        $writer.Write([uint16]1) # Planes
        $writer.Write([uint16]32) # Bit count
        $writer.Write([uint32]$bytes.Length) # Bytes in res
        $writer.Write([uint32]$currentOffset) # Offset

        $currentOffset += $bytes.Length
    }

    # Write all PNG datas
    foreach ($item in $pngBytesList) {
        $bytes = $item[1]
        $writer.Write($bytes)
    }

    $writer.Flush()
    [System.IO.File]::WriteAllBytes($TargetIcoPath, $icoStream.ToArray())
    $writer.Dispose()
    $icoStream.Dispose()

    Write-Host "Successfully generated multi-resolution ICO at: $TargetIcoPath"
}

Create-MultiResIco `
    -SourcePngPath "packages\web\public\assets\mint-logo.png" `
    -TargetIcoPath "scripts\icon.ico"
