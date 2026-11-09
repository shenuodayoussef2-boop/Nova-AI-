
/**
 * YOVIA AI - Automatic API Connection Fix
 * Version: 1.0.0
 */

(function () {
    "use strict";

    if (window.__YOVIA_AUTO_FIX_LOADED__) return;
    window.__YOVIA_AUTO_FIX_LOADED__ = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (input, options = {}) {
        const url = typeof input === "string"
            ? input
            : input instanceof Request
                ? input.url
                : "";

        // التدخل فقط في طلبات YOVIA AI
        if (!url.includes("/api/chat")) {
            return originalFetch(input, options);
        }

        try {
            const supabase = window.novaSupabase;

            if (!supabase?.auth) {
                throw new Error("Supabase غير جاهز.");
            }

            // الحصول على جلسة المستخدم
            const { data, error } = await supabase.auth.getSession();

            if (error) throw error;

            const token = data?.session?.access_token;

            if (!token) {
                throw new Error("يرجى تسجيل الدخول أولاً.");
            }

            // تجهيز Headers
            const headers = new Headers(
                input instanceof Request ? input.headers : undefined
            );

            new Headers(options.headers || {}).forEach((value, key) => {
                headers.set(key, value);
            });

            // إضافة Authorization تلقائيًا
            headers.set("Authorization", `Bearer ${token}`);

            console.log("YOVIA Auto Fix: Authorization added.");

            // إرسال الطلب بعد إصلاحه
            return originalFetch(input, {
                ...options,
                headers
            });

        } catch (error) {
            console.error("YOVIA Auto Fix Error:", error);

            return new Response(
                JSON.stringify({
                    error: error.message || "تعذر الاتصال.",
                    code: "YOVIA_AUTO_FIX_ERROR"
                }),
                {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }
    };

    console.log("YOVIA AI Auto Fix Loaded Successfully.");
})();
