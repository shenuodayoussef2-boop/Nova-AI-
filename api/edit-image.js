// ==========================================
// NOVA AI - HUGGING FACE IMAGE EDIT API
// api/edit-image.js
// ==========================================

export default async function handler(req, res) {
    // السماح بـ POST فقط
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "يسمح بطلبات POST فقط"
        });
    }

    try {
        const { prompt, image } = req.body || {};

        // ==========================================
        // 1. التحقق من الـ Prompt
        // ==========================================

        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({
                success: false,
                error: "وصف التعديل فارغ"
            });
        }

        // ==========================================
        // 2. التحقق من الصورة
        // ==========================================

        if (!image || typeof image !== "string") {
            return res.status(400).json({
                success: false,
                error: "لم يتم إرسال الصورة"
            });
        }

        // ==========================================
        // 3. قراءة Hugging Face Token
        // ==========================================

        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({
                success: false,
                error: "HF_TOKEN غير موجود في Vercel"
            });
        }

        // ==========================================
        // 4. استخراج نوع الصورة و Base64
        // ==========================================

        const imageMatch = image.match(
            /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s
        );

        if (!imageMatch) {
            return res.status(400).json({
                success: false,
                error: "صيغة الصورة غير صحيحة. يجب إرسال Data URL للصورة."
            });
        }

        const mimeType = imageMatch[1];
        const base64Image = imageMatch[2];

        // ==========================================
        // 5. تحويل Base64 إلى Buffer
        // ==========================================

        const imageBuffer = Buffer.from(base64Image, "base64");

        // ==========================================
        // 6. Prompt الخاص بـ Nova AI
        // ==========================================

        const finalPrompt = `
Edit the provided image according to the user's request.

User request:
${prompt.trim()}

Important instructions:
- Preserve the person's identity and facial features.
- Preserve the person's general appearance unless the user explicitly asks for a change.
- Change only what the user requested.
- Keep the image realistic and natural.
- Maintain realistic lighting, proportions, anatomy, and details.
- Do not unnecessarily change the background or other parts of the image.
`.trim();

        // ==========================================
        // 7. Hugging Face Inference API
        // ==========================================

        const model = "Qwen/Qwen-Image-Edit";

        /*
         * Hugging Face Inference Providers
         *
         * نستخدم الـ API الحالي الخاص بـ
         * Image-to-Image.
         *
         * provider=auto يسمح لـ Hugging Face
         * باختيار Provider متاح للموديل.
         */

        const response = await fetch(
            `https://router.huggingface.co/hf-inference/models/${model}`,
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${hfToken}`,
                    "Content-Type": "application/json",
                    "Accept": "image/*"
                },

                body: JSON.stringify({
                    inputs: base64Image,

                    parameters: {
                        prompt: finalPrompt
                    }
                })
            }
        );

        // ==========================================
        // 8. قراءة الاستجابة
        // ==========================================

        const contentType =
            response.headers.get("content-type") || "";

        console.log(
            "HUGGING FACE STATUS:",
            response.status
        );

        console.log(
            "HUGGING FACE CONTENT TYPE:",
            contentType
        );

        // ==========================================
        // 9. لو فيه خطأ
        // ==========================================

        if (!response.ok) {
            let errorDetails = "";

            try {
                if (contentType.includes("application/json")) {
                    const errorJson = await response.json();

                    errorDetails =
                        errorJson?.error ||
                        errorJson?.message ||
                        JSON.stringify(errorJson);
                } else {
                    errorDetails = await response.text();
                }
            } catch {
                errorDetails = "تعذر قراءة تفاصيل الخطأ";
            }

            console.error(
                "HUGGING FACE ERROR:",
                errorDetails
            );

            return res.status(200).json({
                success: false,
                error: "حدث خطأ من Hugging Face",
                status: response.status,
                details: errorDetails
            });
        }

        // ==========================================
        // 10. التأكد أن الناتج صورة
        // ==========================================

        if (!contentType.startsWith("image/")) {
            let unexpectedResponse = "";

            try {
                unexpectedResponse = await response.text();
            } catch {
                unexpectedResponse = "استجابة غير متوقعة";
            }

            console.error(
                "UNEXPECTED HF RESPONSE:",
                unexpectedResponse
            );

            return res.status(200).json({
                success: false,
                error: "Hugging Face لم يرجع صورة",
                details: unexpectedResponse
            });
        }

        // ==========================================
        // 11. تحويل الصورة الناتجة إلى Base64
        // ==========================================

        const resultBuffer =
            Buffer.from(await response.arrayBuffer());

        const resultBase64 =
            resultBuffer.toString("base64");

        // ==========================================
        // 12. إرسال الصورة إلى Nova AI
        // ==========================================

        return res.status(200).json({
            success: true,
            image: `data:${contentType};base64,${resultBase64}`
        });

    } catch (error) {
        // ==========================================
        // ERROR
        // ==========================================

        console.error(
            "NOVA AI IMAGE EDIT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "حدث خطأ داخل Nova AI",
            details: error?.message || String(error)
        });
    }
}
