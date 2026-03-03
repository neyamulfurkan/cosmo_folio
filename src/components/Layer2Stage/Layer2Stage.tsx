// src/components/Layer2Stage/Layer2Stage.tsx

import React, { useEffect, useRef, useState, lazy, Suspense, useCallback } from 'react';
import { useStore } from '@/store';
import { SECTIONS, DETAIL_ZOOM_DURATION } from '@/lib/constants';
import type { SectionName, DetailPage } from '@/types';
import styles from './Layer2Stage.module.css';

// ─── Lazy-loaded section components ──────────────────────────────────────────

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

// ─── Lazy-loaded detail components ───────────────────────────────────────────

const ProjectDetail = lazy(() => import('@/components/details/ProjectDetail/ProjectDetail'));
const BlogDetail    = lazy(() => import('@/components/details/BlogDetail/BlogDetail'));
const LabDetail     = lazy(() => import('@/components/details/LabDetail/LabDetail'));

// ─── Section component map ────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<SectionName, React.LazyExoticComponent<() => JSX.Element>> = {
  home:         Home,
  projects:     Projects,
  about:        About,
  skills:       Skills,
  experience:   Experience,
  education:    Education,
  blog:         Blog,
  stats:        Stats,
  lab:          Lab,
  achievements: Achievements,
  contact:      Contact,
  resume:       Resume,
};

// ─── Transition direction helpers ────────────────────────────────────────────

const getSectionIndex = (name: SectionName): number =>
  SECTIONS.findIndex((s) => s.name === name);

type TransitionDir = 'left' | 'right' | 'none';

const getTransitionDir = (from: SectionName, to: SectionName): TransitionDir => {
  const fromIdx = getSectionIndex(from);
  const toIdx   = getSectionIndex(to);
  if (fromIdx === toIdx) return 'none';
  return fromIdx < toIdx ? 'left' : 'right';
};

// ─── Suspense fallback ────────────────────────────────────────────────────────

const SectionFallback = (): JSX.Element => (
  <div className={styles.sectionFallback} aria-label="Loading section…" />
);

// ─── Support for View Transitions API ────────────────────────────────────────

const supportsViewTransitions =
  typeof document !== 'undefined' && 'startViewTransition' in document;

// ─── Main component ───────────────────────────────────────────────────────────

