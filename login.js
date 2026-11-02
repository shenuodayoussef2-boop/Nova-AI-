
"use strict";

const supabaseClient = window.novaSupabase;

const loginForm =
    document.getElementById("loginForm");

const loginBtn =
    document.getElementById("loginBtn");

const message =
    document.getElementById("message");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");


/* =========================
   رسائل النظام
========================= */

function showMessage(text, type) {

    message.textContent = text;

    message.className =
        "message show " + type;
}


/* =========================
   استعادة كلمة المرور
========================= */

if (forgotPasswordBtn) {

    forgotPasswordBtn.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            const email =
                emailInput.value.trim();

            if (!email) {

                showMessage(
                    "اكتب بريدك الإلكتروني الأول.",
                    "error"
                );

                emailInput.focus();

                return;
            }

            if (!supabaseClient) {

                showMessage(
                    "Supabase مش متصل.",
                    "error"
                );

                return;
            }

            forgotPasswordBtn.style.pointerEvents =
                "none";

            forgotPasswordBtn.textContent =
                "جاري إرسال الرابط...";

            try {

                const { error } =
                    await supabaseClient.auth
                        .resetPasswordForEmail(
                            email,
                            {
                                redirectTo:
                                    window.location.origin +
                                    "/reset-password.html"
                            }
                        );

                if (error) {
                    throw error;
                }

                showMessage(
                    "لو البريد مسجل، هتوصلك رسالة لإعادة تعيين كلمة المرور. راجع صندوق الوارد والرسائل غير المرغوب فيها.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "Nova Password Reset Error:",
                    error
                );

                showMessage(
                    "حصلت مشكلة أثناء إرسال رابط استعادة كلمة المرور.",
                    "error"
                );

            } finally {

                forgotPasswordBtn.style.pointerEvents =
                    "auto";

                forgotPasswordBtn.textContent =
                    "هل نسيت كلمة المرور؟";

            }

        }
    );

}


/* =========================
   تسجيل الدخول
========================= */

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        if (!email || !password) {

            showMessage(
                "اكتب البريد الإلكتروني وكلمة المرور.",
                "error"
            );

            return;
        }

        if (!supabaseClient) {

            showMessage(
                "Supabase مش متصل.",
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
                await supabaseClient.auth
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
             * قراءة صلاحية المستخدم
             * من جدول profiles
             */

            const {
                data: profile,
                error: profileError
            } =
                await supabaseClient
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

                console.log(
                    "Partner login confirmed:",
                    profile.role
                );

                return;
            }

            window.location.href =
                "index.html";

        } catch (error) {

            console.error(
                "Nova Login Error:",
                error
            );

            const errorMessage =
                String(error.message || "").toLowerCase();

            if (
                errorMessage.includes(
                    "invalid login credentials"
                )
            ) {

                showMessage(
                    "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
                    "error"
                );

            } else if (
                errorMessage.includes(
                    "email not confirmed"
                )
            ) {

                showMessage(
                    "أكد بريدك الإلكتروني الأول.",
                    "error"
                );

            } else {

                showMessage(
                    error.message ||
                    "حدث خطأ أثناء تسجيل الدخول.",
                    "error"
                );

            }

            loginBtn.disabled = false;

            loginBtn.textContent =
                "تسجيل الدخول";
        }

    }
);
