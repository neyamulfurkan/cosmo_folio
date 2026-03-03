// src/admin/components/ContentPreview.tsx

import { createContext, useContext, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import type {
  SectionName,
  Identity,
  Project,
  Skill,
  Experience,
  Education,
  Certification,
  BlogPost,
  LabItem,
  Achievement,
} from '@/types';
import type { ContentPayload } from '@/store';
import styles from './ContentPreview.module.css';

// ─── Preview Context ──────────────────────────────────────────────────────────
// Section components check for this context and use it instead of the global
// Zustand store when present, so the preview never touches live state.

type PreviewContextValue = {
  isPreview: true;
  data: Partial<ContentPayload>;
  activeSection: SectionName;
};

export const PreviewContext = createContext<PreviewContextValue | null>(null);

/**
 * Hook consumed by section components to detect preview mode.
 * Returns null when not inside a ContentPreview — components fall back
 * to the Zustand store in that case.
 */
export const usePreviewContext = (): PreviewContextValue | null =>
  useContext(PreviewContext);

// ─── Lazy section components ──────────────────────────────────────────────────
// We import the same section components the portfolio uses so the preview is
// pixel-identical to what visitors see. They're lazy so the preview overlay
// doesn't bloat the admin bundle until it's actually opened.

const Home         = lazy(() => import('@/components/sections/Home/Home'));
const Projects     = lazy(() => import('@/components/sections/Projects/Projects'));
const About        = lazy(() => import('@/components/sections/About/About'));
const Skills       = lazy(() => import('@/components/sections/Skills/Skills'));
const Experience   = lazy(() => import('@/components/sections/Experience/Experience'));
const Education    = lazy(() => import('@/components/sections/Education/Education'));
const Blog         = lazy(() => import('@/components/sections/Blog/Blog'));
const Stats        = lazy(() => import('@/components/sections/Stats/Stats'));
const Lab          = lazy(() => import('@/components/sections/Lab/Lab'));
const Achievements = lazy(() => import('@/components/sections/Achievements/Achievements'));
const Contact      = lazy(() => import('@/components/sections/Contact/Contact'));
const Resume       = lazy(() => import('@/components/sections/Resume/Resume'));

const SectionFallback = (): JSX.Element => (
  <div className={styles.sectionFallback}>
    <div className={styles.sectionFallbackSpinner} />
    <span className={styles.sectionFallbackText}>Loading preview…</span>
  </div>
);

const renderSection = (section: SectionName): JSX.Element => {
  switch (section) {
    case 'home':         return <Home />;
    case 'projects':     return <Projects />;
    case 'about':        return <About />;
    case 'skills':       return <Skills />;
    case 'experience':   return <Experience />;
    case 'education':    return <Education />;
    case 'blog':         return <Blog />;
    case 'stats':        return <Stats />;
    case 'lab':          return <Lab />;
    case 'achievements': return <Achievements />;
    case 'contact':      return <Contact />;
    case 'resume':       return <Resume />;
    default:             return <Home />;
  }
};

// ─── Section label map ────────────────────────────────────────────────────────
const SECTION_LABELS: Record<SectionName, string> = {
  home:         'Home',
  projects:     'Projects',
  about:        'About',
  skills:       'Skills',
  experience:   'Experience',
  education:    'Education',
  blog:         'Blog',
  stats:        'Stats',
  lab:          'Lab',
  achievements: 'Achievements',
  contact:      'Contact',
  resume:       'Resume',
};

// ─── Props ────────────────────────────────────────────────────────────────────
export type ContentPreviewProps = {
  /** Which section to preview */
  section: SectionName;
  /**
   * Partial data override — unsaved form state from the admin editor.
   * Whatever fields are provided here replace the live store values
   * inside the preview context. Missing fields come from the global store.
   */
  data?: Partial<ContentPayload>;
  /** Called when the user closes the preview */
  onClose: () => void;
};

// ─── Merge helper ─────────────────────────────────────────────────────────────
// Shallow-merges preview data on top of the current store snapshot so that
// sections which read multiple data keys still work even if only one key was
// overridden by the admin editor.
const mergeWithStoreSnapshot = (override: Partial<ContentPayload> = {}): Partial<ContentPayload> => {
  // Import store lazily at call time to avoid a circular-import at module
  // evaluation time (store → contentLoader → this file is not a real cycle,
  // but reading getState() here is safe and avoids the issue entirely).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useStore } = require('@/store') as { useStore: { getState: () => Record<string, unknown> } };
  const s = useStore.getState() as {
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

  return {
    identity:       override.identity       ?? s.identity,
    projects:       override.projects       ?? s.projects,
    skills:         override.skills         ?? s.skills,
    experience:     override.experience     ?? s.experience,
    education:      override.education      ?? s.education,
    certifications: override.certifications ?? s.certifications,
    blogPosts:      override.blogPosts      ?? s.blogPosts,
    labItems:       override.labItems       ?? s.labItems,
    achievements:   override.achievements   ?? s.achievements,
  };
};

// ─── ContentPreview component ─────────────────────────────────────────────────
const ContentPreview = ({ section, data, onClose }: ContentPreviewProps): JSX.Element => {
  // Merged data snapshot — computed once when the overlay opens.
  const [mergedData] = useState<Partial<ContentPayload>>(() =>
    mergeWithStoreSnapshot(data)
  );

  // ── Keyboard: Escape closes ───────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while preview is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKeyDown]);

  // ── Backdrop click closes ─────────────────────────────────────────────────
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Context value ─────────────────────────────────────────────────────────
  const contextValue: PreviewContextValue = {
    isPreview: true,
    data: mergedData,
    activeSection: section,
  };

  return (
    <div
      className={styles.previewOverlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${SECTION_LABELS[section]}`}
    >
      <div className={styles.previewContainer}>
        {/* Label pill */}
        <div className={styles.previewLabel}>
          <span className={styles.previewLabelDot} />
          Preview — {SECTION_LABELS[section]}
        </div>

        {/* Close button */}
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close preview"
          type="button"
        >
          ✕
        </button>

        {/* Noise overlay — matches Layer 2's glass aesthetic */}
        <div className={styles.noiseOverlay} aria-hidden="true" />

        {/* Scrollable content area */}
        <div className={styles.previewScrollArea} data-layer2-scroll>
          <PreviewContext.Provider value={contextValue}>
            <Suspense fallback={<SectionFallback />}>
              {renderSection(section)}
            </Suspense>
          </PreviewContext.Provider>
        </div>
      </div>
    </div>
  );
};

export default ContentPreview;