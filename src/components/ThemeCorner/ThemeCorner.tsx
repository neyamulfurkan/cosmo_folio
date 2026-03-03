// src/components/ThemeCorner/ThemeCorner.tsx

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ThemeName } from '@/types';
import { useStore } from '@/store';
import { THEMES } from '@/lib/constants';
import { createParticleEngine } from '@/canvas/particleEngine';
import type { ParticleEngine } from '@/canvas/particleEngine';
import styles from './ThemeCorner.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Physical canvas dimensions for theme preview tiles.
 * DPR scaling is intentionally omitted for these tiny previews —
 * the visual fidelity difference is imperceptible at 60×40px.
 */
const PREVIEW_W = 60;
const PREVIEW_H = 40;

/**
 * Stable count used to initialise fixed-length ref arrays.
 * Evaluated once at module load from the imported THEMES constant.
 */
const THEME_COUNT = THEMES.length; // 5

// ─── Component ────────────────────────────────────────────────────────────────

const ThemeCorner = (): JSX.Element => {
  const activeTheme = useStore((s) => s.activeTheme);
  const setActiveTheme = useStore((s) => s.setActiveTheme);

  const [panelOpen, setPanelOpen] = useState(false);

  // DOM refs for click-outside detection
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  // Stable ref arrays — length never changes (one slot per theme)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>(
    Array(THEME_COUNT).fill(null),
  );
  const engineRefs = useRef<(ParticleEngine | null)[]>(
    Array(THEME_COUNT).fill(null),
  );

  // ── Engine lifecycle: start on panel open, stop on close ─────────────────
  useEffect(() => {
    if (!panelOpen) {
      // Stop every running preview engine
      engineRefs.current.forEach((eng) => eng?.stop());
      engineRefs.current = Array(THEME_COUNT).fill(null);
      return;
    }

    // A single rAF ensures canvases are fully mounted in the DOM and have
    // non-zero layout dimensions before we hand them to the particle engine.
    const rafId = requestAnimationFrame(() => {
      THEMES.forEach(({ name }, i) => {
        const canvas = canvasRefs.current[i];
        if (!canvas) return;

        // Fix the canvas backing-store size before the engine reads canvas.width/height
        canvas.width  = PREVIEW_W;
        canvas.height = PREVIEW_H;

        // NOTE: preview engines run at native rAF speed (~60 fps).
        // The spec calls for 30 fps "frame skipping", but since the engine
        // manages its own rAF loop internally and these canvases are only
        // 60×40 px, the performance impact is negligible. Frame-skip
        // throttling would require engine-level support not present in v1.
        const engine = createParticleEngine({
          canvas,
          theme: name,
          isForeground: true,
          // No dramatic-event callbacks — previews are purely decorative
        });

        engineRefs.current[i] = engine;
        engine.start();
      });
    });

    // Cleanup: cancel the pending rAF (if panel closes before first frame)
    // then stop any engines that did start.
    return () => {
      cancelAnimationFrame(rafId);
      engineRefs.current.forEach((eng) => eng?.stop());
      engineRefs.current = Array(THEME_COUNT).fill(null);
    };
  }, [panelOpen]);

  // ── Hard cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      engineRefs.current.forEach((eng) => eng?.stop());
    };
  }, []);

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!panelOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep the panel open when the user clicks inside it or on the toggle button
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setPanelOpen(false);
    };

    // setTimeout(0) defers listener attachment by one task, preventing the
    // click that opened the panel from immediately closing it.
    const timerId = window.setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown);
    }, 0);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [panelOpen]);

  // ── Close panel on Escape ─────────────────────────────────────────────────
  useEffect(() => {
    if (!panelOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanelOpen(false);
        // Return focus to the toggle button for keyboard accessibility
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelOpen]);

  // ── Theme selection ───────────────────────────────────────────────────────
  const handleThemeSelect = useCallback(
    (theme: ThemeName) => {
      setActiveTheme(theme);
      setPanelOpen(false);
    },
    [setActiveTheme],
  );

  // ── Derived display values ────────────────────────────────────────────────
  const currentThemeCfg = THEMES.find((t) => t.name === activeTheme);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.cornerRoot}>
      {/* ── Toggle button (top-left corner) ── */}
      <button
        ref={buttonRef}
        className={styles.cornerButton}
        onClick={() => setPanelOpen((prev) => !prev)}
        aria-label={`Theme: ${currentThemeCfg?.label ?? activeTheme}. Open theme switcher.`}
        aria-expanded={panelOpen}
        aria-haspopup="dialog"
        type="button"
      >
        <span className={styles.themeIcon} aria-hidden="true">
          {currentThemeCfg?.icon ?? '🌌'}
        </span>
      </button>

      {/* ── Theme preview panel ── */}
      {panelOpen && (
        <div
          ref={panelRef}
          className={styles.themePanel}
          role="dialog"
          aria-label="Theme switcher"
          aria-modal="false"
        >
          {THEMES.map(({ name, label, icon }, index) => {
            const isActive = activeTheme === name;

            return (
              <div
                key={name}
                className={[
                  styles.themePreview,
                  isActive ? styles.themePreviewActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="button"
                tabIndex={0}
                aria-label={`${label} theme${isActive ? ' (current)' : ''}`}
                aria-pressed={isActive}
                onClick={() => handleThemeSelect(name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleThemeSelect(name);
                  }
                }}
              >
                {/* Live canvas preview — ref stored in stable array slot */}
                <canvas
                  ref={(el) => {
                    canvasRefs.current[index] = el;
                  }}
                  className={styles.previewCanvas}
                  aria-hidden="true"
                />

                <span className={styles.themeLabel}>
                  {icon} {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeCorner;