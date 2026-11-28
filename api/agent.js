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

const KB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
async function kbLookup(question) {
  try {
    if (!KB_KEY || !SUPABASE_URL || !question) return '';
    const STOP = new Set(['مين','ايه','إيه','هو','هي','من','في','على','عن','كان','كانت','فاز','لما','امتى','متى','كام','ازاي','إزاي','what','who','the','is','of']);
    const base = String(question).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
    const set = new Set();
    for (const w of base) { set.add(w); const a = w.replace(/^(وال|بال|لل|ال)/, ''); if (a.length > 1) set.add(a); const b = w.replace(/^[بلوفك]/, ''); if (b.length > 2) set.add(b); const c = b.replace(/^ال/, ''); if (c.length > 1) set.add(c); }
    const words = Array.from(set).slice(0, 16);
    if (!words.length) return '';
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/search_knowledge', {
      method: 'POST',
      headers: { apikey: KB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: words.join(' or '), n: 8 })
    });
    if (!r.ok) return '';
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return '';
    return '\n\nمعلومات من قاعدة معرفة Yovia ((معلومات مؤكدة وأحدث من معرفتك ومن الويب. لو فيها إجابة السؤال اعتمد عليها فقط ولا تستخدم web_search ولا تذكر مصادر من عندك)):\n' + rows.map(x => '- ' + String(x.content).slice(0, 600)).join('\n');
  } catch { return ''; }
}

// ---------- Long-term memory (per signed-in user) ----------
// يستخدم SUPABASE_SERVICE_KEY الموجود أصلاً، بدون أي متغيرات جديدة
const MEM_DEBUG = { errors: [] };
function memHeaders(extra) {
  return Object.assign({ apikey: KB_KEY, Authorization: 'Bearer ' + KB_KEY }, extra || {});
}
async function memErr(where, r) {
  let t = '';
  try { t = (await r.text()).slice(0, 300); } catch {}
  const m = where + ' ' + r.status + ' ' + t;
  console.error('memory error:', m);
  MEM_DEBUG.errors.push(m);
}
async function memLoad(userId) {
  try {
    if (!KB_KEY || !SUPABASE_URL || !userId) { MEM_DEBUG.errors.push('missing env or user'); return []; }
    const r = await fetch(SUPABASE_URL + '/rest/v1/user_memory?select=key,value&user_id=eq.' + encodeURIComponent(userId) + '&order=updated_at.desc&limit=50', { headers: memHeaders() });
    if (!r.ok) { await memErr('load', r); return []; }
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) ? rows : [];
  } catch (e) { console.error('memory load', e && e.message); MEM_DEBUG.errors.push('load ' + (e && e.message)); return []; }
}
async function memSave(userId, key, value) {
  try {
    if (!KB_KEY || !SUPABASE_URL || !userId) return 'memory off';
    key = String(key || '').toLowerCase().replace(/[^a-z0-9_\u0600-\u06FF-]/g, '_').slice(0, 40);
    value = String(value || '').slice(0, 300);
    if (!key || !value) return 'nothing to save';
    const r = await fetch(SUPABASE_URL + '/rest/v1/user_memory?on_conflict=user_id,key', {
      method: 'POST',
      headers: memHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ user_id: userId, key, value, updated_at: new Date().toISOString() })
    });
    if (!r.ok) { await memErr('save', r); return 'save failed'; }
    return 'saved';
  } catch (e) { console.error('memory save', e && e.message); MEM_DEBUG.errors.push('save ' + (e && e.message)); return 'save failed'; }
}
async function memForget(userId) {
  try {
    if (!KB_KEY || !SUPABASE_URL || !userId) return 'memory off';
    const r = await fetch(SUPABASE_URL + '/rest/v1/user_memory?user_id=eq.' + encodeURIComponent(userId), { method: 'DELETE', headers: memHeaders() });
    if (!r.ok) { await memErr('forget', r); return 'forget failed'; }
    return 'forgotten';
  } catch { return 'forget failed'; }
}
// استخراج تلقائي من السيرفر: مش معتمد على إن الموديل يستدعي الأداة
async function memExtract(userId, history, existing) {
  try {
    const lastU = [...history].reverse().find(m => m.role === 'user');
    if (!lastU || lastU.content.trim().length < 4) return [];
    const ctx = history.slice(-4).map(m => (m.role === 'user' ? 'المستخدم: ' : 'يوفيا: ') + m.content.slice(0, 500)).join('\n');
    const known = existing.length ? existing.map(f => f.key + ': ' + f.value).join('\n') : '(لا شيء)';
    const sys = 'استخرج من آخر رسالة للمستخدم أي معلومات دائمة عنه شخصيًا (الاسم، الشغل، الدراسة، المدينة، السن، الاهتمامات، التفضيلات، المشاريع، العائلة). تجاهل الأسئلة والطلبات والأخبار والكلام المؤقت. المعلومات المحفوظة حاليًا:\n' + known + '\nلو معلومة جديدة تغيّر معلومة محفوظة استخدم نفس المفتاح. المفاتيح إنجليزية قصيرة مثل name, job, city, age, interests, projects, likes. القيم قصيرة وبنفس لغة المستخدم. ردّ JSON فقط بهذا الشكل: {"facts":[{"key":"name","value":"..."}]} ولو مفيش شيء: {"facts":[]}';
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify({
        model: process.env.GROQ_MEMORY_MODEL || 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: ctx }],
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('memory extract groq', r.status, JSON.stringify(j).slice(0, 200)); MEM_DEBUG.errors.push('extract groq ' + r.status); return []; }
    const txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '{}';
    const parsed = JSON.parse(txt);
    const facts = Array.isArray(parsed.facts) ? parsed.facts.slice(0, 6) : [];
    const saved = [];
    for (const f of facts) {
      if (!f || !f.key || !f.value) continue;
      const res = await memSave(userId, f.key, typeof f.value === 'string' ? f.value : JSON.stringify(f.value));
      if (res === 'saved') saved.push(f.key);
    }
    return saved;
  } catch (e) { console.error('memory extract', e && e.message); MEM_DEBUG.errors.push('extract ' + (e && e.message)); return []; }
}

