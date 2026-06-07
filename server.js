import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const MODELS = [
  'claude-sonnet-4-5',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
];

async function callAnthropic(apiKey, messages, maxTokens = 1024) {
  for (const model of MODELS) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages })
    });
    const text = await response.text();
    console.log(`Model ${model} → status ${response.status}`);
    if (response.status === 404) continue;
    return { status: response.status, text };
  }
  return { status: 404, text: JSON.stringify({ error: 'No models available' }) };
}

app.post('/api/generate', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { status, text } = await callAnthropic(apiKey, req.body.messages);
    if (status !== 200) return res.status(status).json({ error: text });
    res.json(JSON.parse(text));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Genera un fondo artístico SVG usando Claude — sin dependencias externas
app.post('/api/generate-image', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { prompt } = req.body;

    const svgPrompt = `Create a visually stunning SVG background (1080x1080) inspired by: "${prompt}"

Rules:
- Output ONLY the SVG code, starting with <svg and ending with </svg>
- Use viewBox="0 0 1080 1080" width="1080" height="1080"
- Create rich abstract/artistic visuals using: gradients, shapes, blur filters, patterns, noise
- Use defs with linearGradient, radialGradient, filter (feGaussianBlur, feTurbulence), clipPath
- No text, no labels — pure visual art
- Rich colors matching the mood of the prompt
- Layered complexity: background gradient + midground shapes + foreground accents
- Use opacity and blending for depth
- Make it look like a high-end editorial design background`;

    const { status, text } = await callAnthropic(apiKey, [
      { role: 'user', content: svgPrompt }
    ], 4000);

    if (status !== 200) throw new Error('Claude API error');

    const data = JSON.parse(text);
    const raw = data.content?.[0]?.text || '';

    // Extract SVG from response
    const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/i);
    if (!svgMatch) throw new Error('No SVG generado');

    const svg = svgMatch[0];
    const base64 = Buffer.from(svg).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    res.json({ dataUrl, svg });
  } catch (e) {
    console.error('Image gen error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, key: process.env.ANTHROPIC_API_KEY ? 'set' : 'missing' });
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Content Studio running on port ${PORT}`));
