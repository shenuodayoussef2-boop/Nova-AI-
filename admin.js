
const supabase = window.novaSupabase;

async function protectAdmin() {
    try {
        if (!supabase) {
            throw new Error("Supabase غير متصل.");
        }

        // التأكد من هوية المستخدم
        const { data: authData, error: authError } =
            await supabase.auth.getUser();

        if (authError || !authData.user) {
            window.location.replace("index.html");
            return;
        }

        const user = authData.user;

        // التحقق من وجود صلاحية إدارية
        const { data: admin, error: adminError } =
            await supabase
                .from("admin_users")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();

        if (adminError) {
            throw adminError;
        }

        if (!admin) {
            document.body.innerHTML = `
                <div style="
                    background:#080b14;
                    color:white;
                    min-height:100vh;
                    display:grid;
                    place-items:center;
                    font-family:Arial;
                    text-align:center;
                    padding:20px;
                ">
                    <div>
                        <h1>Access Denied</h1>
                        <p>ليس لديك صلاحية دخول لوحة YOVIA ADMIN.</p>
                        <a href="index.html" style="color:#3985ff">
                            العودة إلى YOVIA AI
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        // إظهار اللوحة بعد التحقق
        document.body.style.visibility = "visible";

        console.log("YOVIA ADMIN AUTHORIZED:", admin.role);

    } catch (error) {
        console.error("ADMIN SECURITY ERROR:", error);

        document.body.innerHTML = `
            <div style="background:#080b14;color:white;
                min-height:100vh;display:grid;place-items:center;
                font-family:Arial;text-align:center;padding:20px">
                <div>
                    <h2>تعذر التحقق من الصلاحيات</h2>
                    <p>راجع اتصال Supabase وإعدادات قاعدة البيانات.</p>
                </div>
            </div>
        `;
    }
}

document.body.style.visibility = "hidden";
protectAdmin();