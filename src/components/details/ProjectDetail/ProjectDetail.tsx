// src/components/details/ProjectDetail/ProjectDetail.tsx

import { useEffect, useCallback } from 'react';
import { useShallowStore } from '@/store';
import type { Project } from '@/types';
import styles from './ProjectDetail.module.css';

const ProjectDetail = (): JSX.Element => {
  const { detailPage, projects, closeDetail, openDetail } = useShallowStore((s) => ({
    detailPage: s.detailPage,
    projects: s.projects,
    closeDetail: s.closeDetail,
    openDetail: s.openDetail,
  }));

  const projectId = detailPage?.type === 'project' ? detailPage.id : null;
  const project: Project | undefined = projects.find((p) => p.id === projectId);

  // ── Siblings ──────────────────────────────────────────────────────────────
  const published = projects.filter((p) => p.published).sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = project ? published.findIndex((p) => p.id === project.id) : -1;
  const prevProject = currentIndex > 0 ? published[currentIndex - 1] : null;
  const nextProject = currentIndex >= 0 && currentIndex < published.length - 1 ? published[currentIndex + 1] : null;

  // ── Escape key ────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    },
    [closeDetail]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Error state ───────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className={styles.detailContainer}>
        <div className={styles.errorState}>
          <p>Project not found.</p>
          <button className={styles.actionBtn} onClick={closeDetail}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const sections: { label: string; content: string | null }[] = [
    { label: 'The Problem', content: project.problemText },
    { label: 'The Approach', content: project.approachText },
    { label: 'The Build', content: project.buildText },
    { label: 'The Result', content: project.resultText },
  ];

  return (
    <div className={styles.detailContainer}>
      {/* Title */}
      <h1 className={styles.projectTitle}>{project.title}</h1>

      {/* Hero media */}
      {(project.coverVideoUrl || project.coverImageUrl) && (
        <div className={styles.heroMedia}>
          {project.coverVideoUrl ? (
            <video
              className={styles.heroVideo}
              src={project.coverVideoUrl}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              className={styles.heroImg}
              src={project.coverImageUrl!}
              alt={project.title}
            />
          )}
        </div>
      )}

      {/* Floating action bar */}
      <div className={styles.floatingActions}>
        <button className={styles.actionBtn} onClick={closeDetail}>
          ← Back
        </button>
        {project.liveUrl && ( <a
          
            className={styles.actionBtn}
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Live Site ↗
          </a>
        )}
        {project.githubUrl && ( <a
          
            className={styles.actionBtn}
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        )}
      </div>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className={styles.tagRow}>
          {project.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Text sections */}
      {sections.map(({ label, content }) =>
        content ? (
          <div key={label} className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>{label}</h2>
            <p className={styles.sectionContent}>{content}</p>
          </div>
        ) : null
      )}

      {/* Tech stack */}
      {project.techStack.length > 0 && (
        <div className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>Tech Stack</h2>
          <div className={styles.techGrid}>
            {project.techStack.map((tech) => (
              <div
                key={tech.name}
                className={styles.techCard}
                title={tech.reason}
              >
                {tech.icon && <span className={styles.techIcon}>{tech.icon}</span>}
                <span className={styles.techName}>{tech.name}</span>
                {tech.reason && (
                  <span className={styles.techReason}>{tech.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation footer */}
      <div className={styles.navFooter}>
        {prevProject ? (
          <button
            className={styles.navBtn}
            onClick={() => openDetail({ type: 'project', id: prevProject.id })}
          >
            ← {prevProject.title}
          </button>
        ) : (
          <span />
        )}
        {nextProject ? (
          <button
            className={styles.navBtn}
            onClick={() => openDetail({ type: 'project', id: nextProject.id })}
          >
            {nextProject.title} →
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;