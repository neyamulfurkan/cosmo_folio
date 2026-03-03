// src/components/MobileControls/MobileControls.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, useShallowStore } from '@/store';
import { SECTIONS, THEMES, LAYOUTS } from '@/lib/constants';
import type { ThemeName, LayoutName, SectionName } from '@/types';
import styles from './MobileControls.module.css';

// ─── Orbital sub-component for mobile ────────────────────────────────────────

const ORBIT_SPEED = 0.018;

type MobileOrbitalProps = {
  activeSection: SectionName;
  navigateTo: (i: number) => void;
};

const MobileOrbital = ({ activeSection, navigateTo }: MobileOrbitalProps): JSX.Element => {
  const orbitAngleRef = useRef(0);
  const rafRef        = useRef<number>(0);
  const buttonRefs    = useRef<(HTMLButtonElement | null)[]>([]);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const ICON_SIZE = 52;
  const MARGIN    = 6;

  // Panel occupies center: 92vw wide, centered vertically ~75vh
  const panelW  = size.w * 0.92;
  const panelH  = Math.min(size.h * 0.75, 720);
  const panelL  = (size.w - panelW) / 2;
  const panelR  = panelL + panelW;
  const panelT  = (size.h - panelH) / 2;
  const panelB  = panelT + panelH;

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

  useEffect(() => {
    const total = SECTIONS.length;
    const tick = () => {
      orbitAngleRef.current = (orbitAngleRef.current + ORBIT_SPEED) % 360;
      const slotOffset = (orbitAngleRef.current / 360) * total;
      SECTIONS.forEach((_, i) => {
        const btn = buttonRefs.current[i];
        if (!btn) return;
        const slotIndex  = Math.floor((i + slotOffset) % total);
        const pos        = slotPositions[slotIndex] ?? slotPositions[0]!;
        const clampedX   = Math.max(MARGIN, Math.min(size.w - ICON_SIZE - MARGIN, pos.x));
        const clampedY   = Math.max(MARGIN, Math.min(size.h - ICON_SIZE - MARGIN, pos.y));
        btn.style.left   = `${clampedX}px`;
        btn.style.top    = `${clampedY}px`;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [slotPositions, size]);

  // Each icon's slot rotates by orbitAngle — icons cycle around the perimeter
  const total = SECTIONS.length;

  return (
    <>
      {SECTIONS.map((section, i) => {
        const isActive = section.name === activeSection;
        // Offset slot index by orbitAngle converted to slot steps
        const slotOffset = (orbitAngleRef.current / 360) * total;
        const slotIndex  = Math.floor((i + slotOffset) % total);
        const pos = slotPositions[slotIndex] ?? slotPositions[0]!;

        // Clamp to viewport just in case
        const clampedX = Math.max(MARGIN, Math.min(size.w - ICON_SIZE - MARGIN, pos.x));
        const clampedY = Math.max(MARGIN, Math.min(size.h - ICON_SIZE - MARGIN, pos.y));

        return (
          <button
            key={section.name}
            ref={(el) => { buttonRefs.current[i] = el; }}
            className={`${styles.orbitalIconMobile} ${isActive ? styles.orbitalIconMobileActive : ''}`}
            style={{
              position:      'fixed',
              left:          0,
              top:           0,
              width:         ICON_SIZE,
              height:        ICON_SIZE,
              pointerEvents: 'auto',
              zIndex:        'var(--z-controls)' as never,
            }}
            onClick={() => navigateTo(i)}
            aria-label={section.label}
            aria-pressed={isActive}
          >
            <span className={styles.scatteredIconEmoji}>{section.icon}</span>
            <span className={styles.scatteredIconLabel}>{section.label}</span>
          </button>
        );
      })}
    </>
  );
};

// ─── Scattered layout for mobile ─────────────────────────────────────────────

type MobileScatteredProps = {
  activeSection: SectionName;
  navigateTo: (i: number) => void;
};

const MobileScattered = ({ activeSection, navigateTo }: MobileScatteredProps): JSX.Element => {
  // 6 icons on left edge, 6 on right edge
  // left: 8px and right: 8px keeps icons clear of bezel
  // top values spaced to avoid the gear button (top 80px) and bottom safe area (bottom 80px)
  const positions = [
    { top: '6%',  left: '8%'  },
    { top: '6%',  left: '24%' },
    { top: '6%',  left: '40%' },
    { top: '6%',  left: '56%' },
    { top: '6%',  left: '72%' },
    { top: '6%',  left: '88%' },
    { bottom: '10%', left: '8%'  },
    { bottom: '10%', left: '24%' },
    { bottom: '10%', left: '40%' },
    { bottom: '10%', left: '56%' },
    { bottom: '10%', left: '72%' },
    { bottom: '10%', left: '88%' },
  ];

  return (
    <>
      {SECTIONS.map((section, i) => {
        const isActive = section.name === activeSection;
        const pos = positions[i] ?? { top: '50%', left: '8px' };
        return (
          <button
            key={section.name}
            className={`${styles.scatteredIconMobile} ${isActive ? styles.scatteredIconMobileActive : ''}`}
            style={{ position: 'fixed', ...pos, pointerEvents: 'auto' }}
            onClick={() => navigateTo(i)}
            aria-label={section.label}
            aria-pressed={isActive}
          >
            <span className={styles.scatteredIconEmoji}>{section.icon}</span>
            <span className={styles.scatteredIconLabel}>{section.label}</span>
          </button>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SheetPanel = 'main' | 'theme' | 'layout';

// ---------------------------------------------------------------------------
// MobileControls
// ---------------------------------------------------------------------------

const MobileControls = (): JSX.Element => {
  const {
    activeSection,
    activeTheme,
    activeLayout,
    ambienceOn,
    setActiveSection,
    setActiveTheme,
    setActiveLayout,
    setAmbienceOn,
    toggleAIPanel,
  } = useShallowStore((s) => ({
    activeSection: s.activeSection,
    activeTheme: s.activeTheme,
    activeLayout: s.activeLayout,
    ambienceOn: s.ambienceOn,
    setActiveSection: s.setActiveSection,
    setActiveTheme: s.setActiveTheme,
    setActiveLayout: s.setActiveLayout,
    setAmbienceOn: s.setAmbienceOn,
    toggleAIPanel: s.toggleAIPanel,
  }));

  // ── Sheet state ───────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<SheetPanel>('main');

  // ── Dock scroll ref ───────────────────────────────────────────────────────
  const dockRef = useRef<HTMLDivElement>(null);

  // Scroll the active section pill into view whenever activeSection changes
  useEffect(() => {
    if (!dockRef.current) return;
    const activeEl = dockRef.current.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeSection]);

  // ── Sheet helpers ─────────────────────────────────────────────────────────
  const openSheet = useCallback(() => {
    setActivePanel('main');
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    // Reset panel after close animation
    setTimeout(() => setActivePanel('main'), 400);
  }, []);

  // ── Escape key closes sheet ───────────────────────────────────────────────
  useEffect(() => {
    if (!sheetOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sheetOpen, closeSheet]);

  // ── Section tap ──────────────────────────────────────────────────────────
  const handleSectionTap = useCallback(
    (name: Parameters<typeof setActiveSection>[0]) => {
      setActiveSection(name);
    },
    [setActiveSection]
  );

  // ── Theme select ─────────────────────────────────────────────────────────
  const handleThemeSelect = useCallback(
    (theme: ThemeName) => {
      setActiveTheme(theme);
      closeSheet();
    },
    [setActiveTheme, closeSheet]
  );

  // ── Layout select ─────────────────────────────────────────────────────────
  const handleLayoutSelect = useCallback(
    (layout: LayoutName) => {
      setActiveLayout(layout);
      closeSheet();
    },
    [setActiveLayout, closeSheet]
  );

  // ── Ambience toggle ───────────────────────────────────────────────────────
  const handleAmbienceToggle = useCallback(() => {
    setAmbienceOn(!ambienceOn);
    closeSheet();
  }, [ambienceOn, setAmbienceOn, closeSheet]);

  // ── AI open ───────────────────────────────────────────────────────────────
  const handleAIOpen = useCallback(() => {
    closeSheet();
    // Small delay so sheet closes before panel opens
    setTimeout(() => toggleAIPanel(), 350);
  }, [closeSheet, toggleAIPanel]);

  // ── Render panel content inside sheet ────────────────────────────────────
  const renderSheetContent = (): JSX.Element => {
    if (activePanel === 'theme') {
      return (
        <div className={styles.subPanel}>
          <button
            className={styles.subPanelBack}
            onClick={() => setActivePanel('main')}
            aria-label="Back to main menu"
          >
            ← Back
          </button>
          <p className={styles.subPanelTitle}>Choose Theme</p>
          <div className={styles.themeGrid}>
            {THEMES.map((t) => (
              <button
                key={t.name}
                className={`${styles.themeOption} ${
                  activeTheme === t.name ? styles.themeOptionActive : ''
                }`}
                onClick={() => handleThemeSelect(t.name)}
                aria-label={`Switch to ${t.label} theme`}
              >
                <span className={styles.themeOptionIcon}>{t.icon}</span>
                <span className={styles.themeOptionLabel}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activePanel === 'layout') {
      return (
        <div className={styles.subPanel}>
          <button
            className={styles.subPanelBack}
            onClick={() => setActivePanel('main')}
            aria-label="Back to main menu"
          >
            ← Back
          </button>
          <p className={styles.subPanelTitle}>Choose Layout</p>
          <div className={styles.layoutList}>
            {LAYOUTS.map((l) => (
              <button
                key={l.name}
                className={`${styles.layoutOption} ${
                  activeLayout === l.name ? styles.layoutOptionActive : ''
                }`}
                onClick={() => handleLayoutSelect(l.name)}
                aria-label={`Switch to ${l.label} layout`}
              >
                <span className={styles.layoutOptionIcon}>{l.icon}</span>
                <span className={styles.layoutOptionLabel}>{l.label}</span>
                {activeLayout === l.name && (
                  <span className={styles.layoutOptionCheck}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // main panel
    return (
      <div className={styles.sheetOptions}>
        <button
          className={styles.sheetOption}
          onClick={() => setActivePanel('theme')}
          aria-label="Change theme"
        >
          <span className={styles.sheetOptionIcon}>
            {THEMES.find((t) => t.name === activeTheme)?.icon ?? '🌌'}
          </span>
          <span className={styles.sheetOptionLabel}>Theme</span>
        </button>

        <button
          className={`${styles.sheetOption} ${ambienceOn ? styles.sheetOptionActive : ''}`}
          onClick={handleAmbienceToggle}
          aria-label={ambienceOn ? 'Turn off ambience' : 'Turn on ambience'}
        >
          <span className={styles.sheetOptionIcon}>
            {ambienceOn ? '🔊' : '🔇'}
          </span>
          <span className={styles.sheetOptionLabel}>
            {ambienceOn ? 'Ambience On' : 'Ambience'}
          </span>
        </button>

        <button
          className={styles.sheetOption}
          onClick={() => setActivePanel('layout')}
          aria-label="Change layout"
        >
          <span className={styles.sheetOptionIcon}>
            {LAYOUTS.find((l) => l.name === activeLayout)?.icon ?? '🌙'}
          </span>
          <span className={styles.sheetOptionLabel}>Layout</span>
        </button>

        <button
          className={styles.sheetOption}
          onClick={handleAIOpen}
          aria-label="Open AI assistant"
        >
          <span className={styles.sheetOptionIcon}>✨</span>
          <span className={styles.sheetOptionLabel}>AI Assistant</span>
        </button>
      </div>
    );
  };

  // ── Navigate helper for sub-layouts ──────────────────────────────────────
  const navigateTo = useCallback((index: number) => {
    const section = SECTIONS[index];
    if (section) setActiveSection(section.name);
  }, [setActiveSection]);

  const showDock = activeLayout === 'dock';
  // arc layout is rendered by ArcNav directly in Layer3Controls — not here

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Orbital layout ──────────────────────────────────────────────── */}
      {activeLayout === 'orbital' && (
        <MobileOrbital
          activeSection={activeSection}
          navigateTo={navigateTo}
        />
      )}

      {/* ── Scattered layout ────────────────────────────────────────────── */}
      {activeLayout === 'scattered' && (
        <MobileScattered
          activeSection={activeSection}
          navigateTo={navigateTo}
        />
      )}

      {/* ── Arc nav — rendered by ArcNav component directly ─────────────── */}
      {/* Arc layout on mobile is handled by Layer3Controls passing ArcNav */}

      {/* ── Bottom Dock — shown for arc + dock layouts ───────────────────── */}
      {showDock && (
        <nav
          ref={dockRef}
          className={styles.bottomDock}
          aria-label="Section navigation"
        >
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.name;
            return (
              <button
                key={section.name}
                className={`${styles.dockIcon} ${isActive ? styles.dockIconActive : ''}`}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => handleSectionTap(section.name)}
                aria-label={section.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.dockIconEmoji}>{section.icon}</span>
                <span className={styles.dockIconLabel}>{section.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {sheetOpen && (
        <div
          className={styles.backdrop}
          onClick={closeSheet}
          aria-hidden="true"
        />
      )}

      {/* ── Bottom Sheet ────────────────────────────────────────────────── */}
      <div
        className={`${styles.bottomSheet} ${sheetOpen ? styles.bottomSheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        {renderSheetContent()}
      </div>
    </>
  );
};

export default MobileControls;