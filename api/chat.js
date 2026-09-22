// ==========================================
// NOVA AI V3.2 - CORS + 429 Fixed ✅
// ==========================================

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-nova-key, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method!== "POST") {
    return res.status(405).json({ success: false, error: "يسمح بطلبات POST فقط" });
  }

  const novaKeyHeader = req.headers["x-nova-key"] || req.headers["authorization"]?.replace("Bearer ", "") || "";
  const validNovaKeys = (process.env.NOVA_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);

  if (novaKeyHeader && validNovaKeys.length > 0) {
    if (!validNovaKeys.includes(novaKeyHeader)) {
      return res.status(401).json({ success: false, error: "مفتاح Nova API غير صحيح" });
    }
  }

  try {
    const { message, imageData, mimeType, history, model: requestedModel } = req.body || {};
    const hasMessage = typeof message === "string" && message.trim().length > 0;
    const hasImage = typeof imageData === "string" && imageData.length > 0 && typeof mimeType === "string" && mimeType.startsWith("image/");

    if (!hasMessage &&!hasImage) {
      return res.status(400).json({ success: false, error: "يجب إرسال رسالة أو صورة" });
    }

    const allKeys = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    if (allKeys.length === 0) return res.status(500).json({ success: false, error: "مفتاح Gemini غير موجود" });

    const MODEL_MAP = {
      "nova-2.0-pro": "gemini-1.5-flash",
      "nova-2.0-flash": "gemini-1.5-flash",
      "nova-2.0-mini": "gemini-1.5-flash-8b",
    };
    const userWant = MODEL_MAP[requestedModel] || "gemini-1.5-flash";
    const modelsToTry = [...new Set([userWant, "gemini-1.5-flash-8b", "gemini-1.5-flash-latest"])];

    const contents = [];
    if (Array.isArray(history)) {
      const safeHistory = history.filter(item => item && (item.role === "user" || item.role === "model") && Array.isArray(item.parts) && item.parts.length > 0).slice(-20);
      for (const item of safeHistory) {
        const safeParts = item.parts.filter(part => part && typeof part.text === "string" && part.text.trim().length > 0).map(part => ({ text: part.text.trim() }));
        if (safeParts.length > 0) contents.push({ role: item.role, parts: safeParts });
      }
    }

    const currentParts = [];
    if (hasMessage) currentParts.push({ text: message.trim() });
    else if (hasImage) currentParts.push({ text: "حلل الصورة المرفقة" });
    if (hasImage) {
      const cleanBase64 = imageData.includes(",")? imageData.split(",")[1] : imageData;
      currentParts.push({ inline_data: { mime_type: mimeType, data: cleanBase64 } });
    }
    contents.push({ role: "user", parts: currentParts });

    const systemInstruction = `أنت Nova AI 2.0 Pro من تطوير يوسف شنوده. لا تقل ابدا انك Gemini.`.trim();
    const requestBody = { system_instruction: { parts: [{ text: systemInstruction }] }, contents };

    let lastError = null;
    for (const model of modelsToTry) {
      for (const apiKey of allKeys) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody)
          });
          const data = await response.json();
          if (response.ok) return res.status(200).json({...data, model_used: requestedModel || "nova-2.0-pro", nova_model: true });
          if ([429, 404, 503].includes(response.status)) { lastError = data; continue; }
          return res.status(response.status).json({ success: false, error: "خطأ من المحرك", details: data });
        } catch (e) { lastError = { message: e.message }; continue; }
      }
      await new Promise(r => setTimeout(r, 800));
    }
    return res.status(429).json({ success: false, error: "كل محركات Nova مشغولة حاليا، جرب بعد 10 ثواني", details: lastError });
  } catch (error) {
    return res.status(500).json({ success: false, error: "حدث خطأ", details: error.message });
  }
}
