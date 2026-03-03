import type { VercelRequest, VercelResponse } from '@vercel/node';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-70b-versatile';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { messages, portfolioContext } = req.body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    portfolioContext: string;
  };

  if (!Array.isArray(messages) || typeof portfolioContext !== 'string') {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
    return;
  }

  const systemPrompt =
    `You are a portfolio assistant. Answer questions about the owner's work, skills, and background honestly and helpfully. ` +
    `If the visitor asks to see a specific section, include [[NAVIGATE: section_name]] in your response ` +
    `(valid sections: home, projects, about, skills, experience, education, blog, stats, lab, achievements, contact, resume). ` +
    `If asked to show a specific project, include [[OPEN_PROJECT: project_id]]. ` +
    `You are an AI assistant, not the owner. Context: ${portfolioContext}`;

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      res.status(502).json({ error: 'AI service error' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = groqResponse.body?.getReader();
    if (!reader) {
      res.status(502).json({ error: 'No response body from AI service' });
      return;
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    console.error('ai-chat handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
}