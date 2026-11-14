
// ==========================================
// YOVIA AI - CHAT API
// Supabase Anonymous Auth + Daily Quotas
// Centralized Gemini API
// ==========================================

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `
أنت Yovia AI، مساعد ذكي متعدد اللغات. اسمك Yovia.

- افهم لغة المستخدم ورد باللغة نفسها وبلهجته قدر الإمكان.
- إذا سُئلت عن اسمك فقل: أنا Yovia.
- إذا سُئلت عن مطوّر Yovia فقل: المطوّر هو يوسف.
- لا تقل إنك Nova أو Gemini أو Google.
- حافظ على سياق المحادثة.
- لا تخترع معلومات أو تدّعي تنفيذ شيء لم تنفذه.
- كن واضحًا ومباشرًا.
`;

function send(res, status, payload) {
  return res.status(status).json(payload);
}

// ==========================================
// NORMALIZE MESSAGES
// ==========================================

function normalizeMessages(input) {
  if (!Array.isArray(input)) return [];

  return input
    .filter(m =>
      m &&
      typeof m === "object" &&
      m.role !== "system"
    )
    .map(m => {
      const role =
        m.role === "assistant" || m.role === "model"
          ? "model"
          : "user";

      let text = "";

      if (typeof m.content === "string") {
        text = m.content;
      } else if (typeof m.text === "string") {
        text = m.text;
      } else if (Array.isArray(m.content)) {
        text = m.content
          .map(part =>
            typeof part === "string"
              ? part
              : part && typeof part.text === "string"
                ? part.text
                : ""
          )
          .filter(Boolean)
          .join("\n");
      }

      text = String(text || "").trim();

      return text
        ? { role, parts: [{ text }] }
        : null;
    })
    .filter(Boolean)
    .slice(-40);
}

// ==========================================
// MAIN HANDLER
// ==========================================

