$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$pagesDir = Join-Path $rootDir 'public\assets\stories\colorado\pages'
$p7Dir = Join-Path $rootDir 'public\assets\stories\colorado\sprites\p7'

# 1. Stage p7-clean.jpg and backup any existing p7-gods.jpg / p7-gods.png
foreach ($oldName in @('p7-gods.jpg', 'p7-gods.png')) {
    $oldPath = Join-Path $pagesDir $oldName
    $bakName = $oldName.Replace('p7-gods.', 'p7-gods.v0.bak.')
    $bakPath = Join-Path $pagesDir $bakName
    if ((Test-Path $oldPath) -and (-not (Test-Path $bakPath))) {
        Copy-Item $oldPath $bakPath
    }
}

$cleanPlatePath = Join-Path $pagesDir 'p7-clean.jpg'
if (-not (Test-Path $cleanPlatePath)) {
    throw "Missing clean plate: $cleanPlatePath"
}

function Load-CleanedBitmap([string]$path, [bool]$stripGroundShadow) {
    $rawBmp = [System.Drawing.Bitmap]::new($path)
    $w = $rawBmp.Width
    $h = $rawBmp.Height

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

    # Shave 6px outer border + remove #FF00FF magenta & interior magenta holes
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $idx = $y * $stride + $x * 4
            $onOuterBorder = ($x -lt 6) -or ($x -ge ($w - 6)) -or ($y -lt 6) -or ($y -ge ($h - 6))
            if ($onOuterBorder) {
                $bytes[$idx] = 0; $bytes[$idx+1] = 0; $bytes[$idx+2] = 0; $bytes[$idx+3] = 0
                continue
            }

            $b = [int]$bytes[$idx]
            $gr = [int]$bytes[$idx+1]
            $r = [int]$bytes[$idx+2]

            # Primary #FF00FF magenta criteria (R > 175, G < 95, B > 175, R + B - 2*G > 190) + JPEG compression tolerance
            $isMag = ($r -gt 165) -and ($gr -lt 105) -and ($b -gt 165) -and (($r + $b - 2 * $gr) -gt 175)
            if ((-not $isMag) -and $stripGroundShadow) {
                # Strip dark-magenta floor shadow under shoes/jumping Emma
                if ($r -gt 110 -and $b -gt 110 -and $gr -lt 68 -and (($r + $b - 2 * $gr) -gt 130)) {
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

    # Remove tiny isolated <10px specks
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
            if ($cCount -lt 10) {
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

function Find-EmptyColumnSplits([byte[]]$bytes, [int]$stride, [int]$w, [int]$h) {
    $colCounts = New-Object int[] $w
    for ($x = 0; $x -lt $w; $x++) {
        $cnt = 0
        for ($y = 0; $y -lt $h; $y++) {
            if ($bytes[$y * $stride + $x * 4 + 3] -gt 0) { $cnt++ }
        }
        $colCounts[$x] = $cnt
    }

    $splits = @(0, 0, 0, 0, $w)
    for ($s = 1; $s -le 3; $s++) {
        $nom = [int][Math]::Floor(($s * $w) / 4)
        $searchMin = $nom - 95
        $searchMax = $nom + 95
        $bestX = $nom
        $bestCnt = 999999
        $bestDist = 999999
        for ($x = $searchMin; $x -le $searchMax; $x++) {
            $c = $colCounts[$x]
            $d = [Math]::Abs($x - $nom)
            if (($c -lt $bestCnt) -or (($c -eq $bestCnt) -and ($d -lt $bestDist))) {
                $bestCnt = $c
                $bestDist = $d
                $bestX = $x
            }
        }
        $splits[$s] = $bestX
    }
    return $splits
}

function Save-Page7Strip(
    [string]$sheetName,
    [string]$outName,
    [string]$alignMode, # 'bottom-grandparents', 'bottom-jump2', 'bottom', 'center'
    [bool]$stripGroundShadow
) {
    $inPath = Join-Path $p7Dir $sheetName
    $outPath = Join-Path $p7Dir $outName

    $bmp = Load-CleanedBitmap -path $inPath -stripGroundShadow $stripGroundShadow
    $w = $bmp.Width
    $h = $bmp.Height

    $rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = [Math]::Abs($data.Stride)
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    $bmp.UnlockBits($data)

    $splits = Find-EmptyColumnSplits -bytes $bytes -stride $stride -w $w -h $h

    $bboxes = @()
    $maxW = 0
    $maxH = 0
    for ($i = 0; $i -lt 4; $i++) {
        $xStartBase = $splits[$i]
        $xEndBase = $splits[$i+1]
        $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
        for ($y = 0; $y -lt $h; $y++) {
            $xStart = $xStartBase
            $xEnd = $xEndBase
            # Stepped separator between Frame 1 and Frame 2 in p7_grandparents_emma_sheet.jpg:
            # Above y=230 Babci's raised left hand extends to x=554; below y=230 Emma's hair in Frame 2 starts at x=536
            if ($alignMode -eq 'bottom-grandparents') {
                if ($i -eq 1) {
                    $xEnd = if ($y -lt 230) { 558 } else { 520 }
                } elseif ($i -eq 2) {
                    $xStart = if ($y -lt 230) { 559 } else { 521 }
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
        $bw = $maxX - $minX + 1
        $bh = $maxY - $minY + 1
        if ($bw -gt $maxW) { $maxW = $bw }
        if ($bh -gt $maxH) { $maxH = $bh }
        $bboxes += [PSCustomObject]@{ MinX = $minX; MaxX = $maxX; MinY = $minY; MaxY = $maxY; W = $bw; H = $bh }
    }

    # For jump-in-frame-2 sheets (Wyatt & Doggie), compute groundY from standing frames (0, 1, 3) so Frame 2 jumps UP
    $groundMaxY = 0
    if ($alignMode -eq 'bottom-jump2') {
        $groundMaxY = [Math]::Max($bboxes[0].MaxY, [Math]::Max($bboxes[1].MaxY, $bboxes[3].MaxY))
        $globalMinY = [Math]::Min([Math]::Min($bboxes[0].MinY, $bboxes[1].MinY), [Math]::Min($bboxes[2].MinY, $bboxes[3].MinY))
        $maxH = ($groundMaxY - $globalMinY + 1)
    }

    $frameW = $maxW + 8
    if (($frameW % 2) -eq 1) { $frameW++ }
    $frameH = $maxH + 8

    $outBmp = [System.Drawing.Bitmap]::new($frameW * 4, $frameH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $outRect = [System.Drawing.Rectangle]::new(0, 0, $frameW * 4, $frameH)
    $outData = $outBmp.LockBits($outRect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $outStride = [Math]::Abs($outData.Stride)
    $outBytes = New-Object byte[] ($outStride * $frameH)

    for ($i = 0; $i -lt 4; $i++) {
        $bb = $bboxes[$i]
        $dx = $i * $frameW + [int][Math]::Floor(($frameW - $bb.W) / 2)
        $dy = if ($alignMode -eq 'center') {
            [int][Math]::Floor(($frameH - $bb.H) / 2)
        } elseif ($alignMode -eq 'bottom-jump2' -and $i -eq 2) {
            # Keep Frame 2 elevated by its natural jump height above groundMaxY
            ($frameH - 4 - $bb.H) - [Math]::Max(0, ($groundMaxY - $bb.MaxY))
        } else {
            $frameH - 4 - $bb.H
        }

        for ($sy = $bb.MinY; $sy -le $bb.MaxY; $sy++) {
            $xStart = $splits[$i]
            $xEnd = $splits[$i+1]
            if ($alignMode -eq 'bottom-grandparents') {
                if ($i -eq 1) {
                    $xEnd = if ($sy -lt 230) { 558 } else { 520 }
                } elseif ($i -eq 2) {
                    $xStart = if ($sy -lt 230) { 559 } else { 521 }
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
    Write-Output "[OK] $outName : strip=$($frameW * 4)x$frameH, frameWidth=$frameW, frameHeight=$frameH (splits=$($splits -join ','))"
}

Save-Page7Strip -sheetName 'p7_grandparents_emma_sheet.jpg' -outName 'p7_grandparents_emma.png' -alignMode 'bottom-grandparents' -stripGroundShadow $true
Save-Page7Strip -sheetName 'p7_wyatt_point_sheet.jpg' -outName 'p7_wyatt_point.png' -alignMode 'bottom-jump2' -stripGroundShadow $true
Save-Page7Strip -sheetName 'p7_boulder_sparky_sheet.jpg' -outName 'p7_boulder_sparky.png' -alignMode 'bottom' -stripGroundShadow $false
Save-Page7Strip -sheetName 'p7_trail_doggie_sheet.jpg' -outName 'p7_trail_doggie.png' -alignMode 'bottom-jump2' -stripGroundShadow $false
Save-Page7Strip -sheetName 'p7_bluebirds_sheet.jpg' -outName 'p7_bluebirds.png' -alignMode 'center' -stripGroundShadow $false
