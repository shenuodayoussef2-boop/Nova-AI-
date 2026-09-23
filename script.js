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

        if (
            chatsArray.length > 0
        ) {

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

    updateSendButtonState(false);


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


    if (
        existingIndex !== -1
    ) {

        const existing =
            chatsArray[
                existingIndex
            ];


        if (
            existing.title ===
            "محادثة جديدة"
        ) {

            const cleanTitle =
                String(
                    firstUserMessage ||
                    "محادثة جديدة"
                )
                .trim()
                .substring(
                    0,
                    25
                );


            existing.title =
                cleanTitle
                    ? cleanTitle + "..."
                    : "محادثة جديدة";

        }


        existing.html =
            html;

        existing.updatedAt =
            Date.now();

    } else {

        let title =
            String(
                firstUserMessage ||
                "محادثة جديدة"
            )
            .trim();


        if (
            title ===
            "محادثة جديدة"
        ) {

            title =
                "محادثة جديدة";

        } else {

            title =
                title.substring(
                    0,
                    25
                ) + "...";

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
// 10. SEND MESSAGE
// ==========================================

async function sendMessage(
    customText = null,
    options = {}
) {

    if (!chatInput && !customText) {
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

            chatInput.value = "";

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
    // USER MESSAGE
    // ======================================

    appendUserMessage(
        text
    );


    if (
        chatInput &&
        customText === null
    ) {

        chatInput.value = "";

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


        await delay(
            900
        );


        removeLoadingMessage();


        createAssistantMessage(
            getDemoReply(
                text
            )
        );


        updateSendButtonState(
            false
        );


        saveCurrentChat();

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


    let completed =
        false;


    try {

        let response = null;

        let data = null;


        for (
            let attempt = 1;
            attempt <= 3;
            attempt++
        ) {

            try {

                const conversationHistory =
                    getConversationHistory();


                response =
                    await fetch(
                        "/api/chat",
                        {

                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            signal:
                                currentAbortController
                                    .signal,

                            body:
                                JSON.stringify({

                                    message:
                                        text,

                                    history:
                                        conversationHistory
                                            .slice(
                                                0,
                                                -1
                                            )

                                })

                        }
                    );


                data =
                    await response.json();


                break;

            }

            catch (error) {

                if (
                    error.name ===
                    "AbortError"
                ) {

                    throw error;

                }


                if (
                    attempt === 3
                ) {

                    throw error;

                }


                await delay(
                    1500
                );

            }

        }


        removeLoadingMessage();


        if (
            !response ||
            !response.ok
        ) {

            let errorMessage =
                "حدث خطأ أثناء الاتصال بـ Nova AI.";


            if (
                data &&
                typeof data.error ===
                "string"
            ) {

                errorMessage =
                    data.error;

            }


            else if (
                data &&
                data.details &&
                data.details.error &&
                typeof data.details.error.message ===
                "string"
            ) {

                errorMessage =
                    data.details.error.message;

            }


            createAssistantMessage(
                errorMessage
            );


            saveCurrentChat();

            return;

        }


    // ==================================
// GEMINI RESPONSE - FIXED v2
// ==================================
        console.log("Nova API Response:", data);

        let reply = "";
        let groundingMetadata = null;
        let sources = [];

        // يدعم كل انواع الرد
        if (typeof data?.text === "string" && data.text.trim()) {
            reply = data.text;
        } else if (typeof data?.reply === "string" && data.reply.trim()) {
            reply = data.reply;
        } else if (typeof data?.response === "string" && data.response.trim()) {
            reply = data.response;
        } else if (typeof data?.message === "string" && data.message.trim()) {
            reply = data.message;
        } else if (data?.candidates?.[0]) {
            const candidate = data.candidates[0];
            const parts = candidate?.content?.parts || [];
            reply = parts.map(p => typeof p.text === "string"? p.text : "").join("").trim();
            groundingMetadata = candidate?.groundingMetadata || null;
            sources = extractSearchSources(groundingMetadata);
        } else if (typeof data === "string") {
            reply = data;
        }

        reply = reply.trim();

        if (!reply) {
            console.error("Empty reply, full data:", data);
            createAssistantMessage(
                "وصل رد فاضي من السيرفر. افتح F12 وشوف Console - هتلاقي الرد الحقيقي هناك."
            );
        } else {
            createAssistantMessage(reply, { sources });
        }

        completed = true;
        saveCurrentChat();
    catch (error) {

        removeLoadingMessage();


        if (
            error &&
            error.name ===
            "AbortError"
        ) {

            createAssistantMessage(
                "تم إلغاء الرد بواسطة المستخدم."
            );

        }

        else {

            console.error(
                "Nova AI Request Error:",
                error
            );


            createAssistantMessage(
                "حصل خطأ أثناء الاتصال بـ Nova AI. حاول مرة ثانية."
            );

        }


        saveCurrentChat();

    }

    finally {

        updateSendButtonState(
            false
        );


        currentAbortController =
            null;


        if (
            chatBox
        ) {

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


    return text;

}


// ==========================================
// 27. GENERATE IMAGE
// ==========================================

async function generateImage(
    text
) {

    const loadingText =
        "جاري تجهيز الصورة... 🎨";


    appendLoadingMessage();


    try {

        const translated =
            await translateToEnglishIfNeeded(
                text
            );


        const prompt = `
Create a high quality detailed image based on this request:

${translated}

Make it visually appealing, detailed, coherent and polished.
`;


        const response =
            await fetch(
                "/api/generate-image",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            prompt
                        })

                }
            );


        const data =
            await response.json();


        removeLoadingMessage();


        if (
            !response.ok
        ) {

            throw new Error(
                data?.error ||
                "Image generation failed"
            );

        }


        const imageUrl =
            data?.imageUrl ||
            data?.url ||
            data?.image;


        if (!imageUrl) {

            throw new Error(
                "لم يتم استلام صورة"
            );

        }


        appendMediaMessage(
            "الصورة الناتجة",
            imageUrl,
            text,
            "image"
        );


        saveCurrentChat();

    }

    catch (error) {

        removeLoadingMessage();


        console.error(
            "Generate Image Error:",
            error
        );


        createAssistantMessage(
            "حصل خطأ أثناء توليد الصورة. حاول مرة ثانية."
        );


        saveCurrentChat();

    }

}


// ==========================================
// 28. EDIT IMAGE
// ==========================================

async function editImageWithPrompt(
    text,
    imageSrc
) {

    appendLoadingMessage();


    try {

        const translated =
            await translateToEnglishIfNeeded(
                text
            );


        const response =
            await fetch(
                "/api/edit-image",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            image:
                                imageSrc,

                            prompt:
                                translated

                        })

                }
            );


        const data =
            await response.json();


        removeLoadingMessage();


        if (
            !response.ok
        ) {

            throw new Error(
                data?.error ||
                "Image editing failed"
            );

        }


        const imageUrl =
            data?.imageUrl ||
            data?.url ||
            data?.image;


        if (!imageUrl) {

            throw new Error(
                "لم يتم استلام الصورة المعدلة"
            );

        }


        appendMediaMessage(
            "الصورة بعد التعديل",
            imageUrl,
            text,
            "image"
        );


        saveCurrentChat();

    }

    catch (error) {

        removeLoadingMessage();


        console.error(
            "Edit Image Error:",
            error
        );


        createAssistantMessage(
            "حصل خطأ أثناء تعديل الصورة."
        );


        saveCurrentChat();

    }

}


// ==========================================
// 29. GENERATE VIDEO
// ==========================================

async function generateVideo(
    text
) {

    appendLoadingMessage();


    try {

        const translated =
            await translateToEnglishIfNeeded(
                text
            );


        /*
         * ملاحظة:
         * الرابط التالي يولد صورة سينمائية
         * وليس فيديو حقيقي.
         */

        const prompt =
            encodeURIComponent(
                translated +
                ", cinematic video still, realistic lighting, cinematic composition, highly detailed"
            );


        const imageUrl =
            `https://image.pollinations.ai/prompt/${prompt}?width=1280&height=720&nologo=true`;


        await delay(
            2500
        );


        removeLoadingMessage();


        appendMediaMessage(
            "مشهد الفيديو",
            imageUrl,
            text,
            "video"
        );


        saveCurrentChat();

    }

    catch (error) {

        removeLoadingMessage();


        console.error(
            "Generate Video Error:",
            error
        );


        createAssistantMessage(
            "حصل خطأ أثناء تجهيز المشهد."
        );


        saveCurrentChat();

    }

}


// ==========================================
// 30. MEDIA MESSAGE
// ==========================================

function appendMediaMessage(
    title,
    src,
    altText = "",
    type = "image"
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


    const isVideo =
        type === "video";


    message.innerHTML = `

        <div class="nova-avatar">
            <span>✦</span>
        </div>


        <div class="nova-message-body">

            <div class="nova-message-content">

                <div class="nova-media-card">

                    <div class="nova-media-title">
                        ${escapeHtml(title)}
                    </div>

                    <img
                        src="${escapeAttribute(src)}"
                        alt="${escapeAttribute(altText)}"
                        class="nova-generated-media"
                        loading="lazy"
                    >

                    ${
                        isVideo
                            ? `
                                <div class="nova-media-note">
                                    🎬 تم إنشاء مشهد بصري للفكرة.
                                </div>
                            `
                            : ""
                    }

                </div>

            </div>


            <div class="message-actions">

                <button
                    class="message-action copy-media-url"
                    type="button"
                    title="نسخ الرابط"
                >
                    <i class="fas fa-link"></i>
                </button>

            </div>

        </div>

    `;


    chatBox.appendChild(
        message
    );


    const copyButton =
        message.querySelector(
            ".copy-media-url"
        );


    if (copyButton) {

        copyButton.addEventListener(
            "click",
            async () => {

                try {

                    await navigator.clipboard.writeText(
                        src
                    );


                    showToast(
                        "تم نسخ رابط الصورة!"
                    );

                }

                catch (error) {

                    showToast(
                        "تعذر نسخ الرابط"
                    );

                }

            }
        );

    }


    chatBox.scrollTop =
        chatBox.scrollHeight;

}


// ==========================================
// 31. VISION IMAGE
// ==========================================

function appendImageMessageWithVisionChips(
    imageSrc
) {

    if (!chatBox) {
        return;
    }


    pendingVisionImage =
        imageSrc;


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message user-message vision-message";


    message.innerHTML = `

        <div class="vision-image-wrapper">

            <img
                src="${escapeAttribute(imageSrc)}"
                alt="الصورة المرفقة"
                class="vision-image"
            >

            <div class="vision-chips">

                <button
                    type="button"
                    onclick="triggerVisionAction('analyze', '${escapeAttribute(imageSrc)}')"
                >
                    <i class="fas fa-eye"></i>
                    حلل الصورة
                </button>

                <button
                    type="button"
                    onclick="triggerVisionAction('text', '${escapeAttribute(imageSrc)}')"
                >
                    <i class="fas fa-font"></i>
                    استخرج النص
                </button>

                <button
                    type="button"
                    onclick="triggerVisionAction('explain', '${escapeAttribute(imageSrc)}')"
                >
                    <i class="fas fa-lightbulb"></i>
                    اشرح المحتوى
                </button>

            </div>

        </div>

    `;


    chatBox.appendChild(
        message
    );


    chatBox.scrollTop =
        chatBox.scrollHeight;


    saveCurrentChat(
        "تحليل صورة"
    );

}


// ==========================================
// 32. VISION ACTION
// ==========================================

window.triggerVisionAction =
    function (
        actionType,
        imageSrc
    ) {

        let promptText =
            "";


        if (
            actionType ===
            "analyze"
        ) {

            promptText =
                "حلل الصورة بالتفصيل واشرح ما يظهر فيها.";

        }


        else if (
            actionType ===
            "text"
        ) {

            promptText =
                "استخرج كل النصوص الظاهرة في الصورة وحافظ على ترتيبها قدر الإمكان.";

        }


        else if (
            actionType ===
            "explain"
        ) {

            promptText =
                "اشرح محتوى الصورة بطريقة بسيطة وواضحة.";

        }


        pendingVisionImage =
            imageSrc;


        sendMessage(
            promptText,
            {
                ignorePendingImage:
                    true
            }
        );

    };


// ==========================================
// 33. SIDEBAR
// ==========================================

function setupSidebar() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    const mobileMenuBtn =
        document.getElementById(
            "mobileMenuBtn"
        );


    const sidebarToggleBtn =
        document.getElementById(
            "sidebarToggleBtn"
        );


    if (
        mobileMenuBtn
    ) {

        mobileMenuBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                if (!sidebar) {
                    return;
                }


                sidebar.classList.toggle(
                    "mobile-open"
                );

            }
        );

    }


    if (
        sidebarToggleBtn
    ) {

        sidebarToggleBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                if (!sidebar) {
                    return;
                }


                if (
                    window.innerWidth <=
                    768
                ) {

                    sidebar.classList.toggle(
                        "mobile-open"
                    );

                }

                else {

                    sidebar.classList.toggle(
                        "collapsed"
                    );

                }

            }
        );

    }


    document.addEventListener(
        "click",
        event => {

            if (
                window.innerWidth >
                768
            ) {

                return;

            }


            if (!sidebar) {
                return;
            }


            if (
                !sidebar.classList.contains(
                    "mobile-open"
                )
            ) {

                return;

            }


            const clickedInside =
                sidebar.contains(
                    event.target
                );


            const clickedMenu =
                mobileMenuBtn &&
                mobileMenuBtn.contains(
                    event.target
                );


            if (
                !clickedInside &&
                !clickedMenu
            ) {

                sidebar.classList.remove(
                    "mobile-open"
                );

            }

        }
    );


    if (historyList) {

        historyList.addEventListener(
            "click",
            event => {

                const historyItem =
                    event.target.closest(
                        ".history-item"
                    );


                if (
                    historyItem &&
                    window.innerWidth <=
                    768
                ) {

                    setTimeout(
                        () => {

                            sidebar?.classList.remove(
                                "mobile-open"
                            );

                        },
                        150
                    );

                }

            }
        );

    }


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth >
                768
            ) {

                sidebar?.classList.remove(
                    "mobile-open"
                );

            }

        }
    );

}


