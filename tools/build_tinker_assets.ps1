Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class TinkerAssetBuilder
{
    private static bool IsMagenta(int r, int g, int b)
    {
        return r > 155 && g < 92 && b > 145 && (r + b) > (g * 3.0);
    }

    private static bool IsInteriorMagentaHole(int r, int g, int b)
    {
        return r > 138 && g < 86 && b > 128 && (r + b) > (g * 3.05) && Math.Abs(r - b) < 65;
    }

    public static Bitmap ClearMagentaAndDespill(Bitmap src, bool clearInteriorHoles, bool fillInternalMagentaPinholes)
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

        // 1. Seed outer borders
        for (int x = 0; x < w; x++)
        {
            int[] ys = new int[] { 0, h - 1 };
            foreach (int y in ys)
            {
                int idx = y * w + x;
                int off = y * stride + x * 4;
                if (!visited[idx] && IsMagenta(bytes[off + 2], bytes[off + 1], bytes[off]))
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
                if (!visited[idx] && IsMagenta(bytes[off + 2], bytes[off + 1], bytes[off]))
                {
                    visited[idx] = true;
                    q.Enqueue(idx);
                }
            }
        }

        // 2. Seed enclosed interior #FF00FF holes (peg holes, gear centers, spring gaps, basket slats, trophy handles)
        if (clearInteriorHoles)
        {
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                int rowIdx = y * w;
                for (int x = 0; x < w; x++)
                {
                    int idx = rowIdx + x;
                    if (!visited[idx])
                    {
                        int off = rowOff + x * 4;
                        int b = bytes[off];
                        int g = bytes[off + 1];
                        int r = bytes[off + 2];
                        if (IsInteriorMagentaHole(r, g, b))
                        {
                            visited[idx] = true;
                            q.Enqueue(idx);
                        }
                    }
                }
            }
        }

        // 3. BFS flood-fill
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
                        if (IsMagenta(bytes[noff + 2], bytes[noff + 1], bytes[noff]))
                        {
                            visited[nidx] = true;
                            q.Enqueue(nidx);
                        }
                    }
                }
            }
        }

        // Optional: fill any interior magenta pinholes inside circular medallions with dark bronze #23170d
        if (fillInternalMagentaPinholes)
        {
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int off = rowOff + x * 4;
                    if (bytes[off + 3] == 0) continue;
                    int b = bytes[off];
                    int g = bytes[off + 1];
                    int r = bytes[off + 2];
                    if (IsMagenta(r, g, b))
                    {
                        bytes[off] = 0x0d;
                        bytes[off + 1] = 0x17;
                        bytes[off + 2] = 0x23;
                        bytes[off + 3] = 255;
                    }
                }
            }
        }
        else
        {
            // Convert pink glow around sparkles/acorns/stars into warm golden glow
            for (int y = 0; y < h; y++)
            {
                int rowOff = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int off = rowOff + x * 4;
                    if (bytes[off + 3] == 0) continue;
                    int b = bytes[off];
                    int g = bytes[off + 1];
                    int r = bytes[off + 2];
                    if (r > 185 && b > 130 && r > g + 35 && b > g + 18)
                    {
                        if (g < 95)
                        {
                            bytes[off] = 0;
                            bytes[off + 1] = 0;
                            bytes[off + 2] = 0;
                            bytes[off + 3] = 0;
                        }
                        else
                        {
                            int newG = Math.Min(240, Math.Max(190, g + 50));
                            int newB = Math.Min(110, g / 2);
                            int newA = Math.Min(240, Math.Max(65, (g - 85) * 2));
                            bytes[off] = (byte)newB;
                            bytes[off + 1] = (byte)newG;
                            bytes[off + 2] = 255;
                            bytes[off + 3] = (byte)newA;
                        }
                    }
                }
            }
        }

        // 4. 2px perimeter de-spill (warm gold where R>200, G>90; neutral charcoal where G<85 and R>G+25)
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

        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            int rowIdx = y * w;
            for (int x = 0; x < w; x++)
            {
                if (alphaSnap[rowIdx + x] == 0) continue;

                bool nearTrans = false;
                for (int dy = -2; dy <= 2 && !nearTrans; dy++)
                {
                    int ny = y + dy;
                    for (int dx = -2; dx <= 2; dx++)
                    {
                        int nx = x + dx;
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h || alphaSnap[ny * w + nx] == 0)
                        {
                            nearTrans = true;
                            break;
                        }
                    }
                }

                if (nearTrans)
                {
                    int off = rowOff + x * 4;
                    int b = bytes[off];
                    int g = bytes[off + 1];
                    int r = bytes[off + 2];
                    if (r > 200 && g > 90 && b > g + 20)
                    {
                        bytes[off] = 80;
                        bytes[off + 1] = 200;
                        bytes[off + 2] = 255;
                    }
                    else if (g < 85 && r > g + 25)
                    {
                        bytes[off] = (byte)g;
                        bytes[off + 2] = (byte)g;
                    }
                    else if (r > g + 40 && b > g + 40)
                    {
                        bytes[off] = (byte)g;
                        bytes[off + 2] = (byte)g;
                    }
                }
            }
        }

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bmp.UnlockBits(data);
        return bmp;
    }

    public static Bitmap KeepLargestConnectedComponent(Bitmap src)
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
        List<int> bestComp = new List<int>();
        Queue<int> q = new Queue<int>();

        for (int y = 0; y < h; y++)
        {
            int rowOff = y * stride;
            int rowIdx = y * w;
            for (int x = 0; x < w; x++)
            {
                int idx = rowIdx + x;
                if (!visited[idx] && bytes[rowOff + x * 4 + 3] > 15)
                {
                    List<int> comp = new List<int>();
                    visited[idx] = true;
                    q.Enqueue(idx);
                    while (q.Count > 0)
                    {
                        int curr = q.Dequeue();
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
                                if (!visited[nidx] && bytes[ny * stride + nx * 4 + 3] > 15)
                                {
                                    visited[nidx] = true;
                                    q.Enqueue(nidx);
                                }
                            }
                        }
                    }
                    if (comp.Count > bestComp.Count)
                    {
                        bestComp = comp;
                    }
                }
            }
        }

        bool[] keep = new bool[w * h];
        foreach (int idx in bestComp)
        {
            keep[idx] = true;
        }

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

        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bmp.UnlockBits(data);
        return bmp;
    }

    public static Rectangle TightBBox(Bitmap bmp, int x0, int y0, int x1, int y1)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        x0 = Math.Max(0, x0);
        y0 = Math.Max(0, y0);
        x1 = Math.Min(w, x1);
        y1 = Math.Min(h, y1);

        BitmapData data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        bmp.UnlockBits(data);

        int minX = x1, minY = y1, maxX = x0, maxY = y0;
        bool found = false;
        for (int y = y0; y < y1; y++)
        {
            int rowOff = y * stride;
            for (int x = x0; x < x1; x++)
            {
                if (bytes[rowOff + x * 4 + 3] > 10)
                {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (!found) return new Rectangle(x0, y0, Math.Max(1, x1 - x0), Math.Max(1, y1 - y0));
        return new Rectangle(minX, minY, (maxX - minX) + 1, (maxY - minY) + 1);
    }

    public static Bitmap CropRegion(Bitmap src, Rectangle rect)
    {
        Bitmap dst = new Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dst))
        {
            g.DrawImage(src, new Rectangle(0, 0, rect.Width, rect.Height), rect, GraphicsUnit.Pixel);
        }
        return dst;
    }

    public static int FindBottomSpoutCenterX(Bitmap bmp)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        long sumX = 0;
        long count = 0;
        for (int y = Math.Max(0, h - 18); y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                Color c = bmp.GetPixel(x, y);
                if (c.A > 40)
                {
                    sumX += x;
                    count++;
                }
            }
        }
        return count > 0 ? (int)Math.Round(sumX / (double)count) : (w / 2);
    }

    public static void CompositeRightBasket(Bitmap f0, Bitmap f2)
    {
        int w = Math.Min(f0.Width, f2.Width);
        int h = Math.Min(f0.Height, f2.Height);
        // In Frame 0, the right-side catcher basket sits from x = 58%..100%, y = 52%..93%
        int startX = (int)Math.Round(w * 0.57);
        int startY = (int)Math.Round(h * 0.52);
        for (int y = startY; y < h; y++)
        {
            for (int x = startX; x < w; x++)
            {
                Color c0 = f0.GetPixel(x, y);
                if (c0.A > 20)
                {
                    f2.SetPixel(x, y, c0);
                }
            }
        }
    }

    public static Bitmap RotateBitmap(Bitmap src, float angleDegreesCW)
    {
        double rad = angleDegreesCW * Math.PI / 180.0;
        double cos = Math.Abs(Math.Cos(rad));
        double sin = Math.Abs(Math.Sin(rad));
        int newW = (int)Math.Ceiling(src.Width * cos + src.Height * sin) + 16;
        int newH = (int)Math.Ceiling(src.Width * sin + src.Height * cos) + 16;

        Bitmap dst = new Bitmap(newW, newH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dst))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TranslateTransform(newW / 2.0f, newH / 2.0f);
            g.RotateTransform(angleDegreesCW);
            g.TranslateTransform(-src.Width / 2.0f, -src.Height / 2.0f);
            g.DrawImage(src, 0, 0, src.Width, src.Height);
        }
        return dst;
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = "c:\projects\Wyatt and Emma Arcade v2"
$spritesDir = Join-Path $rootDir "public\assets\games\tinker-workshop\sprites"
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

