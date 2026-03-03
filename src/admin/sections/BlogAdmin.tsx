// src/admin/sections/BlogAdmin.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { BlogPost } from '../../types';
import styles from './ProjectsAdmin.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlogForm = {
  slug: string;
  title: string;
  coverImageUrl: string;
  category: string;
  readingTimeMinutes: number;
  content: string;
  excerpt: string;
  published: boolean;
  tags: string; // comma-separated in form
  sortOrder: number;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

type ViewMode = 'list' | 'edit' | 'new';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const postToForm = (p: BlogPost): BlogForm => ({
  slug: p.slug,
  title: p.title,
  coverImageUrl: p.coverImageUrl ?? '',
  category: p.category,
  readingTimeMinutes: p.readingTimeMinutes,
  content: p.content,
  excerpt: p.excerpt,
  published: p.published,
  tags: p.tags.join(', '),
  sortOrder: p.sortOrder,
});

const EMPTY_FORM: BlogForm = {
  slug: '',
  title: '',
  coverImageUrl: '',
  category: '',
  readingTimeMinutes: 1,
  content: '',
  excerpt: '',
  published: false,
  tags: '',
  sortOrder: 0,
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/** Strip HTML tags, count words, divide by 200 wpm, round up. Minimum 1. */
const calcReadingTime = (html: string): number => {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(wordCount / 200));
};

const formToPayload = (form: BlogForm): Omit<BlogPost, 'id' | 'publishedAt'> => ({
  slug: form.slug.trim() || slugify(form.title),
  title: form.title.trim(),
  coverImageUrl: form.coverImageUrl.trim() || null,
  category: form.category.trim(),
  readingTimeMinutes: form.readingTimeMinutes,
  content: form.content,
  excerpt: form.excerpt.trim(),
  published: form.published,
  tags: form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  sortOrder: form.sortOrder,
});

// ─── Cloudinary widget ────────────────────────────────────────────────────────

declare global {
  interface Window {
    cloudinary?: {
      openUploadWidget: (
        options: Record<string, unknown>,
        callback: (
          error: unknown,
          result: { event: string; info: { secure_url: string } }
        ) => void
      ) => void;
    };
  }
}

const loadCloudinaryWidget = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.cloudinary) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.onload = () => setTimeout(resolve, 100);
    script.onerror = () => reject(new Error('Failed to load Cloudinary widget'));
    document.head.appendChild(script);
  });

const getSignedUploadOptions = async (
  folder: string,
  token: string
): Promise<Record<string, unknown>> => {
  const res = await fetch('/api/admin/upload-signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ folder }),
  });
  if (!res.ok) throw new Error('Failed to get upload signature');
  return res.json() as Promise<Record<string, unknown>>;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type FieldProps = { label: string; hint?: string; children: React.ReactNode };
const Field = ({ label, hint, children }: FieldProps): JSX.Element => (
  <div className={styles.field}>
    <label className={styles.fieldLabel}>{label}</label>
    {hint && <span className={styles.fieldHint}>{hint}</span>}
    {children}
  </div>
);

type ToastProps = { toast: ToastState; onDismiss: () => void };
const Toast = ({ toast, onDismiss }: ToastProps): JSX.Element | null => {
  if (!toast) return null;
  return (
    <div
      className={`${styles.toast} ${
        toast.type === 'error' ? styles.toastError : styles.toastSuccess
      }`}
    >
      <span>{toast.message}</span>
      <button className={styles.toastClose} onClick={onDismiss} type="button">
        ✕
      </button>
    </div>
  );
};

// ─── Confirm dialog ───────────────────────────────────────────────────────────