// ==========================================
// 34. ATTACHMENTS
// ==========================================

function setupAttachments() {

    const optUpload =
        document.getElementById(
            "optUpload"
        );


    const optImage =
        document.getElementById(
            "optImage"
        );


    const optVideo =
        document.getElementById(
            "optVideo"
        );


    const optMusic =
        document.getElementById(
            "optMusic"
        );


    if (
        optUpload &&
        fileInput
    ) {

        optUpload.addEventListener(
            "click",
            () => {

                fileInput.click();

                closeAllMenus();

            }
        );

    }


    if (fileInput) {

        fileInput.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];


                if (!file) {
                    return;
                }


                if (
                    file.type.startsWith(
                        "image/"
                    )
                ) {

                    const reader =
                        new FileReader();


                    reader.onload =
                        event => {

                            appendImageMessageWithVisionChips(
                                event.target.result
                            );

                        };


                    reader.readAsDataURL(
                        file
                    );

                }

                else {

                    appendUserMessage(
                        `📎 تم اختيار الملف: ${file.name}`
                    );


                    createAssistantMessage(
                        "تم استلام اسم الملف، لكن تحليل الملفات غير الصورية غير مفعّل في النسخة الحالية."
                    );


                    saveCurrentChat(
                        file.name
                    );

                }


                fileInput.value =
                    "";

                closeAllMenus();

            }
        );

    }


    if (optImage) {

        optImage.addEventListener(
            "click",
            () => {

                closeAllMenus();


                if (chatInput) {

                    chatInput.value =
                        "أنشئ لي صورة ";

                    chatInput.focus();

                }

            }
        );

    }


    if (optVideo) {

        optVideo.addEventListener(
            "click",
            () => {

                closeAllMenus();


                if (chatInput) {

                    chatInput.value =
                        "أنشئ لي فيديو ";

                    chatInput.focus();

                }

            }
        );

    }


    if (optMusic) {

        optMusic.addEventListener(
            "click",
            () => {

                closeAllMenus();


                if (chatInput) {

                    chatInput.value =
                        "أنشئ لي موسيقى ";

                    chatInput.focus();

                }

            }
        );

    }

}


