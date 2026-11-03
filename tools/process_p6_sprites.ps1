$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$pagesDir = Join-Path $rootDir 'public\assets\stories\colorado\pages'
$p6Dir = Join-Path $rootDir 'public\assets\stories\colorado\sprites\p6'

# 1. Backup any existing p6-train.jpg / p6-train.png
foreach ($oldName in @('p6-train.jpg', 'p6-train.png')) {
    $oldPath = Join-Path $pagesDir $oldName
    $bakName = $oldName.Replace('p6-train.', 'p6-train.v0.bak.')
    $bakPath = Join-Path $pagesDir $bakName
    if ((Test-Path $oldPath) -and (-not (Test-Path $bakPath))) {
        Copy-Item $oldPath $bakPath
    }
}

function Load-CleanedBitmap([string]$path, [bool]$topHalfOnly, [bool]$stripEmmaJumpShadow) {
    $rawBmp = [System.Drawing.Bitmap]::new($path)
    $w = $rawBmp.Width
    $h = if ($topHalfOnly) { [int][Math]::Floor($rawBmp.Height / 2) } else { $rawBmp.Height }

    $bmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $srcRect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
    $g.DrawImage($rawBmp, $srcRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $rawBmp.Dispose()

    $data = $bmp.LockBits($srcRect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = [Math]::Abs($data.Stride)
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

    # Shave 5px outer border + Remove #FF00FF magenta + interior magenta holes
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $idx = $y * $stride + $x * 4
            if ($x -lt 5 -or $x -ge ($w - 5) -or $y -lt 5 -or ($topHalfOnly -and $y -ge ($h - 4)) -or ((-not $topHalfOnly) -and $y -ge ($h - 5))) {
                $bytes[$idx] = 0; $bytes[$idx+1] = 0; $bytes[$idx+2] = 0; $bytes[$idx+3] = 0
                continue
            }
            $b = [int]$bytes[$idx]
            $gr = [int]$bytes[$idx+1]
            $r = [int]$bytes[$idx+2]

            $isMag = ($r -gt 165) -and ($gr -lt 105) -and ($b -gt 165) -and (($r + $b - 2 * $gr) -gt 170)
            if (-not $isMag -and $stripEmmaJumpShadow) {
                # In Frame 1 of p6_babci_emma_sheet.jpg (x: 250..380, y: 505..545), strip the dark-magenta oval floor shadow under jumping Emma
                if ($x -ge 250 -and $x -le 380 -and $y -ge 500 -and $r -gt 110 -and $b -gt 110 -and $gr -lt 70) {
                    $isMag = $true
                }
            }
            if ($isMag) {
                $bytes[$idx] = 0; $bytes[$idx+1] = 0; $bytes[$idx+2] = 0; $bytes[$idx+3] = 0
            }
        }
    }

    # 1px magenta edge de-spill
    $toClear = New-Object System.Collections.Generic.List[int]
    for ($y = 1; $y -lt ($h - 1); $y++) {
        for ($x = 1; $x -lt ($w - 1); $x++) {
            $idx = $y * $stride + $x * 4
            if ($bytes[$idx+3] -eq 0) { continue }
            $touchesZero = ($bytes[$idx - 4 + 3] -eq 0) -or ($bytes[$idx + 4 + 3] -eq 0) -or ($bytes[$idx - $stride + 3] -eq 0) -or ($bytes[$idx + $stride + 3] -eq 0)
            if ($touchesZero) {
                $b = [int]$bytes[$idx]
                $gr = [int]$bytes[$idx+1]
                $r = [int]$bytes[$idx+2]
                if ((($r + $b - 2 * $gr) -gt 85) -and ($r -gt 125) -and ($b -gt 125)) {
                    $toClear.Add($idx)
                }
            }
        }
    }
    foreach ($idx in $toClear) {
        $bytes[$idx] = 0; $bytes[$idx+1] = 0; $bytes[$idx+2] = 0; $bytes[$idx+3] = 0
    }

    # Remove tiny isolated <12px specks
    $visited = New-Object bool[] ($w * $h)
    $q = New-Object int[] ($w * $h)
    $comp = New-Object int[] ($w * $h)
    for ($i = 0; $i -lt ($w * $h); $i++) {
        $py = [int][Math]::Floor($i / $w)
        $px = $i - ($py * $w)
        $pIdx = $py * $stride + $px * 4
        if ($bytes[$pIdx+3] -gt 0 -and (-not $visited[$i])) {
            $visited[$i] = $true
            $head = 0; $tail = 0
            $q[$tail] = $i; $tail++
            $cCount = 0
            while ($head -lt $tail) {
                $cur = $q[$head]; $head++
                $comp[$cCount] = $cur; $cCount++
                $cy = [int][Math]::Floor($cur / $w)
                $cx = $cur - ($cy * $w)
                for ($dy = -1; $dy -le 1; $dy++) {
                    $ny = $cy + $dy
                    if ($ny -lt 0 -or $ny -ge $h) { continue }
                    for ($dx = -1; $dx -le 1; $dx++) {
                        $nx = $cx + $dx
                        if ($nx -lt 0 -or $nx -ge $w) { continue }
                        $nPos = $ny * $w + $nx
                        if (-not $visited[$nPos]) {
                            $nIdx = $ny * $stride + $nx * 4
                            if ($bytes[$nIdx+3] -gt 0) {
                                $visited[$nPos] = $true
                                $q[$tail] = $nPos; $tail++
                            }
                        }
                    }
                }
            }
            if ($cCount -lt 12) {
                for ($k = 0; $k -lt $cCount; $k++) {
                    $pos = $comp[$k]
                    $ky = [int][Math]::Floor($pos / $w)
                    $kx = $pos - ($ky * $w)
                    $kIdx = $ky * $stride + $kx * 4
                    $bytes[$kIdx] = 0; $bytes[$kIdx+1] = 0; $bytes[$kIdx+2] = 0; $bytes[$kIdx+3] = 0
                }
            }
        }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    $bmp.UnlockBits($data)
    return $bmp
}

function Save-AlignedFourFrameStrip(
    [string]$sheetName,
    [string]$outName,
    [string]$alignMode, # 'top-horn', 'bottom', 'bottom-babci', 'bottom-doggie'
    [bool]$topHalfOnly,
    [bool]$stripEmmaJumpShadow,
    [int[]]$customSplits
) {
    $inPath = Join-Path $p6Dir $sheetName
    $outPath = Join-Path $p6Dir $outName
    $bmp = Load-CleanedBitmap -path $inPath -topHalfOnly $topHalfOnly -stripEmmaJumpShadow $stripEmmaJumpShadow
    $w = $bmp.Width
    $h = $bmp.Height
    $splits = $customSplits

    $rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = [Math]::Abs($data.Stride)
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    $bmp.UnlockBits($data)

    $bboxes = @()
    $anchorXs = @()
    $anchorYs = @()

    for ($i = 0; $i -lt 4; $i++) {
        $xStartBase = $splits[$i] + 2
        $xEndBase = $splits[$i+1] - 2
        $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
        for ($y = 0; $y -lt $h; $y++) {
            $xStart = $xStartBase
            $xEnd = $xEndBase
            # Stepped separator for p6_babci_emma_sheet.jpg between Frame 1 and Frame 2:
            # Above y=285 Babci's hand extends to x=552; below y=285 Emma's elbow starts at x=530
            if ($alignMode -eq 'bottom-babci') {
                if ($i -eq 1) {
                    $xEnd = if ($y -lt 285) { 556 } else { 520 }
                } elseif ($i -eq 2) {
                    $xStart = if ($y -lt 285) { 558 } else { 522 }
                }
            }
            # Stepped separator for p6_railing_doggie_sheet.jpg between Frame 2 and Frame 3:
            # Above y=130 "ALL ABOARD!" extends to x=785; below y=130 Frame 3 Doggie's tail starts at x=782
            if ($alignMode -eq 'bottom-doggie') {
                if ($i -eq 2) {
                    $xEnd = if ($y -lt 130) { 792 } else { 770 }
                } elseif ($i -eq 3) {
                    $xStart = if ($y -lt 130) { 794 } else { 772 }
                }
            }
            for ($x = $xStart; $x -lt $xEnd; $x++) {
                if ($bytes[$y * $stride + $x * 4 + 3] -gt 0) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
        $bboxes += [PSCustomObject]@{ MinX = $minX; MaxX = $maxX; MinY = $minY; MaxY = $maxY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }

        if ($alignMode -eq 'top-horn') {
            $hMinX = $w; $hMaxX = -1; $hMinY = $h
            for ($y = 35; $y -le 115; $y++) {
                for ($x = $xStart; $x -lt $xEnd; $x++) {
                    $idx = $y * $stride + $x * 4
                    if ($bytes[$idx+3] -gt 0) {
                        $b = [int]$bytes[$idx]
                        $gr = [int]$bytes[$idx+1]
                        $r = [int]$bytes[$idx+2]
                        if ($r -lt 95 -and $gr -lt 70 -and $b -lt 45) {
                            if ($x -lt $hMinX) { $hMinX = $x }
                            if ($x -gt $hMaxX) { $hMaxX = $x }
                            if ($y -lt $hMinY) { $hMinY = $y }
                        }
                    }
                }
            }
            $anchorXs += [int][Math]::Floor(($hMinX + $hMaxX) / 2)
            $anchorYs += $hMinY
        } elseif ($alignMode -eq 'bottom-babci') {
            # Anchor horizontally and vertically on Babci's lower legs/shoes (y > maxY - 120, right half of frame)
            # so Babci's wide outstretched left arm in Frame 1 doesn't shift Babci & Emma sideways!
            $midFrameX = [int][Math]::Floor(($minX + $maxX) / 2) - 10
            $babciMaxY = 0
            $bShoeMinX = $w; $bShoeMaxX = -1
            for ($y = ($maxY - 110); $y -le $maxY; $y++) {
                if ($y -lt 0) { continue }
                for ($x = $midFrameX; $x -le $maxX; $x++) {
                    if ($bytes[$y * $stride + $x * 4 + 3] -gt 0) {
                        if ($y -gt $babciMaxY) { $babciMaxY = $y }
                        if ($x -lt $bShoeMinX) { $bShoeMinX = $x }
                        if ($x -gt $bShoeMaxX) { $bShoeMaxX = $x }
                    }
                }
            }
            # Center anchor is 45px left of Babci's legs center (between Emma and Babci)
            $anchorXs += ([int][Math]::Floor(($bShoeMinX + $bShoeMaxX) / 2) - 45)
            $anchorYs += $babciMaxY
        } elseif ($alignMode -eq 'bottom-doggie') {
            $pMinX = $w; $pMaxX = -1
            for ($y = ($maxY - 55); $y -le $maxY; $y++) {
                if ($y -lt 0) { continue }
                for ($x = $minX; $x -le $maxX; $x++) {
                    if ($bytes[$y * $stride + $x * 4 + 3] -gt 0) {
                        if ($x -lt $pMinX) { $pMinX = $x }
                        if ($x -gt $pMaxX) { $pMaxX = $x }
                    }
                }
            }
            $anchorXs += [int][Math]::Floor(($pMinX + $pMaxX) / 2)
            $anchorYs += $maxY
        } else {
            $anchorXs += [int][Math]::Floor(($minX + $maxX) / 2)
            $anchorYs += $maxY
        }
    }

    if ($alignMode -eq 'top-horn') {
        $maxLeft = 0; $maxRight = 0; $maxAbove = 0; $maxBelow = 0
        for ($i = 0; $i -lt 4; $i++) {
            $bb = $bboxes[$i]
            $ax = $anchorXs[$i]
            $ay = $anchorYs[$i]
            if (($ax - $bb.MinX) -gt $maxLeft) { $maxLeft = $ax - $bb.MinX }
            if (($bb.MaxX - $ax) -gt $maxRight) { $maxRight = $bb.MaxX - $ax }
            if (($ay - $bb.MinY) -gt $maxAbove) { $maxAbove = $ay - $bb.MinY }
            if (($bb.MaxY - $ay) -gt $maxBelow) { $maxBelow = $bb.MaxY - $ay }
        }
        $halfW = [Math]::Max($maxLeft, $maxRight) + 4
        $frameW = $halfW * 2
        $hornTopInFrame = $maxAbove + 2
        $frameH = $hornTopInFrame + $maxBelow + 4

        $outBmp = [System.Drawing.Bitmap]::new($frameW * 4, $frameH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $gOut = [System.Drawing.Graphics]::FromImage($outBmp)
        for ($i = 0; $i -lt 4; $i++) {
            $bb = $bboxes[$i]
            $ax = $anchorXs[$i]
            $ay = $anchorYs[$i]
            $dx = $i * $frameW + ($halfW - ($ax - $bb.MinX))
            $dy = $hornTopInFrame - ($ay - $bb.MinY)
            $srcR = [System.Drawing.Rectangle]::new($bb.MinX, $bb.MinY, $bb.W, $bb.H)
            $dstR = [System.Drawing.Rectangle]::new($dx, $dy, $bb.W, $bb.H)
            $gOut.DrawImage($bmp, $dstR, $srcR, [System.Drawing.GraphicsUnit]::Pixel)
        }
        $gOut.Dispose()
        $outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $outBmp.Dispose()
        $bmp.Dispose()
        Write-Output "[OK] $outName : strip=$($frameW * 4)x$frameH, frameWidth=$frameW, frameHeight=$frameH (hornTopY=$hornTopInFrame)"
        return
    }

    $maxLeft = 0; $maxRight = 0; $maxAbove = 0; $maxBelow = 0
    for ($i = 0; $i -lt 4; $i++) {
        $bb = $bboxes[$i]
        $ax = $anchorXs[$i]
        $ay = $anchorYs[$i]
        if (($ax - $bb.MinX) -gt $maxLeft) { $maxLeft = $ax - $bb.MinX }
        if (($bb.MaxX - $ax) -gt $maxRight) { $maxRight = $bb.MaxX - $ax }
        if (($ay - $bb.MinY) -gt $maxAbove) { $maxAbove = $ay - $bb.MinY }
        if (($bb.MaxY - $ay) -gt $maxBelow) { $maxBelow = $bb.MaxY - $ay }
    }
    $halfW = [Math]::Max($maxLeft, $maxRight) + 4
    $frameW = $halfW * 2
    $frameH = $maxAbove + $maxBelow + 8
    $footYInFrame = $frameH - 4 - $maxBelow

    $outBmp = [System.Drawing.Bitmap]::new($frameW * 4, $frameH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $outRect = [System.Drawing.Rectangle]::new(0, 0, $frameW * 4, $frameH)
    $outData = $outBmp.LockBits($outRect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $outStride = [Math]::Abs($outData.Stride)
    $outBytes = New-Object byte[] ($outStride * $frameH)

    for ($i = 0; $i -lt 4; $i++) {
        $bb = $bboxes[$i]
        $ax = $anchorXs[$i]
        $ay = $anchorYs[$i]
        $dx = $i * $frameW + ($halfW - ($ax - $bb.MinX))
        $dy = $footYInFrame - ($ay - $bb.MinY)
        for ($sy = $bb.MinY; $sy -le $bb.MaxY; $sy++) {
            $xStart = $splits[$i] + 2
            $xEnd = $splits[$i+1] - 2
            if ($alignMode -eq 'bottom-babci') {
                if ($i -eq 1) {
                    $xEnd = if ($sy -lt 285) { 556 } else { 520 }
                } elseif ($i -eq 2) {
                    $xStart = if ($sy -lt 285) { 558 } else { 522 }
                }
            }
            if ($alignMode -eq 'bottom-doggie') {
                if ($i -eq 2) {
                    $xEnd = if ($sy -lt 130) { 792 } else { 770 }
                } elseif ($i -eq 3) {
                    $xStart = if ($sy -lt 130) { 794 } else { 772 }
                }
            }
            $ty = $dy + ($sy - $bb.MinY)
            if ($ty -lt 0 -or $ty -ge $frameH) { continue }
            for ($sx = $bb.MinX; $sx -le $bb.MaxX; $sx++) {
                if ($sx -lt $xStart -or $sx -ge $xEnd) { continue }
                $tx = $dx + ($sx - $bb.MinX)
                if ($tx -lt ($i * $frameW) -or $tx -ge (($i + 1) * $frameW)) { continue }
                $sIdx = $sy * $stride + $sx * 4
                if ($bytes[$sIdx+3] -gt 0) {
                    $dIdx = $ty * $outStride + $tx * 4
                    $outBytes[$dIdx] = $bytes[$sIdx]
                    $outBytes[$dIdx+1] = $bytes[$sIdx+1]
                    $outBytes[$dIdx+2] = $bytes[$sIdx+2]
                    $outBytes[$dIdx+3] = $bytes[$sIdx+3]
                }
            }
        }
    }
    [System.Runtime.InteropServices.Marshal]::Copy($outBytes, 0, $outData.Scan0, $outBytes.Length)
    $outBmp.UnlockBits($outData)
    $outBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outBmp.Dispose()
    $bmp.Dispose()
    Write-Output "[OK] $outName : strip=$($frameW * 4)x$frameH, frameWidth=$frameW, frameHeight=$frameH"
}

Save-AlignedFourFrameStrip -sheetName 'p6_wyatt_horn_sheet.jpg' -outName 'p6_wyatt_horn.png' -alignMode 'top-horn' -topHalfOnly $false -stripEmmaJumpShadow $false -customSplits @(0, 256, 512, 769, 1024)
Save-AlignedFourFrameStrip -sheetName 'p6_grandpa_cheer_sheet.jpg' -outName 'p6_grandpa_cheer.png' -alignMode 'bottom' -topHalfOnly $false -stripEmmaJumpShadow $false -customSplits @(0, 256, 512, 768, 1024)
Save-AlignedFourFrameStrip -sheetName 'p6_babci_emma_sheet.jpg' -outName 'p6_babci_emma.png' -alignMode 'bottom-babci' -topHalfOnly $false -stripEmmaJumpShadow $true -customSplits @(0, 250, 562, 775, 1024)
Save-AlignedFourFrameStrip -sheetName 'p6_railing_doggie_sheet.jpg' -outName 'p6_railing_doggie.png' -alignMode 'bottom-doggie' -topHalfOnly $true -stripEmmaJumpShadow $false -customSplits @(0, 256, 512, 795, 1024)
Save-AlignedFourFrameStrip -sheetName 'p6_river_otter_sheet.jpg' -outName 'p6_river_otter.png' -alignMode 'bottom' -topHalfOnly $false -stripEmmaJumpShadow $false -customSplits @(0, 256, 512, 768, 1024)

# 6. Generate Right Inner Orange Handrail Foreground Mask (`p6_handrail_foreground_mask.png`)
$cleanPlatePath = Join-Path $pagesDir 'p6-clean.jpg'
$srcPlate = [System.Drawing.Bitmap]::new($cleanPlatePath)
$srcW = $srcPlate.Width
$srcH = $srcPlate.Height

$cropX = 915
$cropY = 535
$cropW = 240 # 1155 - 915
$cropH = 185 # 720 - 535

$maskBmp = [System.Drawing.Bitmap]::new($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mRect = [System.Drawing.Rectangle]::new(0, 0, $cropW, $cropH)
$mData = $maskBmp.LockBits($mRect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mStride = [Math]::Abs($mData.Stride)
$mBytes = New-Object byte[] ($mStride * $cropH)

$sRect = [System.Drawing.Rectangle]::new(0, 0, $srcW, $srcH)
$sData = $srcPlate.LockBits($sRect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sStride = [Math]::Abs($sData.Stride)
$sBytes = New-Object byte[] ($sStride * $srcH)
[System.Runtime.InteropServices.Marshal]::Copy($sData.Scan0, $sBytes, 0, $sBytes.Length)
$srcPlate.UnlockBits($sData)

$orangeCore = New-Object bool[] ($cropW * $cropH)
$darkOutline = New-Object bool[] ($cropW * $cropH)

for ($y = 0; $y -lt $cropH; $y++) {
    $stageY = $cropY + $y
    $sy = [Math]::Min($srcH - 1, [int][Math]::Floor(($stageY + 0.5) * $srcH / 720.0))
    for ($x = 0; $x -lt $cropW; $x++) {
        $stageX = $cropX + $x
        $sx = [Math]::Min($srcW - 1, [int][Math]::Floor(($stageX + 0.5) * $srcW / 1280.0))
        $sIdx = $sy * $sStride + $sx * 4
        $b = [int]$sBytes[$sIdx]
        $g = [int]$sBytes[$sIdx+1]
        $r = [int]$sBytes[$sIdx+2]

        $dIdx = $y * $mStride + $x * 4
        $mBytes[$dIdx] = [byte]$b
        $mBytes[$dIdx+1] = [byte]$g
        $mBytes[$dIdx+2] = [byte]$r
        $mBytes[$dIdx+3] = 0

        # Exclude the train cabin vertical doorframe pillar (stageX > 980 and stageY < 595)
        # and the outer right railing above the inner slanted handrail (stageY < 540 + (stageX - 925) * 0.72)
        $innerRailTopLimit = 538.0 + ($stageX - 925.0) * 0.70
        if ($stageY -lt $innerRailTopLimit) {
            continue
        }

        $pos = $y * $cropW + $x
        # Include both the warm orange rail body and its bright golden-amber top specular highlight
        $isOrange = ($r -gt 145) -and ($g -gt 50) -and ($b -lt 115) -and ($r -gt ($g + 30)) -and ($g -gt ($b + 15))
        $isGreyFloor = ([Math]::Abs($r - $b) -lt 25)
        if ($isOrange -and (-not $isGreyFloor)) {
            $orangeCore[$pos] = $true
        }
        if ($r -lt 85 -and $g -lt 70 -and $b -lt 65) {
            $darkOutline[$pos] = $true
        }
    }
}

for ($y = 0; $y -lt $cropH; $y++) {
    for ($x = 0; $x -lt $cropW; $x++) {
        $pos = $y * $cropW + $x
        $keep = $orangeCore[$pos]
        if ((-not $keep) -and $darkOutline[$pos]) {
            for ($dy = -2; $dy -le 2 -and (-not $keep); $dy++) {
                $ny = $y + $dy
                if ($ny -lt 0 -or $ny -ge $cropH) { continue }
                for ($dx = -2; $dx -le 2; $dx++) {
                    $nx = $x + $dx
                    if ($nx -lt 0 -or $nx -ge $cropW) { continue }
                    if ($orangeCore[$ny * $cropW + $nx]) {
                        $keep = $true
                        break
                    }
                }
            }
        }
        $dIdx = $y * $mStride + $x * 4
        if ($keep) {
            $mBytes[$dIdx+3] = 255
        } else {
            $mBytes[$dIdx] = 0; $mBytes[$dIdx+1] = 0; $mBytes[$dIdx+2] = 0; $mBytes[$dIdx+3] = 0
        }
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($mBytes, 0, $mData.Scan0, $mBytes.Length)
$maskBmp.UnlockBits($mData)
$maskOutPath = Join-Path $p6Dir 'p6_handrail_foreground_mask.png'
$maskBmp.Save($maskOutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$maskBmp.Dispose()
$srcPlate.Dispose()
Write-Output "[OK] p6_handrail_foreground_mask.png : $($cropW)x$($cropH)"
