// src/components/sections/About/About.tsx

import { useRef, useCallback } from 'react';
import { useShallowStore } from '@/store';
import styles from './About.module.css';

const About = (): JSX.Element => {
  const { identity } = useShallowStore((s) => ({ identity: s.identity }));
  const photoWrapperRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 3D tilt handlers ────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = photoWrapperRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * 8;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 8;

    el.style.transition = 'none';
    el.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = photoWrapperRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.4s ease';
    el.style.transform = 'perspective(400px) rotateX(0deg) rotateY(0deg)';

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      if (el) el.style.transition = '';
    }, 420);
  }, []);

  // ── Loading / empty state ───────────────────────────────────────────────
  if (!identity) {
    return (
      <div className={styles.aboutContainer}>
        <div className={styles.skeleton} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
      </div>
    );
  }

  const storyParagraphs = identity.aboutStory
    ? identity.aboutStory.split('\n').filter((p) => p.trim().length > 0)
    : [];

  return (
    <div className={styles.aboutContainer}>
      {/* ── Photo + intro ─────────────────────────────────────────────── */}
      <div className={styles.photoSection}>
        <div
          ref={photoWrapperRef}
          className={styles.photoWrapper}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {identity.aboutPhotoUrl ? (
            <img
              src={identity.aboutPhotoUrl}
              alt={identity.name}
              className={styles.photo}
              loading="lazy"
            />
          ) : (
            <div className={styles.photoPlaceholder}>
              <span className={styles.photoPlaceholderInitial}>
                {identity.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className={styles.introText}>
          <h2 className={styles.introName}>{identity.name}</h2>
          {identity.titleVariants.length > 0 && (
            <p className={styles.introTitle}>{identity.titleVariants[0]}</p>
          )}
          <p className={styles.introTagline}>{identity.tagline}</p>
        </div>
      </div>

      {/* ── Story ─────────────────────────────────────────────────────── */}
      {storyParagraphs.length > 0 && (
        <div className={styles.storySection}>
          {storyParagraphs.map((para, i) => (
            <p key={i} className={styles.storyText}>
              {para}
            </p>
          ))}
        </div>
      )}

      {/* ── Values ────────────────────────────────────────────────────── */}
      {identity.values.length > 0 && (
        <div className={styles.valuesSection}>
          <h3 className={styles.sectionHeading}>Values</h3>
          <div className={styles.valuesGrid}>
            {identity.values.map((v, i) => (
              <div key={i} className={styles.valueCard}>
                <span className={styles.valueIcon}>{v.icon}</span>
                <div className={styles.valueContent}>
                  <span className={styles.valueLabel}>{v.label}</span>
                  <span className={styles.valueDescription}>{v.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fun facts ─────────────────────────────────────────────────── */}
      {identity.funFacts.length > 0 && (
        <div className={styles.funFactsSection}>
          <h3 className={styles.sectionHeading}>Fun Facts</h3>
          <div className={styles.funFactsContainer}>
            {identity.funFacts.map((fact, i) => (
              <span
                key={i}
                className={styles.funFact}
                style={{
                  animationDelay: `${i * (12 / identity.funFacts.length)}s`,
                  animationDuration: `${12}s`,
                }}
              >
                {fact}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Resume download ───────────────────────────────────────────── */}
      {identity.resumeUrl && (
        <div className={styles.resumeSection}> <a 
          
            href={identity.resumeUrl}
            download
            target="_blank"
            rel="noreferrer"
            className={styles.resumeButton}
          >
            <span className={styles.resumeButtonIcon}>↓</span>
            Download Resume
            {identity.resumeUpdatedAt && (
              <span className={styles.resumeUpdated}>
                Updated {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(identity.resumeUpdatedAt))}
              </span>
            )}
          </a>
        </div>
      )}
    </div>
  );
};

export default About;