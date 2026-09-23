export default async function handler(req, res) {
  // ==========================================
  // NOVA AI 2.0 PRO - CHAT API
  // ==========================================

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-nova-key"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST only"
    });
  }

  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "فين الرسالة؟"
      });
    }

    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return res.status(400).json({
        error: "الرسالة فاضية."
      });
    }

    // ==========================================
    // GEMINI API KEY
    // ==========================================

    const allKeys = (process.env.GEMINI_API_KEY || "")
      .split(",")
      .map(key => key.trim())
      .filter(Boolean);

    if (allKeys.length === 0) {
      return res.status(500).json({
        error: "GEMINI_API_KEY مش موجود في Environment Variables."
      });
    }

    // ==========================================
    // BUILD CONVERSATION
    // ==========================================

    const contents = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (!item || typeof item !== "object") continue;

        const role =
          item.role === "model" || item.role === "assistant"
            ? "model"
            : "user";

        const text =
          typeof item.content === "string"
            ? item.content.trim()
            : typeof item.text === "string"
              ? item.text.trim()
              : "";

        if (!text) continue;

        contents.push({
          role,
          parts: [
            {
              text
            }
          ]
        });
      }
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: cleanMessage
        }
      ]
    });

    // ==========================================
    // SYSTEM INSTRUCTION
    // ==========================================

    const systemInstruction = {
      parts: [
        {
          text: `
أنت Nova AI 2.0 Pro.

أنت مساعد ذكي للبرمجة والكتابة والتعلم والإبداع.

قواعدك:
- أجب باللغة التي يستخدمها المستخدم.
- إذا كان المستخدم يتحدث بالعربية، استخدم العربية الطبيعية.
- كن واضحًا ومفيدًا ومباشرًا.
- في البرمجة، أعطِ كودًا كاملًا وقابلًا للتشغيل عندما يطلب المستخدم ذلك.
- لا تذكر Gemini أو Google أو تفاصيل مزود النموذج للمستخدم.
- لا تقل إنك لا تستطيع المساعدة إلا إذا كان الطلب غير ممكن فعلًا.
`
        }
      ]
    };

    // ==========================================
    // TRY GEMINI KEYS
    // ==========================================

    let lastGeminiError = null;

    for (const key of allKeys) {
      try {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key
            },

            body: JSON.stringify({
              systemInstruction,

              contents,

              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192
              }
            })
          }
        );

        const data = await response.json();

        // ======================================
        // SUCCESS
        // ======================================

        if (
          response.ok &&
          data?.candidates?.[0]?.content?.parts
        ) {
          const answer = data.candidates[0].content.parts
            .map(part =>
              typeof part?.text === "string"
                ? part.text
                : ""
            )
            .join("")
            .trim();

          if (answer) {
            return res.status(200).json({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: answer
                      }
                    ]
                  }
                }
              ],

              model: "gemini-3.8-flash",
              server: "nova-gemini"
            });
          }
        }

        // ======================================
        // SAVE ACTUAL GEMINI ERROR
        // ======================================

        lastGeminiError =
          data?.error?.message ||
          `Gemini HTTP ${response.status}`;

      } catch (error) {
        lastGeminiError = error?.message || "Gemini request failed";
      }
    }

    // ==========================================
    // FALLBACK
    // ==========================================

    try {
      const fallbackResponse = await fetch(
        `https://text.pollinations.ai/${encodeURIComponent(
          cleanMessage
        )}?system=${encodeURIComponent(
          "You are Nova AI 2.0 Pro. Reply in the user's language. If Arabic, reply naturally in Arabic."
        )}`
      );

      if (fallbackResponse.ok) {
        const text = await fallbackResponse.text();

        if (text && text.trim()) {
          return res.status(200).json({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: text.trim()
                    }
                  ]
                }
              }
            ],

            model: "nova-fallback",
            server: "nova-fallback"
          });
        }
      }
    } catch (error) {
      // fallback failed
    }

    // ==========================================
    // REAL ERROR
    // ==========================================

    return res.status(502).json({
      error: "Nova AI لم تستطع الحصول على رد من النموذج.",
      details: lastGeminiError || "Unknown Gemini error"
    });

  } catch (error) {

    console.error("NOVA CHAT ERROR:", error);

    return res.status(500).json({
      error: "حصل خطأ في Nova AI.",
      details: error?.message || "Unknown server error"
    });
  }
}
