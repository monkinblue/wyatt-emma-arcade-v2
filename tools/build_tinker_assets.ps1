Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class TinkerV2AssetSlicer
{
    private static bool IsBorderMagenta(int r, int g, int b)
    {
        if (r > 155 && b > 145 && g < 110 && (r - g) > 50 && (b - g) > 45) return true;
        if ((r + b - 2 * g) > 145 && r > 140 && b > 130) return true;
        return false;
    }

    private static bool IsStrictInteriorMagenta(int r, int g, int b, bool protectPurpleToneBar)
    {
        if (protectPurpleToneBar)
        {
            return r > 210 && g < 60 && b > 205 && Math.Abs(r - b) < 40 && (r + b - 2 * g) > 310;
        }
        return r > 135 && g < 88 && b > 130 && Math.Abs(r - b) < 42 && (r + b - 2 * g) > 155;
    }

    public static Bitmap ClearMagentaAndCrop(Bitmap src, bool clearInteriorHoles, bool protectPurpleToneBar = false)
    {
        int w = src.Width;
        int h = src.Height;
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.DrawImage(src, 0, 0, w, h);
        }

        Rectangle rect = new Rectangle(0, 0, w, h);
        BitmapData data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

        bool[] visited = new bool[w * h];
        Queue<int> q = new Queue<int>();

        for (int x = 0; x < w; x++)
        {
            int[] ys = new int[] { 0, h - 1 };
            foreach (int y in ys)
            {
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsBorderMagenta(bytes[off + 2], bytes[off + 1], bytes[off]))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }
        for (int y = 0; y < h; y++)
        {
            int[] xs = new int[] { 0, w - 1 };
            foreach (int x in xs)
            {
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsBorderMagenta(bytes[off + 2], bytes[off + 1], bytes[off]))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }

        if (clearInteriorHoles)
        {
            for (int y = 1; y < h - 1; y++)
            {
                int rowOff = y * stride;
                int rowIdx = y * w;
                for (int x = 1; x < w - 1; x++)
                {
                    int idx = rowIdx + x;
                    if (!visited[idx])
                    {
                        int off = rowOff + x * 4;
                        int b = bytes[off];
                        int g = bytes[off + 1];
                        int r = bytes[off + 2];
                        if (IsStrictInteriorMagenta(r, g, b, protectPurpleToneBar))
                        {
                            visited[idx] = true;
                            q.Enqueue(idx);
                        }
                    }
                }
            }
        }

        while (q.Count > 0)
        {
            int curr = q.Dequeue();
            int cx = curr % w;
            int cy = curr / w;
            int off = cy * stride + cx * 4;
            bytes[off] = 0;
            bytes[off + 1] = 0;
            bytes[off + 2] = 0;
            bytes[off + 3] = 0;

            int[] nxArr = new int[] { cx - 1, cx + 1, cx, cx };
            int[] nyArr = new int[] { cy, cy, cy - 1, cy + 1 };
            for (int i = 0; i < 4; i++)
            {
                int nx = nxArr[i];
                int ny = nyArr[i];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h)
                {
                    int nidx = ny * w + nx;
                    if (!visited[nidx])
                    {
                        int noff = ny * stride + nx * 4;
                        if (IsBorderMagenta(bytes[noff + 2], bytes[noff + 1], bytes[noff]))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // 2px perimeter de-spill pass
        for (int pass = 0; pass < 2; pass++)
        {
            byte[] alphaSnap = new byte[w * h];
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                int rowIdx = y * w;
                for (int x = 0; x < w; x++)
                {
                    alphaSnap[rowIdx + x] = bytes[rowOff + x * 4 + 3];
                }
            }

            for (int y = 1; y < h - 1; y++)
            {
                int rowOff = y * stride;
                int rowIdx = y * w;
                for (int x = 1; x < w - 1; x++)
                {
                    if (alphaSnap[rowIdx + x] == 0) continue;
                    bool hasTrans =
                        alphaSnap[rowIdx + x - 1] == 0 ||
                        alphaSnap[rowIdx + x + 1] == 0 ||
                        alphaSnap[(y - 1) * w + x] == 0 ||
                        alphaSnap[(y + 1) * w + x] == 0;

                    if (hasTrans)
                    {
                        int off = rowOff + x * 4;
                        int b = bytes[off];
                        int g = bytes[off + 1];
                        int r = bytes[off + 2];
                        if ((r + b - 2 * g) > 130 && r > 145 && b > 135)
                        {
                            bytes[off] = 0;
                            bytes[off + 1] = 0;
                            bytes[off + 2] = 0;
                            bytes[off + 3] = 0;
                        }
                        else if ((r + b - 2 * g) > 75 && r > g + 25 && b > g + 20)
                        {
                            bytes[off] = (byte)g;
                            bytes[off + 2] = (byte)g;
                        }
                    }
                }
            }
        }

        // Keep largest connected component to eliminate any stray border specks
        bool[] compVisited = new bool[w * h];
        List<int> bestComp = new List<int>();
        Queue<int> cq = new Queue<int>();
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            int rowIdx = y * w;
            for (int x = 0; x < w; x++)
            {
                int idx = rowIdx + x;
                if (!compVisited[idx] && bytes[rowOff + x * 4 + 3] > 20)
                {
                    List<int> comp = new List<int>();
                    compVisited[idx] = true;
                    cq.Enqueue(idx);
                    while (cq.Count > 0)
                    {
                        int curr = cq.Dequeue();
                        comp.Add(curr);
                        int cx = curr % w;
                        int cy = curr / w;
                        for (int dy = -1; dy <= 1; dy++)
                        {
                            int ny = cy + dy;
                            if (ny < 0 || ny >= h) continue;
                            for (int dx = -1; dx <= 1; dx++)
                            {
                                if (dx == 0 && dy == 0) continue;
                                int nx = cx + dx;
                                if (nx < 0 || nx >= w) continue;
                                int nidx = ny * w + nx;
                                if (!compVisited[nidx] && bytes[ny * stride + nx * 4 + 3] > 20)
                                {
                                    compVisited[nidx] = true;
                                    cq.Enqueue(nidx);
                                }
                            }
                        }
                    }
                    if (comp.Count > bestComp.Count) bestComp = comp;
                }
            }
        }

        if (bestComp.Count > 0)
        {
            bool[] keep = new bool[w * h];
            foreach (int idx in bestComp) keep[idx] = true;
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                int rowIdx = y * w;
                for (int x = 0; x < w; x++)
                {
                    if (!keep[rowIdx + x])
                    {
                        int off = rowOff + x * 4;
                        bytes[off] = 0;
                        bytes[off + 1] = 0;
                        bytes[off + 2] = 0;
                        bytes[off + 3] = 0;
                    }
                }
            }
        }

        int minX = w, minY = h, maxX = 0, maxY = 0;
        bool found = false;
        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            for (int x = 0; x < w; x++)
            {
                if (bytes[rowOff + x * 4 + 3] > 15)
                {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bmp.UnlockBits(data);

        if (!found) return bmp;

        int pad = 4;
        int cx0 = Math.Max(0, minX - pad);
        int cy0 = Math.Max(0, minY - pad);
        int cx1 = Math.Min(w, maxX + 1 + pad);
        int cy1 = Math.Min(h, maxY + 1 + pad);
        int cw = Math.Max(1, cx1 - cx0);
        int ch = Math.Max(1, cy1 - cy0);

        Bitmap cropped = new Bitmap(cw, ch, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(cropped))
        {
            g.DrawImage(bmp, new Rectangle(0, 0, cw, ch), new Rectangle(cx0, cy0, cw, ch), GraphicsUnit.Pixel);
        }
        bmp.Dispose();
        return cropped;
    }

    public static Bitmap CropCell(Bitmap sheet, int row, int col, int rows, int cols, int margin)
    {
        int cw = sheet.Width / cols;
        int ch = sheet.Height / rows;
        int x0 = col * cw + margin;
        int y0 = row * ch + margin;
        int w = cw - margin * 2;
        int h = ch - margin * 2;
        Bitmap dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dst))
        {
            g.DrawImage(sheet, new Rectangle(0, 0, w, h), new Rectangle(x0, y0, w, h), GraphicsUnit.Pixel);
        }
        return dst;
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = "c:\projects\Wyatt and Emma Arcade v2"
$gameDir = Join-Path $rootDir "public\assets\games\tinker-workshop"
$rawDir = Join-Path $gameDir "raw"
$spritesDir = Join-Path $gameDir "sprites"
$artifactDir = "C:\Users\RobaD\.gemini\antigravity\brain\d731b024-1448-420e-8f0e-2343b446ea87"

New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

$stagedMap = @{
  "tinker-bg-v2-raw.jpg"             = Join-Path $artifactDir "tinker_bg_v2_raw_1793762992833.jpg"
  "tinker-contraptions-v2-raw.jpg"   = Join-Path $artifactDir "tinker_contraptions_v2_raw_1793763009620.jpg"
  "tinker-actors-marbles-v2-raw.jpg" = Join-Path $artifactDir "tinker_actors_marbles_v2_raw_notext_1793763047440.jpg"
  "tinker-cannon-trash-raw.jpg"      = Join-Path $artifactDir "tinker_cannon_trash_raw_1793766135319.jpg"
}

foreach ($entry in $stagedMap.GetEnumerator()) {
  $dst = Join-Path $rawDir $entry.Key
  if (Test-Path $entry.Value) {
    Copy-Item -Path $entry.Value -Destination $dst -Force
    Write-Host "  [STAGED RAW] $($entry.Key)"
  }
}

# 1. Build tinker-bg-v2.png (1280x720) with full-width bottom parts dock (x: 26..1254, y: 604..714)
$bgRawPath = Join-Path $rawDir "tinker-bg-v2-raw.jpg"
$bgOutPng = Join-Path $gameDir "tinker-bg-v2.png"
$bgOutJpg = Join-Path $gameDir "tinker-frame-bg.jpg"

if (Test-Path $bgRawPath) {
  $rawBg = New-Object System.Drawing.Bitmap($bgRawPath)
  $bg1280 = New-Object System.Drawing.Bitmap(1280, 720, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $gBg = [System.Drawing.Graphics]::FromImage($bg1280)
  $gBg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gBg.DrawImage($rawBg, 0, 0, 1280, 720)
  $rawBg.Dispose()

  # Expand the recessed brass-rimmed dock tray cleanly across x: 26..1254, y: 604..714 using 3-slice (left cap, center stretch, right cap)
  $dockY = 602
  $dockH = 114
  $leftCap = [TinkerV2AssetSlicer]::CropCell($bg1280, 0, 0, 1, 1, 0)
  $leftCap.Dispose()

  $gBg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  # Left brass rim cap (from x=278..310 -> x=24..56)
  $gBg.DrawImage($bg1280, (New-Object System.Drawing.Rectangle(24, $dockY, 32, $dockH)), (New-Object System.Drawing.Rectangle(278, $dockY, 32, $dockH)), [System.Drawing.GraphicsUnit]::Pixel)
  # Right brass rim cap (from x=970..1002 -> x=1224..1256)
  $gBg.DrawImage($bg1280, (New-Object System.Drawing.Rectangle(1224, $dockY, 32, $dockH)), (New-Object System.Drawing.Rectangle(970, $dockY, 32, $dockH)), [System.Drawing.GraphicsUnit]::Pixel)
  # Center recessed tray body (from x=310..970 -> x=56..1224)
  $gBg.DrawImage($bg1280, (New-Object System.Drawing.Rectangle(56, $dockY, 1168, $dockH)), (New-Object System.Drawing.Rectangle(310, $dockY, 660, $dockH)), [System.Drawing.GraphicsUnit]::Pixel)
  $gBg.Dispose()

  $bg1280.Save($bgOutPng, [System.Drawing.Imaging.ImageFormat]::Png)
  $jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95L)
  $bg1280.Save($bgOutJpg, $jpgCodec, $encParams)
  $bg1280.Dispose()
  Write-Host "  [SAVED BG] tinker-bg-v2.png & tinker-frame-bg.jpg (1280x720)"
}

# 2. Slice 2x4 Contraptions Sheet
$cRawPath = Join-Path $rawDir "tinker-contraptions-v2-raw.jpg"
if (Test-Path $cRawPath) {
  $cSheet = New-Object System.Drawing.Bitmap($cRawPath)
  $cSpecs = @(
    @{ Name = "part-ramp.png";         R = 0; C = 0; Holes = $true;  Aliases = @("part-chute.png") },
    @{ Name = "part-bowl.png";         R = 0; C = 1; Holes = $true;  Aliases = @() },
    @{ Name = "part-drum-bumper.png";  R = 0; C = 2; Holes = $true;  Aliases = @("part-trampoline.png", "prop-bumper.png") },
    @{ Name = "part-paddle-wheel.png"; R = 0; C = 3; Holes = $true;  Aliases = @("part-gear.png") },
    @{ Name = "part-chime-bar.png";    R = 1; C = 0; Holes = $true;  Aliases = @() },
    @{ Name = "part-funnel.png";       R = 1; C = 1; Holes = $true;  Aliases = @() },
    @{ Name = "part-bellows.png";      R = 1; C = 2; Holes = $true;  Aliases = @() },
    @{ Name = "part-seesaw.png";       R = 1; C = 3; Holes = $true;  Aliases = @() }
  )
  foreach ($s in $cSpecs) {
    $cell = [TinkerV2AssetSlicer]::CropCell($cSheet, $s.R, $s.C, 2, 4, 8)
    $protectPurple = ($s.Name -eq "part-chime-bar.png")
    $clean = [TinkerV2AssetSlicer]::ClearMagentaAndCrop($cell, $s.Holes, $protectPurple)
    $cell.Dispose()
    $outPath = Join-Path $spritesDir $s.Name
    $clean.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    foreach ($al in $s.Aliases) {
      $alPath = Join-Path $spritesDir $al
      $clean.Save($alPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    Write-Host "  [SAVED CONTRAPTION] $($s.Name) ($($clean.Width)x$($clean.Height))"
    $clean.Dispose()
  }
  $cSheet.Dispose()
}

# 3. Slice 2x4 Actors & Marbles Sheet
$aRawPath = Join-Path $rawDir "tinker-actors-marbles-v2-raw.jpg"
if (Test-Path $aRawPath) {
  $aSheet = New-Object System.Drawing.Bitmap($aRawPath)
  $aSpecs = @(
    @{ Name = "marble-cobalt.png";   R = 0; C = 0; Holes = $false; Aliases = @("prop-marble.png") },
    @{ Name = "marble-comet.png";    R = 0; C = 1; Holes = $false; Aliases = @() },
    @{ Name = "marble-steel.png";    R = 0; C = 2; Holes = $false; Aliases = @() },
    @{ Name = "marble-emerald.png";  R = 0; C = 3; Holes = $false; Aliases = @("prop-acorn.png") },
    @{ Name = "sparky-hopper-1.png"; R = 1; C = 0; Holes = $true;  Aliases = @("sparky-hopper-2.png", "sparky-hopper-3.png", "tinker-sparky-0.png", "tinker-sparky-1.png", "tinker-sparky-2.png") },
    @{ Name = "doggie-cart-1.png";   R = 1; C = 1; Holes = $true;  Aliases = @("tinker-doggie-0.png") },
    @{ Name = "doggie-cart-2.png";   R = 1; C = 2; Holes = $true;  Aliases = @("doggie-cart-3.png", "tinker-doggie-1.png", "tinker-doggie-2.png") },
    @{ Name = "prop-star.png";       R = 1; C = 3; Holes = $false; Aliases = @() }
  )
  foreach ($s in $aSpecs) {
    $cell = [TinkerV2AssetSlicer]::CropCell($aSheet, $s.R, $s.C, 2, 4, 8)
    $clean = [TinkerV2AssetSlicer]::ClearMagentaAndCrop($cell, $s.Holes)
    $cell.Dispose()
    $outPath = Join-Path $spritesDir $s.Name
    $clean.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    foreach ($al in $s.Aliases) {
      $alPath = Join-Path $spritesDir $al
      $clean.Save($alPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    Write-Host "  [SAVED ACTOR/MARBLE] $($s.Name) ($($clean.Width)x$($clean.Height))"
    $clean.Dispose()
  }
  $aSheet.Dispose()
}

# 4. Slice 1x2 Brass Spring Cannon & Brass Workshop Trash Can Sheet
$ctRawPath = Join-Path $rawDir "tinker-cannon-trash-raw.jpg"
if (Test-Path $ctRawPath) {
  $ctSheet = New-Object System.Drawing.Bitmap($ctRawPath)
  $ctSpecs = @(
    @{ Name = "part-cannon.png";      R = 0; C = 0; Holes = $true; Aliases = @("part-seesaw.png") },
    @{ Name = "tinker-trash-can.png"; R = 0; C = 1; Holes = $true; Aliases = @("tinker-action-clear.png") }
  )
  foreach ($s in $ctSpecs) {
    $cell = [TinkerV2AssetSlicer]::CropCell($ctSheet, $s.R, $s.C, 1, 2, 12)
    $clean = [TinkerV2AssetSlicer]::ClearMagentaAndCrop($cell, $s.Holes)
    $cell.Dispose()
    $outPath = Join-Path $spritesDir $s.Name
    $clean.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    foreach ($al in $s.Aliases) {
      $alPath = Join-Path $spritesDir $al
      $clean.Save($alPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    Write-Host "  [SAVED CANNON/TRASH] $($s.Name) ($($clean.Width)x$($clean.Height))"
    $clean.Dispose()
  }
  $ctSheet.Dispose()
}
