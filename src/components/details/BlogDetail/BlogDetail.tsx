// src/components/details/BlogDetail/BlogDetail.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useShallowStore } from '@/store';
import { formatDate, truncate } from '@/lib/utils';
import type { BlogPost, Identity } from '@/types';
import styles from './BlogDetail.module.css';

const BlogDetail = (): JSX.Element => {
  const { detailPage, blogPosts, identity, closeDetail } = useShallowStore((s) => ({
    detailPage: s.detailPage,
    blogPosts: s.blogPosts,
    identity: s.identity,
    closeDetail: s.closeDetail,
  }));

  const [readingProgress, setReadingProgress] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const coverImgRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightApplied = useRef<boolean>(false);

  const post: BlogPost | undefined =
    detailPage?.type === 'blog'
      ? blogPosts.find((p) => p.id === detailPage.id)
      : undefined;

  // ── Escape key handler ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeDetail]);

  // ── Scroll handler: reading progress + cover parallax ────────────────────
  const handleScroll = useCallback((): void => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight - clientHeight;
    if (scrollable > 0) {
      setReadingProgress((scrollTop / scrollable) * 100);
    }

    if (coverImgRef.current) {
      coverImgRef.current.style.transform = `translateY(${scrollTop * -0.3}px)`;
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll, post]);

  // ── Syntax highlighting ───────────────────────────────────────────────────
  useEffect(() => {
    if (!post || !contentRef.current || highlightApplied.current) return;

    const applyHighlighting = async (): Promise<void> => {
      try {
        const [hljs, _] = await Promise.all([
          import('highlight.js').then((m) => m.default),
          import('highlight.js/styles/github-dark.css' as string),
        ]);

        const codeBlocks = contentRef.current?.querySelectorAll('pre code');
        if (codeBlocks) {
          codeBlocks.forEach((block) => {
            hljs.highlightElement(block as HTMLElement);
          });
        }
        highlightApplied.current = true;
      } catch (err) {
        // highlight.js unavailable — content still readable
        console.error('BlogDetail: syntax highlighting failed', err);
      }
    };

    applyHighlighting();
  }, [post]);

  // Reset highlight flag when post changes
  useEffect(() => {
    highlightApplied.current = false;
  }, [post?.id]);

  // ── Guard: not found ──────────────────────────────────────────────────────
  if (!post) {
    return (
      <div className={styles.detailContainer}>
        <div className={styles.errorState}>
          <p>Post not found.</p>
          <button className={styles.backBtn} onClick={closeDetail}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Related articles ──────────────────────────────────────────────────────
  const related: BlogPost[] = blogPosts
    .filter((p) => p.published && p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Reading progress bar — fixed at top of viewport */}
      <div
        className={styles.progressBar}
        style={{ width: `${readingProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(readingProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      />

      <div className={styles.detailContainer} ref={containerRef}>
        {/* Back button */}
        <button className={styles.backBtn} onClick={closeDetail} aria-label="Back to blog">
          ← Back
        </button>

        {/* Cover image with parallax */}
        {post.coverImageUrl && (
          <div className={styles.coverWrapper}>
            <img
              ref={coverImgRef}
              src={post.coverImageUrl}
              alt={post.title}
              className={styles.coverImg}
            />
          </div>
        )}

        {/* Meta row */}
        <div className={styles.meta}>
          <span className={styles.categoryTag}>{post.category}</span>
          <span className={styles.metaDot}>·</span>
          <span>{post.readingTimeMinutes} min read</span>
          {post.publishedAt && (
            <>
              <span className={styles.metaDot}>·</span>
              <span>{formatDate(post.publishedAt, 'long')}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className={styles.postTitle}>{post.title}</h1>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className={styles.tagRow}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* HTML content */}
        <div
          ref={contentRef}
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* "You made it." */}
        <p className={styles.youMadeIt}>✦ you made it ✦</p>

        {/* Author card */}
        {identity && (
          <div className={styles.authorCard}>
            {identity.aboutPhotoUrl && (
              <img
                src={identity.aboutPhotoUrl}
                alt={identity.name}
                className={styles.authorPhoto}
              />
            )}
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>{identity.name}</div>
              <p className={styles.authorBio}>
                {truncate(identity.aboutStory, 200)}
              </p>
            </div>
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <div className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>More in {post.category}</h2>
            <div className={styles.relatedGrid}>
              {related.map((rp) => (
                <RelatedCard key={rp.id} post={rp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ── Related card sub-component ────────────────────────────────────────────
type RelatedCardProps = { post: BlogPost };

const RelatedCard = ({ post }: RelatedCardProps): JSX.Element => {
  const openDetail = useShallowStore((s) => s.openDetail);

  return (
    <button
      className={styles.relatedCard}
      onClick={() => openDetail({ type: 'blog', id: post.id })}
      aria-label={`Read ${post.title}`}
    >
      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className={styles.relatedCoverImg}
          loading="lazy"
        />
      )}
      <div className={styles.relatedCardBody}>
        <span className={styles.relatedCategory}>{post.category}</span>
        <p className={styles.relatedCardTitle}>{post.title}</p>
        <span className={styles.relatedMeta}>{post.readingTimeMinutes} min read</span>
      </div>
    </button>
  );
};

export default BlogDetail;