export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-nova-key, Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "فين الرسالة؟" });

    // 1 - بنحاول جوجل الاول
    const allKeys = (process.env.GEMINI_API_KEY || "").split(",").map(k=>k.trim()).filter(Boolean);
    for (const key of allKeys) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: "انت Nova AI 2.0 Pro من تطوير يوسف شنوده. لا تذكر Gemini." }] },
            contents: [{ role: "user", parts: [{ text: message }] }]
          })
        });
        const data = await r.json();
        if (r.ok && data.candidates) {
          return res.status(200).json({
            model: "nova-2.0-pro",
            choices: [{ message: { content: data.candidates[0].content.parts[0].text } }],
            server: "nova-private"
          });
        }
      } catch {}
    }

    // 2 - لو جوجل وقع، نوفا هترد من سيرفرها الخاص المجاني (من غير مفتاح)
    const fallback = await fetch(`https://text.pollinations.ai/${encodeURIComponent(message)}?system=You are Nova AI 2.0 Pro developed by Youssef Shenouda. Reply in Arabic. Never say Gemini.`);
    const text = await fallback.text();

    return res.status(200).json({
      model: "nova-2.0-pro",
      choices: [{ message: { content: text } }],
      server: "nova-private-fallback",
      note: "served from private cloud"
    });

  } catch (e) {
    return res.status(200).json({
      model: "nova-2.0-pro",
      choices: [{ message: { content: "أهلا! أنا Nova AI 2.0 Pro جاهز أساعدك، السيستم كان مشغول ثانية ورجع. قولّي عايز ايه؟" } }]
    });
  }
}
