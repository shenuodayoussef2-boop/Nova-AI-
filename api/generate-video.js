// ==========================================
// NOVA AI - VIDEO GENERATION API
// api/generate-video.js
//
// Supports:
// - Text to Video
// - Image to Video
// - Kling V3
// - fal.ai Queue
// ==========================================

export default async function handler(req, res) {

    // ==========================================
    // METHOD
    // ==========================================

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "يسمح بطلبات POST فقط"
        });
    }

    try {

        // ==========================================
        // ENV
        // ==========================================

        const falKey = process.env.FAL_KEY;

        if (!falKey) {

            console.error(
                "Nova AI: FAL_KEY is missing"
            );

            return res.status(500).json({
                success: false,
                error: "خدمة توليد الفيديو غير مهيأة حاليًا"
            });
        }

        // ==========================================
        // REQUEST
        // ==========================================

        const {
            prompt,
            image,
            duration,
            aspectRatio,
            generateAudio
        } = req.body || {};

        // ==========================================
        // VALIDATE PROMPT
        // ==========================================

        if (
            !prompt ||
            typeof prompt !== "string" ||
            !prompt.trim()
        ) {

            return res.status(400).json({
                success: false,
                error: "وصف الفيديو فارغ"
            });

        }

        // fal recommends keeping the Kling V3 prompt
        // under approximately 2500 characters.
        const cleanPrompt =
            prompt
                .trim()
                .slice(0, 2400);

        // ==========================================
        // MODELS
        // ==========================================

        const TEXT_TO_VIDEO_MODEL =
            "fal-ai/kling-video/v3/turbo/standard/text-to-video";

        const IMAGE_TO_VIDEO_MODEL =
            "fal-ai/kling-video/v3/standard/image-to-video";

        // ==========================================
        // DETERMINE MODE
        // ==========================================

        const hasImage =
            typeof image === "string" &&
            image.trim().length > 0;

        const model =
            hasImage
                ? IMAGE_TO_VIDEO_MODEL
                : TEXT_TO_VIDEO_MODEL;

        // ==========================================
        // NORMALIZE DURATION
        // ==========================================

        const allowedDurations = [
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15"
        ];

        let finalDuration =
            String(duration || "5");

        if (!allowedDurations.includes(finalDuration)) {
            finalDuration = "5";
        }

        // ==========================================
        // NORMALIZE ASPECT RATIO
        // ==========================================

        const allowedAspectRatios = [
            "16:9",
            "9:16",
            "1:1"
        ];

        let finalAspectRatio =
            aspectRatio || "16:9";

        if (
            !allowedAspectRatios.includes(
                finalAspectRatio
            )
        ) {
            finalAspectRatio = "16:9";
        }

        // ==========================================
        // BUILD INPUT
        // ==========================================

        const input = {
            prompt: cleanPrompt,
            duration: finalDuration
        };

        // ==========================================
        // TEXT TO VIDEO
        // ==========================================

        if (!hasImage) {

            input.aspect_ratio =
                finalAspectRatio;

        }

        // ==========================================
        // IMAGE TO VIDEO
        // ==========================================

        if (hasImage) {

            /*
             * fal supports publicly accessible URLs
             * and Base64 Data URIs for file inputs.
             *
             * This lets Nova send the uploaded image
             * directly without exposing FAL_KEY.
             */

            input.start_image_url =
                image.trim();

            input.generate_audio =
                typeof generateAudio === "boolean"
                    ? generateAudio
                    : true;

            input.negative_prompt =
                "blur, distort, low quality, identity change, unwanted objects, unwanted people, inconsistent appearance";

            input.cfg_scale = 0.5;
        }

        // ==========================================
        // QUEUE ENDPOINT
        // ==========================================

        const queueEndpoint =
            `https://queue.fal.run/${model}`;

        // ==========================================
        // SUBMIT
        // ==========================================

        const response =
            await fetch(queueEndpoint, {

                method: "POST",

                headers: {
                    "Authorization":
                        `Key ${falKey}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    input
                })
            });

        // ==========================================
        // PARSE RESPONSE
        // ==========================================

        let data = null;

        try {

            data =
                await response.json();

        } catch (error) {

            console.error(
                "Nova AI - fal invalid JSON:",
                error
            );

            return res.status(502).json({
                success: false,
                error:
                    "استجابة غير صالحة من خدمة الفيديو"
            });

        }

        // ==========================================
        // API ERROR
        // ==========================================

        if (!response.ok) {

            console.error(
                "Nova AI - fal video submit:",
                response.status,
                data
            );

            return res.status(502).json({
                success: false,
                error:
                    "حدث خطأ أثناء إرسال طلب الفيديو"
            });

        }

        // ==========================================
        // REQUEST ID
        // ==========================================

        const requestId =
            data?.request_id ||
            data?.requestId ||
            null;

        if (!requestId) {

            console.error(
                "Nova AI - Missing request_id:",
                data
            );

            return res.status(502).json({
                success: false,
                error:
                    "لم يتم الحصول على رقم طلب الفيديو"
            });

        }

        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(200).json({

            success: true,

            status: "IN_QUEUE",

            requestId,

            request_id: requestId,

            model,

            mode:
                hasImage
                    ? "image-to-video"
                    : "text-to-video",

            duration:
                finalDuration,

            aspectRatio:
                finalAspectRatio

        });

    } catch (error) {

        console.error(
            "Nova AI - Generate Video Error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "حدث خطأ داخل Nova AI أثناء إنشاء الفيديو"
        });

    }

}