const SYSTEM = `أنت Yovia، وكيل ذكي ينفذ المهام بنفسه باستخدام الأدوات المتاحة.
- إذا سُئلت من مؤسسك أو من صنعك أو من أسسك فقل بالضبط: أنا يوفيا من شركة Yovia AI التي أسسها Youssef Shenuoda.
- المطوّر هو يوسف. لا تقل إنك Nova أو Gemini أو Google أو OpenAI أو Groq.
- رد بلغة المستخدم ولهجته، وكن مختصرًا.
- لو المستخدم طلب موقعًا أو صفحة أو تطبيقًا استخدم أداة build_website بملف HTML كامل (CSS وJS داخله) بتصميم احترافي حديث، RTL للعربي، متجاوب مع الموبايل، وكل زرار يعمل فعلاً، وصور حقيقية للمنتجات عبر https://loremflickr.com/600/400/KEYWORD?lock=N (KEYWORD كلمة إنجليزية، وN رقم مختلف) مع onerror يضع خلفية متدرجة.
- لو طلب صورة استخدم generate_image بوصف إنجليزي مفصل.
- لو يحتاج معلومة حديثة أو غير مؤكدة أو خبر استخدم web_search مرة واحدة ثم أجب، واذكر المصادر وتاريخ الخبر.
- لا تذكر في إجابتك أي خبر أو رقم أو تفصيلة لم تظهر في نتائج البحث. لو النتائج فارغة أو غير مرتبطة قل بصراحة: لم أجد تقارير موثوقة عن ذلك.
- لأخبار الحوادث والوفيات والضحايا والحرائق: اذكر فقط ما كتبته المصادر حرفيًا، ولا تضف أعدادًا أو أسبابًا من عندك.
- لأسعار العملات استخدم exchange_rate (سعر رسمي عالمي، وقد يختلف عن سعر البنك المركزي المصري وعن السوق المحلي، وضّح ذلك ولا تنسبه للبنك المركزي).
- للحسابات استخدم calculate.
- لا تخترع نتائج ولا تدّعي تنفيذ شيء لم تنفذه.`;

