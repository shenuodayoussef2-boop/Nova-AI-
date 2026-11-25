'use strict';

// Yovia AI - AGENT API (tool-calling). Put at api/agent.js
// Tools: web_search, read_page, generate_image, build_website, exchange_rate, calculate
// Optional env: TAVILY_API_KEY (free at tavily.com) for real web search
// Needs: GROQ_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (same as chat.js)

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_STEPS = 4;

const SYSTEM = `أنت Yovia، وكيل ذكي ينفذ المهام بنفسه باستخدام الأدوات المتاحة.
- إذا سُئلت من مؤسسك أو من صنعك أو من أسسك فقل بالضبط: أنا يوفيا من شركة Yovia AI التي أسسها Youssef Shenuoda.
- المطوّر هو يوسف. لا تقل إنك Nova أو Gemini أو Google أو OpenAI أو Groq.
- رد بلغة المستخدم ولهجته، وكن مختصرًا.
- لو المستخدم طلب موقعًا أو صفحة أو تطبيقًا استخدم أداة build_website بملف HTML كامل (CSS وJS داخله) بتصميم احترافي حديث، RTL للعربي، متجاوب مع الموبايل، وكل زرار يعمل فعلاً، وصور حقيقية للمنتجات عبر https://loremflickr.com/600/400/KEYWORD?lock=N (KEYWORD كلمة إنجليزية، وN رقم مختلف) مع onerror يضع خلفية متدرجة.
- لو طلب صورة استخدم generate_image بوصف إنجليزي مفصل.
- لو يحتاج معلومة حديثة أو غير مؤكدة استخدم web_search ثم read_page عند الحاجة، واذكر المصادر.
- لأسعار العملات استخدم exchange_rate (سعر رسمي عالمي، وقد يختلف عن سعر السوق المحلي، وضّح ذلك).
- للحسابات استخدم calculate.
- لا تخترع نتائج ولا تدّعي تنفيذ شيء لم تنفذه.`;

const TOOLS = [
  { type: 'function', function: { name: 'web_search', description: 'Search the web. Returns titles, urls, snippets.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'read_page', description: 'Fetch a public web page and return its text.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'generate_image', description: 'Generate an image from an English prompt.', parameters: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } } },
  { type: 'function', function: { name: 'build_website', description: 'Deliver a complete single-file HTML website/app.', parameters: { type: 'object', properties: { title: { type: 'string' }, html: { type: 'string' } }, required: ['title', 'html'] } } },
  { type: 'function', function: { name: 'exchange_rate', description: 'Live currency exchange rate, e.g. USD to EGP.', parameters: { type: 'object', properties: { base: { type: 'string' }, target: { type: 'string' } }, required: ['base', 'target'] } } },
  { type: 'function', function: { name: 'calculate', description: 'Evaluate a math expression with + - * / ( ) numbers only.', parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } } }
];

function isPrivateHost(h) {
  h = String(h || '').toLowerCase();
  return !h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.includes(':') || h === '[::1]';
}

function strip(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

async function webSearch(query) {
  const key = process.env.TAVILY_API_KEY || '';
  if (key) {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ query, max_results: 5, include_answer: true })
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray(j.results)) {
      return { answer: j.answer || '', results: j.results.map(x => ({ title: x.title, url: x.url, snippet: String(x.content || '').slice(0, 400) })) };
    }
  }
  // fallback without key: Wikipedia (Arabic then English)
  const out = [];
  for (const lang of ['ar', 'en']) {
    const r = await fetch('https://' + lang + '.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=3&srsearch=' + encodeURIComponent(query));
    const j = await r.json().catch(() => ({}));
    const items = (j.query && j.query.search) || [];
    items.forEach(x => out.push({ title: x.title, url: 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(x.title.replace(/ /g, '_')), snippet: strip(x.snippet) }));
    if (out.length >= 3) break;
  }
  return out.length ? out : 'no results (web search key missing)';
}

async function exchangeRate(base, target) {
  const b = String(base || 'USD').toUpperCase().slice(0, 3);
  const t = String(target || 'EGP').toUpperCase().slice(0, 3);
  const r = await fetch('https://open.er-api.com/v6/latest/' + b);
  const j = await r.json().catch(() => ({}));
  if (!j.rates || !j.rates[t]) return 'rate unavailable';
  return { base: b, target: t, rate: j.rates[t], updated: j.time_last_update_utc };
}

