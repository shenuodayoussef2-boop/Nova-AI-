// ==========================================
// NOVA AI - MEDIA STATUS API
// api/media-status.js
//
// Checks fal.ai Queue status
// and returns the generated video
// when completed.
// ==========================================

export default async function handler(req, res) {

    // ==========================================
    // METHOD
    // ==========================================

    if (
        req.method !== "GET" &&
        req.method !== "POST"
    ) {

        return res.status(405).json({
            success: false,
            error:
                "يسمح بطلبات GET أو POST فقط"
        });

    }

    try {

        // ==========================================
        // ENV
        // ==========================================

        const falKey =
            process.env.FAL_KEY;

        if (!falKey) {

            console.error(
                "Nova AI: FAL_KEY is missing"
            );

            return res.status(500).json({
                success: false,
                error:
                    "خدمة الفيديو غير مهيأة حاليًا"
            });

        }

        // ==========================================
        // REQUEST DATA
        // ==========================================

        let requestId = null;
        let model = null;

        if (req.method === "GET") {

            requestId =
                req.query?.requestId ||
                req.query?.request_id ||
                null;

            model =
                req.query?.model ||
                null;

        } else {

            const body =
                req.body || {};

            requestId =
                body.requestId ||
                body.request_id ||
                null;

            model =
                body.model ||
                null;

        }

        // ==========================================
        // VALIDATE REQUEST ID
        // ==========================================

        if (
            !requestId ||
            typeof requestId !== "string"
        ) {

            return res.status(400).json({
                success: false,
                error:
                    "رقم طلب الفيديو غير موجود"
            });

        }

        // ==========================================
        // ALLOWED MODELS
        // ==========================================

        const allowedModels = {

            "fal-ai/kling-video/v3/turbo/standard/text-to-video":
                "fal-ai/kling-video/v3/turbo/standard/text-to-video",

            "fal-ai/kling-video/v3/standard/image-to-video":
                "fal-ai/kling-video/v3/standard/image-to-video"

        };

        /*
         * We never allow the client to provide
         * an arbitrary model URL.
         *
         * This prevents this endpoint from becoming
         * an open proxy to fal.ai.
         */

        const selectedModel =
            allowedModels[model] ||
            null;

        if (!selectedModel) {

            return res.status(400).json({
                success: false,
                error:
                    "موديل الفيديو غير صالح"
            });

        }

        // ==========================================
        // STATUS ENDPOINT
        // ==========================================

        const statusEndpoint =
            `https://queue.fal.run/${selectedModel}/requests/${encodeURIComponent(requestId)}/status`;

        const statusResponse =
            await fetch(
                statusEndpoint,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Key ${falKey}`
                    }
                }
            );

        let statusData = null;

        try {

            statusData =
                await statusResponse.json();

        } catch (error) {

            statusData = null;

        }

        // ==========================================
        // STATUS ERROR
        // ==========================================

        if (!statusResponse.ok) {

            console.error(
                "Nova AI - fal status error:",
                statusResponse.status,
                statusData
            );

            return res.status(502).json({
                success: false,
                error:
                    "تعذر معرفة حالة الفيديو"
            });

        }

        // ==========================================
        // NORMALIZE STATUS
        // ==========================================

        const status =
            String(
                statusData?.status ||
                "UNKNOWN"
            ).toUpperCase();

        // ==========================================
        // FAILED
        // ==========================================

        if (status === "FAILED") {

            return res.status(200).json({

                success: false,

                status: "FAILED",

                requestId,

                error:
                    "فشل توليد الفيديو"

            });

        }

        // ==========================================
        // IN QUEUE
        // ==========================================

        if (
            status === "IN_QUEUE" ||
            status === "QUEUED"
        ) {

            return res.status(200).json({

                success: true,

                status: "IN_QUEUE",

                requestId,

                model: selectedModel

            });

        }

        // ==========================================
        // IN PROGRESS
        // ==========================================

        if (
            status === "IN_PROGRESS" ||
            status === "PROCESSING"
        ) {

            return res.status(200).json({

                success: true,

                status: "IN_PROGRESS",

                requestId,

                model: selectedModel,

                logs:
                    statusData?.logs ||
                    []

            });

        }

        // ==========================================
        // COMPLETED
        // ==========================================

        if (
            status === "COMPLETED" ||
            status === "SUCCESS"
        ) {

            // ==========================================
            // RESULT ENDPOINT
            // ==========================================

            const resultEndpoint =
                `https://queue.fal.run/${selectedModel}/requests/${encodeURIComponent(requestId)}`;

            const resultResponse =
                await fetch(
                    resultEndpoint,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Key ${falKey}`
                        }
                    }
                );

            let resultData = null;

            try {

                resultData =
                    await resultResponse.json();

            } catch (error) {

                resultData = null;

            }

            // ==========================================
            // RESULT ERROR
            // ==========================================

            if (!resultResponse.ok) {

                console.error(
                    "Nova AI - fal result error:",
                    resultResponse.status,
                    resultData
                );

                return res.status(502).json({

                    success: false,

                    status: "COMPLETED",

                    error:
                        "الفيديو انتهى لكن تعذر الحصول على النتيجة"

                });

            }

            // ==========================================
            // VIDEO URL
            // ==========================================

            const videoUrl =
                resultData?.video?.url ||
                resultData?.data?.video?.url ||
                resultData?.output?.video?.url ||
                resultData?.url ||
                resultData?.data?.url ||
                null;

            // ==========================================
            // NO VIDEO
            // ==========================================

            if (!videoUrl) {

                console.error(
                    "Nova AI - Video URL missing:",
                    resultData
                );

                return res.status(502).json({

                    success: false,

                    status: "COMPLETED",

                    error:
                        "لم يتم العثور على رابط الفيديو"

                });

            }

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(200).json({

                success: true,

                status: "COMPLETED",

                requestId,

                model: selectedModel,

                videoUrl,

                video: videoUrl,

                url: videoUrl,

                file: {

                    fileName:
                        resultData?.video?.file_name ||
                        "nova-video.mp4",

                    contentType:
                        resultData?.video?.content_type ||
                        "video/mp4",

                    fileSize:
                        resultData?.video?.file_size ||
                        null

                }

            });

        }

        // ==========================================
        // UNKNOWN STATUS
        // ==========================================

        return res.status(200).json({

            success: true,

            status,

            requestId,

            model: selectedModel,

            logs:
                statusData?.logs ||
                []

        });

    } catch (error) {

        console.error(
            "Nova AI - Media Status Error:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "حدث خطأ أثناء متابعة الفيديو"

        });

    }

}
