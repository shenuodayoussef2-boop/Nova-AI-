// ==========================================
// NOVA AI - MAIN SCRIPT
// ==========================================

// ==========================================
// 0. DEMO MODE
// ==========================================

// true = عرض تجريبي بدون Gemini
// false = استخدام api/chat.php
const DEMO_MODE = false;


// ==========================================
// 1. نظام المحادثات
// ==========================================

let chatsArray =
    JSON.parse(localStorage.getItem("novaAllChats")) || [];

let currentChatId = null;

let currentAbortController = null;

const historyList =
    document.getElementById("historyList");

const chatBox =
    document.getElementById("chatBox");

const newChatBtn =
    document.getElementById("newChatBtn");

const sendChatBtn =
    document.getElementById("sendChatBtn");

const chatInput =
    document.getElementById("chatInput");


// ==========================================
// تهيئة التطبيق
// ==========================================

window.addEventListener("DOMContentLoaded", () => {

    renderHistoryList();

    if (chatsArray.length > 0) {
        loadChat(chatsArray[0].id);
    } else {
        startNewChat();
    }

});


// ==========================================
// محادثة جديدة
// ==========================================

if (newChatBtn) {

    newChatBtn.addEventListener(
        "click",
        startNewChat
    );

}


function startNewChat() {

    currentChatId =
        Date.now().toString();

    if (chatBox) {

        chatBox.innerHTML = `
            <div class="message bot-message nova-message">
                <div class="nova-message-content">
                    أهلاً بك! أنا Nova، مساعدك الذكي من تطوير البشمهندس يوسف شنودة. كيف يمكنني مساعدتك اليوم؟
                </div>
            </div>
        `;

    }

    if (chatInput) {

        chatInput.value = "";

        chatInput.style.height =
            "auto";

    }

    renderHistoryList();

    closeAllMenus();

}


// ==========================================
// حفظ المحادثة
// ==========================================

function saveCurrentChat(
    firstUserMessage = "محادثة جديدة"
) {

    if (
        !chatBox ||
        !currentChatId
    ) {
        return;
    }

    let existingChat =
        chatsArray.find(
            chat =>
                chat.id === currentChatId
        );

    const chatHtml =
        chatBox.innerHTML;

    if (existingChat) {

        existingChat.html =
            chatHtml;

        if (
            existingChat.title ===
                "محادثة جديدة" &&
            firstUserMessage !==
                "محادثة جديدة"
        ) {

            existingChat.title =
                firstUserMessage.substring(
                    0,
                    25
                ) + "...";

        }

    } else {

        chatsArray.unshift({

            id:
                currentChatId,

            title:
                firstUserMessage !==
                "محادثة جديدة"
                    ? firstUserMessage.substring(
                          0,
                          25
                      ) + "..."
                    : "محادثة جديدة",

            html:
                chatHtml,

            pinned:
                false,

            createdAt:
                Date.now()

        });

    }

    localStorage.setItem(
        "novaAllChats",
        JSON.stringify(chatsArray)
    );

    renderHistoryList();

}


// ==========================================
// عرض History
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
                    a.pinned &&
                    !b.pinned
                ) {
                    return -1;
                }

                if (
                    !a.pinned &&
                    b.pinned
                ) {
                    return 1;
                }

                return 0;

            }
        );

    sortedChats.forEach(
        chat => {

            const li =
                document.createElement(
                    "li"
                );

            li.className =
                "history-item";

            if (
                chat.id ===
                currentChatId
            ) {

                li.classList.add(
                    "active-chat"
                );

            }

            li.innerHTML = `

                <span
                    class="history-title-text"
                    title="${escapeHtml(chat.title)}"
                >
                    ${chat.pinned ? "📌 " : ""}
                    ${escapeHtml(chat.title)}
                </span>

                <button
                    class="more-btn"
                    type="button"
                    title="Options"
                >
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>

                <div class="chat-context-menu">

                    <div class="context-item opt-share">
                        <i class="fa-solid fa-share-nodes"></i>
                        <span>مشاركة</span>
                    </div>

                    <div class="context-item opt-pin">
                        <i class="fa-solid fa-thumbtack"></i>
                        <span>
                            ${
                                chat.pinned
                                    ? "إلغاء التثبيت"
                                    : "تثبيت"
                            }
                        </span>
                    </div>

                    <div class="context-item opt-rename">
                        <i class="fa-solid fa-pen"></i>
                        <span>إعادة تسمية</span>
                    </div>

                    <div class="context-item opt-delete">
                        <i class="fa-regular fa-trash-can"></i>
                        <span>حذف</span>
                    </div>

                </div>

            `;


            li.addEventListener(
                "click",
                e => {

                    if (
                        !e.target.closest(
                            ".more-btn"
                        ) &&
                        !e.target.closest(
                            ".chat-context-menu"
                        )
                    ) {

                        loadChat(
                            chat.id
                        );

                    }

                }
            );


            const moreBtn =
                li.querySelector(
                    ".more-btn"
                );

            const contextMenu =
                li.querySelector(
                    ".chat-context-menu"
                );


            moreBtn.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    document
                        .querySelectorAll(
                            ".chat-context-menu"
                        )
                        .forEach(
                            menu => {

                                if (
                                    menu !==
                                    contextMenu
                                ) {

                                    menu.classList.remove(
                                        "show"
                                    );

                                }

                            }
                        );

                    contextMenu.classList.toggle(
                        "show"
                    );

                }
            );


            li.querySelector(
                ".opt-share"
            )?.addEventListener(
                "click",
                async e => {

                    e.stopPropagation();

                    contextMenu.classList.remove(
                        "show"
                    );

                    try {

                        await navigator.clipboard.writeText(
                            window.location.href
                        );

                        showToast(
                            "تم نسخ رابط الصفحة!"
                        );

                    } catch {

                        alert(
                            "تعذر نسخ الرابط."
                        );

                    }

                }
            );


            li.querySelector(
                ".opt-pin"
            )?.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    contextMenu.classList.remove(
                        "show"
                    );

                    const targetChat =
                        chatsArray.find(
                            c =>
                                c.id ===
                                chat.id
                        );

                    if (!targetChat) {
                        return;
                    }

                    targetChat.pinned =
                        !targetChat.pinned;

                    localStorage.setItem(
                        "novaAllChats",
                        JSON.stringify(
                            chatsArray
                        )
                    );

                    renderHistoryList();

                }
            );


            li.querySelector(
                ".opt-rename"
            )?.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    contextMenu.classList.remove(
                        "show"
                    );

                    const newTitle =
                        prompt(
                            "أدخل الاسم الجديد للمحادثة:",
                            chat.title
                        );

                    if (
                        newTitle &&
                        newTitle.trim() !== ""
                    ) {

                        chat.title =
                            newTitle.trim();

                        localStorage.setItem(
                            "novaAllChats",
                            JSON.stringify(
                                chatsArray
                            )
                        );

                        renderHistoryList();

                    }

                }
            );


            li.querySelector(
                ".opt-delete"
            )?.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    contextMenu.classList.remove(
                        "show"
                    );

                    const confirmed =
                        confirm(
                            "هل أنت متأكد من إزالة هذه المحادثة؟"
                        );

                    if (!confirmed) {
                        return;
                    }

                    chatsArray =
                        chatsArray.filter(
                            c =>
                                c.id !==
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
                            chatsArray.length >
                            0
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
            );


            historyList.appendChild(
                li
            );

        }
    );

}


