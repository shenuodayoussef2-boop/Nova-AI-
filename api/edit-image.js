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
                error: "FAL_KEY غير موجود في إعدادات Vercel"
            });
        }

        /*
         * fal.ai يدعم Data URI / Base64
         * مثل:
         * data:image/jpeg;base64,...
         */

        if (!image.startsWith("data:image/")) {
            return res.status(400).json({
                success: false,
                error: "صيغة الصورة غير صحيحة. يجب أن تكون Data URI"
            });
        }

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

                    strength: 0.85,

                    num_inference_steps: 40,

                    guidance_scale: 3.5,

                    num_images: 1,

                    enable_safety_checker: true,

                    output_format: "jpeg"
                })
            }
        );

        const data = await falResponse.json();

        console.log(
            "FAL STATUS:",
            falResponse.status
        );

        console.log(
            "FAL RESPONSE:",
            JSON.stringify(data)
        );

        if (!falResponse.ok) {
            return res.status(falResponse.status).json({
                success: false,
                error: "حدث خطأ من fal.ai",
                fal_status: falResponse.status,
                details: data
            });
        }

        const imageUrl =
            data?.images?.[0]?.url || null;

        if (!imageUrl) {
            return res.status(500).json({
                success: false,
                error: "fal.ai لم يرجع رابط الصورة",
                details: data
            });
        }

        return res.status(200).json({
            success: true,
            image: imageUrl
        });

    } catch (error) {

        console.error(
            "EDIT IMAGE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "حدث خطأ أثناء تعديل الصورة",
            details: error?.message || String(error)
        });
    }
}
