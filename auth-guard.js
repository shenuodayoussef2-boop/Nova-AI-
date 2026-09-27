(async function () {
    const supabaseClient = window.novaSupabase;

    if (!supabaseClient) {
        console.error("Nova: Supabase client not found.");
        window.location.replace("login.html");
        return;
    }

    try {
        // ننتظر تحميل الجلسة المحفوظة
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("Nova Auth Session Error:", error);
            window.location.replace("login.html");
            return;
        }

        // مفيش تسجيل دخول
        if (!session) {
            console.log("Nova: No active session.");
            window.location.replace("login.html");
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

                if (
                    event === "SIGNED_OUT" ||
                    !newSession
                ) {
                    window.location.replace(
                        "login.html"
                    );
                }

            }
        );

    } catch (error) {

        console.error(
            "Nova Auth Guard Error:",
            error
        );

        window.location.replace(
            "login.html"
        );
    }
})();