// ==========================================
// تحميل محادثة
// ==========================================

function loadChat(id) {

    currentChatId =
        id;

    const chat =
        chatsArray.find(
            c => c.id === id
        );

    if (
        !chat ||
        !chatBox
    ) {
        return;
    }

    chatBox.innerHTML =
        chat.html;

    restoreMessageActions();

    chatBox.scrollTop =
        chatBox.scrollHeight;

    renderHistoryList();

    closeAllMenus();

}


// ==========================================
// إغلاق القوائم
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

    const dropdown =
        document.getElementById(
            "attachDropdown"
        );

    if (dropdown) {

        dropdown.classList.remove(
            "show"
        );

    }

}


// ==========================================
// 2. زر الإرسال
// ==========================================

function updateSendButtonState(
    isGenerating
) {

    if (!sendChatBtn) {
        return;
    }

    if (isGenerating) {

        sendChatBtn.innerHTML =
            `<i class="fa-solid fa-square"></i>`;

        sendChatBtn.title =
            "إيقاف الرد";

        sendChatBtn.classList.add(
            "stop-generating"
        );

    } else {

        sendChatBtn.innerHTML =
            `<i class="fa-solid fa-paper-plane"></i>`;

        sendChatBtn.title =
            "إرسال";

        sendChatBtn.classList.remove(
            "stop-generating"
        );

    }

}


if (sendChatBtn) {

    sendChatBtn.addEventListener(
        "click",
        () => {

            if (
                currentAbortController
            ) {

                currentAbortController.abort();

                currentAbortController =
                    null;

                updateSendButtonState(
                    false
                );

                return;

            }

            sendMessage();

        }
    );

}


// ==========================================
// الكتابة
// ==========================================

if (chatInput) {

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


    chatInput.addEventListener(
        "keydown",
        e => {

            if (
                e.key === "Enter" &&
                !e.shiftKey
            ) {

                e.preventDefault();

                if (
                    currentAbortController
                ) {
                    return;
                }

                sendMessage();

            }

        }
    );

}


// ==========================================
// 3. إرسال الرسالة
// ==========================================

async function sendMessage(
    customText = null
) {

    if (!chatBox) {
        return;
    }

    let text =
        customText !== null
            ? customText
            : chatInput
                ? chatInput.value.trim()
                : "";

    if (!text) {
        return;
    }

    if (!currentChatId) {
        startNewChat();
    }


    appendUserMessage(
        text
    );


    if (
        !customText &&
        chatInput
    ) {

        chatInput.value =
            "";

        chatInput.style.height =
            "auto";

    }


    chatBox.scrollTop =
        chatBox.scrollHeight;


    saveCurrentChat(
        text
    );


    const lowerText =
        text.toLowerCase();


    // ==========================================
    // توليد صورة
    // ==========================================

    if (
        lowerText.includes("صورة") ||
        lowerText.includes("ارسم") ||
        lowerText.includes("تخيلية") ||
        lowerText.includes("generate image")
    ) {

        await generateImage(
            text
        );

        return;

    }


    // ==========================================
    // توليد فيديو
    // ==========================================

    if (
        lowerText.includes("فيديو") ||
        lowerText.includes("مشهد متحرك") ||
        lowerText.includes("generate video")
    ) {

        await generateVideo(
            text
        );

        return;

    }


    // ==========================================
    // DEMO MODE
    // ==========================================

    if (DEMO_MODE) {

        const loadingId =
            "loading-" +
            Date.now();

        chatBox.insertAdjacentHTML(
            "beforeend",
            `
            <div
                class="message bot-message nova-message"
                id="${loadingId}"
            >
                <div class="nova-loading">
                    <span>Nova يفكر</span>

                    <span class="loading-dots">
                        <i></i>
                        <i></i>
                        <i></i>
                    </span>
                </div>
            </div>
            `
        );

        chatBox.scrollTop =
            chatBox.scrollHeight;

        updateSendButtonState(
            true
        );

        currentAbortController =
            new AbortController();

        await delay(900);

        if (
            !document.getElementById(
                loadingId
            )
        ) {
            updateSendButtonState(false);
            currentAbortController = null;
            return;
        }

        document
            .getElementById(loadingId)
            ?.remove();

        const demoReply =
            getDemoReply(text);

        chatBox.appendChild(
            createAssistantMessage(
                demoReply
            )
        );

        updateSendButtonState(
            false
        );

        currentAbortController =
            null;

        chatBox.scrollTop =
            chatBox.scrollHeight;

        saveCurrentChat();

        return;

    }


    // ==========================================
    // Gemini / PHP
    // ==========================================

    const loadingId =
        "loading-" +
        Date.now();

    chatBox.insertAdjacentHTML(
        "beforeend",
        `
        <div
            class="message bot-message nova-message"
            id="${loadingId}"
        >
            <div class="nova-loading">
                <span>Nova يفكر</span>

                <span class="loading-dots">
                    <i></i>
                    <i></i>
                    <i></i>
                </span>
            </div>
        </div>
        `
    );

    chatBox.scrollTop =
        chatBox.scrollHeight;

    updateSendButtonState(
        true
    );

    currentAbortController =
        new AbortController();

    let success =
        false;

    let data =
        null;


    try {

        for (
            let attempt = 1;
            attempt <= 3;
            attempt++
        ) {

            try {

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

                            signal:
                                currentAbortController
                                    .signal,

                            body:
                                JSON.stringify({
                                    message:
                                        text
                                })

                        }
                    );

                data =
                    await response.json();

                if (
                    data.error &&
                    data.error.message &&
                    data.error.message.includes(
                        "high demand"
                    ) &&
                    attempt < 3
                ) {

                    await delay(
                        1500
                    );

                    continue;

                }

                success =
                    response.ok;

                break;

            } catch (netErr) {

                if (
                    netErr.name ===
                    "AbortError"
                ) {

                    throw netErr;

                }

                if (
                    attempt === 3
                ) {

                    throw netErr;

                }

                await delay(
                    1500
                );

            }

        }


        const loadingElem =
            document.getElementById(
                loadingId
            );

        if (loadingElem) {
            loadingElem.remove();
        }


        if (
            success &&
            data &&
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content
        ) {

            const parts =
                data
                    .candidates[0]
                    .content
                    .parts || [];

            const reply =
                parts
                    .map(
                        part =>
                            part.text || ""
                    )
                    .join("\n");

            chatBox.appendChild(
                createAssistantMessage(
                    reply
                )
            );

        } else if (
            data &&
            data.error
        ) {

            chatBox.appendChild(
                createAssistantMessage(
                    "تعذر الحصول على رد من Nova حاليًا."
                )
            );

        } else {

            chatBox.appendChild(
                createAssistantMessage(
                    "عذراً، لم يتم استلام رد صحيح من الخادم."
                )
            );

        }

    } catch (error) {

        const loadingElem =
            document.getElementById(
                loadingId
            );

        if (loadingElem) {
            loadingElem.remove();
        }


        if (
            error.name ===
            "AbortError"
        ) {

            chatBox.insertAdjacentHTML(
                "beforeend",
                `
                <div class="message bot-message nova-message muted-message">
                    تم إلغاء الرد بواسطة المستخدم.
                </div>
                `
            );

        } else {

            console.error(
                "Nova API Error:",
                error
            );

            chatBox.appendChild(
                createAssistantMessage(
                    "تعذر الاتصال بخدمة Nova حاليًا."
                )
            );

        }

    }


    updateSendButtonState(
        false
    );

    currentAbortController =
        null;

    chatBox.scrollTop =
        chatBox.scrollHeight;

    saveCurrentChat();

}


