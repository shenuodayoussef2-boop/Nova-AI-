// ==========================================
// NOVA AI - MAIN SCRIPT
// ==========================================

// ==========================================
// 0. DEMO MODE
// ==========================================

const DEMO_MODE = false;


// ==========================================
// 1. CHAT STATE
// ==========================================

let chatsArray = [];

try {

    const savedChats =
        localStorage.getItem("novaAllChats");

    chatsArray =
        savedChats
            ? JSON.parse(savedChats)
            : [];

    if (!Array.isArray(chatsArray)) {
        chatsArray = [];
    }

} catch (error) {

    console.error(
        "Nova AI - خطأ في بيانات المحادثات:",
        error
    );

    chatsArray = [];

    localStorage.removeItem(
        "novaAllChats"
    );
}


let currentChatId = null;
let currentAbortController = null;
let pendingVisionImage = null;
// ==========================================
// NOVA CHAT QUOTA STATE
// ==========================================

let novaQuota = {
    allowed: true,
    used: 0,
    limit: null,
    remaining: null,
    resetAt: null,
    plan: null
};

let novaQuotaTimer = null;


// ==========================================
// NOVA CHAT QUOTA UI
// ==========================================

function updateNovaQuota(quota) {

    novaQuota = {
        allowed:
            quota?.allowed !== false,

        used:
            Number(quota?.used ?? 0),

        limit:
            quota?.limit ?? null,

        remaining:
            quota?.remaining ?? null,

        resetAt:
            quota?.reset_at || null,

        plan:
            quota?.plan || null
    };

    renderNovaQuotaUI();

    startNovaQuotaTimer();
}


// ==========================================
// CREATE / UPDATE QUOTA BANNER
// ==========================================

function renderNovaQuotaUI() {

    let banner =
        document.getElementById(
            "novaQuotaBanner"
        );

    if (!banner) {

        banner =
            document.createElement("div");

        banner.id =
            "novaQuotaBanner";

        banner.className =
            "nova-quota-banner";

        const inputArea =
            document.querySelector(
                ".chat-input-container"
            ) ||
            document.querySelector(
                ".input-area"
            ) ||
            document.querySelector(
                ".chat-input-wrapper"
            );

        if (inputArea) {

            inputArea.parentNode.insertBefore(
                banner,
                inputArea
            );
        }
    }

    if (
        novaQuota.allowed !== false ||
        novaQuota.plan === "ULTRA"
    ) {

        banner.style.display =
            "none";

        setNovaSendEnabled(true);

        return;
    }

    banner.style.display =
        "flex";

    banner.innerHTML = `

        <div class="nova-quota-icon">
            ⏳
        </div>

        <div class="nova-quota-content">

            <strong>
                وصلت للحد المسموح في هذه المحادثة
            </strong>

            <span id="novaQuotaCountdown">
                يمكنك المتابعة مرة أخرى قريبًا
            </span>

        </div>

    `;

    setNovaSendEnabled(false);

    updateNovaQuotaCountdown();
}

// ==========================================
// ENABLE / DISABLE SEND
// ==========================================

function setNovaSendEnabled(enabled) {

    if (!sendChatBtn) {
        return;
    }

    sendChatBtn.disabled =
        !enabled;

    sendChatBtn.classList.toggle(
        "quota-disabled",
        !enabled
    );
}


// ==========================================
// NOVA QUOTA TIMER
// ==========================================

function startNovaQuotaTimer() {

    if (novaQuotaTimer) {

        clearInterval(
            novaQuotaTimer
        );

    }

    if (
        novaQuota.allowed !== false ||
        !novaQuota.resetAt
    ) {

        return;
    }

    updateNovaQuotaCountdown();

    novaQuotaTimer =
        setInterval(
            updateNovaQuotaCountdown,
            1000
        );
}


// ==========================================
// NOVA QUOTA COUNTDOWN
// ==========================================

function updateNovaQuotaCountdown() {

    const countdown =
        document.getElementById(
            "novaQuotaCountdown"
        );

    if (!countdown) {
        return;
    }

    if (!novaQuota.resetAt) {

        countdown.textContent =
            "يمكنك المتابعة عند التجديد";

        return;
    }

    const resetTime =
        new Date(
            novaQuota.resetAt
        ).getTime();

    const now =
        Date.now();

    const difference =
        resetTime - now;


    // ======================================
    // RESET REACHED
    // ======================================

    if (difference <= 0) {

        if (novaQuotaTimer) {

            clearInterval(
                novaQuotaTimer
            );

            novaQuotaTimer =
                null;
        }

        novaQuota.allowed =
            true;

        novaQuota.used =
            0;

        novaQuota.remaining =
            novaQuota.limit;

        renderNovaQuotaUI();

        return;
    }


    // ======================================
    // CALCULATE TIME
    // ======================================

    const totalSeconds =
        Math.floor(
            difference / 1000
        );

    const hours =
        Math.floor(
            totalSeconds / 3600
        );

    const minutes =
        Math.floor(
            (
                totalSeconds % 3600
            ) / 60
        );

    const seconds =
        totalSeconds % 60;


    // ======================================
    // RESET CLOCK
    // ======================================

    const resetDate =
        new Date(
            novaQuota.resetAt
        );

    const timeText =
        resetDate.toLocaleTimeString(
            "ar-EG",
            {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }
        );


    // ======================================
    // REMAINING TEXT
    // ======================================

    let remainingText = "";

    if (hours > 0) {

        remainingText +=
            `${hours} ساعة `;

    }

    if (
        minutes > 0 ||
        hours > 0
    ) {

        remainingText +=
            `${minutes} دقيقة `;

    }

    remainingText +=
        `${seconds} ثانية`;


    countdown.innerHTML =
        `متاح مرة أخرى الساعة <strong>${timeText}</strong>
        <br>
        <small>
            باقي ${remainingText}
        </small>`;
}