type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({ message, onConfirm, onCancel }: ConfirmDialogProps): JSX.Element => (
  <div className={styles.confirmOverlay}>
    <div className={styles.confirmBox}>
      <p className={styles.confirmMessage}>{message}</p>
      <div className={styles.confirmActions}>
        <button className={styles.confirmCancel} onClick={onCancel} type="button">
          Cancel
        </button>
        <button className={styles.confirmDelete} onClick={onConfirm} type="button">
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Blog post list row ───────────────────────────────────────────────────────

type PostRowProps = {
  post: BlogPost;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
};

const PostRow = ({ post, onEdit, onDelete, onTogglePublished }: PostRowProps): JSX.Element => (
  <div className={`${styles.projectRow} ${post.published ? '' : styles.projectRowDraft}`}>
    <div className={styles.projectRowLeft}>
      {post.coverImageUrl ? (
        <img src={post.coverImageUrl} alt="" className={styles.projectRowThumb} />
      ) : (
        <div className={styles.projectRowThumbPlaceholder}>✍️</div>
      )}
      <div className={styles.projectRowInfo}>
        <span className={styles.projectRowTitle}>{post.title}</span>
        <span className={styles.projectRowTagline}>{post.excerpt}</span>
        <div className={styles.projectRowMeta}>
          <span className={styles.sortOrderBadge}>{post.category}</span>
          <span className={styles.sortOrderBadge}>{post.readingTimeMinutes} min read</span>
          <span
            className={`${styles.statusBadge} ${
              post.published ? styles.statusPublished : styles.statusDraft
            }`}
          >
            {post.published ? 'Published' : 'Draft'}
          </span>
          {post.publishedAt && (
            <span className={styles.sortOrderBadge}>
              {new Date(post.publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className={styles.projectRowActions}>
      <button
        className={styles.actionBtn}
        onClick={onTogglePublished}
        type="button"
        title={post.published ? 'Unpublish' : 'Publish'}
      >
        {post.published ? '🔒 Unpublish' : '🚀 Publish'}
      </button>
      <button
        className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
        onClick={onEdit}
        type="button"
      >
        ✏️ Edit
      </button>
      <button
        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
        onClick={onDelete}
        type="button"
      >
        🗑
      </button>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const BlogAdmin = (): JSX.Element => {
  const { getToken } = useAuth();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Track all distinct categories for datalist autocomplete
  const allCategories = Array.from(new Set(posts.map((p) => p.category).filter(Boolean)));

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-dismiss toast ────────────────────────────────────────────────────
  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // ── Fetch all posts (including drafts) ────────────────────────────────────
  const fetchPosts = useCallback(async (): Promise<void> => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/blog?admin=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BlogPost[];
      // Sort: published by publishedAt desc, drafts by sortOrder
      setPosts(
        data.sort((a, b) => {
          if (a.published && b.published) {
            return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
          }
          if (a.published) return -1;
          if (b.published) return 1;
          return a.sortOrder - b.sortOrder;
        })
      );
    } catch (err) {
      console.error('[BlogAdmin] fetch error:', err);
      showToast({ type: 'error', message: 'Failed to load blog posts.' });
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  // ── Form field updater ────────────────────────────────────────────────────
  const set = <K extends keyof BlogForm>(key: K, value: BlogForm[K]): void =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Auto-slug from title ──────────────────────────────────────────────────
  const handleTitleChange = (title: string): void => {
    setForm((prev) => ({
      ...prev,
      title,
      slug:
        prev.slug === '' || prev.slug === slugify(prev.title)
          ? slugify(title)
          : prev.slug,
    }));
  };

  // ── Auto reading time from content ────────────────────────────────────────
  const handleContentChange = (content: string): void => {
    setForm((prev) => ({
      ...prev,
      content,
      readingTimeMinutes: calcReadingTime(content),
    }));
  };

  // ── Open edit form ────────────────────────────────────────────────────────
  const openEdit = (post: BlogPost): void => {
    setForm(postToForm(post));
    setEditingId(post.id);
    setViewMode('edit');
  };

  // ── Open new form ─────────────────────────────────────────────────────────
  const openNew = (): void => {
    const maxOrder =
      posts.length > 0 ? Math.max(...posts.map((p) => p.sortOrder)) : -1;
    setForm({ ...EMPTY_FORM, sortOrder: maxOrder + 1 });
    setEditingId(null);
    setViewMode('new');
  };

  // ── Back to list ──────────────────────────────────────────────────────────
  const backToList = (): void => {
    setViewMode('list');
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // ── Cloudinary cover upload ───────────────────────────────────────────────
  const handleCoverUpload = async (): Promise<void> => {
    setUploadingCover(true);
    try {
      const token = await getToken();
      await loadCloudinaryWidget();
      const sigData = await getSignedUploadOptions('blog', token ?? '');
      window.cloudinary!.openUploadWidget(
        {
          cloudName: sigData.cloudName,
          apiKey: sigData.apiKey,
          signature: sigData.signature,
          timestamp: sigData.timestamp,
          folder: sigData.folder,
          sources: ['local', 'url'],
          cropping: true,
          croppingAspectRatio: 2 / 1,
          maxFileSize: 8_000_000,
          resourceType: 'image',
        },
        (_error, result) => {
          setUploadingCover(false);
          if (result?.event === 'success') {
            set('coverImageUrl', result.info.secure_url);
            showToast({ type: 'success', message: 'Cover image uploaded.' });
          }
        }
      );
    } catch {
      setUploadingCover(false);
      showToast({ type: 'error', message: 'Failed to open upload widget.' });
    }
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async (): Promise<void> => {
    if (!form.title.trim()) {
      showToast({ type: 'error', message: 'Title is required.' });
      return;
    }
    if (!form.category.trim()) {
      showToast({ type: 'error', message: 'Category is required.' });
      return;
    }
    if (!form.excerpt.trim()) {
      showToast({ type: 'error', message: 'Excerpt is required.' });
      return;
    }
    if (!form.content.trim()) {
      showToast({ type: 'error', message: 'Content is required.' });
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = formToPayload(form);
      const isEditing = viewMode === 'edit' && editingId !== null;

      const url = isEditing
        ? `/api/admin/blog?id=${editingId}`
        : '/api/admin/blog';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          isEditing ? { id: editingId, ...payload } : payload
        ),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const saved = (await res.json()) as BlogPost;

      setPosts((prev) => {
        if (isEditing) {
          return prev
            .map((p) => (p.id === saved.id ? saved : p))
            .sort((a, b) => {
              if (a.published && b.published) {
                return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
              }
              if (a.published) return -1;
              if (b.published) return 1;
              return a.sortOrder - b.sortOrder;
            });
        }
        return [saved, ...prev];
      });

      showToast({
        type: 'success',
        message: isEditing ? 'Post updated.' : 'Post created.',
      });
      backToList();
    } catch (err) {
      console.error('[BlogAdmin] save error:', err);
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle published ──────────────────────────────────────────────────────
  const handleTogglePublished = async (post: BlogPost): Promise<void> => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/blog?id=${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: post.id, published: !post.published }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as BlogPost;
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast({
        type: 'success',
        message: updated.published ? 'Post published.' : 'Post unpublished.',
      });
    } catch (err) {
      console.error('[BlogAdmin] toggle error:', err);
      showToast({ type: 'error', message: 'Failed to update publish status.' });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/blog?id=${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deletingId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPosts((prev) => prev.filter((p) => p.id !== deletingId));
      showToast({ type: 'success', message: 'Post deleted.' });
    } catch (err) {
      console.error('[BlogAdmin] delete error:', err);
      showToast({ type: 'error', message: 'Failed to delete post.' });
    } finally {
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: List view
  // ─────────────────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className={styles.container}>
        <Toast toast={toast} onDismiss={() => setToast(null)} />

        {deletingId && (
          <ConfirmDialog
            message="Delete this post? This cannot be undone."
            onConfirm={() => void handleDeleteConfirm()}
            onCancel={() => setDeletingId(null)}
          />
        )}

        <div className={styles.listHeader}>
          <p className={styles.listCount}>
            {posts.length} post{posts.length !== 1 ? 's' : ''}
            {' · '}
            {posts.filter((p) => p.published).length} published
          </p>
          <button className={styles.newBtn} onClick={openNew} type="button">
            + New Post
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading posts…</span>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>✍️</span>
            <p>No posts yet. Write your first one.</p>
          </div>
        )}

        {!loading &&
          posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              onEdit={() => openEdit(post)}
              onDelete={() => setDeletingId(post.id)}
              onTogglePublished={() => void handleTogglePublished(post)}
            />
          ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Edit / New form
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Category datalist */}
      <datalist id="blog-categories">
        {allCategories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* Back nav */}
      <div className={styles.formNav}>
        <button className={styles.backBtn} onClick={backToList} type="button">
          ← Back to Posts
        </button>
        <h2 className={styles.formTitle}>
          {viewMode === 'new'
            ? 'New Post'
            : `Editing: ${form.title || 'Untitled'}`}
        </h2>
      </div>

      {/* ── Basic Info ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Info</h3>

        <Field label="Title" hint="Shown on the blog card and as the detail page heading">
          <input
            className={styles.input}
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Building a Living-World Portfolio"
          />
        </Field>

        <Field label="Slug" hint="URL-safe identifier — auto-generated from title">
          <input
            className={styles.input}
            type="text"
            value={form.slug}
            onChange={(e) => set('slug', slugify(e.target.value))}
            placeholder="e.g. building-a-living-world-portfolio"
          />
        </Field>

        <Field
          label="Category"
          hint="Used for the category filter on the Blog section"
        >
          <input
            className={styles.input}
            type="text"
            list="blog-categories"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            placeholder="e.g. Engineering, Design, Career"
          />
        </Field>

        <Field
          label="Excerpt"
          hint="Short preview shown on the blog card — 1–2 sentences"
        >
          <textarea
            className={styles.textarea}
            rows={3}
            value={form.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
            placeholder="A brief summary of what this post covers…"
          />
        </Field>

        <Field
          label="Tags"
          hint="Comma-separated — shown as pills on the card"
        >
          <input
            className={styles.input}
            type="text"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="React, CSS, Portfolio, Animation"
          />
        </Field>

        <div className={styles.checkRow}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
            />
            Published (visible to visitors)
          </label>
        </div>

        <div className={styles.inlineRow}>
          <Field label="Sort Order" hint="For drafts — lower appears first">
            <input
              className={`${styles.input} ${styles.inputNarrow}`}
              type="number"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              min={0}
            />
          </Field>

          <Field
            label="Reading Time (min)"
            hint="Auto-calculated from content — edit if needed"
          >
            <input
              className={`${styles.input} ${styles.inputNarrow}`}
              type="number"
              value={form.readingTimeMinutes}
              onChange={(e) =>
                set('readingTimeMinutes', Math.max(1, Number(e.target.value)))
              }
              min={1}
            />
          </Field>
        </div>
      </section>

      {/* ── Cover Image ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Cover Image</h3>

        <Field
          label="Cover Image"
          hint="Shown on the blog card and as the hero in the detail page (2:1 ratio recommended)"
        >
          <div className={styles.uploadRow}>
            {form.coverImageUrl && (
              <img
                src={form.coverImageUrl}
                alt="Cover preview"
                className={styles.coverPreview}
              />
            )}
            <div className={styles.uploadActions}>
              <button
                className={styles.uploadBtn}
                onClick={() => void handleCoverUpload()}
                disabled={uploadingCover}
                type="button"
              >
                {uploadingCover
                  ? 'Opening…'
                  : form.coverImageUrl
                  ? '🖼 Replace Image'
                  : '🖼 Upload Image'}
              </button>
              {form.coverImageUrl && (
                <button
                  className={styles.clearBtn}
                  onClick={() => set('coverImageUrl', '')}
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input
            className={`${styles.input} ${styles.inputSmall}`}
            type="text"
            value={form.coverImageUrl}
            onChange={(e) => set('coverImageUrl', e.target.value)}
            placeholder="Or paste a Cloudinary URL directly"
          />
        </Field>
      </section>

      {/* ── Content ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Content</h3>
        <p className={styles.sectionHint}>
          HTML is accepted and rendered directly in the blog detail page.
          Use{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
            &lt;h2&gt;
          </code>
          ,{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
            &lt;pre&gt;&lt;code&gt;
          </code>{' '}
          etc. Reading time is calculated automatically as you type.
        </p>

        <Field
          label={`Content · ${form.readingTimeMinutes} min read`}
          hint="Full post HTML — code blocks will be syntax-highlighted for visitors"
        >
          <textarea
            className={styles.textarea}
            rows={24}
            value={form.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="<p>Start writing your post here…</p>&#10;&#10;<h2>Section heading</h2>&#10;<p>Body text.</p>&#10;&#10;<pre><code class=&quot;language-ts&quot;>const hello = 'world';</code></pre>"
            spellCheck
          />
        </Field>
      </section>

      {/* ── Save Bar ── */}
      <div className={styles.saveBar}>
        <button
          className={styles.cancelBtn}
          onClick={backToList}
          type="button"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className={styles.saveBtn}
          onClick={() => void handleSave()}
          type="button"
          disabled={saving}
        >
          {saving
            ? 'Saving…'
            : viewMode === 'new'
            ? 'Create Post'
            : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default BlogAdmin;