// ==========================================
// Demo Replies
// ==========================================

function getDemoReply(
    text
) {

    const lower =
        text.toLowerCase().trim();


    if (
        lower.includes("مين أنت") ||
        lower.includes("من أنت") ||
        lower.includes("مين انت") ||
        lower.includes("من انت") ||
        lower.includes("who are you")
    ) {

        return `
أنا Nova AI 🤖

مساعد ذكاء اصطناعي مصمم لمساعدتك في الإجابة عن الأسئلة، البرمجة، تنظيم الأفكار، والمهام اليومية.

أنت الآن تستخدم نسخة العرض التجريبية من Nova.
        `.trim();

    }


    if (
        lower.includes("مرحبا") ||
        lower.includes("أهلا") ||
        lower.includes("اهلا") ||
        lower.includes("أهلًا") ||
        lower.includes("hello") ||
        lower.includes("hi")
    ) {

        return `
أهلاً بك! 👋

أنا Nova AI، سعيد بوجودك هنا.

كيف يمكنني مساعدتك اليوم؟
        `.trim();

    }


    if (
        lower.includes("ماذا تستطيع") ||
        lower.includes("تقدر تعمل") ||
        lower.includes("تستطيع") ||
        lower.includes("what can you do")
    ) {

        return `
أقدر أساعدك في:

• الإجابة عن الأسئلة
• البرمجة وتطوير المواقع
• تحليل الأفكار
• كتابة المحتوى
• الترجمة
• تنظيم المعلومات

هذه نسخة Demo مخصصة لاستعراض تجربة Nova.
        `.trim();

    }


    if (
        lower.includes("nova") ||
        lower.includes("نوفا")
    ) {

        return `
أنا Nova AI 🚀

منصة ذكاء اصطناعي تهدف إلى تقديم تجربة عربية حديثة وسهلة الاستخدام.
        `.trim();

    }


    return `
وصلتني رسالتك:

"${text}"

أنا Nova AI، وهذه حاليًا نسخة العرض التجريبية من التطبيق.
        `.trim();

}


// ==========================================
// رسالة المستخدم
// ==========================================

function appendUserMessage(
    text
) {

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message user-message";

    message.innerHTML =
        escapeHtml(
            text
        );

    chatBox.appendChild(
        message
    );

}


// ==========================================
// رسالة Nova
// ==========================================

function createAssistantMessage(text) {

    const messageDiv = document.createElement("div");

    messageDiv.className =
        "message bot-message nova-message";

    messageDiv.innerHTML = `

        <div class="nova-message-content">
            ${formatNovaResponse(text)}
        </div>

        <div class="message-actions">

            <button
                type="button"
                class="message-action copy-message"
                title="نسخ"
            >
                <i class="fa-regular fa-copy"></i>
            </button>

            <button
                type="button"
                class="message-action regenerate-message"
                title="إعادة التوليد"
            >
                <i class="fa-solid fa-rotate"></i>
            </button>

            <button
                type="button"
                class="message-action like-message"
                title="مفيد"
            >
                <i class="fa-regular fa-thumbs-up"></i>
            </button>

            <button
                type="button"
                class="message-action dislike-message"
                title="غير مفيد"
            >
                <i class="fa-regular fa-thumbs-down"></i>
            </button>

        </div>

    `;

    setupMessageActions(
        messageDiv,
        text
    );

    setupCodeCopyButtons(
        messageDiv
    );

    return messageDiv;

}

// ==========================================
// أزرار رسالة Nova
// ==========================================

function setupMessageActions(
    messageDiv,
    originalText
) {

    if (!messageDiv) {
        return;
    }

    const copyBtn =
        messageDiv.querySelector(
            ".copy-message"
        );

    const regenerateBtn =
        messageDiv.querySelector(
            ".regenerate-message"
        );

    const likeBtn =
        messageDiv.querySelector(
            ".like-message"
        );

    const dislikeBtn =
        messageDiv.querySelector(
            ".dislike-message"
        );


    copyBtn?.addEventListener(
        "click",
        async () => {

            try {

                await navigator.clipboard.writeText(
                    originalText
                );

                copyBtn.innerHTML =
                    `<i class="fa-solid fa-check"></i>`;

                showToast(
                    "تم نسخ الرد"
                );

                setTimeout(
                    () => {

                        copyBtn.innerHTML =
                            `<i class="fa-regular fa-copy"></i>`;

                    },
                    1500
                );

            } catch {

                alert(
                    "تعذر نسخ النص."
                );

            }

        }
    );


    regenerateBtn?.addEventListener(
        "click",
        () => {

            const messages =
                [
                    ...chatBox.querySelectorAll(
                        ".message"
                    )
                ];

            const messageIndex =
                messages.indexOf(
                    messageDiv
                );

            if (
                messageIndex <= 0
            ) {
                return;
            }

            const previousUserMessage =
                messages
                    .slice(
                        0,
                        messageIndex
                    )
                    .reverse()
                    .find(
                        msg =>
                            msg.classList.contains(
                                "user-message"
                            )
                    );

            if (
                !previousUserMessage
            ) {
                return;
            }

            const text =
                previousUserMessage
                    .innerText
                    .trim();

            messageDiv.remove();

            sendMessage(
                text
            );

        }
    );


    likeBtn?.addEventListener(
        "click",
        () => {

            likeBtn.classList.toggle(
                "active"
            );

            dislikeBtn?.classList.remove(
                "active"
            );

        }
    );


    dislikeBtn?.addEventListener(
        "click",
        () => {

            dislikeBtn.classList.toggle(
                "active"
            );

            likeBtn?.classList.remove(
                "active"
            );

        }
    );

}


// ==========================================
// إعادة تفعيل أزرار الرسائل
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

                if (!content) {
                    return;
                }

                const text =
                    content.innerText;

                setupMessageActions(
                    message,
                    text
                );

                setupCodeCopyButtons(
                    message
                );

            }
        );

}

// ==========================================
// escape HTML
// ==========================================

function escapeHtml(
    text
) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";

    }

    return String(text)
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
// Delay
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
// Toast
// ==========================================

function showToast(
    message
) {

    let toast =
        document.getElementById(
            "novaToast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "novaToast";

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
            1800
        );

}


// ==========================================
// 4. ترجمة النصوص للصور
// ==========================================

async function translateToEnglishIfNeeded(
    text
) {

    const dictionary = {

        "سبونج بوب":
            "Spongebob Squarepants",

        "سبونجبوب":
            "Spongebob Squarepants",

        "شفيق":
            "Squidward Tentacles",

        "بسيط":
            "Patrick Star",

        "مستر سلطع":
            "Mr. Krabs",

        "قاع الهامور":
            "Bikini Bottom",

        "باتمان":
            "Batman",

        "سوبرمان":
            "Superman"

    };

    let cleanedText =
        text.trim();

    for (
        const [key, value]
        of Object.entries(
            dictionary
        )
    ) {

        cleanedText =
            cleanedText.replace(
                new RegExp(
                    key,
                    "g"
                ),
                value
            );

    }

    const hasArabic =
        /[\u0600-\u06FF]/.test(
            cleanedText
        );

    if (!hasArabic) {
        return cleanedText;
    }

    try {

        const res =
            await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(
                    cleanedText
                )}`
            );

        const data =
            await res.json();

        if (
            data &&
            data[0] &&
            data[0][0] &&
            data[0][0][0]
        ) {

            return data[0][0][0];

        }

    } catch (err) {

        console.log(
            "تعذرت الترجمة:",
            err
        );

    }

    return cleanedText;

}



// ==========================================
// 5. توليد الصور - fal.ai
// ==========================================

async function generateImage(text) {
    if (!chatBox) {
        return;
    }

    const loadingId = "img-loading-" + Date.now();

    // ==========================================
    // رسالة التحميل
    // ==========================================

    chatBox.insertAdjacentHTML(
        "beforeend",
        `
        <div class="message bot-message nova-image-loading" id="${loadingId}">
            <div class="image-loading-card">
                <div class="image-loading-preview">
                    <div class="loading-shimmer"></div>

                    <div class="loading-icon">
                        <i class="fas fa-image"></i>
                    </div>
                </div>

                <div class="image-loading-info">
                    <div class="image-loading-title">
                        <i class="fas fa-wand-magic-sparkles"></i>
                        Nova AI يصنع صورتك
                    </div>

                    <div class="image-loading-subtitle">
                        جاري تحويل وصفك إلى صورة واقعية...
                    </div>

                    <div class="image-progress">
                        <div class="image-progress-bar"></div>
                    </div>

                    <div class="image-loading-status">
                        <span class="loading-pulse"></span>
                        جاري الإبداع، انتظر قليلًا ✨
                    </div>
                </div>
            </div>
        </div>
        `
    );

    chatBox.scrollTop = chatBox.scrollHeight;

    // ==========================================
    // بداية معالجة توليد الصورة
    // ==========================================

    try {
        // ترجمة الوصف إلى الإنجليزية
        const translatedText =
            await translateToEnglishIfNeeded(text);

        // ==========================================
        // إعداد البرومبت الواقعي
        // ==========================================

        const finalPrompt = `
Photorealistic, ultra-realistic photography, highly detailed,
natural lighting, realistic textures, realistic materials,
professional DSLR photography, cinematic composition,
sharp focus, lifelike appearance, realistic depth of field,
natural colors, realistic shadows, physically accurate lighting,
authentic environment, realistic proportions, high detail.

${translatedText}
        `.trim();

        // ==========================================
        // إرسال الطلب إلى Vercel API
        // ==========================================

        const response = await fetch(
            "/api/generate-image",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt: finalPrompt
                })
            }
        );

        // قراءة رد السيرفر
        const data = await response.json();

        // إزالة رسالة التحميل
        document
            .getElementById(loadingId)
            ?.remove();

        // ==========================================
        // التحقق من نجاح التوليد
        // ==========================================

        if (
            response.ok &&
            data &&
            data.success &&
            data.image
        ) {
            appendMediaMessage(
                "إليك الصورة التخيلية المطلوبة من Nova AI: ✨",
                data.image,
                text,
                "image"
            );

            saveCurrentChat();

            chatBox.scrollTop =
                chatBox.scrollHeight;

            return;
        }

        // ==========================================
        // التعامل مع خطأ API
        // ==========================================

        console.error(
            "Nova AI Image Error:",
            data
        );

        const errorMessage =
            data?.error ||
            "تعذر إنشاء الصورة حاليًا.";

        chatBox.appendChild(
            createAssistantMessage(
                `❌ ${errorMessage}`
            )
        );

    } catch (error) {
        // ==========================================
        // التعامل مع الأخطاء
        // ==========================================

        console.error(
            "Nova AI Image Exception:",
            error
        );

        document
            .getElementById(loadingId)
            ?.remove();

        chatBox.appendChild(
            createAssistantMessage(
                "❌ تعذر الاتصال بخدمة توليد الصور حاليًا."
            )
        );
    }

    // ==========================================
    // حفظ المحادثة
    // ==========================================

    saveCurrentChat();

    chatBox.scrollTop =
        chatBox.scrollHeight;
}
// ==========================================
// 6. توليد الفيديو
// ==========================================

async function generateVideo(
    text
) {

    const loadingId =
        "vid-loading-" +
        Date.now();

    chatBox.insertAdjacentHTML(
        "beforeend",
        `
        <div
            class="message bot-message nova-message"
            id="${loadingId}"
        >
            جاري إنشاء المشهد السينمائي... 🎬
        </div>
        `
    );

    chatBox.scrollTop =
        chatBox.scrollHeight;

    const translatedText =
        await translateToEnglishIfNeeded(
            text
        );

    document
        .getElementById(
            loadingId
        )
        ?.remove();

    const cleanPrompt =
        encodeURIComponent(
            translatedText
        );

    const randomSeed =
        Math.floor(
            Math.random() *
            1000000
        );

    const videoUrl =
        `https://image.pollinations.ai/prompt/cinematic%20video%20still%20of%20${cleanPrompt}?seed=${randomSeed}&width=600&height=400&nologo=true`;

    appendMediaMessage(
        "إليك المشهد المطلوب: 🎥",
        videoUrl,
        text,
        "video"
    );

    saveCurrentChat();

    chatBox.scrollTop =
        chatBox.scrollHeight;

}


