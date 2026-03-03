// src/admin/sections/SkillsAdmin.tsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { Skill } from '../../types';

type SkillFormData = {
  name: string;
  category: string;
  years: number;
  proficiency: number;
  icon: string;
  sortOrder: number;
};

type ViewMode = 'list' | 'edit' | 'new';

type Toast = { message: string; type: 'success' | 'error' } | null;

const EMPTY_FORM: SkillFormData = {
  name: '',
  category: '',
  years: 1,
  proficiency: 5,
  icon: '',
  sortOrder: 0,
};

const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Beginner',
  3: 'Elementary',
  4: 'Elementary',
  5: 'Intermediate',
  6: 'Intermediate',
  7: 'Advanced',
  8: 'Advanced',
  9: 'Expert',
  10: 'Expert',
};

const s: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, sans-serif',
    color: '#1a1a1a',
    maxWidth: 900,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  primaryBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  dangerBtn: {
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  smallBtn: {
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 13,
    cursor: 'pointer',
    color: '#374151',
  },
  smallDangerBtn: {
    background: 'transparent',
    border: '1px solid #fca5a5',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 13,
    cursor: 'pointer',
    color: '#dc2626',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: 14,
    verticalAlign: 'middle' as const,
  },
  trHover: {
    background: '#f9fafb',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a1a1a',
    background: '#fff',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a1a1a',
    background: '#fff',
    boxSizing: 'border-box' as const,
    outline: 'none',
    cursor: 'pointer',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottom: '1px solid #e5e7eb',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  stickyBar: {
    position: 'sticky' as const,
    bottom: 0,
    background: '#fff',
    borderTop: '1px solid #e5e7eb',
    padding: '16px 0',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  profBar: {
    height: 6,
    background: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden' as const,
    width: 80,
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  categoryGroup: {
    marginBottom: 8,
  },
  categoryHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '10px 12px 6px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  rangeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    accentColor: '#4f46e5',
  },
  rangeValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#4f46e5',
    minWidth: 32,
    textAlign: 'center' as const,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#9ca3af',
  },
  confirmOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBox: {
    background: '#fff',
    borderRadius: 14,
    padding: 28,
    maxWidth: 400,
    width: '90%',
    boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  confirmBtns: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  filterRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a1a1a',
    background: '#fff',
    outline: 'none',
    width: 220,
  },
  iconPreview: {
    fontSize: 22,
    minWidth: 28,
    textAlign: 'center' as const,
  },
};

const toastStyle = (type: 'success' | 'error'): React.CSSProperties => ({
  position: 'fixed',
  bottom: 24,
  right: 24,
  background: type === 'success' ? '#dcfce7' : '#fee2e2',
  color: type === 'success' ? '#166534' : '#991b1b',
  border: `1px solid ${type === 'success' ? '#86efac' : '#fca5a5'}`,
  borderRadius: 10,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 500,
  zIndex: 9999,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
});

const profFill = (pct: number): React.CSSProperties => ({
  height: '100%',
  width: `${pct}%`,
  background: '#4f46e5',
  borderRadius: 3,
});

const slugifyCategory = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function SkillsAdmin(): JSX.Element {
  const { getToken } = useAuth();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState<SkillFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/skills', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch skills');
      const data = await res.json();
      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load skills', 'error');
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const openNew = (): void => {
    const nextSort = skills.length > 0 ? Math.max(...skills.map((s) => s.sortOrder)) + 1 : 0;
    setFormData({ ...EMPTY_FORM, sortOrder: nextSort });
    setSelectedSkill(null);
    setViewMode('new');
  };

  const openEdit = (skill: Skill): void => {
    setSelectedSkill(skill);
    setFormData({
      name: skill.name,
      category: skill.category,
      years: skill.years,
      proficiency: skill.proficiency,
      icon: skill.icon ?? '',
      sortOrder: skill.sortOrder,
    });
    setViewMode('edit');
  };

  const cancelEdit = (): void => {
    setSelectedSkill(null);
    setFormData(EMPTY_FORM);
    setViewMode('list');
  };

  const updateField = <K extends keyof SkillFormData>(key: K, value: SkillFormData[K]): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Skill name is required.';
    if (!formData.category.trim()) return 'Category is required.';
    if (formData.years < 0 || formData.years > 50) return 'Years must be between 0 and 50.';
    if (formData.proficiency < 1 || formData.proficiency > 10)
      return 'Proficiency must be between 1 and 10.';
    return null;
  };

  const handleSave = async (): Promise<void> => {
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        years: formData.years,
        proficiency: formData.proficiency,
        icon: formData.icon.trim() || null,
        sortOrder: formData.sortOrder,
      };

      const isNew = viewMode === 'new';
      const url = isNew ? '/api/admin/skills' : `/api/admin/skills`;
      const method = isNew ? 'POST' : 'PUT';
      const body = isNew ? payload : { ...payload, id: selectedSkill?.id };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Save failed');
      }

      showToast(isNew ? 'Skill created.' : 'Skill updated.', 'success');
      await fetchSkills();
      cancelEdit();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedSkill) return;
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/skills', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: selectedSkill.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Delete failed');
      }

      showToast('Skill deleted.', 'success');
      await fetchSkills();
      cancelEdit();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleInlineEdit = async (skill: Skill, patch: Partial<Skill>): Promise<void> => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/skills', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...skill, ...patch }),
      });
      if (!res.ok) throw new Error('Update failed');
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, ...patch } : s))
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update skill', 'error');
    }
  };

  const uniqueCategories = Array.from(new Set(skills.map((s) => s.category))).sort();

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      !searchQuery ||
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || skill.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedSkills = filteredSkills.reduce<Record<string, Skill[]>>((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  Object.values(groupedSkills).forEach((group) =>
    group.sort((a, b) => a.sortOrder - b.sortOrder)
  );

  const sortedCategories = Object.keys(groupedSkills).sort();

  if (loading) {
    return (
      <div style={s.container}>
        <div style={{ ...s.emptyState, paddingTop: 80 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Loading skills…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <>
          <div style={s.header}>
            <div>
              <h1 style={s.title}>Skills</h1>
              <p style={s.subtitle}>
                {skills.length} skill{skills.length !== 1 ? 's' : ''} across{' '}
                {uniqueCategories.length} categor{uniqueCategories.length !== 1 ? 'ies' : 'y'}
              </p>
            </div>
            <button style={s.primaryBtn} onClick={openNew}>
              + Add Skill
            </button>
          </div>

          <div style={s.filterRow}>
            <input
              style={s.filterInput}
              type="text"
              placeholder="Search skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              style={{ ...s.select, width: 180 }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {(searchQuery || filterCategory) && (
              <button
                style={s.secondaryBtn}
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('');
                }}
              >
                Clear
              </button>
            )}
          </div>

          {filteredSkills.length === 0 ? (
            <div style={s.card}>
              <div style={s.emptyState}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {skills.length === 0 ? 'No skills yet' : 'No results'}
                </div>
                <div style={{ fontSize: 13 }}>
                  {skills.length === 0
                    ? 'Add your first skill to get started.'
                    : 'Try adjusting your search or filter.'}
                </div>
                {skills.length === 0 && (
                  <button style={{ ...s.primaryBtn, marginTop: 18 }} onClick={openNew}>
                    + Add Skill
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={s.card}>
              {sortedCategories.map((category) => (
                <div key={category} style={s.categoryGroup}>
                  <div style={s.categoryHeader}>{category}</div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Skill</th>
                        <th style={s.th}>Years</th>
                        <th style={s.th}>Proficiency</th>
                        <th style={s.th} />
                      </tr>
                    </thead>
                    <tbody>
                      {groupedSkills[category].map((skill) => (
                        <tr
                          key={skill.id}
                          style={hoveredRow === skill.id ? s.trHover : {}}
                          onMouseEnter={() => setHoveredRow(skill.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td style={s.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {skill.icon && (
                                <span style={s.iconPreview}>{skill.icon}</span>
                              )}
                              <span style={{ fontWeight: 500 }}>{skill.name}</span>
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={{ color: '#6b7280' }}>
                              {skill.years} yr{skill.years !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td style={s.td}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <div style={s.profBar}>
                                <div style={profFill(skill.proficiency * 10)} />
                              </div>
                              <span style={{ fontSize: 13, color: '#6b7280' }}>
                                {skill.proficiency}/10
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: '#9ca3af',
                                  display: hoveredRow === skill.id ? 'inline' : 'none',
                                }}
                              >
                                {PROFICIENCY_LABELS[skill.proficiency]}
                              </span>
                            </div>
                          </td>
                          <td style={{ ...s.td, textAlign: 'right' }}>
                            <button
                              style={s.smallBtn}
                              onClick={() => openEdit(skill)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── EDIT / NEW VIEW ── */}
      {(viewMode === 'edit' || viewMode === 'new') && (
        <>
          <div style={s.header}>
            <div>
              <h1 style={s.title}>
                {viewMode === 'new' ? 'New Skill' : `Edit — ${selectedSkill?.name}`}
              </h1>
              <p style={s.subtitle}>
                {viewMode === 'new' ? 'Add a skill to your constellation.' : 'Update skill details.'}
              </p>
            </div>
            <button style={s.secondaryBtn} onClick={cancelEdit}>
              ← Back to Skills
            </button>
          </div>

          <div style={s.card}>
            {/* Basic info */}
            <div style={s.formSection}>
              <div style={s.formSectionTitle}>Basic Info</div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>
                    Skill Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="e.g. TypeScript"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div>
                  <label style={s.label}>
                    Category <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    style={s.input}
                    type="text"
                    list="category-suggestions"
                    placeholder="e.g. Frontend, Backend, Design"
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                  />
                  <datalist id="category-suggestions">
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <p style={s.hint}>Choose an existing category or create a new one.</p>
                </div>
              </div>
            </div>

            {/* Icon */}
            <div style={s.formSection}>
              <div style={s.formSectionTitle}>Icon</div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Icon (emoji)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      style={{ ...s.input, flex: 1 }}
                      type="text"
                      placeholder="e.g. 🦕 or TS"
                      value={formData.icon}
                      onChange={(e) => updateField('icon', e.target.value)}
                      maxLength={8}
                    />
                    {formData.icon && (
                      <span
                        style={{
                          fontSize: 28,
                          minWidth: 40,
                          textAlign: 'center',
                          background: '#f3f4f6',
                          borderRadius: 8,
                          padding: '4px 8px',
                        }}
                      >
                        {formData.icon}
                      </span>
                    )}
                  </div>
                  <p style={s.hint}>
                    An emoji or short label shown in the skills constellation.
                  </p>
                </div>
              </div>
            </div>

            {/* Experience and proficiency */}
            <div style={s.formSection}>
              <div style={s.formSectionTitle}>Level</div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>
                    Years of Experience <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    style={s.input}
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={formData.years}
                    onChange={(e) =>
                      updateField('years', Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                  />
                </div>
                <div>
                  <label style={s.label}>
                    Proficiency (1–10) — {PROFICIENCY_LABELS[formData.proficiency]}
                  </label>
                  <div style={s.rangeWrapper}>
                    <input
                      style={s.rangeInput}
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={formData.proficiency}
                      onChange={(e) =>
                        updateField('proficiency', parseInt(e.target.value, 10))
                      }
                    />
                    <span style={s.rangeValue}>{formData.proficiency}</span>
                  </div>
                  <div
                    style={{
                      ...s.profBar,
                      width: '100%',
                      marginTop: 8,
                      height: 8,
                    }}
                  >
                    <div style={profFill(formData.proficiency * 10)} />
                  </div>
                  <p style={s.hint}>
                    Node size in the constellation scales with this value.
                  </p>
                </div>
              </div>
            </div>

            {/* Sort order */}
            <div style={s.formSection}>
              <div style={s.formSectionTitle}>Display Order</div>
              <div style={{ maxWidth: 200 }}>
                <label style={s.label}>Sort Order</label>
                <input
                  style={s.input}
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(e) =>
                    updateField('sortOrder', parseInt(e.target.value, 10) || 0)
                  }
                />
                <p style={s.hint}>Lower numbers appear first within their category.</p>
              </div>
            </div>
          </div>

          {/* Sticky save bar */}
          <div style={s.stickyBar}>
            <button style={s.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : viewMode === 'new' ? 'Create Skill' : 'Save Changes'}
            </button>
            <button style={s.secondaryBtn} onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            {viewMode === 'edit' && (
              <button
                style={{ ...s.dangerBtn, marginLeft: 'auto' }}
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
              >
                Delete Skill
              </button>
            )}
          </div>
        </>
      )}

      {/* ── CONFIRM DELETE DIALOG ── */}
      {confirmDelete && selectedSkill && (
        <div style={s.confirmOverlay} onClick={() => setConfirmDelete(false)}>
          <div style={s.confirmBox} onClick={(e) => e.stopPropagation()}>
            <div style={s.confirmTitle}>Delete "{selectedSkill.name}"?</div>
            <div style={s.confirmText}>
              This will permanently remove this skill from your constellation. This action cannot
              be undone.
            </div>
            <div style={s.confirmBtns}>
              <button style={s.secondaryBtn} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button
                style={{ ...s.dangerBtn, background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && <div style={toastStyle(toast.type)}>{toast.message}</div>}
    </div>
  );
}