async function readPage(url) {
  let u;
  try { u = new URL(url); } catch { return 'invalid url'; }
  if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) return 'blocked url';
  const r = await fetch(u.href, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YoviaBot/1.0)' }, redirect: 'follow' });
  const t = strip(await r.text());
  return t.slice(0, 3500);
}

function calc(expr) {
  const e = String(expr || '');
  if (!/^[0-9+\-*/().\s%]+$/.test(e) || e.length > 200) return 'invalid expression';
  try { return String(Function('"use strict";return (' + e + ')')()); } catch { return 'invalid expression'; }
}

async function runTool(name, args, artifacts) {
  try {
    if (name === 'web_search') return await webSearch(String(args.query || '').slice(0, 200));
    if (name === 'read_page') return await readPage(args.url);
    if (name === 'exchange_rate') return await exchangeRate(args.base, args.target);
    if (name === 'calculate') return calc(args.expression);
    if (name === 'generate_image') {
      const p = String(args.prompt || '').slice(0, 500);
      const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(p) + '?width=1024&height=1024&nologo=true&seed=' + Math.floor(Math.random() * 1e6);
      artifacts.push({ type: 'image', url });
      return 'image created and shown to the user';
    }
    if (name === 'build_website') {
      artifacts.push({ type: 'html', title: String(args.title || 'موقع'), html: String(args.html || '') });
      return 'website delivered to the user as a live preview';
    }
    return 'unknown tool';
  } catch (e) {
    return 'tool error: ' + (e && e.message ? e.message : 'failed');
  }
}

async function groq(messages) {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_API_KEY },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_completion_tokens: 3500,
      temperature: 0.6,
      reasoning_effort: 'low'
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error((j.error && j.error.message) || 'groq failed');
    err.status = r.status;
    throw err;
  }
  return j.choices && j.choices[0] && j.choices[0].message;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const auth = req.headers.authorization || '';
    if (auth) {
      const who = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_KEY, Authorization: auth } });
      if (!who.ok) return res.status(401).json({ error: 'جلسة غير صالحة. حدّث الصفحة.' });
    } else {
      // زائر بدون تسجيل: مسموح بحد يومي بسيط لكل IP (best effort)
      globalThis.__guestHits = globalThis.__guestHits || new Map();
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
      const day = new Date().toISOString().slice(0, 10);
      const key = ip + '|' + day;
      const n = (globalThis.__guestHits.get(key) || 0) + 1;
      globalThis.__guestHits.set(key, n);
      if (globalThis.__guestHits.size > 5000) globalThis.__guestHits.clear();
      if (n > 15) return res.status(429).json({ error: 'خلصت رسايلك المجانية كضيف. سجّل حساب مجاني وكمّل 🚀' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const history = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content.slice(-2500) }));
    if (!history.length) return res.status(400).json({ error: 'لا توجد رسالة.' });

    const messages = [{ role: 'system', content: SYSTEM }, ...history];
    const artifacts = [];
    let reply = '';

    for (let step = 0; step < MAX_STEPS; step++) {
      const msg = await groq(messages);
      if (!msg) break;
      const calls = msg.tool_calls || [];
      if (!calls.length) { reply = (msg.content || '').trim(); break; }
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
      for (const c of calls) {
        let args = {};
        try { args = JSON.parse(c.function.arguments || '{}'); } catch {}
        const result = await runTool(c.function.name, args, artifacts);
        messages.push({ role: 'tool', tool_call_id: c.id, content: typeof result === 'string' ? result.slice(0, 3500) : JSON.stringify(result).slice(0, 3500) });
      }
    }
    if (!reply && artifacts.length) reply = 'تم، دي النتيجة:';
    if (!reply) reply = 'معرفتش أكمل المهمة، جرب تاني بصياغة أبسط.';
    return res.status(200).json({ reply, artifacts });
  } catch (e) {
    console.error('agent error', e && e.message);
    const busy = e && e.status === 429;
    return res.status(busy ? 429 : 500).json({ error: busy ? 'الضغط عالي، جرب بعد دقيقة.' : 'حصلت مشكلة، جرب تاني.' });
  }
};