// ==========================================
// 35. VOICE
// ==========================================

function setupVoice() {

    const micBtn =
        document.getElementById(
            "micBtn"
        );


    const voiceOverlay =
        document.getElementById(
            "voiceOverlay"
        );


    const closeVoiceBtn =
        document.getElementById(
            "closeVoiceBtn"
        );


    const endVoiceBtn =
        document.getElementById(
            "endVoiceBtn"
        );


    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (
        !micBtn ||
        !SpeechRecognition
    ) {

        return;

    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "ar-SA";


    recognition.continuous =
        false;


    recognition.interimResults =
        true;


    let finalTranscript =
        "";


    micBtn.addEventListener(
        "click",
        () => {

            finalTranscript =
                "";


            if (voiceOverlay) {

                voiceOverlay.classList.add(
                    "show"
                );

            }


            try {

                recognition.start();

            }

            catch (error) {

                console.warn(
                    "Speech recognition:",
                    error
                );

            }

        }
    );


    recognition.onresult =
        event => {

            let interim =
                "";


            for (
                let i =
                    event.resultIndex;
                i <
                    event.results.length;
                i++
            ) {

                const transcript =
                    event.results[i][0]
                        .transcript;


                if (
                    event.results[i]
                        .isFinal
                ) {

                    finalTranscript +=
                        transcript;

                }

                else {

                    interim +=
                        transcript;

                }

            }


            if (chatInput) {

                chatInput.value =
                    finalTranscript +
                    interim;

            }

        };


    recognition.onend =
        () => {

            if (voiceOverlay) {

                voiceOverlay.classList.remove(
                    "show"
                );

            }


            const text =
                finalTranscript.trim();


            if (!text) {
                return;
            }


            sendVoiceMessageAndReply(
                text
            );

        };


    recognition.onerror =
        error => {

            console.error(
                "Voice recognition error:",
                error
            );


            if (voiceOverlay) {

                voiceOverlay.classList.remove(
                    "show"
                );

            }

        };


    const closeVoice =
        () => {

            if (voiceOverlay) {

                voiceOverlay.classList.remove(
                    "show"
                );

            }


            try {

                recognition.stop();

            }

            catch (error) {}

        };


    if (closeVoiceBtn) {

        closeVoiceBtn.addEventListener(
            "click",
            closeVoice
        );

    }


    if (endVoiceBtn) {

        endVoiceBtn.addEventListener(
            "click",
            closeVoice
        );

    }

}


// ==========================================
// 36. VOICE MESSAGE
// ==========================================

async function sendVoiceMessageAndReply(
    text
) {

    if (!text) {
        return;
    }


    appendUserMessage(
        text
    );


    saveCurrentChat(
        text
    );


    if (DEMO_MODE) {

        const reply =
            getDemoReply(
                text
            );


        createAssistantMessage(
            reply
        );


        speakText(
            reply
        );


        saveCurrentChat();

        return;

    }


    appendLoadingMessage();


    try {

        const history =
            getConversationHistory();


        const response =
            await fetch(
                "/api/chat",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            message:
                                text,

                            history:
                                history.slice(
                                    0,
                                    -1
                                )

                        })

                }
            );


        const data =
            await response.json();


        removeLoadingMessage();


        if (
            !response.ok
        ) {

            throw new Error(
                data?.error ||
                "Voice API error"
            );

        }


        const reply =
            data?.candidates?.[0]
                ?.content?.parts
                ?.map(
                    part =>
                        part?.text ||
                        ""
                )
                .join("")
                .trim();


        if (!reply) {

            throw new Error(
                "No voice reply"
            );

        }


        const sources =
            extractSearchSources(
                data?.candidates?.[0]
                    ?.groundingMetadata
            );


        createAssistantMessage(
            reply,
            {
                sources
            }
        );


        speakText(
            reply
        );


        saveCurrentChat();

    }

    catch (error) {

        removeLoadingMessage();


        console.error(
            "Voice API Error:",
            error
        );


        createAssistantMessage(
            "حصل خطأ أثناء معالجة الرسالة الصوتية."
        );


        saveCurrentChat();

    }

}


