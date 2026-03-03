import type { ThemeName } from '@/types';
import {
  PARTICLE_COUNT_FOREGROUND,
  PARTICLE_COUNT_FOREGROUND_MOBILE,
  PARTICLE_COUNT_BACKGROUND,
  PARTICLE_COUNT_BACKGROUND_MOBILE,
} from '@/lib/constants';
import { clamp, lerp, randomBetween, randomBetweenInt } from '@/lib/utils';

type RGBAColor = { r: number; g: number; b: number; a: number };

type ParticleType =
  | 'star-tiny' | 'star-small' | 'star-medium' | 'star-giant' | 'nebula-wisp' | 'shooting-star'
  | 'bubble' | 'plankton' | 'caustic-ray' | 'water-mote' | 'foam' | 'deep-glow'
  | 'firefly' | 'leaf' | 'pollen' | 'spore' | 'forest-dust' | 'mist'
  | 'ember-large' | 'ember-small' | 'spark' | 'smoke' | 'ash' | 'cinder'
  | 'minimal-dot' | 'minimal-ring' | 'minimal-line' | 'minimal-mote';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  size: number;
  baseSize: number;
  opacity: number;
  baseOpacity: number;
  color: RGBAColor;
  targetColor: RGBAColor;
  depth: 0 | 1;
  phase: number;
  phase2: number;
  phaseSpeed: number;
  phase2Speed: number;
  life: number;
  maxLife: number;
  type: ParticleType;
  twinkle: number;
  twinkleSpeed: number;
  rotation: number;
  rotationSpeed: number;
  trail: Array<{ x: number; y: number; a: number }>;
  trailMax: number;
  blinkOn: boolean;
  blinkTimer: number;
  blinkDuration: number;
  extra: number;
};

export type ParticleEngineConfig = {
  canvas: HTMLCanvasElement;
  theme: ThemeName;
  isForeground: boolean;
  onDramaticEvent?: () => void;
};

export type ParticleEngine = {
  start(): void;
  stop(): void;
  setTheme(theme: ThemeName, morphDuration: number): void;
  setNightMode(on: boolean): void;
  setMousePosition(x: number, y: number): void;
  setIdleAttraction(on: boolean): void;
  resize(width: number, height: number): void;
};

const C = (r: number, g: number, b: number, a: number): RGBAColor => ({ r, g, b, a });

const THEME_PALETTES: Record<ThemeName, RGBAColor[]> = {
  space: [
    C(255, 255, 255, 0.95),
    C(200, 180, 255, 0.85),
    C(150, 120, 255, 0.80),
    C(255, 210, 120, 0.90),
    C(120, 180, 255, 0.85),
    C(255, 150, 100, 0.75),
    C(180, 255, 220, 0.70),
  ],
  ocean: [
    C(80,  230, 220, 0.85),
    C(20,  160, 210, 0.75),
    C(140, 240, 255, 0.70),
    C(0,   200, 255, 0.65),
    C(60,  180, 200, 0.80),
    C(180, 250, 255, 0.60),
    C(0,   140, 200, 0.70),
  ],
  forest: [
    C(120, 220, 80,  0.80),
    C(60,  180, 40,  0.70),
    C(200, 240, 80,  0.65),
    C(160, 255, 120, 0.75),
    C(80,  200, 60,  0.70),
    C(220, 255, 100, 0.60),
    C(100, 160, 40,  0.80),
  ],
  ember: [
    C(255, 140, 20,  0.95),
    C(255, 80,  10,  0.90),
    C(255, 220, 80,  0.85),
    C(200, 50,  5,   0.80),
    C(255, 180, 40,  0.85),
    C(180, 30,  0,   0.75),
    C(255, 240, 180, 0.90),
  ],
  minimal: [
    C(255, 255, 255, 0.90),
    C(200, 200, 220, 0.60),
    C(180, 180, 200, 0.50),
    C(220, 220, 240, 0.55),
    C(160, 160, 180, 0.45),
    C(240, 240, 255, 0.65),
    C(200, 200, 215, 0.50),
  ],
};

const rc = (theme: ThemeName, i?: number): RGBAColor => {
  const p = THEME_PALETTES[theme];
  return p[i !== undefined ? i % p.length : randomBetweenInt(0, p.length - 1)]!;
};

const lc = (a: RGBAColor, b: RGBAColor, t: number): RGBAColor =>
  C(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t), lerp(a.a, b.a, t));

const s = (c: RGBAColor, a?: number): string =>
  `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a !== undefined ? a : c.a})`;

const isMob = (): boolean => typeof window !== 'undefined' && window.innerWidth < 768;

const MAX_V = 2.2;
const cv = (v: number): number => clamp(v, -MAX_V, MAX_V);

