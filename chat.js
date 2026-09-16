export default async function handler(req, res) {
  // السماح بـ POST فقط
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "يسمح بطلبات POST فقط"
    });
  }

  try {
    const { message } = req.body || {};

    // التحقق من الرسالة
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "الرسالة فارغة"
      });
    }

    // قراءة مفتاح Gemini من Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "مفتاح Gemini غير موجود في إعدادات Vercel"
      });
    }

    // طلب Gemini
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: message.trim()
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // لو Gemini رجع خطأ
    if (!response.ok) {
      return res.status(response.status).json({
        error: "حدث خطأ من Gemini",
        details: data
      });
    }

    // إرسال رد Gemini كما هو إلى script.js
    return res.status(200).json(data);

  } catch (error) {
    console.error("Gemini API Error:", error);

    return res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بـ Gemini",
      details: error.message
    });
  }
}
