import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Try models in order until one works
const MODELS = [
  'claude-sonnet-4-5',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
];

async function callAnthropic(apiKey, messages) {
  for (const model of MODELS) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens: 1024, messages })
    });
    const text = await response.text();
    console.log(`Model ${model} → status ${response.status}`);
    if (response.status === 404) continue; // try next model
    return { status: response.status, text };
  }
  return { status: 404, text: JSON.stringify({ error: 'No models available' }) };
}

app.post('/api/generate', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { status, text } = await callAnthropic(apiKey, req.body.messages);
    console.log('Final response:', text.substring(0, 200));
    if (status !== 200) return res.status(status).json({ error: text });
    res.json(JSON.parse(text));
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// /api/generate-image eliminado — Pollinations bloquea IPs de servidor (402/403)
// La generación de imagen ahora se hace directo desde el browser en el frontend

app.get('/api/health', (req, res) => {
  res.json({ ok: true, key: process.env.ANTHROPIC_API_KEY ? 'set' : 'missing' });
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Content Studio running on port ${PORT}`));
