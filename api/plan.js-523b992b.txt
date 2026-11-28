// api/plan.js — يرجّع باقة المستخدم الحالية (يترفع على GitHub جوه فولدر api)
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  try {
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'إعدادات السيرفر ناقصة' });
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(200).json({ plan: 'FREE' });

    const userRes = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token }
    });
    if (!userRes.ok) return res.status(200).json({ plan: 'FREE' });
    const user = await userRes.json();
    if (!user || !user.id) return res.status(200).json({ plan: 'FREE' });

    const r = await fetch(SB_URL + '/rest/v1/yovia_subscriptions?user_id=eq.' + encodeURIComponent(user.id) + '&select=plan,expires_at', {
      headers: { apikey: SB_KEY }
    });
    const rows = await r.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return res.status(200).json({ plan: 'FREE' });
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(200).json({ plan: 'FREE', expired: true, expires_at: row.expires_at });
    }
    return res.status(200).json({ plan: row.plan, expires_at: row.expires_at });
  } catch (e) {
    return res.status(200).json({ plan: 'FREE' });
  }
};
