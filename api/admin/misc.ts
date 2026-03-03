import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { v2 as cloudinary } from 'cloudinary';
import { query } from '../db.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

async function handleMessages(req: VercelRequest, res: VercelResponse): Promise<void> {
  const authed = await verifyClerkToken(req);
  if (!authed) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM messages ORDER BY created_at DESC');
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('messages GET error:', err);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
    return;
  }

  if (req.method === 'PUT') {
    const { id, read } = req.body as { id?: string; read?: boolean };
    if (!id) { res.status(400).json({ error: 'id is required' }); return; }
    try {
      await query('UPDATE messages SET read = $1 WHERE id = $2', [read ?? true, id]);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('messages PUT error:', err);
      res.status(500).json({ error: 'Failed to update message' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const { id } = req.body as { id?: string };
    if (!id) { res.status(400).json({ error: 'id is required' }); return; }
    try {
      await query('DELETE FROM messages WHERE id = $1', [id]);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('messages DELETE error:', err);
      res.status(500).json({ error: 'Failed to delete message' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleStats(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT key, value FROM site_settings');
      const settings = result.rows.reduce<Record<string, unknown>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      res.status(200).json(settings);
    } catch (err) {
      console.error('site_settings GET error:', err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
    return;
  }

  if (req.method === 'PUT') {
    const authed = await verifyClerkToken(req);
    if (!authed) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { key, value } = req.body as { key?: string; value?: unknown };
    if (!key) { res.status(400).json({ error: 'key is required' }); return; }
    if (value === undefined) { res.status(400).json({ error: 'value is required' }); return; }
    try {
      await query(
        `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('site_settings PUT error:', err);
      res.status(500).json({ error: 'Failed to upsert setting' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleUploadSignature(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' }); return;
  }
  const authed = await verifyClerkToken(req);
  if (!authed) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Server misconfiguration' }); return;
  }

  try {
    const { folder = 'cosmofolio' } = (req.body as { folder?: string }) ?? {};
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      process.env.CLOUDINARY_API_SECRET
    );
    res.status(200).json({
      signature, timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    });
  } catch (err) {
    console.error('upload-signature error:', err);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const resource = req.query.resource as string;

  if (resource === 'messages') return handleMessages(req, res);
  if (resource === 'stats') return handleStats(req, res);
  if (resource === 'upload-signature') return handleUploadSignature(req, res);

  res.status(404).json({ error: 'Unknown resource' });
}