// ==========================================
// 37. TEXT TO SPEECH
// ==========================================

function speakText(
    text
) {

    if (
        !window.speechSynthesis
    ) {

        return;

    }


    const cleanText =
        String(text)
            .replace(
                /```[\s\S]*?```/g,
                ""
            )
            .replace(
                /[*#`]/g,
                ""
            )
            .trim();


    if (!cleanText) {
        return;
    }


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            cleanText
        );


    utterance.lang =
        "ar-SA";


    utterance.rate =
        1;


    utterance.pitch =
        1;


    window.speechSynthesis.speak(
        utterance
    );

}


// ==========================================
// 38. SETTINGS
// ==========================================

function setupSettings() {

    const settingsBtn =
        document.getElementById(
            "settingsBtn"
        );


    const settingsModal =
        document.getElementById(
            "settingsModal"
        );


    const closeSettingsBtn =
        document.getElementById(
            "closeSettingsBtn"
        );


    if (
        settingsBtn &&
        settingsModal
    ) {

        settingsBtn.addEventListener(
            "click",
            () => {

                settingsModal.classList.add(
                    "show"
                );

            }
        );

    }


    if (
        closeSettingsBtn &&
        settingsModal
    ) {

        closeSettingsBtn.addEventListener(
            "click",
            () => {

                settingsModal.classList.remove(
                    "show"
                );

            }
        );

    }


    if (settingsModal) {

        settingsModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    settingsModal
                ) {

                    settingsModal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    document
        .querySelectorAll(
            ".setting-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const action =
                            item.dataset.action;


                        if (
                            action ===
                            "activity"
                        ) {

                            alert(
                                "سجل النشاط سيكون متاحًا في إصدار قادم."
                            );

                        }


                        else if (
                            action ===
                            "intelligence"
                        ) {

                            alert(
                                "الذكاء الشخصي سيكون متاحًا في إصدار قادم."
                            );

                        }


                        else if (
                            action ===
                            "memory"
                        ) {

                            alert(
                                "استيراد الذاكرة سيكون متاحًا في إصدار قادم."
                            );

                        }

                    }
                );

            }
        );

}


