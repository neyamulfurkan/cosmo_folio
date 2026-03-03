// src/components/sections/Projects/Projects.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useShallowStore } from '@/store';
import { truncate } from '@/lib/utils';
import type { Project } from '@/types';
import styles from './Projects.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const extractAllTags = (projects: Project[]): string[] => {
  const tagSet = new Set<string>();
  for (const project of projects) {
    for (const tag of project.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
};

// ---------------------------------------------------------------------------
// ProjectCard — isolated so each card manages its own IntersectionObserver
// ---------------------------------------------------------------------------

type ProjectCardProps = {
  project: Project;
  onCardClick: (id: string) => void;
};

const ProjectCard = ({ project, onCardClick }: ProjectCardProps): JSX.Element => {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!project.coverVideoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (video.src !== project.coverVideoUrl!) {
              video.src = project.coverVideoUrl!;
            }
          } else {
            // Clear src when fully out of view to free resources
            video.src = '';
          }
        }
      },
      { rootMargin: '100px' }
    );

    if (cardRef.current) {
      observerRef.current.observe(cardRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [project.coverVideoUrl]);

  const handleClick = useCallback(() => {
    onCardClick(project.id);
  }, [project.id, onCardClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onCardClick(project.id);
      }
    },
    [project.id, onCardClick]
  );

  const hasMedia = Boolean(project.coverVideoUrl || project.coverImageUrl);

  return (
    <div
      ref={cardRef}
      className={styles.projectCard}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View project: ${project.title}`}
    >
      {/* ── Media area ─────────────────────────────────────────────────── */}
      {hasMedia && (
        <div className={styles.cardMedia}>
          {project.coverVideoUrl ? (
            <video
              ref={videoRef}
              className={styles.cardVideo}
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          ) : project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className={styles.cardImg}
              loading="lazy"
              decoding="async"
            />
          ) : null}

          {project.featured && (
            <span className={styles.featuredBadge} aria-label="Featured project">
              ★ Featured
            </span>
          )}
        </div>
      )}

      {/* ── No media + featured badge ───────────────────────────────────── */}
      {!hasMedia && project.featured && (
        <div className={styles.cardMediaPlaceholder}>
          <span className={styles.featuredBadge} aria-label="Featured project">
            ★ Featured
          </span>
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{project.title}</h3>
        <p className={styles.cardTagline}>
          {truncate(project.tagline, 100)}
        </p>

        {project.techStack.length > 0 && (
          <div className={styles.techTags} aria-label="Technologies used">
            {project.techStack.slice(0, 4).map((tech) => (
              <span key={tech.name} className={styles.techTag}>
                {tech.icon ? `${tech.icon} ` : ''}{tech.name}
              </span>
            ))}
            {project.techStack.length > 4 && (
              <span className={styles.techTag}>
                +{project.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        {project.tags.length > 0 && (
          <div className={styles.cardTags}>
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={styles.cardTag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Projects section
// ---------------------------------------------------------------------------

const Projects = (): JSX.Element => {
  const { projects, openDetail } = useShallowStore((s) => ({
    projects: s.projects,
    openDetail: s.openDetail,
  }));

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Derive published projects sorted by sortOrder
  const publishedProjects = projects
    .filter((p) => p.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const allTags = extractAllTags(publishedProjects);

  const filteredProjects = activeFilter
    ? publishedProjects.filter((p) => p.tags.includes(activeFilter))
    : publishedProjects;

  const handleCardClick = useCallback(
    (id: string) => {
      openDetail({ type: 'project', id });
    },
    [openDetail]
  );

  const handleFilterClick = useCallback((tag: string | null) => {
    setActiveFilter((prev) => (prev === tag ? null : tag));
  }, []);

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (publishedProjects.length === 0) {
    return (
      <div className={styles.projectsContainer}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🚀</span>
          <p className={styles.emptyTitle}>Projects coming soon</p>
          <p className={styles.emptySubtitle}>
            Check back shortly — work is being added.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.projectsContainer}>
      {/* ── Section header ──────────────────────────────────────────────── */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Projects</h2>
        <span className={styles.projectCount}>
          {filteredProjects.length}{' '}
          {filteredProjects.length === 1 ? 'project' : 'projects'}
        </span>
      </div>

      {/* ── Tag filters ─────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div className={styles.filterRow} role="group" aria-label="Filter projects by tag">
          <button
            className={`${styles.filterTag} ${activeFilter === null ? styles.filterTagActive : ''}`}
            onClick={() => handleFilterClick(null)}
            aria-pressed={activeFilter === null}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`${styles.filterTag} ${activeFilter === tag ? styles.filterTagActive : ''}`}
              onClick={() => handleFilterClick(tag)}
              aria-pressed={activeFilter === tag}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ── No results for active filter ────────────────────────────────── */}
      {filteredProjects.length === 0 && activeFilter && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔍</span>
          <p className={styles.emptyTitle}>No projects tagged "{activeFilter}"</p>
          <button
            className={styles.clearFilter}
            onClick={() => setActiveFilter(null)}
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── Project grid ────────────────────────────────────────────────── */}
      {filteredProjects.length > 0 && (
        <div className={styles.projectGrid} role="list">
          {filteredProjects.map((project) => (
            <div key={project.id} role="listitem">
              <ProjectCard project={project} onCardClick={handleCardClick} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;