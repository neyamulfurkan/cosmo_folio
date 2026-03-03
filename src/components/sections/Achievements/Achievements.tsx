// src/components/sections/Achievements/Achievements.tsx

import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { formatDate } from '@/lib/utils';
import type { Achievement } from '@/types';
import styles from './Achievements.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AchievementType = Achievement['type'] | 'all';

type FilterOption = {
  value: AchievementType;
  label: string;
  icon: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All', icon: '✦' },
  { value: 'award', label: 'Award', icon: '🏆' },
  { value: 'win', label: 'Win', icon: '🥇' },
  { value: 'publication', label: 'Publication', icon: '📄' },
  { value: 'speaking', label: 'Speaking', icon: '🎙️' },
  { value: 'opensource', label: 'Open Source', icon: '🌐' },
];

const TYPE_META: Record<Achievement['type'], { icon: string; label: string }> = {
  award: { icon: '🏆', label: 'Award' },
  win: { icon: '🥇', label: 'Win' },
  publication: { icon: '📄', label: 'Publication' },
  speaking: { icon: '🎙️', label: 'Speaking' },
  opensource: { icon: '🌐', label: 'Open Source' },
};

// ---------------------------------------------------------------------------
// AchievementCard sub-component
// ---------------------------------------------------------------------------
type AchievementCardProps = {
  achievement: Achievement;
};

const AchievementCard = ({ achievement }: AchievementCardProps): JSX.Element => {
  const meta = TYPE_META[achievement.type];

  return (
    <article className={styles.achievementCard}>
      {/* Type badge */}
      <div className={styles.typeBadge}>
        <span className={styles.typeBadgeIcon} aria-hidden="true">
          {meta.icon}
        </span>
        <span>{meta.label}</span>
      </div>

      {/* Content */}
      <h3 className={styles.cardTitle}>{achievement.title}</h3>
      <p className={styles.org}>{achievement.organization}</p>
      <time className={styles.date} dateTime={achievement.date}>
        {formatDate(achievement.date, 'short')}
      </time>
      <p className={styles.description}>{achievement.description}</p>

      {/* External link */}
      {achievement.url && ( <a
        
          href={achievement.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkBtn}
          onClick={(e) => e.stopPropagation()}
        >
          View ↗
        </a>
      )}

      {/* Particle spray spans — 8 directions, pure CSS animation on parent :hover */}
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={styles.particle}
          aria-hidden="true"
          data-index={i}
        />
      ))}
    </article>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Achievements = (): JSX.Element => {
  const achievements = useStore((s) => s.achievements);
  const contentLoaded = useStore((s) => s.contentLoaded);

  const [activeType, setActiveType] = useState<AchievementType>('all');

  // Sort by date descending
  const sorted = useMemo(
    () =>
      [...achievements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [achievements]
  );

  // Filter by active type
  const filtered = useMemo(
    () =>
      activeType === 'all'
        ? sorted
        : sorted.filter((a) => a.type === activeType),
    [sorted, activeType]
  );

  // Derive which filter options have at least one matching achievement
  const typesWithData = useMemo(
    () => new Set(achievements.map((a) => a.type)),
    [achievements]
  );

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (!contentLoaded) {
    return (
      <div className={styles.achievementsContainer}>
        <div className={styles.filterRow}>
          {FILTER_OPTIONS.map((opt) => (
            <div key={opt.value} className={`${styles.filterTag} ${styles.skeleton}`} />
          ))}
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.achievementCard} ${styles.skeletonCard}`}>
              <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              <div className={styles.skeletonLine} />
              <div className={`${styles.skeletonLine} ${styles.skeletonLineMid}`} />
              <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (achievements.length === 0) {
    return (
      <div className={styles.achievementsContainer}>
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon} aria-hidden="true">🏅</span>
          <p>No achievements yet — check back soon.</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.achievementsContainer}>
      {/* Filter row */}
      <div className={styles.filterRow} role="group" aria-label="Filter achievements by type">
        {FILTER_OPTIONS.map((opt) => {
          const isDisabled =
            opt.value !== 'all' && !typesWithData.has(opt.value as Achievement['type']);
          const isActive = activeType === opt.value;

          return (
            <button
              key={opt.value}
              className={`${styles.filterTag} ${isActive ? styles.filterTagActive : ''} ${
                isDisabled ? styles.filterTagDisabled : ''
              }`}
              onClick={() => !isDisabled && setActiveType(opt.value)}
              aria-pressed={isActive}
              disabled={isDisabled}
              type="button"
            >
              <span aria-hidden="true">{opt.icon}</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateIcon} aria-hidden="true">🔍</span>
          <p>No {activeType} entries found.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Achievements;