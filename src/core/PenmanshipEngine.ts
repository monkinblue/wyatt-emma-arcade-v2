/**
 * PenmanshipEngine.ts
 * -------------------
 * Mathematically rigorous multi-stroke handwriting & corridor enforcement engine
 * for "Zoomy Cloud Kart" (`CloudKartScene.ts`).
 *
 * Features:
 * 1. Proper Preschool Stroke Order of Operations (Uppercase `A–Z` and Numbers `0–9`):
 *    - Strictly top-to-bottom, left-to-right sequential strokes (e.g., `A` = 3 strokes:
 *      down-left, down-right, middle crossbar).
 *    - Every stroke is arc-length-parameterized into dense, equidistant checkpoints
 *      (`~6px` apart on a `400x400` canvas) so progress cannot skip across loops or
 *      jump ahead to the end of a stroke.
 * 2. Strict Corridor & Waypoint Enforcement:
 *    - Requires starting within the Green Starting Flag capture zone (`P[0]`).
 *    - Enforces a configurable corridor radius (`38px` Standard Precision for Wyatt,
 *      `55px` Wide Cozy Track for Emma).
 *    - Detects straying outside the corridor or dragging backwards, triggering
 *      "off-road cloud rumble" state while preserving all completed ink and pausing
 *      at the exact resume checkpoint `P[lastValidIndex]`.
 * 3. Persistent Authentic Freehand Ink Recording:
 *    - Records the child's exact freehand pointer coordinates `{ nx, ny }` as they
 *      write so their real handwriting is never replaced by a computer font and can
 *      be stamped into the Top Race Progress Trophy Bar and Championship Podium Banner.
 */

export interface NormalizedPoint {
  nx: number;
  ny: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface StrokeDefinition {
  /** Dense equidistant normalized waypoints [0..1, 0..1] from start flag to finish target */
  waypoints: NormalizedPoint[];
  /** Friendly voice/HUD hint for this stroke */
  hint: string;
}

export interface CharacterPenmanshipGlyph {
  char: string;
  isNumber: boolean;
  strokes: StrokeDefinition[];
}

export interface RecordedHandwritingSample {
  character: string;
  /** Exact freehand strokes drawn by the child in normalized [0..1, 0..1] canvas coordinates */
  freehandStrokes: NormalizedPoint[][];
}

export type PenmanshipStepStatus =
  | 'WAITING_FOR_START_FLAG'
  | 'ADVANCING_ON_TRACK'
  | 'OFF_TRACK_RUMBLE'
  | 'STROKE_COMPLETED'
  | 'CHARACTER_COMPLETED';

export interface PenmanshipStepResult {
  status: PenmanshipStepStatus;
  strokeIndex: number;
  totalStrokes: number;
  /** Progress [0..1] along the currently active stroke */
  strokeProgress: number;
  /** Current valid resume checkpoint in screen coordinates */
  resumePoint: ScreenPoint;
  /** Finish target of the active stroke in screen coordinates */
  finishPoint: ScreenPoint;
  /** Heading angle in radians at the current stroke checkpoint */
  tangentAngleRad: number;
  /** Distance in pixels from pointer to active stroke corridor centerline */
  distanceFromTrackPx: number;
}

// ============================================================================
// GEOMETRIC PRIMITIVES & EQUIDISTANT ARC-LENGTH RESAMPLER
// ============================================================================

function sampleLine(x1: number, y1: number, x2: number, y2: number, steps = 40): NormalizedPoint[] {
  const pts: NormalizedPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      nx: x1 + (x2 - x1) * t,
      ny: y1 + (y2 - y1) * t
    });
  }
  return pts;
}

function sampleArc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startDeg: number,
  endDeg: number,
  steps = 64
): NormalizedPoint[] {
  const pts: NormalizedPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    pts.push({
      nx: cx + Math.cos(rad) * rx,
      ny: cy + Math.sin(rad) * ry
    });
  }
  return pts;
}

/**
 * Catmull-Rom spline interpolation through control points `ctrl` (`[nx, ny][]`).
 */
function sampleSmoothCurve(ctrl: Array<[number, number]>, segmentsPerSpan = 24): NormalizedPoint[] {
  if (ctrl.length < 2) {
    return ctrl.map(([nx, ny]) => ({ nx, ny }));
  }
  if (ctrl.length === 2) {
    return sampleLine(ctrl[0][0], ctrl[0][1], ctrl[1][0], ctrl[1][1], segmentsPerSpan * 2);
  }

  const pts: NormalizedPoint[] = [];
  const n = ctrl.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(n - 1, i + 2)];

    for (let s = 0; s < segmentsPerSpan; s++) {
      const t = s / segmentsPerSpan;
      const t2 = t * t;
      const t3 = t2 * t;

      const nx =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const ny =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

      pts.push({
        nx: Math.max(0.05, Math.min(0.95, nx)),
        ny: Math.max(0.05, Math.min(0.95, ny))
      });
    }
  }

  const last = ctrl[n - 1];
  pts.push({ nx: last[0], ny: last[1] });
  return pts;
}

/**
 * Resamples any raw point sequence into strictly equidistant checkpoints
 * separated by `stepNorm` (default `0.015`, ~6px on a 400px canvas).
 */
