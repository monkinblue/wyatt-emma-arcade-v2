$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Text;

public class P9Builder {
    public static void MakeRuler(string inPath, string outPath) {
        using (Bitmap src = new Bitmap(inPath))
        using (Bitmap bmp = new Bitmap(1280, 720, PixelFormat.Format32bppArgb)) {
            bmp.SetResolution(96, 96);
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.DrawImage(src, 0, 0, 1280, 720);

                using (Pen p50 = new Pen(Color.FromArgb(140, 255, 255, 0), 1f))
                using (Pen p100 = new Pen(Color.FromArgb(210, 0, 255, 255), 1.5f))
                using (Font f = new Font("Arial", 9f, FontStyle.Bold))
                using (Brush bgB = new SolidBrush(Color.FromArgb(170, 0, 0, 0)))
                using (Brush fgB = new SolidBrush(Color.Yellow)) {
                    for (int x = 0; x <= 1280; x += 50) {
                        g.DrawLine(x % 100 == 0 ? p100 : p50, x, 0, x, 720);
                        if (x % 100 == 0 && x < 1280) {
                            g.FillRectangle(bgB, x + 2, 2, 34, 15);
                            g.DrawString(x.ToString(), f, fgB, x + 2, 2);
                            g.FillRectangle(bgB, x + 2, 700, 34, 15);
                            g.DrawString(x.ToString(), f, fgB, x + 2, 700);
                        }
                    }
                    for (int y = 0; y <= 720; y += 50) {
                        g.DrawLine(y % 100 == 0 ? p100 : p50, 0, y, 1280, y);
                        if (y % 100 == 0 && y < 720) {
                            g.FillRectangle(bgB, 2, y + 2, 30, 15);
                            g.DrawString(y.ToString(), f, fgB, 2, y + 2);
                            g.FillRectangle(bgB, 1245, y + 2, 30, 15);
                            g.DrawString(y.ToString(), f, fgB, 1245, y + 2);
                        }
                    }
                }
            }
            bmp.Save(outPath, ImageFormat.Jpeg);
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

$artDir = "C:\Users\RobaD\.gemini\antigravity\brain\c157efef-ad7b-472f-a591-d3f1aea5976b"
[P9Builder]::MakeRuler("public\assets\stories\nana\p9-bg.jpg", "$artDir\p9_orig_ruler.jpg")
[P9Builder]::MakeRuler("public\assets\stories\nana\p9-bg-clean.jpg", "$artDir\p9_clean_ruler.jpg")
Write-Host "Generated p9 rulers."