const GOV_GUIDE = `
وضع "مساعد الورق الحكومي": لما المستخدم يسأل عن استخراج ورقة رسمية (بطاقة، جواز، شهادة ميلاد، رخصة قيادة)، رد بالشكل ده بالظبط:
1) اسم الخدمة
2) الأوراق المطلوبة
3) فين تروح (الجهة)
4) التكلفة التقريبية
5) الخطوات
6) قايمة تعليم، كل بند في سطر يبدأ بـ "- [ ] "
وآخر سطر: "الرسوم ممكن تتغير، اتأكد من الموقع الرسمي قبل ما تروح."
ممنوع تخترع رقم. أي حاجة مش مذكورة تحت قول إنك مش متأكد وحوّله للموقع الرسمي.

معلومات متحقق منها:

[جواز السفر] المصدر: moi.gov.eg/Passports (الصفحتين: getpassport و PassportRequiredPapers)
- الأوراق: بطاقة رقم قومي سارية ومحدثة (لمن أتم 15 سنة)، أو شهادة ميلاد مميكنة لمن تحت 15. شهادة قيد دراسي للطلبة عن العام الحالي. مستند التجنيد للذكور (من مواليد 18/3/1941، ما عدا من لم يبلغوا 19 سنة). 3 صور ملونة خلفية بيضاء 4x6 حديثة.
- تقديم أصل المستندات وصورة منها. استمارة نموذج 29 جوازات مميكن مجانا من الجوازات.
- الرسم: 705 جنيه. بدل فاقد أو تالف: 1155 جنيه. عاجل (يوم العمل التالي): +100 جنيه. مميز (نفس اليوم): 500 جنيه.
- الجهة: الإدارة العامة للجوازات أو فروعها حسب الاختصاص المكاني. المصريين بالخارج: القنصلية. الصلاحية 7 سنين.

[بطاقة الرقم القومي] المصدر: أرقام منشورة عن قطاع الأحوال المدنية في فيتو (24/10/2026) ومصادر صحفية، مش صفحة moi نفسها، فقول "حسب منشور حديث".
- استمارة عادية 50 جنيه، مستعجلة 125، خاصة 175. إعادة إنتاج البطاقة 175. كبار السن لأول مرة 175. ذوي الاحتياجات الخاصة لأول مرة 50.
- ممكن من مكتب السجل المدني، أو ماكينات السجل المدني، أو بوابة وزارة الداخلية الإلكترونية. الأوراق بالظبط حسب الحالة (تجديد، بدل فاقد، بدل تالف): قول إنك مش متأكد وحوّل لموقع الداخلية.

[شهادة الميلاد المميكنة] المصدر: نفس منشور فيتو.
- أول مرة 80 جنيه. بعد أول مرة 65. من السجل المدني أو الماكينات الذكية أو أونلاين. الأوراق التفصيلية: مش متأكد.

[رخصة القيادة] المصدر: مصراوي 19/10/2026 (مش مصدر رسمي)
- خاصة: بطاقة سارية وصورة منها، صورة المؤهل الدراسي، صور 4x6 حديثة، نموذج الطلب من وحدة المرور، كشف طبي (نظر وباطنة)، فصيلة دم، تحليل مخدرات، سن 18 فأكتر، اختبار نظري وعملي، صحيفة سوابق نضيفة. تقدم في وحدة المرور التابع لها محل الإقامة.
- الرسوم: مش متأكد، حوّل لـ traffic.moi.gov.eg.

أي ورقة تانية: قول إنها لسه مش مغطاة وحوّل لـ digital.gov.eg أو khadamatmisr.gov.eg.
`;

const TOOLS = [
  { type: 'function', function: { name: 'web_search', description: 'Search the web and news. Returns titles, urls, snippets.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'read_page', description: 'Fetch a public web page and return its text.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'generate_image', description: 'Generate an image from an English prompt.', parameters: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } } },
  { type: 'function', function: { name: 'build_website', description: 'Deliver a complete single-file HTML website/app.', parameters: { type: 'object', properties: { title: { type: 'string' }, html: { type: 'string' } }, required: ['title', 'html'] } } },
  { type: 'function', function: { name: 'exchange_rate', description: 'Live currency exchange rate, e.g. USD to EGP.', parameters: { type: 'object', properties: { base: { type: 'string' }, target: { type: 'string' } }, required: ['base', 'target'] } } },
  { type: 'function', function: { name: 'calculate', description: 'Evaluate a math expression with + - * / ( ) numbers only.', parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } } }
];

const MEMORY_TOOLS = [
  { type: 'function', function: { name: 'remember', description: 'Save one lasting fact about the current signed-in user (name, job, city, age, interests, preferences, projects). key: short snake_case, value: the fact in the user language.', parameters: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] } } },
  { type: 'function', function: { name: 'forget_all_memory', description: 'Delete every saved fact about the current user. Use only when they ask you to forget them.', parameters: { type: 'object', properties: {} } } }
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

function decodeXml(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .trim();
}

function parseRss(xml, limit) {
  const out = [];
  const items = String(xml).match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const it of items) {
    const pick = (tag) => { const m = it.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return m ? decodeXml(m[1]) : ''; };
    const title = pick('title');
    if (!title) continue;
    out.push({ title, url: pick('link'), snippet: strip(decodeXml(pick('description'))).slice(0, 200), date: pick('pubDate'), source: pick('source') });
    if (out.length >= limit) break;
  }
  return out;
}

