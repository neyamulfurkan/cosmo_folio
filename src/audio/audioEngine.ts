// src/audio/audioEngine.ts
import type { ThemeName } from '@/types';

export type AudioEngine = {
  start(theme: ThemeName): void;
  stop(): void;
  setVolume(vol: number): void;
  setTheme(theme: ThemeName): void;
};

type ThemeNodes = {
  gainNode: GainNode;
  cleanup: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const sr  = ctx.sampleRate;
  const len = sr * seconds;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

// Brown noise — deep, warm, low-rumble character
function createBrownNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const sr  = ctx.sampleRate;
  const len = sr * seconds;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function loopNoise(ctx: AudioContext, buffer: AudioBuffer, dest: AudioNode): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop   = true;
  src.connect(dest);
  src.start();
  return src;
}

function makeLFO(
  ctx: AudioContext,
  freq: number,
  dest: AudioParam,
  amount: number,
): OscillatorNode {
  const lfo  = ctx.createOscillator();
  const gain = ctx.createGain();
  lfo.frequency.value = freq;
  gain.gain.value     = amount;
  lfo.connect(gain);
  gain.connect(dest);
  lfo.start();
  return lfo;
}

function makeSineOsc(
  ctx: AudioContext,
  freq: number,
  gainVal: number,
  dest: AudioNode,
): OscillatorNode {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type            = 'sine';
  osc.frequency.value = freq;
  g.gain.value        = gainVal;
  osc.connect(g);
  g.connect(dest);
  osc.start();
  return osc;
}

// ─── SPACE — deep cosmos drone with slow evolving pads ───────────────────────
// Feels like floating in deep space: sub-bass hum, high shimmer, slow breathing

function buildSpaceNodes(ctx: AudioContext, master: GainNode): ThemeNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(master);

  const stoppers: (() => void)[] = [];

  // Sub-bass drone — the heartbeat of space
  const subFilter = ctx.createBiquadFilter();
  subFilter.type            = 'lowpass';
  subFilter.frequency.value = 120;
  subFilter.Q.value         = 0.8;
  subFilter.connect(gainNode);

  const subBrown = loopNoise(ctx, createBrownNoiseBuffer(ctx, 4), subFilter);
  stoppers.push(() => { try { subBrown.stop(); } catch {} });

  // Pad layer 1 — warm low sine drone at 55Hz (A1)
  const pad1 = makeSineOsc(ctx, 55, 0.18, gainNode);
  stoppers.push(() => { try { pad1.stop(); } catch {} });

  // Pad layer 2 — fifth above (82.5Hz) for depth
  const pad2 = makeSineOsc(ctx, 82.5, 0.10, gainNode);
  stoppers.push(() => { try { pad2.stop(); } catch {} });

  // Shimmer layer — high filtered white noise for star twinkle
  const shimmerBuf    = createNoiseBuffer(ctx, 2);
  const shimmerFilter = ctx.createBiquadFilter();
  shimmerFilter.type            = 'bandpass';
  shimmerFilter.frequency.value = 6000;
  shimmerFilter.Q.value         = 3;
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 0.06;
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(gainNode);
  const shimmerSrc = loopNoise(ctx, shimmerBuf, shimmerFilter);
  stoppers.push(() => { try { shimmerSrc.stop(); } catch {} });

  // Slow breathing LFO on the pad volume — 0.04 Hz = ~25 second cycle
  const breathLFO = makeLFO(ctx, 0.04, gainNode.gain, 0.012);
  stoppers.push(() => { try { breathLFO.stop(); } catch {} });

  // Occasional high-frequency shimmer sweep
  const sweepLFO = makeLFO(ctx, 0.08, shimmerFilter.frequency, 2000);
  stoppers.push(() => { try { sweepLFO.stop(); } catch {} });

  return {
    gainNode,
    cleanup: () => stoppers.forEach((s) => s()),
  };
}

// ─── OCEAN — realistic ocean waves with depth ─────────────────────────────────
// Layered wave crashes, foam hiss, deep underwater rumble

