
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "GEMINI_API_KEY is missing"
    });
  }

  try {
    const { prompt, format = "txt" } = req.body || {};

    const allowedFormats = [
      "txt", "md", "html", "json",
      "csv", "py", "js", "php", "css"
    ];

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "اكتب وصف الملف المطلوب"
      });
    }

    if (!allowedFormats.includes(format)) {
      return res.status(400).json({
        error: "صيغة الملف غير مدعومة"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `أنشئ محتوى ملف بصيغة ${format} حسب الطلب التالي. أعد محتوى الملف فقط دون مقدمات أو Markdown fences:\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.4
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "File generation failed"
      });
    }

    const content = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!content) {
      return res.status(502).json({
        error: "لم يتم إنشاء محتوى الملف"
      });
    }

    return res.status(200).json({
      content,
      format
    });

  } catch (error) {
    return res.status(500).json({
      error: "حدث خطأ أثناء إنشاء الملف"
    });
  }
}
