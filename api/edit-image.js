export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "يسمح بطلبات POST فقط"
        });
    }

    try {
        const { prompt, image } = req.body || {};

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: "وصف التعديل فارغ"
            });
        }

        if (!image) {
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

        console.log("IMAGE TYPE:", typeof image);
        console.log(
            "IMAGE LENGTH:",
            image.length
        );

        const falResponse = await fetch(
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

                    strength: 0.75,

                    num_inference_steps: 40,

                    guidance_scale: 3.5,

                    num_images: 1,

                    enable_safety_checker: true,

                    output_format: "jpeg"
                })
            }
        );

        const rawText =
            await falResponse.text();

        console.log(
            "FAL STATUS:",
            falResponse.status
        );

        console.log(
            "FAL RAW RESPONSE:",
            rawText
        );

        let data;

        try {
            data = JSON.parse(rawText);
        } catch {
            data = {
                raw: rawText
            };
        }

        if (!falResponse.ok) {
            return res.status(500).json({
                success: false,

                error:
                    "fal.ai رفض الطلب",

                fal_status:
                    falResponse.status,

                fal_status_text:
                    falResponse.statusText,

                details:
                    data
            });
        }

        const generatedImage =
            data?.images?.[0]?.url;

        if (!generatedImage) {
            return res.status(500).json({
                success: false,

                error:
                    "fal.ai استجاب ولكن لم يرجع صورة",

                details:
                    data
            });
        }

        return res.status(200).json({
            success: true,
            image: generatedImage
        });

    } catch (error) {

        console.error(
            "EDIT IMAGE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            error:
                "حدث خطأ داخل API",

            details:
                error?.message ||
                String(error)
        });
    }
}