function buildOceanNodes(ctx: AudioContext, master: GainNode): ThemeNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(master);

  const stoppers: (() => void)[] = [];

  // Deep underwater rumble — brown noise + lowpass
  const deepFilter = ctx.createBiquadFilter();
  deepFilter.type            = 'lowpass';
  deepFilter.frequency.value = 180;
  deepFilter.Q.value         = 0.5;
  const deepGain = ctx.createGain();
  deepGain.gain.value = 0.5;
  deepFilter.connect(deepGain);
  deepGain.connect(gainNode);
  const deepSrc = loopNoise(ctx, createBrownNoiseBuffer(ctx, 5), deepFilter);
  stoppers.push(() => { try { deepSrc.stop(); } catch {} });

  // Mid wave body — bandpass noise shaped like breaking water
  const midFilter = ctx.createBiquadFilter();
  midFilter.type            = 'bandpass';
  midFilter.frequency.value = 500;
  midFilter.Q.value         = 0.6;
  const midGain = ctx.createGain();
  midGain.gain.value = 0.35;
  midFilter.connect(midGain);
  midGain.connect(gainNode);
  const midSrc = loopNoise(ctx, createNoiseBuffer(ctx, 3), midFilter);
  stoppers.push(() => { try { midSrc.stop(); } catch {} });

  // Foam/hiss — highpass noise for surf texture
  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type            = 'highpass';
  hissFilter.frequency.value = 2500;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.12;
  hissFilter.connect(hissGain);
  hissGain.connect(gainNode);
  const hissSrc = loopNoise(ctx, createNoiseBuffer(ctx, 2), hissFilter);
  stoppers.push(() => { try { hissSrc.stop(); } catch {} });

  // Wave rhythm LFO — slow swell at ~0.12Hz (one wave every ~8 seconds)
  const swellLFO = makeLFO(ctx, 0.12, midGain.gain, 0.28);
  stoppers.push(() => { try { swellLFO.stop(); } catch {} });

  // Foam rhythm slightly offset from swell
  const foamLFO = makeLFO(ctx, 0.14, hissGain.gain, 0.09);
  stoppers.push(() => { try { foamLFO.stop(); } catch {} });

  // Deep pulse LFO — slow underwater pressure feel
  const deepLFO = makeLFO(ctx, 0.05, deepGain.gain, 0.3);
  stoppers.push(() => { try { deepLFO.stop(); } catch {} });

  // Subtle filter sweep for wave dynamics
  const filterLFO = makeLFO(ctx, 0.10, midFilter.frequency, 300);
  stoppers.push(() => { try { filterLFO.stop(); } catch {} });

  return {
    gainNode,
    cleanup: () => stoppers.forEach((s) => s()),
  };
}

// ─── FOREST — rich nature ambience with birds, wind, leaves ───────────────────
// Wind through trees, rustling leaves, distant bird calls

function buildForestNodes(ctx: AudioContext, master: GainNode): ThemeNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(master);

  const stoppers: (() => void)[] = [];

  // Wind through canopy — shaped brown noise
  const windFilter = ctx.createBiquadFilter();
  windFilter.type            = 'bandpass';
  windFilter.frequency.value = 400;
  windFilter.Q.value         = 0.4;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.3;
  windFilter.connect(windGain);
  windGain.connect(gainNode);
  const windSrc = loopNoise(ctx, createBrownNoiseBuffer(ctx, 5), windFilter);
  stoppers.push(() => { try { windSrc.stop(); } catch {} });

  // Leaf rustle — high bandpass noise bursts
  const rustleFilter = ctx.createBiquadFilter();
  rustleFilter.type            = 'bandpass';
  rustleFilter.frequency.value = 3500;
  rustleFilter.Q.value         = 1.5;
  const rustleGain = ctx.createGain();
  rustleGain.gain.value = 0.08;
  rustleFilter.connect(rustleGain);
  rustleGain.connect(gainNode);
  const rustleSrc = loopNoise(ctx, createNoiseBuffer(ctx, 2), rustleFilter);
  stoppers.push(() => { try { rustleSrc.stop(); } catch {} });

  // Bird calls — high sine chirps at natural intervals
  const birdFreqs = [2800, 3400, 2200, 4000, 3100];
  const scheduleBird = (freq: number, delayMs: number): ReturnType<typeof setTimeout> => {
    return setTimeout(() => {
      if (!ctx) return;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type            = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + 0.12);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(gainNode);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
      // Reschedule with random interval 4–12 seconds
      const next = scheduleBird(
        birdFreqs[Math.floor(Math.random() * birdFreqs.length)]!,
        4000 + Math.random() * 8000,
      );
      stoppers.push(() => clearTimeout(next));
    }, delayMs);
  };

  birdFreqs.forEach((freq, i) => {
    const t = scheduleBird(freq, 1500 + i * 2200 + Math.random() * 3000);
    stoppers.push(() => clearTimeout(t));
  });

  // Wind swell LFO — gusts every ~6 seconds
  const windLFO = makeLFO(ctx, 0.16, windGain.gain, 0.18);
  stoppers.push(() => { try { windLFO.stop(); } catch {} });

  // Rustle rhythm with wind
  const rustleLFO = makeLFO(ctx, 0.22, rustleGain.gain, 0.06);
  stoppers.push(() => { try { rustleLFO.stop(); } catch {} });

  // Wind filter sweep — changes timbre as wind shifts
  const windFilterLFO = makeLFO(ctx, 0.07, windFilter.frequency, 200);
  stoppers.push(() => { try { windFilterLFO.stop(); } catch {} });

  return {
    gainNode,
    cleanup: () => stoppers.forEach((s) => s()),
  };
}

