// src/admin/sections/AchievementsAdmin.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { Achievement } from '../../types';
import styles from './ProjectsAdmin.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type AchievementType = Achievement['type'];

type AchievementForm = {
  title: string;
  type: AchievementType;
  organization: string;
  date: string;
  description: string;
  url: string;
  sortOrder: number;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

type ViewMode = 'list' | 'edit' | 'new';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACHIEVEMENT_TYPES: { value: AchievementType; label: string; emoji: string }[] = [
  { value: 'award',       label: 'Award',            emoji: '🏆' },
  { value: 'win',         label: 'Competition Win',  emoji: '🥇' },
  { value: 'publication', label: 'Publication',      emoji: '📄' },
  { value: 'speaking',    label: 'Speaking',         emoji: '🎤' },
  { value: 'opensource',  label: 'Open Source',      emoji: '🔓' },
];

const typeEmoji = (t: AchievementType): string =>
  ACHIEVEMENT_TYPES.find((x) => x.value === t)?.emoji ?? '🏅';

const typeLabel = (t: AchievementType): string =>
  ACHIEVEMENT_TYPES.find((x) => x.value === t)?.label ?? t;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: AchievementForm = {
  title: '',
  type: 'award',
  organization: '',
  date: '',
  description: '',
  url: '',
  sortOrder: 0,
};

const achievementToForm = (a: Achievement): AchievementForm => ({
  title: a.title,
  type: a.type,
  organization: a.organization,
  date: a.date.slice(0, 10),
  description: a.description,
  url: a.url ?? '',
  sortOrder: a.sortOrder,
});

const formToPayload = (form: AchievementForm): Omit<Achievement, 'id'> => ({
  title: form.title.trim(),
  type: form.type,
  organization: form.organization.trim(),
  date: form.date,
  description: form.description.trim(),
  url: form.url.trim() || null,
  sortOrder: Number(form.sortOrder),
});

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
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

// ─── Achievement list row ─────────────────────────────────────────────────────

type AchievementRowProps = {
  achievement: Achievement;
  onEdit: () => void;
  onDelete: () => void;
};

const AchievementRow = ({ achievement, onEdit, onDelete }: AchievementRowProps): JSX.Element => (
  <div className={styles.projectRow}>
    <div className={styles.projectRowLeft}>
      <div className={styles.projectRowThumbPlaceholder}>
        {typeEmoji(achievement.type)}
      </div>
      <div className={styles.projectRowInfo}>
        <span className={styles.projectRowTitle}>{achievement.title}</span>
        <span className={styles.projectRowTagline}>{achievement.organization}</span>
        <div className={styles.projectRowMeta}>
          <span className={styles.sortOrderBadge}>
            {typeEmoji(achievement.type)} {typeLabel(achievement.type)}
          </span>
          <span className={styles.sortOrderBadge}>
            {formatDate(achievement.date)}
          </span>
          {achievement.url && ( <a
            
              href={achievement.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sortOrderBadge}
              style={{ textDecoration: 'none', color: 'inherit' }}
              onClick={(e) => e.stopPropagation()}
            >
              🔗 Link ↗
            </a>
          )}
        </div>
      </div>
    </div>
    <div className={styles.projectRowActions}>
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

const AchievementsAdmin = (): JSX.Element => {
  const { getToken } = useAuth();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AchievementForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [typeFilter, setTypeFilter] = useState<AchievementType | 'all'>('all');

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

  // ── Fetch all achievements ────────────────────────────────────────────────
  const fetchAchievements = useCallback(async (): Promise<void> => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/content?resource=achievements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Achievement[];
      // Sort by date descending, then sortOrder
      setAchievements(
        data.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.sortOrder - b.sortOrder;
        })
      );
    } catch (err) {
      console.error('[AchievementsAdmin] fetch error:', err);
      showToast({ type: 'error', message: 'Failed to load achievements.' });
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast]);

  useEffect(() => {
    void fetchAchievements();
  }, [fetchAchievements]);

  // ── Form field updater ────────────────────────────────────────────────────
  const set = <K extends keyof AchievementForm>(key: K, value: AchievementForm[K]): void =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Open edit form ────────────────────────────────────────────────────────
  const openEdit = (achievement: Achievement): void => {
    setForm(achievementToForm(achievement));
    setEditingId(achievement.id);
    setViewMode('edit');
  };

  // ── Open new form ─────────────────────────────────────────────────────────
  const openNew = (): void => {
    const maxOrder =
      achievements.length > 0
        ? Math.max(...achievements.map((a) => a.sortOrder))
        : -1;
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

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.organization.trim()) return 'Organization is required.';
    if (!form.date) return 'Date is required.';
    if (!form.description.trim()) return 'Description is required.';
    if (form.url.trim() && !/^https?:\/\/.+/.test(form.url.trim())) {
      return 'URL must start with http:// or https://';
    }
    return null;
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async (): Promise<void> => {
    const validationError = validate();
    if (validationError) {
      showToast({ type: 'error', message: validationError });
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = formToPayload(form);
      const isEditing = viewMode === 'edit' && editingId !== null;

      const url = isEditing
        ? `/api/admin/content?resource=achievements?id=${editingId}`
        : '/api/admin/content?resource=achievements';
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

      const saved = (await res.json()) as Achievement;

      setAchievements((prev) => {
        const next = isEditing
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [saved, ...prev];
        return next.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.sortOrder - b.sortOrder;
        });
      });

      showToast({
        type: 'success',
        message: isEditing ? 'Achievement updated.' : 'Achievement created.',
      });
      backToList();
    } catch (err) {
      console.error('[AchievementsAdmin] save error:', err);
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/content?resource=achievements?id=${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deletingId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAchievements((prev) => prev.filter((a) => a.id !== deletingId));
      showToast({ type: 'success', message: 'Achievement deleted.' });
    } catch (err) {
      console.error('[AchievementsAdmin] delete error:', err);
      showToast({ type: 'error', message: 'Failed to delete achievement.' });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered =
    typeFilter === 'all'
      ? achievements
      : achievements.filter((a) => a.type === typeFilter);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: List view
  // ─────────────────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className={styles.container}>
        <Toast toast={toast} onDismiss={() => setToast(null)} />

        {deletingId && (
          <ConfirmDialog
            message="Delete this achievement? This cannot be undone."
            onConfirm={() => void handleDeleteConfirm()}
            onCancel={() => setDeletingId(null)}
          />
        )}

        <div className={styles.listHeader}>
          <p className={styles.listCount}>
            {achievements.length} achievement{achievements.length !== 1 ? 's' : ''}
            {typeFilter !== 'all' && ` · filtered to ${typeLabel(typeFilter)}`}
          </p>
          <button className={styles.newBtn} onClick={openNew} type="button">
            + New Achievement
          </button>
        </div>

        {/* Type filter row */}
        <div className={styles.filterRow}>
          <button
            className={`${styles.filterTag} ${typeFilter === 'all' ? styles.filterTagActive : ''}`}
            onClick={() => setTypeFilter('all')}
            type="button"
          >
            All
          </button>
          {ACHIEVEMENT_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              className={`${styles.filterTag} ${typeFilter === value ? styles.filterTagActive : ''}`}
              onClick={() => setTypeFilter(value)}
              type="button"
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading achievements…</span>
          </div>
        )}

        {!loading && achievements.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🏆</span>
            <p>No achievements yet. Add your first one.</p>
          </div>
        )}

        {!loading && achievements.length > 0 && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔍</span>
            <p>No achievements match this filter.</p>
          </div>
        )}

        {!loading &&
          filtered.map((achievement) => (
            <AchievementRow
              key={achievement.id}
              achievement={achievement}
              onEdit={() => openEdit(achievement)}
              onDelete={() => setDeletingId(achievement.id)}
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
          ← Back to Achievements
        </button>
        <h2 className={styles.formTitle}>
          {viewMode === 'new'
            ? 'New Achievement'
            : `Editing: ${form.title || 'Untitled'}`}
        </h2>
      </div>

      {/* ── Core Details ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Details</h3>

        <Field label="Title" hint="The name of the award, recognition, or achievement">
          <input
            className={styles.input}
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Best Innovation Award"
          />
        </Field>

        <Field label="Type" hint="Category used for filtering on the Achievements section">
          <select
            className={styles.input}
            value={form.type}
            onChange={(e) => set('type', e.target.value as AchievementType)}
          >
            {ACHIEVEMENT_TYPES.map(({ value, label, emoji }) => (
              <option key={value} value={value}>
                {emoji} {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Organization" hint="Who gave or hosted this achievement">
          <input
            className={styles.input}
            type="text"
            value={form.organization}
            onChange={(e) => set('organization', e.target.value)}
            placeholder="e.g. TechCrunch Disrupt, IEEE, NeurIPS"
          />
        </Field>

        <Field label="Date" hint="When this achievement occurred">
          <input
            className={styles.input}
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </Field>
      </section>

      {/* ── Description ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Description</h3>

        <Field
          label="Description"
          hint="Shown on the achievement card — explain what it is and why it matters"
        >
          <textarea
            className={styles.textarea}
            rows={5}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="e.g. Awarded first place out of 240 teams for developing an AI-powered accessibility tool at the annual hackathon."
          />
        </Field>
      </section>

      {/* ── Optional Link ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Link</h3>

        <Field
          label="URL"
          hint="Optional — link to proof, article, certificate, or talk recording"
        >
          <input
            className={styles.input}
            type="url"
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://devpost.com/software/your-project"
          />
        </Field>
      </section>

      {/* ── Sort Order ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Ordering</h3>

        <Field
          label="Sort Order"
          hint="Used as a tiebreaker when achievements share the same date — lower appears first"
        >
          <input
            className={`${styles.input} ${styles.inputNarrow}`}
            type="number"
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value))}
            min={0}
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
            ? 'Create Achievement'
            : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default AchievementsAdmin;