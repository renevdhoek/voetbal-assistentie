Add-Type -AssemblyName System.Drawing
$base = 'C:\proj\voetbal-assistentie\src\public'
foreach ($size in @(192, 512)) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::Transparent)
    $s = $size / 64.0

    # Shield
    $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pts = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF((32 * $s), (4 * $s))),
        (New-Object System.Drawing.PointF((56 * $s), (12 * $s))),
        (New-Object System.Drawing.PointF((56 * $s), (30 * $s))),
        (New-Object System.Drawing.PointF((44 * $s), (56 * $s))),
        (New-Object System.Drawing.PointF((32 * $s), (60 * $s))),
        (New-Object System.Drawing.PointF((20 * $s), (56 * $s))),
        (New-Object System.Drawing.PointF((8 * $s), (30 * $s))),
        (New-Object System.Drawing.PointF((8 * $s), (12 * $s)))
    )
    $shield.AddPolygon($pts)
    $shieldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(31, 41, 55))
    $g.FillPath($shieldBrush, $shield)
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(15, 23, 42)), (2 * $s)
    $g.DrawPath($borderPen, $shield)

    # Ball
    $cx = 32 * $s
    $cy = 32 * $s
    $r = 14 * $s
    $g.FillEllipse([System.Drawing.Brushes]::White, $cx - $r, $cy - $r, $r * 2, $r * 2)
    $ballPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(15, 23, 42)), (1.5 * $s)
    $g.DrawEllipse($ballPen, $cx - $r, $cy - $r, $r * 2, $r * 2)

    # Pentagon + spokes
    $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(15, 23, 42)), (1.4 * $s)
    $linePen.StartCap = 'Round'
    $linePen.EndCap = 'Round'
    $darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $penta = @()
    for ($i = 0; $i -lt 5; $i++) {
        $a = -90 + $i * 72
        $rad = $a * [Math]::PI / 180
        $penta += New-Object System.Drawing.PointF (($cx + 6 * $s * [Math]::Cos($rad)), ($cy + 6 * $s * [Math]::Sin($rad)))
    }
    $g.FillPolygon($darkBrush, [System.Drawing.PointF[]]$penta)
    foreach ($p in $penta) {
        $vx = $p.X - $cx
        $vy = $p.Y - $cy
        $len = [Math]::Sqrt($vx * $vx + $vy * $vy)
        $nx = $vx / $len
        $ny = $vy / $len
        $end = New-Object System.Drawing.PointF (($cx + $nx * 13 * $s), ($cy + $ny * 13 * $s))
        $g.DrawLine($linePen, $p, $end)
    }

    $path = Join-Path $base "pwa-${size}x${size}.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}
Get-ChildItem $base\*.png
