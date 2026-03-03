import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';

// ─── Auth helper ──────────────────────────────────────────────────────────────

const verifyClerkToken = async (req: VercelRequest): Promise<boolean> => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  try {
    const { verifyToken } = await import('@clerk/backend');
    await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return true;
  } catch {
    return false;
  }
};

// ─── Row → camelCase mapper ───────────────────────────────────────────────────

const mapProject = (row: Record<string, unknown>) => ({
  id:            row.id,
  slug:          row.slug,
  title:         row.title,
  tagline:       row.tagline,
  coverImageUrl: row.cover_image_url,
  coverVideoUrl: row.cover_video_url,
  problemText:   row.problem_text,
  approachText:  row.approach_text,
  buildText:     row.build_text,
  resultText:    row.result_text,
  techStack:     row.tech_stack ?? [],
  liveUrl:       row.live_url,
  githubUrl:     row.github_url,
  tags:          row.tags ?? [],
  featured:      row.featured,
  sortOrder:     row.sort_order,
  published:     row.published,
  createdAt:     row.created_at,
  updatedAt:     row.updated_at,
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ── GET — public (published only) or admin (all) ────────────────────────
    if (req.method === 'GET') {
      const isAdmin = req.query['admin'] === 'true';

      if (isAdmin) {
        const authed = await verifyClerkToken(req);
        if (!authed) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await query(
          'SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC'
        );
        return res.status(200).json(result.rows.map(mapProject));
      }

      // Public — published only
      const result = await query(
        'SELECT * FROM projects WHERE published = true ORDER BY sort_order ASC, created_at DESC'
      );
      return res.status(200).json(result.rows.map(mapProject));
    }

    // ── POST — create new project (auth required) ───────────────────────────
    if (req.method === 'POST') {
      const authed = await verifyClerkToken(req);
      if (!authed) return res.status(401).json({ error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;

      if (!body.title || !body.slug) {
        return res.status(400).json({ error: 'title and slug are required' });
      }

      const result = await query(
        `INSERT INTO projects (
          slug, title, tagline, cover_image_url, cover_video_url,
          problem_text, approach_text, build_text, result_text,
          tech_stack, live_url, github_url, tags,
          featured, sort_order, published
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
        ) RETURNING *`,
        [
          body.slug,
          body.title,
          body.tagline        ?? '',
          body.coverImageUrl  ?? null,
          body.coverVideoUrl  ?? null,
          body.problemText    ?? null,
          body.approachText   ?? null,
          body.buildText      ?? null,
          body.resultText     ?? null,
          JSON.stringify(body.techStack ?? []),
          body.liveUrl        ?? null,
          body.githubUrl      ?? null,
          JSON.stringify(body.tags ?? []),
          body.featured       ?? false,
          body.sortOrder      ?? 0,
          body.published      ?? true,
        ]
      );

      return res.status(201).json(mapProject(result.rows[0]));
    }

    // ── PUT — update existing project (auth required) ───────────────────────
    if (req.method === 'PUT') {
      const authed = await verifyClerkToken(req);
      if (!authed) return res.status(401).json({ error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;

      if (!body.id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const result = await query(
        `UPDATE projects SET
          slug            = COALESCE($2, slug),
          title           = COALESCE($3, title),
          tagline         = COALESCE($4, tagline),
          cover_image_url = $5,
          cover_video_url = $6,
          problem_text    = $7,
          approach_text   = $8,
          build_text      = $9,
          result_text     = $10,
          tech_stack      = COALESCE($11, tech_stack),
          live_url        = $12,
          github_url      = $13,
          tags            = COALESCE($14, tags),
          featured        = COALESCE($15, featured),
          sort_order      = COALESCE($16, sort_order),
          published       = COALESCE($17, published),
          updated_at      = NOW()
        WHERE id = $1
        RETURNING *`,
        [
          body.id,
          body.slug          ?? null,
          body.title         ?? null,
          body.tagline       ?? null,
          body.coverImageUrl ?? null,
          body.coverVideoUrl ?? null,
          body.problemText   ?? null,
          body.approachText  ?? null,
          body.buildText     ?? null,
          body.resultText    ?? null,
          body.techStack     ? JSON.stringify(body.techStack) : null,
          body.liveUrl       ?? null,
          body.githubUrl     ?? null,
          body.tags          ? JSON.stringify(body.tags) : null,
          body.featured      ?? null,
          body.sortOrder     ?? null,
          body.published     ?? null,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.status(200).json(mapProject(result.rows[0]));
    }

    // ── DELETE — remove project (auth required) ─────────────────────────────
    if (req.method === 'DELETE') {
      const authed = await verifyClerkToken(req);
      if (!authed) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.query['id'] as string;
      if (!id) return res.status(400).json({ error: 'id query param required' });

      await query('DELETE FROM projects WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[api/admin/projects] error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}