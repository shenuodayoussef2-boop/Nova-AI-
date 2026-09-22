// ==========================================
// NOVA AI V3 - ANTI 429 & ANTI 404 ✅
// موديل خاص + Fallback + Web Search + Images
// ==========================================

export default async function handler(req, res) {
  if (req.method!== "POST") {
    return res.status(405).json({ success: false, error: "يسمح بطلبات POST فقط" });
  }

  try {
    const { message, imageData, mimeType, history } = req.body || {};

    const hasMessage = typeof message === "string" && message.trim().length > 0;
    const hasImage = typeof imageData === "string" && imageData.length > 0 && typeof mimeType === "string" && mimeType.startsWith("image/");

    if (!hasMessage &&!hasImage) {
      return res.status(400).json({ success: false, error: "يجب إرسال رسالة أو صورة" });
    }

    // يدعم اكتر من مفتاح: حطهم في Vercel كده: KEY1,KEY2,KEY3
    const allKeys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    if (allKeys.length === 0) {
      return res.status(500).json({ success: false, error: "مفتاح Gemini غير موجود في Vercel" });
    }

    // موديلات بكوتة منفصلة - لو واحد ادى 429 ينقل على اللي بعده
    const MODELS = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-flash-latest"
    ];

    const contents = [];
    if (Array.isArray(history)) {
      const safeHistory = history.filter(i => i && (i.role === "user" || i.role === "model") && Array.isArray(i.parts) && i.parts.length > 0).slice(-20);
      for (const item of safeHistory) {
        const safeParts = item.parts.filter(p => p && typeof p.text === "string" && p.text.trim().length > 0).map(p => ({ text: p.text.trim() }));
        if (safeParts.length > 0) contents.push({ role: item.role, parts: safeParts });
      }
    }

    const currentParts = [];
    if (hasMessage) currentParts.push({ text: message.trim() });
    else if (hasImage) currentParts.push({ text: "حلل الصورة المرفقة واشرح محتواها باللغة العربية." });

    if (hasImage) {
      const cleanBase64 = imageData.includes(",")? imageData.split(",")[1] : imageData;
      currentParts.push({ inline_data: { mime_type: mimeType, data: cleanBase64 } });
    }
    contents.push({ role: "user", parts: currentParts });

    const systemInstruction = `
أنت Nova AI — عقل رقمي صُمم ليصنع أكثر مما يجيب. ⚡
أنت المساعد الذكي الخاص بـ Nova AI، ومن تطوير يوسف شنوده.
مجالاتك: البرمجة 💻 - المعرفة 🧠 - الكتابة ✍️ - الإبداع 🚀 - تحليل الصور 🖼️ - البحث 🌐

هوية Nova AI:
- عرّف نفسك باسم Nova AI.
- إذا سُئلت عن مطورك، اذكر أن مطورك هو يوسف شنوده.
- لا تقدم نفسك على أنك Gemini أو ChatGPT ابدا.
- إذا سُئلت عن النموذج التقني، وضّح أن Nova AI تستخدم نموذج Gemini من Google لكنها هوية خاصة.
- لا تدّعِ تنفيذ إجراء لم تنفذه.

قواعد المحادثة:
- استخدم سياق الرسائل السابقة.
- كن عمليًا وواضحًا ومنظمًا.
- عند كتابة الأكواد، قدم كودًا كاملًا.

البحث على الإنترنت:
استخدم أداة google_search عندما يحتاج السؤال لمعلومات حديثة (اسعار، اخبار، مباريات، اصدارات).
لا تخترع مصادر.

أسلوبك: طبيعي، ودود، ذكي، ومفيد. عامية مصرية خفيفة عند الحاجة.
Nova AI. Think. Create. Build. 🚀
`.trim();

    const requestBody = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      tools: [{ google_search: {} }],
      contents
    };

    // Loop محاولة المفاتيح والموديلات
    let lastError = null;
    for (const apiKey of allKeys) {
      for (const model of MODELS) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
              body: JSON.stringify(requestBody)
            }
          );

          const data = await response.json();

          if (response.ok) {
            return res.status(200).json(data);
          }

          // لو 429 او 404 جرب الموديل اللي بعده
          if (response.status === 429 || response.status === 404 || response.status === 503) {
            console.warn(`Failed ${model} with ${response.status}, trying next...`);
            lastError = data;
            continue;
          }

          // اي خطأ تاني اطبعه
          console.error("Gemini Error:", JSON.stringify(data, null, 2));
          lastError = data;

        } catch (e) {
          console.error(`Network error on ${model}:`, e.message);
          lastError = { message: e.message };
        }
      }
    }

    // لو كل المحاولات فشلت
    return res.status(429).json({
      success: false,
      error: "كل مفاتيح وموديلات Nova مشغولة حاليا، جرب بعد 10 ثواني",
      details: lastError
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ success: false, error: "حدث خطأ أثناء الاتصال بـ Gemini", details: error.message });
  }
}
