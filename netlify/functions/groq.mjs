export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const key = process.env.GROQ_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: 'Clé API Groq manquante' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const { messages } = await req.json();
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, temperature: 0.3 })
  });
  const data = await r.json();
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
