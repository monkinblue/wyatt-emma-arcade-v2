Add-Type -AssemblyName System.Drawing

$csharpCode = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class MelodyAssetBuilderV3
{
    private static bool IsMagenta(int r, int g, int b)
    {
        return r > 150 && g < 95 && b > 140 && (r + b) > (g * 3);
    }

    private static bool IsInteriorMagentaHole(int r, int g, int b)
    {
        return r > 165 && g < 85 && b > 150 && (r + b) > (g * 3.2) && Math.Abs(r - b) < 65;
    }

    public static Bitmap ClearMagentaAndDespill(Bitmap src, bool convertPinkGlowToGold)
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

        // 2. Seed interior magenta holes
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

        if (convertPinkGlowToGold)
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
                            int newG = Math.Min(245, Math.Max(185, g + 55));
                            int newB = Math.Min(115, g / 2);
                            int newA = Math.Min(240, Math.Max(60, (g - 85) * 2));
                            bytes[off] = (byte)newB;
                            bytes[off + 1] = (byte)newG;
                            bytes[off + 2] = 255;
                            bytes[off + 3] = (byte)newA;
                        }
                    }
                }
            }
        }

        // 4. 2px neutral charcoal perimeter de-spill (R = G, B = G where G < 85 and R > G + 25)
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
                    if (g < 85 && r > g + 25)
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

    public static Bitmap PadBitmap(Bitmap src, int pad)
    {
        int nw = src.Width + pad * 2;
        int nh = src.Height + pad * 2;
        Bitmap dst = new Bitmap(nw, nh, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(dst))
        {
            g.DrawImage(src, pad, pad, src.Width, src.Height);
        }
        return dst;
    }

    public static List<int[]> FindHorizontalSegments(Bitmap bmp, int y0, int y1, int minWidth)
    {
        int w = bmp.Width;
        int h = bmp.Height;
        BitmapData data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] bytes = new byte[stride * h];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        bmp.UnlockBits(data);

        List<int[]> segs = new List<int[]>();
        bool inSeg = false;
        int segStart = 0;
        for (int x = 0; x < w; x++)
        {
            bool active = false;
            for (int y = y0; y < y1; y++)
            {
                if (bytes[y * stride + x * 4 + 3] > 15)
                {
                    active = true;
                    break;
                }
            }
            if (active && !inSeg)
            {
                inSeg = true;
                segStart = x;
            }
            else if (!active && inSeg)
            {
                inSeg = false;
                if (x - segStart >= minWidth)
                {
                    segs.Add(new int[] { segStart, x });
                }
            }
        }
        if (inSeg && w - segStart >= minWidth)
        {
            segs.Add(new int[] { segStart, w });
        }
        return segs;
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$rootDir = "c:\projects\Wyatt and Emma Arcade v2"
$spritesDir = Join-Path $rootDir "public\assets\games\melody-maker\sprites"
New-Item -ItemType Directory -Force -Path $spritesDir | Out-Null

# 1. Re-slice melody-keys-raw.jpg
$keysRawPath = Join-Path $rootDir "public\assets\games\melody-maker\raw\melody-keys-raw.jpg"
$keysRawBmp = New-Object System.Drawing.Bitmap($keysRawPath)
$keysClean = [MelodyAssetBuilderV3]::ClearMagentaAndDespill($keysRawBmp, $true)
$keysRawBmp.Dispose()

$kw = $keysClean.Width
$kh = $keysClean.Height
$row1ScanY = [int][Math]::Round($kh * 0.55)
$row1EndY  = [int][Math]::Round($kh * 0.645)

