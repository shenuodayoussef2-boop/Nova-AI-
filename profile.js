/* ==========================================
   NOVA AI - USER PROFILE
========================================== */

(function () {

    "use strict";


    const supabaseClient =
        window.novaSupabase;


    if (!supabaseClient) {

        console.error(
            "Nova Profile: Supabase not found."
        );

        return;

    }


    const profileBtn =
        document.getElementById(
            "novaProfileBtn"
        );

    const profileMenu =
        document.getElementById(
            "novaProfileMenu"
        );

    const profileAvatar =
        document.getElementById(
            "novaProfileAvatar"
        );

    const menuAvatar =
        document.getElementById(
            "novaMenuAvatar"
        );

    const profileName =
        document.getElementById(
            "novaProfileName"
        );

    const menuName =
        document.getElementById(
            "novaMenuName"
        );

    const menuEmail =
        document.getElementById(
            "novaMenuEmail"
        );

    const profilePlan =
        document.getElementById(
            "novaProfilePlan"
        );

    const menuPlan =
        document.getElementById(
            "novaMenuPlan"
        );

    const themeOptions =
        document.querySelectorAll(
            ".nova-theme-option"
        );

    const logoutBtn =
        document.getElementById(
            "novaLogoutBtn"
        );

    const profileLanguage =
        document.getElementById(
            "novaProfileLanguage"
        );

    const profileUsage =
        document.getElementById(
            "novaProfileUsage"
        );

    const profileSettings =
        document.getElementById(
            "novaProfileSettings"
        );


    let currentUser = null;
    let currentProfile = null;


    /* ==========================================
       INITIALS
    ========================================== */

    function getInitials(
        name
    ) {

        if (!name) {
            return "N";
        }


        const clean =
            name.trim();


        const words =
            clean
                .split(/\s+/)
                .filter(Boolean);


        if (!words.length) {
            return "N";
        }


        /*
         * Arabic -> Latin initials
         *
         * يوسف شنوده
         * -> YS
         */

        const arabicMap = {

            "ا": "A",
            "أ": "A",
            "إ": "A",
            "آ": "A",

            "ب": "B",
            "ت": "T",
            "ث": "T",

            "ج": "J",
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

            "ي": "Y",

            "ى": "Y"
        };


        function firstLetter(
            word
        ) {

            const first =
                word.charAt(0);


            if (
                arabicMap[first]
            ) {

                return arabicMap[
                    first
                ];

            }


            return first
                .toUpperCase();

        }


        if (
            words.length === 1
        ) {

            return firstLetter(
                words[0]
            );

        }


        return (
            firstLetter(words[0]) +
            firstLetter(words[1])
        )
        .slice(
            0,
            2
        );

    }


    /* ==========================================
       PLAN LABEL
    ========================================== */

    function formatPlan(
        plan
    ) {

        switch (
            String(plan)
                .toLowerCase()
        ) {

            case "pro":
                return "PRO";

            case "ultra":
                return "ULTRA";

            default:
                return "FREE";

        }

    }


    /* ==========================================
       APPLY PROFILE
    ========================================== */

    function renderProfile() {

        if (!currentUser) {
            return;
        }


        const metadata =
            currentUser.user_metadata ||
            {};


        const name =
            currentProfile?.name ||
            metadata.name ||
            currentUser.email
                ?.split("@")[0] ||
            "Nova User";


        const email =
            currentUser.email ||
            "—";


        const plan =
            currentProfile?.plan ||
            "free";


        const initials =
            getInitials(
                name
            );


        profileAvatar.textContent =
            initials;


        menuAvatar.textContent =
            initials;


        profileName.textContent =
            name;


        menuName.textContent =
            name;


        menuEmail.textContent =
            email;


        const planText =
            formatPlan(
                plan
            );


        profilePlan.textContent =
            planText;


        menuPlan.textContent =
            planText;


        profilePlan.classList.remove(
            "free",
            "pro",
            "ultra"
        );


        profilePlan.classList.add(
            String(plan)
                .toLowerCase()
        );


        const activeTheme =
            currentProfile?.theme ||
            localStorage.getItem(
                "novaTheme"
            ) ||
            "nova";


        setActiveThemeButton(
            activeTheme
        );

    }


    /* ==========================================
       LOAD PROFILE
    ========================================== */

    async function loadProfile() {

        try {

            const {
                data: sessionData,
                error: sessionError
            } =
                await supabaseClient.auth
                    .getSession();


            if (
                sessionError ||
                !sessionData?.session
            ) {

                return;

            }


            currentUser =
                sessionData.session.user;


            const {
                data,
                error
            } =
                await supabaseClient
                    .from("profiles")
                    .select(
                        "id, name, avatar_url, plan, theme, language"
                    )
                    .eq(
                        "id",
                        currentUser.id
                    )
                    .maybeSingle();


            if (error) {

                console.error(
                    "Nova Profile DB Error:",
                    error
                );

                /*
                 * لو الجدول لسه مش موجود،
                 * نكمل بـ FREE بدل ما نكسر التطبيق.
                 */

                currentProfile = {
                    name:
                        currentUser
                            .user_metadata
                            ?.name ||
                        "",
                    plan: "free",
                    theme:
                        localStorage.getItem(
                            "novaTheme"
                        ) ||
                        "nova",
                    language:
                        localStorage.getItem(
                            "novaLanguage"
                        ) ||
                        "auto"
                };

            } else {

                currentProfile =
                    data || {
                        name:
                            currentUser
                                .user_metadata
                                ?.name ||
                            "",
                        plan: "free",
                        theme: "nova",
                        language: "auto"
                    };

            }


            renderProfile();


            /*
             * لو اللغة محفوظة في Profile
             * نستخدمها
             */

            if (
                currentProfile?.language
            ) {

                localStorage.setItem(
                    "novaLanguage",
                    currentProfile.language
                );

            }


            /*
             * لو الثيم محفوظ
             */

            if (
                currentProfile?.theme
            ) {

                localStorage.setItem(
                    "novaTheme",
                    currentProfile.theme
                );

                applyTheme(
                    currentProfile.theme
                );

            }

        } catch (error) {

            console.error(
                "Nova Profile Error:",
                error
            );

        }

    }


    /* ==========================================
       OPEN / CLOSE
    ========================================== */

    function closeProfileMenu() {

        profileMenu?.classList.remove(
            "active"
        );

        profileBtn?.classList.remove(
            "open"
        );

        profileBtn?.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    profileBtn?.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();


            const isOpen =
                profileMenu.classList.contains(
                    "active"
                );


            if (isOpen) {

                closeProfileMenu();

            } else {

                profileMenu.classList.add(
                    "active"
                );

                profileBtn.classList.add(
                    "open"
                );

                profileBtn.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }

        }
    );


    document.addEventListener(
        "click",
        function (event) {

            if (
                !profileMenu ||
                !profileBtn
            ) {
                return;
            }


            if (
                !profileMenu.contains(
                    event.target
                ) &&
                !profileBtn.contains(
                    event.target
                )
            ) {

                closeProfileMenu();

            }

        }
    );


    /* ==========================================
       THEME
    ========================================== */

    function applyTheme(
        theme
    ) {

        theme =
            theme || "nova";


        document.documentElement
            .setAttribute(
                "data-nova-theme",
                theme
            );


        localStorage.setItem(
            "novaTheme",
            theme
        );


        setActiveThemeButton(
            theme
        );

    }


    function setActiveThemeButton(
        theme
    ) {

        themeOptions.forEach(
            option => {

                option.classList.toggle(
                    "active",
                    option.dataset.theme ===
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
            !currentUser
        ) {

            return;

        }


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("profiles")
                    .update({
                        theme,
                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        "id",
                        currentUser.id
                    );


            if (error) {

                console.error(
                    "Nova Theme Save Error:",
                    error
                );

            } else if (
                currentProfile
            ) {

                currentProfile.theme =
                    theme;

            }

        } catch (error) {

            console.error(
                "Nova Theme Exception:",
                error
            );

        }

    }


    themeOptions.forEach(
        option => {

            option.addEventListener(
                "click",
                function () {

                    const theme =
                        option.dataset.theme ||
                        "nova";


                    saveTheme(
                        theme
                    );

                }
            );

        }
    );


    /* ==========================================
       LANGUAGE
    ========================================== */

    profileLanguage?.addEventListener(
        "click",
        function () {

            closeProfileMenu();


            const languageSetting =
                document.querySelector(
                    '[data-setting="language"]'
                );


            if (
                languageSetting
            ) {

                languageSetting.click();

            }

        }
    );


    /* ==========================================
       SETTINGS
    ========================================== */

    profileSettings?.addEventListener(
        "click",
        function () {

            closeProfileMenu();


            const settingsBtn =
                document.getElementById(
                    "settingsBtn"
                );


            if (
                settingsBtn
            ) {

                settingsBtn.click();

            }

        }
    );


    /* ==========================================
       USAGE
    ========================================== */

    profileUsage?.addEventListener(
        "click",
        function () {

            closeProfileMenu();


            alert(
                "Usage system هيتربط بالـ Free / Pro / Ultra لاحقًا."
            );

        }
    );


    /* ==========================================
       LOGOUT
    ========================================== */

    logoutBtn?.addEventListener(
        "click",
        async function () {

            logoutBtn.disabled =
                true;


            try {

                const {
                    error
                } =
                    await supabaseClient
                        .auth
                        .signOut();


                if (error) {

                    throw error;

                }


                localStorage.removeItem(
                    "novaTheme"
                );


                localStorage.removeItem(
                    "novaLanguage"
                );


                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Nova Logout Error:",
                    error
                );


                logoutBtn.disabled =
                    false;


                alert(
                    "تعذر تسجيل الخروج حاليًا."
                );

            }

        }
    );


    /* ==========================================
       INIT
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            loadProfile
        );

    } else {

        loadProfile();

    }

})();
/* =========================================================
   NOVA AI - PROFILE
========================================================= */

(() => {

    "use strict";


    let supabaseClient = null;

    let currentUser = null;

    let currentProfile = null;


    /* =====================================================
       ELEMENTS
    ===================================================== */

    function getElements() {

        return {

            profileBtn:
                document.getElementById(
                    "novaProfileBtn"
                ),

            profileMenu:
                document.getElementById(
                    "novaProfileMenu"
                ),

            profileArrow:
                document.getElementById(
                    "novaProfileArrow"
                ),

            avatar:
                document.getElementById(
                    "novaProfileAvatar"
                ),

            name:
                document.getElementById(
                    "novaProfileName"
                ),

            plan:
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

            settings:
                document.getElementById(
                    "novaProfileSettingsBtn"
                ),

            language:
                document.getElementById(
                    "novaProfileLanguageBtn"
                ),

            logout:
                document.getElementById(
                    "novaProfileLogoutBtn"
                )

        };

    }


    /* =====================================================
       INITIALS
    ===================================================== */

    function getInitials(name) {

        if (!name) {

            return "YS";

        }


        const parts =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (parts.length >= 2) {

            return (

                getFirstLetter(
                    parts[0]
                ) +

                getFirstLetter(
                    parts[1]
                )

            );

        }


        return String(
            parts[0]
        )
            .slice(0, 2)
            .toUpperCase();

    }


    function getFirstLetter(
        value
    ) {

        const char =
            String(value)
                .trim()
                .charAt(0);


        const arabicMap = {

            "أ": "A",
            "إ": "E",
            "آ": "A",
            "ا": "A",
            "ب": "B",
            "ت": "T",
            "ج": "G",
            "ح": "H",
            "خ": "K",
            "د": "D",
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

            char.toUpperCase() ||

            "N"

        );

    }


    /* =====================================================
       LOAD USER
    ===================================================== */

    async function loadProfile() {

        supabaseClient =
            window.novaSupabase;


        if (!supabaseClient) {

            console.error(
                "Nova Profile: Supabase client not found."
            );

            return;

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

            console.warn(
                "Nova Profile: no active session."
            );

            return;

        }


        currentUser =
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
                    "id,name,plan,role,language"
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

                name:
                    currentUser
                        ?.user_metadata
                        ?.name ||

                    currentUser
                        ?.email
                        ?.split("@")[0] ||

                    "Nova User",

                plan:
                    "free",

                role:
                    "user",

                language:
                    "auto"

            };


        renderProfile();

    }


    /* =====================================================
       RENDER
    ===================================================== */

    function renderProfile() {

        const el =
            getElements();


        const name =
            currentProfile?.name ||

            currentUser
                ?.user_metadata
                ?.name ||

            currentUser
                ?.email
                ?.split("@")[0] ||

            "Nova User";


        const plan =
            (
                currentProfile
                    ?.plan ||

                "free"
            )
                .toLowerCase();


        const initials =
            getInitials(
                name
            );


        /*
         * Avatar
         */

        if (el.avatar) {

            el.avatar.textContent =
                initials;

        }


        if (el.menuAvatar) {

            el.menuAvatar.textContent =
                initials;

        }


        /*
         * Name
         */

        if (el.name) {

            el.name.textContent =
                name;

        }


        if (el.menuName) {

            el.menuName.textContent =
                name;

        }


        /*
         * Email
         */

        if (el.menuEmail) {

            el.menuEmail.textContent =
                currentUser?.email ||
                "";

        }


        /*
         * Plan
         */

        const planText =
            plan === "pro"

                ? "PRO"

                : plan === "ultra"

                    ? "ULTRA"

                    : "FREE";


        if (el.plan) {

            el.plan.textContent =
                planText;

            el.plan.classList.remove(

                "free",

                "pro",

                "ultra"

            );

            el.plan.classList.add(
                plan
            );

        }


        if (el.menuPlan) {

            el.menuPlan.textContent =
                planText;

        }

    }


    /* =====================================================
       OPEN / CLOSE
    ===================================================== */

    function toggleProfile() {

        const el =
            getElements();


        if (
            !el.profileBtn ||
            !el.profileMenu
        ) {

            console.error(
                "Nova Profile: profile button/menu not found."
            );

            return;

        }


        const isOpen =
            el.profileMenu.classList.contains(
                "show"
            );


        /*
         * اقفل القوائم الثانية
         */

        document
            .querySelectorAll(
                ".nova-profile-menu.show"
            )
            .forEach(
                menu => {

                    menu.classList.remove(
                        "show"
                    );

                }
            );


        /*
         * افتح / اقفل
         */

        if (!isOpen) {

            el.profileMenu.classList.add(
                "show"
            );

            el.profileBtn.setAttribute(
                "aria-expanded",
                "true"
            );


            if (el.profileArrow) {

                el.profileArrow.style.transform =
                    "rotate(180deg)";

            }

        } else {

            closeProfile();

        }

    }


    function closeProfile() {

        const el =
            getElements();


        el.profileMenu
            ?.classList.remove(
                "show"
            );


        el.profileBtn
            ?.setAttribute(
                "aria-expanded",
                "false"
            );


        if (el.profileArrow) {

            el.profileArrow.style.transform =
                "rotate(0deg)";

        }

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {

        const el =
            getElements();


        if (
            el.profileBtn
        ) {

            el.profileBtn.addEventListener(

                "click",

                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    toggleProfile();

                }

            );

        }


        /*
         * click outside
         */

        document.addEventListener(

            "click",

            event => {

                if (

                    !event.target.closest(
                        "#novaProfileArea"
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
         * Settings
         */

        el.settings?.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

                closeProfile();


                document
                    .getElementById(
                        "settingsBtn"
                    )
                    ?.click();

            }

        );


        /*
         * Language
         */

        el.language?.addEventListener(

            "click",

            event => {

                event.preventDefault();

                event.stopPropagation();

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
                        "show"
                    );

                    return;

                }


                console.log(
                    "Nova: language modal not found."
                );

            }

        );


        /*
         * Logout
         */

        el.logout?.addEventListener(

            "click",

            async event => {

                event.preventDefault();

                event.stopPropagation();


                closeProfile();


                try {

                    await supabaseClient
                        ?.auth
                        ?.signOut();

                } catch (
                    error
                ) {

                    console.error(
                        "Nova Logout Error:",
                        error
                    );

                }


                localStorage.removeItem(
                    "novaAllChats"
                );


                window.location.href =
                    "login.html";

            }

        );

    }


    /* =====================================================
       INIT
    ===================================================== */

    async function init() {

        bindEvents();

        await loadProfile();

    }


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