export const createParticleEngine = (cfg: ParticleEngineConfig): ParticleEngine => {
  const { canvas, isForeground, onDramaticEvent } = cfg;

  let ctx: CanvasRenderingContext2D | null = null;
  let W = 0;
  let H = 0;
  let theme: ThemeName = cfg.theme;
  let targetTheme: ThemeName = cfg.theme;
  let morphT = 1.0;
  let morphFrames = 0;
  let morphElapsed = 0;
  let night = false;
  let mx = 0;
  let my = 0;
  let idle = false;
  let rafId: number | null = null;
  let frame = 0;
  let evtTimer = 0;
  let evtInterval = randomBetweenInt(8, 25) * 60;

  let particles: Particle[] = [];

  let nebulaOff: OffscreenCanvas | HTMLCanvasElement | null = null;
  let nebulaCtx: CanvasRenderingContext2D | null = null;
  let nebulaReady = false;

  let bgAnimT = 0;

  const getCtx = (): CanvasRenderingContext2D | null => {
    if (ctx) return ctx;
    try { ctx = canvas.getContext('2d', { alpha: true }); } catch { ctx = null; }
    return ctx;
  };

  const resetCtx = (): void => { ctx = null; };

  const pCount = (): number => {
    const m = isMob();
    return isForeground
      ? (m ? PARTICLE_COUNT_FOREGROUND_MOBILE : PARTICLE_COUNT_FOREGROUND)
      : (m ? PARTICLE_COUNT_BACKGROUND_MOBILE : PARTICLE_COUNT_BACKGROUND);
  };

  const makeParticle = (): Particle => ({
    x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    size: 1, baseSize: 1, opacity: 1, baseOpacity: 1,
    color: C(255, 255, 255, 1), targetColor: C(255, 255, 255, 1),
    depth: isForeground ? 0 : 1,
    phase: randomBetween(0, Math.PI * 2),
    phase2: randomBetween(0, Math.PI * 2),
    phaseSpeed: 0, phase2Speed: 0,
    life: 0, maxLife: 600,
    type: 'star-tiny',
    twinkle: 1, twinkleSpeed: 0,
    rotation: 0, rotationSpeed: 0,
    trail: [], trailMax: 0,
    blinkOn: false, blinkTimer: 0, blinkDuration: 0,
    extra: 0,
  });

  const spawnSpaceParticle = (p: Particle, fy?: number): void => {
    const roll = Math.random();
    p.x = randomBetween(0, W);
    p.y = fy ?? randomBetween(0, H);

    if (roll < 0.01 && isForeground) {
      p.type = 'star-giant';
      p.size = randomBetween(3.5, 7);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.04, 0.04);
      p.vy = randomBetween(-0.04, 0.04);
      p.baseOpacity = randomBetween(0.85, 1.0);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(3, 6));
      p.twinkleSpeed = randomBetween(0.025, 0.055);
      p.trailMax = 0;
      p.trail = [];
    } else if (roll < 0.07 && isForeground) {
      p.type = 'star-medium';
      p.size = randomBetween(1.6, 3.2);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.06, 0.06);
      p.vy = randomBetween(-0.06, 0.06);
      p.baseOpacity = randomBetween(0.65, 0.95);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(0, 4));
      p.twinkleSpeed = randomBetween(0.03, 0.08);
    } else if (roll < 0.002 && isForeground) {
      p.type = 'nebula-wisp';
      p.size = randomBetween(20, 60);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.02, 0.02);
      p.vy = randomBetween(-0.02, 0.02);
      p.baseOpacity = randomBetween(0.04, 0.12);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(1, 3));
      p.phaseSpeed = randomBetween(0.002, 0.006);
    } else {
      p.type = 'star-tiny';
      p.size = isForeground ? randomBetween(0.4, 1.6) : randomBetween(0.3, 1.0);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.025, 0.025);
      p.vy = randomBetween(-0.025, 0.025);
      p.baseOpacity = randomBetween(0.2, 0.85);
      p.opacity = p.baseOpacity;
      p.color = Math.random() < 0.85 ? rc(theme, 0) : rc(theme, randomBetweenInt(1, 5));
      p.twinkleSpeed = randomBetween(0.008, 0.04);
    }

    p.targetColor = p.color;
    p.phaseSpeed = p.phaseSpeed || randomBetween(0.005, 0.025);
    p.phase2Speed = randomBetween(0.003, 0.015);
    p.life = 0;
    p.maxLife = randomBetweenInt(1200, 4000);
  };

  const spawnOceanParticle = (p: Particle, fy?: number): void => {
    const roll = Math.random();
    p.x = randomBetween(0, W);
    p.y = fy ?? randomBetween(0, H);
    p.phase = randomBetween(0, Math.PI * 2);
    p.phase2 = randomBetween(0, Math.PI * 2);
    p.phaseSpeed = randomBetween(0.012, 0.028);
    p.phase2Speed = randomBetween(0.007, 0.018);
    p.life = 0;
    p.maxLife = randomBetweenInt(400, 1600);

    if (roll < 0.12 && isForeground) {
      p.type = 'bubble';
      p.size = randomBetween(3, 14);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.12, 0.12);
      p.vy = randomBetween(-0.55, -0.18);
      p.baseOpacity = randomBetween(0.18, 0.45);
      p.opacity = p.baseOpacity;
      p.color = C(180, 240, 255, p.baseOpacity);
      p.maxLife = randomBetweenInt(200, 700);
    } else if (roll < 0.30) {
      p.type = 'plankton';
      p.size = randomBetween(1.2, 3.5);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.18, 0.18);
      p.vy = randomBetween(-0.12, 0.10);
      p.baseOpacity = randomBetween(0.5, 1.0);
      p.opacity = 0;
      p.blinkOn = false;
      p.blinkTimer = randomBetweenInt(40, 200);
      p.blinkDuration = randomBetweenInt(20, 80);
      p.color = Math.random() < 0.5 ? C(40, 220, 200, p.baseOpacity) : C(80, 180, 255, p.baseOpacity);
    } else if (roll < 0.48) {
      p.type = 'caustic-ray';
      p.size = randomBetween(0.8, 2.2);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.04, 0.04);
      p.vy = randomBetween(0.08, 0.35);
      p.baseOpacity = randomBetween(0.25, 0.65);
      p.opacity = p.baseOpacity;
      p.color = C(100, 220, 255, p.baseOpacity);
      p.x = randomBetween(0, W);
      p.y = fy ?? randomBetween(-H * 0.3, H * 0.4);
    } else if (roll < 0.62 && isForeground) {
      p.type = 'foam';
      p.size = randomBetween(1, 4);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.3, 0.3);
      p.vy = randomBetween(-0.08, 0.08);
      p.baseOpacity = randomBetween(0.2, 0.55);
      p.opacity = p.baseOpacity;
      p.color = C(200, 250, 255, p.baseOpacity);
    } else if (roll < 0.72 && !isForeground) {
      p.type = 'deep-glow';
      p.size = randomBetween(15, 55);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.06, 0.06);
      p.vy = randomBetween(-0.04, 0.04);
      p.baseOpacity = randomBetween(0.03, 0.10);
      p.opacity = p.baseOpacity;
      p.color = Math.random() < 0.5 ? C(0, 160, 220, p.baseOpacity) : C(40, 200, 200, p.baseOpacity);
    } else {
      p.type = 'water-mote';
      p.size = isForeground ? randomBetween(0.8, 2.5) : randomBetween(0.4, 1.5);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.12, 0.12);
      p.vy = randomBetween(-0.10, 0.10);
      p.baseOpacity = randomBetween(0.2, 0.55);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(0, 4));
    }
    p.targetColor = p.color;
  };

  const spawnForestParticle = (p: Particle, fy?: number): void => {
    const roll = Math.random();
    p.x = randomBetween(0, W);
    p.y = fy ?? randomBetween(0, H);
    p.phase = randomBetween(0, Math.PI * 2);
    p.phase2 = randomBetween(0, Math.PI * 2);
    p.phaseSpeed = randomBetween(0.010, 0.022);
    p.phase2Speed = randomBetween(0.006, 0.016);
    p.life = 0;
    p.rotation = randomBetween(0, Math.PI * 2);

    if (roll < 0.10 && isForeground) {
      p.type = 'firefly';
      p.size = randomBetween(2.2, 5);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.28, 0.28);
      p.vy = randomBetween(-0.18, 0.18);
      p.baseOpacity = randomBetween(0.7, 1.0);
      p.opacity = 0;
      p.blinkOn = false;
      p.blinkTimer = randomBetweenInt(60, 300);
      p.blinkDuration = randomBetweenInt(20, 60);
      p.color = Math.random() < 0.7 ? C(180, 255, 80, p.baseOpacity) : C(220, 255, 120, p.baseOpacity);
      p.maxLife = randomBetweenInt(600, 2000);
    } else if (roll < 0.25 && isForeground) {
      p.type = 'leaf';
      p.x = randomBetween(0, W);
      p.y = fy ?? randomBetween(-60, H * 0.5);
      p.vx = randomBetween(-0.5, 0.5);
      p.vy = randomBetween(0.25, 0.85);
      p.size = randomBetween(4, 9);
      p.baseSize = p.size;
      p.baseOpacity = randomBetween(0.45, 0.85);
      p.opacity = p.baseOpacity;
      p.rotationSpeed = randomBetween(-0.04, 0.04);
      p.maxLife = randomBetweenInt(400, 1200);
      const leafCols = [
        C(80,  160, 40,  p.baseOpacity),
        C(120, 200, 50,  p.baseOpacity),
        C(180, 220, 60,  p.baseOpacity),
        C(60,  140, 35,  p.baseOpacity),
        C(200, 180, 40,  p.baseOpacity),
      ];
      p.color = leafCols[randomBetweenInt(0, leafCols.length - 1)]!;
    } else if (roll < 0.42) {
      p.type = 'pollen';
      p.size = randomBetween(1.0, 2.8);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.18, 0.18);
      p.vy = randomBetween(-0.28, -0.04);
      p.baseOpacity = randomBetween(0.35, 0.75);
      p.opacity = p.baseOpacity;
      p.color = C(220, 255, 100, p.baseOpacity);
      p.maxLife = randomBetweenInt(400, 1200);
    } else if (roll < 0.56) {
      p.type = 'spore';
      p.size = randomBetween(0.8, 2.0);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.1, 0.1);
      p.vy = randomBetween(-0.15, 0.05);
      p.baseOpacity = randomBetween(0.2, 0.55);
      p.opacity = p.baseOpacity;
      p.color = C(160, 255, 120, p.baseOpacity);
      p.maxLife = randomBetweenInt(300, 1000);
    } else if (roll < 0.70 && !isForeground) {
      p.type = 'mist';
      p.size = randomBetween(20, 70);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.08, 0.08);
      p.vy = randomBetween(-0.04, 0.04);
      p.baseOpacity = randomBetween(0.025, 0.075);
      p.opacity = p.baseOpacity;
      p.color = C(120, 180, 80, p.baseOpacity);
      p.maxLife = randomBetweenInt(800, 2400);
    } else {
      p.type = 'forest-dust';
      p.size = isForeground ? randomBetween(0.8, 2.2) : randomBetween(0.4, 1.4);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.10, 0.10);
      p.vy = randomBetween(-0.08, 0.08);
      p.baseOpacity = randomBetween(0.15, 0.45);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(0, 4));
      p.maxLife = randomBetweenInt(500, 1800);
    }
    p.targetColor = p.color;
  };

  const spawnEmberParticle = (p: Particle, fy?: number): void => {
    const roll = Math.random();
    p.phase = randomBetween(0, Math.PI * 2);
    p.phase2 = randomBetween(0, Math.PI * 2);
    p.phaseSpeed = randomBetween(0.022, 0.05);
    p.phase2Speed = randomBetween(0.014, 0.035);
    p.life = 0;

    if (roll < 0.14 && isForeground) {
      p.type = 'ember-large';
      p.x = randomBetween(W * 0.15, W * 0.85);
      p.y = fy ?? randomBetween(H * 0.55, H + 30);
      p.vx = randomBetween(-0.9, 0.9);
      p.vy = randomBetween(-1.6, -0.5);
      p.size = randomBetween(3.5, 8);
      p.baseSize = p.size;
      p.baseOpacity = randomBetween(0.75, 1.0);
      p.opacity = p.baseOpacity;
      p.color = C(255, 180, 40, p.baseOpacity);
      p.trailMax = 10;
      p.trail = [];
      p.maxLife = randomBetweenInt(120, 400);
    } else if (roll < 0.38) {
      p.type = 'ember-small';
      p.x = randomBetween(W * 0.10, W * 0.90);
      p.y = fy ?? randomBetween(H * 0.45, H + 20);
      p.vx = randomBetween(-0.6, 0.6);
      p.vy = randomBetween(-1.2, -0.3);
      p.size = randomBetween(1.5, 3.5);
      p.baseSize = p.size;
      p.baseOpacity = randomBetween(0.6, 0.95);
      p.opacity = p.baseOpacity;
      p.color = C(255, 120, 20, p.baseOpacity);
      p.maxLife = randomBetweenInt(100, 300);
    } else if (roll < 0.56 && isForeground) {
      p.type = 'spark';
      p.x = randomBetween(W * 0.10, W * 0.90);
      p.y = fy ?? randomBetween(H * 0.5, H + 10);
      p.vx = randomBetween(-1.4, 1.4);
      p.vy = randomBetween(-2.0, -0.7);
      p.size = randomBetween(0.8, 2.2);
      p.baseSize = p.size;
      p.baseOpacity = randomBetween(0.7, 1.0);
      p.opacity = p.baseOpacity;
      p.color = C(255, 240, 160, p.baseOpacity);
      p.trailMax = 6;
      p.trail = [];
      p.maxLife = randomBetweenInt(60, 180);
    } else if (roll < 0.72) {
      p.type = 'smoke';
      p.x = randomBetween(W * 0.08, W * 0.92);
      p.y = fy ?? randomBetween(H * 0.35, H * 0.75);
      p.vx = randomBetween(-0.18, 0.18);
      p.vy = randomBetween(-0.45, -0.10);
      p.size = isForeground ? randomBetween(10, 28) : randomBetween(22, 55);
      p.baseSize = p.size;
      p.baseOpacity = isForeground ? randomBetween(0.035, 0.095) : randomBetween(0.02, 0.06);
      p.opacity = p.baseOpacity;
      p.color = C(70, 55, 48, p.baseOpacity);
      p.maxLife = randomBetweenInt(300, 900);
    } else if (roll < 0.85) {
      p.type = 'cinder';
      p.x = randomBetween(0, W);
      p.y = fy ?? randomBetween(H * 0.2, H);
      p.vx = randomBetween(-0.4, 0.4);
      p.vy = randomBetween(-0.5, -0.05);
      p.size = randomBetween(1.0, 2.5);
      p.baseSize = p.size;
      p.baseOpacity = randomBetween(0.4, 0.8);
      p.opacity = p.baseOpacity;
      p.color = C(200, 80, 10, p.baseOpacity);
      p.maxLife = randomBetweenInt(200, 600);
    } else {
      p.type = 'ash';
      p.x = randomBetween(0, W);
      p.y = fy ?? randomBetween(0, H);
      p.vx = randomBetween(-0.28, 0.28);
      p.vy = randomBetween(-0.3, 0.08);
      p.size = randomBetween(0.5, 1.8);
      p.baseSize = p.size;
      p.baseOpacity = randomBetween(0.12, 0.40);
      p.opacity = p.baseOpacity;
      p.color = C(155, 140, 130, p.baseOpacity);
      p.maxLife = randomBetweenInt(400, 1200);
    }
    p.targetColor = p.color;
  };

  const spawnMinimalParticle = (p: Particle, fy?: number): void => {
    const roll = Math.random();
    p.x = randomBetween(0, W);
    p.y = fy ?? randomBetween(0, H);
    p.phase = randomBetween(0, Math.PI * 2);
    p.phase2 = randomBetween(0, Math.PI * 2);
    p.phaseSpeed = randomBetween(0.005, 0.014);
    p.phase2Speed = randomBetween(0.003, 0.010);
    p.life = 0;
    p.maxLife = randomBetweenInt(600, 2400);

    if (roll < 0.28 && isForeground) {
      p.type = 'minimal-dot';
      p.size = randomBetween(1.5, 4.5);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.18, 0.18);
      p.vy = randomBetween(-0.18, 0.18);
      p.baseOpacity = randomBetween(0.45, 0.88);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(0, 3));
      p.twinkleSpeed = randomBetween(0.008, 0.025);
    } else if (roll < 0.52) {
      p.type = 'minimal-ring';
      p.size = randomBetween(5, 18);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.10, 0.10);
      p.vy = randomBetween(-0.10, 0.10);
      p.baseOpacity = randomBetween(0.08, 0.28);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(1, 5));
    } else if (roll < 0.66 && isForeground) {
      p.type = 'minimal-line';
      p.size = randomBetween(10, 40);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.08, 0.08);
      p.vy = randomBetween(-0.08, 0.08);
      p.baseOpacity = randomBetween(0.06, 0.20);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, 0);
      p.rotation = randomBetween(0, Math.PI);
      p.rotationSpeed = randomBetween(-0.003, 0.003);
    } else {
      p.type = 'minimal-mote';
      p.size = isForeground ? randomBetween(0.6, 1.8) : randomBetween(0.3, 1.2);
      p.baseSize = p.size;
      p.vx = randomBetween(-0.07, 0.07);
      p.vy = randomBetween(-0.07, 0.07);
      p.baseOpacity = randomBetween(0.12, 0.40);
      p.opacity = p.baseOpacity;
      p.color = rc(theme, randomBetweenInt(0, 4));
    }
    p.targetColor = p.color;
  };

  const spawnParticle = (p: Particle, fy?: number): void => {
    p.trail = [];
    p.ax = 0;
    p.ay = 0;
    switch (theme) {
      case 'space':   spawnSpaceParticle(p, fy);   break;
      case 'ocean':   spawnOceanParticle(p, fy);   break;
      case 'forest':  spawnForestParticle(p, fy);  break;
      case 'ember':   spawnEmberParticle(p, fy);   break;
      case 'minimal': spawnMinimalParticle(p, fy); break;
    }
  };

  const createParticles = (): void => {
    const n = pCount();
    particles = Array.from({ length: n }, () => {
      const p = makeParticle();
      spawnParticle(p);
      return p;
    });
  };

  const buildNebula = (): void => {
    if (!W || !H) return;
    try {
      nebulaOff = new OffscreenCanvas(W, H);
      nebulaCtx = (nebulaOff as OffscreenCanvas).getContext('2d') as unknown as CanvasRenderingContext2D;
    } catch {
      const el = document.createElement('canvas');
      el.width = W; el.height = H;
      nebulaOff = el;
      nebulaCtx = el.getContext('2d');
    }
    if (!nebulaCtx) return;
    const nc = nebulaCtx;
    nc.clearRect(0, 0, W, H);

    const blobs: Array<{ cx: number; cy: number; rx: number; ry: number; col: [number, number, number]; a: number }> = [
      { cx: W * 0.18, cy: H * 0.22, rx: W * 0.20, ry: H * 0.18, col: [80,  20,  200], a: 0.18 },
      { cx: W * 0.75, cy: H * 0.35, rx: W * 0.22, ry: H * 0.16, col: [160, 20,  120], a: 0.14 },
      { cx: W * 0.50, cy: H * 0.70, rx: W * 0.28, ry: H * 0.20, col: [20,  60,  180], a: 0.16 },
      { cx: W * 0.30, cy: H * 0.80, rx: W * 0.18, ry: H * 0.14, col: [60,  0,   160], a: 0.12 },
      { cx: W * 0.85, cy: H * 0.75, rx: W * 0.16, ry: H * 0.22, col: [0,   80,  160], a: 0.13 },
      { cx: W * 0.55, cy: H * 0.15, rx: W * 0.24, ry: H * 0.12, col: [100, 0,   180], a: 0.10 },
    ];

    for (const b of blobs) {
      nc.save();
      nc.translate(b.cx, b.cy);
      const rx = b.rx;
      const ry = b.ry;
      nc.scale(rx / 100, ry / 100);
      const g = nc.createRadialGradient(0, 0, 0, 0, 0, 100);
      g.addColorStop(0,    `rgba(${b.col[0]},${b.col[1]},${b.col[2]},${b.a})`);
      g.addColorStop(0.45, `rgba(${b.col[0]},${b.col[1]},${b.col[2]},${b.a * 0.5})`);
      g.addColorStop(1,    `rgba(${b.col[0]},${b.col[1]},${b.col[2]},0)`);
      nc.fillStyle = g;
      nc.beginPath();
      nc.arc(0, 0, 100, 0, Math.PI * 2);
      nc.fill();
      nc.restore();
    }

    const mwG = nc.createLinearGradient(W * 0.05, H * 0.10, W * 0.95, H * 0.90);
    mwG.addColorStop(0,    'rgba(40,20,80,0)');
    mwG.addColorStop(0.25, 'rgba(60,40,120,0.07)');
    mwG.addColorStop(0.50, 'rgba(80,60,160,0.12)');
    mwG.addColorStop(0.75, 'rgba(60,40,120,0.07)');
    mwG.addColorStop(1,    'rgba(40,20,80,0)');
    nc.fillStyle = mwG;
    nc.fillRect(0, 0, W, H);

    nebulaReady = true;
  };

  const repelFromCenter = (p: Particle, deadR: number, force: number): void => {
    const cx = W * 0.5, cy = H * 0.5;
    const dx = p.x - cx, dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
    if (dist < deadR) {
      const f = (1 - dist / deadR) * force;
      p.vx += (dx / dist) * f;
      p.vy += (dy / dist) * f;
    }
  };

  const edgeRepel = (p: Particle, margin: number, force: number): void => {
    if (p.x < margin)     p.vx += force;
    if (p.x > W - margin) p.vx -= force;
    if (p.y < margin)     p.vy += force;
    if (p.y > H - margin) p.vy -= force;
  };

  const wrapEdges = (p: Particle): void => {
    const pad = p.size * 2 + 2;
    if (p.x < -pad)    p.x = W + pad;
    if (p.x > W + pad) p.x = -pad;
    if (p.y < -pad)    p.y = H + pad;
    if (p.y > H + pad) p.y = -pad;
  };

  const updateSpace = (p: Particle): void => {
    p.phase  += p.phaseSpeed;
    p.phase2 += p.phase2Speed;

    if (p.type === 'star-giant') {
      p.vx += randomBetween(-0.008, 0.008);
      p.vy += randomBetween(-0.008, 0.008);
      p.twinkle = 0.7 + 0.3 * Math.sin(p.phase * 2.5);
    } else if (p.type === 'star-medium') {
      p.twinkle = 0.55 + 0.45 * Math.sin(p.phase * 1.8 + p.phase2);
      p.vx += Math.sin(p.phase2) * 0.003;
    } else if (p.type === 'star-tiny') {
      p.twinkle = 0.4 + 0.6 * Math.abs(Math.sin(p.phase));
      repelFromCenter(p, Math.min(W, H) * 0.30, 0.0025);
    } else if (p.type === 'nebula-wisp') {
      p.opacity = p.baseOpacity * (0.6 + 0.4 * Math.sin(p.phase));
    }
    edgeRepel(p, 30, 0.005);
    wrapEdges(p);
  };

  const updateOcean = (p: Particle): void => {
    p.phase  += p.phaseSpeed;
    p.phase2 += p.phase2Speed;

    if (p.type === 'bubble') {
      p.vx += Math.sin(p.phase) * 0.035;
      p.vy -= 0.006;
      p.opacity -= 0.0006;
      if (p.y < -p.size * 3 || p.opacity < 0.04) spawnOceanParticle(p, H + randomBetween(0, 40));
    } else if (p.type === 'plankton') {
      p.vx += Math.sin(p.phase)  * 0.022;
      p.vy += Math.cos(p.phase2) * 0.014;
      p.blinkTimer--;
      if (p.blinkTimer <= 0) {
        if (!p.blinkOn) {
          p.blinkOn = true;
          p.blinkTimer = p.blinkDuration;
          p.opacity = p.baseOpacity;
        } else {
          p.blinkOn = false;
          p.blinkTimer = randomBetweenInt(40, 200);
          p.opacity = 0;
        }
      }
      repelFromCenter(p, Math.min(W, H) * 0.28, 0.004);
      wrapEdges(p);
    } else if (p.type === 'caustic-ray') {
      p.vx += Math.sin(p.phase * 1.4) * 0.012;
      p.vy += 0.005;
      if (p.y > H + p.size) spawnOceanParticle(p, -p.size * 2);
      if (p.x < -p.size * 2 || p.x > W + p.size * 2) p.x = randomBetween(0, W);
    } else if (p.type === 'foam') {
      p.vx += Math.sin(p.phase * 0.8) * 0.018;
      p.vy += Math.sin(p.phase2)      * 0.010;
      repelFromCenter(p, Math.min(W, H) * 0.25, 0.003);
      wrapEdges(p);
    } else if (p.type === 'deep-glow') {
      p.vx += Math.sin(p.phase)  * 0.008;
      p.vy += Math.cos(p.phase2) * 0.006;
      p.opacity = p.baseOpacity * (0.6 + 0.4 * Math.sin(p.phase * 0.5));
      wrapEdges(p);
    } else {
      p.vx += Math.sin(p.phase)  * 0.010;
      p.vy += Math.cos(p.phase2) * 0.007;
      repelFromCenter(p, Math.min(W, H) * 0.28, 0.003);
      wrapEdges(p);
    }
  };

  const updateForest = (p: Particle): void => {
    p.phase  += p.phaseSpeed;
    p.phase2 += p.phase2Speed;

    if (p.type === 'firefly') {
      p.vx += Math.sin(p.phase)  * 0.038;
      p.vy += Math.cos(p.phase2) * 0.028;
      p.blinkTimer--;
      if (p.blinkTimer <= 0) {
        if (!p.blinkOn) {
          p.blinkOn = true;
          p.blinkTimer = p.blinkDuration;
          p.opacity = p.baseOpacity;
        } else {
          p.blinkOn = false;
          p.blinkTimer = randomBetweenInt(60, 300);
          p.opacity = 0;
        }
      }
      if (p.y < H * 0.15) p.vy += 0.04;
      if (p.y > H * 0.92) p.vy -= 0.04;
      edgeRepel(p, 40, 0.015);
      wrapEdges(p);
    } else if (p.type === 'leaf') {
      p.vx += Math.sin(p.phase) * 0.055;
      p.vy += 0.012 + Math.abs(Math.sin(p.phase2)) * 0.01;
      p.rotation += p.rotationSpeed;
      p.rotationSpeed += randomBetween(-0.002, 0.002);
      p.rotationSpeed = clamp(p.rotationSpeed, -0.06, 0.06);
      if (p.y > H + 30) spawnForestParticle(p, -30);
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
    } else if (p.type === 'pollen') {
      p.vx += Math.sin(p.phase)  * 0.018;
      p.vy -= 0.003;
      p.vy += Math.cos(p.phase2) * 0.010;
      if (p.y < -20) spawnForestParticle(p, H + 20);
      repelFromCenter(p, Math.min(W, H) * 0.28, 0.003);
      if (p.x < -p.size) p.x = W + p.size;
      if (p.x > W + p.size) p.x = -p.size;
    } else if (p.type === 'spore') {
      p.vx += Math.sin(p.phase * 1.2) * 0.012;
      p.vy += Math.cos(p.phase2 * 0.8) * 0.008 - 0.002;
      repelFromCenter(p, Math.min(W, H) * 0.26, 0.003);
      wrapEdges(p);
    } else if (p.type === 'mist') {
      p.vx += Math.sin(p.phase)  * 0.005;
      p.vy += Math.cos(p.phase2) * 0.003;
      p.opacity = p.baseOpacity * (0.5 + 0.5 * Math.abs(Math.sin(p.phase * 0.3)));
      wrapEdges(p);
    } else {
      p.vx += Math.sin(p.phase)  * 0.008;
      p.vy += Math.cos(p.phase2) * 0.006;
      repelFromCenter(p, Math.min(W, H) * 0.28, 0.003);
      wrapEdges(p);
    }
  };

  const updateEmber = (p: Particle): void => {
    p.phase  += p.phaseSpeed;
    p.phase2 += p.phase2Speed;
    p.life++;

    const spreadFromCenter = (radius: number, frc: number): void => {
      const cx2 = W * 0.5;
      const dx2 = p.x - cx2;
      const d2  = Math.abs(dx2) + 0.001;
      if (d2 < radius) p.vx += (dx2 / d2) * frc * (1 - d2 / radius);
    };

    if (p.type === 'ember-large') {
      p.vx += randomBetween(-0.055, 0.055) + Math.sin(p.phase) * 0.035;
      p.vy -= 0.018;
      p.opacity = p.baseOpacity * (1 - p.life / p.maxLife);
      if (p.trail.length >= p.trailMax) p.trail.shift();
      p.trail.push({ x: p.x, y: p.y, a: p.opacity });
      spreadFromCenter(W * 0.28, 0.007);
      if (p.y < -p.size * 6 || p.opacity < 0.08) spawnEmberParticle(p, H + randomBetween(0, 50));
    } else if (p.type === 'ember-small') {
      p.vx += randomBetween(-0.045, 0.045) + Math.sin(p.phase) * 0.025;
      p.vy -= 0.014;
      p.opacity = p.baseOpacity * (1 - p.life / p.maxLife);
      spreadFromCenter(W * 0.25, 0.006);
      if (p.y < -p.size * 4 || p.opacity < 0.08) spawnEmberParticle(p, H + randomBetween(0, 30));
    } else if (p.type === 'spark') {
      p.vx += randomBetween(-0.12, 0.12);
      p.vy -= 0.028;
      p.vy *= 0.98;
      p.opacity = p.baseOpacity * (1 - p.life / p.maxLife);
      if (p.trail.length >= p.trailMax) p.trail.shift();
      p.trail.push({ x: p.x, y: p.y, a: p.opacity });
      spreadFromCenter(W * 0.22, 0.009);
      if (p.y < -p.size * 3 || p.opacity < 0.06) spawnEmberParticle(p, H + randomBetween(0, 20));
    } else if (p.type === 'smoke') {
      p.vx += Math.sin(p.phase) * 0.018;
      p.vy -= 0.010;
      p.size += 0.07;
      p.opacity = p.baseOpacity * (1 - p.life / p.maxLife);
      if (p.y < -p.size * 2 || p.life >= p.maxLife) spawnEmberParticle(p, H * randomBetween(0.45, 0.85));
    } else if (p.type === 'cinder') {
      p.vx += Math.sin(p.phase) * 0.020;
      p.vy -= 0.007;
      p.opacity = p.baseOpacity * (1 - p.life / p.maxLife);
      spreadFromCenter(W * 0.30, 0.004);
      if (p.y < -p.size * 2 || p.life >= p.maxLife) spawnEmberParticle(p, H + randomBetween(0, 20));
      if (p.x < -p.size) p.x = W + p.size;
      if (p.x > W + p.size) p.x = -p.size;
    } else {
      p.vx += Math.sin(p.phase * 0.8) * 0.012;
      p.vy -= 0.004;
      p.opacity = p.baseOpacity * (1 - p.life / p.maxLife);
      if (p.y < -p.size * 2 || p.life >= p.maxLife) spawnEmberParticle(p, H + randomBetween(0, 30));
      if (p.x < -p.size) p.x = W + p.size;
      if (p.x > W + p.size) p.x = -p.size;
    }
  };

  const updateMinimal = (p: Particle): void => {
    p.phase  += p.phaseSpeed;
    p.phase2 += p.phase2Speed;
    p.vx += Math.sin(p.phase)  * 0.005;
    p.vy += Math.cos(p.phase2) * 0.005;

    if (p.type === 'minimal-dot') {
      p.twinkle = 0.6 + 0.4 * Math.sin(p.phase * 1.4);
      repelFromCenter(p, Math.min(W, H) * 0.30, 0.0022);
    } else if (p.type === 'minimal-ring') {
      p.opacity = p.baseOpacity * (0.5 + 0.5 * Math.sin(p.phase * 0.6));
      repelFromCenter(p, Math.min(W, H) * 0.32, 0.002);
    } else if (p.type === 'minimal-line') {
      p.rotation += p.rotationSpeed;
      repelFromCenter(p, Math.min(W, H) * 0.28, 0.002);
    } else {
      repelFromCenter(p, Math.min(W, H) * 0.30, 0.002);
    }
    wrapEdges(p);
  };

  const updateParticle = (p: Particle): void => {
    if (idle) {
      const dxI = mx - p.x, dyI = my - p.y;
      const distI = Math.sqrt(dxI * dxI + dyI * dyI) + 0.001;
      const fcx = Math.abs(mx - W * 0.5) / (W * 0.5);
      const fcy = Math.abs(my - H * 0.5) / (H * 0.5);
      if (fcx > 0.28 || fcy > 0.28) {
        p.vx += (dxI / distI) * 0.032;
        p.vy += (dyI / distI) * 0.032;
      }
    }

    if (night) { p.vx *= 0.998; p.vy *= 0.998; }

    const minSpd = theme === 'ember' ? 0.0 : 0.025;
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (spd < minSpd && p.type !== 'smoke' && p.type !== 'mist' && p.type !== 'deep-glow') {
      const angle = randomBetween(0, Math.PI * 2);
      p.vx = Math.cos(angle) * randomBetween(0.08, 0.3);
      p.vy = Math.sin(angle) * randomBetween(0.08, 0.3);
    }

    switch (theme) {
      case 'space':   updateSpace(p);   break;
      case 'ocean':   updateOcean(p);   break;
      case 'forest':  updateForest(p);  break;
      case 'ember':   updateEmber(p);   break;
      case 'minimal': updateMinimal(p); break;
    }

    p.vx = cv(p.vx);
    p.vy = cv(p.vy);
    p.x += p.vx;
    p.y += p.vy;
  };

  const applyMorph = (p: Particle): void => {
    if (morphT >= 1) return;
    p.color = lc(p.color, p.targetColor, clamp(morphElapsed / morphFrames, 0, 1));
  };

  const drawSpace = (c: CanvasRenderingContext2D, p: Particle): void => {
    const nightMul = night ? 0.80 : 1.0;
    const alpha = clamp(p.opacity * p.twinkle * nightMul, 0, 1);
    if (alpha < 0.01) return;

    if (p.type === 'nebula-wisp') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0,   s(p.color, p.opacity * 0.4));
      g.addColorStop(0.5, s(p.color, p.opacity * 0.15));
      g.addColorStop(1,   s(p.color, 0));
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      return;
    }

    c.beginPath();
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    c.fillStyle = s(p.color, alpha);
    c.fill();

    if (p.type === 'star-giant') {
      const layers: Array<{ r: number; a: number }> = [
        { r: p.size * 2.8, a: alpha * 0.30 },
        { r: p.size * 5.5, a: alpha * 0.12 },
        { r: p.size * 10,  a: alpha * 0.04 },
      ];
      for (const l of layers) {
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, l.r);
        g.addColorStop(0,   s(p.color, l.a));
        g.addColorStop(0.5, s(p.color, l.a * 0.4));
        g.addColorStop(1,   s(p.color, 0));
        c.beginPath();
        c.arc(p.x, p.y, l.r, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
      }
      if (alpha > 0.5) {
        c.save();
        c.translate(p.x, p.y);
        const sLen = p.size * 9;
        for (let ai = 0; ai < 4; ai++) {
          const ang = (ai * Math.PI) / 2;
          const grad = c.createLinearGradient(0, 0, Math.cos(ang) * sLen, Math.sin(ang) * sLen);
          grad.addColorStop(0,    s(p.color, alpha * 0.65));
          grad.addColorStop(0.45, s(p.color, alpha * 0.18));
          grad.addColorStop(1,    s(p.color, 0));
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(Math.cos(ang) * sLen, Math.sin(ang) * sLen);
          c.strokeStyle = grad;
          c.lineWidth = p.size * 0.28;
          c.stroke();
        }
        c.restore();
      }
    } else if (p.type === 'star-medium' && alpha > 0.35) {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      g.addColorStop(0,   s(p.color, alpha * 0.25));
      g.addColorStop(0.5, s(p.color, alpha * 0.08));
      g.addColorStop(1,   s(p.color, 0));
      c.beginPath();
      c.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    } else if (p.type === 'star-tiny' && alpha > 0.4) {
      c.beginPath();
      c.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      c.fillStyle = s(p.color, alpha * 0.10);
      c.fill();
    }
  };

  const drawOcean = (c: CanvasRenderingContext2D, p: Particle): void => {
    const nightMul = night ? 0.82 : 1.0;
    const alpha = clamp(p.opacity * nightMul, 0, 1);
    if (alpha < 0.01) return;

    if (p.type === 'bubble') {
      c.save();
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      const g = c.createRadialGradient(
        p.x - p.size * 0.32, p.y - p.size * 0.32, p.size * 0.08,
        p.x, p.y, p.size
      );
      g.addColorStop(0,    `rgba(240,255,255,${alpha * 0.06})`);
      g.addColorStop(0.75, `rgba(100,200,240,${alpha * 0.04})`);
      g.addColorStop(1,    `rgba(80,180,230,0)`);
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = `rgba(140,220,255,${alpha * 0.75})`;
      c.lineWidth = 0.9;
      c.stroke();
      c.beginPath();
      c.arc(p.x - p.size * 0.32, p.y - p.size * 0.32, p.size * 0.22, 0, Math.PI * 2);
      c.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
      c.fill();
      c.restore();
    } else if (p.type === 'plankton') {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = s(p.color, alpha);
      c.fill();
      if (alpha > 0.45) {
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4.5);
        g.addColorStop(0,   s(p.color, alpha * 0.35));
        g.addColorStop(0.5, s(p.color, alpha * 0.12));
        g.addColorStop(1,   s(p.color, 0));
        c.beginPath();
        c.arc(p.x, p.y, p.size * 4.5, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
      }
    } else if (p.type === 'caustic-ray') {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = s(p.color, alpha);
      c.fill();
      c.beginPath();
      c.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
      c.fillStyle = `rgba(100,220,255,${alpha * 0.07})`;
      c.fill();
    } else if (p.type === 'deep-glow') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0,   s(p.color, alpha * 0.8));
      g.addColorStop(0.5, s(p.color, alpha * 0.3));
      g.addColorStop(1,   s(p.color, 0));
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    } else {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = s(p.color, alpha);
      c.fill();
      if (alpha > 0.3) {
        c.beginPath();
        c.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
        c.fillStyle = s(p.color, alpha * 0.09);
        c.fill();
      }
    }
  };

  const drawForest = (c: CanvasRenderingContext2D, p: Particle): void => {
    const nightMul = night ? 0.82 : 1.0;
    const alpha = clamp(p.opacity * nightMul, 0, 1);
    if (alpha < 0.01) return;

    if (p.type === 'firefly') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 7);
      g.addColorStop(0,    s(p.color, alpha * 0.9));
      g.addColorStop(0.25, s(p.color, alpha * 0.5));
      g.addColorStop(0.6,  s(p.color, alpha * 0.15));
      g.addColorStop(1,    s(p.color, 0));
      c.beginPath();
      c.arc(p.x, p.y, p.size * 7, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = `rgba(240,255,180,${alpha})`;
      c.fill();
    } else if (p.type === 'leaf') {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.beginPath();
      c.ellipse(0, 0, p.size, p.size * 0.48, 0, 0, Math.PI * 2);
      c.fillStyle = s(p.color, alpha);
      c.fill();
      c.beginPath();
      c.moveTo(-p.size * 0.9, 0);
      c.bezierCurveTo(-p.size * 0.4, -p.size * 0.1, p.size * 0.4, -p.size * 0.1, p.size * 0.9, 0);
      c.strokeStyle = `rgba(${Math.min(255, (p.color.r + 40) | 0)},${Math.min(255, (p.color.g + 40) | 0)},${p.color.b | 0},${alpha * 0.45})`;
      c.lineWidth = 0.6;
      c.stroke();
      c.restore();
    } else if (p.type === 'pollen') {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = `rgba(220,255,100,${alpha})`;
      c.fill();
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      g.addColorStop(0,   `rgba(210,255,80,${alpha * 0.25})`);
      g.addColorStop(1,    `rgba(200,240,60,0)`);
      c.beginPath();
      c.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    } else if (p.type === 'mist') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0,   s(p.color, alpha * 0.7));
      g.addColorStop(0.5, s(p.color, alpha * 0.3));
      g.addColorStop(1,   s(p.color, 0));
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    } else {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = s(p.color, alpha);
      c.fill();
      if (alpha > 0.3 && isForeground) {
        c.beginPath();
        c.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        c.fillStyle = s(p.color, alpha * 0.08);
        c.fill();
      }
    }
  };

  const drawEmber = (c: CanvasRenderingContext2D, p: Particle): void => {
    const nightMul = night ? 0.88 : 1.0;
    const alpha = clamp(p.opacity * nightMul, 0, 1);
    if (alpha < 0.01) return;

    if (p.type === 'smoke') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0,   `rgba(70,55,48,${alpha * 0.9})`);
      g.addColorStop(0.5, `rgba(60,48,42,${alpha * 0.4})`);
      g.addColorStop(1,   `rgba(50,40,36,0)`);
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      return;
    }

    if (p.type === 'ash') {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = `rgba(155,140,130,${alpha})`;
      c.fill();
      return;
    }

    if ((p.type === 'ember-large' || p.type === 'spark') && p.trail.length > 1) {
      for (let i = 1; i < p.trail.length; i++) {
        const t0 = p.trail[i - 1]!;
        const t1 = p.trail[i]!;
        const pct = i / p.trail.length;
        const ta  = pct * alpha * 0.55;
        const trailR = p.type === 'spark' ? 220 : 255;
        const trailG = p.type === 'spark' ? 200 : Math.round(80 + 100 * pct);
        const trailB = p.type === 'spark' ? 100 : 10;
        c.beginPath();
        c.moveTo(t0.x, t0.y);
        c.lineTo(t1.x, t1.y);
        c.strokeStyle = `rgba(${trailR},${trailG},${trailB},${ta})`;
        c.lineWidth = p.size * 0.45 * pct;
        c.lineCap = 'round';
        c.stroke();
      }
    }

    if (p.type === 'ember-large') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0,    `rgba(255,245,200,${alpha})`);
      g.addColorStop(0.35, `rgba(255,160,30,${alpha * 0.9})`);
      g.addColorStop(0.75, `rgba(220,60,5,${alpha * 0.75})`);
      g.addColorStop(1,    `rgba(180,20,0,${alpha * 0.5})`);
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      const gO = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
      gO.addColorStop(0,   `rgba(255,120,20,${alpha * 0.18})`);
      gO.addColorStop(0.6, `rgba(255,80,10,${alpha * 0.07})`);
      gO.addColorStop(1,   `rgba(200,40,0,0)`);
      c.beginPath();
      c.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
      c.fillStyle = gO;
      c.fill();
    } else if (p.type === 'spark') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0,   `rgba(255,255,220,${alpha})`);
      g.addColorStop(0.5, `rgba(255,200,60,${alpha * 0.8})`);
      g.addColorStop(1,   `rgba(255,120,20,${alpha * 0.4})`);
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      c.beginPath();
      c.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      c.fillStyle = `rgba(255,160,30,${alpha * 0.12})`;
      c.fill();
    } else if (p.type === 'ember-small') {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0,   `rgba(255,210,80,${alpha})`);
      g.addColorStop(0.5, `rgba(255,100,15,${alpha * 0.85})`);
      g.addColorStop(1,   `rgba(200,40,5,${alpha * 0.5})`);
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    } else if (p.type === 'cinder') {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = `rgba(210,80,10,${alpha})`;
      c.fill();
      c.beginPath();
      c.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      c.fillStyle = `rgba(255,100,20,${alpha * 0.15})`;
      c.fill();
    }
  };

  const drawMinimal = (c: CanvasRenderingContext2D, p: Particle): void => {
    const nightMul = night ? 0.78 : 1.0;
    const twinkle  = p.type === 'minimal-dot' ? (0.6 + 0.4 * Math.sin(p.phase * 1.4)) : 1.0;
    const alpha    = clamp(p.opacity * twinkle * nightMul, 0, 1);
    if (alpha < 0.01) return;

    if (p.type === 'minimal-ring') {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.strokeStyle = s(p.color, alpha);
      c.lineWidth = 0.7;
      c.stroke();
    } else if (p.type === 'minimal-line') {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      const lineHalf = p.size * 0.5;
      const grad = c.createLinearGradient(-lineHalf, 0, lineHalf, 0);
      grad.addColorStop(0,   s(p.color, 0));
      grad.addColorStop(0.5, s(p.color, alpha));
      grad.addColorStop(1,   s(p.color, 0));
      c.beginPath();
      c.moveTo(-lineHalf, 0);
      c.lineTo(lineHalf, 0);
      c.strokeStyle = grad;
      c.lineWidth = 0.8;
      c.stroke();
      c.restore();
    } else {
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fillStyle = s(p.color, alpha);
      c.fill();
      if (p.type === 'minimal-dot' && alpha > 0.38) {
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
        g.addColorStop(0,   s(p.color, alpha * 0.18));
        g.addColorStop(1,   s(p.color, 0));
        c.beginPath();
        c.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
      }
    }
  };

  const drawParticle = (c: CanvasRenderingContext2D, p: Particle): void => {
    switch (theme) {
      case 'space':   drawSpace(c, p);   break;
      case 'ocean':   drawOcean(c, p);   break;
      case 'forest':  drawForest(c, p);  break;
      case 'ember':   drawEmber(c, p);   break;
      case 'minimal': drawMinimal(c, p); break;
    }
  };

  const drawSpaceEnv = (c: CanvasRenderingContext2D): void => {
    if (!isForeground && nebulaReady && nebulaOff) {
      c.save();
      c.globalAlpha = 0.88;
      c.drawImage(nebulaOff as HTMLCanvasElement, 0, 0, W, H);
      c.globalAlpha = 1.0;
      c.restore();
    }
  };

  const drawOceanEnv = (c: CanvasRenderingContext2D): void => {
    bgAnimT += 0.0025;
    if (!isForeground) {
      for (let i = 0; i < 6; i++) {
        const yOff = ((i / 6) * H + bgAnimT * 55 * (i + 1)) % H;
        const wG = c.createLinearGradient(0, yOff, 0, yOff + H * 0.16);
        wG.addColorStop(0,   'rgba(0,180,220,0)');
        wG.addColorStop(0.5, 'rgba(0,200,240,0.038)');
        wG.addColorStop(1,   'rgba(0,180,220,0)');
        c.fillStyle = wG;
        c.fillRect(0, yOff, W, H * 0.16);
      }
      const lG = c.createLinearGradient(W * 0.38, 0, W * 0.62, H * 0.65);
      lG.addColorStop(0,    'rgba(80,220,255,0.11)');
      lG.addColorStop(0.55, 'rgba(40,180,220,0.04)');
      lG.addColorStop(1,    'rgba(0,140,200,0)');
      c.save();
      c.beginPath();
      c.moveTo(W * 0.34, 0);
      c.lineTo(W * 0.66, 0);
      c.lineTo(W * 0.82, H * 0.65);
      c.lineTo(W * 0.18, H * 0.65);
      c.closePath();
      c.fillStyle = lG;
      c.fill();
      c.restore();
    } else {
      c.save();
      c.globalAlpha = 0.055;
      for (let i = 0; i < 9; i++) {
        const xPos = ((i / 9) * W * 1.5 + Math.sin(bgAnimT * 0.9 + i * 0.8) * 45) % (W * 1.3) - W * 0.15;
        const refG = c.createLinearGradient(xPos, 0, xPos + 28, H * 0.75);
        refG.addColorStop(0,    'rgba(160,245,255,1)');
        refG.addColorStop(0.65, 'rgba(100,215,245,0.3)');
        refG.addColorStop(1,    'rgba(80,185,225,0)');
        c.fillStyle = refG;
        c.beginPath();
        c.moveTo(xPos, 0);
        c.lineTo(xPos + 22 + Math.sin(bgAnimT * 0.65 + i) * 8, 0);
        c.lineTo(xPos + 78 + Math.sin(bgAnimT + i * 0.9) * 18, H * 0.75);
        c.lineTo(xPos + 52 + Math.sin(bgAnimT + i * 0.9) * 18, H * 0.75);
        c.closePath();
        c.fill();
      }
      c.globalAlpha = 1.0;
      c.restore();
    }
  };

  const drawForestEnv = (c: CanvasRenderingContext2D): void => {
    bgAnimT += 0.0018;
    if (!isForeground) {
      for (let i = 0; i < 6; i++) {
        const xPos = W * (0.08 + i * 0.17) + Math.sin(bgAnimT + i * 1.4) * 28;
        const rayG = c.createLinearGradient(xPos, 0, xPos + 55, H * 0.85);
        rayG.addColorStop(0,    'rgba(140,220,70,0.09)');
        rayG.addColorStop(0.55, 'rgba(110,190,55,0.035)');
        rayG.addColorStop(1,    'rgba(80,160,40,0)');
        c.save();
        c.beginPath();
        c.moveTo(xPos, 0);
        c.lineTo(xPos + 38, 0);
        c.lineTo(xPos + 115 + Math.sin(bgAnimT + i) * 28, H * 0.85);
        c.lineTo(xPos + 75  + Math.sin(bgAnimT + i) * 28, H * 0.85);
        c.closePath();
        c.fillStyle = rayG;
        c.fill();
        c.restore();
      }
      const mistG = c.createLinearGradient(0, H * 0.72, 0, H);
      mistG.addColorStop(0,    'rgba(90,150,55,0)');
      mistG.addColorStop(0.55, 'rgba(70,130,45,0.055)');
      mistG.addColorStop(1,    'rgba(55,110,35,0.11)');
      c.fillStyle = mistG;
      c.fillRect(0, H * 0.72, W, H * 0.28);
    }
  };

  const drawEmberEnv = (c: CanvasRenderingContext2D): void => {
    bgAnimT += 0.018;
    if (!isForeground) {
      const hG = c.createLinearGradient(0, H * 0.55, 0, H);
      hG.addColorStop(0,    'rgba(255,50,8,0)');
      hG.addColorStop(0.55, 'rgba(255,75,12,0.055)');
      hG.addColorStop(1,    'rgba(255,100,18,0.13)');
      c.fillStyle = hG;
      c.fillRect(0, H * 0.55, W, H * 0.45);

      const pulseR = H * 0.42 + Math.sin(bgAnimT * 0.7) * 0.06 * H;
      const bG = c.createRadialGradient(W * 0.5, H * 1.08, 0, W * 0.5, H * 1.08, pulseR);
      bG.addColorStop(0,    'rgba(255,130,10,0.20)');
      bG.addColorStop(0.45, 'rgba(255,90,5,0.08)');
      bG.addColorStop(1,    'rgba(200,40,0,0)');
      c.fillStyle = bG;
      c.fillRect(0, 0, W, H);

      for (let i = 0; i < 3; i++) {
        const xH = W * (0.25 + i * 0.25) + Math.sin(bgAnimT * 0.5 + i * 2.1) * 30;
        const hRG = c.createLinearGradient(xH, H, xH + 20, H * 0.4);
        hRG.addColorStop(0,   `rgba(255,${80 + i * 20},10,0.10)`);
        hRG.addColorStop(0.7, `rgba(255,60,5,0.03)`);
        hRG.addColorStop(1,   `rgba(255,40,0,0)`);
        c.save();
        c.beginPath();
        c.moveTo(xH - 15, H);
        c.lineTo(xH + 35, H);
        c.lineTo(xH + 55 + Math.sin(bgAnimT + i) * 15, H * 0.4);
        c.lineTo(xH + 5  + Math.sin(bgAnimT + i) * 15, H * 0.4);
        c.closePath();
        c.fillStyle = hRG;
        c.fill();
        c.restore();
      }
    }
  };

  const drawMinimalEnv = (c: CanvasRenderingContext2D): void => {
    if (!isForeground) {
      const vG = c.createRadialGradient(
        W * 0.5, H * 0.5, Math.min(W, H) * 0.18,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.85
      );
      vG.addColorStop(0,   'rgba(255,255,255,0.008)');
      vG.addColorStop(1,   'rgba(200,200,220,0.035)');
      c.fillStyle = vG;
      c.fillRect(0, 0, W, H);
    }
  };

  const drawEnvironment = (c: CanvasRenderingContext2D): void => {
    switch (theme) {
      case 'space':   drawSpaceEnv(c);   break;
      case 'ocean':   drawOceanEnv(c);   break;
      case 'forest':  drawForestEnv(c);  break;
      case 'ember':   drawEmberEnv(c);   break;
      case 'minimal': drawMinimalEnv(c); break;
    }
  };

  const tick = (): void => {
    if (rafId === null) return;
    const c = getCtx();
    if (!c) return;
    frame++;

    if (morphT < 1) {
      morphElapsed++;
      if (morphElapsed >= morphFrames) {
        morphT = 1;
        theme = targetTheme;
        nebulaReady = false;
        bgAnimT = 0;
        if (theme === 'space') buildNebula();
      }
    }

    evtTimer++;
    if (evtTimer >= evtInterval) {
      evtTimer = 0;
      evtInterval = randomBetweenInt(8, 25) * 60;
      if (onDramaticEvent) { try { onDramaticEvent(); } catch { /**/ } }
    }

    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.restore();

    drawEnvironment(c);

    for (const p of particles) {
      if (morphT < 1) applyMorph(p);
      updateParticle(p);
      drawParticle(c, p);
    }

    rafId = requestAnimationFrame(tick);
  };

  const start = (): void => {
    if (rafId !== null) return;
    if (W === 0 || H === 0) return;
    const c = getCtx();
    if (!c) { console.error('[particleEngine] no 2d context'); return; }
    try {
      createParticles();
      if (theme === 'space') buildNebula();
      rafId = requestAnimationFrame(tick);
    } catch (e) {
      console.error('[particleEngine] start failed:', e);
      rafId = null;
    }
  };

  const stop = (): void => {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  };

  const setTheme = (t: ThemeName, ms: number): void => {
    if (t === targetTheme && morphT >= 1) return;
    targetTheme = t;
    morphT = 0;
    morphElapsed = 0;
    morphFrames = Math.max(1, Math.round((ms / 1000) * 60));
    const pal = THEME_PALETTES[t];
    for (const p of particles) {
      p.targetColor = pal[randomBetweenInt(0, pal.length - 1)]!;
    }
    nebulaReady = false;
  };

  const setNightMode      = (on: boolean): void => { night = on; };
  const setMousePosition  = (x: number, y: number): void => { mx = x; my = y; };
  const setIdleAttraction = (on: boolean): void => { idle = on; };

  const resize = (w: number, h: number): void => {
    W = w; H = h;
    resetCtx();
    nebulaReady = false;
    bgAnimT = 0;
    if (theme === 'space' && rafId !== null) buildNebula();
    for (const p of particles) {
      if (p.x > W) p.x = randomBetween(0, W);
      if (p.y > H) p.y = randomBetween(0, H);
    }
  };

  return { start, stop, setTheme, setNightMode, setMousePosition, setIdleAttraction, resize };
};