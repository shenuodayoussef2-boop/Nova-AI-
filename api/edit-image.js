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

        // التحقق من وصف التعديل
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

        // التحقق من الصورة
        if (
            !image ||
            typeof image !== "string"
        ) {
            return res.status(400).json({
                success: false,
                error: "لم يتم إرسال الصورة"
            });
        }

        // قراءة مفتاح Gemini من إعدادات Vercel
        const apiKey =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "مفتاح Gemini غير موجود في Vercel"
            });
        }

        // استخراج نوع الصورة وبيانات Base64
        const imageMatch = image.match(
            /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        );

        if (!imageMatch) {
            return res.status(400).json({
                success: false,
                error: "صيغة الصورة غير صحيحة. يجب أن تكون Base64 Data URI"
            });
        }

        const mimeType = imageMatch[1];
        const base64Image = imageMatch[2];

        const geminiPrompt = `
You are an expert photo editor.

Edit the attached image according to the user's request.

User request:
${prompt.trim()}

Important instructions:
- Preserve the person's identity and facial features as much as possible.
- Preserve the person's skin tone, hairstyle, and general appearance.
- Change only the elements requested by the user.
- Make the result realistic, natural, and high quality.
- Do not add unnecessary changes.
- Return the edited image.
        `.trim();

        // نموذج Gemini المخصص لإنشاء وتعديل الصور
        const model = "gemini-3.1-flash-image";

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: geminiPrompt
                                },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Image
                                    }
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        responseModalities: [
                            "IMAGE"
                        ]
                    }
                })
            }
        );

        const rawResponse =
            await geminiResponse.text();

        let data;

        try {
            data = JSON.parse(rawResponse);
        } catch {
            data = {
                raw: rawResponse
            };
        }

        console.log(
            "GEMINI STATUS:",
            geminiResponse.status
        );

        if (!geminiResponse.ok) {
            console.error(
                "GEMINI ERROR:",
                JSON.stringify(data)
            );

            return res.status(geminiResponse.status).json({
                success: false,
                error: "حدث خطأ من Gemini",
                status: geminiResponse.status,
                details: data
            });
        }

        const parts =
            data?.candidates?.[0]?.content?.parts || [];

        // البحث عن جزء الصورة في رد Gemini
        const imagePart = parts.find(
            part =>
                part?.inlineData?.data ||
                part?.inline_data?.data
        );

        const imageData =
            imagePart?.inlineData ||
            imagePart?.inline_data;

        if (
            !imageData ||
            !imageData.data
        ) {
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

        const outputMimeType =
            imageData.mimeType ||
            imageData.mime_type ||
            "image/png";

        const generatedImage =
            `data:${outputMimeType};base64,${imageData.data}`;

        return res.status(200).json({
            success: true,
            image: generatedImage
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