// ==========================================
// عرض Media
// ==========================================

function appendMediaMessage(
    title,
    src,
    altText,
    type
) {

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message bot-message nova-message";

    const icon =
        type === "video"
            ? "🎬"
            : "✨";

    message.innerHTML = `

        <div class="nova-message-content">

            <p>
                ${escapeHtml(title)}
            </p>

            <div
                style="
                    position:relative;
                    display:inline-block;
                    max-width:100%;
                    border-radius:12px;
                    overflow:hidden;
                    margin-top:8px;
                "
            >

                <img
                    src="${src}"
                    alt="${escapeHtml(altText)}"
                    style="
                        display:block;
                        max-width:100%;
                        max-height:350px;
                        border-radius:12px;
                    "
                >

                <div
                    style="
                        position:absolute;
                        bottom:8px;
                        right:8px;
                        background:rgba(0,0,0,.75);
                        color:#fff;
                        padding:4px 10px;
                        font-size:12px;
                        font-weight:bold;
                        border-radius:6px;
                        backdrop-filter:blur(4px);
                    "
                >
                    ${icon} Nova AI
                </div>

            </div>

        </div>

    `;

    chatBox.appendChild(
        message
    );

}


// ==========================================
// 7. Vision / رفع الصور
// ==========================================

function appendImageMessageWithVisionChips(
    imageSrc
) {

    if (!chatBox) {
        return;
    }

    const messageDiv =
        document.createElement(
            "div"
        );

    messageDiv.className =
        "message user-message";

    messageDiv.innerHTML = `

        <div style="margin-bottom:6px;">
            📷 تم إرفاق الصورة:
        </div>

        <img
            src="${imageSrc}"
            alt="Uploaded Image"
            style="
                max-width:100%;
                max-height:250px;
                border-radius:10px;
                display:block;
                margin-bottom:10px;
                object-fit:contain;
            "
        >

        <div
            class="vision-actions-chips"
            style="
                display:flex;
                flex-wrap:wrap;
                gap:6px;
                margin-top:8px;
                border-top:1px solid rgba(255,255,255,.15);
                padding-top:8px;
            "
        >

            <button
                class="vision-chip-btn"
                type="button"
                data-action="حلّل الصورة أو السكرين شوت ده"
            >
                🔍 حلّل الصورة
            </button>

            <button
                class="vision-chip-btn"
                type="button"
                data-action="استخرج الكلام الموجود في الصورة"
            >
                📝 استخرج الكلام
            </button>

            <button
                class="vision-chip-btn"
                type="button"
                data-action="اشرح لي المشكلة أو المحتوى الظاهر في هذه الصورة"
            >
                💡 اشرح المحتوى
            </button>

        </div>

    `;

    messageDiv
        .querySelectorAll(
            ".vision-chip-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const action =
                            button.dataset.action;

                        triggerVisionAction(
                            action,
                            imageSrc
                        );

                    }
                );

            }
        );

    chatBox.appendChild(
        messageDiv
    );

}


window.triggerVisionAction =
    function (
        actionType,
        imageSrc
    ) {

        const promptText =
            `بخصوص الصورة المرفقة، من فضلك قم بـ: ${actionType}`;

        sendMessage(
            promptText
        );

    };


// ==========================================
// 8. Sidebar + Attachments
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const sidebarToggleBtn =
            document.getElementById(
                "sidebarToggleBtn"
            );

        if (
            sidebarToggleBtn &&
            sidebar
        ) {

            sidebarToggleBtn.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <=
                        768
                    ) {

                        sidebar.classList.toggle(
                            "mobile-open"
                        );

                    } else {

                        sidebar.classList.toggle(
                            "collapsed"
                        );

                    }

                }
            );

        }


        const attachBtn =
            document.getElementById(
                "attachBtn"
            );

        const attachDropdown =
            document.getElementById(
                "attachDropdown"
            );

        const fileInput =
            document.getElementById(
                "fileInput"
            );

        if (
            attachBtn &&
            attachDropdown
        ) {

            attachBtn.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    attachDropdown.classList.toggle(
                        "show"
                    );

                }
            );

        }


        document.addEventListener(
            "click",
            () => {

                closeAllMenus();

            }
        );


        // رفع الملفات

        const optUpload =
            document.getElementById(
                "optUpload"
            );

        if (
            optUpload &&
            fileInput
        ) {

            optUpload.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    attachDropdown?.classList.remove(
                        "show"
                    );

                    fileInput.click();

                }
            );


            fileInput.addEventListener(
                "change",
                () => {

                    if (
                        !fileInput.files ||
                        !fileInput.files.length
                    ) {
                        return;
                    }

                    const file =
                        fileInput.files[0];

                    const fileName =
                        file.name;

                    const fileReader =
                        new FileReader();

                    fileReader.onload =
                        function (e) {

                            const fileResult =
                                e.target.result;

                            if (
                                file.type.startsWith(
                                    "image/"
                                )
                            ) {

                                appendImageMessageWithVisionChips(
                                    fileResult
                                );

                            } else {

                                chatBox.insertAdjacentHTML(
                                    "beforeend",
                                    `
                                    <div class="message user-message">
                                        📎 تم إرفاق الملف:
                                        <b>
                                            ${escapeHtml(
                                                fileName
                                            )}
                                        </b>
                                    </div>
                                    `
                                );

                            }

                            saveCurrentChat();

                            chatBox.scrollTop =
                                chatBox.scrollHeight;

                            fileInput.value =
                                "";

                        };


                    if (
                        file.type.startsWith(
                            "image/"
                        )
                    ) {

                        fileReader.readAsDataURL(
                            file
                        );

                    } else {

                        chatBox.insertAdjacentHTML(
                            "beforeend",
                            `
                            <div class="message user-message">
                                📎 تم إرفاق الملف:
                                <b>
                                    ${escapeHtml(
                                        fileName
                                    )}
                                </b>
                            </div>
                            `
                        );

                        saveCurrentChat();

                        chatBox.scrollTop =
                            chatBox.scrollHeight;

                        fileInput.value =
                            "";

                    }

                }
            );

        }


        // توليد صورة يدوي

        const optImage =
            document.getElementById(
                "optImage"
            );

        if (optImage) {

            optImage.addEventListener(
                "click",
                async e => {

                    e.stopPropagation();

                    attachDropdown?.classList.remove(
                        "show"
                    );

                    const promptText =
                        prompt(
                            "اكتب وصف الصورة (بالعربي أو الإنجليزي):"
                        );

                    if (
                        !promptText ||
                        !promptText.trim()
                    ) {
                        return;
                    }

                    const userPrompt =
                        promptText.trim();

                    appendUserMessage(
                        `رسم صورة: ${userPrompt}`
                    );

                    await generateImage(
                        userPrompt
                    );

                }
            );

        }


        // توليد فيديو يدوي

        const optVideo =
            document.getElementById(
                "optVideo"
            );

        if (optVideo) {

            optVideo.addEventListener(
                "click",
                async e => {

                    e.stopPropagation();

                    attachDropdown?.classList.remove(
                        "show"
                    );

                    const promptText =
                        prompt(
                            "اكتب وصف الفيديو (بالعربي أو الإنجليزي):"
                        );

                    if (
                        !promptText ||
                        !promptText.trim()
                    ) {
                        return;
                    }

                    const userPrompt =
                        promptText.trim();

                    appendUserMessage(
                        `توليد فيديو: ${userPrompt}`
                    );

                    await generateVideo(
                        userPrompt
                    );

                }
            );

        }


        // توليد صوت

        const optMusic =
            document.getElementById(
                "optMusic"
            );

        if (optMusic) {

            optMusic.addEventListener(
                "click",
                e => {

                    e.stopPropagation();

                    attachDropdown?.classList.remove(
                        "show"
                    );

                    const text =
                        prompt(
                            "اكتب النص المراد تحويله إلى صوت:"
                        );

                    if (
                        !text ||
                        !text.trim()
                    ) {
                        return;
                    }

                    const cleanText =
                        text.trim();

                    appendUserMessage(
                        `توليد صوت: ${cleanText}`
                    );

                    const audioUrl =
                        `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
                            cleanText
                        )}&tl=ar&client=tw-ob`;

                    chatBox.insertAdjacentHTML(
                        "beforeend",
                        `
                        <div class="message bot-message nova-message">

                            <div class="nova-message-content">

                                <p>
                                    🎵 تم إنشاء المقطع الصوتي:
                                </p>

                                <audio
                                    controls
                                    autoplay
                                    src="${audioUrl}"
                                    style="
                                        margin-top:10px;
                                        width:100%;
                                    "
                                ></audio>

                            </div>

                        </div>
                        `
                    );

                    saveCurrentChat();

                    chatBox.scrollTop =
                        chatBox.scrollHeight;

                }
            );

        }

    }
);


// ==========================================
// 9. Voice Recognition
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

const voiceOverlay =
    document.getElementById(
        "voiceOverlay"
    );

const closeVoiceBtn =
    document.getElementById(
        "closeVoiceBtn"
    );

const endVoiceCallBtn =
    document.getElementById(
        "endVoiceCallBtn"
    );

const voiceOrb =
    document.getElementById(
        "voiceOrb"
    );

const liveVoiceBtn =
    document.getElementById(
        "liveVoiceBtn"
    );

const micBtn =
    document.getElementById(
        "micBtn"
    );

let isLiveMode =
    false;

let recognition =
    null;


// ==========================================
// Speech Recognition
// ==========================================

if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "ar-SA";

    recognition.continuous =
        false;

    recognition.interimResults =
        false;


    if (micBtn) {

        micBtn.addEventListener(
            "click",
            () => {

                isLiveMode =
                    false;

                try {

                    recognition.start();

                    micBtn.classList.add(
                        "recording"
                    );

                } catch (error) {

                    console.log(
                        "Recognition already running."
                    );

                }

            }
        );

    }


    if (liveVoiceBtn) {

        liveVoiceBtn.addEventListener(
            "click",
            () => {

                isLiveMode =
                    true;

                if (voiceOverlay) {

                    voiceOverlay.classList.add(
                        "active"
                    );

                }

                if (voiceOrb) {

                    voiceOrb.className =
                        "voice-orb listening";

                }

                try {

                    recognition.start();

                } catch (error) {

                    console.log(
                        "Recognition already running."
                    );

                }

            }
        );

    }


    recognition.onresult =
        async event => {

            const transcript =
                event
                    .results[0][0]
                    .transcript;

            micBtn?.classList.remove(
                "recording"
            );

            if (isLiveMode) {

                if (voiceOrb) {

                    voiceOrb.className =
                        "voice-orb speaking";

                }

                await sendVoiceMessageAndReply(
                    transcript
                );

            } else {

                if (chatInput) {

                    chatInput.value =
                        transcript;

                    chatInput.focus();

                    chatInput.dispatchEvent(
                        new Event(
                            "input"
                        )
                    );

                }

            }

        };


    recognition.onerror =
        event => {

            console.error(
                "خطأ في التعرف على الصوت:",
                event.error
            );

            micBtn?.classList.remove(
                "recording"
            );

            if (voiceOrb) {

                voiceOrb.className =
                    "voice-orb";

            }

        };


    recognition.onend =
        () => {

            micBtn?.classList.remove(
                "recording"
            );

        };

} else {

    console.log(
        "المتصفح لا يدعم ميزة التعرف على الصوت."
    );

}


// ==========================================
// إغلاق Voice
// ==========================================

function closeVoiceOverlay() {

    if (voiceOverlay) {

        voiceOverlay.classList.remove(
            "active"
        );

    }

    try {

        recognition?.stop();

    } catch {}

    if (voiceOrb) {

        voiceOrb.className =
            "voice-orb";

    }

    isLiveMode =
        false;

}


