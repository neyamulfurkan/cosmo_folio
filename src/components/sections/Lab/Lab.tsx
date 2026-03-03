// src/components/sections/Lab/Lab.tsx

import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { truncate } from '@/lib/utils';
import type { LabItem } from '@/types';
import styles from './Lab.module.css';

// ─── Tag filter pill ──────────────────────────────────────────────────────────

type FilterTagProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

const FilterTag = ({ label, active, onClick }: FilterTagProps): JSX.Element => (
  <button
    className={`${styles.filterTag} ${active ? styles.filterTagActive : ''}`}
    onClick={onClick}
    aria-pressed={active}
    type="button"
  >
    {label}
  </button>
);

// ─── Lab card ─────────────────────────────────────────────────────────────────

type LabCardProps = {
  item: LabItem;
  onClick: () => void;
};

const LabCard = ({ item, onClick }: LabCardProps): JSX.Element => {
  const hasDemoUrl   = Boolean(item.demoUrl);
  const hasGithubUrl = Boolean(item.githubUrl);

  return (
    <article
      className={styles.labCard}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${item.title}`}
    >
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardDescription}>
          {truncate(item.description, 120)}
        </p>

        {/* Tag pills */}
        {item.tags.length > 0 && (
          <div className={styles.tagPills} aria-label="Tags">
            {item.tags.map((tag) => (
              <span key={tag} className={styles.tagPill}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Link indicators */}
        {(hasDemoUrl || hasGithubUrl) && (
          <div className={styles.linkIndicators} aria-hidden="true">
            {hasDemoUrl && (
              <span className={styles.linkIndicator} title="Live demo available">
                ↗ Demo
              </span>
            )}
            {hasGithubUrl && (
              <span className={styles.linkIndicator} title="Source code available">
                ⌥ Source
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ filtered }: { filtered: boolean }): JSX.Element => (
  <div className={styles.emptyState} role="status">
    <span className={styles.emptyStateIcon} aria-hidden="true">🧪</span>
    <p>{filtered ? 'No experiments match this tag.' : 'No experiments published yet.'}</p>
  </div>
);

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const SkeletonCard = (): JSX.Element => (
  <div className={styles.skeletonCard} aria-hidden="true">
    <div className={styles.skeletonLine} />
    <div className={styles.skeletonLineMid} />
    <div className={styles.skeletonLineShort} />
    <div className={styles.skeletonTags}>
      <div className={styles.skeletonTag} />
      <div className={styles.skeletonTag} />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const Lab = (): JSX.Element => {
  const labItems     = useStore((s) => s.labItems);
  const contentLoaded = useStore((s) => s.contentLoaded);
  const openDetail   = useStore((s) => s.openDetail);

  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Published items only, preserving store order (by id / insertion order)
  const publishedItems = useMemo<LabItem[]>(
    () => labItems.filter((item) => item.published),
    [labItems],
  );

  // Unique tags derived from published items, preserving first-occurrence order
  const allTags = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const tags: string[] = [];
    for (const item of publishedItems) {
      for (const tag of item.tags) {
        if (!seen.has(tag)) {
          seen.add(tag);
          tags.push(tag);
        }
      }
    }
    return tags;
  }, [publishedItems]);

  // Filtered items
  const visibleItems = useMemo<LabItem[]>(
    () =>
      activeTag
        ? publishedItems.filter((item) => item.tags.includes(activeTag))
        : publishedItems,
    [publishedItems, activeTag],
  );

  const handleTagClick = (tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  };

  const handleCardClick = (item: LabItem) => {
    openDetail({ type: 'lab', id: item.id });
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (!contentLoaded) {
    return (
      <section className={styles.labContainer} aria-label="Lab experiments">
        <div className={styles.labGrid} aria-busy="true">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.labContainer} aria-label="Lab experiments">
      {/* Tag filter row — only show if there are tags to filter by */}
      {allTags.length > 0 && (
        <div className={styles.filterRow} role="group" aria-label="Filter by tag">
          <FilterTag
            label="All"
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          />
          {allTags.map((tag) => (
            <FilterTag
              key={tag}
              label={tag}
              active={activeTag === tag}
              onClick={() => handleTagClick(tag)}
            />
          ))}
        </div>
      )}

      {/* Grid or empty state */}
      {visibleItems.length === 0 ? (
        <EmptyState filtered={activeTag !== null} />
      ) : (
        <div className={styles.labGrid}>
          {visibleItems.map((item) => (
            <LabCard
              key={item.id}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Lab;