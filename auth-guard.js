(async function () {
    const supabaseClient = window.novaSupabase;

    if (!supabaseClient) {
        console.error("Nova: Supabase client not found.");
        window.location.replace("login.html");
        return;
    }

    let redirecting = false;

    const redirectToLogin = () => {
        if (redirecting) return;
        redirecting = true;

        if (!window.location.pathname.endsWith("login.html")) {
            window.location.replace("login.html");
        }
    };

    try {
        // ننتظر تحميل الجلسة المحفوظة
        const {
            data: { session },
            error
        } = await window.novaSupabase.auth.getSession();

        if (error) {
            console.error(
                "Nova Auth Session Error:",
                error
            );

            redirectToLogin();
            return;
        }

        // مفيش تسجيل دخول
        if (!session || !session.user) {
            console.log("Nova: No active session.");
            redirectToLogin();
            return;
        }

        // المستخدم مسجل دخول
        window.novaUser = session.user;

        console.log(
            "Nova: User authenticated:",
            session.user.email
        );

        // مراقبة تغيير حالة الدخول
        supabaseClient.auth.onAuthStateChange(
            (event, newSession) => {

                console.log(
                    "Nova Auth Event:",
                    event
                );

                // تسجيل الخروج
                if (event === "SIGNED_OUT") {
                    window.novaUser = null;
                    redirectToLogin();
                    return;
                }

                // انتهت الجلسة أو لم تعد موجودة
                if (!newSession) {
                    window.novaUser = null;
                    redirectToLogin();
                    return;
                }

                // تحديث بيانات المستخدم
                if (newSession.user) {
                    window.novaUser = newSession.user;
                }
            }
        );

    } catch (error) {

        console.error(
            "Nova Auth Guard Error:",
            error
        );

        redirectToLogin();
    }
})();