if (closeVoiceBtn) {

    closeVoiceBtn.addEventListener(
        "click",
        closeVoiceOverlay
    );

}

if (endVoiceCallBtn) {

    endVoiceCallBtn.addEventListener(
        "click",
        closeVoiceOverlay
    );

}


// ==========================================
// Voice Reply
// ==========================================

async function sendVoiceMessageAndReply(
    text
) {

    if (!currentChatId) {
        startNewChat();
    }

    appendUserMessage(
        `🎙️ ${text}`
    );

    if (chatInput) {

        chatInput.value =
            "";

        chatInput.style.height =
            "auto";

    }

    chatBox.scrollTop =
        chatBox.scrollHeight;

    saveCurrentChat(
        text
    );


    // ==========================================
    // Voice Demo Mode
    // ==========================================

    if (DEMO_MODE) {

        const loadingId =
            "voice-loading-" +
            Date.now();

        chatBox.insertAdjacentHTML(
            "beforeend",
            `
            <div
                class="message bot-message nova-message"
                id="${loadingId}"
            >
                Nova يستمع ويرد... 🎧
            </div>
            `
        );

        chatBox.scrollTop =
            chatBox.scrollHeight;

        await delay(900);

        document
            .getElementById(
                loadingId
            )
            ?.remove();

        const reply =
            getDemoReply(text);

        const audioUrl =
            `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
                reply.substring(
                    0,
                    200
                )
            )}&tl=ar&client=tw-ob`;

        const message =
            document.createElement(
                "div"
            );

        message.className =
            "message bot-message nova-message";

        message.innerHTML = `

            <div class="nova-message-content">

                <p>
                    ${escapeHtml(reply)}
                </p>

                <audio
                    controls
                    autoplay
                    src="${audioUrl}"
                    style="
                        margin-top:8px;
                        width:100%;
                    "
                ></audio>

            </div>

        `;

        chatBox.appendChild(
            message
        );

        if (voiceOverlay) {

            voiceOverlay.classList.remove(
                "active"
            );

        }

        if (voiceOrb) {

            voiceOrb.className =
                "voice-orb";

        }

        isLiveMode =
            false;

        chatBox.scrollTop =
            chatBox.scrollHeight;

        saveCurrentChat();

        return;

    }


    // ==========================================
    // Voice الحقيقي
    // ==========================================

    const loadingId =
        "voice-loading-" +
        Date.now();

    chatBox.insertAdjacentHTML(
        "beforeend",
        `
        <div
            class="message bot-message nova-message"
            id="${loadingId}"
        >
            Nova يستمع ويرد... 🎧
        </div>
        `
    );

    chatBox.scrollTop =
        chatBox.scrollHeight;

    try {

        const response =
            await fetch(
                "api/chat.php",
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
                                text
                        })
                }
            );

        const data =
            await response.json();

        document
            .getElementById(
                loadingId
            )
            ?.remove();

        if (
            response.ok &&
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content
        ) {

            const reply =
                data
                    .candidates[0]
                    .content
                    .parts
                    .map(
                        part =>
                            part.text || ""
                    )
                    .join("\n");

            const audioUrl =
                `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
                    reply.substring(
                        0,
                        200
                    )
                )}&tl=ar&client=tw-ob`;

            const message =
                document.createElement(
                    "div"
                );

            message.className =
                "message bot-message nova-message";

            message.innerHTML = `

                <div class="nova-message-content">

                    <p>
                        ${escapeHtml(reply)}
                    </p>

                    <audio
                        controls
                        autoplay
                        src="${audioUrl}"
                        style="
                            margin-top:8px;
                            width:100%;
                        "
                    ></audio>

                </div>

            `;

            chatBox.appendChild(
                message
            );

        } else {

            chatBox.appendChild(
                createAssistantMessage(
                    "تعذر الحصول على رد صوتي حاليًا."
                )
            );

        }

    } catch (error) {

        console.error(
            "Voice API Error:",
            error
        );

        document
            .getElementById(
                loadingId
            )
            ?.remove();

        chatBox.appendChild(
            createAssistantMessage(
                "تعذر تشغيل خدمة الصوت حاليًا."
            )
        );

    }

    if (voiceOrb) {

        voiceOrb.className =
            "voice-orb";

    }

}


// ==========================================
// 10. Settings Modal
// ==========================================

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
        e => {

            e.stopPropagation();

            settingsModal.classList.add(
                "active"
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
                "active"
            );

        }
    );

}

window.addEventListener(
    "click",
    e => {

        if (
            settingsModal &&
            e.target === settingsModal
        ) {

            settingsModal.classList.remove(
                "active"
            );

        }

    }
);


// ==========================================
// 11. Settings Items
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const settingItems =
            document.querySelectorAll(
                ".setting-item"
            );

        settingItems.forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const text =
                            item.textContent
                                .trim();

                        if (
                            text.includes(
                                "Activity"
                            )
                        ) {

                            alert(
                                "عرض سجل النشاطات (Activity History)"
                            );

                        } else if (
                            text.includes(
                                "Personal Intelligence"
                            )
                        ) {

                            alert(
                                "إعدادات الذكاء الشخصي والبيانات"
                            );

                        } else if (
                            text.includes(
                                "Import memory"
                            )
                        ) {

                            alert(
                                "ميزة استيراد الذاكرة غير مفعلة حالياً"
                            );

                        } else {

                            alert(
                                "إعدادات عامة لتطبيق Nova AI"
                            );

                        }

                    }
                );

            }
        );

    }
);


// ==========================================
// 12. إغلاق Sidebar على الموبايل
// ==========================================

document.addEventListener(
    "click",
    e => {

        if (
            window.innerWidth >
            768
        ) {
            return;
        }

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const toggleBtn =
            document.getElementById(
                "sidebarToggleBtn"
            );

        if (!sidebar) {
            return;
        }

        if (
            sidebar.classList.contains(
                "mobile-open"
            ) &&
            !sidebar.contains(
                e.target
            ) &&
            !toggleBtn?.contains(
                e.target
            )
        ) {

            sidebar.classList.remove(
                "mobile-open"
            );

        }

    }
);


// ==========================================
// إغلاق Sidebar بعد اختيار محادثة
// ==========================================

document.addEventListener(
    "click",
    e => {

        const historyItem =
            e.target.closest(
                ".history-item"
            );

        if (
            historyItem &&
            window.innerWidth <=
                768
        ) {

            setTimeout(
                () => {

                    document
                        .getElementById(
                            "sidebar"
                        )
                        ?.classList.remove(
                            "mobile-open"
                        );

                },
                150
            );

        }

    }
);


