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

// DALL-E 3: devuelve URL, luego la descargamos y retornamos base64 para evitar CORS en canvas
app.post('/api/generate-image', async (req, res) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OpenAI API key no configurada' });

  try {
    const { prompt } = req.body;

    // Paso 1: generar imagen con DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    const raw = await response.text();
    console.log('OpenAI response:', raw.substring(0, 300));

    let data;
    try { data = JSON.parse(raw); } catch(e) { throw new Error('OpenAI devolvió respuesta inválida: ' + raw.substring(0, 100)); }
    if (!response.ok) throw new Error(data.error?.message || 'Error en DALL-E 3');

    const imageUrl = data.data[0].url;

    // Paso 2: descargar la imagen en el servidor y convertir a base64
    // Así evitamos problemas de CORS al dibujarla en el canvas del browser
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('No se pudo descargar la imagen generada');

    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = imgRes.headers.get('content-type') || 'image/png';

    res.json({ dataUrl: `data:${contentType};base64,${base64}` });

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
