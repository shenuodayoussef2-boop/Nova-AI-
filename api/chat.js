export default async function handler(req, res) {
  // ==============================
  // NOVA AI 2.0 PRO - CHAT API
  // ==============================

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-nova-key"
  );

  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // POST only
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST only"
    });
  }

  try {
    const { message } = req.body || {};

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
    // 1️⃣ GEMINI
    // ==========================================

    const allKeys = (process.env.GEMINI_API_KEY || "")
      .split(",")
      .map(key => key.trim())
      .filter(Boolean);

    for (const key of allKeys) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [
                  {
                    text: `
أنت Nova AI 2.0 Pro من تطوير يوسف شنوده.

كن مساعدًا ذكيًا ومفيدًا.
أجب باللغة التي يستخدمها المستخدم.
إذا كان المستخدم يتحدث بالعربية، استخدم العربية بشكل طبيعي.
لا تذكر اسم Gemini أو تفاصيل مزود النموذج للمستخدم.
`
                  }
                ]
              },

              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: cleanMessage
                    }
                  ]
                }
              ]
            })
          }
        );

        const data = await response.json();

        if (
          response.ok &&
          data?.candidates?.[0]?.content?.parts?.[0]?.text
        ) {
          const answer =
            data.candidates[0].content.parts[0].text;

          // الشكل الذي يفهمه script.js الحالي
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

            // صيغة إضافية لو احتجتها لاحقًا
            model: "nova-2.0-pro",
            choices: [
              {
                message: {
                  content: answer
                }
              }
            ],

            server: "nova-private"
          });
        }

      } catch (error) {
        // نجرب المفتاح التالي
        continue;
      }
    }

    // ==========================================
    // 2️⃣ FALLBACK
    // ==========================================

    try {
      const fallbackResponse = await fetch(
        `https://text.pollinations.ai/${encodeURIComponent(cleanMessage)}?system=${encodeURIComponent(
          "You are Nova AI 2.0 Pro developed by Youssef Shenouda. Reply in Arabic when appropriate. Never mention Gemini."
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

            model: "nova-2.0-pro",
            choices: [
              {
                message: {
                  content: text.trim()
                }
              }
            ],

            server: "nova-private-fallback"
          });
        }
      }
    } catch (error) {
      // ننتقل للرسالة الاحتياطية
    }

    // ==========================================
    // 3️⃣ FINAL RESPONSE
    // ==========================================

    const finalMessage =
      "أهلاً! أنا Nova AI 2.0 Pro 👋 جاهز أساعدك. جرّب تبعتلي طلبك مرة تانية.";

    return res.status(200).json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: finalMessage
              }
            ]
          }
        }
      ],

      model: "nova-2.0-pro",
      choices: [
        {
          message: {
            content: finalMessage
          }
        }
      ],

      server: "nova-private"
    });

  } catch (error) {

    const errorMessage =
      "حصل خطأ بسيط في Nova AI. جرّب إرسال الرسالة مرة تانية.";

    return res.status(200).json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: errorMessage
              }
            ]
          }
        }
      ],

      model: "nova-2.0-pro",
      choices: [
        {
          message: {
            content: errorMessage
          }
        }
      ],

      server: "nova-private"
    });
  }
}