// ==========================================
// 2. DOM REFERENCES
// ==========================================

const historyList =
    document.getElementById(
        "historyList"
    );

const chatBox =
    document.getElementById(
        "chatBox"
    );

const newChatBtn =
    document.getElementById(
        "newChatBtn"
    );

const sendChatBtn =
    document.getElementById(
        "sendChatBtn"
    );

const chatInput =
    document.getElementById(
        "chatInput"
    );

const fileInput =
    document.getElementById(
        "fileInput"
    );

const attachDropdown =
    document.getElementById(
        "attachDropdown"
    );
// ==========================================
// 3. DOM READY
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderHistoryList();

        if (chatsArray.length > 0) {

            loadChat(
                chatsArray[0].id
            );

        } else {

            startNewChat();

        }

        setupSidebar();

        setupAttachments();

        setupVoice();

        setupSettings();

        setupMainEvents();

        setupQuickPrompts();

        setupSubscriptions();

        setupMemory();

    }
);


// ==========================================
// 4. NEW CHAT
// ==========================================

function startNewChat() {

    currentChatId =
        Date.now().toString();

    pendingVisionImage = null;


    if (
        currentAbortController
    ) {

        try {

            currentAbortController.abort();

        } catch (error) {}

        currentAbortController =
            null;

    }


    updateSendButtonState(
        false
    );


    if (chatBox) {

        chatBox.innerHTML = `

            <div class="nova-welcome">

                <div class="nova-welcome-icon">
                    ✨
                </div>

                <h1>
                    أهلاً بيك في Nova AI 👋
                </h1>

                <p>
                    مساعدك الذكي للبرمجة، الكتابة، التعلم والإبداع.
                    ابدأ محادثتك واكتشف إمكانيات Nova.
                </p>

                <div class="quick-prompts">

                    <button
                        class="quick-prompt"
                        data-prompt="اكتب لي فكرة مشروع ويب مبتكر باستخدام HTML وCSS وJavaScript"
                    >

                        <i class="fas fa-code"></i>

                        <span>
                            اقترح لي مشروع برمجي
                        </span>

                    </button>


                    <button
                        class="quick-prompt"
                        data-prompt="اشرح لي الذكاء الاصطناعي بطريقة سهلة وبسيطة"
                    >

                        <i class="fas fa-brain"></i>

                        <span>
                            اشرح لي الذكاء الاصطناعي
                        </span>

                    </button>


                    <button
                        class="quick-prompt"
                        data-prompt="ساعدني في كتابة خطة لتعلم البرمجة من البداية"
                    >

                        <i class="fas fa-graduation-cap"></i>

                        <span>
                            ساعدني أتعلم البرمجة
                        </span>

                    </button>


                    <button
                        class="quick-prompt"
                        data-prompt="اكتب لي قصة قصيرة وممتعة"
                    >

                        <i class="fas fa-book-open"></i>

                        <span>
                            اكتب لي قصة قصيرة
                        </span>

                    </button>

                </div>

            </div>

        `;

    }


    setupQuickPrompts();


    if (chatInput) {

        chatInput.value = "";

        chatInput.style.height =
            "auto";

        chatInput.focus();

    }


    renderHistoryList();

    closeAllMenus();

}


// ==========================================
// 5. SAVE CHAT
// ==========================================

function saveCurrentChat(
    firstUserMessage = "محادثة جديدة"
) {

    if (!chatBox) {
        return;
    }


    const html =
        chatBox.innerHTML;


    const existingIndex =
        chatsArray.findIndex(
            chat =>
                chat.id ===
                currentChatId
        );


    // ======================================
    // EXISTING CHAT
    // ======================================

    if (
        existingIndex !== -1
    ) {

        const existing =
            chatsArray[
                existingIndex
            ];


        /*
         * Smart Chat Title
         *
         * الاسم بيتغير تلقائيًا فقط
         * لو المحادثة لسه باسم "محادثة جديدة".
         *
         * لو المستخدم عمل Rename يدوي:
         * الاسم لن يتم تغييره.
         */

        if (
            existing.title ===
                "محادثة جديدة" &&
            firstUserMessage &&
            firstUserMessage !==
                "محادثة جديدة"
        ) {

            if (
                typeof window.generateSmartChatTitle ===
                "function"
            ) {

                existing.title =
                    window.generateSmartChatTitle(
                        firstUserMessage
                    );

            } else {

                existing.title =
                    String(
                        firstUserMessage
                    )
                    .trim()
                    .substring(
                        0,
                        25
                    );

            }

        }


        existing.html =
            html;

        existing.updatedAt =
            Date.now();

    }


    // ======================================
    // NEW CHAT
    // ======================================

    else {

        let title =
            "محادثة جديدة";


        if (
            firstUserMessage &&
            firstUserMessage !==
                "محادثة جديدة"
        ) {

            if (
                typeof window.generateSmartChatTitle ===
                "function"
            ) {

                title =
                    window.generateSmartChatTitle(
                        firstUserMessage
                    );

            } else {

                title =
                    String(
                        firstUserMessage
                    )
                    .trim()
                    .substring(
                        0,
                        25
                    );

            }

        }


        chatsArray.unshift({

            id:
                currentChatId,

            title,

            html,

            pinned:
                false,

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()

        });

    }


    localStorage.setItem(
        "novaAllChats",
        JSON.stringify(
            chatsArray
        )
    );


    renderHistoryList();

}