function resampleEquidistant(raw: NormalizedPoint[], stepNorm = 0.015): NormalizedPoint[] {
  if (raw.length < 2) return raw.slice();

  const cumDist: number[] = [0];
  let totalLen = 0;
  for (let i = 1; i < raw.length; i++) {
    const dx = raw[i].nx - raw[i - 1].nx;
    const dy = raw[i].ny - raw[i - 1].ny;
    totalLen += Math.hypot(dx, dy);
    cumDist.push(totalLen);
  }

  if (totalLen < 0.001) return [raw[0], raw[raw.length - 1]];

  const count = Math.max(12, Math.round(totalLen / stepNorm));
  const out: NormalizedPoint[] = [];
  let segIdx = 0;

  for (let k = 0; k <= count; k++) {
    const targetD = (k / count) * totalLen;
    while (segIdx < cumDist.length - 2 && cumDist[segIdx + 1] < targetD) {
      segIdx++;
    }
    const d0 = cumDist[segIdx];
    const d1 = cumDist[segIdx + 1];
    const span = Math.max(1e-6, d1 - d0);
    const ratio = Math.max(0, Math.min(1, (targetD - d0) / span));
    const p0 = raw[segIdx];
    const p1 = raw[segIdx + 1];
    out.push({
      nx: p0.nx + (p1.nx - p0.nx) * ratio,
      ny: p0.ny + (p1.ny - p0.ny) * ratio
    });
  }

  return out;
}

function makeStroke(rawPoints: NormalizedPoint[], hint: string): StrokeDefinition {
  return {
    waypoints: resampleEquidistant(rawPoints, 0.015),
    hint
  };
}

// ============================================================================
// STANDARD PRESCHOOL STROKE ORDER GLYPH LIBRARY (UPPERCASE A-Z & NUMBERS 0-9)
// ============================================================================

const GLYPH_MAP: Record<string, CharacterPenmanshipGlyph> = {};

function registerGlyph(char: string, isNumber: boolean, strokes: StrokeDefinition[]): void {
  GLYPH_MAP[char] = {
    char,
    isNumber,
    strokes
  };
}

