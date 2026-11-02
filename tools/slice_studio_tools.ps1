Add-Type -AssemblyName System.Drawing

$rawPath = "c:\projects\Wyatt and Emma Arcade v2\public\assets\games\art-studio\raw\studio-tools-raw.jpg"
$outDir = "c:\projects\Wyatt and Emma Arcade v2\public\assets\games\art-studio\sprites"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$srcJpg = New-Object System.Drawing.Bitmap($rawPath)
$W = $srcJpg.Width
$H = $srcJpg.Height
Write-Host "Loaded studio-tools-raw.jpg: ${W}x${H}"

$rawBmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCopy = [System.Drawing.Graphics]::FromImage($rawBmp)
$gCopy.DrawImage($srcJpg, 0, 0, $W, $H)
$gCopy.Dispose()
$srcJpg.Dispose()

$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$bmpData = $rawBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $bmpData.Stride
$bytes = New-Object byte[] ($stride * $H)
[System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $bytes, 0, $bytes.Length)

function Is-Magenta([int]$r, [int]$g, [int]$b) {
  return ($r -gt 150 -and $g -lt 90 -and $b -gt 140 -and ($r + $b) -gt ($g * 3))
}

$visited = New-Object bool[] ($W * $H)
$q = New-Object System.Collections.Generic.Queue[int]

$seedYs = @(0, ($H - 1), [int]($H / 2))
$seedXs = @(0, ($W - 1), [int]($W / 4), [int]($W / 2), [int]((3 * $W) / 4))

foreach ($y in $seedYs) {
  for ($x = 0; $x -lt $W; $x++) {
    $idx = $y * $W + $x
    if (-not $visited[$idx]) {
      $off = $idx * 4
      if (Is-Magenta $bytes[$off+2] $bytes[$off+1] $bytes[$off]) {
        $visited[$idx] = $true
        $q.Enqueue($idx)
      }
    }
  }
}

foreach ($x in $seedXs) {
  for ($y = 0; $y -lt $H; $y++) {
    $idx = $y * $W + $x
    if (-not $visited[$idx]) {
      $off = $idx * 4
      if (Is-Magenta $bytes[$off+2] $bytes[$off+1] $bytes[$off]) {
        $visited[$idx] = $true
        $q.Enqueue($idx)
      }
    }
  }
}

# Seed interior #FF00FF holes (R > 225, G < 35, B > 225) inside the paint bucket wire handle, roller bracket, etc.
# Plus explicitly seed the tiny wire handle loop on the right edge of tool-bucket (x: 960..995, y: 105..145)
for ($y = 0; $y -lt $H; $y++) {
  for ($x = 0; $x -lt $W; $x++) {
    $idx = $y * $W + $x
    if (-not $visited[$idx]) {
      $off = $idx * 4
      $b = $bytes[$off]
      $g = $bytes[$off+1]
      $r = $bytes[$off+2]
      $isPureHole = ($r -gt 225 -and $g -lt 35 -and $b -gt 225)
      $isBucketHandleHole = ($x -ge 960 -and $x -le 998 -and $y -ge 105 -and $y -le 145 -and $r -gt 190 -and $g -lt 65 -and $b -gt 180)
      if ($isPureHole -or $isBucketHandleHole) {
        $visited[$idx] = $true
        $q.Enqueue($idx)
      }
    }
  }
}

while ($q.Count -gt 0) {
  $curr = $q.Dequeue()
  $off = $curr * 4
  $bytes[$off] = 0
  $bytes[$off+1] = 0
  $bytes[$off+2] = 0
  $bytes[$off+3] = 0

  $cx = $curr % $W
  $cy = [int]($curr / $W)

  $neighbors = @()
  if ($cx -gt 0) { $neighbors += ($curr - 1) }
  if ($cx -lt ($W - 1)) { $neighbors += ($curr + 1) }
  if ($cy -gt 0) { $neighbors += ($curr - $W) }
  if ($cy -lt ($H - 1)) { $neighbors += ($curr + $W) }

  foreach ($n in $neighbors) {
    if (-not $visited[$n]) {
      $noff = $n * 4
      if (Is-Magenta $bytes[$noff+2] $bytes[$noff+1] $bytes[$noff]) {
        $visited[$n] = $true
        $q.Enqueue($n)
      }
    }
  }
}

