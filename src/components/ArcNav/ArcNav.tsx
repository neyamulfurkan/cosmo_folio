// src/components/ArcNav/ArcNav.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store';
import { SECTIONS, ARC_ICON_MAX_SIZE } from '@/lib/constants';
import { clamp } from '@/lib/utils';
import { computeArcIconPositions } from '@/components/ArcNav/arcPhysics';
import type { SectionName } from '@/types';
import styles from './ArcNav.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEG_PER_ICON        = 6;
const DRAG_SENSITIVITY    = 0.10;  // deg per px — mouse drag
const TOUCH_SENSITIVITY   = 0.13;  // deg per px — finger drag (facebook-like feel)
const PRECISE_SENSITIVITY = 0.02;  // deg per px — double-click precise mode
const DRAG_THRESHOLD      = 3;     // px before drag is registered
const SNAP_THRESHOLD      = 0.3;
const SNAP_LERP           = 0.22;  // smooth snap, not too snappy
const DOUBLE_CLICK_MS     = 320;   // max ms between clicks to count as double

// ─── Orbital sub-component (uses rAF for smooth slow rotation) ───────────────

type OrbitalLayoutProps = {
  activeSection: SectionName;
  detailPage: import('@/types').DetailPage;
  mounted: boolean;
  containerSize: { width: number; height: number };
  navigateTo: (index: number) => void;
  styles: Record<string, string>;
};

const ORBIT_SPEED = 0.012; // degrees per frame at 60fps ≈ ~50 seconds per revolution