function buildGlyphLibrary(): void {
  if (Object.keys(GLYPH_MAP).length > 0) return;

  // --- UPPERCASE A-Z (Strict Top-to-Bottom, Left-to-Right Order) ---

  // A: 1) Top to bottom-left, 2) Top to bottom-right, 3) Crossbar left-to-right
  registerGlyph('A', false, [
    makeStroke(sampleLine(0.5, 0.12, 0.2, 0.88), 'Slant down left from the green flag.'),
    makeStroke(sampleLine(0.5, 0.12, 0.8, 0.88), 'Slant down right from the top.'),
    makeStroke(sampleLine(0.31, 0.56, 0.69, 0.56), 'Slide across the middle.')
  ]);

  // B: 1) Left stem down, 2) Two bumps down
  registerGlyph('B', false, [
    makeStroke(sampleLine(0.25, 0.12, 0.25, 0.88), 'Big line straight down.'),
    makeStroke(
      [
        ...sampleLine(0.25, 0.12, 0.52, 0.12, 12),
        ...sampleArc(0.52, 0.31, 0.22, 0.19, -90, 90, 32),
        ...sampleLine(0.52, 0.5, 0.28, 0.5, 10),
        ...sampleLine(0.28, 0.5, 0.54, 0.5, 10),
        ...sampleArc(0.54, 0.69, 0.24, 0.19, -90, 90, 32),
        ...sampleLine(0.54, 0.88, 0.25, 0.88, 12)
      ],
      'Curve around the top bump and bottom bump.'
    )
  ]);

  // C: 1) Single counter-clockwise open curve
  registerGlyph('C', false, [
    makeStroke(sampleArc(0.54, 0.5, 0.32, 0.38, -42, -318, 72), 'Curve around to make a big C.')
  ]);

  // D: 1) Left stem down, 2) Big belly curve from top to bottom
  registerGlyph('D', false, [
    makeStroke(sampleLine(0.25, 0.12, 0.25, 0.88), 'Big line straight down.'),
    makeStroke(
      [
        ...sampleLine(0.25, 0.12, 0.46, 0.12, 10),
        ...sampleArc(0.46, 0.5, 0.32, 0.38, -90, 90, 56),
        ...sampleLine(0.46, 0.88, 0.25, 0.88, 10)
      ],
      'Big curve from top to bottom.'
    )
  ]);

  // E: 1) Stem down, 2) Top bar, 3) Middle bar, 4) Bottom bar
  registerGlyph('E', false, [
    makeStroke(sampleLine(0.26, 0.12, 0.26, 0.88), 'Big line straight down.'),
    makeStroke(sampleLine(0.26, 0.12, 0.76, 0.12), 'Top line across.'),
    makeStroke(sampleLine(0.26, 0.49, 0.66, 0.49), 'Middle line across.'),
    makeStroke(sampleLine(0.26, 0.88, 0.76, 0.88), 'Bottom line across.')
  ]);

  // F: 1) Stem down, 2) Top bar, 3) Middle bar
  registerGlyph('F', false, [
    makeStroke(sampleLine(0.28, 0.12, 0.28, 0.88), 'Big line straight down.'),
    makeStroke(sampleLine(0.28, 0.12, 0.76, 0.12), 'Top line across.'),
    makeStroke(sampleLine(0.28, 0.49, 0.66, 0.49), 'Middle line across.')
  ]);

  // G: 1) Big C curve around to middle-right, 2) Crossbar left-to-right
  registerGlyph('G', false, [
    makeStroke(sampleArc(0.52, 0.5, 0.3, 0.38, -45, -352, 72), 'Curve all the way around.'),
    makeStroke(sampleLine(0.52, 0.55, 0.82, 0.55), 'Slide across the middle shelf.')
  ]);

  // H: 1) Left stem down, 2) Right stem down, 3) Middle crossbar across
  registerGlyph('H', false, [
    makeStroke(sampleLine(0.24, 0.12, 0.24, 0.88), 'Left line straight down.'),
    makeStroke(sampleLine(0.76, 0.12, 0.76, 0.88), 'Right line straight down.'),
    makeStroke(sampleLine(0.24, 0.49, 0.76, 0.49), 'Bridge across the middle.')
  ]);

  // I: 1) Center stem down, 2) Top bar, 3) Bottom bar
  registerGlyph('I', false, [
    makeStroke(sampleLine(0.5, 0.12, 0.5, 0.88), 'Center line straight down.'),
    makeStroke(sampleLine(0.28, 0.12, 0.72, 0.12), 'Top hat across.'),
    makeStroke(sampleLine(0.28, 0.88, 0.72, 0.88), 'Bottom shoes across.')
  ]);

  // J: 1) Stem down with hook left, 2) Top bar across
  registerGlyph('J', false, [
    makeStroke(
      [
        ...sampleLine(0.58, 0.12, 0.58, 0.68, 32),
        ...sampleArc(0.4, 0.68, 0.18, 0.2, 0, 175, 36)
      ],
      'Line down and hook to the left.'
    ),
    makeStroke(sampleLine(0.3, 0.12, 0.8, 0.12), 'Top hat across.')
  ]);

  // K: 1) Left stem down, 2) Top-right kick in, 3) Middle kick out to bottom-right
  registerGlyph('K', false, [
    makeStroke(sampleLine(0.25, 0.12, 0.25, 0.88), 'Big line straight down.'),
    makeStroke(sampleLine(0.75, 0.12, 0.27, 0.5), 'Slant in to the middle.'),
    makeStroke(sampleLine(0.27, 0.5, 0.77, 0.88), 'Slant out to the bottom.')
  ]);

  // L: 1) Left stem down, 2) Bottom bar across
  registerGlyph('L', false, [
    makeStroke(sampleLine(0.28, 0.12, 0.28, 0.88), 'Big line straight down.'),
    makeStroke(sampleLine(0.28, 0.88, 0.76, 0.88), 'Bottom line across.')
  ]);

  // M: 4 top-to-bottom strokes
  registerGlyph('M', false, [
    makeStroke(sampleLine(0.18, 0.12, 0.18, 0.88), 'Left line straight down.'),
    makeStroke(sampleLine(0.18, 0.12, 0.5, 0.64), 'Slant down to the center.'),
    makeStroke(sampleLine(0.82, 0.12, 0.5, 0.64), 'Slant down from the right peak.'),
    makeStroke(sampleLine(0.82, 0.12, 0.82, 0.88), 'Right line straight down.')
  ]);

  // N: 3 top-to-bottom strokes
  registerGlyph('N', false, [
    makeStroke(sampleLine(0.22, 0.12, 0.22, 0.88), 'Left line straight down.'),
    makeStroke(sampleLine(0.22, 0.12, 0.78, 0.88), 'Slant down to the bottom right.'),
    makeStroke(sampleLine(0.78, 0.12, 0.78, 0.88), 'Right line straight down.')
  ]);

  // O: 1 counter-clockwise oval starting at top
  registerGlyph('O', false, [
    makeStroke(sampleArc(0.5, 0.5, 0.3, 0.38, -90, -450, 80), 'Circle all the way around from the top.')
  ]);

  // P: 1) Stem down, 2) Top loop
  registerGlyph('P', false, [
    makeStroke(sampleLine(0.26, 0.12, 0.26, 0.88), 'Big line straight down.'),
    makeStroke(
      [
        ...sampleLine(0.26, 0.12, 0.52, 0.12, 12),
        ...sampleArc(0.52, 0.31, 0.24, 0.19, -90, 90, 36),
        ...sampleLine(0.52, 0.5, 0.26, 0.5, 12)
      ],
      'Curve around the top loop.'
    )
  ]);

  // Q: 1) Oval, 2) Kickstand tail
  registerGlyph('Q', false, [
    makeStroke(sampleArc(0.5, 0.48, 0.29, 0.36, -90, -450, 76), 'Circle all the way around.'),
    makeStroke(sampleLine(0.54, 0.62, 0.8, 0.88), 'Little kickstand tail down.')
  ]);

  // R: 1) Stem down, 2) Top loop, 3) Diagonal leg down
  registerGlyph('R', false, [
    makeStroke(sampleLine(0.26, 0.12, 0.26, 0.88), 'Big line straight down.'),
    makeStroke(
      [
        ...sampleLine(0.26, 0.12, 0.52, 0.12, 12),
        ...sampleArc(0.52, 0.31, 0.24, 0.19, -90, 90, 36),
        ...sampleLine(0.52, 0.5, 0.26, 0.5, 12)
      ],
      'Curve around the top loop.'
    ),
    makeStroke(sampleLine(0.48, 0.49, 0.76, 0.88), 'Slant the leg down.')
  ]);

  // S: 1 continuous S-curve
  registerGlyph('S', false, [
    makeStroke(
      sampleSmoothCurve([
        [0.72, 0.22],
        [0.52, 0.12],
        [0.27, 0.24],
        [0.34, 0.44],
        [0.68, 0.58],
        [0.72, 0.78],
        [0.48, 0.88],
        [0.26, 0.76]
      ]),
      'Wind around the curvy S track.'
    )
  ]);

  // T: 1) Center stem down, 2) Top bar across
  registerGlyph('T', false, [
    makeStroke(sampleLine(0.5, 0.12, 0.5, 0.88), 'Big line straight down.'),
    makeStroke(sampleLine(0.2, 0.12, 0.8, 0.12), 'Top roof across.')
  ]);

  // U: 1 continuous cup curve
  registerGlyph('U', false, [
    makeStroke(
      [
        ...sampleLine(0.24, 0.12, 0.24, 0.62, 24),
        ...sampleArc(0.5, 0.62, 0.26, 0.26, 180, 0, 40),
        ...sampleLine(0.76, 0.62, 0.76, 0.12, 24)
      ],
      'Down, curve under, and up.'
    )
  ]);

  // V: 2 top-to-bottom strokes
  registerGlyph('V', false, [
    makeStroke(sampleLine(0.2, 0.12, 0.5, 0.88), 'Slant down to the bottom point.'),
    makeStroke(sampleLine(0.8, 0.12, 0.5, 0.88), 'Slant down from the right to meet it.')
  ]);

  // W: 4 top-to-bottom strokes
  registerGlyph('W', false, [
    makeStroke(sampleLine(0.14, 0.12, 0.32, 0.88), 'Slant down the first valley.'),
    makeStroke(sampleLine(0.5, 0.26, 0.32, 0.88), 'Slant down from the middle peak.'),
    makeStroke(sampleLine(0.5, 0.26, 0.68, 0.88), 'Slant down the second valley.'),
    makeStroke(sampleLine(0.86, 0.12, 0.68, 0.88), 'Slant down from the right top.')
  ]);

  // X: 2 criss-cross top-to-bottom strokes
  registerGlyph('X', false, [
    makeStroke(sampleLine(0.22, 0.12, 0.78, 0.88), 'Slant down across to the right.'),
    makeStroke(sampleLine(0.78, 0.12, 0.22, 0.88), 'Criss-cross down to the left.')
  ]);

  // Y: 3 top-to-bottom strokes
  registerGlyph('Y', false, [
    makeStroke(sampleLine(0.22, 0.12, 0.5, 0.5), 'Slant down to the center.'),
    makeStroke(sampleLine(0.78, 0.12, 0.5, 0.5), 'Slant down from the right to the center.'),
    makeStroke(sampleLine(0.5, 0.5, 0.5, 0.88), 'Straight down the stem.')
  ]);

  // Z: 3 strokes (top across, diagonal down-left, bottom across)
  registerGlyph('Z', false, [
    makeStroke(sampleLine(0.22, 0.12, 0.78, 0.12), 'Slide across the top.'),
    makeStroke(sampleLine(0.78, 0.12, 0.22, 0.88), 'Zoom diagonally down to the left.'),
    makeStroke(sampleLine(0.22, 0.88, 0.78, 0.88), 'Slide across the bottom.')
  ]);

  // --- NUMBERS 0-9 (Standard Preschool Stroke Order) ---

  // 0: 1 oval starting at top
  registerGlyph('0', true, [
    makeStroke(sampleArc(0.5, 0.5, 0.26, 0.38, -90, -450, 76), 'Circle all the way around for zero.')
  ]);

  // 1: 1 vertical line straight down
  registerGlyph('1', true, [
    makeStroke(sampleLine(0.5, 0.12, 0.5, 0.88), 'Start at the top and go straight down.')
  ]);

  // 2: 1) Curve around top and slant to bottom-left, 2) Slide across bottom
  registerGlyph('2', true, [
    makeStroke(
      sampleSmoothCurve([
        [0.26, 0.28],
        [0.5, 0.12],
        [0.74, 0.26],
        [0.64, 0.5],
        [0.24, 0.88]
      ]),
      'Curve over the top and slant down left.'
    ),
    makeStroke(sampleLine(0.24, 0.88, 0.78, 0.88), 'Slide across the bottom.')
  ]);

  // 3: 1) Two rightward bumps
  registerGlyph('3', true, [
    makeStroke(
      [
        ...sampleArc(0.48, 0.31, 0.24, 0.19, -145, 90, 42),
        ...sampleArc(0.48, 0.69, 0.26, 0.19, -90, 145, 42)
      ],
      'Round the top bump and round the bottom bump.'
    )
  ]);

  // 4: 1) Down left, 2) Across middle, 3) Straight down right stem
  registerGlyph('4', true, [
    makeStroke(sampleLine(0.28, 0.12, 0.28, 0.56), 'Down the short side.'),
    makeStroke(sampleLine(0.28, 0.56, 0.78, 0.56), 'Slide across the middle.'),
    makeStroke(sampleLine(0.64, 0.12, 0.64, 0.88), 'Big line straight down.')
  ]);

  // 5: 1) Down short neck + round belly, 2) Top hat across
  registerGlyph('5', true, [
    makeStroke(
      [
        ...sampleLine(0.28, 0.12, 0.28, 0.46, 20),
        ...sampleArc(0.48, 0.66, 0.26, 0.22, -135, 145, 48)
      ],
      'Down the neck and around the big belly.'
    ),
    makeStroke(sampleLine(0.28, 0.12, 0.74, 0.12), 'Put the top hat across.')
  ]);

  // 6: 1) Curve down and curl into bottom loop
  registerGlyph('6', true, [
    makeStroke(
      sampleSmoothCurve([
        [0.66, 0.14],
        [0.36, 0.34],
        [0.24, 0.64],
        [0.48, 0.88],
        [0.74, 0.7],
        [0.54, 0.48],
        [0.26, 0.62]
      ]),
      'Slide down and curl into a loop.'
    )
  ]);

  // 7: 1) Across top, 2) Slant down from right
  registerGlyph('7', true, [
    makeStroke(sampleLine(0.22, 0.12, 0.78, 0.12), 'Slide across the top.'),
    makeStroke(sampleLine(0.78, 0.12, 0.36, 0.88), 'Slant down to the bottom.')
  ]);

  // 8: 1) Make an S and curve back up to top
  registerGlyph('8', true, [
    makeStroke(
      sampleSmoothCurve([
        [0.5, 0.12],
        [0.27, 0.28],
        [0.5, 0.49],
        [0.74, 0.7],
        [0.5, 0.88],
        [0.26, 0.7],
        [0.5, 0.49],
        [0.73, 0.28],
        [0.5, 0.12]
      ]),
      'Make an S and wind back up to the green flag.'
    )
  ]);

  // 9: 1) Top loop, 2) Right stem straight down
  registerGlyph('9', true, [
    makeStroke(sampleArc(0.48, 0.32, 0.24, 0.2, 0, -360, 56), 'Make a circle at the top.'),
    makeStroke(sampleLine(0.72, 0.12, 0.72, 0.88), 'Straight line all the way down.')
  ]);

  // --- LOWERCASE a-z (Standard Preschool Print Stroke Order) ---

  registerGlyph('a', false, [
    makeStroke(sampleArc(0.47, 0.68, 0.21, 0.2, 0, -360, 56), 'Circle around for little a.'),
    makeStroke(sampleLine(0.68, 0.48, 0.68, 0.88), 'Short line down on the right.')
  ]);
  registerGlyph('b', false, [
    makeStroke(sampleLine(0.28, 0.12, 0.28, 0.88), 'Tall line straight down.'),
    makeStroke(sampleArc(0.48, 0.68, 0.22, 0.2, -135, 135, 52), 'Round belly at the bottom.')
  ]);
  registerGlyph('c', false, [
    makeStroke(sampleArc(0.54, 0.68, 0.22, 0.2, -42, -318, 52), 'Little magic c curve.')
  ]);
  registerGlyph('d', false, [
    makeStroke(sampleArc(0.46, 0.68, 0.2, 0.2, 0, -360, 56), 'Magic c into a circle.'),
    makeStroke(sampleLine(0.68, 0.12, 0.68, 0.88), 'Tall line straight down.')
  ]);
  registerGlyph('e', false, [
    makeStroke(
      [
        ...sampleLine(0.28, 0.66, 0.72, 0.66, 18),
        ...sampleArc(0.5, 0.68, 0.22, 0.2, 0, -315, 52)
      ],
      'Hit the ball and run around the bases for little e.'
    )
  ]);
  registerGlyph('f', false, [
    makeStroke(
      [
        ...sampleArc(0.56, 0.28, 0.14, 0.16, 0, -180, 28),
        ...sampleLine(0.42, 0.28, 0.42, 0.88, 30)
      ],
      'Curve over the top and straight down.'
    ),
    makeStroke(sampleLine(0.26, 0.49, 0.64, 0.49), 'Slide across the middle.')
  ]);
  registerGlyph('g', false, [
    makeStroke(sampleArc(0.47, 0.64, 0.2, 0.17, 0, -360, 52), 'Circle around at the middle.'),
    makeStroke(
      [
        ...sampleLine(0.67, 0.47, 0.67, 0.82, 24),
        ...sampleArc(0.49, 0.82, 0.18, 0.12, 0, 165, 28)
      ],
      'Line down and monkey tail hook.'
    )
  ]);
  registerGlyph('h', false, [
    makeStroke(sampleLine(0.28, 0.12, 0.28, 0.88), 'Tall line straight down.'),
    makeStroke(
      [
        ...sampleArc(0.49, 0.64, 0.21, 0.16, -180, 0, 30),
        ...sampleLine(0.7, 0.64, 0.7, 0.88, 20)
      ],
      'Arch over the hill and down.'
    )
  ]);
  registerGlyph('i', false, [
    makeStroke(sampleLine(0.5, 0.48, 0.5, 0.88), 'Short line down.'),
    makeStroke(sampleLine(0.5, 0.28, 0.5, 0.34), 'Tap the dot on top.')
  ]);
  registerGlyph('j', false, [
    makeStroke(
      [
        ...sampleLine(0.56, 0.48, 0.56, 0.82, 24),
        ...sampleArc(0.4, 0.82, 0.16, 0.12, 0, 165, 28)
      ],
      'Line down and hook left.'
    ),
    makeStroke(sampleLine(0.56, 0.28, 0.56, 0.34), 'Tap the dot on top.')
  ]);
  registerGlyph('k', false, [
    makeStroke(sampleLine(0.3, 0.12, 0.3, 0.88), 'Tall line straight down.'),
    makeStroke(sampleLine(0.68, 0.48, 0.32, 0.68), 'Kick in to the middle.'),
    makeStroke(sampleLine(0.32, 0.68, 0.7, 0.88), 'Slide out to the bottom.')
  ]);
  registerGlyph('l', false, [
    makeStroke(sampleLine(0.5, 0.12, 0.5, 0.88), 'Tall line straight down.')
  ]);
  registerGlyph('m', false, [
    makeStroke(sampleLine(0.18, 0.48, 0.18, 0.88), 'Short line down.'),
    makeStroke(
      [
        ...sampleArc(0.34, 0.62, 0.16, 0.14, -180, 0, 26),
        ...sampleLine(0.5, 0.62, 0.5, 0.88, 18)
      ],
      'First hill over and down.'
    ),
    makeStroke(
      [
        ...sampleArc(0.66, 0.62, 0.16, 0.14, -180, 0, 26),
        ...sampleLine(0.82, 0.62, 0.82, 0.88, 18)
      ],
      'Second hill over and down.'
    )
  ]);
  registerGlyph('n', false, [
    makeStroke(sampleLine(0.28, 0.48, 0.28, 0.88), 'Short line down.'),
    makeStroke(
      [
        ...sampleArc(0.5, 0.64, 0.22, 0.16, -180, 0, 30),
        ...sampleLine(0.72, 0.64, 0.72, 0.88, 18)
      ],
      'One hill over and down.'
    )
  ]);
  registerGlyph('o', false, [
    makeStroke(sampleArc(0.5, 0.68, 0.22, 0.2, -90, -450, 56), 'Little circle all the way around.')
  ]);
  registerGlyph('p', false, [
    makeStroke(sampleLine(0.28, 0.48, 0.28, 0.94), 'Line down past the bottom.'),
    makeStroke(sampleArc(0.48, 0.66, 0.22, 0.18, -135, 135, 50), 'Curve around the top loop.')
  ]);
  registerGlyph('q', false, [
    makeStroke(sampleArc(0.46, 0.66, 0.2, 0.18, 0, -360, 52), 'Circle around at the middle.'),
    makeStroke(sampleLine(0.66, 0.48, 0.66, 0.94), 'Line straight down.')
  ]);
  registerGlyph('r', false, [
    makeStroke(sampleLine(0.34, 0.48, 0.34, 0.88), 'Short line down.'),
    makeStroke(sampleArc(0.52, 0.62, 0.18, 0.14, -180, -25, 28), 'Little rainbow arch at the top.')
  ]);
  registerGlyph('s', false, [
    makeStroke(
      sampleSmoothCurve([
        [0.66, 0.54],
        [0.5, 0.48],
        [0.32, 0.56],
        [0.5, 0.68],
        [0.68, 0.78],
        [0.48, 0.88],
        [0.32, 0.82]
      ]),
      'Little curvy s track.'
    )
  ]);
  registerGlyph('t', false, [
    makeStroke(sampleLine(0.5, 0.18, 0.5, 0.88), 'Tall line straight down.'),
    makeStroke(sampleLine(0.3, 0.48, 0.7, 0.48), 'Crossbar across the middle.')
  ]);
  registerGlyph('u', false, [
    makeStroke(
      [
        ...sampleLine(0.28, 0.48, 0.28, 0.72, 18),
        ...sampleArc(0.48, 0.72, 0.2, 0.16, 180, 0, 32)
      ],
      'Down and curve under.'
    ),
    makeStroke(sampleLine(0.68, 0.48, 0.68, 0.88), 'Short line down on the right.')
  ]);
  registerGlyph('v', false, [
    makeStroke(sampleLine(0.26, 0.48, 0.5, 0.88), 'Slant down to the point.'),
    makeStroke(sampleLine(0.74, 0.48, 0.5, 0.88), 'Slant down from the right.')
  ]);
  registerGlyph('w', false, [
    makeStroke(sampleLine(0.18, 0.48, 0.34, 0.88), 'Slant down first valley.'),
    makeStroke(sampleLine(0.5, 0.56, 0.34, 0.88), 'Slant down from center.'),
    makeStroke(sampleLine(0.5, 0.56, 0.66, 0.88), 'Slant down second valley.'),
    makeStroke(sampleLine(0.82, 0.48, 0.66, 0.88), 'Slant down from right.')
  ]);
  registerGlyph('x', false, [
    makeStroke(sampleLine(0.28, 0.48, 0.72, 0.88), 'Slant down right.'),
    makeStroke(sampleLine(0.72, 0.48, 0.28, 0.88), 'Criss-cross down left.')
  ]);
  registerGlyph('y', false, [
    makeStroke(sampleLine(0.28, 0.48, 0.5, 0.74), 'Slant down to the middle.'),
    makeStroke(sampleLine(0.72, 0.48, 0.34, 0.94), 'Long slant all the way down.')
  ]);
  registerGlyph('z', false, [
    makeStroke(sampleLine(0.28, 0.48, 0.72, 0.48), 'Across the middle.'),
    makeStroke(sampleLine(0.72, 0.48, 0.28, 0.88), 'Diagonal down left.'),
    makeStroke(sampleLine(0.28, 0.88, 0.72, 0.88), 'Across the bottom.')
  ]);
}

