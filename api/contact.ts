import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { query } from './db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, email, message } = req.body as {
    name?: string;
    email?: string;
    message?: string;
  };

  if (!name || !email || !message) {
    res.status(400).json({ error: 'name, email, and message are required' });
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let emailSent = false;

  try {
    await resend.emails.send({
      from: process.env.CONTACT_EMAIL_FROM as string,
      to: process.env.CONTACT_EMAIL_TO as string,
      subject: `New message from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });
    emailSent = true;
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ error: 'Failed to send message' });
    return;
  }

  try {
    await query(
      'INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );
  } catch (err) {
    console.error('DB insert error:', err);
    // Email already sent — still return 200
  }

  if (emailSent) {
    res.status(200).json({ success: true });
  }
}