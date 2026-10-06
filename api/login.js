"use strict";

const loginForm =
    document.getElementById("loginForm");

const loginBtn =
    document.getElementById("loginBtn");

const message =
    document.getElementById("message");


function showMessage(text, type) {

    message.textContent = text;

    message.className =
        "message show " + type;
}


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const email =
            document
                .getElementById("email")
                .value
                .trim();

        const password =
            document
                .getElementById("password")
                .value;

        if (!email || !password) {
            showMessage(
                "اكتب البريد الإلكتروني وكلمة المرور.",
                "error"
            );
            return;
        }

        loginBtn.disabled = true;

        loginBtn.textContent =
            "جاري تسجيل الدخول...";

        try {

            const {
                data,
                error
            } =
                await window.novaSupabase.auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });

            if (error) {
                throw error;
            }

            showMessage(
                "تم تسجيل الدخول بنجاح ✅",
                "success"
            );

            /*
             * بعد نجاح تسجيل الدخول
             * نقرأ role من profiles
             */
            const {
                data: profile,
                error: profileError
            } =
                await window.novaSupabase
                    .from("profiles")
                    .select("role")
                    .eq("id", data.user.id)
                    .single();

            if (profileError) {
                throw profileError;
            }

if (profile?.role === "partner") {

    showMessage(
        "تم تسجيل الدخول كـ Partner بنجاح ✅",
        "success"
    );

    console.log("Partner login confirmed:", profile.role);

    return;
}

            window.location.href =
                "index.html";

        } catch (error) {

            console.error(
                "Nova Login Error:",
                error
            );

showMessage(
    error.message || "حدث خطأ أثناء تسجيل الدخول.",
    "error"
);

            loginBtn.disabled = false;

            loginBtn.textContent =
                "تسجيل الدخول";
        }

    }
);