# Row 1: 8 Chime Bars (extending to y = 64.5% + Largest Connected Component so bottom brass caps are 100% intact)
$segs = [MelodyAssetBuilderV3]::FindHorizontalSegments($keysClean, 0, $row1ScanY, 20)
Write-Host "Found $($segs.Count) chime bar segments in Row 1"
for ($i = 0; $i -lt 8; $i++) {
  $sx = $segs[$i][0]
  $ex = $segs[$i][1]
  $colRect = New-Object System.Drawing.Rectangle($sx, 0, ($ex - $sx), $row1EndY)
  $colBmp = [MelodyAssetBuilderV3]::CropRegion($keysClean, $colRect)
  $lccBmp = [MelodyAssetBuilderV3]::KeepLargestConnectedComponent($colBmp)
  $colBmp.Dispose()

  $bbox = [MelodyAssetBuilderV3]::TightBBox($lccBmp, 0, 0, $lccBmp.Width, $lccBmp.Height)
  $barBmp = [MelodyAssetBuilderV3]::CropRegion($lccBmp, $bbox)
  $lccBmp.Dispose()

  $outBar = Join-Path $spritesDir "key-$i.png"
  $barBmp.Save($outBar, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Saved key-$i.png ($($barBmp.Width)x$($barBmp.Height))"
  $barBmp.Dispose()
}

# Row 2, Prop 1 & 2: Left Mallet cropped strictly from y: 64.5%..98%, x: 4%..30% + Largest Connected Component + 2px padding
$mx0 = [int][Math]::Round($kw * 0.04)
$mx1 = [int][Math]::Round($kw * 0.30)
$my0 = [int][Math]::Round($kh * 0.645)
$my1 = [int][Math]::Round($kh * 0.98)

$mCropRect = New-Object System.Drawing.Rectangle($mx0, $my0, ($mx1 - $mx0), ($my1 - $my0))
$mSubBmp = [MelodyAssetBuilderV3]::CropRegion($keysClean, $mCropRect)
$mLccBmp = [MelodyAssetBuilderV3]::KeepLargestConnectedComponent($mSubBmp)
$mSubBmp.Dispose()

$mBBox = [MelodyAssetBuilderV3]::TightBBox($mLccBmp, 0, 0, $mLccBmp.Width, $mLccBmp.Height)
$mTightBmp = [MelodyAssetBuilderV3]::CropRegion($mLccBmp, $mBBox)
$mLccBmp.Dispose()

$malletLeftBmp = [MelodyAssetBuilderV3]::PadBitmap($mTightBmp, 2)
$mTightBmp.Dispose()

$outLeftMallet = Join-Path $spritesDir "prop-mallet-left.png"
$malletLeftBmp.Save($outLeftMallet, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved prop-mallet-left.png ($($malletLeftBmp.Width)x$($malletLeftBmp.Height))"

# Create prop-mallet-right.png by horizontally flipping prop-mallet-left.png
$malletRightBmp = $malletLeftBmp.Clone()
$malletRightBmp.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
$outRightMallet = Join-Path $spritesDir "prop-mallet-right.png"
$malletRightBmp.Save($outRightMallet, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved prop-mallet-right.png ($($malletRightBmp.Width)x$($malletRightBmp.Height))"
$malletLeftBmp.Dispose()
$malletRightBmp.Dispose()

# Prop 3: Firefly (y: 60%..99%, x: 51%..74%) + Largest Connected Component
$fx0 = [int][Math]::Round($kw * 0.51)
$fx1 = [int][Math]::Round($kw * 0.74)
$fy0 = [int][Math]::Round($kh * 0.60)
$fy1 = [int][Math]::Round($kh * 0.99)

$fCropRect = New-Object System.Drawing.Rectangle($fx0, $fy0, ($fx1 - $fx0), ($fy1 - $fy0))
$fSubBmp = [MelodyAssetBuilderV3]::CropRegion($keysClean, $fCropRect)
$fLccBmp = [MelodyAssetBuilderV3]::KeepLargestConnectedComponent($fSubBmp)
$fSubBmp.Dispose()

$fBBox = [MelodyAssetBuilderV3]::TightBBox($fLccBmp, 0, 0, $fLccBmp.Width, $fLccBmp.Height)
$fireflyBmp = [MelodyAssetBuilderV3]::CropRegion($fLccBmp, $fBBox)
$fLccBmp.Dispose()

$outFirefly = Join-Path $spritesDir "prop-firefly.png"
$fireflyBmp.Save($outFirefly, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved prop-firefly.png ($($fireflyBmp.Width)x$($fireflyBmp.Height))"
$fireflyBmp.Dispose()

$keysClean.Dispose()
