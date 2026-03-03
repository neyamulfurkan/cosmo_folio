// src/admin/sections/ExperienceAdmin.tsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Experience } from '../../types';

type ViewMode = 'list' | 'edit' | 'new';

type ExperienceFormState = {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  currentlyHere: boolean;
  description: string;
  techUsed: string;
  companyUrl: string;
  sortOrder: number;
};

const EMPTY_FORM: ExperienceFormState = {
  company: '',
  role: '',
  startDate: '',
  endDate: '',
  currentlyHere: false,
  description: '',
  techUsed: '',
  companyUrl: '',
  sortOrder: 0,
};

const experienceToForm = (exp: Experience): ExperienceFormState => ({
  company: exp.company,
  role: exp.role,
  startDate: exp.startDate ? exp.startDate.slice(0, 10) : '',
  endDate: exp.endDate ? exp.endDate.slice(0, 10) : '',
  currentlyHere: exp.endDate === null,
  description: exp.description,
  techUsed: exp.techUsed.join(', '),
  companyUrl: exp.companyUrl ?? '',
  sortOrder: exp.sortOrder,
});

const formToPayload = (
  form: ExperienceFormState,
): Omit<Experience, 'id'> => ({
  company: form.company.trim(),
  role: form.role.trim(),
  startDate: form.startDate,
  endDate: form.currentlyHere ? null : form.endDate || null,
  description: form.description.trim(),
  techUsed: form.techUsed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  companyUrl: form.companyUrl.trim() || null,
  sortOrder: Number(form.sortOrder),
});

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '32px', maxWidth: '860px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  heading: { fontSize: '22px', fontWeight: 700, color: '#111' },
  addBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  cardLeft: { flex: 1 },
  cardCompany: { fontWeight: 700, fontSize: '16px', color: '#111', marginBottom: '2px' },
  cardRole: { fontSize: '14px', color: '#374151', marginBottom: '4px' },
  cardDates: { fontSize: '12px', color: '#6b7280' },
  cardTech: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#4f46e5',
    fontFamily: 'monospace',
  },
  cardActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  editBtn: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  deleteBtn: {
    background: '#fff',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#ef4444',
    fontWeight: 500,
  },
  form: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '28px',
  },
  formTitle: { fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '24px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  grid1: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#111',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#fafafa',
  },
  textarea: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#111',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#fafafa',
    resize: 'vertical',
    minHeight: '120px',
    fontFamily: 'inherit',
  },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  checkboxLabel: { fontSize: '13px', color: '#374151', cursor: 'pointer' },
  formActions: { display: 'flex', gap: '12px', marginTop: '24px', alignItems: 'center' },
  saveBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
  },
  cancelBtn: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  savingBtn: {
    background: '#818cf8',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontWeight: 600,
    cursor: 'not-allowed',
    fontSize: '14px',
  },
  successMsg: { fontSize: '13px', color: '#16a34a', fontWeight: 500 },
  errorMsg: { fontSize: '13px', color: '#dc2626', fontWeight: 500 },
  emptyState: { textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: '15px' },
  hint: { fontSize: '12px', color: '#9ca3af', marginTop: '4px' },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    padding: '0',
    marginBottom: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  deleteConfirmOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  deleteConfirmBox: {
    background: '#fff',
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '380px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  deleteConfirmTitle: { fontWeight: 700, fontSize: '17px', marginBottom: '10px', color: '#111' },
  deleteConfirmText: { fontSize: '14px', color: '#6b7280', marginBottom: '20px' },
  deleteConfirmActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  deleteConfirmCancelBtn: {
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteConfirmDeleteBtn: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  loadingText: { color: '#9ca3af', fontSize: '14px', padding: '24px 0' },
};

const formatDateRange = (startDate: string, endDate: string | null): string => {
  const fmt = (d: string): string => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };
  return `${fmt(startDate)} — ${endDate ? fmt(endDate) : 'Present'}`;
};

