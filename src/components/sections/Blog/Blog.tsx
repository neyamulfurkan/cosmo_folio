// src/components/sections/Blog/Blog.tsx

import { useState, useMemo } from 'react';
import { useShallowStore } from '@/store';
import { formatDate, truncate } from '@/lib/utils';
import type { BlogPost } from '@/types';
import styles from './Blog.module.css';

const EXCERPT_MAX_LENGTH = 120;

const Blog = (): JSX.Element => {
  const { blogPosts, openDetail } = useShallowStore((s) => ({
    blogPosts: s.blogPosts,
    openDetail: s.openDetail,
  }));

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter to published only, sort by publishedAt desc then sortOrder
  const publishedPosts = useMemo<BlogPost[]>(() => {
    return [...blogPosts]
      .filter((p) => p.published)
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return a.sortOrder - b.sortOrder;
      });
  }, [blogPosts]);

  // Unique categories from published posts, preserving first-seen order
  const categories = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const post of publishedPosts) {
      if (!seen.has(post.category)) {
        seen.add(post.category);
        result.push(post.category);
      }
    }
    return result;
  }, [publishedPosts]);

  const filteredPosts = useMemo<BlogPost[]>(() => {
    if (!activeCategory) return publishedPosts;
    return publishedPosts.filter((p) => p.category === activeCategory);
  }, [publishedPosts, activeCategory]);

  const handleCardClick = (post: BlogPost): void => {
    openDetail({ type: 'blog', id: post.id });
  };

  const handleCategoryClick = (category: string): void => {
    setActiveCategory((prev) => (prev === category ? null : category));
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (publishedPosts.length === 0) {
    return (
      <div className={styles.blogContainer}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>✍️</span>
          <p className={styles.emptyTitle}>No posts yet</p>
          <p className={styles.emptySubtitle}>Check back soon for new articles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.blogContainer}>
      {/* Category filter row */}
      {categories.length > 1 && (
        <div className={styles.filterRow} role="list" aria-label="Filter by category">
          <button
            role="listitem"
            className={`${styles.filterTag} ${!activeCategory ? styles.filterTagActive : ''}`}
            onClick={() => setActiveCategory(null)}
            aria-pressed={!activeCategory}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              role="listitem"
              className={`${styles.filterTag} ${activeCategory === cat ? styles.filterTagActive : ''}`}
              onClick={() => handleCategoryClick(cat)}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* No results for active filter */}
      {filteredPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔍</span>
          <p className={styles.emptyTitle}>No posts in this category</p>
          <p className={styles.emptySubtitle}>Try a different filter.</p>
        </div>
      ) : (
        <div className={styles.blogGrid}>
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className={styles.blogCard}
              onClick={() => handleCardClick(post)}
              role="button"
              tabIndex={0}
              aria-label={`Read: ${post.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(post);
                }
              }}
            >
              {/* Cover image */}
              {post.coverImageUrl ? (
                <div className={styles.coverWrapper}>
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className={styles.coverImg}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : (
                <div className={`${styles.coverWrapper} ${styles.coverPlaceholder}`}>
                  <span className={styles.coverPlaceholderIcon}>📝</span>
                </div>
              )}

              {/* Card body */}
              <div className={styles.cardBody}>
                <div className={styles.categoryTag}>{post.category}</div>

                <div className={styles.meta}>
                  <span>{post.readingTimeMinutes} min read</span>
                  {post.publishedAt && (
                    <>
                      <span className={styles.metaDot}>·</span>
                      <span>{formatDate(post.publishedAt, 'short')}</span>
                    </>
                  )}
                </div>

                <h3 className={styles.cardTitle}>{post.title}</h3>

                <p className={styles.excerpt}>
                  {truncate(post.excerpt, EXCERPT_MAX_LENGTH)}
                </p>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className={styles.tagRow}>
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className={styles.tagPill}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;