// ==========================================
// Resize
// ==========================================

window.addEventListener(
    "resize",
    () => {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        if (
            sidebar &&
            window.innerWidth >
                768
        ) {

            sidebar.classList.remove(
                "mobile-open"
            );

        }

    }
);
// ==========================================
// تنسيق ردود Nova + أكواد البرمجة
// ==========================================

function formatNovaResponse(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return "";
    }

    text = String(text);

    // تقسيم الرد إلى أجزاء:
    // نص عادي + Code Blocks
    const parts =
        text.split(
            /(```[\s\S]*?```)/g
        );

    return parts
        .map(
            part => {

                // ==============================
                // Code Block
                // ==============================

                if (
                    part.startsWith("```") &&
                    part.endsWith("```")
                ) {

                    let codeContent =
                        part.slice(
                            3,
                            -3
                        );

                    let language =
                        "";

                    // استخراج اسم اللغة
                    const firstNewLine =
                        codeContent.indexOf(
                            "\n"
                        );

                    if (
                        firstNewLine !== -1
                    ) {

                        const possibleLanguage =
                            codeContent
                                .slice(
                                    0,
                                    firstNewLine
                                )
                                .trim();

                        // لو أول سطر اسم لغة
                        if (
                            /^[a-zA-Z0-9+#.-]+$/.test(
                                possibleLanguage
                            )
                        ) {

                            language =
                                possibleLanguage;

                            codeContent =
                                codeContent.slice(
                                    firstNewLine + 1
                                );

                        }

                    }

                    const languageNames = {

                        js: "JavaScript",
                        javascript: "JavaScript",

                        html: "HTML",

                        css: "CSS",

                        php: "PHP",

                        python: "Python",
                        py: "Python",

                        json: "JSON",

                        sql: "SQL",

                        bash: "Bash",
                        shell: "Shell",

                        java: "Java",

                        cpp: "C++",

                        c: "C",

                        csharp: "C#",
                        cs: "C#",

                        typescript:
                            "TypeScript",

                        ts:
                            "TypeScript",

                        jsx:
                            "JSX",

                        tsx:
                            "TSX",

                        xml:
                            "XML",

                        markdown:
                            "Markdown",

                        md:
                            "Markdown"

                    };

                    const displayLanguage =
                        languageNames[
                            language.toLowerCase()
                        ] ||
                        language ||
                        "Code";

                    return `

                        <div class="nova-code-wrapper">

                            <div class="nova-code-header">

                                <span class="nova-code-language">
                                    <i class="fa-solid fa-code"></i>
                                    ${escapeHtmlWithoutNewLines(
                                        displayLanguage
                                    )}
                                </span>

                                <button
                                    type="button"
                                    class="nova-copy-code"
                                    title="نسخ الكود"
                                >
                                    <i class="fa-regular fa-copy"></i>
                                    <span>نسخ</span>
                                </button>

                            </div>

                            <pre class="nova-code-block"><code>${escapeCodeHtml(
                                codeContent
                            )}</code></pre>

                        </div>

                    `;

                }

                // ==============================
                // النص العادي
                // ==============================

                return formatNormalText(
                    part
                );

            }
        )
        .join("");

}


// ==========================================
// تنسيق النص العادي
// ==========================================

function formatNormalText(
    text
) {

    if (
        !text
    ) {
        return "";
    }

    let result =
        escapeHtmlWithoutNewLines(
            text
        );

    // Bold
    result =
        result.replace(
            /\*\*(.+?)\*\*/gs,
            "<strong>$1</strong>"
        );

    result =
        result.replace(
            /__(.+?)__/gs,
            "<strong>$1</strong>"
        );

    // Italic
    result =
        result.replace(
            /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
            "<em>$1</em>"
        );

    // Inline code
    result =
        result.replace(
            /`([^`\n]+)`/g,
            '<code class="nova-inline-code">$1</code>'
        );

    // الأسطر الجديدة
    result =
        result.replace(
            /\n/g,
            "<br>"
        );

    return result;

}


// ==========================================
// Escape HTML للكود
// ==========================================

function escapeCodeHtml(
    code
) {

    if (
        code === null ||
        code === undefined
    ) {

        return "";

    }

    return String(code)
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
// Escape HTML بدون تحويل الأسطر
// ==========================================

function escapeHtmlWithoutNewLines(
    text
) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";

    }

    return String(text)
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
// أزرار نسخ الأكواد
// ==========================================

function setupCodeCopyButtons(
    container
) {

    if (!container) {
        return;
    }

    container
        .querySelectorAll(
            ".nova-copy-code"
        )
        .forEach(
            button => {

                // منع تكرار الحدث
                if (
                    button.dataset.copyReady ===
                    "true"
                ) {
                    return;
                }

                button.dataset.copyReady =
                    "true";

                button.addEventListener(
                    "click",
                    async () => {

                        const codeBlock =
                            button
                                .closest(
                                    ".nova-code-wrapper"
                                )
                                ?.querySelector(
                                    "code"
                                );

                        if (!codeBlock) {
                            return;
                        }

                        const code =
                            codeBlock.textContent;

                        try {

                            await navigator.clipboard.writeText(
                                code
                            );

                            button.innerHTML = `
                                <i class="fa-solid fa-check"></i>
                                <span>تم النسخ</span>
                            `;

                            showToast(
                                "تم نسخ الكود"
                            );

                            setTimeout(
                                () => {

                                    button.innerHTML = `
                                        <i class="fa-regular fa-copy"></i>
                                        <span>نسخ</span>
                                    `;

                                },
                                1500
                            );

                        } catch (error) {

                            console.error(
                                "Code Copy Error:",
                                error
                            );

                            alert(
                                "تعذر نسخ الكود."
                            );

                        }

                    }
                );

            }
        );

}
// ==========================================
// NOVA AI - الاقتراحات الجاهزة
// ==========================================

function setupQuickPrompts() {

    const welcome =
        document.getElementById("novaWelcome");

    const input =
        document.getElementById("chatInput");

    const prompts =
        document.querySelectorAll(".quick-prompt");

    if (!welcome || !input || !prompts.length) {
        return;
    }

    prompts.forEach(button => {

        button.addEventListener("click", () => {

            const prompt =
                button.dataset.prompt || "";

            input.value = prompt;

            input.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );

            welcome.classList.add("hidden");

            input.focus();

        });

    });

}


// تشغيل الاقتراحات
if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        setupQuickPrompts
    );

} else {

    setupQuickPrompts();

}
// ==========================================
// نهاية Nova AI
// ==========================================
