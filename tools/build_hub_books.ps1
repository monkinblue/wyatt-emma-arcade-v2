Add-Type -AssemblyName System.Drawing

$hubDir = "c:\projects\Wyatt and Emma Arcade v2\public\assets\hub"
$rawPath = Join-Path $hubDir "raw\books-raw.jpg"
$spritesDir = Join-Path $hubDir "sprites"

$srcJpg = New-Object System.Drawing.Bitmap($rawPath)
$W = $srcJpg.Width
$H = $srcJpg.Height
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

# Outer-Border BFS Flood-Fill: (R > 150, G < 90, B > 140) and (R + B > G * 3)
$visited = New-Object bool[] ($W * $H)
$q = New-Object System.Collections.Generic.Queue[int]

function Is-Magenta([int]$r, [int]$g, [int]$b) {
  return ($r -gt 150 -and $g -lt 90 -and $b -gt 140 -and ($r + $b) -gt ($g * 3))
}

for ($x = 0; $x -lt $W; $x++) {
  $topIdx = $x
  if (-not $visited[$topIdx]) {
    $off = $topIdx * 4
    if (Is-Magenta $bytes[$off+2] $bytes[$off+1] $bytes[$off]) {
      $visited[$topIdx] = $true
      $q.Enqueue($topIdx)
    }
  }
  $botIdx = ($H - 1) * $W + $x
  if (-not $visited[$botIdx]) {
    $off = $botIdx * 4
    if (Is-Magenta $bytes[$off+2] $bytes[$off+1] $bytes[$off]) {
      $visited[$botIdx] = $true
      $q.Enqueue($botIdx)
    }
  }
}

for ($y = 0; $y -lt $H; $y++) {
  $leftIdx = $y * $W
  if (-not $visited[$leftIdx]) {
    $off = $leftIdx * 4
    if (Is-Magenta $bytes[$off+2] $bytes[$off+1] $bytes[$off]) {
      $visited[$leftIdx] = $true
      $q.Enqueue($leftIdx)
    }
  }
  $rightIdx = $y * $W + ($W - 1)
  if (-not $visited[$rightIdx]) {
    $off = $rightIdx * 4
    if (Is-Magenta $bytes[$off+2] $bytes[$off+1] $bytes[$off]) {
      $visited[$rightIdx] = $true
      $q.Enqueue($rightIdx)
    }
  }
}

$col1 = [int]($W / 3)
$col2 = [int](($W * 2) / 3)
for ($y = 0; $y -lt $H; $y++) {
  foreach ($cx in @($col1, $col2)) {
    $idx = $y * $W + $cx
    if (-not $visited[$idx]) {
      $off = $idx * 4
      if (Is-Magenta $bytes[$off+2] $bytes[$off+1] $bytes[$off]) {
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

  if ($cx -gt 0) {
    $n = $curr - 1
    if (-not $visited[$n]) {
      $noff = $n * 4
      if (Is-Magenta $bytes[$noff+2] $bytes[$noff+1] $bytes[$noff]) {
        $visited[$n] = $true
        $q.Enqueue($n)
      }
    }
  }
  if ($cx -lt ($W - 1)) {
    $n = $curr + 1
    if (-not $visited[$n]) {
      $noff = $n * 4
      if (Is-Magenta $bytes[$noff+2] $bytes[$noff+1] $bytes[$noff]) {
        $visited[$n] = $true
        $q.Enqueue($n)
      }
    }
  }
  if ($cy -gt 0) {
    $n = $curr - $W
    if (-not $visited[$n]) {
      $noff = $n * 4
      if (Is-Magenta $bytes[$noff+2] $bytes[$noff+1] $bytes[$noff]) {
        $visited[$n] = $true
        $q.Enqueue($n)
      }
    }
  }
  if ($cy -lt ($H - 1)) {
    $n = $curr + $W
    if (-not $visited[$n]) {
      $noff = $n * 4
      if (Is-Magenta $bytes[$noff+2] $bytes[$noff+1] $bytes[$noff]) {
        $visited[$n] = $true
        $q.Enqueue($n)
      }
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

$thirdW = [int]($W / 3)
$bookNames = @("book-nana.png", "book-grandpa-bapci.png", "book-louisiana.png")
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
  Write-Host ("Book {0} ({1}): minX={2}, maxX={3}, minY={4}, maxY={5} -> {6}x{7}" -f $i, $bookNames[$i], $minX, $maxX, $minY, $maxY, $bw, $bh)
  $bounds += [PSCustomObject]@{
    Name = $bookNames[$i]
    MinX = $minX
    MaxX = $maxX
    MinY = $minY
    MaxY = $maxY
    W = $bw
    H = $bh
  }
}

$maxBookW = ($bounds | Measure-Object -Property W -Maximum).Maximum
$maxBookH = ($bounds | Measure-Object -Property H -Maximum).Maximum
$outW = [int]([Math]::Ceiling(($maxBookW + 8) / 2.0) * 2)
$outH = [int]([Math]::Ceiling(($maxBookH + 6) / 2.0) * 2)
Write-Host "Uniform output book canvas: ${outW}x${outH}"

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
  Write-Host "Saved $outPath (${outW}x${outH}) with true 32-bit alpha"
}

$rawBmp.Dispose()
