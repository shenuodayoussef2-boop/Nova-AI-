// ==========================================
// NOVA AI - IMAGE GENERATION API
// api/generate-image.js
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
        // AUTH
        // ==========================================

        const authHeader =
            req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHENTICATED",
                error: "يجب تسجيل الدخول أولًا"
            });
        }

        const accessToken =
            authHeader.replace("Bearer ", "").trim();

        // ==========================================
        // SUPABASE SERVER CONFIG
        // ==========================================

        const supabaseUrl =
            process.env.SUPABASE_URL;

        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (
            !supabaseUrl ||
            !serviceRoleKey
        ) {
            console.error(
                "Nova AI: Supabase server environment variables are missing"
            );

            return res.status(500).json({
                success: false,
                error: "خدمة Gems غير مهيأة حاليًا"
            });
        }

        // ==========================================
        // VERIFY USER SESSION
        // ==========================================

        const userResponse =
            await fetch(
                `${supabaseUrl}/auth/v1/user`,
                {
                    method: "GET",

                    headers: {
                        "apikey":
                            serviceRoleKey,

                        "Authorization":
                            `Bearer ${accessToken}`
                    }
                }
            );

        let userData = null;

        try {
            userData =
                await userResponse.json();
        } catch (error) {
            userData = null;
        }

        if (
            !userResponse.ok ||
            !userData?.id
        ) {
            return res.status(401).json({
                success: false,
                code: "INVALID_SESSION",
                error: "جلسة تسجيل الدخول غير صالحة"
            });
        }

        // ==========================================
        // REQUEST DATA
        // ==========================================

        const {
            prompt,
            width,
            height,
            aspectRatio,
            quality
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
                error: "وصف الصورة فارغ"
            });
        }

        // ==========================================
        // FAL KEY
        // ==========================================

        const apiKey =
            process.env.FAL_KEY;

        if (!apiKey) {

            console.error(
                "Nova AI: FAL_KEY is missing"
            );

            return res.status(500).json({
                success: false,
                error: "خدمة توليد الصور غير مهيأة حاليًا"
            });
        }

        // ==========================================
        // SPEND GEMS
        // السعر يتم تحديده من Supabase
        // وليس من JavaScript
        // ==========================================

        const gemsResponse =
            await fetch(
                `${supabaseUrl}/rest/v1/rpc/nova_spend_gems`,
                {
                    method: "POST",

                    headers: {
                        "apikey":
                            serviceRoleKey,

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        p_feature:
                            "image_generation",

                        p_description:
                            "توليد صورة باستخدام Nova AI"
                    })
                }
            );

        let gemsResult = null;

        try {
            gemsResult =
                await gemsResponse.json();
        } catch (error) {
            gemsResult = null;
        }

        // ==========================================
        // GEMS RPC ERROR
        // ==========================================

        if (!gemsResponse.ok) {

            console.error(
                "Nova AI Gems RPC Error:",
                gemsResult
            );

            return res.status(500).json({
                success: false,
                code: "GEMS_RPC_ERROR",
                error: "تعذر التحقق من رصيد Gems"
            });
        }

        // ==========================================
        // GEMS DENIED
        // ==========================================

        if (
            !gemsResult ||
            gemsResult.success !== true
        ) {

            return res.status(402).json({
                success: false,

                code:
                    gemsResult?.code ||
                    "GEMS_ERROR",

                error:
                    gemsResult?.message ||
                    "رصيد Gems غير كافٍ",

                feature:
                    gemsResult?.feature ||
                    "image_generation",

                cost:
                    gemsResult?.cost ??
                    10,

                balance:
                    gemsResult?.balance ??
                    null
            });
        }

        // ==========================================
        // IMAGE SIZE
        // ==========================================

        let imageSize =
            "landscape_4_3";

        if (
            aspectRatio === "1:1"
        ) {

            imageSize =
                "square_hd";

        } else if (
            aspectRatio === "16:9"
        ) {

            imageSize =
                "landscape_16_9";

        } else if (
            aspectRatio === "9:16"
        ) {

            imageSize =
                "portrait_16_9";

        } else if (
            aspectRatio === "4:3"
        ) {

            imageSize =
                "landscape_4_3";

        } else if (
            aspectRatio === "3:4"
        ) {

            imageSize =
                "portrait_4_3";
        }

        // ==========================================
        // FAL.AI REQUEST
        // ==========================================

        const response =
            await fetch(
                "https://fal.run/fal-ai/flux/dev",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            `Key ${apiKey}`,

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        prompt:
                            prompt.trim(),

                        image_size:
                            imageSize,

                        num_images: 1,

                        enable_safety_checker:
                            true

                    })
                }
            );

        // ==========================================
        // RESPONSE
        // ==========================================

        let data = null;

        try {

            data =
                await response.json();

        } catch (error) {

            console.error(
                "Nova AI: Invalid fal.ai JSON response"
            );

            return res.status(502).json({
                success: false,
                error:
                    "استجابة غير صالحة من خدمة الصور"
            });
        }

        // ==========================================
        // FAL ERROR
        // ==========================================

        if (!response.ok) {

            console.error(
                "fal.ai STATUS:",
                response.status
            );

            console.error(
                "fal.ai RESPONSE:",
                data
            );

            return res.status(502).json({
                success: false,
                error:
                    "حدث خطأ أثناء توليد الصورة"
            });
        }

        // ==========================================
        // EXTRACT IMAGE
        // ==========================================

        const imageUrl =
            data?.images?.[0]?.url ||
            data?.image?.url ||
            null;

        if (!imageUrl) {

            console.error(
                "Nova AI: No image returned",
                data
            );

            return res.status(502).json({
                success: false,
                error:
                    "لم يتم استلام الصورة من خدمة التوليد"
            });
        }

        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(200).json({

            success: true,

            image:
                imageUrl,

            imageUrl:
                imageUrl,

            url:
                imageUrl,

            gems: {
                spent:
                    gemsResult.cost ?? 10,

                balance:
                    gemsResult.balance_after ??
                    gemsResult.balance ??
                    null
            },

            meta: {
                model:
                    "fal-ai/flux/dev",

                aspectRatio:
                    aspectRatio || "4:3",

                quality:
                    quality || "standard"
            }

        });

    } catch (error) {

        console.error(
            "Nova AI - Image Generation Error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "حدث خطأ أثناء توليد الصورة"
        });
    }
}
