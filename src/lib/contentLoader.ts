// src/lib/contentLoader.ts

import { useStore } from '@/store';
// individual types no longer needed — fetched via single aggregate endpoint
import type { ContentPayload } from '@/store';

// ---------------------------------------------------------------------------
// Individual fetch helpers — each returns a typed result or a safe fallback
// ---------------------------------------------------------------------------

const fetchAllContent = async (): Promise<ContentPayload> => {
  const res = await fetch('/api/admin/identity?full=true');
  if (!res.ok) throw new Error(`content fetch failed: ${res.status}`);
  const data = await res.json();
  return {
    identity: data.identity ?? null,
    projects: Array.isArray(data.projects) ? data.projects : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    experience: Array.isArray(data.experience) ? data.experience : [],
    education: Array.isArray(data.education) ? data.education : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
    blogPosts: Array.isArray(data.blogPosts) ? data.blogPosts : [],
    labItems: Array.isArray(data.labItems) ? data.labItems : [],
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
  };
};

// ---------------------------------------------------------------------------
// Safe fallback payload — returned on total failure
// ---------------------------------------------------------------------------
const emptyPayload = (): ContentPayload => ({
  identity: null,
  projects: [],
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  blogPosts: [],
  labItems: [],
  achievements: [],
});

// ---------------------------------------------------------------------------
// loadAllContent — called exactly once from App.tsx on mount
// ---------------------------------------------------------------------------
export const loadAllContent = async (): Promise<void> => {
  const { setAllContent, setContentLoaded } = useStore.getState();

  try {
    const payload = await fetchAllContent();
    setAllContent(payload);
  } catch (err) {
    console.error('[contentLoader] Failed to load portfolio content:', err);
    setAllContent(emptyPayload());
  } finally {
    setContentLoaded();
  }
};