// ==========================================
// 6. RENDER HISTORY
// ==========================================

function renderHistoryList() {

    if (!historyList) {
        return;
    }


    historyList.innerHTML = "";


    const sortedChats =
        [...chatsArray].sort(
            (a, b) => {

                if (
                    Boolean(a.pinned) !==
                    Boolean(b.pinned)
                ) {

                    return a.pinned
                        ? -1
                        : 1;

                }


                return (
                    (b.updatedAt ||
                        b.createdAt ||
                        0) -
                    (a.updatedAt ||
                        a.createdAt ||
                        0)
                );

            }
        );


    sortedChats.forEach(
        chat => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "history-item";


            if (
                chat.id ===
                currentChatId
            ) {

                item.classList.add(
                    "active"
                );

            }


            item.dataset.id =
                chat.id;


            const title =
                document.createElement(
                    "span"
                );


            title.className =
                "history-title";


            title.textContent =
                chat.pinned
                    ? "📌 " +
                      (
                        chat.title ||
                        "محادثة جديدة"
                      )
                    : (
                        chat.title ||
                        "محادثة جديدة"
                      );


            const moreBtn =
                document.createElement(
                    "button"
                );


            moreBtn.className =
                "more-btn";

            moreBtn.type =
                "button";

            moreBtn.innerHTML =
                '<i class="fas fa-ellipsis-v"></i>';


            const menu =
                document.createElement(
                    "div"
                );


            menu.className =
                "chat-context-menu";


            menu.innerHTML = `

                <button data-action="share">
                    <i class="fas fa-share-alt"></i>
                    مشاركة
                </button>

                <button data-action="pin">
                    <i class="fas fa-thumbtack"></i>
                    ${
                        chat.pinned
                            ? "إلغاء التثبيت"
                            : "تثبيت"
                    }
                </button>

                <button data-action="rename">
                    <i class="fas fa-pen"></i>
                    إعادة تسمية
                </button>

                <button
                    data-action="delete"
                    class="danger"
                >
                    <i class="fas fa-trash"></i>
                    حذف
                </button>

            `;


            moreBtn.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    closeAllMenus();

                    menu.classList.toggle(
                        "show"
                    );

                }
            );


            menu.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    const button =
                        event.target.closest(
                            "button"
                        );


                    if (!button) {
                        return;
                    }


                    const action =
                        button.dataset.action;


                    if (
                        action ===
                        "share"
                    ) {

                        navigator.clipboard
                            ?.writeText(
                                window.location.href
                            )
                            .then(
                                () => {

                                    showToast(
                                        "تم نسخ رابط الصفحة!"
                                    );

                                }
                            )
                            .catch(
                                () => {

                                    showToast(
                                        "تعذر نسخ الرابط"
                                    );

                                }
                            );

                    }


                    if (
                        action ===
                        "pin"
                    ) {

                        chat.pinned =
                            !chat.pinned;


                        localStorage.setItem(
                            "novaAllChats",
                            JSON.stringify(
                                chatsArray
                            )
                        );


                        renderHistoryList();

                    }


                    if (
                        action ===
                        "rename"
                    ) {

                        const newName =
                            prompt(
                                "أدخل الاسم الجديد للمحادثة:",
                                chat.title
                            );


                        if (
                            newName &&
                            newName.trim()
                        ) {

                            chat.title =
                                newName.trim();


                            localStorage.setItem(
                                "novaAllChats",
                                JSON.stringify(
                                    chatsArray
                                )
                            );


                            renderHistoryList();

                        }

                    }


                    if (
                        action ===
                        "delete"
                    ) {

                        const confirmed =
                            confirm(
                                "هل أنت متأكد من إزالة هذه المحادثة؟"
                            );


                        if (confirmed) {

                            chatsArray =
                                chatsArray.filter(
                                    item =>
                                        item.id !==
                                        chat.id
                                );


                            localStorage.setItem(
                                "novaAllChats",
                                JSON.stringify(
                                    chatsArray
                                )
                            );


                            if (
                                currentChatId ===
                                chat.id
                            ) {

                                if (
                                    chatsArray.length
                                ) {

                                    loadChat(
                                        chatsArray[0].id
                                    );

                                } else {

                                    startNewChat();

                                }

                            } else {

                                renderHistoryList();

                            }

                        }

                    }


                    closeAllMenus();

                }
            );


            item.appendChild(
                title
            );

            item.appendChild(
                moreBtn
            );

            item.appendChild(
                menu
            );


            item.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            ".more-btn"
                        ) ||
                        event.target.closest(
                            ".chat-context-menu"
                        )
                    ) {

                        return;

                    }


                    loadChat(
                        chat.id
                    );

                }
            );


            historyList.appendChild(
                item
            );

        }
    );

}


// ==========================================
// 7. LOAD CHAT
// ==========================================

function loadChat(id) {

    const chat =
        chatsArray.find(
            item =>
                item.id === id
        );


    if (!chat) {
        return;
    }


    currentChatId =
        id;


    pendingVisionImage =
        null;


    if (chatBox) {

        chatBox.innerHTML =
            chat.html || "";

    }


    restoreMessageActions();


    if (chatBox) {

        setTimeout(
            () => {

                chatBox.scrollTop =
                    chatBox.scrollHeight;

            },
            0
        );

    }


    renderHistoryList();

    closeAllMenus();

}


// ==========================================
// 8. CLOSE MENUS
// ==========================================

function closeAllMenus() {

    document
        .querySelectorAll(
            ".chat-context-menu"
        )
        .forEach(
            menu => {

                menu.classList.remove(
                    "show"
                );

            }
        );


    if (attachDropdown) {

        attachDropdown.classList.remove(
            "show"
        );

    }

}


