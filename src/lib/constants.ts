// src/lib/constants.ts

import type { SectionName, ThemeName, LayoutName } from '@/types';

// ─── Sections ────────────────────────────────────────────────────────────────

export const SECTIONS: { name: SectionName; label: string; icon: string }[] = [
  { name: 'home',         label: 'Home',         icon: '🏠' },
  { name: 'projects',     label: 'Projects',     icon: '🚀' },
  { name: 'about',        label: 'About',        icon: '👤' },
  { name: 'skills',       label: 'Skills',       icon: '⚡' },
  { name: 'experience',   label: 'Experience',   icon: '💼' },
  { name: 'education',    label: 'Education',    icon: '🎓' },
  { name: 'blog',         label: 'Blog',         icon: '✍️' },
  { name: 'stats',        label: 'Stats',        icon: '📊' },
  { name: 'lab',          label: 'Lab',          icon: '🧪' },
  { name: 'achievements', label: 'Achievements', icon: '🏆' },
  { name: 'contact',      label: 'Contact',      icon: '📬' },
  { name: 'resume',       label: 'Resume',       icon: '📄' },
];

// ─── Themes ──────────────────────────────────────────────────────────────────

export const THEMES: { name: ThemeName; label: string; icon: string }[] = [
  { name: 'space',   label: 'Space',   icon: '🌌' },
  { name: 'ocean',   label: 'Ocean',   icon: '🌊' },
  { name: 'forest',  label: 'Forest',  icon: '🌲' },
  { name: 'ember',   label: 'Ember',   icon: '🔥' },
  { name: 'minimal', label: 'Minimal', icon: '⬛' },
];

// ─── Layouts ─────────────────────────────────────────────────────────────────

export const LAYOUTS: { name: LayoutName; label: string; icon: string }[] = [
  { name: 'arc',      label: 'Arc',      icon: '🌙' },
  { name: 'dock',     label: 'Dock',     icon: '▬' },
  { name: 'scattered', label: 'Scattered', icon: '✦' },
  { name: 'orbital',  label: 'Orbital',  icon: '🪐' },
];

// ─── Particle counts ─────────────────────────────────────────────────────────

export const PARTICLE_COUNT_FOREGROUND: number = 40;
export const PARTICLE_COUNT_FOREGROUND_MOBILE: number = 20;

export const PARTICLE_COUNT_BACKGROUND: number = 180;
export const PARTICLE_COUNT_BACKGROUND_MOBILE: number = 90;

// ─── Arc geometry ────────────────────────────────────────────────────────────

/** Multiplied by max(100vw, 100vh) to compute the arc circle radius. */
export const ARC_CIRCLE_RADIUS_MULTIPLIER: number = 1.8;

/** Pixels of arc curve visible above the viewport bottom edge. */
export const ARC_VISIBLE_HEIGHT: number = 88;

/** Size in px of the active (centre) arc icon. */
export const ARC_ICON_MAX_SIZE: number = 52;

/** Size in px of an icon at the furthest visible arc position. */
export const ARC_ICON_MIN_SIZE: number = 36;

/** Number of icons visible on each side of the centre icon. */
export const ARC_VISIBLE_ICON_COUNT: number = 5;

// ─── Animation ───────────────────────────────────────────────────────────────

/** Duration in ms for the detail-page clip-path zoom animation. */
export const DETAIL_ZOOM_DURATION: number = 400;

// ─── AI ──────────────────────────────────────────────────────────────────────

export const AI_MODEL: string = 'llama-3.1-70b-versatile';

// ─── Night mode ──────────────────────────────────────────────────────────────

export const NIGHT_MODE_HOURS: { start: number; end: number } = {
  start: 22,
  end: 6,
};

// ─── Idle cursor ─────────────────────────────────────────────────────────────

/** Milliseconds of cursor inactivity before particle attraction activates. */
export const IDLE_CURSOR_DELAY: number = 30_000;