// ─── EMBER — realistic fire with crackle, pop, deep heat rumble ───────────────
// Campfire feel: low roar, mid crackle texture, sharp pops

function buildEmberNodes(ctx: AudioContext, master: GainNode): ThemeNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(master);

  const stoppers: (() => void)[] = [];

  // Deep fire roar — low brown noise
  const roarFilter = ctx.createBiquadFilter();
  roarFilter.type            = 'lowpass';
  roarFilter.frequency.value = 300;
  roarFilter.Q.value         = 0.7;
  const roarGain = ctx.createGain();
  roarGain.gain.value = 0.45;
  roarFilter.connect(roarGain);
  roarGain.connect(gainNode);
  const roarSrc = loopNoise(ctx, createBrownNoiseBuffer(ctx, 4), roarFilter);
  stoppers.push(() => { try { roarSrc.stop(); } catch {} });

  // Mid crackle texture — bandpass noise
  const crackleFilter = ctx.createBiquadFilter();
  crackleFilter.type            = 'bandpass';
  crackleFilter.frequency.value = 1200;
  crackleFilter.Q.value         = 1.2;
  const crackleGain = ctx.createGain();
  crackleGain.gain.value = 0.18;
  crackleFilter.connect(crackleGain);
  crackleGain.connect(gainNode);
  const crackleSrc = loopNoise(ctx, createNoiseBuffer(ctx, 2), crackleFilter);
  stoppers.push(() => { try { crackleSrc.stop(); } catch {} });

  // Sharp pops — random impulse sounds like wood popping
  const schedulePop = (delayMs: number): ReturnType<typeof setTimeout> => {
    return setTimeout(() => {
      if (!ctx) return;
      const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
      }
      const popFilter = ctx.createBiquadFilter();
      popFilter.type            = 'bandpass';
      popFilter.frequency.value = 800 + Math.random() * 1200;
      popFilter.Q.value         = 2;
      const popGain = ctx.createGain();
      popGain.gain.value = 0.25 + Math.random() * 0.2;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(gainNode);
      src.start();
      const next = schedulePop(600 + Math.random() * 2400);
      stoppers.push(() => clearTimeout(next));
    }, delayMs);
  };

  const p1 = schedulePop(800);
  const p2 = schedulePop(2100);
  const p3 = schedulePop(3500);
  stoppers.push(() => clearTimeout(p1));
  stoppers.push(() => clearTimeout(p2));
  stoppers.push(() => clearTimeout(p3));

  // Fire breathing LFO — flames rise and fall
  const fireLFO = makeLFO(ctx, 0.25, roarGain.gain, 0.22);
  stoppers.push(() => { try { fireLFO.stop(); } catch {} });

  // Crackle intensity rhythm
  const crackleLFO = makeLFO(ctx, 0.4, crackleGain.gain, 0.10);
  stoppers.push(() => { try { crackleLFO.stop(); } catch {} });

  // Roar filter sweep — fire timbre shifts
  const roarFilterLFO = makeLFO(ctx, 0.18, roarFilter.frequency, 120);
  stoppers.push(() => { try { roarFilterLFO.stop(); } catch {} });

  return {
    gainNode,
    cleanup: () => stoppers.forEach((s) => s()),
  };
}

// ─── MINIMAL — soft, clean, barely-there white noise with gentle tone ─────────
// Subtle presence — not silence, but calm and unobtrusive