// ==========================================
// 9. CONVERSATION HISTORY
// ==========================================

function getConversationHistory() {

    if (!chatBox) {
        return [];
    }


    const messages =
        chatBox.querySelectorAll(
            ".message"
        );


    const history = [];


    messages.forEach(
        message => {

            if (
                message.classList.contains(
                    "nova-loading"
                )
            ) {

                return;

            }


            if (
                message.classList.contains(
                    "user-message"
                )
            ) {

                const text =
                    message.innerText
                        .trim();


                if (text) {

                    history.push({

                        role:
                            "user",

                        parts: [
                            {
                                text
                            }
                        ]

                    });

                }

            }


            else if (
                message.classList.contains(
                    "nova-message"
                )
            ) {

                const content =
                    message.querySelector(
                        ".nova-message-content"
                    );


                if (!content) {
                    return;
                }


                const text =
                    content.innerText
                        .trim();


                if (text) {

                    history.push({

                        role:
                            "model",

                        parts: [
                            {
                                text
                            }
                        ]

                    });

                }

            }

        }
    );


    return history.slice(
        -20
    );

}


// ==========================================
// CODE WORKSPACE INTEGRATION
// ==========================================

function isWorkspaceRequest(text) {

    if (!text) {
        return false;
    }


    const lower =
        String(text).toLowerCase();


    const keywords = [

        "code workspace",
        "code-workspace",
        "workspace",

        "اكتب في workspace",
        "اكتب في الوورك سبيس",
        "حط الكود في workspace",
        "ضع الكود في workspace",
        "حط الكود في الوورك سبيس",
        "اكتبلي الكود في workspace",
        "اكتب لي الكود في workspace",
        "اعمل الكود في workspace",
        "اعمل المشروع في workspace",
        "افتح code workspace",
        "افتح الـworkspace",
        "افتح الوورك سبيس",
        "في مساحة الكود"

    ];


    return keywords.some(
        keyword =>
            lower.includes(
                keyword.toLowerCase()
            )
    );

}


function extractWorkspaceCode(reply) {

    if (!reply) {
        return null;
    }


    const blocks = [];


    const regex =
        /```([a-zA-Z0-9_+#.-]*)\s*\n?([\s\S]*?)```/g;


    let match;


    while (
        (match =
            regex.exec(reply)) !== null
    ) {

        const language =
            String(
                match[1] || ""
            )
            .toLowerCase()
            .trim();


        const code =
            String(
                match[2] || ""
            )
            .trim();


        if (!code) {
            continue;
        }


        blocks.push({

            language,

            code

        });

    }


    if (!blocks.length) {
        return null;
    }


    let html = "";
    let css = "";
    let js = "";


    blocks.forEach(
        block => {

            const language =
                block.language;


            if (
                language === "html" ||
                language === "htm" ||
                language === "xml"
            ) {

                html +=
                    (html ? "\n\n" : "") +
                    block.code;

            }

            else if (
                language === "css"
            ) {

                css +=
                    (css ? "\n\n" : "") +
                    block.code;

            }

            else if (
                language === "js" ||
                language === "javascript" ||
                language === "typescript" ||
                language === "ts"
            ) {

                js +=
                    (js ? "\n\n" : "") +
                    block.code;

            }

        }
    );


    blocks.forEach(
        block => {

            if (
                block.language &&
                [
                    "html",
                    "htm",
                    "xml",
                    "css",
                    "js",
                    "javascript",
                    "typescript",
                    "ts"
                ].includes(
                    block.language
                )
            ) {

                return;

            }


            const code =
                block.code;


            if (
                /<!doctype html/i.test(
                    code
                ) ||
                /<html[\s>]/i.test(
                    code
                ) ||
                /<body[\s>]/i.test(
                    code
                )
            ) {

                html +=
                    (html ? "\n\n" : "") +
                    code;

            }

            else if (
                /[.#]?[a-zA-Z][\w-]*\s*\{[\s\S]*\}/.test(
                    code
                )
            ) {

                css +=
                    (css ? "\n\n" : "") +
                    code;

            }

            else {

                js +=
                    (js ? "\n\n" : "") +
                    code;

            }

        }
    );


    if (
        !html &&
        !css &&
        !js
    ) {

        return null;

    }


    return {

        html,

        css,

        js

    };

}


function openCodeWorkspace(code) {

    if (!code) {
        return;
    }


    try {

        localStorage.setItem(
            "novaWorkspaceTransfer",
            JSON.stringify({

                html:
                    code.html || "",

                css:
                    code.css || "",

                js:
                    code.js || "",

                createdAt:
                    Date.now()

            })
        );


        const workspaceUrl =
            "code-workspace.html?from=nova";


        window.open(
            workspaceUrl,
            "_blank"
        );


        showToast(
            "تم فتح Code Workspace بالكود 🚀"
        );

    }

    catch (error) {

        console.error(
            "Workspace transfer error:",
            error
        );


        showToast(
            "تعذر فتح Code Workspace"
        );

    }

}


// ==========================================
// 10. SEND MESSAGE
// ==========================================

