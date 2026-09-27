const supabaseClient = window.novaSupabase;

const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const nameInput = document.getElementById("name");
const nameField = document.getElementById("nameField");
const submitBtn = document.getElementById("submitBtn");
const switchBtn = document.getElementById("switchBtn");
const switchText = document.getElementById("switchText");
const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const messageBox = document.getElementById("message");

let isSignup = false;

function showMessage(text, type = "error") {
    messageBox.textContent = text;
    messageBox.className = `message show ${type}`;
}

function clearMessage() {
    messageBox.textContent = "";
    messageBox.className = "message";
}

/* =========================
   التبديل بين الدخول والتسجيل
========================= */

switchBtn.addEventListener("click", function (event) {

    event.preventDefault();

    isSignup = !isSignup;

    clearMessage();

    if (isSignup) {

        formTitle.textContent = "اعمل حساب جديد 🚀";
        formSubtitle.textContent = "سجّل حسابك وابدأ تستخدم Nova AI";

        submitBtn.textContent = "إنشاء الحساب";

        switchText.textContent = "عندك حساب بالفعل؟";
        switchBtn.textContent = "تسجيل الدخول";

        nameField.style.display = "block";
        nameInput.required = true;

        passwordInput.autocomplete = "new-password";

    } else {

        formTitle.textContent = "أهلاً بيك في Nova AI 👋";
        formSubtitle.textContent = "سجّل دخولك وكمل مع Nova";

        submitBtn.textContent = "تسجيل الدخول";

        switchText.textContent = "معندكش حساب؟";
        switchBtn.textContent = "إنشاء حساب";

        nameField.style.display = "none";
        nameInput.required = false;

        passwordInput.autocomplete = "current-password";
    }
});


/* =========================
   تسجيل الدخول / إنشاء الحساب
========================= */

authForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    clearMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = nameInput.value.trim();

    if (!email || !password) {
        showMessage("اكتب الإيميل والباسورد الأول.");
        return;
    }

    if (isSignup && !name) {
        showMessage("اكتب اسمك الأول.");
        return;
    }

    if (!supabaseClient) {
        showMessage("Supabase مش متصل.");
        console.error("Nova: Supabase client missing.");
        return;
    }

    submitBtn.disabled = true;

    submitBtn.textContent = isSignup
        ? "جاري إنشاء الحساب..."
        : "جاري تسجيل الدخول...";

    try {

        /* =========================
           إنشاء حساب
        ========================= */

        if (isSignup) {

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            name: name
                        }
                    }
                });

            console.log("SIGN UP RESULT:", data);
            console.log("SIGN UP ERROR:", error);

            if (error) {
                throw error;
            }

            /*
             * لو تأكيد الإيميل شغال
             */
            if (!data.session) {

                showMessage(
                    "الحساب اتعمل ✅ افتح إيميلك واضغط رابط التأكيد، وبعدها سجل دخول.",
                    "success"
                );

                return;
            }

            /*
             * لو التأكيد مقفول
             * هيكون فيه Session وندخل الشات مباشرة
             */

            showMessage(
                "تم إنشاء الحساب 🎉",
                "success"
            );

            window.location.replace("index.html");

            return;
        }


        /* =========================
           تسجيل الدخول
        ========================= */

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        console.log("LOGIN RESULT:", data);
        console.log("LOGIN ERROR:", error);

        if (error) {
            throw error;
        }

        if (!data.session) {
            throw new Error("تم الدخول لكن Session مش موجودة.");
        }

        showMessage(
            "تم تسجيل الدخول ✅",
            "success"
        );

        window.location.replace("index.html");

    } catch (error) {

        console.error("NOVA AUTH ERROR:", error);

        showMessage(
            getArabicAuthError(error)
        );

    } finally {

        submitBtn.disabled = false;

        submitBtn.textContent = isSignup
            ? "إنشاء الحساب"
            : "تسجيل الدخول";
    }
});


/* =========================
   رسائل الأخطاء بالعربي
========================= */

function getArabicAuthError(error) {

    const msg =
        String(error?.message || "").toLowerCase();

    if (msg.includes("invalid login credentials")) {
        return "الإيميل أو الباسورد غلط.";
    }

    if (msg.includes("email not confirmed")) {
        return "أكد إيميلك الأول من الرسالة اللي اتبعتتلك.";
    }

    if (
        msg.includes("password") &&
        msg.includes("at least")
    ) {
        return "الباسورد لازم يكون 6 حروف أو أكتر.";
    }

    if (msg.includes("user already registered")) {
        return "الإيميل ده مسجل بالفعل، جرّب تسجيل الدخول.";
    }

    if (msg.includes("rate limit")) {
        return "استنى شوية وجرب تاني.";
    }

    return error?.message || "حصلت مشكلة، جرّب تاني.";
}