// ============================================================================
// PENMANSHIP ENGINE CLASS
// ============================================================================

export class PenmanshipEngine {
  private canvasX: number;
  private canvasY: number;
  private canvasSize: number;
  private corridorRadiusPx: number;

  private activeGlyph!: CharacterPenmanshipGlyph;
  private currentStrokeIndex = 0;
  private lastValidWaypointIndex = 0;
  private isStrokeStarted = false;
  private isOffTrack = false;
  private requiresPointerLift = false;

  /** Authentic freehand points recorded per completed stroke + current stroke */
  private completedFreehandStrokes: NormalizedPoint[][] = [];
  private activeFreehandStroke: NormalizedPoint[] = [];

  constructor(canvasX: number, canvasY: number, canvasSize: number, corridorRadiusPx = 38) {
    buildGlyphLibrary();
    this.canvasX = canvasX;
    this.canvasY = canvasY;
    this.canvasSize = canvasSize;
    this.corridorRadiusPx = corridorRadiusPx;
    this.loadCharacter('A');
  }

  public setCorridorRadiusPx(radiusPx: number): void {
    this.corridorRadiusPx = Math.max(24, Math.min(80, radiusPx));
  }

  public getCorridorRadiusPx(): number {
    return this.corridorRadiusPx;
  }

