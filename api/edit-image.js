// ==========================================
// NOVA AI - GEMINI IMAGE EDIT API
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

        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
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

        const apiKey =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "مفتاح Gemini غير موجود في Vercel"
            });
        }

        // استخراج بيانات الصورة من Data URI
        const imageMatch = image.match(
            /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        );

        if (!imageMatch) {
            return res.status(400).json({
                success: false,
                error: "صيغة الصورة غير صحيحة"
            });
        }

        const mimeType = imageMatch[1];
        const base64Image = imageMatch[2];

        const editPrompt = `
Edit the provided image according to the following request:

${prompt.trim()}

Preserve the person's identity, facial features,
skin tone, hairstyle, and general appearance as much
as possible.

Change only what the user requested.
Make the result realistic, natural, and high quality.
Return the edited image.
        `.trim();

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },

                body: JSON.stringify({
                    model: "gemini-3.1-flash-image",

                    input: [
                        {
                            type: "text",
                            text: editPrompt
                        },
                        {
                            type: "image",
                            mime_type: mimeType,
                            data: base64Image
                        }
                    ],

                    response_format: {
                        type: "image",
                        mime_type: "image/png"
                    }
                })
            }
        );

        const rawText = await response.text();

        let data;

        try {
            data = JSON.parse(rawText);
        } catch {
            data = {
                raw: rawText
            };
        }

        console.log("GEMINI STATUS:", response.status);

        if (!response.ok) {
            console.error(
                "GEMINI API ERROR:",
                JSON.stringify(data)
            );

            return res.status(response.status).json({
                success: false,
                error: "حدث خطأ من Gemini",
                status: response.status,
                details: data
            });
        }

        // البحث عن الصورة الناتجة
        const outputImage =
            data?.output?.find(
                item => item?.type === "image"
            );

        const imageBase64 =
            outputImage?.data ||
            data?.output_image?.data ||
            null;

        const resultMimeType =
            outputImage?.mime_type ||
            data?.output_image?.mime_type ||
            "image/png";

        if (!imageBase64) {
            console.error(
                "Gemini did not return an image:",
                JSON.stringify(data)
            );

            return res.status(500).json({
                success: false,
                error: "Gemini لم يرجع صورة معدلة",
                details: data
            });
        }

        return res.status(200).json({
            success: true,
            image: `data:${resultMimeType};base64,${imageBase64}`
        });

    } catch (error) {
        console.error(
            "NOVA GEMINI EDIT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "حدث خطأ أثناء تعديل الصورة",
            details: error?.message || String(error)
        });
    }
}
