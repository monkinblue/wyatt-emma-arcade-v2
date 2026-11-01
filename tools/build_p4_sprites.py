#!/usr/bin/env python3
"""
Gold-Standard Connected-Component BFS Slicer & Chroma-Keyer for Page 4 Sprites
Processes raw/p4-*-raw.png into public/assets/stories/nana/sprites/p4-*.png:
  1. Dynamic vertical gutter detection around w/3 and 2w/3
  2. Connected-component / BFS flood-fill chroma keying from frame borders only
  3. 2-pixel perimeter morphological de-spill (neutral charcoal clamping R=G, B=G)
  4. Centroid alignment across all 3 frames for zero horizontal/vertical jitter
"""
import os
import subprocess
import sys

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ps1_path = os.path.join(script_dir, "build_p4_sprites.ps1")
    subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", ps1_path], check=True)

if __name__ == "__main__":
    main()
