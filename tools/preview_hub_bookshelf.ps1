Add-Type -AssemblyName System.Drawing

$hubDir = "c:\projects\Wyatt and Emma Arcade v2\public\assets\hub"
$bgPath = Join-Path $hubDir "bookshelf-bg.jpg"
$spritesDir = Join-Path $hubDir "sprites"
$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\c157efef-ad7b-472f-a591-d3f1aea5976b"

$bgBmp = [System.Drawing.Bitmap]::FromFile($bgPath)

# Extract a clean cutout of sleeping Sparky (srcX: 50..206, srcY: 390..515) for the breathing tween
$spX = 50
$spY = 390
$spW = 156
$spH = 125
$sparkyBmp = New-Object System.Drawing.Bitmap($spW, $spH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y = 0; $y -lt $spH; $y++) {
  for ($x = 0; $x -lt $spW; $x++) {
    $c = $bgBmp.GetPixel($spX + $x, $spY + $y)
    # Keep pixels that belong to Sparky (green/gold/dark outline near green/gold) or soft-feather wood background
    # Actually, since Sparky is stationary on the exact same background pixels, if we feather a 6px border around Sparky's silhouette, a 2.5% scaleY tween is 100% seamless!
    $isDragon = ($c.G -gt $c.R * 0.88 -and $c.G -gt 45) -or ($c.R -gt 140 -and $c.G -gt 110 -and $c.B -lt 90)
    if ($isDragon) {
      $sparkyBmp.SetPixel($x, $y, $c)
    } else {
      $sparkyBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }
  }
}
# Dilate Sparky mask by 2px so dark outlines and horn tips are included cleanly
$sparkyFinal = New-Object System.Drawing.Bitmap($spW, $spH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y = 0; $y -lt $spH; $y++) {
  for ($x = 0; $x -lt $spW; $x++) {
    $c = $bgBmp.GetPixel($spX + $x, $spY + $y)
    $near = $false
    $minDist = 99
    for ($dy = -3; $dy -le 3; $dy++) {
      for ($dx = -3; $dx -le 3; $dx++) {
        $nx = $x + $dx
        $ny = $y + $dy
        if ($nx -ge 0 -and $nx -lt $spW -and $ny -ge 0 -and $ny -lt $spH) {
          if ($sparkyBmp.GetPixel($nx, $ny).A -gt 0) {
            $d = [Math]::Abs($dx) + [Math]::Abs($dy)
            if ($d -lt $minDist) { $minDist = $d }
            $near = $true
          }
        }
      }
    }
    if ($near) {
      $alpha = if ($minDist -le 1) { 255 } elseif ($minDist -eq 2) { 210 } elseif ($minDist -eq 3) { 110 } else { 0 }
      # Avoid picking up the horizontal shelf shadow line below y=118 unless x > 95 (tail tip)
      if ($y -gt 108 -and $x -lt 95 -and $minDist -gt 1) { $alpha = 0 }
      if ($alpha -gt 0) {
        $sparkyFinal.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B))
      }
    }
  }
}
$sparkyOutPath = Join-Path $spritesDir "shelf-sparky.png"
$sparkyFinal.Save($sparkyOutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$sparkyFinal.Dispose()
$sparkyBmp.Dispose()
Write-Host "Saved $sparkyOutPath (${spW}x${spH})"

# Build 1280x720 Hub composite preview
$comp = New-Object System.Drawing.Bitmap(1280, 720)
$g = [System.Drawing.Graphics]::FromImage($comp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

# Draw cropped bookshelf-bg (src: 0, 102, 1024, 454) into frame (dest: 40, 200, 1200, 504)
$srcRect = New-Object System.Drawing.Rectangle(0, 102, 1024, 454)
$destRect = New-Object System.Drawing.Rectangle(40, 200, 1200, 504)
$g.DrawImage($bgBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Gold border around frame
$goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 251, 191, 36), 4)
$g.DrawRectangle($goldPen, 40, 200, 1200, 504)

# Draw the 3 books at x = 395, 635, 875, bottom Y = 630, scale = 0.66 (194x311)
$b1 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "book-nana.png"))
$b2 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "book-grandpa-bapci.png"))
$b3 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "book-louisiana.png"))

$bw = [int](294 * 0.66)
$bh = [int](472 * 0.66)
$shelfY = 630

$xs = @(395, 635, 875)
$books = @($b1, $b2, $b3)
for ($i = 0; $i -lt 3; $i++) {
  $bx = $xs[$i] - [int]($bw / 2)
  $by = $shelfY - $bh
  $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 15, 8, 4))
  $g.FillEllipse($shadowBrush, $xs[$i] - 96, $shelfY - 16, 192, 28)
  $g.DrawImage($books[$i], $bx, $by, $bw, $bh)

  # Brass/parchment nameplate on the shelf front lip (y = 650..696)
  $plateBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 253, 248, 236))
  $platePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 180, 83, 9), 2)
  $g.FillRectangle($plateBrush, $xs[$i] - 110, 648, 220, 44)
  $g.DrawRectangle($platePen, $xs[$i] - 110, 648, 220, 44)
}

$b1.Dispose()
$b2.Dispose()
$b3.Dispose()
$g.Dispose()
$comp.Save((Join-Path $artifactDir "hub_bookshelf_comp_preview.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$comp.Dispose()
$bgBmp.Dispose()
Write-Host "Saved hub_bookshelf_comp_preview.jpg"