async function newsSearch(query) {
  const q = encodeURIComponent(query);
  const feeds = [
    'https://news.google.com/rss/search?q=' + q + '&hl=ar&gl=EG&ceid=EG:ar',
    'https://www.bing.com/news/search?q=' + q + '&format=rss&setlang=ar'
  ];
  for (const f of feeds) {
    try {
      const r = await fetch(f, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YoviaBot/1.0)' }, signal: AbortSignal.timeout(4000) });
      if (!r.ok) continue;
      const items = parseRss(await r.text(), 6);
      if (items.length) return items;
    } catch {}
  }
  return [];
}

async function webSearch(query) {
  const key = process.env.TAVILY_API_KEY || '';
  if (key) {
    try {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ query, max_results: 5, include_answer: true })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(j.results) && j.results.length) {
        return { answer: j.answer || '', results: j.results.map(x => ({ title: x.title, url: x.url, snippet: String(x.content || '').slice(0, 400) })) };
      }
    } catch {}
  }
  // no key: live news RSS first, then Wikipedia (Arabic then English)
  const news = await newsSearch(query);
  if (news.length) return { note: 'نتائج أخبار حية. اذكر فقط ما في العناوين مع المصدر والتاريخ.', results: news };
  const out = [];
  for (const lang of ['ar', 'en']) {
    try {
      const r = await fetch('https://' + lang + '.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=3&srsearch=' + encodeURIComponent(query), { signal: AbortSignal.timeout(4000) });
      const j = await r.json().catch(() => ({}));
      const items = (j.query && j.query.search) || [];
      items.forEach(x => out.push({ title: x.title, url: 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(x.title.replace(/ /g, '_')), snippet: strip(x.snippet) }));
    } catch {}
    if (out.length >= 3) break;
  }
  return out.length ? { note: 'ويكيبيديا فقط، لا تصلح للأخبار الحديثة.', results: out } : 'NO RESULTS. Tell the user you could not find reliable reports. Do not invent anything.';
}

async function exchangeRate(base, target) {
  const b = String(base || 'USD').toUpperCase().slice(0, 3);
  const t = String(target || 'EGP').toUpperCase().slice(0, 3);
  const r = await fetch('https://open.er-api.com/v6/latest/' + b);
  const j = await r.json().catch(() => ({}));
  if (!j.rates || !j.rates[t]) return 'rate unavailable';
  return { base: b, target: t, rate: j.rates[t], updated: j.time_last_update_utc, note: 'global market rate, not the Central Bank of Egypt rate' };
}

async function readPage(url) {
  let u;
  try { u = new URL(url); } catch { return 'invalid url'; }
  if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) return 'blocked url';
  const r = await fetch(u.href, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YoviaBot/1.0)' }, redirect: 'follow', signal: AbortSignal.timeout(5000) });
  const t = strip(await r.text());
  return t.slice(0, 3500);
}

function calc(expr) {
  const e = String(expr || '');
  if (!/^[0-9+\-*/().\s%]+$/.test(e) || e.length > 200) return 'invalid expression';
  try { return String(Function('"use strict";return (' + e + ')')()); } catch { return 'invalid expression'; }
}

async function runTool(name, args, artifacts, userId) {
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
    if (name === 'remember') return userId ? await memSave(userId, args.key, args.value) : 'memory needs login';
    if (name === 'forget_all_memory') return userId ? await memForget(userId) : 'memory needs login';
    return 'unknown tool';
  } catch (e) {
    return 'tool error: ' + (e && e.message ? e.message : 'failed');
  }
}

async function groq(messages, allowTools, tools) {
  const payload = {
    model: GROQ_MODEL,
    messages,
    max_completion_tokens: 3500,
    temperature: 0.6,
    reasoning_effort: 'low'
  };
  if (allowTools) { payload.tools = tools || TOOLS; payload.tool_choice = 'auto'; }
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_API_KEY },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error((j.error && j.error.message) || 'groq failed');
    err.status = r.status;
    throw err;
  }
  return j.choices && j.choices[0] && j.choices[0].message;
}

