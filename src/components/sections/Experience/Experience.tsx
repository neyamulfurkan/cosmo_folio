// src/components/sections/Experience/Experience.tsx

import { useState } from 'react';
import { useStore } from '@/store';
import { formatDate } from '@/lib/utils';
import type { Experience as ExperienceType } from '@/types';
import styles from './Experience.module.css';

const Experience = (): JSX.Element => {
  const experience = useStore((s) => s.experience);

  const sorted = [...experience].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const [expandedId, setExpandedId] = useState<string | null>(
    sorted[0]?.id ?? null
  );

  const toggleEntry = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (sorted.length === 0) {
    return (
      <div className={styles.experienceContainer}>
        <p className={styles.emptyState}>No experience entries yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.experienceContainer}>
      <div className={styles.timeline}>
        <div className={styles.timelineLine} />

        {sorted.map((entry: ExperienceType) => {
          const isExpanded = expandedId === entry.id;
          const dateRange = `${formatDate(entry.startDate, 'short')} – ${formatDate(entry.endDate, 'short')}`;

          return (
            <div key={entry.id} className={styles.entry}>
              <div
                className={styles.timelineNode}
                aria-hidden="true"
                onClick={() => toggleEntry(entry.id)}
              />

              <div className={styles.entryInner}>
                <div
                  className={styles.entryHeader}
                  onClick={() => toggleEntry(entry.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleEntry(entry.id);
                    }
                  }}
                >
                  <div className={styles.headerTop}>
                    {entry.companyUrl ? ( <a 
                      
                        href={entry.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.company}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.company}
                      </a>
                    ) : (
                      <span className={styles.company}>{entry.company}</span>
                    )}
                    <span className={styles.expandIcon} aria-hidden="true">
                      {isExpanded ? '−' : '+'}
                    </span>
                  </div>
                  <div className={styles.role}>{entry.role}</div>
                  <div className={styles.dates}>{dateRange}</div>
                </div>

                <div
                  className={`${styles.entryBody} ${isExpanded ? styles.entryBodyExpanded : ''}`}
                  aria-hidden={!isExpanded}
                >
                  <p className={styles.description}>{entry.description}</p>

                  {entry.techUsed.length > 0 && (
                    <div className={styles.techRow}>
                      {entry.techUsed.map((tech) => (
                        <span key={tech} className={styles.techTag}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Experience;