Add-Type -AssemblyName System.Drawing

$rawPath = "c:\projects\Wyatt and Emma Arcade v2\public\assets\games\art-studio\raw\create-items-raw.jpg"
$spritesDir = "c:\projects\Wyatt and Emma Arcade v2\public\assets\hub\sprites"

$srcJpg = New-Object System.Drawing.Bitmap($rawPath)
$W = $srcJpg.Width
$H = $srcJpg.Height
Write-Host "Loaded create-items-raw.jpg: ${W}x${H}"

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

# 1. Seed outer borders and column dividers
for ($x = 0; $x -lt $W; $x++) {
  foreach ($y in @(0, ($H - 1))) {
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

$col1 = [int]($W / 3)
$col2 = [int](($W * 2) / 3)
for ($y = 0; $y -lt $H; $y++) {
  foreach ($x in @(0, ($W - 1), $col1, $col2)) {
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

# 2. Seed pure #FF00FF interior holes (R > 235, G < 20, B > 235)
# These only occur in pure chroma-key background holes (between easel legs, spiral rings,
# between glockenspiel chime bars and under the glockenspiel arch) and NEVER inside shaded crayons/blocks/chimes!
for ($y = 0; $y -lt $H; $y++) {
  for ($x = 0; $x -lt $W; $x++) {
    $idx = $y * $W + $x
    if (-not $visited[$idx]) {
      $off = $idx * 4
      $b = $bytes[$off]
      $g = $bytes[$off+1]
      $r = $bytes[$off+2]
      if ($r -gt 235 -and $g -lt 20 -and $b -gt 235) {
        $visited[$idx] = $true
        $q.Enqueue($idx)
      }
    }
  }
}

# Also seed the narrow 2-4px vertical gaps between the glockenspiel chime bars in Column 3 (x: 745..950, y: 112..262)
# In those narrow gaps, JPEG bleed from dark outlines gives R > 195, G < 42, B > 195 (whereas the purple chime bar #7
# has R ~ 160-190, G > 75, and the pink chime bar #8 has G > 70 or R > B + 35).
for ($y = 112; $y -le 262; $y++) {
  for ($x = 745; $x -le 950; $x++) {
    $idx = $y * $W + $x
    if (-not $visited[$idx]) {
      $off = $idx * 4
      $b = $bytes[$off]
      $g = $bytes[$off+1]
      $r = $bytes[$off+2]
      $isLeftGap = ($x -le 868 -and $r -gt 180 -and $g -lt 65 -and $b -gt 160)
      $isRightGap = ($r -gt 195 -and $g -lt 48 -and $b -gt 185 -and [Math]::Abs($r - $b) -lt 38)
      if ($isLeftGap -or $isRightGap) {
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

# 3. Also check tiny 1-2px enclosed spiral notebook ring holes on the left edge of Column 1 (x < 65, y: 120..320)
# where JPEG compression around tiny dark rings may have raised G slightly above 20 (e.g. R > 210, G < 55, B > 210)
for ($y = 115; $y -le 330; $y++) {
  for ($x = 15; $x -le 62; $x++) {
    $idx = $y * $W + $x
    $off = $idx * 4
    if ($bytes[$off+3] -eq 0) { continue }
    $b = $bytes[$off]
    $g = $bytes[$off+1]
    $r = $bytes[$off+2]
    if ($r -gt 200 -and $g -lt 65 -and $b -gt 195 -and ($r + $b) -gt ($g * 4)) {
      $bytes[$off] = 0
      $bytes[$off+1] = 0
      $bytes[$off+2] = 0
      $bytes[$off+3] = 0
    }
  }
}

# 4. 2px neutral charcoal perimeter de-spill (R = G, B = G where G < 80 and R > G + 30)
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

$thirdW = [int]($W / 3)
$itemNames = @("create-art-studio.png", "create-tinker-box.png", "create-music-box.png")
$bounds = @()

for ($i = 0; $i -lt 3; $i++) {
  $xStart = $i * $thirdW
  $xEnd = if ($i -eq 2) { $W - 1 } else { ($i + 1) * $thirdW - 1 }
  $minX = $xEnd
  $maxX = $xStart
  $minY = $H - 1
  $maxY = 0

  for ($y = 0; $y -lt $H; $y++) {
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
  Write-Host ("Create Item {0} ({1}): minX={2}, maxX={3}, minY={4}, maxY={5} -> {6}x{7}" -f $i, $itemNames[$i], $minX, $maxX, $minY, $maxY, $bw, $bh)
  $bounds += [PSCustomObject]@{
    Name = $itemNames[$i]
    MinX = $minX
    MaxX = $maxX
    MinY = $minY
    MaxY = $maxY
    W = $bw
    H = $bh
  }
}

$maxW = ($bounds | Measure-Object -Property W -Maximum).Maximum
$maxH = ($bounds | Measure-Object -Property H -Maximum).Maximum
$outW = [int]([Math]::Ceiling(($maxW + 8) / 2.0) * 2)
$outH = [int]([Math]::Ceiling(($maxH + 6) / 2.0) * 2)
Write-Host "Uniform output create-item canvas: ${outW}x${outH}"

foreach ($b in $bounds) {
  $outBmp = New-Object System.Drawing.Bitmap($outW, $outH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gOut = [System.Drawing.Graphics]::FromImage($outBmp)
  $gOut.Clear([System.Drawing.Color]::Transparent)
  $destX = [int](($outW - $b.W) / 2)
  $destY = $outH - 2 - $b.H
  $srcRect = New-Object System.Drawing.Rectangle($b.MinX, $b.MinY, $b.W, $b.H)
  $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $b.W, $b.H)
  $gOut.DrawImage($rawBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $gOut.Dispose()

  $outPath = Join-Path $spritesDir $b.Name
  $outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $outBmp.Dispose()
  Write-Host "Saved $outPath (${outW}x${outH})"
}

$rawBmp.Dispose()