# Convert magenta background bleed inside the translucent soap bubbles of tool-sponge (Row 2, Col 2: x 256..512, y 286..572)
# into iridescent sky-blue soap bubble sheen!
for ($y = 286; $y -lt $H; $y++) {
  for ($x = 256; $x -lt 512; $x++) {
    $idx = $y * $W + $x
    $off = $idx * 4
    if ($bytes[$off+3] -eq 0) { continue }
    $b = $bytes[$off]
    $g = $bytes[$off+1]
    $r = $bytes[$off+2]
    if ($r -gt 175 -and $b -gt 185 -and $g -lt 135 -and ($r + $b) -gt ($g * 3.1)) {
      $bytes[$off] = 252
      $bytes[$off+1] = 228
      $bytes[$off+2] = 175
      $bytes[$off+3] = 205
    }
  }
}

# 2px neutral charcoal perimeter de-spill (R = G, B = G where G < 80 and R > G + 30)
for ($y = 0; $y -lt $H; $y++) {
  for ($x = 0; $x -lt $W; $x++) {
    $idx = $y * $W + $x
    $off = $idx * 4
    if ($bytes[$off+3] -eq 0) { continue }

    $nearTrans = $false
    for ($dy = -2; $dy -le 2; $dy++) {
      for ($dx = -2; $dx -le 2; $dx++) {
        $nx = $x + $dx
        $ny = $y + $dy
        if ($nx -lt 0 -or $nx -ge $W -or $ny -lt 0 -or $ny -ge $H) {
          $nearTrans = $true
          break
        }
        $noff = ($ny * $W + $nx) * 4
        if ($bytes[$noff+3] -eq 0) {
          $nearTrans = $true
          break
        }
      }
      if ($nearTrans) { break }
    }

    if ($nearTrans) {
      $b = $bytes[$off]
      $g = $bytes[$off+1]
      $r = $bytes[$off+2]
      if ($g -lt 80 -and $r -gt ($g + 30)) {
        $bytes[$off] = $g
        $bytes[$off+2] = $g
      } elseif ($r -gt ($g + 45) -and $b -gt ($g + 45)) {
        $bytes[$off] = $g
        $bytes[$off+2] = $g
      }
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bmpData.Scan0, $bytes.Length)
$rawBmp.UnlockBits($bmpData)

$cellW = [int]($W / 4)
$cellH = [int]($H / 2)
$names = @(
  @("tool-crayon.png", "tool-glitter-brush.png", "tool-roller.png", "tool-bucket.png"),
  @("tool-undo.png", "tool-sponge.png", "tool-bookshelf.png", "tool-sticker-box.png")
)

for ($row = 0; $row -lt 2; $row++) {
  for ($col = 0; $col -lt 4; $col++) {
    $xStart = $col * $cellW
    $xEnd = if ($col -eq 3) { $W - 1 } else { ($col + 1) * $cellW - 1 }
    $yStart = $row * $cellH
    $yEnd = if ($row -eq 1) { $H - 1 } else { ($row + 1) * $cellH - 1 }

    $minX = $xEnd
    $maxX = $xStart
    $minY = $yEnd
    $maxY = $yStart

    for ($y = $yStart; $y -le $yEnd; $y++) {
      for ($x = $xStart; $x -le $xEnd; $x++) {
        $off = ($y * $W + $x) * 4
        if ($bytes[$off+3] -gt 10) {
          if ($x -lt $minX) { $minX = $x }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }

    $bw = $maxX - $minX + 1
    $bh = $maxY - $minY + 1
    $outW = $bw + 8
    $outH = $bh + 8

    $outBmp = New-Object System.Drawing.Bitmap($outW, $outH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gOut = [System.Drawing.Graphics]::FromImage($outBmp)
    $gOut.Clear([System.Drawing.Color]::Transparent)
    $srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $bw, $bh)
    $destRect = New-Object System.Drawing.Rectangle(4, 4, $bw, $bh)
    $gOut.DrawImage($rawBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $gOut.Dispose()

    $fileName = $names[$row][$col]
    $outPath = Join-Path $outDir $fileName
    $outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outBmp.Dispose()
    Write-Host "Saved $outPath (${outW}x${outH})"
  }
}

$rawBmp.Dispose()
