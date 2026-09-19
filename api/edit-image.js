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

        const apiKey =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY ||
            process.env.GOOGLE_GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "مفتاح Gemini غير موجود في Vercel"
            });
        }

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

        const geminiPrompt = `
Edit the attached image according to this request:

${prompt.trim()}

Preserve the person's identity, facial features,
skin tone, hairstyle, and overall appearance.
Change only what the user requested.
Make the result realistic and high quality.
Return the edited image.
        `.trim();

        const model = "gemini-3.1-flash-image";

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
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
                        responseModalities: ["TEXT", "IMAGE"]
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
        console.log("GEMINI RESPONSE:", JSON.stringify(data));

        if (!response.ok) {
            return res.status(200).json({
                success: false,
                error: "حدث خطأ من Gemini",
                status: response.status,
                details: data
            });
        }

        const parts =
            data?.candidates?.[0]?.content?.parts || [];

        const imagePart = parts.find(
            part =>
                part?.inlineData?.data ||
                part?.inline_data?.data
        );

        const imageData =
            imagePart?.inlineData ||
            imagePart?.inline_data;

        if (!imageData?.data) {
            return res.status(200).json({
                success: false,
                error: "Gemini لم يرجع صورة معدلة",
                details: data
            });
        }

        const resultMimeType =
            imageData.mimeType ||
            imageData.mime_type ||
            "image/jpeg";

        return res.status(200).json({
            success: true,
            image: `data:${resultMimeType};base64,${imageData.data}`
        });

    } catch (error) {
        console.error("GEMINI EDIT ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "حدث خطأ داخل Nova AI",
            details: error?.message || String(error)
        });
    }
}
