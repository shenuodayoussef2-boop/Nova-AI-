/* =========================================================
   NOVA AI - PROFILE SYSTEM
   ---------------------------------------------------------
   متوافق مع index.html الحالي
   - لا ينشئ Profile جديد
   - لا يكرر الحساب
   - يفتح / يقفل القائمة
   - يقرأ الاسم والخطة من Supabase
   - يدعم FREE / GO / PRO / ULTRA
   - يدعم العربية والإنجليزية
   - Theme buttons
   - Language
   - Usage
   - Settings
   - Sign out
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    let supabaseClient = null;

    let currentUser = null;

    let currentProfile = null;


    /* =====================================================
       TRANSLATIONS
    ===================================================== */

    const TEXT = {

        ar: {

            currentPlan:
                "الخطة الحالية",

            language:
                "اللغة",

            usage:
                "الاستخدام",

            settings:
                "الإعدادات",

            signOut:
                "تسجيل الخروج",

            free:
                "FREE",

            go:
                "GO",

            pro:
                "PRO",

            ultra:
                "ULTRA",

            usageMessage:
                "الخطة الحالية: {plan}",

            noAccount:
                "لم يتم العثور على الحساب.",

            logoutError:
                "حصل خطأ أثناء تسجيل الخروج."

        },

        en: {

            currentPlan:
                "Current plan",

            language:
                "Language",

            usage:
                "Usage",

            settings:
                "Settings",

            signOut:
                "Sign out",

            free:
                "FREE",

            go:
                "GO",

            pro:
                "PRO",

            ultra:
                "ULTRA",

            usageMessage:
                "Current plan: {plan}",

            noAccount:
                "Account not found.",

            logoutError:
                "An error occurred while signing out."

        }

    };


    /* =====================================================
       LANGUAGE
    ===================================================== */

    function getLanguage() {

        const saved =
            localStorage.getItem(
                "novaLanguage"
            );


        /*
         * Arabic variants
         */

        if (

            saved === "ar" ||

            saved === "ar-eg" ||

            saved === "ar-ma"

        ) {

            return "ar";

        }


        /*
         * English
         */

        if (
            saved === "en"
        ) {

            return "en";

        }


        /*
         * لو Auto
         * نعتمد على dir / lang الحالية
         */

        const htmlLang =
            document.documentElement
                ?.getAttribute(
                    "lang"
                )
                ?.toLowerCase() || "";


        const htmlDir =
            document.documentElement
                ?.getAttribute(
                    "dir"
                )
                ?.toLowerCase() || "";


        if (
            htmlLang.startsWith("ar") ||
            htmlDir === "rtl"
        ) {

            return "ar";

        }


        return "en";

    }


    function t(
        key
    ) {

        const lang =
            getLanguage();


        return (
            TEXT[lang]?.[key] ||
            TEXT.en[key] ||
            key
        );

    }


    /* =====================================================
       ELEMENTS
    ===================================================== */

    function elements() {

        return {

            profileArea:
                document.querySelector(
                    ".nova-profile-area"
                ),

            profileBtn:
                document.getElementById(
                    "novaProfileBtn"
                ),

            profileMenu:
                document.getElementById(
                    "novaProfileMenu"
                ),

            profileArrow:
                document.querySelector(
                    ".nova-profile-arrow"
                ),

            profileAvatar:
                document.getElementById(
                    "novaProfileAvatar"
                ),

            profileName:
                document.getElementById(
                    "novaProfileName"
                ),

            profilePlan:
                document.getElementById(
                    "novaProfilePlan"
                ),

            menuAvatar:
                document.getElementById(
                    "novaMenuAvatar"
                ),

            menuName:
                document.getElementById(
                    "novaMenuName"
                ),

            menuEmail:
                document.getElementById(
                    "novaMenuEmail"
                ),

            menuPlan:
                document.getElementById(
                    "novaMenuPlan"
                ),

            languageBtn:
                document.getElementById(
                    "novaProfileLanguage"
                ),

            usageBtn:
                document.getElementById(
                    "novaProfileUsage"
                ),

            settingsBtn:
                document.getElementById(
                    "novaProfileSettings"
                ),

            logoutBtn:
                document.getElementById(
                    "novaLogoutBtn"
                )

        };

    }


    /* =====================================================
       INITIALS
    ===================================================== */

    function getInitials(
        name
    ) {

        if (!name) {

            return "NA";

        }


        const clean =
            String(name)
                .trim()
                .replace(
                    /\s+/g,
                    " "
                );


        const parts =
            clean
                .split(" ")
                .filter(Boolean);


        if (
            parts.length >= 2
        ) {

            return (

                mapInitial(
                    parts[0]
                ) +

                mapInitial(
                    parts[1]
                )

            );

        }


        return [...parts[0]]
            .slice(0, 2)
            .map(
                char =>
                    mapInitial(char)
            )
            .join("");

    }


    function mapInitial(
        char
    ) {

        const arabicMap = {

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

            arabicMap[char] ||

            String(char || "")
                .charAt(0)
                .toUpperCase() ||

            "N"

        );

    }


    /* =====================================================
       PLAN NAME
    ===================================================== */

    function getPlanName(
        plan
    ) {

        const value =
            String(
                plan || "free"
            )
            .toLowerCase();


        if (
            value === "go"
        ) {

            return t(
                "go"
            );

        }


        if (
            value === "pro"
        ) {

            return t(
                "pro"
            );

        }


        if (
            value === "ultra"
        ) {

            return t(
                "ultra"
            );

        }


        return t(
            "free"
        );

    }


    /* =====================================================
       LOAD PROFILE
    ===================================================== */

    async function loadProfile() {

        supabaseClient =
            window.novaSupabase;


        if (
            !supabaseClient
        ) {

            console.error(
                "Nova Profile: Supabase client not found."
            );

            return;

        }


        try {

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

                console.warn(
                    "Nova Profile: No active session."
                );

                return;

            }


            currentUser =
                sessionData
                    .session
                    .user;


            const {
                data:
                    profileData,
                error:
                    profileError
            } =
                await supabaseClient

                    .from(
                        "profiles"
                    )

                    .select(
                        "id,name,avatar_url,plan,role,theme,language"
                    )

                    .eq(
                        "id",
                        currentUser.id
                    )

                    .maybeSingle();


            if (
                profileError
            ) {

                console.error(
                    "Nova Profile Query Error:",
                    profileError
                );

                return;

            }


            currentProfile =
                profileData || {

                    id:
                        currentUser.id,

                    name:
                        currentUser
                            ?.user_metadata
                            ?.name ||

                        currentUser
                            ?.email
                            ?.split("@")[0] ||

                        "Nova User",

                    avatar_url:
                        null,

                    plan:
                        "free",

                    role:
                        "user",

                    theme:
                        "nova",

                    language:
                        "auto"

                };


            /*
             * حفظ لغة الحساب محليًا
             * لو عنده لغة مسجلة
             */

            if (
                currentProfile.language &&
                currentProfile.language !== "auto"
            ) {

                localStorage.setItem(

                    "novaLanguage",

                    currentProfile.language

                );

            }


            /*
             * حفظ Theme
             */

            if (
                currentProfile.theme
            ) {

                applyTheme(
                    currentProfile.theme
                );

            }


            renderProfile();

            updateLanguageTexts();

        } catch (
            error
        ) {

            console.error(
                "Nova Profile Load Error:",
                error
            );

        }

    }


    /* =====================================================
       RENDER PROFILE
    ===================================================== */

    function renderProfile() {

        if (
            !currentUser ||
            !currentProfile
        ) {

            return;

        }


        const el =
            elements();


        const name =
            currentProfile.name ||

            currentUser
                ?.user_metadata
                ?.name ||

            currentUser
                ?.email
                ?.split("@")[0] ||

            "Nova User";


        const initials =
            getInitials(
                name
            );


        /*
         * Normalize plan
         */

        const plan =
            String(
                currentProfile.plan ||
                "free"
            )
            .toLowerCase();


        const planName =
            getPlanName(
                plan
            );


        /*
         * Avatar
         */

        if (
            el.profileAvatar
        ) {

            if (
                currentProfile.avatar_url
            ) {

                el.profileAvatar.innerHTML = `

                    <img
                        src="${escapeAttribute(
                            currentProfile.avatar_url
                        )}"
                        alt="${escapeAttribute(
                            name
                        )}"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:inherit;
                            display:block;
                        "
                    >

                `;

            } else {

                el.profileAvatar.textContent =
                    initials;

            }

        }


        /*
         * Menu avatar
         */

        if (
            el.menuAvatar
        ) {

            if (
                currentProfile.avatar_url
            ) {

                el.menuAvatar.innerHTML = `

                    <img
                        src="${escapeAttribute(
                            currentProfile.avatar_url
                        )}"
                        alt="${escapeAttribute(
                            name
                        )}"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:inherit;
                            display:block;
                        "
                    >

                `;

            } else {

                el.menuAvatar.textContent =
                    initials;

            }

        }


        /*
         * Name
         */

        if (
            el.profileName
        ) {

            el.profileName.textContent =
                name;

        }


        if (
            el.menuName
        ) {

            el.menuName.textContent =
                name;

        }


        /*
         * Email
         */

        if (
            el.menuEmail
        ) {

            el.menuEmail.textContent =
                currentUser.email ||
                "";

        }


        /*
         * Plan
         */

        if (
            el.profilePlan
        ) {

            el.profilePlan.textContent =
                planName;


            el.profilePlan.classList.remove(

                "free",

                "go",

                "pro",

                "ultra"

            );


            el.profilePlan.classList.add(
                plan
            );

        }


        if (
            el.menuPlan
        ) {

            el.menuPlan.textContent =
                planName;

        }

    }


    /* =====================================================
       OPEN PROFILE
    ===================================================== */

    function openProfile() {

        const el =
            elements();


        if (
            !el.profileMenu ||
            !el.profileBtn
        ) {

            console.error(
                "Nova Profile: Profile menu/button not found."
            );

            return;

        }


        /*
         * مهم جدًا:
         * الـCSS عندك بيستخدم active
         */

        el.profileMenu.classList.add(
            "active"
        );


        el.profileBtn.classList.add(
            "open"
        );


        el.profileBtn.setAttribute(
            "aria-expanded",
            "true"
        );


        if (
            el.profileArrow
        ) {

            el.profileArrow.style.transform =
                "rotate(180deg)";

        }

    }


    /* =====================================================
       CLOSE PROFILE
    ===================================================== */

    function closeProfile() {

        const el =
            elements();


        el.profileMenu
            ?.classList.remove(
                "active"
            );


        el.profileBtn
            ?.classList.remove(
                "open"
            );


        el.profileBtn
            ?.setAttribute(
                "aria-expanded",
                "false"
            );


        if (
            el.profileArrow
        ) {

            el.profileArrow.style.transform =
                "rotate(0deg)";

        }

    }


    /* =====================================================
       TOGGLE PROFILE
    ===================================================== */

    function toggleProfile(
        event
    ) {

        event?.preventDefault();

        event?.stopPropagation();


        const el =
            elements();


        if (
            !el.profileMenu
        ) {

            return;

        }


        const opened =
            el.profileMenu.classList.contains(
                "active"
            );


        if (
            opened
        ) {

            closeProfile();

        } else {

            openProfile();

        }

    }


    /* =====================================================
       THEME
    ===================================================== */

    function applyTheme(
        theme
    ) {

        if (!theme) {
            return;
        }


        document.body.classList.remove(

            "theme-nova",

            "theme-purple",

            "theme-emerald",

            "theme-amoled",

            "purple-theme",

            "emerald-theme",

            "amoled-theme"

        );


        if (
            theme === "nova"
        ) {

            document.body.classList.add(
                "theme-nova"
            );

        }


        if (
            theme === "purple"
        ) {

            document.body.classList.add(
                "theme-purple"
            );

            document.body.classList.add(
                "purple-theme"
            );

        }


        if (
            theme === "emerald"
        ) {

            document.body.classList.add(
                "theme-emerald"
            );

            document.body.classList.add(
                "emerald-theme"
            );

        }


        if (
            theme === "amoled"
        ) {

            document.body.classList.add(
                "theme-amoled"
            );

            document.body.classList.add(
                "amoled-theme"
            );

        }


        localStorage.setItem(
            "novaTheme",
            theme
        );


        document
            .querySelectorAll(
                ".nova-theme-option"
            )
            .forEach(
                button => {

                    button.classList.toggle(

                        "active",

                        button.dataset.theme ===
                            theme

                    );

                }
            );

    }


    async function saveTheme(
        theme
    ) {

        applyTheme(
            theme
        );


        if (
            !supabaseClient ||
            !currentUser
        ) {

            return;

        }


        try {

            await supabaseClient

                .from(
                    "profiles"
                )

                .update({

                    theme:
                        theme,

                    updated_at:
                        new Date()
                            .toISOString()

                })

                .eq(
                    "id",
                    currentUser.id
                );

        } catch (
            error
        ) {

            console.warn(
                "Nova Theme Save Error:",
                error
            );

        }

    }


    function bindThemeButtons() {

        document
            .querySelectorAll(
                ".nova-theme-option"
            )
            .forEach(

                button => {

                    if (
                        button.dataset.profileThemeReady ===
                        "true"
                    ) {

                        return;

                    }


                    button.dataset.profileThemeReady =
                        "true";


                    button.addEventListener(

                        "click",

                        event => {

                            event.preventDefault();

                            event.stopPropagation();


                            const theme =
                                button.dataset.theme;


                            if (
                                theme
                            ) {

                                saveTheme(
                                    theme
                                );

                            }

                        }

                    );

                }

            );

    }


    /* =====================================================
       LANGUAGE
    ===================================================== */

    function openLanguage() {

        closeProfile();


        const languageSetting =
            document.querySelector(
                '[data-setting="language"]'
            );


        if (
            languageSetting
        ) {

            languageSetting.click();

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
                "active"
            );

            return;

        }


        console.warn(
            "Nova Language Modal not found."
        );

    }


    /* =====================================================
       USAGE
    ===================================================== */

    function openUsage() {

        closeProfile();


        const plan =
            getPlanName(
                currentProfile?.plan
            );


        let message =
            t(
                "usageMessage"
            );


        message =
            message.replace(
                "{plan}",
                plan
            );


        showToast(
            message
        );

    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function openSettings() {

        closeProfile();


        document
            .getElementById(
                "settingsBtn"
            )
            ?.click();

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        closeProfile();


        try {

            if (
                supabaseClient
            ) {

                const {
                    error
                } =
                    await supabaseClient
                        .auth
                        .signOut();


                if (
                    error
                ) {

                    throw error;

                }

            }


            /*
             * مش نمسح chats هنا
             * عشان الحساب ممكن يرجع لها محليًا.
             */

            localStorage.removeItem(
                "novaLanguage"
            );


            localStorage.removeItem(
                "novaTheme"
            );


            window.location.replace(
                "login.html"
            );

        } catch (
            error
        ) {

            console.error(
                "Nova Logout Error:",
                error
            );


            showToast(
                t(
                    "logoutError"
                )
            );

        }

    }


    /* =====================================================
       LANGUAGE TEXT UPDATE
    ===================================================== */

    function updateLanguageTexts() {

        const lang =
            getLanguage();


        /*
         * Current plan
         */

        const planLabel =
            document.querySelector(
                ".nova-plan-text span"
            );


        if (
            planLabel
        ) {

            planLabel.textContent =
                t(
                    "currentPlan"
                );

        }


        /*
         * Language
         */

        const languageBtn =
            document.getElementById(
                "novaProfileLanguage"
            );


        if (
            languageBtn
        ) {

            const span =
                languageBtn.querySelector(
                    "span"
                );


            if (
                span
            ) {

                span.textContent =
                    t(
                        "language"
                    );

            }

        }


        /*
         * Usage
         */

        const usageBtn =
            document.getElementById(
                "novaProfileUsage"
            );


        if (
            usageBtn
        ) {

            const span =
                usageBtn.querySelector(
                    "span"
                );


            if (
                span
            ) {

                span.textContent =
                    t(
                        "usage"
                    );

            }

        }


        /*
         * Settings
         */

        const settingsBtn =
            document.getElementById(
                "novaProfileSettings"
            );


        if (
            settingsBtn
        ) {

            const span =
                settingsBtn.querySelector(
                    "span"
                );


            if (
                span
            ) {

                span.textContent =
                    t(
                        "settings"
                    );

            }

        }


        /*
         * Logout
         */

        const logoutBtn =
            document.getElementById(
                "novaLogoutBtn"
            );


        if (
            logoutBtn
        ) {

            const span =
                logoutBtn.querySelector(
                    "span"
                );


            if (
                span
            ) {

                span.textContent =
                    t(
                        "signOut"
                    );

            }

        }


        /*
         * Current plan label / value
         */

        if (
            currentProfile
        ) {

            const plan =
                String(
                    currentProfile.plan ||
                    "free"
                )
                .toLowerCase();


            if (
                document.getElementById(
                    "novaMenuPlan"
                )
            ) {

                document.getElementById(
                    "novaMenuPlan"
                ).textContent =
                    getPlanName(
                        plan
                    );

            }


            if (
                document.getElementById(
                    "novaProfilePlan"
                )
            ) {

                const profilePlan =
                    document.getElementById(
                        "novaProfilePlan"
                    );


                profilePlan.textContent =
                    getPlanName(
                        plan
                    );


                profilePlan.classList.remove(

                    "free",

                    "go",

                    "pro",

                    "ultra"

                );


                profilePlan.classList.add(
                    plan
                );

            }

        }


        /*
         * Let i18n refresh the remaining UI.
         */

        window.dispatchEvent(
            new CustomEvent(
                "nova-profile-language-changed",
                {
                    detail: {
                        language:
                            lang
                    }
                }
            )
        );

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message
    ) {

        let toast =
            document.getElementById(
                "novaProfileToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );


            toast.id =
                "novaProfileToast";


            toast.style.position =
                "fixed";

            toast.style.left =
                "50%";

            toast.style.bottom =
                "24px";

            toast.style.transform =
                "translateX(-50%)";

            toast.style.zIndex =
                "999999";

            toast.style.padding =
                "11px 16px";

            toast.style.borderRadius =
                "13px";

            toast.style.background =
                "rgba(15,23,42,.96)";

            toast.style.color =
                "#fff";

            toast.style.border =
                "1px solid rgba(255,255,255,.1)";

            toast.style.boxShadow =
                "0 15px 40px rgba(0,0,0,.35)";

            toast.style.fontSize =
                "12px";

            toast.style.fontWeight =
                "700";

            toast.style.opacity =
                "0";

            toast.style.pointerEvents =
                "none";

            toast.style.transition =
                "opacity .2s ease";


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

                2000

            );

    }


    /* =====================================================
       ESCAPE ATTRIBUTE
    ===================================================== */

    function escapeAttribute(
        value
    ) {

        return String(
            value || ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            );

    }


    /* =====================================================
       BIND PROFILE
    ===================================================== */

    function bindProfileEvents() {

        const el =
            elements();


        if (
            !el.profileBtn
        ) {

            console.error(
                "Nova Profile: #novaProfileBtn not found."
            );

            return;

        }


        if (
            el.profileBtn.dataset.profileReady ===
            "true"
        ) {

            return;

        }


        el.profileBtn.dataset.profileReady =
            "true";


        /*
         * ACCOUNT BUTTON
         */

        el.profileBtn.addEventListener(

            "click",

            toggleProfile

        );


        /*
         * Prevent menu clicks from bubbling
         */

        el.profileMenu?.addEventListener(

            "click",

            event => {

                event.stopPropagation();

            }

        );


        /*
         * Click outside
         */

        document.addEventListener(

            "click",

            event => {

                if (

                    !el.profileArea?.contains(
                        event.target
                    )

                ) {

                    closeProfile();

                }

            }

        );


        /*
         * ESC
         */

        document.addEventListener(

            "keydown",

            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeProfile();

                }

            }

        );


        /*
         * Language
         */

        el.languageBtn?.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

                openLanguage();

            }

        );


        /*
         * Usage
         */

        el.usageBtn?.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

                openUsage();

            }

        );


        /*
         * Settings
         */

        el.settingsBtn?.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

                openSettings();

            }

        );


        /*
         * Logout
         */

        el.logoutBtn?.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

                logout();

            }

        );


        /*
         * Theme buttons
         */

        bindThemeButtons();

    }


    /* =====================================================
       AUTH STATE
    ===================================================== */

    function setupAuthListener() {

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

                        currentUser =
                            null;

                        currentProfile =
                            null;

                        closeProfile();

                        return;

                    }


                    if (

                        event ===
                        "SIGNED_IN" ||

                        event ===
                        "TOKEN_REFRESHED"

                    ) {

                        await loadProfile();

                    }

                }

            );

    }


    /* =====================================================
       INIT
    ===================================================== */

    async function init() {

        bindProfileEvents();

        await loadProfile();

        setupAuthListener();

    }


    /* =====================================================
       BOOT
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(

            "DOMContentLoaded",

            init,

            {
                once:
                    true
            }

        );

    } else {

        init();

    }

})();
