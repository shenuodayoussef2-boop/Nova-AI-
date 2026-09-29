/* =========================================================
   NOVA AI - OWNER PLAN PREVIEW
   Owner-only local simulation
========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "novaOwnerPreviewPlan";
    const USAGE_KEY = "novaOwnerPreviewUsage";

    const PLAN_DEFAULTS = {
        free: {
            code: "free",
            name: "FREE",
            price: "0 EGP",
            description: "الخطة المجانية",
            daily_messages: 50,
            daily_images: 5,
            daily_videos: 0,
            memory_limit: 20,
            workspace_enabled: true,
            voice_enabled: true,
            web_search_enabled: false,
            file_upload_enabled: true,
            priority_support: false
        },

        pro: {
            code: "pro",
            name: "PRO",
            price: "99 EGP",
            description: "الخطة الاحترافية",
            daily_messages: 500,
            daily_images: 50,
            daily_videos: 10,
            memory_limit: 200,
            workspace_enabled: true,
            voice_enabled: true,
            web_search_enabled: true,
            file_upload_enabled: true,
            priority_support: false
        },

        ultra: {
            code: "ultra",
            name: "ULTRA",
            price: "249 EGP",
            description: "أقصى إمكانيات Nova",
            daily_messages: 2000,
            daily_images: 200,
            daily_videos: 50,
            memory_limit: 1000,
            workspace_enabled: true,
            voice_enabled: true,
            web_search_enabled: true,
            file_upload_enabled: true,
            priority_support: true
        }
    };

    let ownerProfile = null;
    let plans = { ...PLAN_DEFAULTS };
    let previewPlan = "owner";
    let previewUsage = null;

    /* =====================================================
       HELPERS
    ===================================================== */

    function todayKey() {
        const d = new Date();

        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");
    }

    function loadUsage() {
        try {
            const saved =
                JSON.parse(
                    localStorage.getItem(USAGE_KEY)
                );

            if (
                saved &&
                saved.date === todayKey()
            ) {
                previewUsage = saved;
                return;
            }
        } catch {
            // ignore
        }

        previewUsage = {
            date: todayKey(),
            messages_used: 0,
            images_used: 0,
            videos_used: 0
        };

        saveUsage();
    }

    function saveUsage() {
        localStorage.setItem(
            USAGE_KEY,
            JSON.stringify(previewUsage)
        );
    }

    function setPreviewPlan(plan) {
        if (
            !ownerProfile ||
            ownerProfile.role !== "owner"
        ) {
            return;
        }

        if (
            plan !== "free" &&
            plan !== "pro" &&
            plan !== "ultra" &&
            plan !== "owner"
        ) {
            return;
        }

        previewPlan = plan;

        if (plan === "owner") {
            localStorage.removeItem(
                STORAGE_KEY
            );
        } else {
            localStorage.setItem(
                STORAGE_KEY,
                plan
            );
        }

        applyPreviewState();
        renderPreviewModal();
    }

    function getActivePlan() {
        if (
            previewPlan === "owner" ||
            !plans[previewPlan]
        ) {
            return {
                code: "owner",
                name: "OWNER",
                price: "غير محدود",
                description: "صلاحيات المالك الكاملة",
                daily_messages: Infinity,
                daily_images: Infinity,
                daily_videos: Infinity,
                memory_limit: Infinity,
                workspace_enabled: true,
                voice_enabled: true,
                web_search_enabled: true,
                file_upload_enabled: true,
                priority_support: true
            };
        }

        return plans[previewPlan];
    }

    function formatLimit(value) {
        if (value === Infinity) {
            return "∞";
        }

        return String(value);
    }

    function getUsageValue(kind) {
        if (kind === "messages") {
            return previewUsage.messages_used;
        }

        if (kind === "images") {
            return previewUsage.images_used;
        }

        if (kind === "videos") {
            return previewUsage.videos_used;
        }

        return 0;
    }

    function getLimit(kind) {
        const plan = getActivePlan();

        if (kind === "messages") {
            return plan.daily_messages;
        }

        if (kind === "images") {
            return plan.daily_images;
        }

        if (kind === "videos") {
            return plan.daily_videos;
        }

        return Infinity;
    }

    /* =====================================================
       CHECK USAGE
    ===================================================== */

    window.novaOwnerPreviewCanUse = function (kind) {

        if (
            !ownerProfile ||
            ownerProfile.role !== "owner"
        ) {
            return true;
        }

        if (previewPlan === "owner") {
            return true;
        }

        const used = getUsageValue(kind);
        const limit = getLimit(kind);

        if (
            limit !== Infinity &&
            used >= limit
        ) {
            const labels = {
                messages: "الرسائل",
                images: "الصور",
                videos: "الفيديوهات"
            };

            showPreviewToast(
                `خلصت حصة ${labels[kind]} في معاينة خطة ${getActivePlan().name} اليوم.`
            );

            return false;
        }

        return true;
    };

    window.novaOwnerPreviewConsume = function (kind) {

        if (
            !ownerProfile ||
            ownerProfile.role !== "owner"
        ) {
            return;
        }

        if (previewPlan === "owner") {
            return;
        }

        if (kind === "messages") {
            previewUsage.messages_used++;
        }

        if (kind === "images") {
            previewUsage.images_used++;
        }

        if (kind === "videos") {
            previewUsage.videos_used++;
        }

        saveUsage();

        renderPreviewModal();
        applyPreviewState();
    };

    /* =====================================================
       UI
    ===================================================== */

    function showPreviewModal() {
        document
            .getElementById("novaOwnerPreviewModal")
            ?.classList.add("show");

        renderPreviewModal();
    }

    function hidePreviewModal() {
        document
            .getElementById("novaOwnerPreviewModal")
            ?.classList.remove("show");
    }

    function showPreviewToast(message) {
        let toast =
            document.getElementById(
                "novaOwnerPreviewToast"
            );

        if (!toast) {
            toast =
                document.createElement("div");

            toast.id =
                "novaOwnerPreviewToast";

            toast.style.position = "fixed";
            toast.style.left = "50%";
            toast.style.bottom = "24px";
            toast.style.transform =
                "translateX(-50%)";
            toast.style.zIndex = "100000";
            toast.style.padding = "12px 16px";
            toast.style.borderRadius = "14px";
            toast.style.background =
                "#111827";
            toast.style.border =
                "1px solid rgba(255,255,255,.1)";
            toast.style.color = "#fff";
            toast.style.fontSize = "12px";
            toast.style.fontWeight = "700";
            toast.style.boxShadow =
                "0 15px 40px rgba(0,0,0,.35)";

            document.body.appendChild(toast);
        }

        toast.textContent = message;

        toast.style.opacity = "1";

        clearTimeout(toast._timer);

        toast._timer = setTimeout(() => {
            toast.style.opacity = "0";
        }, 2200);
    }

    function injectProfileButton() {
        if (
            document.getElementById(
                "openOwnerPreviewBtn"
            )
        ) {
            return;
        }

        const menu =
            document.querySelector(
                ".nova-profile-menu"
            );

        const button =
            document.createElement("button");

        button.id =
            "openOwnerPreviewBtn";

        button.type = "button";
        button.className =
            "nova-menu-item nova-owner-preview-item";

        button.innerHTML = `
            <i class="fa-solid fa-flask"></i>
            <span>معاينة الخطط</span>
            <span class="nova-owner-badge">
                OWNER
            </span>
        `;

        button.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();
                showPreviewModal();
            }
        );

        if (menu) {
            menu.appendChild(button);
        } else {
            const sidebarFooter =
                document.querySelector(
                    ".sidebar-footer-actions"
                );

            if (sidebarFooter) {
                sidebarFooter.appendChild(button);
            }
        }
    }

    function injectModal() {
        if (
            document.getElementById(
                "novaOwnerPreviewModal"
            )
        ) {
            return;
        }

        const modal =
            document.createElement("div");

        modal.id =
            "novaOwnerPreviewModal";

        modal.innerHTML = `
            <div class="nova-owner-preview-card">

                <div class="nova-owner-preview-header">

                    <div>
                        <div class="nova-owner-preview-title">
                            <i class="fa-solid fa-flask"></i>

                            <div>
                                <h3>
                                    معاينة خطط Nova
                                </h3>

                                <p class="nova-owner-preview-subtitle">
                                    وضع تجريبي للمالك
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        class="nova-owner-preview-close"
                        id="novaOwnerPreviewClose"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <div class="nova-owner-preview-current">

                    <div class="nova-owner-preview-current-label">
                        الخطة الحالية في وضع المعاينة
                    </div>

                    <div
                        id="novaOwnerPreviewCurrentPlan"
                        class="nova-owner-preview-current-plan"
                    >
                        OWNER
                    </div>

                    <div class="nova-owner-preview-current-owner">
                        👑 صلاحيات المالك الحقيقية لا تتأثر
                    </div>

                </div>

                <div
                    id="novaOwnerPlanGrid"
                    class="nova-owner-plan-grid"
                ></div>

                <div
                    id="novaOwnerPreviewStats"
                    class="nova-owner-preview-stats"
                ></div>

                <div
                    id="novaOwnerPreviewFeatures"
                    class="nova-owner-feature-list"
                ></div>

                <button
                    type="button"
                    id="novaOwnerPreviewReset"
                    class="nova-owner-reset"
                >
                    الرجوع للوضع الحقيقي 👑
                </button>

                <div class="nova-owner-preview-note">
                    المعاينة لا تغيّر الخطة الحقيقية في Supabase.
                    يتم استخدامها لاختبار الواجهة والحدود فقط.
                </div>

            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener(
            "click",
            event => {
                if (
                    event.target === modal
                ) {
                    hidePreviewModal();
                }
            }
        );

        document
            .getElementById(
                "novaOwnerPreviewClose"
            )
            ?.addEventListener(
                "click",
                hidePreviewModal
            );

        document
            .getElementById(
                "novaOwnerPreviewReset"
            )
            ?.addEventListener(
                "click",
                () => {
                    setPreviewPlan("owner");
                    showPreviewToast(
                        "رجعنا لحساب المالك 👑"
                    );
                }
            );
    }

    function renderPreviewModal() {
        const current =
            document.getElementById(
                "novaOwnerPreviewCurrentPlan"
            );

        const grid =
            document.getElementById(
                "novaOwnerPlanGrid"
            );

        const stats =
            document.getElementById(
                "novaOwnerPreviewStats"
            );

        const features =
            document.getElementById(
                "novaOwnerPreviewFeatures"
            );

        if (
            !current ||
            !grid ||
            !stats ||
            !features
        ) {
            return;
        }

        const active =
            getActivePlan();

        current.textContent =
            active.name;

        const buttons = [
            {
                code: "free",
                name: "FREE"
            },
            {
                code: "pro",
                name: "PRO"
            },
            {
                code: "ultra",
                name: "ULTRA"
            }
        ];

        grid.innerHTML =
            buttons
                .map(item => {

                    const p =
                        plans[item.code] ||
                        PLAN_DEFAULTS[item.code];

                    return `
                        <button
                            type="button"
                            class="nova-owner-plan-btn ${
                                previewPlan === item.code
                                    ? "active"
                                    : ""
                            }"
                            data-owner-preview-plan="${item.code}"
                        >

                            <div class="nova-owner-plan-name">
                                ${p.name}
                            </div>

                            <div class="nova-owner-plan-price">
                                ${p.price}
                            </div>

                            <div class="nova-owner-plan-desc">
                                ${p.description}
                            </div>

                        </button>
                    `;
                })
                .join("");

        grid.querySelectorAll(
            "[data-owner-preview-plan]"
        ).forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    setPreviewPlan(
                        button.dataset
                            .ownerPreviewPlan
                    );

                    showPreviewToast(
                        `تم تشغيل معاينة ${getActivePlan().name}`
                    );

                }
            );

        });

        stats.innerHTML = `
            <div class="nova-owner-stat">
                <div class="nova-owner-stat-label">
                    الرسائل / اليوم
                </div>
                <div class="nova-owner-stat-value">
                    ${formatLimit(active.daily_messages)}
                </div>
            </div>

            <div class="nova-owner-stat">
                <div class="nova-owner-stat-label">
                    الصور / اليوم
                </div>
                <div class="nova-owner-stat-value">
                    ${formatLimit(active.daily_images)}
                </div>
            </div>

            <div class="nova-owner-stat">
                <div class="nova-owner-stat-label">
                    الفيديوهات / اليوم
                </div>
                <div class="nova-owner-stat-value">
                    ${formatLimit(active.daily_videos)}
                </div>
            </div>

            <div class="nova-owner-stat">
                <div class="nova-owner-stat-label">
                    الذاكرة
                </div>
                <div class="nova-owner-stat-value">
                    ${formatLimit(active.memory_limit)}
                </div>
            </div>

            <div class="nova-owner-stat">
                <div class="nova-owner-stat-label">
                    الرسائل المستخدمة
                </div>
                <div class="nova-owner-stat-value">
                    ${previewPlan === "owner"
                        ? "غير محدود"
                        : `${previewUsage.messages_used} / ${formatLimit(active.daily_messages)}`}
                </div>
            </div>

            <div class="nova-owner-stat">
                <div class="nova-owner-stat-label">
                    الصور المستخدمة
                </div>
                <div class="nova-owner-stat-value">
                    ${previewPlan === "owner"
                        ? "غير محدود"
                        : `${previewUsage.images_used} / ${formatLimit(active.daily_images)}`}
                </div>
            </div>
        `;

        const featureData = [
            [
                "workspace_enabled",
                "Nova Workspace"
            ],
            [
                "voice_enabled",
                "المحادثة الصوتية"
            ],
            [
                "web_search_enabled",
                "البحث على الويب"
            ],
            [
                "file_upload_enabled",
                "رفع الملفات"
            ],
            [
                "priority_support",
                "الدعم ذو الأولوية"
            ]
        ];

        features.innerHTML =
            featureData
                .map(([key, label]) => {

                    const enabled =
                        Boolean(active[key]);

                    return `
                        <div class="nova-owner-feature ${
                            enabled
                                ? "enabled"
                                : "disabled"
                        }">

                            <i class="fa-solid ${
                                enabled
                                    ? "fa-circle-check"
                                    : "fa-circle-xmark"
                            }"></i>

                            <span>
                                ${label}
                            </span>

                        </div>
                    `;
                })
                .join("");
    }

    /* =====================================================
       APPLY PREVIEW STATE
    ===================================================== */

    function applyPreviewState() {

        document.body.classList.remove(
            "nova-plan-preview-free",
            "nova-plan-preview-pro",
            "nova-plan-preview-ultra"
        );

        if (
            previewPlan === "free" ||
            previewPlan === "pro" ||
            previewPlan === "ultra"
        ) {
            document.body.classList.add(
                `nova-plan-preview-${previewPlan}`
            );
        }

        window.novaEffectivePlan =
            getActivePlan();

        window.novaIsPlanPreviewActive =
            previewPlan !== "owner";

        window.dispatchEvent(
            new CustomEvent(
                "nova-plan-preview-changed",
                {
                    detail: {
                        plan: previewPlan,
                        effectivePlan:
                            getActivePlan(),
                        usage:
                            previewUsage
                    }
                }
            )
        );

        updateExistingProfileUI();
    }

    function updateExistingProfileUI() {

        const active =
            getActivePlan();

        document
            .querySelectorAll(
                ".nova-profile-plan"
            )
            .forEach(element => {

                element.textContent =
                    active.name;

                element.classList.remove(
                    "free",
                    "pro",
                    "ultra",
                    "owner"
                );

                element.classList.add(
                    active.code
                );
            });

        document
            .querySelectorAll(
                "[data-nova-plan-label]"
            )
            .forEach(element => {

                element.textContent =
                    active.name;
            });
    }

    /* =====================================================
       LOAD OWNER + PLANS
    ===================================================== */

    async function initOwnerPreview() {

        try {

            const client =
                window.novaSupabase;

            if (!client) {
                return;
            }

            const {
                data: sessionData,
                error: sessionError
            } =
                await client.auth.getSession();

            if (
                sessionError ||
                !sessionData?.session?.user
            ) {
                return;
            }

            const user =
                sessionData.session.user;

            const {
                data: profile,
                error: profileError
            } =
                await client
                    .from("profiles")
                    .select(
                        "id,name,plan,role"
                    )
                    .eq(
                        "id",
                        user.id
                    )
                    .maybeSingle();

            if (
                profileError ||
                !profile
            ) {
                return;
            }

            ownerProfile = profile;

            if (
                profile.role !== "owner"
            ) {
                return;
            }

            const {
                data: planRows
            } =
                await client
                    .from("plans")
                    .select("*")
                    .in(
                        "code",
                        [
                            "free",
                            "pro",
                            "ultra"
                        ]
                    );

            if (
                Array.isArray(planRows)
            ) {
                planRows.forEach(plan => {
                    plans[plan.code] =
                        plan;
                });
            }

            loadUsage();

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            previewPlan =
                (
                    saved === "free" ||
                    saved === "pro" ||
                    saved === "ultra"
                )
                    ? saved
                    : "owner";

            injectModal();
            injectProfileButton();

            applyPreviewState();
            renderPreviewModal();

            console.log(
                "Nova Owner Preview Ready:",
                {
                    realPlan: profile.plan,
                    previewPlan
                }
            );

        } catch (error) {

            console.error(
                "Nova Owner Preview Error:",
                error
            );

        }
    }

    /* =====================================================
       WRAP SEND MESSAGE
    ===================================================== */

    function installSendMessagePreviewGuard() {

        if (
            typeof window.sendMessage !==
                "function"
        ) {
            return;
        }

        if (
            window.sendMessage
                .__novaOwnerPreviewWrapped
        ) {
            return;
        }

        const originalSendMessage =
            window.sendMessage;

        async function wrappedSendMessage(
            customText = null,
            options = {}
        ) {

            const text =
                customText !== null
                    ? String(customText).trim()
                    : (
                        document
                            .getElementById(
                                "chatInput"
                            )
                            ?.value || ""
                    ).trim();

            if (
                ownerProfile?.role ===
                    "owner" &&
                window.novaIsPlanPreviewActive
            ) {

                if (
                    !window
                        .novaOwnerPreviewCanUse(
                            "messages"
                        )
                ) {
                    return;
                }

                const lower =
                    text.toLowerCase();

                const isImage =
                    lower.includes("صورة") ||
                    lower.includes("صوره") ||
                    lower.includes("ارسم") ||
                    lower.includes("توليد صورة") ||
                    lower.includes("generate image") ||
                    lower.includes("create image") ||
                    lower.includes("draw an image");

                const isVideo =
                    lower.includes("فيديو") ||
                    lower.includes("مشهد متحرك") ||
                    lower.includes("توليد فيديو") ||
                    lower.includes("generate video") ||
                    lower.includes("create video");

                if (
                    isImage &&
                    !window
                        .novaOwnerPreviewCanUse(
                            "images"
                        )
                ) {
                    return;
                }

                if (
                    isVideo &&
                    !window
                        .novaOwnerPreviewCanUse(
                            "videos"
                        )
                ) {
                    return;
                }

                window
                    .novaOwnerPreviewConsume(
                        "messages"
                    );

                if (isImage) {
                    window
                        .novaOwnerPreviewConsume(
                            "images"
                        );
                }

                if (isVideo) {
                    window
                        .novaOwnerPreviewConsume(
                            "videos"
                        );
                }
            }

            return originalSendMessage(
                customText,
                options
            );
        }

        wrappedSendMessage
            .__novaOwnerPreviewWrapped = true;

        window.sendMessage =
            wrappedSendMessage;
    }

    /* =====================================================
       BOOT
    ===================================================== */

    window.addEventListener(
        "DOMContentLoaded",
        async () => {

            await initOwnerPreview();

            setTimeout(
                installSendMessagePreviewGuard,
                600
            );

            setTimeout(
                installSendMessagePreviewGuard,
                1500
            );

        }
    );

})();
