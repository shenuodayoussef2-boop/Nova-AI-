const signupForm = document.getElementById("signupForm");
const signupBtn = document.getElementById("signupBtn");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const messageBox = document.getElementById("message");

function showMessage(text, type = "error") {
    messageBox.textContent = text;
    messageBox.className = `message show ${type}`;
}

signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!name || !email || !password) {
        showMessage("املأ كل البيانات الأول.");
        return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = "جاري إنشاء الحساب...";

    try {

        if (!window.novaSupabase) {
            throw new Error("Supabase مش متصل.");
        }

        const { data, error } =
            await window.novaSupabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name
                    }
                }
            });

        console.log("Nova Signup:", data);
        console.log("Nova Signup Error:", error);

        if (error) {
            throw error;
        }

        if (!data.session) {

            showMessage(
                "الحساب اتعمل ✅ افتح إيميلك واضغط رابط التأكيد، وبعدها سجل دخول.",
                "success"
            );

            signupBtn.disabled = false;
            signupBtn.textContent = "إنشاء الحساب";

            return;
        }

        showMessage(
            "تم إنشاء الحساب 🎉",
            "success"
        );

        setTimeout(() => {
            window.location.replace("index.html");
        }, 500);

    } catch (error) {

        console.error(
            "NOVA SIGNUP ERROR:",
            error
        );

        const msg =
            String(error?.message || "").toLowerCase();

        if (msg.includes("user already registered")) {

            showMessage(
                "الإيميل ده مسجل بالفعل، جرّب تسجيل الدخول."
            );

        } else if (
            msg.includes("password") &&
            msg.includes("at least")
        ) {

            showMessage(
                "كلمة المرور لازم تكون 6 حروف أو أكثر."
            );

        } else {

            showMessage(
                error?.message ||
                "حصل خطأ أثناء إنشاء الحساب."
            );
        }

        signupBtn.disabled = false;
        signupBtn.textContent = "إنشاء الحساب";
    }

});
