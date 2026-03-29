export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = origin.includes('combatente-aprovado.vercel.app') || origin.includes('localhost');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Chave de API não configurada.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON inválido' }); }
  }

  // Rate limiting por IP
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (!global._rl) global._rl = {};
  const e = global._rl[ip];
  if (e && now - e.t < dayMs) {
    if (e.n >= 15) return res.status(429).json({ error: 'Limite diário atingido. Tente novamente amanhã.' });
    e.n++;
  } else {
    global._rl[ip] = { t: now, n: 1 };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: body.messages || [{ role: 'user', content: body.prompt || '' }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || 'Erro na API' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}
