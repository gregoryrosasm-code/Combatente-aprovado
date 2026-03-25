export default async function handler(req, res) {
  // Permite apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Cabeçalhos CORS — permite o app chamar o proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chave de API não configurada no servidor.' });
  }

  // --- Rate limiting simples por IP ---
  // Cada IP tem direito a 15 chamadas por dia no plano gratuito.
  // Para usuários pagos, o app envia o header X-User-Token.
  const userToken = req.headers['x-user-token'] || null;
  const isPaid = userToken && userToken === process.env.PAID_SECRET;

  if (!isPaid) {
    // Rate limit: usamos um Map em memória (reseta a cada cold start do serverless)
    // Para produção robusta, substituir por Redis/Upstash
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    if (!global._rateLimitMap) global._rateLimitMap = {};
    const entry = global._rateLimitMap[ip];

    if (entry && now - entry.start < dayMs) {
      if (entry.count >= 15) {
        return res.status(429).json({
          error: 'Limite gratuito atingido',
          message: 'Você usou todas as 15 chamadas gratuitas de hoje. Assine o plano Pro para acesso ilimitado.',
          upgrade: true
        });
      }
      entry.count++;
    } else {
      global._rateLimitMap[ip] = { start: now, count: 1 };
    }
  }

  // Repassa a requisição para a Anthropic
  try {
    const body = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
       model: 'claude-haiku-4-5-20251001',
        max_tokens: body.max_tokens || 1000,
        messages: body.messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro na API' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}