module.exports = async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return send(res, 405, {
      error: "POST only"
    });
  }

  try {

    // ======================================
    // CHECK ENVIRONMENT VARIABLES
    // ======================================

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return send(res, 500, {
        error: "إعدادات Supabase ناقصة.",
        code: "SUPABASE_CONFIG_ERROR"
      });
    }

    if (!GEMINI_API_KEY) {
      return send(res, 500, {
        error: "مفتاح Gemini غير مضبوط على الخادم.",
        code: "MISSING_GEMINI_API_KEY"
      });
    }

    // ======================================
    // AUTHENTICATION
    // ======================================

    const authHeader = req.headers.authorization || "";

    if (!/^Bearer\s+\S+/i.test(authHeader)) {
      return send(res, 401, {
        error: "جلسة المستخدم غير موجودة.",
        code: "UNAUTHENTICATED"
      });
    }

    // ======================================
    // REQUEST BODY
    // ======================================

    let body = req.body || {};

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      body = {};
    }

    // ======================================
    // VALIDATE SUPABASE SESSION
    // ======================================

    const authResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: authHeader
        }
      }
    );

    if (!authResponse.ok) {
      return send(res, 401, {
        error: "جلسة Supabase غير صالحة. حدّث الصفحة وحاول مرة أخرى.",
        code: "INVALID_SESSION"
      });
    }

    // ======================================
    // EXTRACT MESSAGES
    // ======================================

    const messages = normalizeMessages(body.messages);

    if (!messages.length) {
      const single =
        typeof body.message === "string"
          ? body.message.trim()
          : typeof body.prompt === "string"
            ? body.prompt.trim()
            : "";

      if (single) {
        messages.push({
          role: "user",
          parts: [{ text: single }]
        });
      }
    }

    if (!messages.length || !messages.some(m => m.role === "user")) {
      return send(res, 400, {
        error: "اكتب رسالة أولًا.",
        code: "MISSING_MESSAGE"
      });
    }

    // ======================================
    // DAILY MESSAGE QUOTA
    // ======================================

    const quotaResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/yovia_consume_message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: authHeader
        },
        body: "{}"
      }
    );

    const quotaRaw = await quotaResponse.text();

    let quotaData;

    try {
      quotaData = quotaRaw
        ? JSON.parse(quotaRaw)
        : null;
    } catch {
      quotaData = null;
    }

    if (!quotaResponse.ok) {
      console.error(
        "Yovia quota RPC error:",
        quotaResponse.status,
        quotaRaw
      );

      return send(res, 500, {
        error: "تعذّر التحقق من حد الرسائل.",
        code: "QUOTA_RPC_ERROR"
      });
    }

    const quota = Array.isArray(quotaData)
      ? quotaData[0]
      : quotaData;

    if (!quota || typeof quota !== "object") {
      console.error("Yovia invalid quota response:", quotaData);

      return send(res, 500, {
        error: "استجابة عداد الرسائل غير مفهومة.",
        code: "QUOTA_INVALID_RESPONSE"
      });
    }

    const allowed =
      quota.allowed === true ||
      quota.status === "allowed";

    if (!allowed) {

      const reached =
        quota.code === "LIMIT_REACHED" ||
        quota.status === "limit_reached";

      return send(res, reached ? 429 : 403, {
        error: reached
          ? "وصلت للحد اليومي من الرسائل. يمكنك المحاولة بعد إعادة ضبط الحد أو مراجعة الباقات."
          : "تعذّر السماح بالرسالة حسب إعدادات الباقة.",

        code:
          quota.code ||
          (reached ? "LIMIT_REACHED" : "QUOTA_DENIED"),

        plan: quota.plan || null,
        limit: quota.limit ?? null,
        remaining: quota.remaining ?? null,
        reset_at: quota.reset_at || null
      });
    }

    // ======================================
    // SYSTEM INSTRUCTION
    // ======================================

    const suppliedSystem = Array.isArray(body.messages)
      ? body.messages
          .filter(m =>
            m &&
            m.role === "system" &&
            typeof m.content === "string"
          )
          .map(m => m.content.trim())
          .filter(Boolean)
          .join("\n\n")
      : "";

    const systemInstruction = [
      SYSTEM_PROMPT,
      suppliedSystem
    ].filter(Boolean).join("\n\n");

    // ======================================
    // GEMINI REQUEST
    // ======================================

    const geminiContents = messages.map(m => ({
      role: m.role,
      parts: m.parts
    }));

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },

          contents: geminiContents,

          generationConfig: {
            temperature:
              typeof body.temperature === "number"
                ? Math.max(0, Math.min(2, body.temperature))
                : 0.7,

            maxOutputTokens:
              typeof body.max_tokens === "number"
                ? Math.max(1, Math.min(8192, body.max_tokens))
                : 2048
          }
        })
      }
    );

    // ======================================
    // READ GEMINI RESPONSE
    // ======================================

    const geminiRaw = await geminiResponse.text();

    let geminiData;

    try {
      geminiData = geminiRaw
        ? JSON.parse(geminiRaw)
        : null;
    } catch {
      geminiData = null;
    }

    if (!geminiResponse.ok) {
      console.error(
        "Yovia Gemini error:",
        geminiResponse.status,
        geminiRaw
      );

      return send(res, 502, {
        error: "تعذّر على Yovia الحصول على رد من النموذج حاليًا.",
        code: "GEMINI_REQUEST_FAILED",
        details:
          geminiData?.error?.message ||
          `Gemini HTTP ${geminiResponse.status}`
      });
    }

    // ======================================
    // EXTRACT ANSWER
    // ======================================

    const answer = (
      geminiData?.candidates?.[0]?.content?.parts || []
    )
      .map(part =>
        typeof part.text === "string"
          ? part.text
          : ""
      )
      .join("")
      .trim();

    if (!answer) {
      return send(res, 502, {
        error: "النموذج لم يُرجع نصًا. حاول مرة أخرى.",
        code: "EMPTY_MODEL_RESPONSE"
      });
    }

    // ======================================
    // SUCCESS RESPONSE
    // OpenAI-compatible format
    // ======================================

    return send(res, 200, {
      choices: [
        {
          index: 0,

          message: {
            role: "assistant",
            content: answer
          },

          finish_reason: "stop"
        }
      ],

      model: GEMINI_MODEL,

      quota: {
        plan: quota.plan || null,
        used: quota.used ?? null,
        limit: quota.limit ?? null,
        remaining: quota.remaining ?? null,
        reset_at: quota.reset_at || null
      }
    });

  } catch (error) {

    console.error("Yovia chat handler error:", error);

    return send(res, 500, {
      error: "حصل خطأ داخلي في Yovia AI.",
      code: "YOVIA_INTERNAL_ERROR"
    });
  }
};