async function sendMessage(
    customText = null,
    options = {}
) {

    if (
        !chatInput &&
        !customText
    ) {

        return;

    }


    let text =
        customText !== null
            ? String(customText)
            : chatInput.value;


    text =
        text.trim();


    if (!text) {

        if (chatInput) {
            chatInput.focus();
        }

        return;

    }


    // ======================================
    // IMAGE EDITING
    // ======================================

    if (
        pendingVisionImage &&
        !options.ignorePendingImage
    ) {

        const image =
            pendingVisionImage;


        pendingVisionImage =
            null;


        appendUserMessage(
            text
        );


        if (chatInput) {

            chatInput.value =
                "";

            chatInput.style.height =
                "auto";

        }


        saveCurrentChat(
            text
        );


        await editImageWithPrompt(
            text,
            image
        );


        return;

    }


    // ======================================
    // MEMORY COMMAND
    // ======================================

    const memoryResult =
        handleMemoryCommand(
            text
        );


    if (
        memoryResult &&
        memoryResult.handled
    ) {

        appendUserMessage(
            text
        );


        createAssistantMessage(
            memoryResult.reply
        );


        if (
            chatInput &&
            customText === null
        ) {

            chatInput.value =
                "";

            chatInput.style.height =
                "auto";

        }


        saveCurrentChat(
            text
        );


        return;

    }


    // ======================================
    // USER MESSAGE
    // ======================================

    appendUserMessage(
        text
    );


    if (
        chatInput &&
        customText === null
    ) {

        chatInput.value =
            "";

        chatInput.style.height =
            "auto";

    }


    saveCurrentChat(
        text
    );


    // ======================================
    // IMAGE REQUEST
    // ======================================

    const lowerText =
        text.toLowerCase();


    const imageKeywords = [

        "صورة",
        "ارسم",
        "رسم",
        "صمم صورة",
        "اعمل صورة",
        "توليد صورة",
        "توليد صوره",
        "صوره",
        "generate image",
        "create image",
        "draw an image"

    ];


    if (
        imageKeywords.some(
            keyword =>
                lowerText.includes(
                    keyword.toLowerCase()
                )
        )
    ) {

        await generateImage(
            text
        );

        return;

    }


    // ======================================
    // VIDEO REQUEST
    // ======================================

    const videoKeywords = [

        "فيديو",
        "مشهد متحرك",
        "اعمل فيديو",
        "سوي فيديو",
        "توليد فيديو",
        "generate video",
        "create video"

    ];


    if (
        videoKeywords.some(
            keyword =>
                lowerText.includes(
                    keyword.toLowerCase()
                )
        )
    ) {

        await generateVideo(
            text
        );

        return;

    }


    // ======================================
    // DEMO MODE
    // ======================================

    if (DEMO_MODE) {

        updateSendButtonState(
            true
        );


        appendLoadingMessage();


        try {

            await delay(
                900
            );


            removeLoadingMessage();


            createAssistantMessage(
                getDemoReply(
                    text
                )
            );


            saveCurrentChat(
                text
            );

        }

        catch (error) {

            console.error(
                "Nova Demo Error:",
                error
            );


            removeLoadingMessage();


            createAssistantMessage(
                "حصل خطأ في Demo Mode."
            );

        }

        finally {

            updateSendButtonState(
                false
            );

        }


        return;

    }


    // ======================================
    // REAL API
    // ======================================

    appendLoadingMessage();


    updateSendButtonState(
        true
    );


    currentAbortController =
        new AbortController();


    try {

        let response =
            null;

        let data =
            null;


        // ==================================
        // API REQUEST WITH RETRY
        // ==================================

        for (
            let attempt = 1;
            attempt <= 3;
            attempt++
        ) {

            try {

                const conversationHistory =
                    getConversationHistory();


                const {
                    data: {
                        session
                    }
                } =
                    await window.novaSupabase.auth.getSession();


                if (
                    !session?.access_token
                ) {

                    throw new Error(
                        "UNAUTHENTICATED"
                    );

                }


                response =
                    await fetch(
                        "/api/chat",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${session.access_token}`

                            },

        body: JSON.stringify({
        message: text,
    history: conversationHistory,
    chatId: currentChatId
}),

                            signal:
                                currentAbortController.signal

                        }
                    );
            
const responseText = await response.text();

try {
  data = responseText ? JSON.parse(responseText) : null;
} catch {
  data = responseText ? { message: responseText } : null;
}

console.log("Nova API Status:", response.status);
console.log("Nova API Response:", data);

// ==========================================
// NOVA CHAT QUOTA
// ==========================================


if (
    response.status === 429 &&
    data?.code === "LIMIT_REACHED"
) {

    updateNovaQuota({

        allowed: false,

        used:
            data.used ?? 0,

        limit:
            data.limit ?? 0,

        remaining:
            0,

        reset_at:
            data.reset_at || null,

        plan:
            data.plan || null

    });

    return;
}


// ==========================================
// NOVA API ERROR
// ==========================================

if (!response.ok) {

    throw new Error(
        `Nova API Error: ${response.status} ${response.statusText}`
    );

}


// ==========================================
// UPDATE QUOTA
// ==========================================

if (data?.quota) {

    updateNovaQuota(
        data.quota
    );
}


break;

}

            catch (error) {

                if (
                    error &&
                    error.name ===
                    "AbortError"
                ) {

                    throw error;

                }


                console.error(
                    `Nova API attempt ${attempt} failed:`,
                    error
                );


                if (
                    attempt === 3
                ) {

                    throw error;

                }


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            1500
                        )
                );

            }

        }


        // ==================================
        // CHECK RESPONSE
        // ==================================

        if (
            !response ||
            !response.ok
        ) {

            throw new Error(
                "Nova API did not return a successful response."
            );

        }


        // ==================================
        // CHECK DATA
        // ==================================

        if (!data) {

            throw new Error(
                "Nova API returned empty data."
            );

        }


        console.log(
            "Nova API Response:",
            data
        );


        // ==================================
        // EXTRACT RESPONSE
        // ==================================

        let reply =
            "";


        let groundingMetadata =
            null;


        let sources =
            [];


        // ==================================
        // TEXT RESPONSE
        // ==================================

        if (
            typeof data?.text ===
                "string" &&
            data.text.trim()
        ) {

            reply =
                data.text.trim();

        }


        // ==================================
        // REPLY RESPONSE
        // ==================================

        else if (
            typeof data?.reply ===
                "string" &&
            data.reply.trim()
        ) {

            reply =
                data.reply.trim();

        }


        // ==================================
        // RESPONSE FIELD
        // ==================================

        else if (
            typeof data?.response ===
                "string" &&
            data.response.trim()
        ) {

            reply =
                data.response.trim();

        }


        // ==================================
        // MESSAGE FIELD
        // ==================================

        else if (
            typeof data?.message ===
                "string" &&
            data.message.trim()
        ) {

            reply =
                data.message.trim();

        }


        // ==================================
        // GEMINI RESPONSE
        // ==================================

        else if (
            data?.candidates?.[0]
        ) {

            const candidate =
                data.candidates[0];


            const parts =
                candidate?.content?.parts ||
                [];


            reply =
                parts
                    .map(
                        part =>
                            typeof part?.text ===
                            "string"
                                ? part.text
                                : ""
                    )
                    .join("")
                    .trim();


            groundingMetadata =
                candidate?.groundingMetadata ||
                null;


            if (
                typeof extractSearchSources ===
                "function"
            ) {

                sources =
                    extractSearchSources(
                        groundingMetadata
                    ) || [];

            }

        }


        // ==================================
        // STRING RESPONSE
        // ==================================

        else if (
            typeof data ===
            "string"
        ) {

            reply =
                data.trim();

        }


        // ==================================
        // REMOVE LOADING
        // ==================================

        removeLoadingMessage();


        // ==================================
        // DISPLAY RESPONSE
        // ==================================

        if (!reply) {

            console.error(
                "Nova: Empty AI reply. Full data:",
                data
            );


            createAssistantMessage(
                "وصل رد فاضي من السيرفر. افتح F12 وشوف Console لمعرفة الرد الحقيقي."
            );

        }

        else {

            createAssistantMessage(
                reply,
                {
                    sources
                }
            );


            // ==============================
            // CODE WORKSPACE
            // ==============================

            if (
                isWorkspaceRequest(text)
            ) {

                const workspaceCode =
                    extractWorkspaceCode(
                        reply
                    );


                if (
                    workspaceCode
                ) {

                    setTimeout(
                        () => {

                            openCodeWorkspace(
                                workspaceCode
                            );

                        },
                        100
                    );

                }

            }

        }


        // ==================================
        // SAVE CHAT
        // ==================================

        saveCurrentChat(
            text
        );

    }

    catch (error) {

        console.error(
            "Nova AI Request Error:",
            error
        );


        removeLoadingMessage();


        // ==================================
        // REQUEST CANCELLED
        // ==================================

        if (
            error &&
            error.name ===
            "AbortError"
        ) {

            createAssistantMessage(
                "تم إلغاء الرد بواسطة المستخدم."
            );

        }


        // ==================================
        // AUTH ERROR
        // ==================================

        else if (
            error?.message ===
            "UNAUTHENTICATED"
        ) {

            createAssistantMessage(
                "لازم تكون مسجل دخول في Nova AI عشان تستخدم المحادثة."
            );

        }


        // ==================================
        // API ERROR
        // ==================================

        else {

            console.error(
                "Nova API Error Details:",
                error?.message ||
                error
            );


            createAssistantMessage(
                "حصل خطأ أثناء الاتصال بـ Nova AI. حاول مرة ثانية."
            );

        }


        saveCurrentChat(
            text
        );

    }

    finally {

        updateSendButtonState(
            false
        );


        currentAbortController =
            null;


        if (chatBox) {

            chatBox.scrollTop =
                chatBox.scrollHeight;

        }

    }

}


// ==========================================
// 11. DEMO REPLY
// ==========================================

function getDemoReply(
    text
) {

    const lower =
        text.toLowerCase();


    if (
        lower.includes(
            "برمجة"
        )
    ) {

        return `
## ممتاز! 🚀

أقدر أساعدك في البرمجة من أول فكرة المشروع لحد الكود النهائي.

مثلاً نقدر نبني:
- Web App
- Dashboard
- AI Tool
- Game
- Portfolio
- SaaS

ابعتلي فكرتك وأنا أساعدك نحولها لمشروع حقيقي.
`;

    }


    if (
        lower.includes(
            "ذكاء اصطناعي"
        ) ||
        lower.includes(
            "ai"
        )
    ) {

        return `
الذكاء الاصطناعي هو مجموعة تقنيات بتخلي الكمبيوتر يتعلم من البيانات وينفذ مهام تحتاج عادةً نوعًا من الذكاء البشري، مثل فهم النصوص والصور وتوليد المحتوى.
`;

    }


    return `
أنا Nova AI ✨

حالياً أنت في وضع Demo Mode.

فعّل الاتصال بالـ API عشان تحصل على ردود Gemini الحقيقية.
`;

}


// ==========================================
// 12. USER MESSAGE
// ==========================================

function appendUserMessage(
    text
) {

    if (!chatBox) {
        return;
    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message user-message";


    message.innerHTML = `

        <div class="message-content">
            ${escapeHtml(text)}
        </div>

    `;


    chatBox.appendChild(
        message
    );


    chatBox.scrollTop =
        chatBox.scrollHeight;

}


// ==========================================
// 13. ASSISTANT MESSAGE
// ==========================================

function createAssistantMessage(
    text,
    options = {}
) {

    if (!chatBox) {
        return;
    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message bot-message nova-message";


    const sources =
        Array.isArray(
            options.sources
        )
            ? options.sources
            : [];


    message.innerHTML = `

        <div class="nova-avatar">
            <span>✦</span>
        </div>

        <div class="nova-message-body">

            <div class="nova-message-content">
                ${formatNovaResponse(text)}
            </div>

            ${
                createSearchSourcesHTML(
                    sources
                )
            }

            <div class="message-actions">

                <button
                    class="message-action copy-message"
                    type="button"
                    title="نسخ"
                >
                    <i class="fas fa-copy"></i>
                </button>

                <button
                    class="message-action regenerate-message"
                    type="button"
                    title="إعادة التوليد"
                >
                    <i class="fas fa-rotate-right"></i>
                </button>

                <button
                    class="message-action like-message"
                    type="button"
                    title="إعجاب"
                >
                    <i class="far fa-thumbs-up"></i>
                </button>

                <button
                    class="message-action dislike-message"
                    type="button"
                    title="لم يعجبني"
                >
                    <i class="far fa-thumbs-down"></i>
                </button>

            </div>

        </div>

    `;


    chatBox.appendChild(
        message
    );


    setupMessageActions(
        message,
        text
    );


    setupCodeCopyButtons(
        message
    );


    setupSearchSourceLinks(
        message
    );


    chatBox.scrollTop =
        chatBox.scrollHeight;

}


// ==========================================
// 14. SEARCH SOURCES
// ==========================================

function extractSearchSources(
    groundingMetadata
) {

    if (
        !groundingMetadata ||
        !Array.isArray(
            groundingMetadata.groundingChunks
        )
    ) {

        return [];

    }


    const sources = [];

    const seen = new Set();


    groundingMetadata
        .groundingChunks
        .forEach(
            chunk => {

                const web =
                    chunk?.web;


                if (!web) {
                    return;
                }


                const uri =
                    typeof web.uri ===
                    "string"
                        ? web.uri.trim()
                        : "";


                if (!uri) {
                    return;
                }


                let parsedUrl;


                try {

                    parsedUrl =
                        new URL(
                            uri
                        );

                }

                catch (error) {

                    return;

                }


                if (
                    parsedUrl.protocol !==
                        "http:" &&
                    parsedUrl.protocol !==
                        "https:"
                ) {

                    return;

                }


                if (
                    seen.has(uri)
                ) {

                    return;

                }


                seen.add(uri);


                const title =
                    typeof web.title ===
                    "string" &&
                    web.title.trim()
                        ? web.title.trim()
                        : getSourceHostname(
                            uri
                        );


                sources.push({

                    title,

                    uri,

                    hostname:
                        getSourceHostname(
                            uri
                        )

                });

            }
        );


    return sources.slice(
        0,
        6
    );

}


// ==========================================
// 15. SEARCH SOURCES HTML
// ==========================================

function createSearchSourcesHTML(
    sources
) {

    if (
        !Array.isArray(
            sources
        ) ||
        sources.length === 0
    ) {

        return "";

    }


    return `

        <div class="nova-search-sources">

            <div class="nova-search-sources-title">

                <i class="fas fa-globe"></i>

                <span>
                    المصادر
                </span>

            </div>


            <div class="nova-search-source-list">

                ${
                    sources
                        .map(
                            source => {

                                const safeTitle =
                                    escapeHtml(
                                        source.title ||
                                        "مصدر"
                                    );


                                const safeHost =
                                    escapeHtml(
                                        source.hostname ||
                                        ""
                                    );


                                const safeUri =
                                    escapeAttribute(
                                        source.uri
                                    );


                                return `

                                    <button
                                        type="button"
                                        class="nova-search-source"
                                        data-source-url="${safeUri}"
                                    >

                                        <span class="nova-search-source-icon">

                                            <i class="fas fa-link"></i>

                                        </span>


                                        <span class="nova-search-source-info">

                                            <strong>
                                                ${safeTitle}
                                            </strong>

                                            <small>
                                                ${safeHost}
                                            </small>

                                        </span>


                                        <i class="fas fa-arrow-up-right-from-square nova-search-source-arrow"></i>

                                    </button>

                                `;

                            }
                        )
                        .join("")
                }

            </div>

        </div>

    `;

}


// ==========================================
// 16. SEARCH SOURCE LINKS
// ==========================================

function setupSearchSourceLinks(
    message
) {

    if (!message) {
        return;
    }


    const sourceButtons =
        message.querySelectorAll(
            ".nova-search-source"
        );


    sourceButtons.forEach(
        button => {

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
                () => {

                    const url =
                        button.dataset
                            .sourceUrl;


                    if (!url) {
                        return;
                    }


                    try {

                        const parsed =
                            new URL(
                                url
                            );


                        if (
                            parsed.protocol !==
                                "http:" &&
                            parsed.protocol !==
                                "https:"
                        ) {

                            return;

                        }


                        window.open(
                            parsed.href,
                            "_blank",
                            "noopener,noreferrer"
                        );

                    }

                    catch (error) {

                        console.error(
                            "Invalid source URL:",
                            error
                        );

                    }

                }
            );

        }
    );

}


// ==========================================
// 17. SOURCE HOSTNAME
// ==========================================

function getSourceHostname(
    url
) {

    try {

        return new URL(
            url
        ).hostname
            .replace(
                /^www\./,
                ""
            );

    }

    catch (error) {

        return "";

    }

}


// ==========================================
// 18. LOADING MESSAGE
// ==========================================

function appendLoadingMessage() {

    if (!chatBox) {
        return;
    }


    removeLoadingMessage();


    const loading =
        document.createElement(
            "div"
        );


    loading.className =
        "message bot-message nova-message nova-loading";


    loading.innerHTML = `

        <div class="nova-avatar">
            <span>✦</span>
        </div>

        <div class="nova-message-body">

            <div class="nova-message-content">

                <div class="nova-thinking">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

            </div>

        </div>

    `;


    chatBox.appendChild(
        loading
    );


    chatBox.scrollTop =
        chatBox.scrollHeight;

}


function removeLoadingMessage() {

    document
        .querySelectorAll(
            ".nova-loading"
        )
        .forEach(
            element =>
                element.remove()
        );

}


// ==========================================
// 19. MESSAGE ACTIONS
// ==========================================

function setupMessageActions(
    messageDiv,
    originalText
) {

    if (!messageDiv) {
        return;
    }


    const copyButton =
        messageDiv.querySelector(
            ".copy-message"
        );


    const regenerateButton =
        messageDiv.querySelector(
            ".regenerate-message"
        );


    const likeButton =
        messageDiv.querySelector(
            ".like-message"
        );


    const dislikeButton =
        messageDiv.querySelector(
            ".dislike-message"
        );


    if (copyButton) {

        copyButton.addEventListener(
            "click",
            async () => {

                try {

                    await navigator.clipboard.writeText(
                        originalText
                    );


                    showToast(
                        "تم نسخ الرد!"
                    );

                }

                catch (error) {

                    showToast(
                        "تعذر نسخ الرد"
                    );

                }

            }
        );

    }


    if (regenerateButton) {

        regenerateButton.addEventListener(
            "click",
            () => {

                let previous =
                    messageDiv.previousElementSibling;


                while (
                    previous &&
                    !previous.classList.contains(
                        "user-message"
                    )
                ) {

                    previous =
                        previous.previousElementSibling;

                }


                if (!previous) {

                    showToast(
                        "لم يتم العثور على رسالة المستخدم"
                    );

                    return;

                }


                const text =
                    previous.innerText
                        .trim();


                if (text) {

                    messageDiv.remove();

                    sendMessage(
                        text
                    );

                }

            }
        );

    }


    if (likeButton) {

        likeButton.addEventListener(
            "click",
            () => {

                likeButton.classList.toggle(
                    "active"
                );


                if (
                    dislikeButton
                ) {

                    dislikeButton.classList.remove(
                        "active"
                    );

                }

            }
        );

    }


    if (dislikeButton) {

        dislikeButton.addEventListener(
            "click",
            () => {

                dislikeButton.classList.toggle(
                    "active"
                );


                if (
                    likeButton
                ) {

                    likeButton.classList.remove(
                        "active"
                    );

                }

            }
        );

    }

}


// ==========================================
// 20. RESTORE MESSAGE ACTIONS
// ==========================================

function restoreMessageActions() {

    if (!chatBox) {
        return;
    }


    chatBox
        .querySelectorAll(
            ".nova-message"
        )
        .forEach(
            message => {

                const content =
                    message.querySelector(
                        ".nova-message-content"
                    );


                if (content) {

                    setupMessageActions(
                        message,
                        content.innerText.trim()
                    );

                }


                setupCodeCopyButtons(
                    message
                );


                setupSearchSourceLinks(
                    message
                );

            }
        );

}


// ==========================================
// 21. UPDATE SEND BUTTON
// ==========================================

function updateSendButtonState(
    isGenerating
) {

    if (!sendChatBtn) {
        return;
    }


    if (isGenerating) {

        sendChatBtn.classList.add(
            "stop-generating"
        );


        sendChatBtn.innerHTML =
            '<i class="fas fa-square"></i>';


        sendChatBtn.title =
            "إيقاف الرد";


        sendChatBtn.setAttribute(
            "aria-label",
            "إيقاف الرد"
        );

    }

    else {

        sendChatBtn.classList.remove(
            "stop-generating"
        );


        sendChatBtn.innerHTML =
            '<i class="fas fa-paper-plane"></i>';


        sendChatBtn.title =
            "إرسال";


        sendChatBtn.setAttribute(
            "aria-label",
            "إرسال"
        );

    }

}


// ==========================================
// 22. DELAY
// ==========================================

function delay(
    ms
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


// ==========================================
// 23. TOAST
// ==========================================

function showToast(
    message
) {

    let toast =
        document.querySelector(
            ".nova-toast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.className =
            "nova-toast";


        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );

}


// ==========================================
// 24. ESCAPE HTML
// ==========================================

function escapeHtml(
    text
) {

    return String(
        text ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    )
    .replace(
        /\n/g,
        "<br>"
    );

}


// ==========================================
// 25. ESCAPE ATTRIBUTE
// ==========================================

function escapeAttribute(
    text
) {

    return String(
        text ?? ""
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


// ==========================================
// 26. IMAGE TRANSLATION
// ==========================================

async function translateToEnglishIfNeeded(
    text
) {

    const arabicRegex =
        /[\u0600-\u06FF]/;


    if (
        !arabicRegex.test(
            text
        )
    ) {

        return text;

    }


    try {

        const url =
            "https://translate.googleapis.com/translate_a/single" +
            "?client=gtx" +
            "&sl=auto" +
            "&tl=en" +
            "&dt=t" +
            "&q=" +
            encodeURIComponent(
                text
            );


        const response =
            await fetch(
                url
            );


        const data =
            await response.json();


        if (
            Array.isArray(
                data?.[0]
            )
        ) {

            return data[0]
                .map(
                    item =>
                        item?.[0] ||
                        ""
                )
                .join("")
                .trim();

        }

    }

    catch (error) {

        console.warn(
            "Translation failed:",
            error
        );

    }


    return text