// ==========================================
// 39. FORMAT NOVA RESPONSE
// ==========================================

function formatNovaResponse(
    text
) {

    if (!text) {
        return "";
    }


    const codeBlocks = [];


    const placeholderText =
        String(text).replace(
            /```([\w+-]*)\n?([\s\S]*?)```/g,
            (
                match,
                language,
                code
            ) => {

                const index =
                    codeBlocks.length;


                codeBlocks.push({

                    language:
                        language ||
                        "code",

                    code:
                        code.trim()

                });


                return `

                    <div
                        class="nova-code-placeholder"
                        data-code-index="${index}"
                    ></div>

                `;

            }
        );


    let formatted =
        formatNormalText(
            placeholderText
        );


    codeBlocks.forEach(
        (block, index) => {

            const codeHTML =
                createCodeBlockHTML(
                    block.code,
                    block.language
                );


            formatted =
                formatted.replace(
                    `<div class="nova-code-placeholder" data-code-index="${index}"></div>`,
                    codeHTML
                );

        }
    );


    return formatted;

}


// ==========================================
// 40. NORMAL TEXT
// ==========================================

function formatNormalText(
    text
) {

    let result =
        escapeHtmlWithoutNewLines(
            text
        );


    result =
        result.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );


    result =
        result.replace(
            /(^|[^\*])\*([^*\n]+)\*/g,
            "$1<em>$2</em>"
        );


    result =
        result.replace(
            /`([^`\n]+)`/g,
            "<code>$1</code>"
        );


    result =
        result.replace(
            /\n/g,
            "<br>"
        );


    return result;

}


// ==========================================
// 41. CODE BLOCK
// ==========================================

function createCodeBlockHTML(
    code,
    language
) {

    const safeCode =
        escapeCodeHtml(
            code
        );


    const safeLanguage =
        escapeHtmlWithoutNewLines(
            language ||
            "code"
        );


    return `

        <div class="nova-code-block">

            <div class="nova-code-header">

                <span>
                    ${safeLanguage}
                </span>

                <button
                    type="button"
                    class="copy-code-btn"
                    title="نسخ الكود"
                >
                    <i class="fas fa-copy"></i>
                    نسخ
                </button>

            </div>


            <pre><code>${safeCode}</code></pre>

        </div>

    `;

}


// ==========================================
// 42. ESCAPE CODE
// ==========================================

function escapeCodeHtml(
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
    );

}


// ==========================================
// 43. ESCAPE WITHOUT NEWLINES
// ==========================================

function escapeHtmlWithoutNewLines(
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
    );

}


// ==========================================
// 44. CODE COPY
// ==========================================

function setupCodeCopyButtons(
    container
) {

    if (!container) {
        return;
    }


    container
        .querySelectorAll(
            ".copy-code-btn"
        )
        .forEach(
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
                    async () => {

                        const codeBlock =
                            button.closest(
                                ".nova-code-block"
                            );


                        const code =
                            codeBlock?.querySelector(
                                "code"
                            );


                        if (!code) {
                            return;
                        }


                        try {

                            await navigator.clipboard.writeText(
                                code.innerText
                            );


                            const oldHTML =
                                button.innerHTML;


                            button.innerHTML =
                                '<i class="fas fa-check"></i> تم النسخ';


                            setTimeout(
                                () => {

                                    button.innerHTML =
                                        oldHTML;

                                },
                                1500
                            );

                        }

                        catch (error) {

                            showToast(
                                "تعذر نسخ الكود"
                            );

                        }

                    }
                );

            }
        );

}


// ==========================================
// 45. QUICK PROMPTS
// ==========================================

function setupQuickPrompts() {

    document
        .querySelectorAll(
            ".quick-prompt"
        )
        .forEach(
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

                        const prompt =
                            button.dataset.prompt ||
                            button.getAttribute(
                                "data-prompt"
                            );


                        if (!prompt) {
                            return;
                        }


                        const welcome =
                            document.querySelector(
                                ".nova-welcome"
                            );


                        if (welcome) {

                            welcome.style.display =
                                "none";

                        }


                        if (chatInput) {

                            chatInput.value =
                                prompt;


                            chatInput.focus();

                        }

                    }
                );

            }
        );

}


// ==========================================
// 46. MAIN EVENTS
// ==========================================

function setupMainEvents() {

    if (newChatBtn) {

        newChatBtn.addEventListener(
            "click",
            () => {

                startNewChat();

            }
        );

    }


    if (sendChatBtn) {

        sendChatBtn.addEventListener(
            "click",
            () => {

                if (
                    currentAbortController
                ) {

                    try {

                        currentAbortController.abort();

                    }

                    catch (error) {}

                    return;

                }


                sendMessage();

            }
        );

    }


    if (chatInput) {

        chatInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendMessage();

                }

            }
        );


        chatInput.addEventListener(
            "input",
            () => {

                chatInput.style.height =
                    "auto";


                const maxHeight =
                    130;


                chatInput.style.height =
                    Math.min(
                        chatInput.scrollHeight,
                        maxHeight
                    ) + "px";

            }
        );

    }


    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".more-btn"
                ) &&
                !event.target.closest(
                    ".chat-context-menu"
                )
            ) {

                document
                    .querySelectorAll(
                        ".chat-context-menu"
                    )
                    .forEach(
                        menu =>
                            menu.classList.remove(
                                "show"
                            )
                    );

            }

        }
    );

}


// ==========================================
// 47. ATTACH DROPDOWN TOGGLE
// ==========================================

document.addEventListener(
    "click",
    event => {

        const attachBtn =
            event.target.closest(
                "#attachBtn"
            );


        if (
            attachBtn &&
            attachDropdown
        ) {

            event.stopPropagation();


            attachDropdown.classList.toggle(
                "show"
            );


            document
                .querySelectorAll(
                    ".chat-context-menu"
                )
                .forEach(
                    menu =>
                        menu.classList.remove(
                            "show"
                        )
                );


            return;

        }


        if (
            attachDropdown &&
            !event.target.closest(
                "#attachDropdown"
            )
        ) {

            attachDropdown.classList.remove(
                "show"
            );

        }

    }
);


// ==========================================
// 48. INITIAL QUICK PROMPTS FALLBACK
// ==========================================

if (
    document.readyState !==
    "loading"
) {

    setupQuickPrompts();

}


// ==========================================
// 49. GLOBAL ERROR PROTECTION
// ==========================================

window.addEventListener(
    "error",
    event => {

        console.error(
            "Nova AI Global Error:",
            event.error ||
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "Nova AI Promise Error:",
            event.reason
        );

    }
);

// ==========================================
// NOVA AI - SMART MEMORY
// ==========================================

const MEMORY_STORAGE_KEY = "novaSmartMemory";

let novaMemory = loadNovaMemory();


// ==========================================
// LOAD MEMORY
// ==========================================

function loadNovaMemory() {

    try {

        const saved =
            localStorage.getItem(MEMORY_STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Memory Load Error:",
            error
        );

        return [];
    }
}


// ==========================================
// SAVE MEMORY
// ==========================================

function saveNovaMemory() {

    try {

        localStorage.setItem(
            MEMORY_STORAGE_KEY,
            JSON.stringify(novaMemory)
        );

    } catch (error) {

        console.error(
            "Memory Save Error:",
            error
        );
    }
}


// ==========================================
// ADD MEMORY
// ==========================================

function addNovaMemory(text) {

    if (
        typeof text !== "string" ||
        !text.trim()
    ) {
        return false;
    }

    const cleanText = text.trim();

    const exists = novaMemory.some(
        memory =>
            memory.text.toLowerCase() ===
            cleanText.toLowerCase()
    );

    if (exists) {
        return false;
    }

    const memory = {

        id:
            Date.now().toString() +
            Math.random().toString(36).slice(2),

        text: cleanText,

        createdAt: Date.now()

    };

    novaMemory.unshift(memory);

    saveNovaMemory();

    renderNovaMemory();

    return true;
}


// ==========================================
// DELETE MEMORY
// ==========================================

function deleteNovaMemory(id) {

    novaMemory =
        novaMemory.filter(
            memory => memory.id !== id
        );

    saveNovaMemory();

    renderNovaMemory();

    showToast("تم حذف الذكرى 🗑️");
}


// ==========================================
// CLEAR ALL MEMORY
// ==========================================

function clearAllNovaMemory() {

    if (!novaMemory.length) {

        showToast(
            "لا توجد ذكريات محفوظة."
        );

        return;
    }

    const confirmed = confirm(
        "هل أنت متأكد من حذف جميع ذكريات Nova؟"
    );

    if (!confirmed) {
        return;
    }

    novaMemory = [];

    saveNovaMemory();

    renderNovaMemory();

    showToast(
        "تم مسح جميع الذكريات 🧹"
    );
}


// ==========================================
// RENDER MEMORY
// ==========================================

function renderNovaMemory() {

    const memoryList =
        document.getElementById(
            "memoryList"
        );

    if (!memoryList) {
        return;
    }

    if (!novaMemory.length) {

        memoryList.innerHTML = `
            <div class="memory-empty">
                <i class="fas fa-brain"></i>

                <span>
                    لا توجد ذكريات محفوظة حاليًا.
                </span>
            </div>
        `;

        return;
    }

    memoryList.innerHTML =
        novaMemory.map(memory => {

            return `
                <div
                    class="memory-item"
                    data-memory-id="${escapeAttribute(memory.id)}"
                >

                    <div class="memory-icon">
                        <i class="fas fa-brain"></i>
                    </div>

                    <div class="memory-content">
                        <div class="memory-text">
                            ${escapeHTML(memory.text)}
                        </div>
                    </div>

                    <button
                        class="memory-delete-btn"
                        type="button"
                        title="حذف الذكرى"
                        data-memory-delete="${escapeAttribute(memory.id)}"
                    >
                        <i class="fas fa-trash"></i>
                    </button>

                </div>
            `;

        }).join("");

    memoryList
        .querySelectorAll(
            "[data-memory-delete]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.memoryDelete;

                    deleteNovaMemory(id);
                }
            );

        });
}


// ==========================================
// GET MEMORY FOR AI
// ==========================================

function getNovaMemoryForAI() {

    if (!novaMemory.length) {
        return "";
    }

    return novaMemory
        .map(memory => `- ${memory.text}`)
        .join("\n");
}


// ==========================================
// MEMORY COMMAND DETECTION
// ==========================================

function detectMemoryCommand(text) {

    if (
        typeof text !== "string" ||
        !text.trim()
    ) {
        return {
            type: "none",
            value: ""
        };
    }

    const cleanText =
        text.trim();

    // حفظ ذاكرة

    const rememberPatterns = [

        /^افتكر\s+(.+)$/i,

        /^تذكر\s+(.+)$/i,

        /^احفظ\s+(.+)$/i,

        /^خلي بالك إن\s+(.+)$/i,

        /^خليك فاكر إن\s+(.+)$/i,

        /^remember\s+(.+)$/i,

        /^remember that\s+(.+)$/i

    ];

    for (const pattern of rememberPatterns) {

        const match =
            cleanText.match(pattern);

        if (match) {

            return {
                type: "save",
                value: match[1].trim()
            };
        }
    }


    // حذف ذاكرة

    const forgetPatterns = [

        /^انسَ\s+(.+)$/i,

        /^انسى\s+(.+)$/i,

        /^احذف من ذاكرتك\s+(.+)$/i,

        /^forget\s+(.+)$/i,

        /^forget that\s+(.+)$/i

    ];

    for (const pattern of forgetPatterns) {

        const match =
            cleanText.match(pattern);

        if (match) {

            return {
                type: "forget",
                value: match[1].trim()
            };
        }
    }


    // عرض الذكريات

    const showPatterns = [

        "إيه اللي فاكره عني",
        "ايه اللي فاكره عني",
        "ماذا تتذكر عني",
        "إيه الذكريات اللي عندك",
        "ايه الذكريات اللي عندك",
        "اعرض ذاكرتك",
        "عرض الذكريات",
        "what do you remember about me",
        "show my memories"

    ];

    const normalized =
        cleanText
            .toLowerCase()
            .replace(/[؟?]/g, "");

    if (
        showPatterns.some(
            pattern =>
                normalized ===
                pattern.toLowerCase()
        )
    ) {

        return {
            type: "show",
            value: ""
        };
    }


    return {
        type: "none",
        value: ""
    };
}


// ==========================================
// FIND MEMORY TO DELETE
// ==========================================

function findMemoryToDelete(searchText) {

    if (!searchText) {
        return null;
    }

    const normalized =
        searchText
            .toLowerCase()
            .trim();

    // تطابق كامل

    let found =
        novaMemory.find(
            memory =>
                memory.text
                    .toLowerCase()
                    .includes(normalized)
        );

    if (found) {
        return found;
    }

    // محاولة مطابقة الكلمات

    const words =
        normalized
            .split(/\s+/)
            .filter(Boolean);

    if (!words.length) {
        return null;
    }

    found =
        novaMemory.find(memory => {

            const memoryText =
                memory.text.toLowerCase();

            return words.every(
                word =>
                    memoryText.includes(word)
            );

        });

    return found || null;
}


// ==========================================
// HANDLE MEMORY COMMAND
// ==========================================

function handleMemoryCommand(text) {

    const command =
        detectMemoryCommand(text);

    if (command.type === "none") {
        return null;
    }


    // ==========================
    // SAVE
    // ==========================

    if (command.type === "save") {

        const added =
            addNovaMemory(command.value);

        if (added) {

            return {
                handled: true,

                reply:
                    `تمام 🧠 حفظت دي في ذاكرتي:\n\n` +
                    `**${command.value}**`
            };

        }

        return {
            handled: true,

            reply:
                "المعلومة دي موجودة بالفعل في ذاكرتي 🧠"
        };
    }


    // ==========================
    // FORGET
    // ==========================

    if (command.type === "forget") {

        const memory =
            findMemoryToDelete(
                command.value
            );

        if (!memory) {

            return {
                handled: true,

                reply:
                    "مش لاقي المعلومة دي في ذاكرتي."
            };
        }

        deleteNovaMemorySilently(
            memory.id
        );

        return {
            handled: true,

            reply:
                `تمام 🧹 نسيت المعلومة دي:\n\n` +
                `**${memory.text}**`
        };
    }


    // ==========================
    // SHOW
    // ==========================

    if (command.type === "show") {

        if (!novaMemory.length) {

            return {
                handled: true,

                reply:
                    "لسه مفيش أي معلومات محفوظة في ذاكرتي 🧠"
            };
        }

        const list =
            novaMemory
                .map(
                    (memory, index) =>
                        `${index + 1}. ${memory.text}`
                )
                .join("\n");

        return {
            handled: true,

            reply:
                `دي المعلومات اللي محفوظة عندي 🧠:\n\n${list}`
        };
    }


    return null;
}


// ==========================================
// SILENT DELETE
// ==========================================

function deleteNovaMemorySilently(id) {

    novaMemory =
        novaMemory.filter(
            memory =>
                memory.id !== id
        );

    saveNovaMemory();

    renderNovaMemory();
}


// ==========================================
// MEMORY EVENTS
// ==========================================

function setupMemory() {

    renderNovaMemory();

    const clearMemoryBtn =
        document.getElementById(
            "clearMemoryBtn"
        );

    if (clearMemoryBtn) {

        clearMemoryBtn.addEventListener(
            "click",
            clearAllNovaMemory
        );
    }
}

// ==========================================
// NOVA AI
// Think. Create. Build. 🚀
// ==========================================
