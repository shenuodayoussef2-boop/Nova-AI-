// ==========================================
// NOVA AI - GEMINI CHAT API
// يدعم النصوص والصور
// ==========================================

export default async function handler(req, res) {
  // السماح بطلبات POST فقط
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "يسمح بطلبات POST فقط"
    });
  }

  try {
    const {
      message,
      imageData,
      mimeType
    } = req.body || {};

    // التحقق من وجود رسالة أو صورة
    const hasMessage =
      typeof message === "string" && message.trim().length > 0;

    const hasImage =
      typeof imageData === "string" &&
      imageData.length > 0 &&
      typeof mimeType === "string" &&
      mimeType.startsWith("image/");

    if (!hasMessage && !hasImage) {
      return res.status(400).json({
        success: false,
        error: "يجب إرسال رسالة أو صورة"
      });
    }

    // قراءة مفتاح Gemini من إعدادات Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "مفتاح Gemini غير موجود في إعدادات Vercel"
      });
    }

    // تجهيز أجزاء الرسالة
    const parts = [];

    // إضافة النص إذا كان موجودًا
    if (hasMessage) {
      parts.push({
        text: message.trim()
      });
    } else if (hasImage) {
      parts.push({
        text: "حلل الصورة المرفقة واشرح محتواها باللغة العربية."
      });
    }

    // إضافة الصورة إذا كانت موجودة
    if (hasImage) {
      // إزالة بادئة Data URL إذا كانت موجودة
      const cleanBase64 = imageData.includes(",")
        ? imageData.split(",")[1]
        : imageData;

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: cleanBase64
        }
      });
    }

    // إرسال الطلب إلى Gemini
    const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },

    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: `
أنت Nova AI — عقل رقمي صُمم ليصنع أكثر مما يجيب. ⚡

أنت المساعد الذكي الخاص بـ Nova AI، ومن تطوير يوسف شنوده.

أنت متخصص في مساعدة المستخدم في:
- البرمجة 💻
- المعرفة والتعلم 🧠
- الكتابة ✍️
- الإبداع والأفكار 🚀
- تحليل الصور وفهم محتواها 🖼️

هدفك هو مساعدة المستخدم على تحويل أفكاره إلى أشياء حقيقية.

هويتك:
إذا سألك المستخدم "من أنت؟" أو "مين مطورك؟" أو أي سؤال مشابه،
عرّف نفسك باسم Nova AI واذكر أن مطورك هو يوسف شنوده.

لا تقدم نفسك على أنك Gemini أو ChatGPT.
Gemini هو النموذج التقني الذي يعمل خلف Nova AI،
لكنه ليس هويتك أمام المستخدم.

إذا سُئلت عن النموذج التقني الذي يشغلك،
يمكنك توضيح أن Nova AI تستخدم نموذج Gemini من Google
كجزء من البنية التقنية، مع الحفاظ على هويتك كـ Nova AI.

تحدث مع المستخدم بأسلوب طبيعي وودود وذكي.
كن واضحًا ومفيدًا، واجعل إجاباتك عملية ومبدعة عندما يكون ذلك مناسبًا.

Nova AI.
Think. Create. Build. 🚀
            `.trim()
          }
        ]
      },

      contents: [
        {
          role: "user",
          parts
        }
      ]
    })
  }
);

const data = await response.json();
    // التعامل مع أخطاء Gemini
    if (!response.ok) {
      console.error("Gemini Error:", data);

      return res.status(response.status).json({
        success: false,
        error: "حدث خطأ من Gemini",
        details: data
      });
    }

    // إرسال استجابة Gemini إلى script.js
    return res.status(200).json(data);

  } catch (error) {
    console.error("Chat API Error:", error);

    return res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء الاتصال بـ Gemini",
      details: error.message
    });
  }
}
