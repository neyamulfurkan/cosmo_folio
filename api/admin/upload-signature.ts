// api/admin/upload-signature.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { v2 as cloudinary } from 'cloudinary';

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return void res.status(405).json({ error: 'Method not allowed' });
  }

  const authed = await verifyClerkToken(req);
  if (!authed) return void res.status(401).json({ error: 'Unauthorized' });

  const { folder = 'cosmofolio' } = (req.body as { folder?: string }) ?? {};

  try {
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );

    return void res.status(200).json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    });
  } catch (err) {
    console.error('[upload-signature] error:', err);
    return void res.status(500).json({ error: 'Failed to generate upload signature' });
  }
}