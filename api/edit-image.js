// ==========================================
// NOVA AI - HUGGING FACE IMAGE EDIT DEBUG
// api/edit-image.js
// ==========================================

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "يسمح بطلبات POST فقط"
        });
    }

    try {
        const { prompt, image } = req.body || {};

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                success: false,
                error: "وصف التعديل فارغ"
            });
        }

        if (!image || typeof image !== "string") {
            return res.status(400).json({
                success: false,
                error: "لم يتم إرسال الصورة"
            });
        }

        // ==========================================
        // Hugging Face Token
        // ==========================================

        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({
                success: false,
                error: "HF_TOKEN غير موجود في Vercel"
            });
        }

        // ==========================================
        // قراءة الصورة
        // ==========================================

        const match = image.match(
            /^data:(image\/[^;]+);base64,(.+)$/s
        );

        if (!match) {
            return res.status(400).json({
                success: false,
                error: "صيغة الصورة غير صحيحة"
            });
        }

        const mimeType = match[1];
        const base64Image = match[2];

        // ==========================================
        // تحويل Base64 إلى Buffer
        // ==========================================

        const imageBuffer = Buffer.from(
            base64Image,
            "base64"
        );

        // ==========================================
        // Hugging Face
        // ==========================================

        const model = "Qwen/Qwen-Image-Edit";

        const endpoint =
            `https://router.huggingface.co/hf-inference/models/${model}`;

        const response = await fetch(endpoint, {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": mimeType,
                "Accept": "image/*"
            },

            body: imageBuffer
        });

        const responseType =
            response.headers.get("content-type") || "";

        // ==========================================
        // لو حصل خطأ
        // ==========================================

        if (!response.ok) {

            let details = "";

            try {
                details = await response.text();
            } catch {
                details = "تعذر قراءة استجابة Hugging Face";
            }

            console.error(
                "HF STATUS:",
                response.status
            );

            console.error(
                "HF RESPONSE:",
                details
            );

            return res.status(200).json({
                success: false,

                error: "حدث خطأ من Hugging Face",

                debug: {
                    status: response.status,
                    contentType: responseType,
                    details: details
                }
            });
        }

        // ==========================================
        // التأكد من أن الناتج صورة
        // ==========================================

        if (!responseType.startsWith("image/")) {

            let details = "";

            try {
                details = await response.text();
            } catch {
                details = "استجابة غير متوقعة";
            }

            return res.status(200).json({
                success: false,
                error: "Hugging Face لم يرجع صورة",
                debug: {
                    contentType: responseType,
                    details: details
                }
            });
        }

        // ==========================================
        // الصورة الناتجة
        // ==========================================

        const resultBuffer =
            Buffer.from(await response.arrayBuffer());

        const resultBase64 =
            resultBuffer.toString("base64");

        return res.status(200).json({
            success: true,

            image:
                `data:${responseType};base64,${resultBase64}`
        });

    } catch (error) {

        console.error(
            "NOVA IMAGE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "حدث خطأ داخل Nova AI",
            debug: {
                message:
                    error?.message || String(error),

                stack:
                    error?.stack || null
            }
        });
    }
}
