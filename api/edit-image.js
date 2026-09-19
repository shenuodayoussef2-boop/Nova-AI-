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

        const apiKey = process.env.FAL_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "FAL_KEY غير موجود في Vercel"
            });
        }

        console.log("========== NOVA EDIT IMAGE ==========");
        console.log("Prompt:", prompt);
        console.log("Image length:", image.length);
        console.log("Image prefix:", image.substring(0, 40));

        const response = await fetch(
            "https://fal.run/fal-ai/flux/dev/image-to-image",
            {
                method: "POST",

                headers: {
                    "Authorization": `Key ${apiKey}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    image_url: image,
                    prompt: prompt.trim(),
                    strength: 0.8,
                    num_inference_steps: 40,
                    guidance_scale: 3.5,
                    num_images: 1,
                    enable_safety_checker: true,
                    output_format: "jpeg"
                })
            }
        );

        const responseText =
            await response.text();

        console.log(
            "FAL STATUS:",
            response.status
        );

        console.log(
            "FAL RESPONSE:",
            responseText
        );

        let data;

        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw_response: responseText
            };
        }

        if (!response.ok) {
            return res.status(200).json({
                success: false,
                error: "fal.ai رفض الطلب",

                status: response.status,

                statusText:
                    response.statusText,

                details: data,

                raw:
                    responseText
            });
        }

        const generatedImage =
            data?.images?.[0]?.url;

        if (!generatedImage) {
            return res.status(200).json({
                success: false,
                error:
                    "fal.ai لم يرجع رابط الصورة",

                details: data
            });
        }

        return res.status(200).json({
            success: true,
            image: generatedImage
        });

    } catch (error) {

        console.error(
            "NOVA EDIT IMAGE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "حدث خطأ داخل Nova AI",

            details:
                error?.message ||
                String(error)
        });
    }
}