# 1. Composite tinker-frame-bg.jpg (1280x720)
$frameBgPath = Join-Path $rootDir "public\assets\games\art-studio\studio-frame-bg.jpg"
$wallRawPath = Join-Path $rootDir "public\assets\games\tinker-workshop\raw\tinker-wall-bg.jpg"
$outFramePath = Join-Path $rootDir "public\assets\games\tinker-workshop\tinker-frame-bg.jpg"

$frameBmp = New-Object System.Drawing.Bitmap($frameBgPath)
$wallRawBmp = New-Object System.Drawing.Bitmap($wallRawPath)

$wall1280 = New-Object System.Drawing.Bitmap(1280, 720, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gWall1280 = [System.Drawing.Graphics]::FromImage($wall1280)
$gWall1280.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gWall1280.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gWall1280.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gWall1280.DrawImage($wallRawBmp, (New-Object System.Drawing.Rectangle(0, 0, 1280, 720)), (New-Object System.Drawing.Rectangle(0, 0, $wallRawBmp.Width, $wallRawBmp.Height)), [System.Drawing.GraphicsUnit]::Pixel)
$gWall1280.Dispose()
$wallRawBmp.Dispose()

$outFrameBmp = New-Object System.Drawing.Bitmap(1280, 720, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gOut = [System.Drawing.Graphics]::FromImage($outFrameBmp)
$gOut.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gOut.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gOut.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gOut.DrawImage($frameBmp, 0, 0, 1280, 720)

$srcCropRect = New-Object System.Drawing.Rectangle(68, 12, (1212 - 68), (708 - 12))
$dstWindowRect = New-Object System.Drawing.Rectangle(172, 28, 936, 560)
$gOut.DrawImage($wall1280, $dstWindowRect, $srcCropRect, [System.Drawing.GraphicsUnit]::Pixel)
$gOut.Dispose()
$wall1280.Dispose()
$frameBmp.Dispose()

# Cleanly blend out the 2 outer wall-edge peg columns (x=251 and x=1027) using adjacent walnut wood grain
# so the pegboard displays an exact 8 columns x 5 rows (40 pegs) at:
# X = [337, 422, 509, 596, 684, 770, 856, 943], Y = [193, 264, 336, 407, 478]
$pegRowsY = @(193, 264, 336, 407, 478)
foreach ($py in $pegRowsY) {
  for ($dy = -18; $dy -le 22; $dy++) {
    $y = $py + $dy
    $srcY = $py - 34 + [int](($dy + 18) * 0.35)
    for ($dx = -18; $dx -le 18; $dx++) {
      $cLeft = $outFrameBmp.GetPixel(251 + $dx, $srcY)
      $outFrameBmp.SetPixel(251 + $dx, $y, $cLeft)
      $cRight = $outFrameBmp.GetPixel(1027 + $dx, $srcY)
      $outFrameBmp.SetPixel(1027 + $dx, $y, $cRight)
    }
  }
}

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95L)
$outFrameBmp.Save($outFramePath, $jpgCodec, $encParams)
$outFrameBmp.Dispose()
Write-Host "Saved tinker-frame-bg.jpg (1280x720)"

# 2. Slice tinker-parts-raw.jpg (11 items)
$partsRawPath = Join-Path $rootDir "public\assets\games\tinker-workshop\raw\tinker-parts-raw.jpg"
$partsRawBmp = New-Object System.Drawing.Bitmap($partsRawPath)
$pw = $partsRawBmp.Width
$ph = $partsRawBmp.Height

$partSpecs = @(
  @{ Name = "part-chute.png";      X0 = 0.00; X1 = 0.38; Y0 = 0.00; Y1 = 0.30; LCC = $true },
  @{ Name = "part-gear.png";       X0 = 0.38; X1 = 0.62; Y0 = 0.00; Y1 = 0.30; LCC = $true },
  @{ Name = "part-seesaw.png";     X0 = 0.62; X1 = 1.00; Y0 = 0.00; Y1 = 0.27; LCC = $true },
  @{ Name = "part-flipper.png";    X0 = 0.00; X1 = 0.33; Y0 = 0.27; Y1 = 0.58; LCC = $true },
  @{ Name = "part-trampoline.png"; X0 = 0.36; X1 = 0.66; Y0 = 0.30; Y1 = 0.59; LCC = $true },
  @{ Name = "part-bellows.png";    X0 = 0.68; X1 = 1.00; Y0 = 0.26; Y1 = 0.56; LCC = $true },
  @{ Name = "prop-marble.png";     X0 = 0.00; X1 = 0.20; Y0 = 0.58; Y1 = 1.00; LCC = $true },
  @{ Name = "prop-acorn.png";      X0 = 0.20; X1 = 0.40; Y0 = 0.58; Y1 = 1.00; LCC = $true },
  @{ Name = "prop-bumper.png";     X0 = 0.40; X1 = 0.61; Y0 = 0.58; Y1 = 1.00; LCC = $true },
  @{ Name = "prop-star.png";       X0 = 0.61; X1 = 0.83; Y0 = 0.58; Y1 = 1.00; LCC = $false },
  @{ Name = "prop-chain.png";      X0 = 0.83; X1 = 1.00; Y0 = 0.54; Y1 = 1.00; LCC = $true }
)

foreach ($spec in $partSpecs) {
  $sx = [int][Math]::Round($pw * $spec.X0)
  $ex = [int][Math]::Round($pw * $spec.X1)
  $sy = [int][Math]::Round($ph * $spec.Y0)
  $ey = [int][Math]::Round($ph * $spec.Y1)
  $cropRect = New-Object System.Drawing.Rectangle($sx, $sy, ($ex - $sx), ($ey - $sy))
  $subRaw = [TinkerAssetBuilder]::CropRegion($partsRawBmp, $cropRect)
  $subClean = [TinkerAssetBuilder]::ClearMagentaAndDespill($subRaw, $true, $false)
  $subRaw.Dispose()

  if ($spec.LCC) {
    $lcc = [TinkerAssetBuilder]::KeepLargestConnectedComponent($subClean)
    $subClean.Dispose()
    $subClean = $lcc
  }

  $bbox = [TinkerAssetBuilder]::TightBBox($subClean, 0, 0, $subClean.Width, $subClean.Height)
  $finalBmp = [TinkerAssetBuilder]::CropRegion($subClean, $bbox)
  $subClean.Dispose()

  # Rotate part-seesaw.png +14 deg clockwise so the wooden plank is HORIZONTAL (0 deg)
  # in its neutral sprite image with the circular brass peg-hole pivot centered at (0.5, 0.5)
  if ($spec.Name -eq "part-seesaw.png") {
    $rotSeesaw = [TinkerAssetBuilder]::RotateBitmap($finalBmp, 14.0)
    $finalBmp.Dispose()
    $rBox = [TinkerAssetBuilder]::TightBBox($rotSeesaw, 0, 0, $rotSeesaw.Width, $rotSeesaw.Height)
    $sTight = [TinkerAssetBuilder]::CropRegion($rotSeesaw, $rBox)
    $rotSeesaw.Dispose()

    $sw = $sTight.Width
    $sh = $sTight.Height
    $sumHX = 0.0
    $sumHY = 0.0
    $cntH = 0
    for ($y = [int]($sh * 0.30); $y -lt [int]($sh * 0.80); $y++) {
      for ($x = [int]($sw * 0.38); $x -lt [int]($sw * 0.62); $x++) {
        if ($sTight.GetPixel($x, $y).A -lt 30) {
          $hasL = $false; $hasR = $false; $hasU = $false; $hasD = $false
          for ($lx = [Math]::Max(0, $x - 28); $lx -lt $x; $lx++) { if ($sTight.GetPixel($lx, $y).A -gt 80) { $hasL = $true; break } }
          for ($rx = $x + 1; $rx -lt [Math]::Min($sw, $x + 29); $rx++) { if ($sTight.GetPixel($rx, $y).A -gt 80) { $hasR = $true; break } }
          for ($uy = [Math]::Max(0, $y - 28); $uy -lt $y; $uy++) { if ($sTight.GetPixel($x, $uy).A -gt 80) { $hasU = $true; break } }
          for ($dy = $y + 1; $dy -lt [Math]::Min($sh, $y + 29); $dy++) { if ($sTight.GetPixel($x, $dy).A -gt 80) { $hasD = $true; break } }
          if ($hasL -and $hasR -and $hasU -and $hasD) {
            $sumHX += $x
            $sumHY += $y
            $cntH++
          }
        }
      }
    }
    $holeCX = $(if ($cntH -gt 0) { $sumHX / $cntH } else { $sw * 0.495 })
    $holeCY = $(if ($cntH -gt 0) { $sumHY / $cntH } else { $sh * 0.56 })
    $halfW = [int][Math]::Round([Math]::Max($holeCX, ($sw - $holeCX))) + 2
    $halfH = [int][Math]::Round([Math]::Max($holeCY, ($sh - $holeCY))) + 2
    $sCanvas = New-Object System.Drawing.Bitmap(($halfW * 2), ($halfH * 2), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gS = [System.Drawing.Graphics]::FromImage($sCanvas)
    $gS.DrawImage($sTight, [int][Math]::Round($halfW - $holeCX), [int][Math]::Round($halfH - $holeCY), $sw, $sh)
    $gS.Dispose()
    $sTight.Dispose()
    $finalBmp = $sCanvas
  }

  $outPart = Join-Path $spritesDir $spec.Name
  $finalBmp.Save($outPart, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved $($spec.Name) ($($finalBmp.Width)x$($finalBmp.Height))"
  $finalBmp.Dispose()
}
$partsRawBmp.Dispose()

# 3. Slice tinker-characters-raw.jpg (2 rows x 3 columns)
$charsRawPath = Join-Path $rootDir "public\assets\games\tinker-workshop\raw\tinker-characters-raw.jpg"
$charsRawBmp = New-Object System.Drawing.Bitmap($charsRawPath)
$charsClean = [TinkerAssetBuilder]::ClearMagentaAndDespill($charsRawBmp, $true, $false)
$charsRawBmp.Dispose()

$cw = $charsClean.Width
$ch = $charsClean.Height
$midY = [int]($ch / 2)

# Row 1: Engineer Sparky at Brass Hopper (anchored to exact bottom-center of the brass funnel spout)
$sparkyCropped = @()
$sparkySpoutX = @()
$maxSW = 0
$maxSH = 0

for ($c = 0; $c -lt 3; $c++) {
  $x0 = [int][Math]::Round($c * $cw / 3.0)
  $x1 = [int][Math]::Round(($c + 1) * $cw / 3.0)
  $bbox = [TinkerAssetBuilder]::TightBBox($charsClean, $x0, 0, $x1, $midY)
  $cropped = [TinkerAssetBuilder]::CropRegion($charsClean, $bbox)
  $spoutX = [TinkerAssetBuilder]::FindBottomSpoutCenterX($cropped)
  $sparkyCropped += $cropped
  $sparkySpoutX += $spoutX
  if ($cropped.Width -gt $maxSW) { $maxSW = $cropped.Width }
  if ($cropped.Height -gt $maxSH) { $maxSH = $cropped.Height }
}

$targetSpoutX = $sparkySpoutX[0]
$padW = $maxSW + 24
for ($c = 0; $c -lt 3; $c++) {
  $cropped = $sparkyCropped[$c]
  $canvas = New-Object System.Drawing.Bitmap($padW, $maxSH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $dx = 12 + ($targetSpoutX - $sparkySpoutX[$c])
  $dy = $maxSH - $cropped.Height
  $g.DrawImage($cropped, $dx, $dy, $cropped.Width, $cropped.Height)
  $g.Dispose()
  $outName = "tinker-sparky-$c.png"
  $outPath = Join-Path $spritesDir $outName
  $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved $outName (${padW}x${maxSH}, spoutX=$((12 + $targetSpoutX)))"
  $canvas.Dispose()
  $cropped.Dispose()
}

# Row 2: Catcher Doggie in Wooden Minecart (aligned by bottom-left cart wheels + right basket composited onto Frame 2)
$doggieCropped = @()
$maxDW = 0
$maxDH = 0
for ($c = 0; $c -lt 3; $c++) {
  $x0 = [int][Math]::Round($c * $cw / 3.0) + $(if ($c -eq 2) { 12 } else { 0 })
  $x1 = [int][Math]::Round(($c + 1) * $cw / 3.0)
  $subRect = New-Object System.Drawing.Rectangle($x0, $midY, ($x1 - $x0), ($ch - $midY))
  $subBmp = [TinkerAssetBuilder]::CropRegion($charsClean, $subRect)
  $bbox = [TinkerAssetBuilder]::TightBBox($subBmp, 0, 0, $subBmp.Width, $subBmp.Height)
  $cropped = [TinkerAssetBuilder]::CropRegion($subBmp, $bbox)
  $subBmp.Dispose()
  $doggieCropped += $cropped
  if ($cropped.Width -gt $maxDW) { $maxDW = $cropped.Width }
  if ($cropped.Height -gt $maxDH) { $maxDH = $cropped.Height }
}

$doggieCanvases = @()
for ($c = 0; $c -lt 3; $c++) {
  $cropped = $doggieCropped[$c]
  $canvas = New-Object System.Drawing.Bitmap($maxDW, $maxDH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $dy = $maxDH - $cropped.Height
  $g.DrawImage($cropped, 0, $dy, $cropped.Width, $cropped.Height)
  $g.Dispose()
  $doggieCanvases += $canvas
  $cropped.Dispose()
}

# Composite right-side catcher basket from Frame 0 onto Frame 2
[TinkerAssetBuilder]::CompositeRightBasket($doggieCanvases[0], $doggieCanvases[2])

for ($c = 0; $c -lt 3; $c++) {
  $outName = "tinker-doggie-$c.png"
  $outPath = Join-Path $spritesDir $outName
  $doggieCanvases[$c].Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved $outName (${maxDW}x${maxDH})"
  $doggieCanvases[$c].Dispose()
}
$charsClean.Dispose()

# 4. Slice tinker-ui-raw.jpg (2 rows x 5 columns = 10 icons)
$uiRawPath = Join-Path $rootDir "public\assets\games\tinker-workshop\raw\tinker-ui-raw.jpg"
$uiRawBmp = New-Object System.Drawing.Bitmap($uiRawPath)
$uw = $uiRawBmp.Width
$uh = $uiRawBmp.Height
$uMidY = [int]($uh / 2)

# Row 1: 5 Circular Brass Puzzle Medallions (solid interior, fill internal magenta pinholes with #23170d)
$row1Raw = [TinkerAssetBuilder]::CropRegion($uiRawBmp, (New-Object System.Drawing.Rectangle(0, 0, $uw, $uMidY)))
$row1Clean = [TinkerAssetBuilder]::ClearMagentaAndDespill($row1Raw, $false, $true)
$row1Raw.Dispose()

for ($c = 0; $c -lt 5; $c++) {
  $x0 = [int][Math]::Round($c * $uw / 5.0)
  $x1 = [int][Math]::Round(($c + 1) * $uw / 5.0)
  $bbox = [TinkerAssetBuilder]::TightBBox($row1Clean, $x0, 0, $x1, $uMidY)
  $cropped = [TinkerAssetBuilder]::CropRegion($row1Clean, $bbox)
  $outName = "puzzle-$($c + 1).png"
  $outPath = Join-Path $spritesDir $outName
  $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved $outName ($($cropped.Width)x$($cropped.Height))"
  $cropped.Dispose()
}
$row1Clean.Dispose()

# Row 2: 5 Bottom Workshop Mode & Action Icons
$row2Raw = [TinkerAssetBuilder]::CropRegion($uiRawBmp, (New-Object System.Drawing.Rectangle(0, $uMidY, $uw, ($uh - $uMidY))))
$row2Clean = [TinkerAssetBuilder]::ClearMagentaAndDespill($row2Raw, $true, $false)
$row2Raw.Dispose()
$uiRawBmp.Dispose()

$r2Names = @(
  "tinker-mode-guide.png",
  "tinker-mode-stars.png",
  "tinker-mode-fountain.png",
  "tinker-action-drop.png",
  "tinker-action-clear.png"
)
for ($c = 0; $c -lt 5; $c++) {
  $x0 = [int][Math]::Round($c * $uw / 5.0)
  $x1 = [int][Math]::Round(($c + 1) * $uw / 5.0)
  $bbox = [TinkerAssetBuilder]::TightBBox($row2Clean, $x0, 0, $x1, $row2Clean.Height)
  $cropped = [TinkerAssetBuilder]::CropRegion($row2Clean, $bbox)
  $outName = $r2Names[$c]
  $outPath = Join-Path $spritesDir $outName
  $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved $outName ($($cropped.Width)x$($cropped.Height))"
  $cropped.Dispose()
}
$row2Clean.Dispose()

# 5. Slice tinker-shapes-raw.jpg (2 rows x 2 columns = 4 new physics shapes)
$shapesRawPath = Join-Path $rootDir "public\assets\games\tinker-workshop\raw\tinker-shapes-raw.jpg"
if (Test-Path $shapesRawPath) {
  $shapesRawBmp = New-Object System.Drawing.Bitmap($shapesRawPath)
  $sw = $shapesRawBmp.Width
  $sh = $shapesRawBmp.Height

  # a) Row 1, Col 1 (x: 0..50%, y: 0..48%) -> part-bowl.png
  $rBowl = New-Object System.Drawing.Rectangle(0, 0, [int]($sw * 0.50), [int]($sh * 0.48))
  $bowlSub = [TinkerAssetBuilder]::CropRegion($shapesRawBmp, $rBowl)
  $bowlClean = [TinkerAssetBuilder]::ClearMagentaAndDespill($bowlSub, $true, $false)
  $bowlSub.Dispose()
  $bowlLcc = [TinkerAssetBuilder]::KeepLargestConnectedComponent($bowlClean)
  $bowlClean.Dispose()
  $bowlBox = [TinkerAssetBuilder]::TightBBox($bowlLcc, 0, 0, $bowlLcc.Width, $bowlLcc.Height)
  $bowlFinal = [TinkerAssetBuilder]::CropRegion($bowlLcc, $bowlBox)
  $bowlLcc.Dispose()
  $bowlOut = Join-Path $spritesDir "part-bowl.png"
  $bowlFinal.Save($bowlOut, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved part-bowl.png ($($bowlFinal.Width)x$($bowlFinal.Height))"
  $bowlFinal.Dispose()

  # b) Row 1, Col 2 (x: 50..100%, y: 0..48%) -> part-wedge.png (Flipped 180 deg so narrow vertex points UP /\)
  $rWedge = New-Object System.Drawing.Rectangle([int]($sw * 0.50), 0, ($sw - [int]($sw * 0.50)), [int]($sh * 0.48))
  $wedgeSub = [TinkerAssetBuilder]::CropRegion($shapesRawBmp, $rWedge)
  $wedgeClean = [TinkerAssetBuilder]::ClearMagentaAndDespill($wedgeSub, $true, $false)
  $wedgeSub.Dispose()
  $wedgeLcc = [TinkerAssetBuilder]::KeepLargestConnectedComponent($wedgeClean)
  $wedgeClean.Dispose()
  $wedgeBox = [TinkerAssetBuilder]::TightBBox($wedgeLcc, 0, 0, $wedgeLcc.Width, $wedgeLcc.Height)
  $wedgeFinal = [TinkerAssetBuilder]::CropRegion($wedgeLcc, $wedgeBox)
  $wedgeLcc.Dispose()
  $wedgeFinal.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone)
  $wedgeOut = Join-Path $spritesDir "part-wedge.png"
  $wedgeFinal.Save($wedgeOut, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved part-wedge.png ($($wedgeFinal.Width)x$($wedgeFinal.Height))"
  $wedgeFinal.Dispose()

  # c) Row 2, Col 1 (x: 0..50%, y: 44..100%) -> part-hammer.png
  # Rotate +43 deg CW so the top-left brass peg ring sits dead-center at the top (x=50%, y=15%)
  # and the wooden mallet head hangs straight down vertically at angle = 0!
  $rHammer = New-Object System.Drawing.Rectangle(0, [int]($sh * 0.44), [int]($sw * 0.50), ($sh - [int]($sh * 0.44)))
  $hammerSub = [TinkerAssetBuilder]::CropRegion($shapesRawBmp, $rHammer)
  # Mask out any bottom edge of part-bowl in the upper-right of this sub-crop
  for ($cy = 0; $cy -lt [int]($hammerSub.Height * 0.14); $cy++) {
    for ($cx = [int]($hammerSub.Width * 0.35); $cx -lt $hammerSub.Width; $cx++) {
      $hammerSub.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, 255, 0, 255))
    }
  }
  $hammerClean = [TinkerAssetBuilder]::ClearMagentaAndDespill($hammerSub, $true, $false)
  $hammerSub.Dispose()
  $hammerLcc = [TinkerAssetBuilder]::KeepLargestConnectedComponent($hammerClean)
  $hammerClean.Dispose()
  $hammerBox = [TinkerAssetBuilder]::TightBBox($hammerLcc, 0, 0, $hammerLcc.Width, $hammerLcc.Height)
  $hammerCrop = [TinkerAssetBuilder]::CropRegion($hammerLcc, $hammerBox)
  $hammerLcc.Dispose()

  $hammerRot = [TinkerAssetBuilder]::RotateBitmap($hammerCrop, 43.0)
  $hammerCrop.Dispose()
  $hRotBox = [TinkerAssetBuilder]::TightBBox($hammerRot, 0, 0, $hammerRot.Width, $hammerRot.Height)
  $hammerTight = [TinkerAssetBuilder]::CropRegion($hammerRot, $hRotBox)
  $hammerRot.Dispose()

  $tw = $hammerTight.Width
  $th = $hammerTight.Height
  $sumRX = 0.0
  $sumRY = 0.0
  $cntR = 0
  for ($cy = 0; $cy -lt [int]($th * 0.22); $cy++) {
    for ($cx = 0; $cx -lt $tw; $cx++) {
      if ($hammerTight.GetPixel($cx, $cy).A -gt 40) {
        $sumRX += $cx
        $sumRY += $cy
        $cntR++
      }
    }
  }
  $ringCX = $(if ($cntR -gt 0) { $sumRX / $cntR } else { $tw * 0.5 })
  $ringCY = $(if ($cntR -gt 0) { $sumRY / $cntR } else { $th * 0.11 })

  $padW = [int]([Math]::Max($ringCX, ($tw - $ringCX)) * 2 + 24)
  $padH = [int][Math]::Round(($th - $ringCY) / 0.85)
  $hammerCanvas = New-Object System.Drawing.Bitmap($padW, $padH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gH = [System.Drawing.Graphics]::FromImage($hammerCanvas)
  $pasteX = [int][Math]::Round($padW * 0.50 - $ringCX)
  $pasteY = [int][Math]::Round($padH * 0.15 - $ringCY)
  $gH.DrawImage($hammerTight, $pasteX, $pasteY, $tw, $th)
  $gH.Dispose()
  $hammerTight.Dispose()

  $hammerOut = Join-Path $spritesDir "part-hammer.png"
  $hammerCanvas.Save($hammerOut, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved part-hammer.png ($($hammerCanvas.Width)x$($hammerCanvas.Height), ringCenter=($([int]($pasteX + $ringCX)), $([int]($pasteY + $ringCY))))"
  $hammerCanvas.Dispose()

  # d) Row 2, Col 2 (x: 50..100%, y: 48..100%) -> part-funnel.png
  $rFunnel = New-Object System.Drawing.Rectangle([int]($sw * 0.50), [int]($sh * 0.48), ($sw - [int]($sw * 0.50)), ($sh - [int]($sh * 0.48)))
  $funnelSub = [TinkerAssetBuilder]::CropRegion($shapesRawBmp, $rFunnel)
  $funnelClean = [TinkerAssetBuilder]::ClearMagentaAndDespill($funnelSub, $true, $false)
  $funnelSub.Dispose()
  $funnelLcc = [TinkerAssetBuilder]::KeepLargestConnectedComponent($funnelClean)
  $funnelClean.Dispose()
  $funnelBox = [TinkerAssetBuilder]::TightBBox($funnelLcc, 0, 0, $funnelLcc.Width, $funnelLcc.Height)
  $funnelFinal = [TinkerAssetBuilder]::CropRegion($funnelLcc, $funnelBox)
  $funnelLcc.Dispose()
  $funnelOut = Join-Path $spritesDir "part-funnel.png"
  $funnelFinal.Save($funnelOut, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved part-funnel.png ($($funnelFinal.Width)x$($funnelFinal.Height))"
  $funnelFinal.Dispose()

  $shapesRawBmp.Dispose()
}

# 6. Build vertical mahogany-and-brass bounce wall (part-wall.png) from part-chute.png
$chutePath = Join-Path $spritesDir "part-chute.png"
if (Test-Path $chutePath) {
  $chuteBmp = New-Object System.Drawing.Bitmap($chutePath)
  # Rotate +75.5 deg CW so the 14.5-deg sloped wooden-and-brass beam stands 100% VERTICAL (| orientation)
  $rotBmp = [TinkerAssetBuilder]::RotateBitmap($chuteBmp, 75.5)
  $chuteBmp.Dispose()
  $rotBox = [TinkerAssetBuilder]::TightBBox($rotBmp, 0, 0, $rotBmp.Width, $rotBmp.Height)
  $tightWall = [TinkerAssetBuilder]::CropRegion($rotBmp, $rotBox)
  $rotBmp.Dispose()

  $tw = $tightWall.Width
  $th = $tightWall.Height
  $sumHX = 0.0
  $sumHY = 0.0
  $cntH = 0
  for ($y = [int]($th * 0.35); $y -lt [int]($th * 0.65); $y++) {
    $leftX = -1
    $rightX = -1
    for ($x = 0; $x -lt $tw; $x++) {
      if ($tightWall.GetPixel($x, $y).A -gt 80) { $leftX = $x; break }
    }
    for ($x = $tw - 1; $x -ge 0; $x--) {
      if ($tightWall.GetPixel($x, $y).A -gt 80) { $rightX = $x; break }
    }
    if ($leftX -ge 0 -and $rightX -gt ($leftX + 8)) {
      for ($x = $leftX + 2; $x -lt ($rightX - 1); $x++) {
        if ($tightWall.GetPixel($x, $y).A -lt 30) {
          $sumHX += $x
          $sumHY += $y
          $cntH++
        }
      }
    }
  }
  $holeCX = $(if ($cntH -gt 0) { $sumHX / $cntH } else { $tw * 0.5 })
  $holeCY = $(if ($cntH -gt 0) { $sumHY / $cntH } else { $th * 0.5 })

  $halfW = [int][Math]::Round([Math]::Max($holeCX, ($tw - $holeCX))) + 2
  $halfH = [int][Math]::Round([Math]::Max($holeCY, ($th - $holeCY))) + 2
  $canvasW = $halfW * 2
  $canvasH = $halfH * 2

  $wallCanvas = New-Object System.Drawing.Bitmap($canvasW, $canvasH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gW = [System.Drawing.Graphics]::FromImage($wallCanvas)
  $pasteX = [int][Math]::Round($halfW - $holeCX)
  $pasteY = [int][Math]::Round($halfH - $holeCY)
  $gW.DrawImage($tightWall, $pasteX, $pasteY, $tw, $th)
  $gW.Dispose()
  $tightWall.Dispose()

  $targetH = 125
  $targetW = [Math]::Max(34, [int][Math]::Round($canvasW * ($targetH / [double]$canvasH)))
  $wallFinal = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gWF = [System.Drawing.Graphics]::FromImage($wallFinal)
  $gWF.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gWF.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gWF.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gWF.DrawImage($wallCanvas, 0, 0, $targetW, $targetH)
  $gWF.Dispose()
  $wallCanvas.Dispose()

  $wallOut = Join-Path $spritesDir "part-wall.png"
  $wallFinal.Save($wallOut, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved part-wall.png ($($wallFinal.Width)x$($wallFinal.Height), holeCenter=($([int]($targetW/2)), $([int]($targetH/2))))"
  $wallFinal.Dispose()
}
