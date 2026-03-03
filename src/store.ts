// src/store.ts

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  ThemeName,
  LayoutName,
  SectionName,
  DetailPage,
  Identity,
  Project,
  Skill,
  Experience,
  Education,
  Certification,
  BlogPost,
  LabItem,
  Achievement,
  AIMessage,
} from '@/types';

// ---------------------------------------------------------------------------
// ContentPayload — used by setAllContent to hydrate all data at once
// ---------------------------------------------------------------------------
export type ContentPayload = {
  identity: Identity | null;
  projects: Project[];
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  blogPosts: BlogPost[];
  labItems: LabItem[];
  achievements: Achievement[];
};

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------
type StoreState = {
  // UI state
  activeSection: SectionName;
  activeTheme: ThemeName;
  activeLayout: LayoutName;
  detailPage: DetailPage;
  aiPanelOpen: boolean;
  ambienceOn: boolean;
  ambienceVolume: number;
  nightMode: boolean;
  contentLoaded: boolean;

  // Portfolio data
  identity: Identity | null;
  projects: Project[];
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  blogPosts: BlogPost[];
  labItems: LabItem[];
  achievements: Achievement[];

  // AI chat
  aiMessages: AIMessage[];
};

type StoreActions = {
  setActiveSection: (section: SectionName) => void;
  setActiveTheme: (theme: ThemeName) => void;
  setActiveLayout: (layout: LayoutName) => void;
  openDetail: (page: NonNullable<DetailPage>) => void;
  closeDetail: () => void;
  toggleAIPanel: () => void;
  setAmbienceOn: (on: boolean) => void;
  setAmbienceVolume: (vol: number) => void;
  setContentLoaded: () => void;
  setAllContent: (data: ContentPayload) => void;
  addAIMessage: (msg: AIMessage) => void;
  clearAIMessages: () => void;
};

type Store = StoreState & StoreActions;

// ---------------------------------------------------------------------------
// localStorage helpers — only ambienceOn and ambienceVolume are persisted
// ---------------------------------------------------------------------------
const readLocalBoolean = (key: string, fallback: boolean): boolean => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
};

const readLocalNumber = (key: string, fallback: number): number => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? fallback : parsed;
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable (private browsing, storage full) — silently ignore
  }
};

// ---------------------------------------------------------------------------
// Night mode initialisation
// ---------------------------------------------------------------------------
const initNightMode = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
};

// ---------------------------------------------------------------------------
// Body class helper
// ---------------------------------------------------------------------------
const applyThemeClass = (theme: ThemeName): void => {
  document.body.className =
    document.body.className.replace(/theme-\w+/g, '').trim() + ' theme-' + theme;
};

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------
export const useStore = create<Store>((set) => ({
  // ── Initial UI state ──────────────────────────────────────────────────────
  activeSection: 'home',
  activeTheme: 'space',
  activeLayout: 'arc',
  detailPage: null,
  aiPanelOpen: false,
  ambienceOn: readLocalBoolean('ambienceOn', false),
  ambienceVolume: readLocalNumber('ambienceVolume', 0.5),
  nightMode: initNightMode(),
  contentLoaded: false,

  // ── Initial data ──────────────────────────────────────────────────────────
  identity: null,
  projects: [],
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  blogPosts: [],
  labItems: [],
  achievements: [],
  aiMessages: [],

  // ── Actions ───────────────────────────────────────────────────────────────
  setActiveSection: (section) => {
    set({ activeSection: section });
    // Scroll the Layer 2 inner container back to the top on section change.
    // The container uses a data attribute so we can target it without coupling
    // to a specific CSS class that might change.
    try {
      const el = document.querySelector('[data-layer2-scroll]');
      if (el) el.scrollTop = 0;
    } catch {
      // DOM not ready or SSR — ignore
    }
  },

  setActiveTheme: (theme) => {
    applyThemeClass(theme);
    set({ activeTheme: theme });
  },

  setActiveLayout: (layout) => {
    set({ activeLayout: layout });
  },

  openDetail: (page) => {
    set({ detailPage: page });
  },

  closeDetail: () => {
    set({ detailPage: null });
  },

  toggleAIPanel: () => {
    set((state) => ({ aiPanelOpen: !state.aiPanelOpen }));
  },

  setAmbienceOn: (on) => {
    writeLocal('ambienceOn', String(on));
    set({ ambienceOn: on });
  },

  setAmbienceVolume: (vol) => {
    writeLocal('ambienceVolume', String(vol));
    set({ ambienceVolume: vol });
  },

  setContentLoaded: () => {
    set({ contentLoaded: true });
  },

  setAllContent: (data) => {
    set({
      identity: data.identity,
      projects: data.projects,
      skills: data.skills,
      experience: data.experience,
      education: data.education,
      certifications: data.certifications,
      blogPosts: data.blogPosts,
      labItems: data.labItems,
      achievements: data.achievements,
    });
  },

  addAIMessage: (msg) => {
    set((state) => ({ aiMessages: [...state.aiMessages, msg] }));
  },

  clearAIMessages: () => {
    set({ aiMessages: [] });
  },
}));

// ---------------------------------------------------------------------------
// Convenience hook with shallow equality for multi-value selectors
// ---------------------------------------------------------------------------
export const useShallowStore = <T>(selector: (state: Store) => T): T =>
  useStore(useShallow(selector));