  public loadCharacter(char: string): CharacterPenmanshipGlyph {
    buildGlyphLibrary();
    const trimmed = char.trim();
    this.activeGlyph = GLYPH_MAP[trimmed] ?? GLYPH_MAP[trimmed.toUpperCase()] ?? GLYPH_MAP['A'];
    this.resetCurrentCharacter();
    return this.activeGlyph;
  }

  public resetCurrentCharacter(): void {
    this.currentStrokeIndex = 0;
    this.lastValidWaypointIndex = 0;
    this.isStrokeStarted = false;
    this.isOffTrack = false;
    this.requiresPointerLift = false;
    this.completedFreehandStrokes = [];
    this.activeFreehandStroke = [];
  }

  public getActiveGlyph(): CharacterPenmanshipGlyph {
    return this.activeGlyph;
  }

  public getCurrentStrokeIndex(): number {
    return this.currentStrokeIndex;
  }

  public getTotalStrokes(): number {
    return this.activeGlyph.strokes.length;
  }

  public getCurrentStroke(): StrokeDefinition | null {
    return this.activeGlyph.strokes[this.currentStrokeIndex] ?? null;
  }

  public isCharacterComplete(): boolean {
    return this.currentStrokeIndex >= this.activeGlyph.strokes.length;
  }

