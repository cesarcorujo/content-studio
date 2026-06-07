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

// gpt-image-1 devuelve b64_json directamente
app.post('/api/generate-image', async (req, res) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OpenAI API key no configurada' });

  try {
    const { prompt } = req.body;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'auto',
        output_format: 'png'
      })
    });

    const raw = await response.text();
    console.log('OpenAI raw:', raw.substring(0, 400));

    let data;
    try { data = JSON.parse(raw); } catch(e) { throw new Error('Respuesta inválida de OpenAI: ' + raw.substring(0, 150)); }
    if (!response.ok) throw new Error(data.error?.message || 'Error en gpt-image-1');

    // gpt-image-1 devuelve b64_json, no URL
    const item = data.data[0];
    if (item.b64_json) {
      res.json({ dataUrl: `data:image/png;base64,${item.b64_json}` });
    } else if (item.url) {
      // fallback: descargar y convertir a base64
      const imgRes = await fetch(item.url);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      res.json({ dataUrl: `data:image/png;base64,${buf.toString('base64')}` });
    } else {
      throw new Error('OpenAI no devolvió imagen: ' + JSON.stringify(item));
    }

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