// ---------- حدود الباقة اليومية (المستخدمين المسجلين) ----------
// بيستخدم SUPABASE_SERVICE_KEY الموجود، من غير متغيرات جديدة.
// لو الفحص نفسه وقع (مشكلة اتصال) بنعدّي الرسالة عادي عشان الخدمة متقفش.
async function planLimitCheck(userId) {
  try {
    if (!KB_KEY || !SUPABASE_URL || !userId) return null;
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/check_message_limit', {
      method: 'POST',
      headers: { apikey: KB_KEY, Authorization: 'Bearer ' + KB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: userId })
    });
    if (!r.ok) { console.error('plan limit rpc', r.status); return null; }
    return await r.json().catch(() => null);
  } catch (e) { console.error('plan limit', e && e.message); return null; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const auth = req.headers.authorization || '';
    let userId = '';
    if (auth) {
      const who = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_KEY, Authorization: auth } });
      if (!who.ok) return res.status(401).json({ error: 'جلسة غير صالحة. حدّث الصفحة.' });
      const whoJson = await who.json().catch(() => ({}));
      userId = (whoJson && whoJson.id) || '';
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

    // فحص حد الباقة للمسجلين (الضيوف لهم منطقهم فوق)
    if (userId) {
      const lim = await planLimitCheck(userId);
      if (lim && lim.ok === false) {
        return res.status(429).json({ error: lim.error || 'وصلت للحد اليومي لباقتك. الحد بيتجدد بكرة.' });
      }
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const history = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content.slice(-2500) }));
    if (!history.length) return res.status(400).json({ error: 'لا توجد رسالة.' });

    const lastU = [...history].reverse().find(m => m.role === 'user');
    const kb = await kbLookup(lastU ? lastU.content : '');
    let memBlock = '';
    let facts = [];
    MEM_DEBUG.errors = [];
    if (userId) {
      facts = await memLoad(userId);
      memBlock = '\n\nذاكرة طويلة المدى لهذا المستخدم (معلومات حفظتها عنه من محادثات سابقة، استخدمها بشكل طبيعي ولا تذكر أبدًا إنك قريتها من مكان):\n' +
        (facts.length ? facts.map(f => '- ' + f.key + ': ' + f.value).join('\n') : '(لا توجد معلومات محفوظة بعد)') +
        '\nقواعد الذاكرة: لو المستخدم ذكر معلومة دائمة عن نفسه (اسمه، شغله، مدينته، سنّه، اهتماماته، تفضيلاته، مشاريعه) احفظها فورًا بأداة remember بمفتاح قصير، وحدّث نفس المفتاح لو المعلومة اتغيرت. لا تحفظ أسئلة أو كلام مؤقت أو أخبار أو طلبات. لو طلب ينسى كل ما تعرفه عنه استخدم forget_all_memory وأكد له أنك نسيت.';
    }
    const messages = [{ role: 'system', content: SYSTEM + GOV_GUIDE + memBlock + kb }, ...history];
    const artifacts = [];
    const tools = userId ? TOOLS.concat(MEMORY_TOOLS) : TOOLS;
    let reply = '';

    for (let step = 0; step < MAX_STEPS; step++) {
      const last = step === MAX_STEPS - 1;
      const msg = await groq(messages, !last, tools);
      if (!msg) break;
      const calls = msg.tool_calls || [];
      if (!calls.length) { reply = (msg.content || '').trim(); break; }
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
      for (const c of calls) {
        let args = {};
        try { args = JSON.parse(c.function.arguments || '{}'); } catch {}
        const result = await runTool(c.function.name, args, artifacts, userId);
        messages.push({ role: 'tool', tool_call_id: c.id, content: typeof result === 'string' ? result.slice(0, 3500) : JSON.stringify(result).slice(0, 3500) });
      }
    }
    if (!reply && !artifacts.length) {
      // آخر محاولة: إجابة نهائية بدون أدوات من اللي اتجمع
      try {
        const fin = await groq([...messages, { role: 'user', content: 'أجب الآن مباشرة بناءً على نتائج الأدوات فقط، بدون أي أداة جديدة.' }], false);
        reply = ((fin && fin.content) || '').trim();
      } catch {}
    }
    if (!reply && artifacts.length) reply = 'تم، دي النتيجة:';
    if (!reply) reply = 'معرفتش أكمل المهمة، جرب تاني بصياغة أبسط.';
    let savedKeys = [];
    if (userId) savedKeys = await memExtract(userId, history, facts);
    const out = { reply, artifacts };
    if (userId && body.debug_memory) out.memory_debug = { user: userId.slice(0, 8), loaded: facts.length, saved: savedKeys, errors: MEM_DEBUG.errors };
    return res.status(200).json(out);
  } catch (e) {
    console.error('agent error', e && e.message);
    const busy = e && e.status === 429;
    return res.status(busy ? 429 : 500).json({ error: busy ? 'الضغط عالي، جرب بعد دقيقة.' : 'حصلت مشكلة، جرب تاني.' });
  }
};
