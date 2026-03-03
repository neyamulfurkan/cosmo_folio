// src/components/sections/Education/Education.tsx

import { useState } from 'react';
import { useShallowStore } from '@/store';
import { formatDate } from '@/lib/utils';
import type { Education as EducationType, Certification } from '@/types';
import styles from './Education.module.css';

const Education = (): JSX.Element => {
  const { education, certifications } = useShallowStore((s) => ({
    education: s.education,
    certifications: s.certifications,
  }));

  const sorted = [...education].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedCerts = [...certifications].sort((a, b) => a.sortOrder - b.sortOrder);

  const [expandedId, setExpandedId] = useState<string | null>(
    sorted.length > 0 ? sorted[0].id : null
  );

  const toggleEntry = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.educationContainer}>
      {/* ── Education Timeline ─────────────────────────────────────────── */}
      <h2 className={styles.sectionTitle}>Education</h2>

      {sorted.length === 0 ? (
        <div className={styles.emptyState}>No education entries yet.</div>
      ) : (
        <div className={styles.timeline}>
          <div className={styles.timelineLine} />
          {sorted.map((entry: EducationType) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} className={styles.entry}>
                <div className={styles.timelineNode} onClick={() => toggleEntry(entry.id)} />
                <div className={styles.entryHeader} onClick={() => toggleEntry(entry.id)}>
                  <div className={styles.institution}>{entry.institution}</div>
                  <div className={styles.degree}>
                    {entry.degree} in {entry.field}
                  </div>
                  <div className={styles.dates}>
                    {formatDate(entry.startDate, 'short')} –{' '}
                    {formatDate(entry.endDate, 'short')}
                  </div>
                  <span
                    className={`${styles.expandHint} ${isExpanded ? styles.expandHintOpen : ''}`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </div>
                <div
                  className={`${styles.entryBody} ${isExpanded ? styles.entryBodyExpanded : ''}`}
                >
                  {entry.description && (
                    <p className={styles.description}>{entry.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Certifications ─────────────────────────────────────────────── */}
      {sortedCerts.length > 0 && (
        <>
          <h2 className={`${styles.sectionTitle} ${styles.certsTitle}`}>Certifications</h2>
          <div className={styles.certsGrid}>
            {sortedCerts.map((cert: Certification) => (
              <div key={cert.id} className={styles.certCard}>
                {cert.badgeUrl && (
                  <img
                    src={cert.badgeUrl}
                    alt={`${cert.name} badge`}
                    className={styles.certBadge}
                    loading="lazy"
                  />
                )}
                <div className={styles.certName}>{cert.name}</div>
                <div className={styles.certIssuer}>{cert.issuer}</div>
                <div className={styles.certDate}>{formatDate(cert.issuedDate, 'short')}</div>
                {cert.verifyUrl && ( <a
                  
                    href={cert.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.verifyLink}
                  >
                    Verify ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {sorted.length === 0 && sortedCerts.length === 0 && (
        <div className={styles.emptyState}>No education or certifications added yet.</div>
      )}
    </div>
  );
};

export default Education;