function buildMinimalNodes(ctx: AudioContext, master: GainNode): ThemeNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(master);

  const stoppers: (() => void)[] = [];

  // Very soft pink-ish noise — just enough to feel present
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type            = 'lowpass';
  noiseFilter.frequency.value = 800;
  noiseFilter.Q.value         = 0.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.04;
  noiseFilter.connect(noiseGain);
  noiseGain.connect(gainNode);
  const noiseSrc = loopNoise(ctx, createBrownNoiseBuffer(ctx, 4), noiseFilter);
  stoppers.push(() => { try { noiseSrc.stop(); } catch {} });

  // Barely audible pure tone at 432Hz — calming reference pitch
  const tone = makeSineOsc(ctx, 432, 0.018, gainNode);
  stoppers.push(() => { try { tone.stop(); } catch {} });

  // Very slow breath on the tone — 0.025Hz (~40 second cycle)
  const breathLFO = makeLFO(ctx, 0.025, gainNode.gain, 0.008);
  stoppers.push(() => { try { breathLFO.stop(); } catch {} });

  return {
    gainNode,
    cleanup: () => stoppers.forEach((s) => s()),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

function buildThemeNodes(theme: ThemeName, ctx: AudioContext, master: GainNode): ThemeNodes {
  switch (theme) {
    case 'space':   return buildSpaceNodes(ctx, master);
    case 'ocean':   return buildOceanNodes(ctx, master);
    case 'forest':  return buildForestNodes(ctx, master);
    case 'ember':   return buildEmberNodes(ctx, master);
    case 'minimal': return buildMinimalNodes(ctx, master);
  }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null        = null;
  let masterGain: GainNode | null     = null;
  let currentNodes: ThemeNodes | null = null;
  let currentTheme: ThemeName | null  = null;
  let isRunning = false;

  function ensureContext(): boolean {
    if (ctx) return true;
    try {
      ctx        = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(ctx.destination);
      return true;
    } catch (err) {
      console.error('[AudioEngine] Web Audio API not supported:', err);
      return false;
    }
  }

  function fadeOut(nodes: ThemeNodes, duration = 1.2): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    nodes.gainNode.gain.cancelScheduledValues(now);
    nodes.gainNode.gain.setValueAtTime(nodes.gainNode.gain.value, now);
    nodes.gainNode.gain.linearRampToValueAtTime(0, now + duration);
    setTimeout(() => nodes.cleanup(), (duration + 0.2) * 1000);
  }

  function fadeIn(nodes: ThemeNodes, targetGain: number, duration = 1.5): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    nodes.gainNode.gain.cancelScheduledValues(now);
    nodes.gainNode.gain.setValueAtTime(0, now);
    nodes.gainNode.gain.linearRampToValueAtTime(targetGain, now + duration);
  }

  // Per-theme target gain levels so all themes feel balanced in volume
  const THEME_GAIN: Record<ThemeName, number> = {
    space:   0.55,
    ocean:   0.50,
    forest:  0.48,
    ember:   0.45,
    minimal: 0.35,
  };

  function start(theme: ThemeName): void {
    if (!ensureContext() || !ctx || !masterGain) return;
    if (isRunning) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch((e) => console.error('[AudioEngine] Resume failed:', e));
    }
    isRunning    = true;
    currentTheme = theme;
    currentNodes = buildThemeNodes(theme, ctx, masterGain);
    fadeIn(currentNodes, THEME_GAIN[theme], 1.5);
  }

  function stop(): void {
    if (!isRunning || !currentNodes) return;
    fadeOut(currentNodes, 0.8);
    currentNodes = null;
    isRunning    = false;
    ctx?.suspend().catch((e) => console.error('[AudioEngine] Suspend failed:', e));
  }

  function setVolume(vol: number): void {
    if (!masterGain || !ctx) return;
    const v = Math.max(0, Math.min(1, vol));
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.08);
  }

  function setTheme(theme: ThemeName): void {
    if (!ctx || !masterGain || !isRunning) { currentTheme = theme; return; }
    if (theme === currentTheme) return;
    if (currentNodes) fadeOut(currentNodes, 1.2);
    currentTheme = theme;
    currentNodes = buildThemeNodes(theme, ctx, masterGain);
    fadeIn(currentNodes, THEME_GAIN[theme], 1.5);
  }

  return { start, stop, setVolume, setTheme };
}