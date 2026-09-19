// ==========================================
// NOVA AI - EDIT IMAGE API
// ==========================================
// استقبال صورة + وصف
// ثم تعديل الصورة باستخدام fal.ai FLUX Image-to-Image
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

    // ==========================================
    // 1. استقبال البيانات
    // ==========================================

    const { prompt, image } = req.body || {};

    // ==========================================
    // 2. التحقق من الـ prompt
    // ==========================================

    if (
      !prompt ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "وصف التعديل فارغ"
      });
    }

    // ==========================================
    // 3. التحقق من الصورة
    // ==========================================

    if (
      !image ||
      typeof image !== "string" ||
      !image.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "الصورة غير موجودة"
      });
    }

    // ==========================================
    // 4. التحقق من مفتاح fal.ai
    // ==========================================

    const apiKey = process.env.FAL_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "مفتاح FAL_KEY غير موجود في إعدادات Vercel"
      });
    }

    // ==========================================
    // 5. التأكد أن الصورة Data URL
    // ==========================================

    if (!image.startsWith("data:image/")) {
      return res.status(400).json({
        success: false,
        error: "صيغة الصورة غير مدعومة. يجب إرسال صورة بصيغة Data URL."
      });
    }

    // ==========================================
    // 6. تنظيف الـ prompt
    // ==========================================

    const finalPrompt = `
Edit the provided image according to the user's instructions.

IMPORTANT:
- Keep the main person's identity and facial appearance as consistent as possible.
- Preserve the person's recognizable facial features.
- Preserve the general pose and composition unless the user specifically asks to change them.
- Only make the changes requested by the user.
- Create a realistic, high-quality result.

User instructions:
${prompt.trim()}
`.trim();

    // ==========================================
    // 7. إرسال الصورة + الوصف إلى fal.ai
    // ==========================================

    const response = await fetch(
      "https://fal.run/fal-ai/flux/dev/image-to-image",
      {
        method: "POST",

        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          // الصورة الأصلية
          image_url: image,

          // طلب المستخدم
          prompt: finalPrompt,

          // قوة الحفاظ على الصورة الأصلية
          strength: 0.85,

          // عدد خطوات التوليد
          num_inference_steps: 40,

          // مدى الالتزام بالـ prompt
          guidance_scale: 3.5,

          // صورة واحدة
          num_images: 1,

          // تفعيل فحص الأمان
          enable_safety_checker: true,

          // صيغة الناتج
          output_format: "jpeg"
        })
      }
    );

    // ==========================================
    // 8. قراءة استجابة fal.ai
    // ==========================================

    const data = await response.json();

    // ==========================================
    // 9. التعامل مع الخطأ
    // ==========================================

    if (!response.ok) {

      console.error("fal.ai Edit Image Error:", data);

      return res.status(response.status).json({
        success: false,
        error: "حدث خطأ من fal.ai",
        details: data
      });
    }

    // ==========================================
    // 10. استخراج الصورة الناتجة
    // ==========================================

    const generatedImage =
      data?.images?.[0]?.url || null;

    // ==========================================
    // 11. التأكد من وجود الصورة
    // ==========================================

    if (!generatedImage) {

      console.error(
        "fal.ai returned no image:",
        data
      );

      return res.status(500).json({
        success: false,
        error: "لم يتم العثور على الصورة الناتجة من fal.ai",
        data
      });
    }

    // ==========================================
    // 12. إرجاع النتيجة إلى Nova AI
    // ==========================================

    return res.status(200).json({

      success: true,

      image: generatedImage,

      prompt: prompt.trim(),

      data
    });

  } catch (error) {

    // ==========================================
    // 13. خطأ عام
    // ==========================================

    console.error(
      "Nova AI Edit Image Error:",
      error
    );

    return res.status(500).json({

      success: false,

      error: "حدث خطأ أثناء تعديل الصورة",

      details: error?.message || "Unknown error"
    });
  }
}
