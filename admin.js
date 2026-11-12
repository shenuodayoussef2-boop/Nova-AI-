
const adminClient = window.novaSupabase;
async function protectAdmin() {
    const status = document.querySelector(".status");

    try {
        if (!supabase) {
            throw new Error("Supabase client not found");
        }

        // 1. التحقق من جلسة المستخدم
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
            window.location.replace("index.html");
            return;
        }

        // 2. التحقق من صلاحيات الإدارة
        const {
            data: admin,
            error: adminError
        } = await supabase
            .from("admin_users")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();

        if (adminError) {
            throw adminError;
        }

        // 3. رفض الدخول عند عدم وجود صلاحية
        if (!admin || !["owner", "admin", "support"].includes(admin.role)) {
            document.body.innerHTML = `
                <div style="
                    background:#080b14;
                    color:white;
                    min-height:100vh;
                    display:grid;
                    place-items:center;
                    text-align:center;
                    font-family:Arial;
                    padding:20px;
                ">
                    <div>
                        <h1>Access Denied</h1>
                        <p>ليس لديك تصريح لدخول لوحة الإدارة.</p>
                        <a href="index.html" style="color:#3985ff">
                            العودة إلى YOVIA AI
                        </a>
                    </div>
                </div>
            `;

            document.body.style.visibility = "visible";
            return;
        }

        // 4. عرض بيانات الحساب
        const profileName =
            user.user_metadata?.name ||
            user.email ||
            "YOVIA Admin";

        const profileElement =
            document.querySelector(".admin-profile strong");

        const roleElement =
            document.querySelector(".admin-profile small");

        if (profileElement) {
            profileElement.textContent = profileName;
        }

        if (roleElement) {
            roleElement.textContent =
                admin.role === "owner"
                    ? "مالك المنصة"
                    : admin.role === "admin"
                    ? "مدير النظام"
                    : "دعم فني";
        }

        if (status) {
            status.textContent = "● تم التحقق من الصلاحيات";
        }

        document.body.style.visibility = "visible";

        console.log("YOVIA ADMIN AUTHORIZED");

    } catch (error) {
        console.error("YOVIA ADMIN ERROR:", error);

        document.body.innerHTML = `
            <div style="
                background:#080b14;
                color:white;
                min-height:100vh;
                display:grid;
                place-items:center;
                text-align:center;
                font-family:Arial;
            ">
                <div>
                    <h2>تعذر التحقق من الحساب</h2>
                    <p>تأكد من اتصال Supabase وإعدادات الصلاحيات.</p>
                    <button onclick="location.reload()">
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        `;

        document.body.style.visibility = "visible";
    }
}

// إخفاء الصفحة أثناء التحقق
document.body.style.visibility = "hidden";

protectAdmin();
