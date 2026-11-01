Add-Type -AssemblyName System.Drawing

$hubDir = "c:\projects\Wyatt and Emma Arcade v2\public\assets\hub"
$bgPath = Join-Path $hubDir "bookshelf-bg.jpg"
$spritesDir = Join-Path $hubDir "sprites"
$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\c157efef-ad7b-472f-a591-d3f1aea5976b"

$bgBmp = [System.Drawing.Bitmap]::FromFile($bgPath)
$comp = New-Object System.Drawing.Bitmap(1280, 720)
$g = [System.Drawing.Graphics]::FromImage($comp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.DrawImage($bgBmp, 0, 0, 1280, 720)

# Upper shelf mode sprites at x = 255, 640, 1025, bottom y = 176
$m1 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "mode-read.png"))
$m2 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "mode-arcade.png"))
$m3 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "mode-create.png"))
$modes = @($m1, $m2, $m3)
$mxs = @(255, 640, 1025)
$mScales = @(0.31, 0.295, 0.295)

for ($i = 0; $i -lt 3; $i++) {
  $mw = [int](308 * $mScales[$i])
  $mh = [int](494 * $mScales[$i])
  $mx = $mxs[$i] - [int]($mw / 2)
  $my = 176 - $mh
  $g.DrawImage($modes[$i], $mx, $my, $mw, $mh)

  # Upper shelf lip brass plaque at y = 186
  $pBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 58, 36, 18))
  $pPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 251, 191, 36), 2)
  $g.FillRectangle($pBrush, $mxs[$i] - 82, 186 - 13, 164, 26)
  $g.DrawRectangle($pPen, $mxs[$i] - 82, 186 - 13, 164, 26)
}

# Lower shelf books at x = 420, 640, 860, bottom y = 636, scale = 0.64 (188x302)
$b1 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "book-nana.png"))
$b2 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "book-grandpa-bapci.png"))
$b3 = [System.Drawing.Bitmap]::FromFile((Join-Path $spritesDir "book-louisiana.png"))
$books = @($b1, $b2, $b3)
$bxs = @(420, 640, 860)
$bw = [int](294 * 0.64)
$bh = [int](472 * 0.64)

for ($i = 0; $i -lt 3; $i++) {
  $bx = $bxs[$i] - [int]($bw / 2)
  $by = 636 - $bh
  $g.DrawImage($books[$i], $bx, $by, $bw, $bh)

  $pBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 253, 248, 236))
  $pPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 217, 119, 6), 2)
  $g.FillRectangle($pBrush, $bxs[$i] - 102, 668 - 20, 204, 40)
  $g.DrawRectangle($pPen, $bxs[$i] - 102, 668 - 20, 204, 40)
}

# Persona plaques at (165, 668) and (1125, 668)
foreach ($px in @(165, 1125)) {
  $pBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 69, 26, 3))
  $pPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 251, 191, 36), 2)
  $g.FillRectangle($pBrush, $px - 92, 668 - 18, 184, 36)
  $g.DrawRectangle($pPen, $px - 92, 668 - 18, 184, 36)
}

$m1.Dispose(); $m2.Dispose(); $m3.Dispose()
$b1.Dispose(); $b2.Dispose(); $b3.Dispose()
$g.Dispose()
$comp.Save((Join-Path $artifactDir "hub_fullscreen_preview.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$comp.Dispose()
$bgBmp.Dispose()
Write-Host "Saved hub_fullscreen_preview.jpg"