  public getIsOffTrack(): boolean {
    return this.isOffTrack;
  }

  public getRequiresPointerLift(): boolean {
    return this.requiresPointerLift;
  }

  public normalizedToScreen(pt: NormalizedPoint): ScreenPoint {
    const left = this.canvasX - this.canvasSize / 2;
    const top = this.canvasY - this.canvasSize / 2;
    return {
      x: left + pt.nx * this.canvasSize,
      y: top + pt.ny * this.canvasSize
    };
  }

  public screenToNormalized(x: number, y: number): NormalizedPoint {
    const left = this.canvasX - this.canvasSize / 2;
    const top = this.canvasY - this.canvasSize / 2;
    return {
      nx: Math.max(0, Math.min(1, (x - left) / this.canvasSize)),
      ny: Math.max(0, Math.min(1, (y - top) / this.canvasSize))
    };
  }

  public getActiveResumeScreenPoint(): ScreenPoint {
    const stroke = this.getCurrentStroke();
    if (!stroke) return { x: this.canvasX, y: this.canvasY };
    const idx = Math.min(this.lastValidWaypointIndex, stroke.waypoints.length - 1);
    return this.normalizedToScreen(stroke.waypoints[idx]);
  }

  public getActiveFinishScreenPoint(): ScreenPoint {
    const stroke = this.getCurrentStroke();
    if (!stroke) return { x: this.canvasX, y: this.canvasY };
    return this.normalizedToScreen(stroke.waypoints[stroke.waypoints.length - 1]);
  }