const OrbitalLayout = ({
  activeSection,
  detailPage,
  mounted,
  containerSize,
  navigateTo,
  styles,
}: OrbitalLayoutProps): JSX.Element => {
  const orbitAngleRef = useRef(0);
  const rafRef        = useRef<number>(0);
  const buttonRefs    = useRef<(HTMLButtonElement | null)[]>([]);

  const ICON_SIZE = 52;
  const MARGIN    = 6;

  const panelW = Math.min(Math.max(containerSize.width  * 0.80, 320), 860);
  const panelH = Math.min(Math.max(containerSize.height * 0.75, 400), 720);

  const panelL = (containerSize.width  - panelW) / 2;
  const panelR = panelL + panelW;
  const panelT = (containerSize.height - panelH) / 2;
  const panelB = panelT + panelH;

  const total = SECTIONS.length;

  // Same perimeter slot system as mobile — 3 top, 3 right, 3 bottom, 3 left
  const slotPositions: { x: number; y: number }[] = [
    { x: panelL + panelW * 0.25 - ICON_SIZE / 2, y: panelT - ICON_SIZE - MARGIN },
    { x: panelL + panelW * 0.50 - ICON_SIZE / 2, y: panelT - ICON_SIZE - MARGIN },
    { x: panelL + panelW * 0.75 - ICON_SIZE / 2, y: panelT - ICON_SIZE - MARGIN },
    { x: panelR + MARGIN,                          y: panelT + panelH * 0.20 - ICON_SIZE / 2 },
    { x: panelR + MARGIN,                          y: panelT + panelH * 0.50 - ICON_SIZE / 2 },
    { x: panelR + MARGIN,                          y: panelT + panelH * 0.80 - ICON_SIZE / 2 },
    { x: panelL + panelW * 0.75 - ICON_SIZE / 2, y: panelB + MARGIN },
    { x: panelL + panelW * 0.50 - ICON_SIZE / 2, y: panelB + MARGIN },
    { x: panelL + panelW * 0.25 - ICON_SIZE / 2, y: panelB + MARGIN },
    { x: panelL - ICON_SIZE - MARGIN,              y: panelT + panelH * 0.80 - ICON_SIZE / 2 },
    { x: panelL - ICON_SIZE - MARGIN,              y: panelT + panelH * 0.50 - ICON_SIZE / 2 },
    { x: panelL - ICON_SIZE - MARGIN,              y: panelT + panelH * 0.20 - ICON_SIZE / 2 },
  ];

  const cx = containerSize.width  / 2;
  const cy = containerSize.height / 2;

 const containerClass = [
    styles.arcContainer,
    mounted ? styles.arcContainerVisible : '',
    detailPage !== null ? styles.arcContainerDetail : '',
  ].filter(Boolean).join(' ');

  // Drive icon positions directly via DOM refs — no setState lag
  useEffect(() => {
    const tick = () => {
      orbitAngleRef.current = (orbitAngleRef.current + ORBIT_SPEED) % 360;
      const slotOffset = (orbitAngleRef.current / 360) * total;
      SECTIONS.forEach((_, i) => {
        const btn = buttonRefs.current[i];
        if (!btn) return;
        const slotIndex = Math.floor((i + slotOffset) % total);
        const pos       = slotPositions[slotIndex] ?? slotPositions[0]!;
        const clampedX  = Math.max(MARGIN, Math.min(containerSize.width  - ICON_SIZE - MARGIN, pos.x));
        const clampedY  = Math.max(MARGIN, Math.min(containerSize.height - ICON_SIZE - MARGIN, pos.y));
        btn.style.left = `${clampedX}px`;
        btn.style.top  = `${clampedY}px`;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [slotPositions, total, containerSize]);

  return (
    <div className={containerClass}>
      {SECTIONS.map((section, i) => {
        const isActive = section.name === activeSection;
        return (
          <button
            key={section.name}
            ref={(el) => { buttonRefs.current[i] = el; }}
            data-arc-icon
            className={`${styles.orbitalIcon} ${isActive ? styles.dockIconActive : ''}`}
            style={{
              position:      'fixed',
              left:          0,
              top:           0,
              width:         ICON_SIZE,
              height:        ICON_SIZE,
              pointerEvents: 'auto',
            }}
            onClick={() => navigateTo(i)}
            aria-label={section.label}
            aria-pressed={isActive}
          >
            <span className={styles.dockIconEmoji}>{section.icon}</span>
            <span className={styles.dockIconLabel}>{section.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const ArcNav = (): JSX.Element => {
  const activeSection    = useStore((s) => s.activeSection);
  const activeLayout     = useStore((s) => s.activeLayout);
  const detailPage       = useStore((s) => s.detailPage);
  const setActiveSection = useStore((s) => s.setActiveSection);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeIndex     = SECTIONS.findIndex((s) => s.name === activeSection);
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;

  const [containerSize, setContainerSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const angleRef  = useRef(safeActiveIndex * DEG_PER_ICON);
  const targetRef = useRef(safeActiveIndex * DEG_PER_ICON);
  const [visualAngle, setVisualAngle] = useState(safeActiveIndex * DEG_PER_ICON);

  const dragActiveRef   = useRef(false);
  const dragMovedRef    = useRef(false);
  const dragStartXRef   = useRef(0);
  const dragStartAngRef = useRef(0);

  // double-click precise mode
  const preciseModeRef   = useRef(false);
  const lastClickTimeRef = useRef(0);

  const rafRef        = useRef<number>(0);
  const wheelTimerRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);
  const [magneticOffsets, setMagneticOffsets] = useState<Record<number, { x: number; y: number }>>({});
  const iconRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── Snap loop ─────────────────────────────────────────────────────────────

  const startSnapLoop = useCallback(() => {
    if (rafRef.current !== 0) return;
    const tick = () => {
      const diff = targetRef.current - angleRef.current;
      if (Math.abs(diff) < SNAP_THRESHOLD) {
        angleRef.current = targetRef.current;
        setVisualAngle(targetRef.current);
        rafRef.current = 0;
        return;
      }
      angleRef.current += diff * SNAP_LERP;
      setVisualAngle(angleRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const cancelLoop = useCallback(() => {
    if (rafRef.current !== 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // ── Navigate ──────────────────────────────────────────────────────────────

  const navigateTo = useCallback(
    (index: number) => {
      const clamped = clamp(index, 0, SECTIONS.length - 1);
      targetRef.current = clamped * DEG_PER_ICON;
      startSnapLoop();
      const section = SECTIONS[clamped];
      if (section) setActiveSection(section.name as SectionName);
    },
    [setActiveSection, startSnapLoop],
  );

  const goLeft  = useCallback(() => navigateTo(safeActiveIndex - 1), [safeActiveIndex, navigateTo]);
  const goRight = useCallback(() => navigateTo(safeActiveIndex + 1), [safeActiveIndex, navigateTo]);

  // ── Sync on external section change ───────────────────────────────────────

  useEffect(() => {
    targetRef.current = safeActiveIndex * DEG_PER_ICON;
    startSnapLoop();
  }, [safeActiveIndex, startSnapLoop]);

  // ── Entrance ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(t);
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const update = () =>
      setContainerSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goLeft(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goRight(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goLeft, goRight]);

  // ── Pointer drag ──────────────────────────────────────────────────────────

  // Track last few pointer positions for momentum on mobile
  const velocityBufferRef = useRef<{ x: number; t: number }[]>([]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.preventDefault();
    const now = performance.now();
    const isDoubleClick = now - lastClickTimeRef.current < DOUBLE_CLICK_MS;
    lastClickTimeRef.current = now;
    preciseModeRef.current = isDoubleClick;

    cancelLoop();
    dragActiveRef.current   = true;
    dragMovedRef.current    = false;
    dragStartXRef.current   = e.clientX;
    dragStartAngRef.current = angleRef.current;
    velocityBufferRef.current = [{ x: e.clientX, t: now }];
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [cancelLoop]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragActiveRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > DRAG_THRESHOLD) dragMovedRef.current = true;
    if (!dragMovedRef.current) return;

    // Use higher sensitivity for touch input
    const isTouch = e.pointerType === 'touch';
    const sensitivity = preciseModeRef.current
      ? PRECISE_SENSITIVITY
      : isTouch
        ? TOUCH_SENSITIVITY
        : DRAG_SENSITIVITY;

    const maxAngle = (SECTIONS.length - 1) * DEG_PER_ICON;
    angleRef.current = clamp(
      dragStartAngRef.current - dx * sensitivity,
      0,
      maxAngle,
    );
    setVisualAngle(angleRef.current);

    // Record velocity for momentum
    const now = performance.now();
    velocityBufferRef.current.push({ x: e.clientX, t: now });
    // Keep only last 80ms of samples
    velocityBufferRef.current = velocityBufferRef.current.filter(
      (p) => now - p.t < 80
    );
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    preciseModeRef.current = false;

    // Calculate release velocity from buffer for momentum flick
    const buffer = velocityBufferRef.current;
    let flickTarget = angleRef.current;

    if (buffer.length >= 2) {
      const first = buffer[0]!;
      const last  = buffer[buffer.length - 1]!;
      const dt    = last.t - first.t;
      const dx    = last.x - first.x;
      if (dt > 0) {
        const isTouch    = e.pointerType === 'touch';
        const sensitivity = isTouch ? TOUCH_SENSITIVITY : DRAG_SENSITIVITY;
        // px/ms → degrees, apply momentum multiplier
        const velocityDeg = -(dx / dt) * sensitivity * 45;
        const maxAngle    = (SECTIONS.length - 1) * DEG_PER_ICON;
        flickTarget = clamp(angleRef.current + velocityDeg, 0, maxAngle);
      }
    }
    velocityBufferRef.current = [];

    const nearest = clamp(Math.round(flickTarget / DEG_PER_ICON), 0, SECTIONS.length - 1);
    targetRef.current = nearest * DEG_PER_ICON;
    startSnapLoop();
    const section = SECTIONS[nearest];
    if (section) setActiveSection(section.name as SectionName);
  }, [startSnapLoop, setActiveSection]);

  // ── Wheel / touchpad ──────────────────────────────────────────────────────
  // deltaMode 0 = pixels (trackpad), 1 = lines, 2 = pages
  // Trackpad gestures emit many small pixel deltas — we need higher sensitivity
  // and a short debounce so a brief swipe snaps immediately.

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

      // trackpad pixels need much higher multiplier than mouse wheel lines
      const sensitivity = e.deltaMode === 0 ? 0.06 : 1.2;
      const scaled = raw * sensitivity;

      const maxAngle = (SECTIONS.length - 1) * DEG_PER_ICON;
      angleRef.current = clamp(angleRef.current + scaled, 0, maxAngle);
      setVisualAngle(angleRef.current);

      clearTimeout(wheelTimerRef.current);
      // Short debounce — 80ms means a quick flick snaps almost immediately
      wheelTimerRef.current = window.setTimeout(() => {
        const nearest = clamp(Math.round(angleRef.current / DEG_PER_ICON), 0, SECTIONS.length - 1);
        targetRef.current = nearest * DEG_PER_ICON;
        startSnapLoop();
        const section = SECTIONS[nearest];
        if (section) setActiveSection(section.name as SectionName);
      }, 80);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [startSnapLoop, setActiveSection]);

  // ── Magnetic hover ────────────────────────────────────────────────────────

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newOffsets: Record<number, { x: number; y: number }> = {};
      iconRefsMap.current.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const MAGNETIC_RADIUS = 80;
        const MAX_PULL = 12;
        if (dist < MAGNETIC_RADIUS && dist > 0) {
          const pull = (1 - dist / MAGNETIC_RADIUS) * MAX_PULL;
          newOffsets[index] = { x: (dx / dist) * pull, y: (dy / dist) * pull };
        } else {
          newOffsets[index] = { x: 0, y: 0 };
        }
      });
      setMagneticOffsets(newOffsets);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => () => {
    cancelLoop();
    clearTimeout(wheelTimerRef.current);
  }, [cancelLoop]);

  // ── Positions ─────────────────────────────────────────────────────────────

  const positions = computeArcIconPositions(
    visualAngle / DEG_PER_ICON,
    SECTIONS.length,
    containerSize.width,
    containerSize.height,
  );

  const handleIconClick = useCallback(
    (sectionName: SectionName, index: number) => {
      if (dragMovedRef.current) return;
      navigateTo(index);
    },
    [navigateTo],
  );

  const canGoLeft  = safeActiveIndex > 0;
  const canGoRight = safeActiveIndex < SECTIONS.length - 1;

  // ── Dock layout ───────────────────────────────────────────────────────────
  if (activeLayout === 'dock') {
    return (
      <div className={[
        styles.dockContainer,
        mounted ? styles.arcContainerVisible : '',
        detailPage !== null ? styles.arcContainerDetail : '',
      ].filter(Boolean).join(' ')}>
        {SECTIONS.map((section, i) => {
          const isActive = section.name === activeSection;
          return (
            <button
              key={section.name}
              data-arc-icon
              className={`${styles.dockIcon} ${isActive ? styles.dockIconActive : ''}`}
              onClick={() => navigateTo(i)}
              aria-label={section.label}
              aria-pressed={isActive}
            >
              <span className={styles.dockIconEmoji}>{section.icon}</span>
              <span className={styles.dockIconLabel}>{section.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Scattered layout ──────────────────────────────────────────────────────
  if (activeLayout === 'scattered') {
    // Fixed positions around the viewport perimeter, one per section
    const isMobileView = containerSize.width < 768;
    const scatteredPositions = isMobileView ? [
      // Top row — 3 icons centered above the glass panel
      { top: '5%',  left: '50%',  transform: 'translateX(-86px)' },
      { top: '5%',  left: '50%',  transform: 'translateX(-27px)' },
      { top: '5%',  left: '50%',  transform: 'translateX(32px)'  },
      // Right column — 3 icons, clear of corner controls
      { top: '28%', right: '6px' },
      { top: '45%', right: '6px' },
      { top: '62%', right: '6px' },
      // Bottom row — 3 icons above the bottom safe area
      { bottom: '88px', left: '50%', transform: 'translateX(32px)'  },
      { bottom: '88px', left: '50%', transform: 'translateX(-27px)' },
      { bottom: '88px', left: '50%', transform: 'translateX(-86px)' },
      // Left column — 3 icons, clear of corner controls
      { top: '62%', left: '6px' },
      { top: '45%', left: '6px' },
      { top: '28%', left: '6px' },
    ] : [
      { top: '8%',  left: '8%'  },
      { top: '24%', left: '5%'  },
      { top: '42%', left: '6%'  },
      { top: '60%', left: '5%'  },
      { top: '76%', left: '8%'  },
      { top: '88%', left: '18%' },
      { top: '88%', right: '18%'},
      { top: '76%', right: '8%' },
      { top: '60%', right: '5%' },
      { top: '42%', right: '6%' },
      { top: '24%', right: '5%' },
      { top: '8%',  right: '8%' },
    ];
    return (
      <div className={[
        styles.arcContainer,
        mounted ? styles.arcContainerVisible : '',
        detailPage !== null ? styles.arcContainerDetail : '',
      ].filter(Boolean).join(' ')}>
        {SECTIONS.map((section, i) => {
          const isActive = section.name === activeSection;
          const pos = scatteredPositions[i] ?? { top: '50%', left: '50%' };
          return (
            <button
              key={section.name}
              data-arc-icon
              className={`${styles.dockIcon} ${isActive ? styles.dockIconActive : ''}`}
              style={{ position: 'fixed', ...pos }}
              onClick={() => navigateTo(i)}
              aria-label={section.label}
              aria-pressed={isActive}
            >
              <span className={styles.dockIconEmoji}>{section.icon}</span>
              <span className={styles.dockIconLabel}>{section.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Orbital layout ────────────────────────────────────────────────────────
  if (activeLayout === 'orbital') {
    return (
      <OrbitalLayout
        activeSection={activeSection}
        detailPage={detailPage}
        mounted={mounted}
        containerSize={containerSize}
        navigateTo={navigateTo}
        styles={styles}
      />
    );
  }

  const containerClass = [
    styles.arcContainer,
    mounted ? styles.arcContainerVisible : '',
    detailPage !== null ? styles.arcContainerDetail : '',
  ].filter(Boolean).join(' ');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={containerClass}>

      {/* ── Full-width bottom drag zone ── */}
      <div
        className={styles.dragZone}
        data-precise={preciseModeRef.current || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="Drag to rotate · Double-click + drag for fine control"
      />

      {/* ── Arc icons ── */}
      {positions.map((pos) => {
        if (!pos.visible) return null;
        const section = SECTIONS[pos.index];
        if (!section) return null;
        const isActive = section.name === activeSection;
        const iconSize = ARC_ICON_MAX_SIZE * pos.scale;

        return (
          <div
            key={section.name}
            ref={(el) => {
              if (el) iconRefsMap.current.set(pos.index, el);
              else iconRefsMap.current.delete(pos.index);
            }}
            style={{
              position:      'absolute',
              left:          pos.x - iconSize / 2,
              top:           pos.y - iconSize / 2,
              width:         iconSize,
              height:        iconSize,
              opacity:       pos.opacity,
              pointerEvents: 'auto',
              cursor:        'pointer',
              userSelect:    'none',
              transform:     magneticOffsets[pos.index]
                ? `translate(${magneticOffsets[pos.index]!.x}px, ${magneticOffsets[pos.index]!.y}px)`
                : 'none',
              transition:    'transform 150ms ease',
            }}
            className={`${styles.arcIcon} ${isActive ? styles.arcIconActive : ''}`}
            onClick={() => handleIconClick(section.name, pos.index)}
            role="button"
            aria-label={section.label}
            aria-pressed={isActive}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleIconClick(section.name, pos.index);
              }
            }}
          >
            <span className={styles.arcIconEmoji} style={{ fontSize: Math.max(16, iconSize * 0.52) }}>
              {section.icon}
            </span>
            {isActive && <span className={styles.arcIconLabel}>{section.label}</span>}
          </div>
        );
      })}

      {/* ── Centered bottom controls: ‹ dots › ── */}
      <div className={styles.navControls}>
        <button
          className={`${styles.navBtn} ${!canGoLeft ? styles.navBtnDisabled : ''}`}
          onClick={goLeft}
          aria-label="Previous section"
          tabIndex={canGoLeft ? 0 : -1}
        >
          ‹
        </button>

        <div className={styles.dots}>
          {SECTIONS.map((s, i) => (
            <button
              key={s.name}
              className={`${styles.dot} ${i === safeActiveIndex ? styles.dotActive : ''}`}
              onClick={() => navigateTo(i)}
              aria-label={s.label}
            />
          ))}
        </div>

        <button
          className={`${styles.navBtn} ${!canGoRight ? styles.navBtnDisabled : ''}`}
          onClick={goRight}
          aria-label="Next section"
          tabIndex={canGoRight ? 0 : -1}
        >
          ›
        </button>
      </div>

    </div>
  );
};

export default ArcNav;