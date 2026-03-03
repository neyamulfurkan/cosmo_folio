// src/canvas/WorldCanvas.tsx

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { IDLE_CURSOR_DELAY } from '@/lib/constants';
import { createParticleEngine } from '@/canvas/particleEngine';
import type { ParticleEngine } from '@/canvas/particleEngine';
import type { ThemeName } from '@/types';
import styles from './WorldCanvas.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

type WorldCanvasProps = {
  /** Called when a dramatic event fires — caller adds/removes CSS class on world container */
  onDramaticEvent?: (eventClass: string, theme: ThemeName) => void;
};

// ─── Dramatic event class map ─────────────────────────────────────────────────

const DRAMATIC_EVENT_CLASS: Record<ThemeName, string> = {
  space:   'shootingStarActive',
  ocean:   'lightPulseActive',
  forest:  'leafDriftActive',
  ember:   'sparkBurstActive',
  minimal: '',
};

// ─── Canvas sizing ────────────────────────────────────────────────────────────

/**
 * Resizes a canvas to (w × h) CSS pixels at the device pixel ratio.
 * Setting canvas.width/height resets all context state, so we re-apply
 * the DPR scale immediately after.
 */
const sizeCanvas = (canvas: HTMLCanvasElement, w: number, h: number): void => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  // Scale context so the engine can draw in CSS-pixel space.
  // Setting canvas.width resets context state, so we must re-apply after every resize.
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const WorldCanvas = ({ onDramaticEvent }: WorldCanvasProps): JSX.Element => {
  const bgCanvasRef  = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef  = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const bgEngineRef = useRef<ParticleEngine | null>(null);
  const fgEngineRef = useRef<ParticleEngine | null>(null);

  // Keep a ref to the latest onDramaticEvent prop so the stable engine
  // callback always calls the current version without needing to recreate
  // the engines when the prop changes.
  const onDramaticEventRef = useRef<WorldCanvasProps['onDramaticEvent']>(onDramaticEvent);
  useEffect(() => {
    onDramaticEventRef.current = onDramaticEvent;
  }, [onDramaticEvent]);

  // Store subscriptions — kept as refs so the mount effect closure never goes stale
  const activeTheme = useStore((s) => s.activeTheme);
  const nightMode   = useStore((s) => s.nightMode);

  const activeThemeRef = useRef<ThemeName>(activeTheme);

  // Idle-cursor tracking
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef    = useRef<boolean>(false);

  // ─── Stable dramatic-event callback passed to engines at mount ─────────────
  // Uses a ref so it never becomes stale regardless of prop changes.
  const handleDramaticEvent = useCallback((): void => {
    const handler = onDramaticEventRef.current;
    if (!handler) return;
    const cls = DRAMATIC_EVENT_CLASS[activeThemeRef.current];
    if (cls) handler(cls, activeThemeRef.current);
  }, []); // intentionally empty — accesses everything through refs

  // ─── Mount effect: engines + ResizeObserver + mouse/idle listeners ─────────
  useEffect(() => {
    const bgCanvas  = bgCanvasRef.current;
    const fgCanvas  = fgCanvasRef.current;
    const container = containerRef.current;

    if (!bgCanvas || !fgCanvas || !container) return;

    // Size canvases to the container before starting engines
    // ── Create engines (not started yet — wait for ResizeObserver to size canvases) ──
    const bgEngine = createParticleEngine({
      canvas:           bgCanvas,
      theme:            activeThemeRef.current,
      isForeground:     false,
      onDramaticEvent:  handleDramaticEvent,
    });

    const fgEngine = createParticleEngine({
      canvas:           fgCanvas,
      theme:            activeThemeRef.current,
      isForeground:     true,
      onDramaticEvent:  handleDramaticEvent,
    });

    bgEngineRef.current = bgEngine;
    fgEngineRef.current = fgEngine;

    let enginesStarted = false;
    let lastW = 0;
    let lastH = 0;

    // ── ResizeObserver — sole authority on canvas sizing ───────────────────
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;

        // Skip if dimensions haven't meaningfully changed — prevents
        // infinite loop where setting canvas.width triggers another observation
        if (Math.abs(width - lastW) < 1 && Math.abs(height - lastH) < 1) continue;
        lastW = width;
        lastH = height;

        sizeCanvas(bgCanvas, width, height);
        sizeCanvas(fgCanvas, width, height);

        // Pass CSS pixel dims — context is already scaled by dpr inside sizeCanvas
        bgEngineRef.current?.resize(width, height);
        fgEngineRef.current?.resize(width, height);

        if (!enginesStarted) {
          enginesStarted = true;
          bgEngine.start();
          fgEngine.start();
        }
      }
    });

    ro.observe(container);

    // ── Idle-cursor helpers ─────────────────────────────────────────────────
    const disableAttraction = (): void => {
      isIdleRef.current = false;
      bgEngineRef.current?.setIdleAttraction(false);
      fgEngineRef.current?.setIdleAttraction(false);
    };

    const enableAttraction = (): void => {
      isIdleRef.current = true;
      bgEngineRef.current?.setIdleAttraction(true);
      fgEngineRef.current?.setIdleAttraction(true);
    };

    const scheduleIdleTimer = (): void => {
      if (idleTimerRef.current !== null) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(enableAttraction, IDLE_CURSOR_DELAY);
    };

    const resetIdleTimer = (): void => {
      // Cancel any pending idle trigger
      if (idleTimerRef.current !== null) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      // If attraction was active, turn it off
      if (isIdleRef.current) {
        disableAttraction();
      }
      // Schedule the next idle trigger
      scheduleIdleTimer();
    };

    // ── Mouse move handler ──────────────────────────────────────────────────
    const handleMouseMove = (e: MouseEvent): void => {
      bgEngineRef.current?.setMousePosition(e.clientX, e.clientY);
      fgEngineRef.current?.setMousePosition(e.clientX, e.clientY);
      resetIdleTimer();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Start the idle countdown immediately — on touch-only devices the cursor
    // may never move, so particles should attract to the last known position.
    scheduleIdleTimer();

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      bgEngine.stop();
      fgEngine.stop();
      bgEngineRef.current = null;
      fgEngineRef.current = null;

      ro.disconnect();

      window.removeEventListener('mousemove', handleMouseMove);

      if (idleTimerRef.current !== null) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [handleDramaticEvent]); // handleDramaticEvent is stable (empty deps)

  // ─── Theme changes ─────────────────────────────────────────────────────────
  useEffect(() => {
    activeThemeRef.current = activeTheme;
    bgEngineRef.current?.setTheme(activeTheme, 2000);
    fgEngineRef.current?.setTheme(activeTheme, 2000);
  }, [activeTheme]);

  // ─── Night mode changes ────────────────────────────────────────────────────
  useEffect(() => {
    bgEngineRef.current?.setNightMode(nightMode);
    fgEngineRef.current?.setNightMode(nightMode);
  }, [nightMode]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={styles.worldCanvas}>
      {/* Background layer — CSS blur applied to the whole canvas element so
          all 180 particles are composited in a single GPU pass */}
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'block',
          pointerEvents: 'none',
          filter: 'blur(8px)',
        }}
        aria-hidden="true"
      />
      <canvas
        ref={fgCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'block',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default WorldCanvas;