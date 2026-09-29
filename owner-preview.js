/* =========================================================
   NOVA AI - OWNER PLAN PREVIEW
   OWNER ONLY
   ---------------------------------------------------------
   - لا يغيّر profiles.plan الحقيقي
   - لا يغيّر profiles.role
   - يعمل كـ Preview محلي للمالك فقط
   - يقرأ role من Supabase
   - المستخدم العادي لا يرى زر المعاينة
   - يدعم FREE / PRO / ULTRA
   - يحاكي حدود الرسائل والصور والفيديو
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE_KEY =
        "novaOwnerPreviewPlan";

    const USAGE_KEY =
        "novaOwnerPreviewUsage";


    /* =====================================================
       DEFAULT PLANS
       fallback فقط لو plans table لم تُقرأ
    ===================================================== */

    const PLAN_DEFAULTS = {

        free: {

            code: "free",

            name: "FREE",

            price: "0 EGP",

            description:
                "الخطة المجانية",

            daily_messages:
                50,

            daily_images:
                5,

            daily_videos:
                0,

            memory_limit:
                20,

            workspace_enabled:
                true,

            voice_enabled:
                true,

            web_search_enabled:
                false,

            file_upload_enabled:
                true,

            priority_support:
                false

        },


        pro: {

            code: "pro",

            name: "PRO",

            price: "99 EGP",

            description:
                "الخطة الاحترافية",

            daily_messages:
                500,

            daily_images:
                50,

            daily_videos:
                10,

            memory_limit:
                200,

            workspace_enabled:
                true,

            voice_enabled:
                true,

            web_search_enabled:
                true,

            file_upload_enabled:
                true,

            priority_support:
                false

        },


        ultra: {

            code: "ultra",

            name: "ULTRA",

            price: "249 EGP",

            description:
                "أقصى إمكانيات Nova",

            daily_messages:
                2000,

            daily_images:
                200,

            daily_videos:
                50,

            memory_limit:
                1000,

            workspace_enabled:
                true,

            voice_enabled:
                true,

            web_search_enabled:
                true,

            file_upload_enabled:
                true,

            priority_support:
                true

        }

    };


    /* =====================================================
       STATE
    ===================================================== */

    let ownerProfile =
        null;

    let plans = {
        ...PLAN_DEFAULTS
    };

    let previewPlan =
        "owner";

    let previewUsage =
        null;

    let initialized =
        false;

    let sendMessageWrapped =
        false;


    /* =====================================================
       DATE KEY
    ===================================================== */

    function todayKey() {

        const date =
            new Date();

        return [

            date.getFullYear(),

            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            ),

            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            )

        ].join("-");

    }


    /* =====================================================
       SAFE LOCAL STORAGE
    ===================================================== */

    function safeGetStorage(
        key
    ) {

        try {

            return localStorage.getItem(
                key
            );

        } catch (error) {

            console.warn(
                "Nova Owner Preview Storage Read Error:",
                error
            );

            return null;

        }

    }


    function safeSetStorage(
        key,
        value
    ) {

        try {

            localStorage.setItem(
                key,
                value
            );

        } catch (error) {

            console.warn(
                "Nova Owner Preview Storage Write Error:",
                error
            );

        }

    }


    function safeRemoveStorage(
        key
    ) {

        try {

            localStorage.removeItem(
                key
            );

        } catch (error) {

            console.warn(
                "Nova Owner Preview Storage Remove Error:",
                error
            );

        }

    }


    /* =====================================================
       USAGE
    ===================================================== */

    function createEmptyUsage() {

        return {

            date:
                todayKey(),

            messages_used:
                0,

            images_used:
                0,

            videos_used:
                0

        };

    }


    function loadUsage() {

        let saved =
            null;

        try {

            saved =
                JSON.parse(
                    safeGetStorage(
                        USAGE_KEY
                    )
                );

        } catch {

            saved =
                null;

        }


        if (

            saved &&

            saved.date ===
                todayKey()

        ) {

            previewUsage =
                {

                    date:
                        saved.date,

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

        } else {

            previewUsage =
                createEmptyUsage();

            saveUsage();

        }

    }


    function saveUsage() {

        if (!previewUsage) {

            previewUsage =
                createEmptyUsage();

        }

        safeSetStorage(

            USAGE_KEY,

            JSON.stringify(
                previewUsage
            )

        );

    }


    /* =====================================================
       ACTIVE PLAN
    ===================================================== */

    function getActivePlan() {

        /*
         * الوضع الحقيقي للمالك
         */

        if (

            previewPlan ===
                "owner"

        ) {

            return {

                code:
                    "owner",

                name:
                    "OWNER",

                price:
                    "غير محدود",

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

                workspace_enabled:
                    true,

                voice_enabled:
                    true,

                web_search_enabled:
                    true,

                file_upload_enabled:
                    true,

                priority_support:
                    true

            };

        }


        /*
         * Preview Plan
         */

        return (

            plans[
                previewPlan
            ] ||

            PLAN_DEFAULTS[
                previewPlan
            ] ||

            PLAN_DEFAULTS.free

        );

    }


    /* =====================================================
       LIMIT HELPERS
    ===================================================== */

    function getUsageValue(
        kind
    ) {

        if (!previewUsage) {

            loadUsage();

        }


        switch (kind) {

            case "messages":

                return (
                    Number(
                        previewUsage.messages_used
                    ) || 0
                );


            case "images":

                return (
                    Number(
                        previewUsage.images_used
                    ) || 0
                );


            case "videos":

                return (
                    Number(
                        previewUsage.videos_used
                    ) || 0
                );


            default:

                return 0;

        }

    }


    function getLimit(
        kind
    ) {

        const plan =
            getActivePlan();


        switch (kind) {

            case "messages":

                return plan.daily_messages;


            case "images":

                return plan.daily_images;


            case "videos":

                return plan.daily_videos;


            default:

                return Infinity;

        }

    }


    function formatLimit(
        value
    ) {

        if (
            value ===
            Infinity
        ) {

            return "∞";

        }


        if (
            value ===
            null ||
            value ===
            undefined
        ) {

            return "0";

        }


        return String(
            value
        );

    }


    /* =====================================================
       OWNER CHECK
    ===================================================== */

    function isOwner() {

        return Boolean(

            ownerProfile &&

            ownerProfile.role ===
                "owner"

        );

    }


    /* =====================================================
       PREVIEW PLAN SET
    ===================================================== */

    function setPreviewPlan(
        plan
    ) {

        /*
         * حماية أولى
         */

        if (!isOwner()) {

            console.warn(
                "Nova Owner Preview: access denied."
            );

            return false;

        }


        /*
         * allowed values
         */

        const allowedPlans = [

            "owner",

            "free",

            "pro",

            "ultra"

        ];


        if (
            !allowedPlans.includes(
                plan
            )
        ) {

            return false;

        }


        previewPlan =
            plan;


        if (
            plan ===
                "owner"
        ) {

            safeRemoveStorage(
                STORAGE_KEY
            );

        } else {

            safeSetStorage(

                STORAGE_KEY,

                plan

            );

        }


        applyPreviewState();

        renderPreviewModal();


        showPreviewToast(

            plan === "owner"

                ? "رجعنا للوضع الحقيقي للمالك 👑"

                : `تم تشغيل معاينة ${getActivePlan().name}`

        );


        return true;

    }


    /* =====================================================
       PUBLIC SET PREVIEW
    ===================================================== */

    window.novaOwnerSetPreviewPlan =
        function (
            plan
        ) {

            return setPreviewPlan(
                plan
            );

        };


    /* =====================================================
       PUBLIC GET ACTIVE PLAN
    ===================================================== */

    window.novaGetEffectivePlan =
        function () {

            return getActivePlan();

        };


    /* =====================================================
       CHECK USAGE
    ===================================================== */

    window.novaOwnerPreviewCanUse =
        function (
            kind
        ) {

            /*
             * أي مستخدم عادي
             * لا يدخل نظام الـ preview
             */

            if (
                !isOwner()
            ) {

                return true;

            }


            /*
             * الوضع الحقيقي للمالك
             */

            if (
                previewPlan ===
                    "owner"
            ) {

                return true;

            }


            const used =
                getUsageValue(
                    kind
                );

            const limit =
                getLimit(
                    kind
                );


            if (

                limit !==
                    Infinity &&

                used >=
                    limit

            ) {

                const labels = {

                    messages:
                        "الرسائل",

                    images:
                        "الصور",

                    videos:
                        "الفيديوهات"

                };


                const label =
                    labels[
                        kind
                    ] ||
                    "الاستخدام";


                showPreviewToast(

                    `خلصت حصة ${label} في معاينة خطة ${getActivePlan().name} اليوم.`

                );


                return false;

            }


            return true;

        };


    /* =====================================================
       CONSUME USAGE
    ===================================================== */

    window.novaOwnerPreviewConsume =
        function (
            kind
        ) {

            /*
             * non-owner
             */

            if (
                !isOwner()
            ) {

                return;

            }


            /*
             * الحقيقي
             */

            if (
                previewPlan ===
                    "owner"
            ) {

                return;

            }


            if (!previewUsage) {

                loadUsage();

            }


            if (
                kind ===
                    "messages"
            ) {

                previewUsage.messages_used++;

            }


            if (
                kind ===
                    "images"
            ) {

                previewUsage.images_used++;

            }


            if (
                kind ===
                    "videos"
            ) {

                previewUsage.videos_used++;

            }


            saveUsage();

            renderPreviewModal();

            applyPreviewState();

        };


    /* =====================================================
       PREVIEW TOAST
    ===================================================== */

    function showPreviewToast(
        message
    ) {

        let toast =
            document.getElementById(
                "novaOwnerPreviewToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );


            toast.id =
                "novaOwnerPreviewToast";


            toast.style.position =
                "fixed";

            toast.style.left =
                "50%";

            toast.style.bottom =
                "24px";

            toast.style.transform =
                "translateX(-50%)";

            toast.style.zIndex =
                "100000";

            toast.style.padding =
                "12px 16px";

            toast.style.borderRadius =
                "14px";

            toast.style.background =
                "#111827";

            toast.style.border =
                "1px solid rgba(255,255,255,.1)";

            toast.style.color =
                "#fff";

            toast.style.fontSize =
                "12px";

            toast.style.fontWeight =
                "700";

            toast.style.boxShadow =
                "0 15px 40px rgba(0,0,0,.35)";

            toast.style.pointerEvents =
                "none";

            toast.style.transition =
                "opacity .25s ease";

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
       INJECT PROFILE BUTTON
    ===================================================== */

    function injectProfileButton() {

        /*
         * حماية
         */

        if (!isOwner()) {

            return;

        }


        /*
         * لا تكرر الزر
         */

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
            document.createElement(
                "button"
            );


        button.id =
            "openOwnerPreviewBtn";


        button.type =
            "button";


        button.className =
            "nova-menu-item nova-owner-preview-item";


        button.innerHTML = `

            <i class="fa-solid fa-flask"></i>

            <span>
                معاينة الخطط
            </span>

            <span class="nova-owner-badge">
                OWNER
            </span>

        `;


        button.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

                showPreviewModal();

            }

        );


        /*
         * الأفضل:
         * داخل profile menu
         */

        if (menu) {

            menu.appendChild(
                button
            );

            return;

        }


        /*
         * fallback
         */

        const sidebarFooter =
            document.querySelector(
                ".sidebar-footer-actions"
            );


        if (sidebarFooter) {

            sidebarFooter.appendChild(
                button
            );

        }

    }


    /* =====================================================
       REMOVE OWNER UI
    ===================================================== */

    function removeOwnerUI() {

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


        document
            .getElementById(
                "novaOwnerPreviewToast"
            )
            ?.remove();

    }


    /* =====================================================
       INJECT MODAL
    ===================================================== */

    function injectModal() {

        if (!isOwner()) {

            return;

        }


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
                role="dialog"
                aria-modal="true"
                aria-labelledby="novaOwnerPreviewTitle"
            >

                <div
                    class="nova-owner-preview-header"
                >

                    <div>

                        <div
                            class="nova-owner-preview-title"
                        >

                            <i
                                class="fa-solid fa-flask"
                            ></i>

                            <div>

                                <h3
                                    id="novaOwnerPreviewTitle"
                                >
                                    معاينة خطط Nova
                                </h3>

                                <p
                                    class="nova-owner-preview-subtitle"
                                >
                                    وضع تجريبي للمالك فقط
                                </p>

                            </div>

                        </div>

                    </div>


                    <button

                        type="button"

                        class="nova-owner-preview-close"

                        id="novaOwnerPreviewClose"

                        aria-label="إغلاق"

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
                        وضع الخطة الحالي
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
                    المعاينة لا تغيّر plan أو role في
                    Supabase. هي مخصصة لاختبار تجربة
                    الخطط والخصائص قبل الإطلاق.
                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        /*
         * Click outside
         */

        modal.addEventListener(

            "click",

            event => {

                if (
                    event.target ===
                    modal
                ) {

                    hidePreviewModal();

                }

            }

        );


        /*
         * Close
         */

        document
            .getElementById(
                "novaOwnerPreviewClose"
            )
            ?.addEventListener(

                "click",

                hidePreviewModal

            );


        /*
         * Reset
         */

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


        /*
         * ESC
         */

        document.addEventListener(

            "keydown",

            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    hidePreviewModal();

                }

            }

        );

    }


    /* =====================================================
       SHOW / HIDE MODAL
    ===================================================== */

    function showPreviewModal() {

        if (!isOwner()) {

            return;

        }


        const modal =
            document.getElementById(
                "novaOwnerPreviewModal"
            );


        if (!modal) {

            injectModal();

        }


        document
            .getElementById(
                "novaOwnerPreviewModal"
            )
            ?.classList.add(
                "show"
            );


        renderPreviewModal();

    }


    function hidePreviewModal() {

        document
            .getElementById(
                "novaOwnerPreviewModal"
            )
            ?.classList.remove(
                "show"
            );

    }


    /* =====================================================
       RENDER MODAL
    ===================================================== */

    function renderPreviewModal() {

        if (!isOwner()) {

            return;

        }


        const currentPlanElement =
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

            !currentPlanElement ||
            !grid ||
            !stats ||
            !features

        ) {

            return;

        }


        const active =
            getActivePlan();


        /*
         * Current plan
         */

        currentPlanElement.textContent =
            active.name;


        /*
         * PLAN BUTTONS
         */

        const buttonPlans = [

            "free",

            "pro",

            "ultra"

        ];


        grid.innerHTML =
            buttonPlans
                .map(

                    code => {

                        const plan =
                            plans[
                                code
                            ] ||

                            PLAN_DEFAULTS[
                                code
                            ];


                        return `

                            <button

                                type="button"

                                class="nova-owner-plan-btn ${
                                    previewPlan === code
                                        ? "active"
                                        : ""
                                }"

                                data-owner-preview-plan="${code}"

                            >

                                <div
                                    class="nova-owner-plan-name"
                                >
                                    ${plan.name}
                                </div>


                                <div
                                    class="nova-owner-plan-price"
                                >
                                    ${plan.price}
                                </div>


                                <div
                                    class="nova-owner-plan-desc"
                                >
                                    ${plan.description}
                                </div>

                            </button>

                        `;

                    }

                )
                .join("");


        /*
         * PLAN EVENTS
         */

        grid
            .querySelectorAll(
                "[data-owner-preview-plan]"
            )
            .forEach(

                button => {

                    button.addEventListener(

                        "click",

                        () => {

                            const plan =
                                button.dataset
                                    .ownerPreviewPlan;

                            setPreviewPlan(
                                plan
                            );

                        }

                    );

                }

            );


        /*
         * STATS
         */

        const messageLimit =
            active.daily_messages;


        const imageLimit =
            active.daily_images;


        const videoLimit =
            active.daily_videos;


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
                    ${formatLimit(messageLimit)}
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
                    ${formatLimit(imageLimit)}
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
                    ${formatLimit(videoLimit)}
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
                    الرسائل المستخدمة
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${
                        previewPlan === "owner"

                            ? "غير محدود"

                            : `${getUsageValue("messages")} / ${formatLimit(messageLimit)}`
                    }
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    الصور المستخدمة
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${
                        previewPlan === "owner"

                            ? "غير محدود"

                            : `${getUsageValue("images")} / ${formatLimit(imageLimit)}`
                    }
                </div>

            </div>


            <div
                class="nova-owner-stat"
            >

                <div
                    class="nova-owner-stat-label"
                >
                    الفيديوهات المستخدمة
                </div>

                <div
                    class="nova-owner-stat-value"
                >
                    ${
                        previewPlan === "owner"

                            ? "غير محدود"

                            : `${getUsageValue("videos")} / ${formatLimit(videoLimit)}`
                    }
                </div>

            </div>

        `;


        /*
         * FEATURES
         */

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
                .map(

                    ([key, label]) => {

                        const enabled =
                            Boolean(
                                active[
                                    key
                                ]
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


    /* =====================================================
       APPLY PREVIEW STATE
    ===================================================== */

    function applyPreviewState() {

        /*
         * remove previous preview classes
         */

        document.body.classList.remove(

            "nova-plan-preview-free",

            "nova-plan-preview-pro",

            "nova-plan-preview-ultra"

        );


        /*
         * add active preview class
         */

        if (

            previewPlan ===
                "free" ||

            previewPlan ===
                "pro" ||

            previewPlan ===
                "ultra"

        ) {

            document.body.classList.add(

                `nova-plan-preview-${previewPlan}`

            );

        }


        /*
         * Global effective plan
         */

        window.novaEffectivePlan =
            getActivePlan();


        window.novaIsPlanPreviewActive =
            (
                previewPlan !==
                "owner"
            );


        /*
         * Event
         */

        window.dispatchEvent(

            new CustomEvent(

                "nova-plan-preview-changed",

                {

                    detail: {

                        plan:
                            previewPlan,

                        effectivePlan:
                            getActivePlan(),

                        usage:
                            previewUsage,

                        owner:
                            true

                    }

                }

            )

        );


        /*
         * Update visible profile
         */

        updateExistingProfileUI();

    }


    /* =====================================================
       UPDATE PROFILE UI
    ===================================================== */

    function updateExistingProfileUI() {

        const active =
            getActivePlan();


        document
            .querySelectorAll(
                ".nova-profile-plan"
            )
            .forEach(

                element => {

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

                }

            );


        document
            .querySelectorAll(
                "[data-nova-plan-label]"
            )
            .forEach(

                element => {

                    element.textContent =
                        active.name;

                }

            );

    }


    /* =====================================================
       READ OWNER FROM SUPABASE
    ===================================================== */

    async function loadOwnerProfile() {

        const client =
            window.novaSupabase;


        if (!client) {

            console.error(
                "Nova Owner Preview: Supabase client not found."
            );

            return null;

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

            return null;

        }


        const user =
            sessionData
                .session
                .user;


        /*
         * اقرأ profile الحقيقي
         */

        const {
            data: profile,
            error: profileError
        } =
            await client

                .from(
                    "profiles"
                )

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

                "Nova Owner Preview: profile query failed.",

                profileError

            );

            return null;

        }


        if (!profile) {

            return null;

        }


        return profile;

    }


    /* =====================================================
       LOAD PLANS FROM SUPABASE
    ===================================================== */

    async function loadPlans() {

        const client =
            window.novaSupabase;


        if (!client) {

            return;

        }


        try {

            const {
                data: planRows,
                error
            } =
                await client

                    .from(
                        "plans"
                    )

                    .select(
                        "*"
                    )

                    .in(
                        "code",
                        [
                            "free",
                            "pro",
                            "ultra"
                        ]
                    );


            if (
                error
            ) {

                console.warn(

                    "Nova Owner Preview: plans query failed, using defaults.",

                    error

                );

                return;

            }


            if (
                Array.isArray(
                    planRows
                )
            ) {

                planRows.forEach(

                    plan => {

                        if (

                            plan &&

                            (
                                plan.code ===
                                    "free" ||

                                plan.code ===
                                    "pro" ||

                                plan.code ===
                                    "ultra"
                            )

                        ) {

                            plans[
                                plan.code
                            ] = {

                                ...PLAN_DEFAULTS[
                                    plan.code
                                ],

                                ...plan

                            };

                        }

                    }

                );

            }

        } catch (error) {

            console.warn(

                "Nova Owner Preview: plans loading exception.",

                error

            );

        }

    }


    /* =====================================================
       LOAD SAVED PREVIEW
    ===================================================== */

    function loadSavedPreview() {

        const saved =
            safeGetStorage(
                STORAGE_KEY
            );


        if (

            saved ===
                "free" ||

            saved ===
                "pro" ||

            saved ===
                "ultra"

        ) {

            previewPlan =
                saved;

        } else {

            previewPlan =
                "owner";

        }

    }


    /* =====================================================
       INSTALL SEND MESSAGE GUARD
    ===================================================== */

    function installSendMessagePreviewGuard() {

        /*
         * لا نركب wrapper أكثر من مرة
         */

        if (
            sendMessageWrapped
        ) {

            return;

        }


        /*
         * sendMessage قد يظهر
         * بعد تحميل script.js
         */

        if (

            typeof window.sendMessage !==
            "function"

        ) {

            return;

        }


        const originalSendMessage =
            window.sendMessage;


        async function wrappedSendMessage(

            customText = null,

            options = {}

        ) {

            /*
             * النص المستخدم
             */

            let text =
                "";


            if (
                customText !==
                null
            ) {

                text =
                    String(
                        customText
                    ).trim();

            } else {

                text = (

                    document
                        .getElementById(
                            "chatInput"
                        )
                        ?.value ||

                    ""

                ).trim();

            }


            /*
             * لو مش Owner
             * لا تدخل preview
             */

            if (
                !isOwner()
            ) {

                return originalSendMessage(

                    customText,

                    options

                );

            }


            /*
             * الوضع الحقيقي
             */

            if (

                !window
                    .novaIsPlanPreviewActive

            ) {

                return originalSendMessage(

                    customText,

                    options

                );

            }


            /*
             * حد الرسائل
             */

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


            /*
             * Image detection
             */

            const isImage =

                lower.includes(
                    "صورة"
                ) ||

                lower.includes(
                    "صوره"
                ) ||

                lower.includes(
                    "ارسم"
                ) ||

                lower.includes(
                    "رسم"
                ) ||

                lower.includes(
                    "صمم صورة"
                ) ||

                lower.includes(
                    "اعمل صورة"
                ) ||

                lower.includes(
                    "توليد صورة"
                ) ||

                lower.includes(
                    "توليد صوره"
                ) ||

                lower.includes(
                    "generate image"
                ) ||

                lower.includes(
                    "create image"
                ) ||

                lower.includes(
                    "draw an image"
                );


            /*
             * Video detection
             */

            const isVideo =

                lower.includes(
                    "فيديو"
                ) ||

                lower.includes(
                    "مشهد متحرك"
                ) ||

                lower.includes(
                    "اعمل فيديو"
                ) ||

                lower.includes(
                    "سوي فيديو"
                ) ||

                lower.includes(
                    "توليد فيديو"
                ) ||

                lower.includes(
                    "generate video"
                ) ||

                lower.includes(
                    "create video"
                );


            /*
             * Image limit
             */

            if (
                isImage &&

                !window
                    .novaOwnerPreviewCanUse(
                        "images"
                    )

            ) {

                return;

            }


            /*
             * Video limit
             */

            if (
                isVideo &&

                !window
                    .novaOwnerPreviewCanUse(
                        "videos"
                    )

            ) {

                return;

            }


            /*
             * Consume message
             */

            window
                .novaOwnerPreviewConsume(
                    "messages"
                );


            /*
             * Consume image
             */

            if (
                isImage
            ) {

                window
                    .novaOwnerPreviewConsume(
                        "images"
                    );

            }


            /*
             * Consume video
             */

            if (
                isVideo
            ) {

                window
                    .novaOwnerPreviewConsume(
                        "videos"
                    );

            }


            /*
             * Run original
             */

            return originalSendMessage(

                customText,

                options

            );

        }


        wrappedSendMessage
            .__novaOwnerPreviewWrapped =
                true;


        window.sendMessage =
            wrappedSendMessage;


        sendMessageWrapped =
            true;


        console.log(
            "Nova Owner Preview: sendMessage guard installed 👑"
        );

    }


    /* =====================================================
       RETRY WRAPPER INSTALLATION
    ===================================================== */

    function waitForSendMessage() {

        if (
            sendMessageWrapped
        ) {

            return;

        }


        installSendMessagePreviewGuard();


        if (
            sendMessageWrapped
        ) {

            return;

        }


        setTimeout(

            waitForSendMessage,

            500

        );

    }


    /* =====================================================
       SECURITY CLEANUP FOR NON-OWNER
    ===================================================== */

    function denyNonOwnerPreview() {

        ownerProfile =
            null;


        previewPlan =
            "owner";


        safeRemoveStorage(
            STORAGE_KEY
        );


        safeRemoveStorage(
            USAGE_KEY
        );


        window.novaIsPlanPreviewActive =
            false;


        window.novaEffectivePlan =
            null;


        removeOwnerUI();

    }


    /* =====================================================
       MAIN INITIALIZATION
    ===================================================== */

    async function initOwnerPreview() {

        /*
         * don't initialize twice
         */

        if (
            initialized
        ) {

            return;

        }


        initialized =
            true;


        try {

            /*
             * Load profile
             */

            const profile =
                await loadOwnerProfile();


            /*
             * Profile missing
             */

            if (!profile) {

                denyNonOwnerPreview();

                return;

            }


            /*
             * OWNER ONLY
             */

            if (
                profile.role !==
                    "owner"
            ) {

                console.log(

                    "Nova Owner Preview: access denied for non-owner."

                );

                denyNonOwnerPreview();

                return;

            }


            /*
             * OWNER CONFIRMED
             */

            ownerProfile =
                profile;


            /*
             * Load plans
             */

            await loadPlans();


            /*
             * Usage
             */

            loadUsage();


            /*
             * Saved preview
             */

            loadSavedPreview();


            /*
             * Build UI
             */

            injectModal();

            injectProfileButton();


            /*
             * Apply state
             */

            applyPreviewState();

            renderPreviewModal();


            /*
             * Install message guard
             */

            waitForSendMessage();


            console.log(

                "Nova Owner Preview Ready 👑",

                {

                    owner:
                        true,

                    realPlan:
                        profile.plan,

                    previewPlan:
                        previewPlan

                }

            );

        } catch (error) {

            console.error(

                "Nova Owner Preview Initialization Error:",

                error

            );


            denyNonOwnerPreview();

        }

    }


    /* =====================================================
       SUPABASE AUTH STATE LISTENER
       لو حصل Logout / Login من نفس الصفحة
    ===================================================== */

    function installAuthListener() {

        const client =
            window.novaSupabase;


        if (
            !client
        ) {

            return;

        }


        try {

            client.auth.onAuthStateChange(

                async (
                    event
                ) => {

                    /*
                     * logout
                     */

                    if (

                        event ===
                            "SIGNED_OUT"

                    ) {

                        denyNonOwnerPreview();

                        return;

                    }


                    /*
                     * login / token refresh
                     */

                    if (

                        event ===
                            "SIGNED_IN" ||

                        event ===
                            "TOKEN_REFRESHED" ||

                        event ===
                            "INITIAL_SESSION"

                    ) {

                        /*
                         * إعادة التحقق من role
                         */

                        initialized =
                            false;

                        ownerProfile =
                            null;

                        await initOwnerPreview();

                    }

                }

            );

        } catch (error) {

            console.warn(

                "Nova Owner Preview Auth Listener Error:",

                error

            );

        }

    }


    /* =====================================================
       BOOT
    ===================================================== */

    async function boot() {

        /*
         * لو الـDOM مش جاهز
         */

        if (
            document.readyState ===
            "loading"
        ) {

            document.addEventListener(

                "DOMContentLoaded",

                boot,

                {

                    once:
                        true

                }

            );

            return;

        }


        /*
         * Give Supabase / profile.js / script.js
         * فرصة بسيطة للتهيئة
         */

        setTimeout(

            async () => {

                await initOwnerPreview();

                installAuthListener();

            },

            250

        );

    }


    boot();

})();
