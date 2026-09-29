/* =========================================================
   NOVA AI
   OWNER PREVIEW + PROFILE FALLBACK
   ---------------------------------------------------------
   - ينشئ زر الحساب لو مش موجود
   - زر الحساب يفتح popup
   - يتحقق من role من Supabase
   - معاينة الخطط للـ OWNER فقط
   - FREE / PRO / ULTRA
   - لا يغيّر plan الحقيقي
========================================================= */

(() => {
    "use strict";

    const PREVIEW_STORAGE =
        "novaOwnerPreviewPlan";

    const USAGE_STORAGE =
        "novaOwnerPreviewUsage";


    let supabaseClient = null;
    let user = null;
    let profile = null;
    let isOwner = false;

    let previewPlan = "owner";
    let previewUsage = null;

    const plans = {

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


    function getInitials(name) {

        if (!name) {
            return "YS";
        }

        const clean =
            String(name)
                .trim()
                .replace(/\s+/g, " ");

        const parts =
            clean.split(" ").filter(Boolean);

        if (parts.length >= 2) {

            return (
                getLatinInitial(parts[0]) +
                getLatinInitial(parts[1])
            );

        }

        const chars =
            [...parts[0]];

        return chars
            .slice(0, 2)
            .map(getLatinInitial)
            .join("");

    }


    function getLatinInitial(char) {

        const map = {

            "أ": "A",
            "إ": "E",
            "آ": "A",
            "ا": "A",
            "ب": "B",
            "ت": "T",
            "ث": "T",
            "ج": "G",
            "ح": "H",
            "خ": "K",
            "د": "D",
            "ذ": "D",
            "ر": "R",
            "ز": "Z",
            "س": "S",
            "ش": "S",
            "ص": "S",
            "ض": "D",
            "ط": "T",
            "ظ": "Z",
            "ع": "A",
            "غ": "G",
            "ف": "F",
            "ق": "Q",
            "ك": "K",
            "ل": "L",
            "م": "M",
            "ن": "N",
            "ه": "H",
            "و": "W",
            "ي": "Y"
        };

        return (
            map[char] ||
            String(char || "").charAt(0).toUpperCase() ||
            "N"
        );

    }


    function safeGet(key) {

        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }

    }


    function safeSet(key, value) {

        try {
            localStorage.setItem(
                key,
                value
            );
        } catch {}

    }


    function safeRemove(key) {

        try {
            localStorage.removeItem(key);
        } catch {}

    }


    /* =====================================================
       LOAD USAGE
    ===================================================== */

    function loadPreviewUsage() {

        let saved = null;

        try {

            saved =
                JSON.parse(
                    safeGet(
                        USAGE_STORAGE
                    )
                );

        } catch {

            saved = null;

        }


        if (
            saved &&
            saved.date === todayKey()
        ) {

            previewUsage = {

                date: saved.date,

                messages_used:
                    Number(
                        saved.messages_used
                    ) || 0,

                images_used:
                    Number(
                        saved.images_used
                    ) || 0,

                videos_used:
                    Number(
                        saved.videos_used
                    ) || 0

            };

            return;

        }


        previewUsage = {

            date: todayKey(),

            messages_used: 0,

            images_used: 0,

            videos_used: 0

        };

        savePreviewUsage();

    }


    function savePreviewUsage() {

        safeSet(

            USAGE_STORAGE,

            JSON.stringify(
                previewUsage
            )

        );

    }


    /* =====================================================
       ACTIVE PLAN
    ===================================================== */

    function getActivePlan() {

        if (
            !isOwner ||
            previewPlan === "owner"
        ) {

            return {

                code: "owner",

                name: "OWNER",

                price: "غير محدود",

                description:
                    "صلاحيات المالك الكاملة",

                daily_messages:
                    Infinity,

                daily_images:
                    Infinity,

                daily_videos:
                    Infinity,

                memory_limit:
                    Infinity,

                workspace_enabled: true,

                voice_enabled: true,

                web_search_enabled: true,

                file_upload_enabled: true,

                priority_support: true

            };

        }


        return (
            plans[previewPlan] ||
            plans.free
        );

    }


    /* =====================================================
       CREATE PROFILE UI
    ===================================================== */

    function injectProfileUI() {

        let profileArea =
            document.getElementById(
                "novaProfileArea"
            );


        if (!profileArea) {

            profileArea =
                document.createElement(
                    "div"
                );

            profileArea.id =
                "novaProfileArea";

            profileArea.className =
                "nova-profile-area";


            profileArea.innerHTML = `

                <button
                    type="button"
                    id="novaProfileButton"
                    class="nova-profile-btn"
                    aria-label="الحساب"
                >

                    <span
                        id="novaProfileAvatar"
                        class="nova-profile-avatar"
                    >
                        YS
                    </span>

                    <span
                        class="nova-profile-info"
                    >

                        <strong
                            id="novaProfileName"
                        >
                            يوسف شنوده
                        </strong>

                        <small
                            id="novaProfilePlan"
                            class="nova-profile-plan free"
                        >
                            FREE
                        </small>

                    </span>

                    <i
                        class="fa-solid fa-chevron-up nova-profile-chevron"
                    ></i>

                </button>


                <div
                    id="novaProfileMenu"
                    class="nova-profile-menu"
                >

                    <div
                        class="nova-profile-menu-head"
                    >

                        <div
                            id="novaMenuAvatar"
                            class="nova-menu-avatar"
                        >
                            YS
                        </div>

                        <div>

                            <strong
                                id="novaMenuName"
                            >
                                يوسف شنوده
                            </strong>

                            <small
                                id="novaMenuEmail"
                            >
                                حساب Nova AI
                            </small>

                        </div>

                    </div>


                    <div
                        class="nova-plan-card"
                    >

                        <span>
                            الخطة
                        </span>

                        <strong
                            id="novaMenuPlan"
                        >
                            FREE
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="nova-menu-item"
                        id="novaLanguageProfileBtn"
                    >

                        <i
                            class="fa-solid fa-language"
                        ></i>

                        <span>
                            اللغة
                        </span>

                    </button>


                    <button
                        type="button"
                        class="nova-menu-item"
                        id="novaUsageProfileBtn"
                    >

                        <i
                            class="fa-solid fa-chart-pie"
                        ></i>

                        <span>
                            الاستخدام
                        </span>

                    </button>


                    <button
                        type="button"
                        class="nova-menu-item"
                        id="novaSettingsProfileBtn"
                    >

                        <i
                            class="fa-solid fa-gear"
                        ></i>

                        <span>
                            الإعدادات
                        </span>

                    </button>


                    <div
                        id="novaOwnerPreviewMenuItem"
                    ></div>


                    <button
                        type="button"
                        class="nova-menu-item nova-logout-item"
                        id="novaProfileLogoutBtn"
                    >

                        <i
                            class="fa-solid fa-right-from-bracket"
                        ></i>

                        <span>
                            تسجيل الخروج
                        </span>

                    </button>

                </div>

            `;


            const footer =
                document.querySelector(
                    ".sidebar-footer-actions"
                );


            if (footer) {

                footer.prepend(
                    profileArea
                );

            } else {

                document
                    .querySelector(
                        "#sidebar"
                    )
                    ?.appendChild(
                        profileArea
                    );

            }

        }


        bindProfileButton();

    }


    /* =====================================================
       PROFILE BUTTON CLICK
    ===================================================== */

    function bindProfileButton() {

        const button =
            document.getElementById(
                "novaProfileButton"
            );


        const menu =
            document.getElementById(
                "novaProfileMenu"
            );


        if (
            !button ||
            !menu
        ) {

            return;

        }


        if (
            button.dataset.bound ===
            "true"
        ) {

            return;

        }


        button.dataset.bound =
            "true";


        button.addEventListener(

            "click",

            event => {

                event.preventDefault();
                event.stopPropagation();


                menu.classList.toggle(
                    "show"
                );

            }

        );


        document.addEventListener(

            "click",

            event => {

                if (

                    !profileAreaContains(
                        event.target
                    )

                ) {

                    menu.classList.remove(
                        "show"
                    );

                }

            }

        );

    }


    function profileAreaContains(
        target
    ) {

        const area =
            document.getElementById(
                "novaProfileArea"
            );

        return Boolean(
            area &&
            area.contains(target)
        );

    }


    /* =====================================================
       RENDER PROFILE
    ===================================================== */

    function renderProfile() {

        if (!profile) {
            return;
        }


        const name =
            profile.name ||
            user?.user_metadata?.name ||
            user?.email?.split("@")[0] ||
            "Nova User";


        const initials =
            getInitials(name);


        const planName =
            getActivePlan().name;


        const avatar =
            document.getElementById(
                "novaProfileAvatar"
            );

        const nameElement =
            document.getElementById(
                "novaProfileName"
            );

        const planElement =
            document.getElementById(
                "novaProfilePlan"
            );

        const menuAvatar =
            document.getElementById(
                "novaMenuAvatar"
            );

        const menuName =
            document.getElementById(
                "novaMenuName"
            );

        const menuEmail =
            document.getElementById(
                "novaMenuEmail"
            );

        const menuPlan =
            document.getElementById(
                "novaMenuPlan"
            );


        if (avatar) {

            avatar.textContent =
                initials;

        }


        if (menuAvatar) {

            menuAvatar.textContent =
                initials;

        }


        if (nameElement) {

            nameElement.textContent =
                name;

        }


        if (menuName) {

            menuName.textContent =
                name;

        }


        if (menuEmail) {

            menuEmail.textContent =
                user?.email ||
                "حساب Nova AI";

        }


        if (planElement) {

            planElement.textContent =
                planName;

            planElement.classList.remove(
                "free",
                "pro",
                "ultra",
                "owner"
            );

            planElement.classList.add(
                getActivePlan().code
            );

        }


        if (menuPlan) {

            menuPlan.textContent =
                planName;

        }

    }


    /* =====================================================
       OWNER PREVIEW MENU
    ===================================================== */

    function renderOwnerMenuItem() {

        const holder =
            document.getElementById(
                "novaOwnerPreviewMenuItem"
            );


        if (!holder) {
            return;
        }


        holder.innerHTML = "";


        if (!isOwner) {

            return;

        }


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.id =
            "openOwnerPreviewBtn";


        button.className =
            "nova-menu-item nova-owner-preview-item";


        button.innerHTML = `

            <i
                class="fa-solid fa-flask"
            ></i>

            <span>
                معاينة الخطط
            </span>

            <span
                class="nova-owner-badge"
            >
                OWNER
            </span>

        `;


        button.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

                document
                    .getElementById(
                        "novaProfileMenu"
                    )
                    ?.classList.remove(
                        "show"
                    );

                openPreviewModal();

            }

        );


        holder.appendChild(
            button
        );

    }


    /* =====================================================
       MODAL
    ===================================================== */

    function injectPreviewModal() {

        if (
            document.getElementById(
                "novaOwnerPreviewModal"
            )
        ) {

            return;

        }


        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "novaOwnerPreviewModal";


        modal.innerHTML = `

            <div
                class="nova-owner-preview-card"
            >

                <div
                    class="nova-owner-preview-header"
                >

                    <div
                        class="nova-owner-preview-title"
                    >

                        <i
                            class="fa-solid fa-flask"
                        ></i>

                        <div>

                            <h3>
                                معاينة خطط Nova
                            </h3>

                            <p
                                class="nova-owner-preview-subtitle"
                            >
                                وضع تجريبي للمالك فقط
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        id="novaOwnerPreviewClose"
                        class="nova-owner-preview-close"
                    >

                        <i
                            class="fa-solid fa-xmark"
                        ></i>

                    </button>

                </div>


                <div
                    class="nova-owner-preview-current"
                >

                    <div
                        class="nova-owner-preview-current-label"
                    >
                        الخطة في المعاينة
                    </div>

                    <div
                        id="novaOwnerPreviewCurrentPlan"
                        class="nova-owner-preview-current-plan"
                    >
                        OWNER
                    </div>

                    <div
                        class="nova-owner-preview-current-owner"
                    >
                        👑 حسابك الأساسي ما زال OWNER
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


                <div
                    class="nova-owner-preview-note"
                >
                    المعاينة لا تغيّر خطة حسابك الحقيقية
                    ولا تغيّر role في Supabase.
                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        modal.addEventListener(

            "click",

            event => {

                if (
                    event.target ===
                    modal
                ) {

                    closePreviewModal();

                }

            }

        );


        document
            .getElementById(
                "novaOwnerPreviewClose"
            )
            ?.addEventListener(

                "click",

                closePreviewModal

            );


        document
            .getElementById(
                "novaOwnerPreviewReset"
            )
            ?.addEventListener(

                "click",

                () => {

                    setPreviewPlan(
                        "owner"
                    );

                }

            );

    }


    function openPreviewModal() {

        if (!isOwner) {

            return;

        }


        injectPreviewModal();


        document
            .getElementById(
                "novaOwnerPreviewModal"
            )
            ?.classList.add(
                "show"
            );


        renderPreviewModal();

    }


    function closePreviewModal() {

        document
            .getElementById(
                "novaOwnerPreviewModal"
            )
            ?.classList.remove(
                "show"
            );

    }


    /* =====================================================
       SET PREVIEW
    ===================================================== */

    function setPreviewPlan(
        plan
    ) {

        if (!isOwner) {

            console.warn(
                "Nova: Preview denied."
            );

            return;

        }


        if (

            ![
                "owner",
                "free",
                "pro",
                "ultra"
            ].includes(plan)

        ) {

            return;

        }


        previewPlan =
            plan;


        if (
            plan === "owner"
        ) {

            safeRemove(
                PREVIEW_STORAGE
            );

        } else {

            safeSet(
                PREVIEW_STORAGE,
                plan
            );

        }


        applyPreviewState();

        renderPreviewModal();

    }


    /* =====================================================
       APPLY PREVIEW
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
            (
                isOwner &&
                previewPlan !==
                "owner"
            );


        renderProfile();


        window.dispatchEvent(

            new CustomEvent(
                "nova-plan-preview-changed",
                {
                    detail: {
                        plan:
                            previewPlan,

                        effectivePlan:
                            getActivePlan(),

                        owner:
                            isOwner,

                        usage:
                            previewUsage
                    }
                }
            )

        );

    }


    /* =====================================================
       RENDER PREVIEW MODAL
    ===================================================== */

    function renderPreviewModal() {

        if (!isOwner) {
            return;
        }


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


        const planCodes = [

            "free",
            "pro",
            "ultra"

        ];


        grid.innerHTML =
            planCodes
                .map(
                    code => {

                        const p =
                            plans[code];


                        return `

                            <button
                                type="button"
                                class="nova-owner-plan-btn ${
                                    previewPlan === code
                                        ? "active"
                                        : ""
                                }"
                                data-preview-plan="${code}"
                            >

                                <div
                                    class="nova-owner-plan-name"
                                >
                                    ${p.name}
                                </div>

                                <div
                                    class="nova-owner-plan-price"
                                >
                                    ${p.price}
                                </div>

                                <div
                                    class="nova-owner-plan-desc"
                                >
                                    ${p.description}
                                </div>

                            </button>

                        `;

                    }
                )
                .join("");


        grid
            .querySelectorAll(
                "[data-preview-plan]"
            )
            .forEach(
                button => {

                    button.addEventListener(

                        "click",

                        () => {

                            setPreviewPlan(

                                button.dataset
                                    .previewPlan

                            );

                        }

                    );

                }
            );


        stats.innerHTML = `

            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    الرسائل / اليوم
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${formatLimit(
                        active.daily_messages
                    )}
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    الصور / اليوم
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${formatLimit(
                        active.daily_images
                    )}
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    الفيديوهات / اليوم
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${formatLimit(
                        active.daily_videos
                    )}
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    الذاكرة
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${formatLimit(
                        active.memory_limit
                    )}
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    رسائل مستخدمة
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${
                        previewPlan === "owner"
                            ? "غير محدود"
                            : `${previewUsage.messages_used} / ${formatLimit(active.daily_messages)}`
                    }
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    صور مستخدمة
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${
                        previewPlan === "owner"
                            ? "غير محدود"
                            : `${previewUsage.images_used} / ${formatLimit(active.daily_images)}`
                    }
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    فيديوهات مستخدمة
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${
                        previewPlan === "owner"
                            ? "غير محدود"
                            : `${previewUsage.videos_used} / ${formatLimit(active.daily_videos)}`
                    }
                </div>

            </div>

        `;


        const featureList = [

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
            featureList
                .map(
                    ([key, label]) => {

                        const enabled =
                            Boolean(
                                active[key]
                            );


                        return `

                            <div
                                class="nova-owner-feature ${
                                    enabled
                                        ? "enabled"
                                        : "disabled"
                                }"
                            >

                                <i
                                    class="fa-solid ${
                                        enabled
                                            ? "fa-circle-check"
                                            : "fa-circle-xmark"
                                    }"
                                ></i>

                                <span>
                                    ${label}
                                </span>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    function formatLimit(
        value
    ) {

        if (
            value === Infinity
        ) {

            return "∞";

        }

        return String(
            value ?? 0
        );

    }


    /* =====================================================
       USAGE CHECK
    ===================================================== */

    function getUsage(
        type
    ) {

        if (!previewUsage) {
            loadPreviewUsage();
        }


        if (
            type === "messages"
        ) {

            return previewUsage.messages_used;

        }


        if (
            type === "images"
        ) {

            return previewUsage.images_used;

        }


        if (
            type === "videos"
        ) {

            return previewUsage.videos_used;

        }


        return 0;

    }


    function getLimit(
        type
    ) {

        const plan =
            getActivePlan();


        if (
            type === "messages"
        ) {

            return plan.daily_messages;

        }


        if (
            type === "images"
        ) {

            return plan.daily_images;

        }


        if (
            type === "videos"
        ) {

            return plan.daily_videos;

        }


        return Infinity;

    }


    window.novaOwnerPreviewCanUse =
        function (
            type
        ) {

            /*
             * غير المالك:
             * لا preview
             */

            if (!isOwner) {

                return true;

            }


            /*
             * Owner الحقيقي
             */

            if (
                previewPlan ===
                "owner"
            ) {

                return true;

            }


            const used =
                getUsage(
                    type
                );

            const limit =
                getLimit(
                    type
                );


            if (

                limit !== Infinity &&
                used >= limit

            ) {

                showToast(

                    `وصلت لحد ${type} في معاينة ${getActivePlan().name}`

                );

                return false;

            }


            return true;

        };


    window.novaOwnerPreviewConsume =
        function (
            type
        ) {

            if (!isOwner) {
                return;
            }


            if (
                previewPlan ===
                "owner"
            ) {

                return;

            }


            if (
                type === "messages"
            ) {

                previewUsage.messages_used++;

            }


            if (
                type === "images"
            ) {

                previewUsage.images_used++;

            }


            if (
                type === "videos"
            ) {

                previewUsage.videos_used++;

            }


            savePreviewUsage();

            renderPreviewModal();

        };


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message
    ) {

        let toast =
            document.getElementById(
                "novaPreviewToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );

            toast.id =
                "novaPreviewToast";


            toast.style.position =
                "fixed";

            toast.style.left =
                "50%";

            toast.style.bottom =
                "25px";

            toast.style.transform =
                "translateX(-50%)";

            toast.style.zIndex =
                "999999";

            toast.style.padding =
                "12px 17px";

            toast.style.borderRadius =
                "14px";

            toast.style.background =
                "#111827";

            toast.style.color =
                "#fff";

            toast.style.fontSize =
                "13px";

            toast.style.fontWeight =
                "700";

            toast.style.boxShadow =
                "0 15px 50px rgba(0,0,0,.4)";

            document.body.appendChild(
                toast
            );

        }


        toast.textContent =
            message;

        toast.style.opacity =
            "1";


        clearTimeout(
            toast._timer
        );


        toast._timer =
            setTimeout(

                () => {

                    toast.style.opacity =
                        "0";

                },

                2200

            );

    }


    /* =====================================================
       LANGUAGE
    ===================================================== */

    function bindLanguageButton() {

        document
            .getElementById(
                "novaLanguageProfileBtn"
            )
            ?.addEventListener(

                "click",

                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    document
                        .getElementById(
                            "novaProfileMenu"
                        )
                        ?.classList.remove(
                            "show"
                        );


                    const languageItem =
                        document.querySelector(
                            '[data-setting="language"]'
                        );


                    if (
                        languageItem
                    ) {

                        languageItem.click();

                        return;

                    }


                    const languageModal =
                        document.getElementById(
                            "languageModal"
                        );


                    if (
                        languageModal
                    ) {

                        languageModal.classList.add(
                            "show"
                        );

                        return;

                    }


                    showToast(
                        "افتح إعدادات اللغة من الإعدادات."
                    );

                }

            );

    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function bindSettingsButton() {

        document
            .getElementById(
                "novaSettingsProfileBtn"
            )
            ?.addEventListener(

                "click",

                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    document
                        .getElementById(
                            "novaProfileMenu"
                        )
                        ?.classList.remove(
                            "show"
                        );


                    const settingsButton =
                        document.getElementById(
                            "settingsBtn"
                        );


                    if (
                        settingsButton
                    ) {

                        settingsButton.click();

                    }

                }

            );

    }


    /* =====================================================
       USAGE
    ===================================================== */

    function bindUsageButton() {

        document
            .getElementById(
                "novaUsageProfileBtn"
            )
            ?.addEventListener(

                "click",

                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    const plan =
                        getActivePlan();


                    showToast(

                        `${plan.name}: ${formatLimit(plan.daily_messages)} رسالة / ${formatLimit(plan.daily_images)} صورة / ${formatLimit(plan.daily_videos)} فيديو يوميًا`

                    );

                }

            );

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function bindLogout() {

        document
            .getElementById(
                "novaProfileLogoutBtn"
            )
            ?.addEventListener(

                "click",

                async event => {

                    event.preventDefault();

                    event.stopPropagation();


                    try {

                        if (
                            supabaseClient
                        ) {

                            await supabaseClient
                                .auth
                                .signOut();

                        }

                    } catch (
                        error
                    ) {

                        console.error(
                            "Nova Logout Error:",
                            error
                        );

                    }


                    safeRemove(
                        PREVIEW_STORAGE
                    );

                    safeRemove(
                        USAGE_STORAGE
                    );


                    window.location.href =
                        "login.html";

                }

            );

    }


    /* =====================================================
       LOAD FROM SUPABASE
    ===================================================== */

    async function loadAccount() {

        supabaseClient =
            window.novaSupabase;


        if (!supabaseClient) {

            console.error(
                "Nova: Supabase not found."
            );

            return false;

        }


        const {
            data:
                sessionData,
            error:
                sessionError
        } =
            await supabaseClient
                .auth
                .getSession();


        if (
            sessionError ||
            !sessionData?.session?.user
        ) {

            return false;

        }


        user =
            sessionData.session.user;


        const {
            data:
                profileData,
            error:
                profileError
        } =
            await supabaseClient

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
            profileError
        ) {

            console.error(
                "Nova Profile Error:",
                profileError
            );

            return false;

        }


        if (!profileData) {

            return false;

        }


        profile =
            profileData;


        /*
         * أهم سطر:
         * الصلاحية من Supabase
         */

        isOwner =
            profile.role ===
            "owner";


        return true;

    }


    /* =====================================================
       LOAD OWNER PREVIEW STATE
    ===================================================== */

    function loadPreviewState() {

        if (!isOwner) {

            previewPlan =
                "owner";

            return;

        }


        loadPreviewUsage();


        const saved =
            safeGet(
                PREVIEW_STORAGE
            );


        if (

            saved === "free" ||
            saved === "pro" ||
            saved === "ultra"

        ) {

            previewPlan =
                saved;

        } else {

            previewPlan =
                "owner";

        }

    }


    /* =====================================================
       SECURITY CLEANUP
    ===================================================== */

    function cleanupIfNotOwner() {

        if (isOwner) {
            return;
        }


        safeRemove(
            PREVIEW_STORAGE
        );


        safeRemove(
            USAGE_STORAGE
        );


        previewPlan =
            "owner";


        window.novaIsPlanPreviewActive =
            false;


        window.novaEffectivePlan =
            null;


        document
            .getElementById(
                "openOwnerPreviewBtn"
            )
            ?.remove();


        document
            .getElementById(
                "novaOwnerPreviewModal"
            )
            ?.remove();

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function init() {

        const ok =
            await loadAccount();


        /*
         * حتى لو الحساب عادي:
         * اعمل زر الحساب.
         */

        injectProfileUI();


        if (!ok) {

            return;

        }


        cleanupIfNotOwner();


        /*
         * OWNER فقط
         */

        if (isOwner) {

            loadPreviewState();

            injectPreviewModal();

            renderOwnerMenuItem();

            bindLanguageButton();

            bindSettingsButton();

            bindUsageButton();

            bindLogout();

            applyPreviewState();

            renderPreviewModal();


            console.log(
                "Nova Owner Preview: OWNER ACCESS ✅"
            );

        } else {

            /*
             * حساب عادي
             */

            renderProfile();

            bindLanguageButton();

            bindSettingsButton();

            bindUsageButton();

            bindLogout();


            console.log(
                "Nova Owner Preview: regular user"
            );

        }

    }


    /* =====================================================
       AUTH STATE CHANGES
    ===================================================== */

    async function setupAuthListener() {

        if (
            !supabaseClient
        ) {

            return;

        }


        supabaseClient
            .auth
            .onAuthStateChange(

                async event => {

                    if (
                        event ===
                        "SIGNED_OUT"
                    ) {

                        cleanupIfNotOwner();

                        return;

                    }


                    if (

                        event ===
                        "SIGNED_IN" ||

                        event ===
                        "TOKEN_REFRESHED"

                    ) {

                        await init();

                    }

                }

            );

    }


    /* =====================================================
       BOOT
    ===================================================== */

    async function boot() {

        if (
            document.readyState ===
            "loading"
        ) {

            document.addEventListener(
                "DOMContentLoaded",
                boot,
                {
                    once: true
                }
            );

            return;

        }


        /*
         * استنى شوية عشان:
         * Supabase
         * auth-guard
         * script.js
         * profile.js
         * يكونوا بدأوا
         */

        setTimeout(

            async () => {

                await init();

                await setupAuthListener();

            },

            400

        );

    }


    boot();


})();