const Layer2Stage = (): JSX.Element => {
  const activeSection = useStore((s) => s.activeSection);
  const detailPage    = useStore((s) => s.detailPage);

  // ── Rendered section state ─────────────────────────────────────────────────
  // We track what's currently *rendered* (may lag behind store during animation)
  const [renderedSection, setRenderedSection] = useState<SectionName>(activeSection);
  const [prevSection, setPrevSection]         = useState<SectionName | null>(null);
  const [transitionDir, setTransitionDir]     = useState<TransitionDir>('none');
  const [phase, setPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');

  // ── Detail page animation state ────────────────────────────────────────────
  const [detailVisible, setDetailVisible]   = useState<boolean>(false);
  const [detailExpanded, setDetailExpanded] = useState<boolean>(false);
  const [renderedDetail, setRenderedDetail] = useState<NonNullable<DetailPage> | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const scrollRef        = useRef<HTMLDivElement>(null);
  const pendingSection   = useRef<SectionName | null>(null);
  const animFrameRef     = useRef<number | null>(null);
  const exitTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioning  = useRef<boolean>(false);

  // ── CSS animation duration (must match Layer2Stage.module.css) ─────────────
  const TRANSITION_DURATION_MS = 320;

  // ── Scroll to top helper ───────────────────────────────────────────────────
  const scrollToTop = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  // ── Core section transition logic ──────────────────────────────────────────
  const runTransition = useCallback(
    (from: SectionName, to: SectionName) => {
      const dir = getTransitionDir(from, to);

      const doSwap = () => {
        setPrevSection(from);
        setTransitionDir(dir);
        setPhase('exiting');

        exitTimerRef.current = setTimeout(() => {
          setRenderedSection(to);
          setPrevSection(null);
          setPhase('entering');
          scrollToTop();

          // Remove entering class after animation completes
          exitTimerRef.current = setTimeout(() => {
            setPhase('idle');
            setTransitionDir('none');
            isTransitioning.current = false;

            // If another section was queued while we were animating, run it now
            if (pendingSection.current && pendingSection.current !== to) {
              const next = pendingSection.current;
              pendingSection.current = null;
              runTransition(to, next);
            }
          }, TRANSITION_DURATION_MS);
        }, TRANSITION_DURATION_MS);
      };

      if (supportsViewTransitions) {
        document.startViewTransition(doSwap);
      } else {
        doSwap();
      }
    },
    [scrollToTop],
  );

  // ── React to activeSection changes ─────────────────────────────────────────
  useEffect(() => {
    if (activeSection === renderedSection) return;

    if (isTransitioning.current) {
      // Queue for after current transition
      pendingSection.current = activeSection;
      return;
    }

    isTransitioning.current = true;
    pendingSection.current  = null;
    runTransition(renderedSection, activeSection);
  }, [activeSection, renderedSection, runTransition]);

  // ── React to detailPage changes ────────────────────────────────────────────
  useEffect(() => {
    if (detailPage !== null) {
      // Opening a detail page
      setRenderedDetail(detailPage);
      setDetailVisible(true);

      animFrameRef.current = requestAnimationFrame(() => {
        animFrameRef.current = requestAnimationFrame(() => {
          setDetailExpanded(true);
        });
      });
    } else {
      // Closing a detail page
      setDetailExpanded(false);

      detailTimerRef.current = setTimeout(() => {
        setDetailVisible(false);
        setRenderedDetail(null);
      }, DETAIL_ZOOM_DURATION);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (detailTimerRef.current) clearTimeout(detailTimerRef.current);
    };
  }, [detailPage]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (detailTimerRef.current) clearTimeout(detailTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── Build CSS class names for content transitions ──────────────────────────
  const getIncomingClass = (): string => {
    if (phase !== 'entering') return '';
    if (transitionDir === 'left')  return styles.enterFromRight;
    if (transitionDir === 'right') return styles.enterFromLeft;
    return '';
  };

  const getOutgoingClass = (): string => {
    if (phase !== 'exiting' || prevSection === null) return '';
    if (transitionDir === 'left')  return styles.exitToLeft;
    if (transitionDir === 'right') return styles.exitToRight;
    return '';
  };

  // ── Render detail component ────────────────────────────────────────────────
  const renderDetail = (): JSX.Element | null => {
    if (!renderedDetail) return null;
    switch (renderedDetail.type) {
      case 'project': return <ProjectDetail />;
      case 'blog':    return <BlogDetail />;
      case 'lab':     return <LabDetail />;
      default:        return null;
    }
  };

  // ── Render current and outgoing section ───────────────────────────────────
  const CurrentSection = SECTION_COMPONENTS[renderedSection];
  const PrevSection    = prevSection ? SECTION_COMPONENTS[prevSection] : null;

  // ── Stage expansion class ──────────────────────────────────────────────────
  const stageClass = [
    styles.stage,
    detailExpanded ? styles.detailExpanded : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={stageClass} role="main">
      {/* Noise texture overlay */}
      <div className={styles.noiseOverlay} aria-hidden="true" />

      {/* ── Section content (hidden when detail is fully expanded) ── */}
      {!detailVisible && (
        <div className={styles.contentWrapper}>
          {/* Outgoing section (animating out) */}
          {PrevSection && phase === 'exiting' && (
            <div
              key={`prev-${prevSection}`}
              className={`${styles.contentSlot} ${getOutgoingClass()}`}
              aria-hidden="true"
            >
              <div
                ref={scrollRef}
                className={styles.scrollContainer}
                data-layer2-scroll=""
              >
                <Suspense fallback={<SectionFallback />}>
                  <PrevSection />
                </Suspense>
              </div>
            </div>
          )}

          {/* Incoming / current section */}
          <div
            key={`curr-${renderedSection}`}
            className={`${styles.contentSlot} ${getIncomingClass()}`}
          >
            <div
              ref={phase === 'exiting' ? undefined : scrollRef}
              className={styles.scrollContainer}
              data-layer2-scroll=""
            >
              <Suspense fallback={<SectionFallback />}>
                <CurrentSection />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail page overlay ── */}
      {detailVisible && (
        <div className={styles.detailContent}>
          <div
            className={styles.scrollContainer}
            data-layer2-scroll=""
          >
            <Suspense fallback={<SectionFallback />}>
              {renderDetail()}
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layer2Stage;