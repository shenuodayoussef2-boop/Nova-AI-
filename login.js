
"use strict";

/* =========================
   إعداد Supabase
========================= */

const loginSupabaseClient = window.novaSupabase;

/* =========================
   عناصر الصفحة
========================= */

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

/* =========================
   رسائل النظام
========================= */

function showMessage(text, type = "error") {
    if (!message) return;

    message.textContent = text;
    message.className = "message show " + type;
}

/* =========================
   التحقق من الاتصال
========================= */

function checkSupabase() {
    if (!loginSupabaseClient) {
        showMessage("Supabase مش متصل.", "error");
        return false;
    }

    return true;
}

/* =========================
   تسجيل الدخول
========================= */

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
            showMessage(
                "اكتب البريد الإلكتروني وكلمة المرور.",
                "error"
            );
            return;
        }

        if (!checkSupabase()) return;

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = "جاري تسجيل الدخول...";
        }

        try {
            const { data, error } =
                await loginSupabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            showMessage("تم تسجيل الدخول بنجاح ✅", "success");

            /* قراءة صلاحية المستخدم */

            const {
                data: profile,
                error: profileError
            } = await loginSupabaseClient
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

            window.location.href = "index.html";

        } catch (error) {
            console.error("Nova Login Error:", error);

            const errorMessage =
                String(error.message || "").toLowerCase();

            if (errorMessage.includes("invalid login credentials")) {
                showMessage(
                    "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
                    "error"
                );

            } else if (errorMessage.includes("email not confirmed")) {
                showMessage(
                    "أكد بريدك الإلكتروني الأول.",
                    "error"
                );

            } else {
                showMessage(
                    error.message || "حدث خطأ أثناء تسجيل الدخول.",
                    "error"
                );
            }

            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = "تسجيل الدخول";
            }
        }
    });
}

/* =========================
   نهاية ملف تسجيل الدخول
========================= */
