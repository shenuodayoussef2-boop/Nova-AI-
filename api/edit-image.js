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
            process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "مفتاح Gemini غير موجود في Vercel"
            });
        }

        const match = image.match(
            /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        );

        if (!match) {
            return res.status(400).json({
                success: false,
                error: "صيغة الصورة غير صحيحة"
            });
        }

        const mimeType = match[1];
        const base64Image = match[2];

        const geminiPrompt = `
Edit the provided image according to this request:

${prompt}

Preserve the person's identity, facial features,
skin tone, hairstyle, and overall appearance as much
as possible. Change only what the user requested.
Make the result realistic and high quality.
Return the edited image.
        `.trim();

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent",
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

        if (!response.ok) {
            console.error("Gemini Error:", data);

            return res.status(response.status).json({
                success: false,
                error: "حدث خطأ من Gemini",
                details: data
            });
        }

        const parts =
            data?.candidates?.[0]?.content?.parts || [];

        const imagePart = parts.find(
            part => part?.inlineData || part?.inline_data
        );

        const imageData =
            imagePart?.inlineData ||
            imagePart?.inline_data;

        if (!imageData?.data) {
            return res.status(500).json({
                success: false,
                error: "Gemini لم يرجع صورة",
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
        console.error("Gemini Edit Image Error:", error);

        return res.status(500).json({
            success: false,
            error: "حدث خطأ أثناء تعديل الصورة",
            details: error.message
        });
    }
}
