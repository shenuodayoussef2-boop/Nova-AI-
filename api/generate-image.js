export default async function handler(req, res) {
  // السماح بطلبات POST فقط
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "يسمح بطلبات POST فقط"
    });
  }

  try {
    const { prompt } = req.body || {};

    // التحقق من الوصف
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "وصف الصورة فارغ"
      });
    }

    // قراءة مفتاح fal.ai من Vercel
    const apiKey = process.env.FAL_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "مفتاح fal.ai غير موجود في إعدادات Vercel"
      });
    }

    // طلب توليد الصورة من fal.ai
    const response = await fetch("https://fal.run/fal-ai/flux/dev", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        image_size: "landscape_4_3",
        num_images: 1,
        enable_safety_checker: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "حدث خطأ من fal.ai",
        details: data
      });
    }

    // إرجاع بيانات الصورة إلى الواجهة
    return res.status(200).json({
      success: true,
      image: data.images?.[0]?.url || null,
      data
    });

  } catch (error) {
    console.error("fal.ai API Error:", error);

    return res.status(500).json({
      error: "حدث خطأ أثناء توليد الصورة",
      details: error.message
    });
  }
}
