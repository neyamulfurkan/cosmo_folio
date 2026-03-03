import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { query } from '../../src/lib/db';

async function verifyClerkToken(req: VercelRequest): Promise<boolean> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return false;
    const token = authHeader.slice(7);
    await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return true;
  } catch {
    return false;
  }
}

// ─── LAB ─────────────────────────────────────────────────────────────────────

const toLabItem = (row: Record<string, unknown>) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  technicalNotes: row.technical_notes ?? null,
  tags: row.tags ?? [],
  demoUrl: row.demo_url ?? null,
  githubUrl: row.github_url ?? null,
  embedType: row.embed_type ?? null,
  embedSrc: row.embed_src ?? null,
  published: row.published,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function handleLab(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    const isAdmin = req.query.admin === 'true';
    if (isAdmin) {
      const authed = await verifyClerkToken(req);
      if (!authed) { res.status(401).json({ error: 'Unauthorized' }); return; }
    }
    try {
      const sql = isAdmin
        ? 'SELECT * FROM lab_items ORDER BY created_at DESC'
        : 'SELECT * FROM lab_items WHERE published = true ORDER BY created_at DESC';
      const result = await query(sql);
      res.status(200).json(result.rows.map(toLabItem));
    } catch (err) {
      console.error('GET lab_items error:', err);
      res.status(500).json({ error: 'Failed to fetch lab items' });
    }
    return;
  }

  const authed = await verifyClerkToken(req);
  if (!authed) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (req.method === 'POST') {
    const { slug, title, description, technicalNotes, tags, demoUrl, githubUrl, embedType, embedSrc, published } = req.body as Record<string, unknown>;
    if (!slug || !title || !description) { res.status(400).json({ error: 'slug, title, and description are required' }); return; }
    try {
      const result = await query(
        `INSERT INTO lab_items (slug, title, description, technical_notes, tags, demo_url, github_url, embed_type, embed_src, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [slug, title, description, technicalNotes ?? null, JSON.stringify(tags ?? []), demoUrl ?? null, githubUrl ?? null, embedType ?? null, embedSrc ?? null, published ?? false]
      );
      res.status(201).json(toLabItem(result.rows[0]));
    } catch (err) {
      console.error('POST lab_items error:', err);
      res.status(500).json({ error: 'Failed to create lab item' });
    }
    return;
  }

  if (req.method === 'PUT') {
    const { id, slug, title, description, technicalNotes, tags, demoUrl, githubUrl, embedType, embedSrc, published } = req.body as Record<string, unknown>;
    if (!id || !slug || !title || !description) { res.status(400).json({ error: 'id, slug, title, and description are required' }); return; }
    try {
      const result = await query(
        `UPDATE lab_items SET slug=$1, title=$2, description=$3, technical_notes=$4, tags=$5, demo_url=$6, github_url=$7, embed_type=$8, embed_src=$9, published=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,
        [slug, title, description, technicalNotes ?? null, JSON.stringify(tags ?? []), demoUrl ?? null, githubUrl ?? null, embedType ?? null, embedSrc ?? null, published ?? false, id]
      );
      if (result.rowCount === 0) { res.status(404).json({ error: 'Lab item not found' }); return; }
      res.status(200).json(toLabItem(result.rows[0]));
    } catch (err) {
      console.error('PUT lab_items error:', err);
      res.status(500).json({ error: 'Failed to update lab item' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const { id } = req.body as Record<string, unknown>;
    if (!id) { res.status(400).json({ error: 'id is required' }); return; }
    try {
      const result = await query('DELETE FROM lab_items WHERE id=$1', [id]);
      if (result.rowCount === 0) { res.status(404).json({ error: 'Lab item not found' }); return; }
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('DELETE lab_items error:', err);
      res.status(500).json({ error: 'Failed to delete lab item' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

const VALID_TYPES = ['award', 'win', 'publication', 'speaking', 'opensource'] as const;
const isValidType = (v: unknown): v is (typeof VALID_TYPES)[number] =>
  typeof v === 'string' && (VALID_TYPES as readonly string[]).includes(v);

const toAchievement = (row: Record<string, unknown>) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  organization: row.organization,
  date: row.date,
  description: row.description,
  url: row.url ?? null,
  sortOrder: row.sort_order,
});

async function handleAchievements(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM achievements ORDER BY date DESC');
      res.status(200).json(result.rows.map(toAchievement));
    } catch (err) {
      console.error('GET achievements error:', err);
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
    return;
  }

  const authed = await verifyClerkToken(req);
  if (!authed) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (req.method === 'POST') {
    const { title, type, organization, date, description, url, sort_order } = req.body ?? {};
    if (!title || !type || !organization || !date || !description) { res.status(400).json({ error: 'title, type, organization, date, and description are required' }); return; }
    if (!isValidType(type)) { res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return; }
    try {
      const result = await query(
        `INSERT INTO achievements (title, type, organization, date, description, url, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [title, type, organization, date, description, url ?? null, sort_order ?? 0]
      );
      res.status(201).json(toAchievement(result.rows[0] as Record<string, unknown>));
    } catch (err) {
      console.error('POST achievements error:', err);
      res.status(500).json({ error: 'Failed to create achievement' });
    }
    return;
  }

  if (req.method === 'PUT') {
    const { id, title, type, organization, date, description, url, sort_order } = req.body ?? {};
    if (!id || !title || !type || !organization || !date || !description) { res.status(400).json({ error: 'id and all fields are required' }); return; }
    if (!isValidType(type)) { res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }); return; }
    try {
      const result = await query(
        `UPDATE achievements SET title=$1, type=$2, organization=$3, date=$4, description=$5, url=$6, sort_order=$7 WHERE id=$8 RETURNING *`,
        [title, type, organization, date, description, url ?? null, sort_order ?? 0, id]
      );
      if (result.rowCount === 0) { res.status(404).json({ error: 'Achievement not found' }); return; }
      res.status(200).json(toAchievement(result.rows[0] as Record<string, unknown>));
    } catch (err) {
      console.error('PUT achievements error:', err);
      res.status(500).json({ error: 'Failed to update achievement' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) { res.status(400).json({ error: 'id is required' }); return; }
    try {
      const result = await query('DELETE FROM achievements WHERE id=$1 RETURNING id', [id]);
      if (result.rowCount === 0) { res.status(404).json({ error: 'Achievement not found' }); return; }
      res.status(200).json({ success: true, id });
    } catch (err) {
      console.error('DELETE achievements error:', err);
      res.status(500).json({ error: 'Failed to delete achievement' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const resource = req.query.resource as string;
  if (resource === 'lab') return handleLab(req, res);
  if (resource === 'achievements') return handleAchievements(req, res);
  res.status(404).json({ error: 'Unknown resource. Use ?resource=lab or ?resource=achievements' });
}