  public getActiveTangentAngleRad(): number {
    const stroke = this.getCurrentStroke();
    if (!stroke || stroke.waypoints.length < 2) return 0;
    const i0 = Math.min(this.lastValidWaypointIndex, stroke.waypoints.length - 2);
    const p0 = stroke.waypoints[i0];
    const p1 = stroke.waypoints[i0 + 1];
    return Math.atan2(p1.ny - p0.ny, p1.nx - p0.nx);
  }

  /**
   * Returns all completed freehand strokes + the in-progress stroke in normalized coordinates.
   */
  public getAllFreehandStrokesNormalized(): NormalizedPoint[][] {
    if (this.activeFreehandStroke.length > 1) {
      return [...this.completedFreehandStrokes, this.activeFreehandStroke];
    }
    return [...this.completedFreehandStrokes];
  }

  public getRecordedSample(): RecordedHandwritingSample {
    return {
      character: this.activeGlyph.char,
      freehandStrokes: this.completedFreehandStrokes.map((s) => s.map((pt) => ({ nx: pt.nx, ny: pt.ny })))
    };
  }

  /**
   * Called on `pointerup` so multi-stroke letters know the child lifted their finger.
   */
  public handlePointerUp(): void {
    this.requiresPointerLift = false;
    if (this.isStrokeStarted && this.lastValidWaypointIndex > 0) {
      // Keep progress paused at `lastValidWaypointIndex` so they can resume right from where they lifted!
      this.isOffTrack = false;
    }
  }

  /**
   * Called on `pointerdown` at `(x, y)`.
   * Checks if the child tapped near the Green Starting Flag (`P[0]`) or the current resume point (`P[lastValidWaypointIndex]`).
   */
  public handlePointerDown(x: number, y: number): PenmanshipStepResult {
    this.requiresPointerLift = false;
    return this.evaluatePointer(x, y, true);
  }

  /**
   * Called on `pointermove` while dragging at `(x, y)`.
   */
  public handlePointerMove(x: number, y: number): PenmanshipStepResult {
    if (this.requiresPointerLift) {
      return this.buildStepResult('WAITING_FOR_START_FLAG', 0);
    }
    return this.evaluatePointer(x, y, false);
  }

