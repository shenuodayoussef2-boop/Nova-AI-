
const adminClient = window.novaSupabase;

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("adminLoginForm");
const loginBtn = document.getElementById("adminLoginBtn");
const authError = document.getElementById("authError");
const adminApp = document.querySelector(".app");

function showError(message) {
    authError.textContent = message;
    authError.style.display = "block";
}

function showLogin() {
    document.body.classList.remove("admin-authenticated");
    adminApp.style.display = "none";
    authScreen.style.display = "flex";
}

function showDashboard(user, role) {
    authScreen.style.display = "none";
    adminApp.style.display = "flex";

    const profile = document.querySelector(".admin-profile");

    if (profile) {
        profile.querySelector("strong").textContent =
            user.user_metadata?.name ||
            user.email ||
            "YOVIA Owner";

        profile.querySelector("small").textContent =
            role === "owner" ? "مالك النظام" :
            role === "admin" ? "مدير النظام" :
            "الدعم الفني";
    }

    const status = document.querySelector(".status");

    if (status) {
        status.textContent = "● تم التحقق من الصلاحيات";
    }
}

async function verifyAdmin(user) {
    const { data, error } = await adminClient
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Admin Permission Error:", error);
        throw new Error("تعذر قراءة صلاحيات الحساب: " + error.message);
    }

    if (!data || !["owner", "admin", "support"].includes(data.role)) {
        throw new Error("هذا الحساب ليس لديه صلاحية دخول لوحة الإدارة.");
    }

    return data.role;
}

async function protectAdmin() {
    if (!adminClient) {
        showLogin();
        showError("تعذر تحميل مكتبة Supabase. أعد تحميل الصفحة.");
        return;
    }

    try {
        const { data, error } = await adminClient.auth.getSession();

        if (error) throw error;

        const session = data.session;

        if (!session) {
            showLogin();
            return;
        }

        const { data: userData, error: userError } =
            await adminClient.auth.getUser();

        if (userError) throw userError;

        if (!userData.user) {
            showLogin();
            return;
        }

        const role = await verifyAdmin(userData.user);

        showDashboard(userData.user, role);

    } catch (error) {
        console.error("YOVIA ADMIN ERROR:", error);
        showLogin();
        showError(error.message || "تعذر التحقق من الحساب.");
    }
}

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    authError.style.display = "none";

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "جارٍ تسجيل الدخول...";

    try {
        const { data, error } = await adminClient.auth
            .signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        if (!data.user) {
            throw new Error("لم يتم العثور على بيانات الحساب.");
        }

        const role = await verifyAdmin(data.user);

        showDashboard(data.user, role);

    } catch (error) {
        console.error("YOVIA LOGIN ERROR:", error);

        await adminClient.auth.signOut();

        showLogin();
        showError(error.message || "فشل تسجيل الدخول.");

    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "تسجيل الدخول";
    }
});

protectAdmin();
