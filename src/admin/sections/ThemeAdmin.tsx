// src/admin/sections/ThemeAdmin.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { ThemeName } from '../../types';
import styles from './ThemeAdmin.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastState = { type: 'success' | 'error'; message: string } | null;

type ThemeConfig = {
  name: ThemeName;
  label: string;
  emoji: string;
  description: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  particleColor: string;
};

// ─── Theme metadata ───────────────────────────────────────────────────────────

const THEMES: ThemeConfig[] = [
  {
    name: 'space',
    label: 'Space',
    emoji: '🌌',
    description: 'Deep cosmos with drifting stars and purple nebula glows. The default experience.',
    bgStart: '#020818',
    bgEnd: '#0d0621',
    accent: '#7b5cf0',
    particleColor: 'rgba(255,255,255,0.9)',
  },
  {
    name: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    description: 'Bioluminescent depths with undulating teal particles and light pulses.',
    bgStart: '#020d14',
    bgEnd: '#031a2e',
    accent: '#00b4d8',
    particleColor: 'rgba(64,224,208,0.8)',
  },
  {
    name: 'forest',
    label: 'Forest',
    emoji: '🌿',
    description: 'Midnight canopy with softly blinking firefly particles in shades of green.',
    bgStart: '#020a04',
    bgEnd: '#041208',
    accent: '#4caf50',
    particleColor: 'rgba(144,238,144,0.6)',
  },
  {
    name: 'ember',
    label: 'Ember',
    emoji: '🔥',
    description: 'Smoldering dark with rising ash particles and warm orange glow bursts.',
    bgStart: '#0a0202',
    bgEnd: '#140804',
    accent: '#ff6314',
    particleColor: 'rgba(255,100,20,0.8)',
  },
  {
    name: 'minimal',
    label: 'Minimal',
    emoji: '◻️',
    description: 'Pure black canvas with quiet white geometric particles. No distractions.',
    bgStart: '#000000',
    bgEnd: '#050505',
    accent: '#ffffff',
    particleColor: 'rgba(255,255,255,0.85)',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

type ToastProps = { toast: ToastState; onDismiss: () => void };
const Toast = ({ toast, onDismiss }: ToastProps): JSX.Element | null => {
  if (!toast) return null;
  return (
    <div
      className={`${styles.toast} ${
        toast.type === 'error' ? styles.toastError : styles.toastSuccess
      }`}
    >
      <span>{toast.message}</span>
      <button className={styles.toastClose} onClick={onDismiss} type="button">
        ✕
      </button>
    </div>
  );
};

// ─── Mini theme preview card ──────────────────────────────────────────────────

type ThemeCardProps = {
  theme: ThemeConfig;
  selected: boolean;
  onSelect: () => void;
};

const ThemeCard = ({ theme, selected, onSelect }: ThemeCardProps): JSX.Element => {
  // Render a small animated particle preview using inline canvas-like CSS
  const particlePositions = [
    { top: '15%', left: '20%', size: 3, opacity: 0.9 },
    { top: '35%', left: '65%', size: 2, opacity: 0.6 },
    { top: '55%', left: '30%', size: 4, opacity: 0.8 },
    { top: '70%', left: '75%', size: 2, opacity: 0.5 },
    { top: '25%', left: '80%', size: 3, opacity: 0.7 },
    { top: '80%', left: '45%', size: 2, opacity: 0.6 },
    { top: '45%', left: '10%', size: 3, opacity: 0.8 },
    { top: '60%', left: '55%', size: 2, opacity: 0.5 },
    { top: '10%', left: '50%', size: 2, opacity: 0.7 },
    { top: '85%', left: '20%', size: 3, opacity: 0.6 },
  ];

  return (
    <div
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        cursor: 'pointer',
        borderRadius: 16,
        overflow: 'hidden',
        border: selected
          ? `2.5px solid ${theme.accent}`
          : '2px solid #e5e7eb',
        boxShadow: selected
          ? `0 0 0 3px ${theme.accent}33, 0 4px 16px rgba(0,0,0,0.12)`
          : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
        background: '#fff',
      }}
    >
      {/* Visual preview strip */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 100,
          background: `linear-gradient(160deg, ${theme.bgStart}, ${theme.bgEnd})`,
          overflow: 'hidden',
        }}
      >
        {/* Simulated particles */}
        {particlePositions.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: theme.particleColor,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 2}px ${theme.particleColor}`,
            }}
          />
        ))}

        {/* Accent glow blob */}
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: theme.accent,
            opacity: 0.15,
            filter: 'blur(20px)',
          }}
        />

        {/* Selected checkmark */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: theme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              color: theme.name === 'minimal' ? '#000' : '#fff',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            ✓
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 18 }}>{theme.emoji}</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: '#111827',
            }}
          >
            {theme.label}
          </span>
          {selected && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                fontWeight: 600,
                color: theme.accent,
                background: `${theme.accent}18`,
                padding: '2px 8px',
                borderRadius: 20,
                border: `1px solid ${theme.accent}44`,
              }}
            >
              Default
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: '#6b7280',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {theme.description}
        </p>

        {/* Accent swatch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: theme.accent,
              boxShadow: `0 0 6px ${theme.accent}88`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: '#9ca3af',
              fontFamily: 'monospace',
            }}
          >
            {theme.accent}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ThemeAdmin = (): JSX.Element => {
  const { getToken } = useAuth();

  const [defaultTheme, setDefaultTheme] = useState<ThemeName>('space');
  const [pendingTheme, setPendingTheme] = useState<ThemeName>('space');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [isDirty, setIsDirty] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-dismiss toast ────────────────────────────────────────────────────
  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // ── Fetch current default_theme from site_settings ────────────────────────
  const fetchDefaultTheme = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as Record<string, unknown>;

      const saved = raw.default_theme;
      const validThemes: ThemeName[] = ['space', 'ocean', 'forest', 'ember', 'minimal'];
      const resolved: ThemeName =
        typeof saved === 'string' && validThemes.includes(saved as ThemeName)
          ? (saved as ThemeName)
          : 'space';

      setDefaultTheme(resolved);
      setPendingTheme(resolved);
    } catch (err) {
      console.error('[ThemeAdmin] fetch error:', err);
      showToast({ type: 'error', message: 'Failed to load theme settings.' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchDefaultTheme();
  }, [fetchDefaultTheme]);

  // ── Handle selection ──────────────────────────────────────────────────────
  const handleSelect = (theme: ThemeName): void => {
    setPendingTheme(theme);
    setIsDirty(theme !== defaultTheme);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/stats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: 'default_theme', value: pendingTheme }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setDefaultTheme(pendingTheme);
      setIsDirty(false);
      showToast({
        type: 'success',
        message: `Default theme set to ${THEMES.find((t) => t.name === pendingTheme)?.label ?? pendingTheme}.`,
      });
    } catch (err) {
      console.error('[ThemeAdmin] save error:', err);
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Discard pending change ────────────────────────────────────────────────
  const handleDiscard = (): void => {
    setPendingTheme(defaultTheme);
    setIsDirty(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>Loading theme settings…</span>
        </div>
      </div>
    );
  }

  const selectedConfig = THEMES.find((t) => t.name === pendingTheme) ?? THEMES[0];

  return (
    <div className={styles.container}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 6px',
          }}
        >
          Default Theme
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          Choose which particle world visitors see when they first open your
          portfolio. They can switch themes themselves using the corner control —
          this setting only affects the initial experience.
        </p>
      </div>

      {/* ── Current default callout ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: `${selectedConfig.accent}0d`,
          border: `1px solid ${selectedConfig.accent}33`,
          borderRadius: 12,
          padding: '12px 18px',
          marginBottom: 28,
          transition: 'all 0.3s ease',
        }}
      >
        <span style={{ fontSize: 22 }}>{selectedConfig.emoji}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
            {isDirty ? 'Pending: ' : 'Current default: '}
            <span style={{ color: selectedConfig.accent }}>
              {selectedConfig.label}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>
            {selectedConfig.description}
          </div>
        </div>
        {isDirty && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 600,
              color: '#b45309',
              background: '#fef3c7',
              padding: '3px 10px',
              borderRadius: 20,
              border: '1px solid #fde68a',
              whiteSpace: 'nowrap',
            }}
          >
            Unsaved change
          </span>
        )}
      </div>

      {/* ── Theme grid ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Choose a Theme</h3>
        <p className={styles.sectionHint}>
          Click a theme to preview it. Save to make it the default for new
          visitors.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {THEMES.map((theme) => (
            <ThemeCard
              key={theme.name}
              theme={theme}
              selected={pendingTheme === theme.name}
              onSelect={() => handleSelect(theme.name)}
            />
          ))}
        </div>
      </section>

      {/* ── Theme comparison table ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Theme Comparison</h3>
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {[
                  'Theme',
                  'Particle Behavior',
                  'Dramatic Event',
                  'Mood',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontWeight: 600,
                      color: '#6b7280',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  {
                    name: 'space' as ThemeName,
                    behavior: 'Slow drift',
                    event: 'Shooting star',
                    mood: 'Awe-inspiring, professional',
                  },
                  {
                    name: 'ocean' as ThemeName,
                    behavior: 'Vertical undulation',
                    event: 'Light pulse',
                    mood: 'Calm, fluid, creative',
                  },
                  {
                    name: 'forest' as ThemeName,
                    behavior: 'Random blink',
                    event: 'Leaf drift',
                    mood: 'Organic, grounded, warm',
                  },
                  {
                    name: 'ember' as ThemeName,
                    behavior: 'Rising upward',
                    event: 'Spark burst',
                    mood: 'Energetic, intense, bold',
                  },
                  {
                    name: 'minimal' as ThemeName,
                    behavior: 'Geometric grid',
                    event: 'None',
                    mood: 'Clean, focused, technical',
                  },
                ] as {
                  name: ThemeName;
                  behavior: string;
                  event: string;
                  mood: string;
                }[]
              ).map((row, idx, arr) => {
                const config = THEMES.find((t) => t.name === row.name)!;
                const isSelected = pendingTheme === row.name;
                return (
                  <tr
                    key={row.name}
                    onClick={() => handleSelect(row.name)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? `${config.accent}08` : 'transparent',
                      borderBottom:
                        idx < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: config.accent,
                            boxShadow: `0 0 6px ${config.accent}88`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontWeight: isSelected ? 700 : 500, color: '#111827' }}>
                          {config.emoji} {config.label}
                        </span>
                        {isSelected && (
                          <span
                            style={{
                              fontSize: 10,
                              color: config.accent,
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>{row.behavior}</td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>{row.event}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{row.mood}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── How themes work info box ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>How It Works</h3>
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 12,
            padding: '16px 20px',
            fontSize: 13.5,
            lineHeight: 1.7,
            color: '#0c4a6e',
          }}
        >
          <p style={{ margin: '0 0 8px' }}>
            <strong>Default theme</strong> — this setting controls which theme
            loads for first-time visitors. It is stored in{' '}
            <code
              style={{
                fontFamily: 'monospace',
                background: '#e0f2fe',
                padding: '1px 5px',
                borderRadius: 4,
              }}
            >
              site_settings
            </code>{' '}
            and read by the portfolio on every hard reload.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>Visitor control</strong> — visitors can switch themes any
            time using the theme corner (top-left). Their choice is not
            persisted, so they always see the default on a fresh visit.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Night mode</strong> — between 10pm and 6am in the visitor's
            local timezone, particle opacity automatically reduces by 15% and
            animation speed slows by 20%, regardless of the chosen theme.
          </p>
        </div>
      </section>

      {/* ── Save bar ── */}
      <div className={styles.saveBar}>
        {isDirty && (
          <button
            className={styles.cancelBtn}
            onClick={handleDiscard}
            type="button"
            disabled={saving}
          >
            Discard
          </button>
        )}
        <button
          className={styles.saveBtn}
          onClick={() => void handleSave()}
          type="button"
          disabled={saving || !isDirty}
          style={{
            opacity: !isDirty ? 0.5 : 1,
            cursor: !isDirty ? 'default' : 'pointer',
          }}
        >
          {saving
            ? 'Saving…'
            : isDirty
            ? `Set ${selectedConfig.label} as Default`
            : 'No Changes'}
        </button>
      </div>
    </div>
  );
};

export default ThemeAdmin;