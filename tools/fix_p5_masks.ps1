$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$cleanPath = Join-Path $rootDir 'public\assets\stories\colorado\pages\p5-clean.jpg'
$outPath = Join-Path $rootDir 'public\assets\stories\colorado\sprites\p5\p5_bridge_cables_mask.png'

$srcBmp = [System.Drawing.Bitmap]::new($cleanPath)
$srcW = $srcBmp.Width
$srcH = $srcBmp.Height

$cropX = 0
$cropY = 180
$cropW = 950
$cropH = 540 # 720 - 180

$outBmp = [System.Drawing.Bitmap]::new($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$rect = [System.Drawing.Rectangle]::new(0, 0, $cropW, $cropH)
$bmpData = $outBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = [Math]::Abs($bmpData.Stride)
$bytes = New-Object byte[] ($stride * $cropH)

$srcRect = [System.Drawing.Rectangle]::new(0, 0, $srcW, $srcH)
$srcData = $srcBmp.LockBits($srcRect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$srcStride = [Math]::Abs($srcData.Stride)
$srcBytes = New-Object byte[] ($srcStride * $srcH)
[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBytes, 0, $srcBytes.Length)
$srcBmp.UnlockBits($srcData)

$steelCore = New-Object bool[] ($cropW * $cropH)
$darkPixel = New-Object bool[] ($cropW * $cropH)
$isRockArr = New-Object bool[] ($cropW * $cropH)
$isWaterOrSkyArr = New-Object bool[] ($cropW * $cropH)

for ($y = 0; $y -lt $cropH; $y++) {
    $stageY = $cropY + $y
    $sy = [Math]::Min($srcH - 1, [int][Math]::Floor(($stageY + 0.5) * $srcH / 720.0))
    for ($x = 0; $x -lt $cropW; $x++) {
        $stageX = $cropX + $x
        $sx = [Math]::Min($srcW - 1, [int][Math]::Floor(($stageX + 0.5) * $srcW / 1280.0))
        $sIdx = $sy * $srcStride + $sx * 4
        $b = [int]$srcBytes[$sIdx]
        $g = [int]$srcBytes[$sIdx + 1]
        $r = [int]$srcBytes[$sIdx + 2]

        $dIdx = $y * $stride + $x * 4
        $bytes[$dIdx] = [byte]$b
        $bytes[$dIdx + 1] = [byte]$g
        $bytes[$dIdx + 2] = [byte]$r
        $bytes[$dIdx + 3] = 0

        $mIdx = $y * $cropW + $x
        if ($r -lt 45 -and $g -lt 45 -and $b -lt 45) {
            $darkPixel[$mIdx] = $true
        }

        $isRock = $r -gt ($b + 22)
        $isRiverOrSky = ($b -gt ($r + 15)) -or ($g -gt ($r + 10))
        $isGreenBush = ($g -gt ($b + 6)) -and ($r -lt 95)
        $isRockArr[$mIdx] = $isRock
        $isWaterOrSkyArr[$mIdx] = $isRiverOrSky

        $isSteelGrey = ([Math]::Abs($r - $g) -le 16) -and ([Math]::Abs($g - $b) -le 18) -and ([Math]::Abs($r - $b) -le 22) -and ($r -ge 35) -and ($r -le 185)
        if ($isSteelGrey -and (-not $isRock) -and (-not $isRiverOrSky) -and (-not $isGreenBush)) {
            $steelCore[$mIdx] = $true
        }
    }
}

# Reject 1px shoreline transition pixels that simultaneously border both canyon rock and river water/sky
# (unless inside the main cable/suspender rod/railing structural zones)
for ($y = 1; $y -lt ($cropH - 1); $y++) {
    for ($x = 1; $x -lt ($cropW - 1); $x++) {
        $mIdx = $y * $cropW + $x
        if (-not $steelCore[$mIdx]) { continue }
        $touchesRock = $false
        $touchesWater = $false
        for ($dy = -1; $dy -le 1; $dy++) {
            for ($dx = -1; $dx -le 1; $dx++) {
                $nIdx = ($y + $dy) * $cropW + ($x + $dx)
                if ($isRockArr[$nIdx]) { $touchesRock = $true }
                if ($isWaterOrSkyArr[$nIdx]) { $touchesWater = $true }
            }
        }
        if ($touchesRock -and $touchesWater) {
            $steelCore[$mIdx] = $false
        }
    }
}

# Remove isolated <25px specks in the canyon walls/sky
$visited = New-Object bool[] ($cropW * $cropH)
$q = New-Object int[] ($cropW * $cropH)
$comp = New-Object int[] ($cropW * $cropH)

for ($i = 0; $i -lt ($cropW * $cropH); $i++) {
    if ($steelCore[$i] -and (-not $visited[$i])) {
        $visited[$i] = $true
        $head = 0
        $tail = 0
        $q[$tail] = $i; $tail++
        $compCount = 0
        while ($head -lt $tail) {
            $cur = $q[$head]; $head++
            $comp[$compCount] = $cur; $compCount++
            $cy = [int][Math]::Floor($cur / $cropW)
            $cx = $cur - ($cy * $cropW)
            for ($dy = -1; $dy -le 1; $dy++) {
                $ny = $cy + $dy
                if ($ny -lt 0 -or $ny -ge $cropH) { continue }
                for ($dx = -1; $dx -le 1; $dx++) {
                    $nx = $cx + $dx
                    if ($nx -lt 0 -or $nx -ge $cropW) { continue }
                    $nIdx = $ny * $cropW + $nx
                    if ($steelCore[$nIdx] -and (-not $visited[$nIdx])) {
                        $visited[$nIdx] = $true
                        $q[$tail] = $nIdx; $tail++
                    }
                }
            }
        }
        if ($compCount -lt 25) {
            for ($k = 0; $k -lt $compCount; $k++) {
                $steelCore[$comp[$k]] = $false
            }
        }
    }
}

# Final mask: steelCore OR (1px dark outline immediately touching a steelCore pixel)
for ($y = 0; $y -lt $cropH; $y++) {
    for ($x = 0; $x -lt $cropW; $x++) {
        $mIdx = $y * $cropW + $x
        $keep = $steelCore[$mIdx]
        if ((-not $keep) -and $darkPixel[$mIdx]) {
            for ($dy = -1; $dy -le 1 -and (-not $keep); $dy++) {
                $ny = $y + $dy
                if ($ny -lt 0 -or $ny -ge $cropH) { continue }
                for ($dx = -1; $dx -le 1; $dx++) {
                    $nx = $x + $dx
                    if ($nx -lt 0 -or $nx -ge $cropW) { continue }
                    if ($steelCore[$ny * $cropW + $nx]) {
                        $keep = $true
                        break
                    }
                }
            }
        }
        $dIdx = $y * $stride + $x * 4
        if ($keep) {
            $bytes[$dIdx + 3] = 255
        } else {
            $bytes[$dIdx] = 0
            $bytes[$dIdx + 1] = 0
            $bytes[$dIdx + 2] = 0
            $bytes[$dIdx + 3] = 0
        }
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bmpData.Scan0, $bytes.Length)
$outBmp.UnlockBits($bmpData)
$outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$outBmp.Dispose()
$srcBmp.Dispose()
Write-Output "[OK] Saved p5_bridge_cables_mask.png ($cropW x $cropH)"
