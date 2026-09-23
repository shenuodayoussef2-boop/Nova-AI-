(async function () {

    try {

        const supabaseClient =
            window.novaSupabase;


        if (!supabaseClient) {

            console.error(
                "Nova: Supabase client not found."
            );

            window.location.href =
                "login.html";

            return;

        }


        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Nova Auth Session Error:",
                error
            );

            window.location.href =
                "login.html";

            return;

        }


        if (!data?.session) {

            window.location.replace(
                "login.html"
            );

            return;

        }


        // ======================================
        // USER AVAILABLE GLOBALLY
        // ======================================

        window.novaUser =
            data.session.user;


        console.log(
            "Nova logged in user:",
            window.novaUser
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