  private evaluatePointer(x: number, y: number, isPointerDown: boolean): PenmanshipStepResult {
    const stroke = this.getCurrentStroke();
    if (!stroke) {
      return this.buildStepResult('CHARACTER_COMPLETED', 0);
    }

    const waypoints = stroke.waypoints;
    const totalPts = waypoints.length;
    const resumeScreen = this.getActiveResumeScreenPoint();
    const distToResume = Math.hypot(x - resumeScreen.x, y - resumeScreen.y);

    // 1. If the stroke hasn't started yet OR the child is recovering from an off-track rumble,
    //    they MUST touch within the Green Flag / Resume Circle capture radius (`corridorRadius * 1.18`).
    const captureRadius = this.corridorRadiusPx * 1.18;
    if (!this.isStrokeStarted || this.isOffTrack) {
      if (distToResume <= captureRadius) {
        this.isStrokeStarted = true;
        this.isOffTrack = false;
        this.appendFreehandPoint(x, y);
        return this.buildStepResult('ADVANCING_ON_TRACK', distToResume);
      } else {
        // If they tapped down far away from the Green Starting Flag, remind them to start at the flag
        const status: PenmanshipStepStatus =
          !this.isStrokeStarted && isPointerDown ? 'WAITING_FOR_START_FLAG' : 'OFF_TRACK_RUMBLE';
        return this.buildStepResult(status, distToResume);
      }
    }

    // 2. The child is actively tracing! Search within a bounded forward window
    //    `[lastValidWaypointIndex, lastValidWaypointIndex + maxForwardStep]`
    //    so they cannot skip loops or jump straight to the end of a stroke.
    const maxForwardStep = 10; // ~60px forward along the stroke
    const maxBackCheck = 8;
    const searchStart = Math.max(0, this.lastValidWaypointIndex - maxBackCheck);
    const searchEnd = Math.min(totalPts - 1, this.lastValidWaypointIndex + maxForwardStep);

    let bestIdx = this.lastValidWaypointIndex;
    let bestDistPx = Infinity;

    for (let i = searchStart; i <= searchEnd; i++) {
      const sp = this.normalizedToScreen(waypoints[i]);
      const d = Math.hypot(x - sp.x, y - sp.y);
      if (d < bestDistPx) {
        bestDistPx = d;
        bestIdx = i;
      }
    }

    // 3. Check if the child strayed outside the corridor OR tried to drag backwards (> 3 waypoints behind)
    const draggedBackwards =
      bestIdx < this.lastValidWaypointIndex - 3 && distToResume > this.corridorRadiusPx * 0.72;

    if (bestDistPx > this.corridorRadiusPx || draggedBackwards) {
      this.isOffTrack = true;
      return this.buildStepResult('OFF_TRACK_RUMBLE', bestDistPx);
    }

    // 4. Valid on-track movement! Advance `lastValidWaypointIndex` monotonically and record authentic freehand ink
    if (bestIdx > this.lastValidWaypointIndex) {
      this.lastValidWaypointIndex = bestIdx;
    }
    this.appendFreehandPoint(x, y);

    // 5. Check if the child reached the Checkered Finish Target at the end of the stroke
    const finishPt = this.getActiveFinishScreenPoint();
    const distToFinish = Math.hypot(x - finishPt.x, y - finishPt.y);
    const reachedEnd =
      this.lastValidWaypointIndex >= totalPts - 3 ||
      (this.lastValidWaypointIndex >= Math.floor(totalPts * 0.82) &&
        distToFinish <= this.corridorRadiusPx * 0.95);

    if (reachedEnd) {
      this.lastValidWaypointIndex = totalPts - 1;
      this.appendFreehandPoint(x, y);
      this.completedFreehandStrokes.push([...this.activeFreehandStroke]);
      this.activeFreehandStroke = [];

      this.currentStrokeIndex++;
      this.lastValidWaypointIndex = 0;
      this.isStrokeStarted = false;
      this.isOffTrack = false;
      this.requiresPointerLift = true;

      if (this.currentStrokeIndex >= this.activeGlyph.strokes.length) {
        return this.buildStepResult('CHARACTER_COMPLETED', 0);
      }
      return this.buildStepResult('STROKE_COMPLETED', 0);
    }

    return this.buildStepResult('ADVANCING_ON_TRACK', bestDistPx);
  }

  private appendFreehandPoint(x: number, y: number): void {
    const norm = this.screenToNormalized(x, y);
    const n = this.activeFreehandStroke.length;
    if (n > 0) {
      const prev = this.activeFreehandStroke[n - 1];
      const distNorm = Math.hypot(norm.nx - prev.nx, norm.ny - prev.ny);
      if (distNorm < 0.004) return;
    }
    this.activeFreehandStroke.push(norm);
  }

  private buildStepResult(status: PenmanshipStepStatus, distanceFromTrackPx: number): PenmanshipStepResult {
    const stroke = this.getCurrentStroke();
    const totalWaypoints = stroke ? Math.max(1, stroke.waypoints.length - 1) : 1;
    const progress = stroke ? Math.min(1, this.lastValidWaypointIndex / totalWaypoints) : 1;

    return {
      status,
      strokeIndex: Math.min(this.currentStrokeIndex, this.activeGlyph.strokes.length - 1),
      totalStrokes: this.activeGlyph.strokes.length,
      strokeProgress: progress,
      resumePoint: this.getActiveResumeScreenPoint(),
      finishPoint: this.getActiveFinishScreenPoint(),
      tangentAngleRad: this.getActiveTangentAngleRad(),
      distanceFromTrackPx
    };
  }
}
