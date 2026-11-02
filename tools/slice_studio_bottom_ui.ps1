Add-Type -AssemblyName System.Drawing

$rawPath = "c:\projects\Wyatt and Emma Arcade v2\public\assets\games\art-studio\raw\studio-bottom-ui-raw.jpg"
$outDir = "c:\projects\Wyatt and Emma Arcade v2\public\assets\games\art-studio\sprites"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$srcJpg = New-Object System.Drawing.Bitmap($rawPath)
$W = $srcJpg.Width
$fullH = $srcJpg.Height
$H = [int]($fullH / 2)
Write-Host "Loaded studio-bottom-ui-raw.jpg: ${W}x${fullH} (slicing top half ${W}x${H})"

$rawBmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCopy = [System.Drawing.Graphics]::FromImage($rawBmp)
$srcTopRect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$destTopRect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$gCopy.DrawImage($srcJpg, $destTopRect, $srcTopRect, [System.Drawing.GraphicsUnit]::Pixel)
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

$seedYs = @(0, ($H - 1))
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

# Seed interior #FF00FF holes (especially the hollow inner square of Col 2 ui-brass-frame.png!)
for ($y = 0; $y -lt $H; $y++) {
  for ($x = 0; $x -lt $W; $x++) {
    $idx = $y * $W + $x
    if (-not $visited[$idx]) {
      $off = $idx * 4
      $b = $bytes[$off]
      $g = $bytes[$off+1]
      $r = $bytes[$off+2]
      if ($r -gt 220 -and $g -lt 35 -and $b -gt 220) {
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
$colNames = @("ui-paint-well", "ui-brass-frame.png", "ui-page-left.png", "ui-page-right.png")

for ($col = 0; $col -lt 4; $col++) {
  $xStart = $col * $cellW
  $xEnd = if ($col -eq 3) { $W - 1 } else { ($col + 1) * $cellW - 1 }

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
  $outW = $bw + 8
  $outH = $bh + 8

  $outBmp = New-Object System.Drawing.Bitmap($outW, $outH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gOut = [System.Drawing.Graphics]::FromImage($outBmp)
  $gOut.Clear([System.Drawing.Color]::Transparent)
  $srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $bw, $bh)
  $destRect = New-Object System.Drawing.Rectangle(4, 4, $bw, $bh)
  $gOut.DrawImage($rawBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $gOut.Dispose()

  if ($col -eq 0) {
    # Split Row 1, Col 1 into `ui-paint-well-rim.png` and `ui-paint-well-fill.png` (identical outW x outH)
    $rimBmp = New-Object System.Drawing.Bitmap($outW, $outH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $fillBmp = New-Object System.Drawing.Bitmap($outW, $outH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $gR = [System.Drawing.Graphics]::FromImage($rimBmp)
    $gR.DrawImage($outBmp, 0, 0, $outW, $outH)
    $gR.Dispose()

    $gF = [System.Drawing.Graphics]::FromImage($fillBmp)
    $gF.Clear([System.Drawing.Color]::Transparent)
    $gF.Dispose()

    $pwRect = New-Object System.Drawing.Rectangle(0, 0, $outW, $outH)
    $rData = $rimBmp.LockBits($pwRect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $fData = $fillBmp.LockBits($pwRect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $pwStride = $rData.Stride
    $rBytes = New-Object byte[] ($pwStride * $outH)
    $fBytes = New-Object byte[] ($pwStride * $outH)
    [System.Runtime.InteropServices.Marshal]::Copy($rData.Scan0, $rBytes, 0, $rBytes.Length)

    # Flood-fill from center of the paint well across the white/silver inner paint pool
    $centerX = [int]($outW / 2)
    $centerY = [int]($outH / 2)
    $poolMask = New-Object bool[] ($outW * $outH)
    $pq = New-Object System.Collections.Generic.Queue[int]
    $startIdx = $centerY * $outW + $centerX
    $poolMask[$startIdx] = $true
    $pq.Enqueue($startIdx)

    while ($pq.Count -gt 0) {
      $curr = $pq.Dequeue()
      $px = $curr % $outW
      $py = [int]($curr / $outW)

      $pNeighbors = @()
      if ($px -gt 0) { $pNeighbors += ($curr - 1) }
      if ($px -lt ($outW - 1)) { $pNeighbors += ($curr + 1) }
      if ($py -gt 0) { $pNeighbors += ($curr - $outW) }
      if ($py -lt ($outH - 1)) { $pNeighbors += ($curr + $outW) }

      foreach ($n in $pNeighbors) {
        if (-not $poolMask[$n]) {
          $noff = $n * 4
          $nb = $rBytes[$noff]
          $ng = $rBytes[$noff+1]
          $nr = $rBytes[$noff+2]
          $na = $rBytes[$noff+3]
          # The white/silver pool has high B (>135) and low R-B (<26), whereas the brass ring has warm R-B > 30
          if ($na -gt 0 -and $nr -gt 135 -and $ng -gt 135 -and $nb -gt 135 -and ($nr - $nb) -lt 26) {
            $poolMask[$n] = $true
            $pq.Enqueue($n)
          }
        }
      }
    }

    # Copy pool pixels (plus a 1px dilated rim underlap so there's zero seam) into fillBmp,
    # and make pool pixels transparent in rimBmp!
    for ($y = 0; $y -lt $outH; $y++) {
      for ($x = 0; $x -lt $outW; $x++) {
        $idx = $y * $outW + $x
        $off = $idx * 4
        $inPoolOrBorder = $poolMask[$idx]
        if (-not $inPoolOrBorder) {
          for ($dy = -1; $dy -le 1; $dy++) {
            for ($dx = -1; $dx -le 1; $dx++) {
              $nx = $x + $dx
              $ny = $y + $dy
              if ($nx -ge 0 -and $nx -lt $outW -and $ny -ge 0 -and $ny -lt $outH) {
                if ($poolMask[$ny * $outW + $nx]) {
                  $inPoolOrBorder = $true
                  break
                }
              }
            }
            if ($inPoolOrBorder) { break }
          }
        }

        if ($inPoolOrBorder) {
          # Keep bright neutral luminance in fillBmp so Phaser setTint() colors it vividly with glossy highlight!
          $fBytes[$off]   = $rBytes[$off]
          $fBytes[$off+1] = $rBytes[$off+1]
          $fBytes[$off+2] = $rBytes[$off+2]
          $fBytes[$off+3] = 255
        }

        if ($poolMask[$idx]) {
          $rBytes[$off]   = 0
          $rBytes[$off+1] = 0
          $rBytes[$off+2] = 0
          $rBytes[$off+3] = 0
        }
      }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($rBytes, 0, $rData.Scan0, $rBytes.Length)
    [System.Runtime.InteropServices.Marshal]::Copy($fBytes, 0, $fData.Scan0, $fBytes.Length)
    $rimBmp.UnlockBits($rData)
    $fillBmp.UnlockBits($fData)

    $rimPath = Join-Path $outDir "ui-paint-well-rim.png"
    $fillPath = Join-Path $outDir "ui-paint-well-fill.png"
    $rimBmp.Save($rimPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fillBmp.Save($fillPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $rimBmp.Dispose()
    $fillBmp.Dispose()
    Write-Host "Saved $rimPath and $fillPath (${outW}x${outH})"
  } else {
    $fileName = $colNames[$col]
    $outPath = Join-Path $outDir $fileName
    $outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved $outPath (${outW}x${outH})"
  }

  $outBmp.Dispose()
}

$rawBmp.Dispose()
