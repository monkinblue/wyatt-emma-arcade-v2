$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public class Mp3SyncP8 {
    private static readonly int[] BITRATES_V1_L3 = { 0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0 };
    private static readonly int[] BITRATES_V2_L3 = { 0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0 };
    private static readonly int[] SAMPLERATES_V1 = { 44100, 48000, 32000, 0 };
    private static readonly int[] SAMPLERATES_V2 = { 22050, 24000, 16000, 0 };
    private static readonly int[] SAMPLERATES_V25 = { 11025, 12000, 8000, 0 };

    public class FrameInfo {
        public int Offset;
        public int FrameSize;
        public double TimeMs;
        public double DurationMs;
        public int MaxGain;
        public int MainDataBegin;
        public bool IsXing;
    }

    private static int ReadBits(byte[] buf, int bitOffset, int numBits) {
        int val = 0;
        for (int i = 0; i < numBits; i++) {
            int byteIdx = (bitOffset + i) >> 3;
            int bitIdx = 7 - ((bitOffset + i) & 7);
            if (byteIdx < buf.Length) {
                val = (val << 1) | ((buf[byteIdx] >> bitIdx) & 1);
            }
        }
        return val;
    }

    private static bool ContainsTag(byte[] buf, int offset, int length, string tag) {
        byte[] t = Encoding.ASCII.GetBytes(tag);
        for (int i = offset; i <= offset + length - t.Length; i++) {
            bool match = true;
            for (int j = 0; j < t.Length; j++) {
                if (buf[i + j] != t[j]) { match = false; break; }
            }
            if (match) return true;
        }
        return false;
    }

    public static List<FrameInfo> ParseFrames(byte[] buf) {
        int offset = 0;
        if (buf.Length >= 10 && buf[0] == 'I' && buf[1] == 'D' && buf[2] == '3') {
            int size = ((buf[6] & 0x7F) << 21) | ((buf[7] & 0x7F) << 14) | ((buf[8] & 0x7F) << 7) | (buf[9] & 0x7F);
            offset = 10 + size;
        }

        List<FrameInfo> frames = new List<FrameInfo>();
        double currentTimeMs = 0.0;

        while (offset + 4 <= buf.Length) {
            if (buf[offset] != 0xFF || (buf[offset + 1] & 0xE0) != 0xE0) {
                offset++;
                continue;
            }
            byte b1 = buf[offset + 1];
            byte b2 = buf[offset + 2];
            byte b3 = buf[offset + 3];
            int versionBits = (b1 >> 3) & 0x03;
            int layerBits = (b1 >> 1) & 0x03;
            bool crcProtected = (b1 & 0x01) == 0;
            int bitrateIdx = (b2 >> 4) & 0x0F;
            int srIdx = (b2 >> 2) & 0x03;
            int padding = (b2 >> 1) & 0x01;
            int channelMode = (b3 >> 6) & 0x03;

            if (versionBits == 1 || layerBits != 1 || bitrateIdx == 0 || bitrateIdx == 15 || srIdx == 3) {
                offset++;
                continue;
            }

            bool isMpeg1 = versionBits == 3;
            int bitrate = (isMpeg1 ? BITRATES_V1_L3[bitrateIdx] : BITRATES_V2_L3[bitrateIdx]) * 1000;
            int sampleRate = versionBits == 3 ? SAMPLERATES_V1[srIdx] : (versionBits == 2 ? SAMPLERATES_V2[srIdx] : SAMPLERATES_V25[srIdx]);
            int samplesPerFrame = isMpeg1 ? 1152 : 576;
            int frameSize = (((isMpeg1 ? 144 : 72) * bitrate) / sampleRate) + padding;
            if (frameSize < 24 || offset + frameSize > buf.Length) break;

            bool isXing = ContainsTag(buf, offset, frameSize, "Xing") ||
                          ContainsTag(buf, offset, frameSize, "Info") ||
                          ContainsTag(buf, offset, frameSize, "Lavf");

            int sideInfoOffset = offset + 4 + (crcProtected ? 2 : 0);
            bool isMono = channelMode == 3;
            int nCh = isMono ? 1 : 2;
            int nGr = isMpeg1 ? 2 : 1;
            int mainDataBegin = ReadBits(buf, sideInfoOffset * 8, isMpeg1 ? 9 : 8);

            int bitPos = sideInfoOffset * 8 + (isMpeg1 ? (9 + (isMono ? 5 : 3) + (isMono ? 4 : 8)) : (8 + (isMono ? 1 : 2)));
            int maxGain = 0;
            for (int gr = 0; gr < nGr; gr++) {
                for (int ch = 0; ch < nCh; ch++) {
                    int part23Len = ReadBits(buf, bitPos, 12);
                    int globalGain = ReadBits(buf, bitPos + 21, 8);
                    if (!isXing && part23Len > 0 && globalGain > maxGain) {
                        maxGain = globalGain;
                    }
                    bitPos += isMpeg1 ? 59 : 63;
                }
            }

            double durationMs = (samplesPerFrame / (double)sampleRate) * 1000.0;
            frames.Add(new FrameInfo {
                Offset = offset,
                FrameSize = frameSize,
                TimeMs = currentTimeMs,
                DurationMs = durationMs,
                MaxGain = maxGain,
                MainDataBegin = mainDataBegin,
                IsXing = isXing
            });
            currentTimeMs += durationMs;
            offset += frameSize;
        }
        return frames;
    }

    public static void CombineDoggieSquirrel(string audioDir) {
        string p1 = Path.Combine(audioDir, "sfx-doggie-squirrel.mp3");
        string p2 = Path.Combine(audioDir, "sfx-doggie-squirrel2.mp3");
        if (!File.Exists(p1) || !File.Exists(p2)) {
            Console.WriteLine("[CombineDoggieSquirrel] sfx-doggie-squirrel2.mp3 already merged or not present.");
            return;
        }

        byte[] b1 = File.ReadAllBytes(p1);
        byte[] b2 = File.ReadAllBytes(p2);
        List<FrameInfo> f1 = ParseFrames(b1);
        List<FrameInfo> f2 = ParseFrames(b2);

        using (MemoryStream ms = new MemoryStream()) {
            // Write all non-Xing audio frames from file 1
            foreach (FrameInfo fr in f1) {
                if (fr.IsXing) continue;
                ms.Write(b1, fr.Offset, fr.FrameSize);
            }
            // Write all non-Xing audio frames from file 2
            foreach (FrameInfo fr in f2) {
                if (fr.IsXing) continue;
                ms.Write(b2, fr.Offset, fr.FrameSize);
            }
            byte[] merged = ms.ToArray();
            File.WriteAllBytes(p1, merged);
        }
        File.Delete(p2);
        Console.WriteLine("[CombineDoggieSquirrel] Combined sfx-doggie-squirrel.mp3 + sfx-doggie-squirrel2.mp3 -> sfx-doggie-squirrel.mp3 (" + new FileInfo(p1).Length + " bytes) and deleted sfx-doggie-squirrel2.mp3!");
    }

    public static void AnalyzeP8(string audioDir) {
        CombineDoggieSquirrel(audioDir);

        string[] p8Files = {
            "p8-narration.mp3",
            "sfx-kids-cabin-laugh.mp3",
            "sfx-nana-cocoa.mp3",
            "sfx-sparky-chimney.mp3",
            "sfx-forest-deer.mp3",
            "sfx-geese-honk.mp3",
            "sfx-wind-chimes.mp3",
            "sfx-doggie-squirrel.mp3",
            "sfx-bluejay-whistle.mp3"
        };

        foreach (string name in p8Files) {
            string path = Path.Combine(audioDir, name);
            if (!File.Exists(path)) {
                Console.WriteLine("MISSING: " + name);
                continue;
            }
            byte[] buf = File.ReadAllBytes(path);
            List<FrameInfo> frames = ParseFrames(buf);
            if (frames.Count == 0) {
                Console.WriteLine("NO FRAMES: " + name);
                continue;
            }

            int firstKeep = 0;
            while (firstKeep < frames.Count && frames[firstKeep].MaxGain < 130 &&
                   (firstKeep + 1 < frames.Count && frames[firstKeep + 1].MainDataBegin == 0)) {
                firstKeep++;
            }

            if (firstKeep > 0 && name.StartsWith("sfx-")) {
                int startByte = frames[firstKeep].Offset;
                byte[] trimmed = new byte[buf.Length - startByte];
                Array.Copy(buf, startByte, trimmed, 0, trimmed.Length);
                File.WriteAllBytes(path, trimmed);
                Console.WriteLine(string.Format("[sync_audio] Trimmed {0} leading silent frame(s) from {1} -> 0ms start! (bytes={2})",
                    firstKeep, name, trimmed.Length));
            } else {
                int totalMs = (int)Math.Round(frames[frames.Count - 1].TimeMs + frames[frames.Count - 1].DurationMs);
                Console.WriteLine(string.Format("[sync_audio] Verified {0} (duration={1}ms, frames={2}, bytes={3})",
                    name, totalMs, frames.Count, buf.Length));
            }

            if (name == "p8-narration.mp3") {
                int totalMs = (int)Math.Round(frames[frames.Count - 1].TimeMs + frames[frames.Count - 1].DurationMs);
                Console.WriteLine("=== p8-narration.mp3 Envelope (duration=" + totalMs + "ms) ===");
                bool inSpeech = false;
                double segStart = 0;
                for (int i = 0; i < frames.Count; i++) {
                    bool voiced = frames[i].MaxGain >= 148;
                    if (voiced && !inSpeech) {
                        inSpeech = true;
                        segStart = frames[i].TimeMs;
                    } else if (!voiced && inSpeech) {
                        inSpeech = false;
                        Console.WriteLine(string.Format("  Voiced segment: {0:F0}ms .. {1:F0}ms (len={2:F0}ms)",
                            segStart, frames[i].TimeMs, frames[i].TimeMs - segStart));
                    }
                }
                if (inSpeech) {
                    Console.WriteLine(string.Format("  Voiced segment: {0:F0}ms .. {1:F0}ms", segStart, totalMs));
                }
            }
        }
    }
}
"@

[Mp3SyncP8]::AnalyzeP8("public\assets\stories\nana\audio")
