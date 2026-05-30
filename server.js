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

app.post('/api/generate-image', async (req, res) => {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Replicate API key not configured' });
  try {
    const { prompt } = req.body;
    // Start prediction with Flux Schnell
    const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { prompt, num_outputs: 1, aspect_ratio: '1:1', output_format: 'webp', output_quality: 90 } })
    });
    const prediction = await startRes.json();
    if (!startRes.ok) return res.status(500).json({ error: prediction.detail || 'Error starting prediction' });

    // Poll until done (max 60s)
    let result = prediction;
    for (let i = 0; i < 30; i++) {
      if (result.status === 'succeeded') return res.json({ url: result.output[0] });
      if (result.status === 'failed') return res.status(500).json({ error: result.error || 'Generation failed' });
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(result.urls.get, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      result = await poll.json();
    }
    res.status(504).json({ error: 'Timeout generating image' });
  } catch (e) {
    console.error('Image gen error:', e.message);
    res.status(500).json({ error: e.message });
  }
});


  res.json({ ok: true, key: process.env.ANTHROPIC_API_KEY ? 'set' : 'missing' });
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Content Studio running on port ${PORT}`));
