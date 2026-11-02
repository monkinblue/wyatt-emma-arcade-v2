Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

public static class StudioFrameExpander {
    private static float MapPiecewise(float v, float[] kIn, float[] kOut) {
        for (int i = 0; i < kIn.Length - 1; i++) {
            float x0 = kIn[i];
            float x1 = kIn[i + 1];
            if (v <= x1 || i == kIn.Length - 2) {
                float t = (x1 == x0) ? 0f : (v - x0) / (x1 - x0);
                if (t < 0f) t = 0f;
                if (t > 1f) t = 1f;
                return kOut[i] + t * (kOut[i + 1] - kOut[i]);
            }
        }
        return kOut[kOut.Length - 1];
    }

    public static Bitmap ExpandFrame(Bitmap origBmp) {
        int W = 1280;
        int H = 720;
        Bitmap src1280 = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(src1280)) {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.DrawImage(origBmp, 0, 0, W, H);
        }

        Bitmap outBmp = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        Rectangle rect = new Rectangle(0, 0, W, H);
        BitmapData sData = src1280.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        BitmapData dData = outBmp.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);

        byte[] sBytes = new byte[sData.Stride * H];
        byte[] dBytes = new byte[dData.Stride * H];
        Marshal.Copy(sData.Scan0, sBytes, 0, sBytes.Length);

        // Piecewise X mapping:
        // - Left Mahogany Cubby Column: destX 0..162 <- srcX 20..212 (cubbies centered at x = 81)
        // - Left Brass Frame: destX 162..172 <- srcX 256..280
        // - Center Cream Canvas (936px): destX 172..1108 <- srcX 280..1000
        // - Right Brass Frame: destX 1108..1118 <- srcX 1000..1024
        // - Right Apothecary Shelf Column: destX 1118..1280 <- srcX 1068..1260 (shelves centered at x = 1199)
        float[] dxKnots = new float[] { 0f, 162f, 172f, 1108f, 1118f, 1279f };
        float[] sxKnots = new float[] { 20f, 212f, 256f, 1000f, 1024f, 1259f };

        // Piecewise Y mapping for Center Column (destX 162..1118):
        // - Top Brass/Wood Frame: destY 0..28 <- srcY 46..84
        // - Center Cream Canvas (560px): destY 28..588 <- srcY 84..564
        // - Bottom Brass/Wood Frame: destY 588..602 <- srcY 564..596
        // - Bottom Trough: destY 602..720 <- srcY 612..720
        float[] dyCenterKnots = new float[] { 0f, 28f, 588f, 602f, 719f };
        float[] syCenterKnots = new float[] { 46f, 84f, 564f, 596f, 719f };

        // Piecewise Y mapping for Left Cubbies (destX 0..162) so cubbies sit at y = 96, 206, 316, 426, 536:
        float[] dyLeftKnots = new float[] { 0f, 96f, 206f, 316f, 426f, 536f, 602f, 719f };
        float[] syLeftKnots = new float[] { 16f, 112f, 230f, 348f, 466f, 576f, 616f, 719f };

        // Piecewise Y mapping for Right Shelves (destX 1118..1280) so shelves sit at y = 95, 230, 365, 500:
        float[] dyRightKnots = new float[] { 0f, 95f, 230f, 365f, 500f, 602f, 719f };
        float[] syRightKnots = new float[] { 16f, 110f, 248f, 388f, 528f, 616f, 719f };

        // Center bottom trough X mapping (destX 162..1118, destY >= 602):
        // Maps srcX 212..1068 -> destX 162..1118 so the recessed wooden paint trough spans x = 185..1095 cleanly!
        float[] dxTroughKnots = new float[] { 0f, 162f, 1118f, 1279f };
        float[] sxTroughKnots = new float[] { 20f, 212f, 1068f, 1259f };

        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                float sx;
                float sy;

                if (y >= 602) {
                    sx = MapPiecewise((float)x, dxTroughKnots, sxTroughKnots);
                    sy = MapPiecewise((float)y, dyCenterKnots, syCenterKnots);
                } else if (x < 162) {
                    sx = MapPiecewise((float)x, dxKnots, sxKnots);
                    sy = MapPiecewise((float)y, dyLeftKnots, syLeftKnots);
                } else if (x >= 1118) {
                    sx = MapPiecewise((float)x, dxKnots, sxKnots);
                    sy = MapPiecewise((float)y, dyRightKnots, syRightKnots);
                } else {
                    sx = MapPiecewise((float)x, dxKnots, sxKnots);
                    sy = MapPiecewise((float)y, dyCenterKnots, syCenterKnots);
                }

                // Bilinear sample from sBytes
                int x0 = Math.Max(0, Math.Min(W - 1, (int)Math.Floor(sx)));
                int x1 = Math.Max(0, Math.Min(W - 1, x0 + 1));
                int y0 = Math.Max(0, Math.Min(H - 1, (int)Math.Floor(sy)));
                int y1 = Math.Max(0, Math.Min(H - 1, y0 + 1));
                float fx = sx - x0;
                float fy = sy - y0;

                int off00 = (y0 * W + x0) * 4;
                int off10 = (y0 * W + x1) * 4;
                int off01 = (y1 * W + x0) * 4;
                int off11 = (y1 * W + x1) * 4;

                int dOff = (y * W + x) * 4;
                for (int c = 0; c < 3; c++) {
                    float v0 = sBytes[off00 + c] * (1f - fx) + sBytes[off10 + c] * fx;
                    float v1 = sBytes[off01 + c] * (1f - fx) + sBytes[off11 + c] * fx;
                    int val = (int)Math.Round(v0 * (1f - fy) + v1 * fy);
                    dBytes[dOff + c] = (byte)Math.Max(0, Math.Min(255, val));
                }
                dBytes[dOff + 3] = 255;
            }
        }

        Marshal.Copy(dBytes, 0, dData.Scan0, dBytes.Length);
        src1280.UnlockBits(sData);
        outBmp.UnlockBits(dData);
        src1280.Dispose();
        return outBmp;
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$studioDir = "c:\projects\Wyatt and Emma Arcade v2\public\assets\games\art-studio"
$origPath = Join-Path $studioDir "raw\studio-frame-bg-orig.jpg"
$targetPath = Join-Path $studioDir "studio-frame-bg.jpg"

if (-not (Test-Path $origPath)) {
  Copy-Item -Path $targetPath -Destination $origPath -Force
  Write-Host "Backed up studio-frame-bg.jpg to $origPath"
}

$origBmp = New-Object System.Drawing.Bitmap($origPath)
$expanded = [StudioFrameExpander]::ExpandFrame($origBmp)
$origBmp.Dispose()

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]95)
$expanded.Save($targetPath, $jpegCodec, $encParams)
$expanded.Dispose()
Write-Host "Saved expanded 1280x720 studio-frame-bg.jpg (936x560 canvas)"