const ExperienceAdmin = (): JSX.Element => {
  const { getToken } = useAuth();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<ExperienceFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchExperiences = useCallback(async (): Promise<void> => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/experience', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch experience (${res.status})`);
      const data: Experience[] = await res.json();
      setExperiences(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load experience entries.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void fetchExperiences();
  }, [fetchExperiences]);

  const openNew = (): void => {
    setForm({ ...EMPTY_FORM, sortOrder: experiences.length });
    setEditingId(null);
    setSaveSuccess(false);
    setSaveError(null);
    setViewMode('new');
  };

  const openEdit = (exp: Experience): void => {
    setForm(experienceToForm(exp));
    setEditingId(exp.id);
    setSaveSuccess(false);
    setSaveError(null);
    setViewMode('edit');
  };

  const cancelForm = (): void => {
    setViewMode('list');
    setEditingId(null);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const updateField = <K extends keyof ExperienceFormState>(
    key: K,
    value: ExperienceFormState[K],
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const validate = (): string | null => {
    if (!form.company.trim()) return 'Company name is required.';
    if (!form.role.trim()) return 'Role is required.';
    if (!form.startDate) return 'Start date is required.';
    if (!form.currentlyHere && !form.endDate) return 'End date is required (or check "Currently here").';
    if (
      !form.currentlyHere &&
      form.endDate &&
      form.startDate &&
      new Date(form.endDate) < new Date(form.startDate)
    ) {
      return 'End date cannot be before start date.';
    }
    if (!form.description.trim()) return 'Description is required.';
    return null;
  };

  const handleSave = async (): Promise<void> => {
    const validationError = validate();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const token = await getToken();
      const payload = formToPayload(form);

      const isEdit = viewMode === 'edit' && editingId !== null;
      const url = isEdit ? `/api/admin/experience` : `/api/admin/experience`;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? JSON.stringify({ id: editingId, ...payload }) : JSON.stringify(payload);

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `Save failed (${res.status})`);
      }

      setSaveSuccess(true);
      await fetchExperiences();

      setTimeout(() => {
        setViewMode('list');
        setEditingId(null);
        setSaveSuccess(false);
      }, 900);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string): void => {
    setDeleteTargetId(id);
  };

  const cancelDelete = (): void => {
    setDeleteTargetId(null);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/experience`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deleteTargetId }),
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setDeleteTargetId(null);
      if (editingId === deleteTargetId) {
        setViewMode('list');
        setEditingId(null);
      }
      await fetchExperiences();
    } catch (err) {
      console.error('Delete experience failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const sortedExperiences = [...experiences].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  if (viewMode === 'list') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Experience</h1>
          <button style={styles.addBtn} onClick={openNew}>
            + Add Entry
          </button>
        </div>

        {loading && <p style={styles.loadingText}>Loading experience entries…</p>}
        {fetchError && <p style={styles.errorMsg}>{fetchError}</p>}

        {!loading && !fetchError && sortedExperiences.length === 0 && (
          <div style={styles.emptyState}>
            No experience entries yet. Add your first role above.
          </div>
        )}

        {!loading && !fetchError && sortedExperiences.length > 0 && (
          <div style={styles.list}>
            {sortedExperiences.map((exp) => ( 
              <div key={exp.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <div style={styles.cardCompany}>
                    {exp.companyUrl ? ( <a
                      
                        href={exp.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#4f46e5', textDecoration: 'none' }}
                      >
                        {exp.company}
                      </a>
                    ) : (
                      exp.company
                    )}
                  </div>
                  <div style={styles.cardRole}>{exp.role}</div>
                  <div style={styles.cardDates}>
                    {formatDateRange(exp.startDate, exp.endDate)}
                  </div>
                  {exp.techUsed.length > 0 && (
                    <div style={styles.cardTech}>{exp.techUsed.join(' · ')}</div>
                  )}
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.editBtn} onClick={() => openEdit(exp)}>
                    Edit
                  </button>
                  <button style={styles.deleteBtn} onClick={() => confirmDelete(exp.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteTargetId !== null && (
          <div style={styles.deleteConfirmOverlay}>
            <div style={styles.deleteConfirmBox}>
              <div style={styles.deleteConfirmTitle}>Delete experience entry?</div>
              <div style={styles.deleteConfirmText}>
                This will permanently remove the entry from your portfolio. This action cannot be
                undone.
              </div>
              <div style={styles.deleteConfirmActions}>
                <button style={styles.deleteConfirmCancelBtn} onClick={cancelDelete} disabled={deleting}>
                  Cancel
                </button>
                <button
                  style={styles.deleteConfirmDeleteBtn}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={cancelForm}>
        ← Back to list
      </button>

      <div style={styles.form}>
        <div style={styles.formTitle}>
          {viewMode === 'new' ? 'Add Experience' : 'Edit Experience'}
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="exp-company">
              Company *
            </label>
            <input
              id="exp-company"
              style={styles.input}
              type="text"
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="exp-role">
              Role *
            </label>
            <input
              id="exp-role"
              style={styles.input}
              type="text"
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
              placeholder="Senior Engineer"
            />
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="exp-start">
              Start Date *
            </label>
            <input
              id="exp-start"
              style={styles.input}
              type="date"
              value={form.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="exp-end">
              End Date {form.currentlyHere ? '(disabled — currently here)' : '*'}
            </label>
            <input
              id="exp-end"
              style={{
                ...styles.input,
                opacity: form.currentlyHere ? 0.4 : 1,
                cursor: form.currentlyHere ? 'not-allowed' : 'auto',
              }}
              type="date"
              value={form.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
              disabled={form.currentlyHere}
            />
          </div>
        </div>

        <div style={styles.checkboxRow}>
          <input
            id="exp-current"
            type="checkbox"
            checked={form.currentlyHere}
            onChange={(e) => {
              updateField('currentlyHere', e.target.checked);
              if (e.target.checked) updateField('endDate', '');
            }}
          />
          <label htmlFor="exp-current" style={styles.checkboxLabel}>
            Currently here
          </label>
        </div>

        <div style={styles.grid1}>
          <label style={styles.label} htmlFor="exp-description">
            Description *
          </label>
          <textarea
            id="exp-description"
            style={styles.textarea}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="What you built, led, or achieved in this role…"
          />
        </div>

        <div style={styles.grid1}>
          <label style={styles.label} htmlFor="exp-tech">
            Technologies Used
          </label>
          <input
            id="exp-tech"
            style={styles.input}
            type="text"
            value={form.techUsed}
            onChange={(e) => updateField('techUsed', e.target.value)}
            placeholder="React, TypeScript, PostgreSQL"
          />
          <div style={styles.hint}>Comma-separated list of technologies</div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="exp-url">
              Company URL
            </label>
            <input
              id="exp-url"
              style={styles.input}
              type="url"
              value={form.companyUrl}
              onChange={(e) => updateField('companyUrl', e.target.value)}
              placeholder="https://company.com"
            />
          </div>
          <div>
            <label style={styles.label} htmlFor="exp-sort">
              Sort Order
            </label>
            <input
              id="exp-sort"
              style={styles.input}
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => updateField('sortOrder', parseInt(e.target.value, 10) || 0)}
            />
            <div style={styles.hint}>Lower numbers appear first in manual sorting</div>
          </div>
        </div>

        <div style={styles.formActions}>
          <button
            style={saving ? styles.savingBtn : styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : viewMode === 'new' ? 'Add Entry' : 'Save Changes'}
          </button>
          <button style={styles.cancelBtn} onClick={cancelForm} disabled={saving}>
            Cancel
          </button>
          {saveSuccess && <span style={styles.successMsg}>✓ Saved successfully</span>}
          {saveError && <span style={styles.errorMsg}>{saveError}</span>}
        </div>
      </div>

      {deleteTargetId !== null && (
        <div style={styles.deleteConfirmOverlay}>
          <div style={styles.deleteConfirmBox}>
            <div style={styles.deleteConfirmTitle}>Delete experience entry?</div>
            <div style={styles.deleteConfirmText}>
              This will permanently remove the entry from your portfolio. This action cannot be
              undone.
            </div>
            <div style={styles.deleteConfirmActions}>
              <button style={styles.deleteConfirmCancelBtn} onClick={cancelDelete} disabled={deleting}>
                Cancel
              </button>
              <button
                style={styles.deleteConfirmDeleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperienceAdmin;