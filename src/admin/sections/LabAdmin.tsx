// src/admin/sections/LabAdmin.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import type { LabItem } from '../../types';
import styles from './ProjectsAdmin.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type LabForm = {
  slug: string;
  title: string;
  description: string;
  technicalNotes: string;
  tags: string; // comma-separated in form
  demoUrl: string;
  githubUrl: string;
  embedType: 'iframe' | 'component' | '';
  embedSrc: string;
  published: boolean;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

type ViewMode = 'list' | 'edit' | 'new';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const itemToForm = (item: LabItem): LabForm => ({
  slug: item.slug,
  title: item.title,
  description: item.description,
  technicalNotes: item.technicalNotes ?? '',
  tags: item.tags.join(', '),
  demoUrl: item.demoUrl ?? '',
  githubUrl: item.githubUrl ?? '',
  embedType: item.embedType ?? '',
  embedSrc: item.embedSrc ?? '',
  published: item.published,
});

const EMPTY_FORM: LabForm = {
  slug: '',
  title: '',
  description: '',
  technicalNotes: '',
  tags: '',
  demoUrl: '',
  githubUrl: '',
  embedType: '',
  embedSrc: '',
  published: false,
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const formToPayload = (
  form: LabForm
): Omit<LabItem, 'id'> => ({
  slug: form.slug.trim() || slugify(form.title),
  title: form.title.trim(),
  description: form.description.trim(),
  technicalNotes: form.technicalNotes.trim() || null,
  tags: form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  demoUrl: form.demoUrl.trim() || null,
  githubUrl: form.githubUrl.trim() || null,
  embedType: (form.embedType as LabItem['embedType']) || null,
  embedSrc: form.embedSrc.trim() || null,
  published: form.published,
});

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

type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element => (
  <div className={styles.confirmOverlay}>
    <div className={styles.confirmBox}>
      <p className={styles.confirmMessage}>{message}</p>
      <div className={styles.confirmActions}>
        <button
          className={styles.confirmCancel}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className={styles.confirmDelete}
          onClick={onConfirm}
          type="button"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Lab item list row ────────────────────────────────────────────────────────

type LabRowProps = {
  item: LabItem;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
};

const LabRow = ({
  item,
  onEdit,
  onDelete,
  onTogglePublished,
}: LabRowProps): JSX.Element => (
  <div
    className={`${styles.projectRow} ${
      item.published ? '' : styles.projectRowDraft
    }`}
  >
    <div className={styles.projectRowLeft}>
      <div className={styles.projectRowThumbPlaceholder}>🧪</div>
      <div className={styles.projectRowInfo}>
        <span className={styles.projectRowTitle}>{item.title}</span>
        <span className={styles.projectRowTagline}>{item.description}</span>
        <div className={styles.projectRowMeta}>
          {item.embedType && (
            <span className={styles.sortOrderBadge}>
              {item.embedType === 'iframe' ? '🔗 iframe' : '🧩 component'}
            </span>
          )}
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.sortOrderBadge}>
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className={styles.sortOrderBadge}>
              +{item.tags.length - 3}
            </span>
          )}
          <span
            className={`${styles.statusBadge} ${
              item.published
                ? styles.statusPublished
                : styles.statusDraft
            }`}
          >
            {item.published ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>
    </div>
    <div className={styles.projectRowActions}>
      <button
        className={styles.actionBtn}
        onClick={onTogglePublished}
        type="button"
        title={item.published ? 'Unpublish' : 'Publish'}
      >
        {item.published ? '🔒 Unpublish' : '🚀 Publish'}
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

const LabAdmin = (): JSX.Element => {
  const { getToken } = useAuth();

  const [items, setItems] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LabForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

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

  // ── Fetch all lab items (including unpublished) ───────────────────────────
  const fetchItems = useCallback(async (): Promise<void> => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/lab?admin=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LabItem[];
      // Published first, then drafts; both groups alphabetical by title
      setItems(
        data.sort((a, b) => {
          if (a.published !== b.published) return a.published ? -1 : 1;
          return a.title.localeCompare(b.title);
        })
      );
    } catch (err) {
      console.error('[LabAdmin] fetch error:', err);
      showToast({ type: 'error', message: 'Failed to load lab items.' });
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // ── Form field updater ────────────────────────────────────────────────────
  const set = <K extends keyof LabForm>(key: K, value: LabForm[K]): void =>
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

  // ── embedType change: clear embedSrc when clearing type ───────────────────
  const handleEmbedTypeChange = (val: LabForm['embedType']): void => {
    setForm((prev) => ({
      ...prev,
      embedType: val,
      embedSrc: val === '' ? '' : prev.embedSrc,
    }));
  };

  // ── Open edit form ────────────────────────────────────────────────────────
  const openEdit = (item: LabItem): void => {
    setForm(itemToForm(item));
    setEditingId(item.id);
    setViewMode('edit');
  };

  // ── Open new form ─────────────────────────────────────────────────────────
  const openNew = (): void => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setViewMode('new');
  };

  // ── Back to list ──────────────────────────────────────────────────────────
  const backToList = (): void => {
    setViewMode('list');
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async (): Promise<void> => {
    if (!form.title.trim()) {
      showToast({ type: 'error', message: 'Title is required.' });
      return;
    }
    if (!form.description.trim()) {
      showToast({ type: 'error', message: 'Description is required.' });
      return;
    }
    if (form.embedType === 'iframe' && !form.embedSrc.trim()) {
      showToast({
        type: 'error',
        message: 'Embed URL is required when embed type is iframe.',
      });
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = formToPayload(form);
      const isEditing = viewMode === 'edit' && editingId !== null;

      const url = isEditing
        ? `/api/admin/lab?id=${editingId}`
        : '/api/admin/lab';
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

      const saved = (await res.json()) as LabItem;

      setItems((prev) => {
        const next = isEditing
          ? prev.map((i) => (i.id === saved.id ? saved : i))
          : [saved, ...prev];
        return next.sort((a, b) => {
          if (a.published !== b.published) return a.published ? -1 : 1;
          return a.title.localeCompare(b.title);
        });
      });

      showToast({
        type: 'success',
        message: isEditing ? 'Lab item updated.' : 'Lab item created.',
      });
      backToList();
    } catch (err) {
      console.error('[LabAdmin] save error:', err);
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle published ──────────────────────────────────────────────────────
  const handleTogglePublished = async (item: LabItem): Promise<void> => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/lab?id=${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: item.id, published: !item.published }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as LabItem;
      setItems((prev) =>
        prev
          .map((i) => (i.id === updated.id ? updated : i))
          .sort((a, b) => {
            if (a.published !== b.published) return a.published ? -1 : 1;
            return a.title.localeCompare(b.title);
          })
      );
      showToast({
        type: 'success',
        message: updated.published
          ? 'Lab item published.'
          : 'Lab item unpublished.',
      });
    } catch (err) {
      console.error('[LabAdmin] toggle error:', err);
      showToast({
        type: 'error',
        message: 'Failed to update publish status.',
      });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/lab?id=${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deletingId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((i) => i.id !== deletingId));
      showToast({ type: 'success', message: 'Lab item deleted.' });
    } catch (err) {
      console.error('[LabAdmin] delete error:', err);
      showToast({ type: 'error', message: 'Failed to delete lab item.' });
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
            message="Delete this lab item? This cannot be undone."
            onConfirm={() => void handleDeleteConfirm()}
            onCancel={() => setDeletingId(null)}
          />
        )}

        <div className={styles.listHeader}>
          <p className={styles.listCount}>
            {items.length} item{items.length !== 1 ? 's' : ''}
            {' · '}
            {items.filter((i) => i.published).length} published
          </p>
          <button className={styles.newBtn} onClick={openNew} type="button">
            + New Lab Item
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading lab items…</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🧪</span>
            <p>No lab items yet. Add your first experiment.</p>
          </div>
        )}

        {!loading &&
          items.map((item) => (
            <LabRow
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeletingId(item.id)}
              onTogglePublished={() => void handleTogglePublished(item)}
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

      {/* Back nav */}
      <div className={styles.formNav}>
        <button className={styles.backBtn} onClick={backToList} type="button">
          ← Back to Lab
        </button>
        <h2 className={styles.formTitle}>
          {viewMode === 'new'
            ? 'New Lab Item'
            : `Editing: ${form.title || 'Untitled'}`}
        </h2>
      </div>

      {/* ── Basic Info ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Info</h3>

        <Field
          label="Title"
          hint="Shown on the lab card and as the detail page heading"
        >
          <input
            className={styles.input}
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Particle Physics Sandbox"
          />
        </Field>

        <Field
          label="Slug"
          hint="URL-safe identifier — auto-generated from title"
        >
          <input
            className={styles.input}
            type="text"
            value={form.slug}
            onChange={(e) => set('slug', slugify(e.target.value))}
            placeholder="e.g. particle-physics-sandbox"
          />
        </Field>

        <Field
          label="Description"
          hint="Shown on the lab card and at the top of the detail page"
        >
          <textarea
            className={styles.textarea}
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="A brief description of what this experiment does or explores…"
          />
        </Field>

        <Field
          label="Tags"
          hint="Comma-separated — used for filtering on the Lab section"
        >
          <input
            className={styles.input}
            type="text"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="Canvas, WebGL, Audio, Generative Art"
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
      </section>

      {/* ── Technical Notes ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Technical Notes</h3>
        <p className={styles.sectionHint}>
          Shown in a monospace block in the detail page. Describe implementation
          details, algorithms, or interesting discoveries.
        </p>

        <Field
          label="Technical Notes"
          hint="Optional — plain text, displayed in a pre block for visitors"
        >
          <textarea
            className={styles.textarea}
            rows={8}
            value={form.technicalNotes}
            onChange={(e) => set('technicalNotes', e.target.value)}
            placeholder={
              'Uses a custom Barnes-Hut tree for O(n log n) force calculations.\n' +
              'Particle count adapts to device performance via requestIdleCallback.\n' +
              'Color palettes are generated from HSL with golden ratio spacing.'
            }
            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </Field>
      </section>

      {/* ── Demo Embed ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Demo Embed</h3>
        <p className={styles.sectionHint}>
          Optionally embed a live demo in the detail page. Use{' '}
          <strong>iframe</strong> for any URL (sandboxed with{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
            allow-scripts allow-same-origin
          </code>
          ). The <strong>component</strong> option shows a link-only placeholder
          in this version.
        </p>

        <Field label="Embed Type" hint="Choose how the demo is embedded">
          <select
            className={styles.input}
            value={form.embedType}
            onChange={(e) =>
              handleEmbedTypeChange(e.target.value as LabForm['embedType'])
            }
          >
            <option value="">No embed — links only</option>
            <option value="iframe">iframe (sandboxed URL)</option>
            <option value="component">Component (shows link placeholder)</option>
          </select>
        </Field>

        {form.embedType === 'iframe' && (
          <Field
            label="Embed URL"
            hint="Full URL to load in the sandboxed iframe — must allow iframe embedding"
          >
            <input
              className={styles.input}
              type="url"
              value={form.embedSrc}
              onChange={(e) => set('embedSrc', e.target.value)}
              placeholder="https://your-demo.vercel.app"
            />
          </Field>
        )}

        {form.embedType === 'iframe' && form.embedSrc && (
          <div
            style={{
              marginTop: 8,
              fontSize: '0.8rem',
              color: '#888',
              background: '#f9f9f9',
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              padding: '8px 12px',
            }}
          >
            ℹ️ The iframe will be sandboxed with{' '}
            <code style={{ fontFamily: 'monospace' }}>
              allow-scripts allow-same-origin
            </code>
            . Navigation to parent frames is always blocked.
          </div>
        )}
      </section>

      {/* ── External Links ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>External Links</h3>

        <Field
          label="Demo URL"
          hint="Full standalone demo — shown as a button in the detail page"
        >
          <input
            className={styles.input}
            type="url"
            value={form.demoUrl}
            onChange={(e) => set('demoUrl', e.target.value)}
            placeholder="https://your-demo.vercel.app"
          />
        </Field>

        <Field
          label="GitHub URL"
          hint="Source code repository"
        >
          <input
            className={styles.input}
            type="url"
            value={form.githubUrl}
            onChange={(e) => set('githubUrl', e.target.value)}
            placeholder="https://github.com/username/repo"
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
            ? 'Create Lab Item'
            : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default LabAdmin;