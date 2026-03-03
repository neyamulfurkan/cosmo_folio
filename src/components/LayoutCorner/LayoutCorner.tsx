// src/components/LayoutCorner/LayoutCorner.tsx

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { LAYOUTS } from '@/lib/constants';
import type { LayoutName } from '@/types';
import styles from './LayoutCorner.module.css';

// ─── FLIP animation helper ────────────────────────────────────────────────────

/**
 * Runs a FLIP animation on all elements marked with data-arc-icon.
 * Must be called BEFORE the layout class change — it captures first positions,
 * then returns a function that applies the new layout and animates.
 */
const captureArcIconPositions = (): Map<Element, DOMRect> => {
  const icons = document.querySelectorAll('[data-arc-icon]');
  const positions = new Map<Element, DOMRect>();
  icons.forEach((el) => {
    positions.set(el, el.getBoundingClientRect());
  });
  return positions;
};

const runFlipAnimation = (
  firstPositions: Map<Element, DOMRect>,
): void => {
  const icons = document.querySelectorAll('[data-arc-icon]');

  icons.forEach((el, i) => {
    const first = firstPositions.get(el);
    if (!first) return;

    const last = el.getBoundingClientRect();

    const dx = first.left - last.left;
    const dy = first.top - last.top;

    // If no movement, skip
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    // Stagger each icon slightly
    const delay = i * 20;

    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, offset: 0 },
        { transform: 'translate(0px, 0px)', offset: 1 },
      ],
      {
        duration: 420,
        delay,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // --easing-spring equivalent
        fill: 'backwards',
      },
    );
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

const LayoutCorner = (): JSX.Element => {
  const activeLayout = useStore((s) => s.activeLayout);
  const setActiveLayout = useStore((s) => s.setActiveLayout);

  const [panelOpen, setPanelOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Close panel on outside click or Escape ────────────────────────────────

  useEffect(() => {
    if (!panelOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [panelOpen]);

  // ─── Layout selection with FLIP ───────────────────────────────────────────

  const handleSelectLayout = useCallback(
    (layout: LayoutName) => {
      if (layout === activeLayout) {
        setPanelOpen(false);
        return;
      }

      // STEP 1 — Measure BEFORE the layout change
      const firstPositions = captureArcIconPositions();

      // STEP 2 — Apply the layout change
      setActiveLayout(layout);

      // STEP 3 — After React re-renders and the DOM reflects the new layout,
      // measure the new positions and run FLIP.
      // requestAnimationFrame ensures the paint has occurred.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          runFlipAnimation(firstPositions);
        });
      });

      setPanelOpen(false);
    },
    [activeLayout, setActiveLayout],
  );

  // ─── Current layout config ────────────────────────────────────────────────

  const currentLayout = LAYOUTS.find((l) => l.name === activeLayout) ?? LAYOUTS[0];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.cornerRoot}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        className={styles.cornerButton}
        onClick={() => setPanelOpen((prev) => !prev)}
        aria-label="Switch navigation layout"
        aria-expanded={panelOpen}
        aria-haspopup="listbox"
        title="Change layout"
      >
        <span className={styles.buttonIcon} aria-hidden="true">
          {currentLayout.icon}
        </span>
      </button>

      {/* Layout options panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          className={styles.layoutPanel}
          role="listbox"
          aria-label="Navigation layout options"
        >
          <p className={styles.panelTitle}>Navigation Layout</p>

          {LAYOUTS.map((layout) => {
            const isActive = layout.name === activeLayout;

            return (
              <button
                key={layout.name}
                className={[
                  styles.layoutOption,
                  isActive ? styles.layoutOptionActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleSelectLayout(layout.name)}
                role="option"
                aria-selected={isActive}
              >
                <span className={styles.optionIcon} aria-hidden="true">
                  {layout.icon}
                </span>
                <span className={styles.optionLabel}>{layout.label}</span>
                {isActive && (
                  <span className={styles.activeCheck} aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LayoutCorner;