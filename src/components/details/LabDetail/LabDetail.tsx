// src/components/details/LabDetail/LabDetail.tsx

import { useEffect } from 'react';
import { useShallowStore } from '@/store';
import type { LabItem } from '@/types';
import styles from './LabDetail.module.css';

const LabDetail = (): JSX.Element => {
  const { detailPage, labItems, closeDetail } = useShallowStore((s) => ({
    detailPage: s.detailPage,
    labItems: s.labItems,
    closeDetail: s.closeDetail,
  }));

  const item: LabItem | undefined =
    detailPage?.type === 'lab'
      ? labItems.find((l) => l.id === detailPage.id)
      : undefined;

  // Escape key closes detail
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeDetail]);

  if (!item) {
    return (
      <div className={styles.detailContainer}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>🔬</span>
          <p>Lab item not found.</p>
          <button className={styles.backBtn} onClick={closeDetail}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailContainer}>
      {/* Back button */}
      <button className={styles.backBtn} onClick={closeDetail}>
        ← Back
      </button>

      {/* Title */}
      <h1 className={styles.labTitle}>{item.title}</h1>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className={styles.tagPills}>
          {item.tags.map((tag) => (
            <span key={tag} className={styles.tagPill}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Demo embed */}
      {item.embedType === 'iframe' && item.embedSrc && (
        <div className={styles.demoContainer}>
          <iframe
            className={styles.demoIframe}
            src={item.embedSrc}
            title={item.title}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        </div>
      )}

      {item.embedType === 'component' && (
        <div className={styles.demoPlaceholder}>
          <span className={styles.demoPlaceholderIcon}>🧩</span>
          <p>Demo available via link below.</p>
        </div>
      )}

      {/* Description */}
      <p className={styles.description}>{item.description}</p>

      {/* Technical notes */}
      {item.technicalNotes && (
        <div className={styles.techNotes}>
          <h2 className={styles.techNotesTitle}>Technical Notes</h2>
          <pre className={styles.techNotesContent}>{item.technicalNotes}</pre>
        </div>
      )}

      {/* External links */}
      {(item.demoUrl || item.githubUrl) && (
        <div className={styles.linksRow}>
          {item.demoUrl && ( <a
            
              className={styles.linkBtn}
              href={item.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              🚀 View Demo
            </a>
          )}
          {item.githubUrl && (<a
            
              className={styles.linkBtn}
              href={item.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default LabDetail;