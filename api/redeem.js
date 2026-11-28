// api/redeem.js — تفعيل باقة يوفيا بكود (يترفع على GitHub جوه فولدر api)
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sbRest(path, options) {
  options = options || {};
  const res = await fetch(SB_URL + '/rest/v1' + path, {
    method: options.method || 'GET',
    body: options.body,
    headers: Object.assign({
      apikey: SB_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }, options.headers || {})
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  return { ok: res.ok, status: res.status, data: data };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'إعدادات السيرفر ناقصة' });

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'سجّل دخولك الأول عشان تفعّل الباقة' });

    const userRes = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'سجّل دخولك الأول عشان تفعّل الباقة' });
    const user = await userRes.json();
    if (!user || !user.id) return res.status(401).json({ error: 'سجّل دخولك الأول عشان تفعّل الباقة' });

    const code = String((req.body && req.body.code) || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'اكتب الكود الأول' });

    const found = await sbRest('/yovia_activation_codes?code=eq.' + encodeURIComponent(code) + '&select=code,plan,days,max_uses,uses');
    const row = found.data && found.data[0];
    if (!row) return res.status(404).json({ error: 'الكود ده غلط أو مش موجود' });
    if (row.uses >= row.max_uses) return res.status(409).json({ error: 'الكود ده اتستخدم قبل كده' });

    const claimed = await sbRest('/yovia_activation_codes?code=eq.' + encodeURIComponent(code) + '&uses=eq.' + row.uses, {
      method: 'PATCH',
      body: JSON.stringify({ uses: row.uses + 1 })
    });
    if (!claimed.ok || !claimed.data || !claimed.data[0]) return res.status(409).json({ error: 'الكود ده اتستخدم قبل كده' });

    const now = new Date();
    const expires = new Date(now.getTime() + row.days * 86400000);
    const up = await sbRest('/yovia_subscriptions', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: user.id,
        plan: row.plan,
        activated_at: now.toISOString(),
        expires_at: expires.toISOString()
      })
    });
    if (!up.ok) return res.status(500).json({ error: 'حصل خطأ أثناء التفعيل، جرب تاني' });

    return res.status(200).json({ plan: row.plan, expires_at: expires.toISOString() });
  } catch (e) {
    return res.status(500).json({ error: 'حصل خطأ، جرب تاني' });
  }
};
