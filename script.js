// ==========================================
// NOVA AI - MAIN SCRIPT (FIXED)
// ==========================================

// ==========================================
// 0. DEMO MODE
// ==========================================
const DEMO_MODE = false;

// ==========================================
// 1. نظام المحادثات
// ==========================================
let chatsArray = [];
try {
    const savedChats = localStorage.getItem("novaAllChats");
    chatsArray = savedChats ? JSON.parse(savedChats) : [];
    if (!Array.isArray(chatsArray)) {
        chatsArray = [];
    }
} catch (error) {
    console.error("Nova AI - خطأ في بيانات المحادثات:", error);
    chatsArray = [];
    localStorage.removeItem("novaAllChats");
}
let currentChatId = null;
let currentAbortController = null;
let pendingVisionImage = null;

const historyList = document.getElementById("historyList");
const chatBox = document.getElementById("chatBox");
const newChatBtn = document.getElementById("newChatBtn");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatInput = document.getElementById("chatInput");

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
function startNewChat() {
    currentChatId = Date.now().toString();
    pendingVisionImage = null;
    if (currentAbortController) {
        try { currentAbortController.abort(); } catch {}
        currentAbortController = null;
    }
    updateSendButtonState(false);
    if (chatBox) {
        chatBox.innerHTML = `
            <div class="nova-welcome" id="novaWelcome">
                <div class="nova-welcome-icon"><i class="fa-solid fa-sparkles"></i></div>
                <h1>أهلاً بيك في <span>Nova AI</span> 👋</h1>
                <p>مساعدك الذكي للبرمجة، الكتابة، التعلم والإبداع.<br>ابدأ محادثتك واكتشف إمكانيات Nova.</p>
                <div class="quick-prompts">
                    <button type="button" class="quick-prompt" data-prompt="اكتب لي فكرة مشروع ويب مبتكر باستخدام HTML وCSS وJavaScript"><i class="fa-solid fa-code"></i><span>اقترح لي مشروع برمجي</span></button>
                    <button type="button" class="quick-prompt" data-prompt="اشرح لي الذكاء الاصطناعي بطريقة سهلة وبسيطة"><i class="fa-solid fa-brain"></i><span>اشرح لي الذكاء الاصطناعي</span></button>
                    <button type="button" class="quick-prompt" data-prompt="ساعدني في كتابة خطة لتعلم البرمجة من البداية"><i class="fa-solid fa-graduation-cap"></i><span>ساعدني أتعلم البرمجة</span></button>
                    <button type="button" class="quick-prompt" data-prompt="اكتب لي قصة قصيرة وممتعة"><i class="fa-solid fa-book-open"></i><span>اكتب لي قصة قصيرة</span></button>
                </div>
            </div>`;
        if (typeof setupQuickPrompts === "function") {
            setupQuickPrompts();
        }
    }
    if (chatInput) {
        chatInput.value = "";
        chatInput.style.height = "auto";
    }
    renderHistoryList();
    closeAllMenus();
}

// ==========================================
// حفظ المحادثة
// ==========================================
function saveCurrentChat(firstUserMessage = "محادثة جديدة") {
    if (!chatBox || !currentChatId) return;
    let existingChat = chatsArray.find(chat => chat.id === currentChatId);
    const chatHtml = chatBox.innerHTML;
    if (existingChat) {
        existingChat.html = chatHtml;
        if (existingChat.title === "محادثة جديدة" && firstUserMessage !== "محادثة جديدة") {
            existingChat.title = firstUserMessage.substring(0, 25) + "...";
        }
    } else {
        chatsArray.unshift({
            id: currentChatId,
            title: firstUserMessage !== "محادثة جديدة" ? firstUserMessage.substring(0, 25) + "..." : "محادثة جديدة",
            html: chatHtml,
            pinned: false,
            createdAt: Date.now()
        });
    }
    localStorage.setItem("novaAllChats", JSON.stringify(chatsArray));
    renderHistoryList();
}

// ==========================================
// عرض History
// ==========================================
function renderHistoryList() {
    if (!historyList) return;
    historyList.innerHTML = "";
    const sortedChats = [...chatsArray].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });
    sortedChats.forEach(chat => {
        const li = document.createElement("li");
        li.className = "history-item";
        if (chat.id === currentChatId) li.classList.add("active-chat");
        li.innerHTML = `
            <span class="history-title-text" title="${escapeHtml(chat.title)}">${chat.pinned ? "📌 " : ""}${escapeHtml(chat.title)}</span>
            <button class="more-btn" type="button"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            <div class="chat-context-menu">
                <div class="context-item opt-share"><i class="fa-solid fa-share-nodes"></i><span>مشاركة</span></div>
                <div class="context-item opt-pin"><i class="fa-solid fa-thumbtack"></i><span>${chat.pinned ? "إلغاء التثبيت" : "تثبيت"}</span></div>
                <div class="context-item opt-rename"><i class="fa-solid fa-pen"></i><span>إعادة تسمية</span></div>
                <div class="context-item opt-delete"><i class="fa-regular fa-trash-can"></i><span>حذف</span></div>
            </div>`;
        li.addEventListener("click", e => {
            if (!e.target.closest(".more-btn") && !e.target.closest(".chat-context-menu")) {
                loadChat(chat.id);
            }
        });
        const moreBtn = li.querySelector(".more-btn");
        const contextMenu = li.querySelector(".chat-context-menu");
        moreBtn.addEventListener("click", e => {
            e.stopPropagation();
            document.querySelectorAll(".chat-context-menu").forEach(menu => { if (menu !== contextMenu) menu.classList.remove("show"); });
            contextMenu.classList.toggle("show");
        });
        li.querySelector(".opt-share")?.addEventListener("click", async e => {
            e.stopPropagation();
            contextMenu.classList.remove("show");
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast("تم نسخ رابط الصفحة!");
            } catch { alert("تعذر نسخ الرابط."); }
        });
        li.querySelector(".opt-pin")?.addEventListener("click", e => {
            e.stopPropagation();
            contextMenu.classList.remove("show");
            const targetChat = chatsArray.find(c => c.id === chat.id);
            if (!targetChat) return;
            targetChat.pinned = !targetChat.pinned;
            localStorage.setItem("novaAllChats", JSON.stringify(chatsArray));
            renderHistoryList();
        });
        li.querySelector(".opt-rename")?.addEventListener("click", e => {
            e.stopPropagation();
            contextMenu.classList.remove("show");
            const newTitle = prompt("أدخل الاسم الجديد للمحادثة:", chat.title);
            if (newTitle && newTitle.trim() !== "") {
                chat.title = newTitle.trim();
                localStorage.setItem("novaAllChats", JSON.stringify(chatsArray));
                renderHistoryList();
            }
        });
        li.querySelector(".opt-delete")?.addEventListener("click", e => {
            e.stopPropagation();
            contextMenu.classList.remove("show");
            const confirmed = confirm("هل أنت متأكد من إزالة هذه المحادثة؟");
            if (!confirmed) return;
            chatsArray = chatsArray.filter(c => c.id !== chat.id);
            localStorage.setItem("novaAllChats", JSON.stringify(chatsArray));
            if (currentChatId === chat.id) {
                if (chatsArray.length > 0) loadChat(chatsArray[0].id);
                else startNewChat();
            } else {
                renderHistoryList();
            }
        });
        historyList.appendChild(li);
    });
}

function loadChat(id) {
    currentChatId = id;
    pendingVisionImage = null;
    const chat = chatsArray.find(c => c.id === id);
    if (!chat || !chatBox) return;
    chatBox.innerHTML = chat.html;
    restoreMessageActions();
    chatBox.scrollTop = chatBox.scrollHeight;
    renderHistoryList();
    closeAllMenus();
}

function closeAllMenus() {
    document.querySelectorAll(".chat-context-menu").forEach(menu => menu.classList.remove("show"));
    const dropdown = document.getElementById("attachDropdown");
    if (dropdown) dropdown.classList.remove("show");
}

function getConversationHistory() {
    if (!chatBox) return [];
    const messages = [];
    const messageElements = chatBox.querySelectorAll(".message");
    messageElements.forEach(messageElement => {
        if (messageElement.classList.contains("nova-loading") || messageElement.querySelector(".nova-loading")) return;
        if (messageElement.classList.contains("user-message")) {
            const text = messageElement.innerText.trim();
            if (text) messages.push({ role: "user", parts: [{ text }] });
        } else if (messageElement.classList.contains("nova-message")) {
            const content = messageElement.querySelector(".nova-message-content");
            if (!content) return;
            const text = content.innerText.trim();
            if (text) messages.push({ role: "model", parts: [{ text }] });
        }
    });
    return messages.slice(-20);
}

// ==========================================
// 3. إرسال الرسالة - الجزء اللي كان فيه الغلط واتصلح
// ==========================================
async function sendMessage(customText = null, options = {}) {
    if (!chatBox) return;
    let text = customText !== null ? customText : chatInput ? chatInput.value.trim() : "";
    if (!text) return;
    if (!currentChatId) startNewChat();

    if (pendingVisionImage && !options.ignorePendingImage) {
        const imageToEdit = pendingVisionImage;
        pendingVisionImage = null;
        appendUserMessage(text);
        if (!customText && chatInput) { chatInput.value = ""; chatInput.style.height = "auto"; }
        chatBox.scrollTop = chatBox.scrollHeight;
        saveCurrentChat(text);
        await editImageWithPrompt(text, imageToEdit);
        return;
    }

    appendUserMessage(text);
    if (!customText && chatInput) { chatInput.value = ""; chatInput.style.height = "auto"; }
    chatBox.scrollTop = chatBox.scrollHeight;
    saveCurrentChat(text);
    const lowerText = text.toLowerCase();

    if (lowerText.includes("صورة") || lowerText.includes("ارسم") || lowerText.includes("تخيلية") || lowerText.includes("generate image")) {
        await generateImage(text);
        return;
    }
    if (lowerText.includes("فيديو") || lowerText.includes("مشهد متحرك") || lowerText.includes("generate video")) {
        await generateVideo(text);
        return;
    }

    if (DEMO_MODE) {
        const loadingId = "loading-" + Date.now();
        chatBox.insertAdjacentHTML("beforeend", `<div class="message bot-message nova-message" id="${loadingId}"><div class="nova-loading"><span>Nova يفكر</span><span class="loading-dots"><i></i><i></i><i></i></span></div></div>`);
        chatBox.scrollTop = chatBox.scrollHeight;
        updateSendButtonState(true);
        currentAbortController = new AbortController();
        await delay(900);
        if (!document.getElementById(loadingId)) { updateSendButtonState(false); currentAbortController = null; return; }
        document.getElementById(loadingId)?.remove();
        const demoReply = getDemoReply(text);
        chatBox.appendChild(createAssistantMessage(demoReply));
        updateSendButtonState(false);
        currentAbortController = null;
        chatBox.scrollTop = chatBox.scrollHeight;
        saveCurrentChat();
        return;
    }

    const loadingId = "loading-" + Date.now();
    chatBox.insertAdjacentHTML("beforeend", `<div class="message bot-message nova-message" id="${loadingId}"><div class="nova-loading"><span>Nova يفكر</span><span class="loading-dots"><i></i><i></i><i></i></span></div></div>`);
    chatBox.scrollTop = chatBox.scrollHeight;
    updateSendButtonState(true);
    currentAbortController = new AbortController();

    let success = false;
    let data = null;

    try {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const conversationHistory = getConversationHistory();
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: currentAbortController.signal,
                    body: JSON.stringify({ message: text, history: conversationHistory.slice(0, -1) })
                });
                data = await response.json();
                if (data.error && data.error.message && data.error.message.includes("high demand") && attempt < 3) {
                    await delay(1500);
                    continue;
                }
                success = response.ok;
                break;
            } catch (netErr) {
                if (netErr.name === "AbortError") throw netErr;
                if (attempt === 3) throw netErr;
                await delay(1500);
            }
        }

        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();

        if (success && data && data.candidates && data.candidates[0] && data.candidates[0].content) {
            const parts = data.candidates[0].content.parts || [];
            const reply = parts.map(part => part.text || "").join("\n");
            chatBox.appendChild(createAssistantMessage(reply));
        } else if (data && data.error) {
            chatBox.appendChild(createAssistantMessage("تعذر الحصول على رد من Nova حاليًا."));
        } else {
            chatBox.appendChild(createAssistantMessage("عذراً، لم يتم استلام رد صحيح من الخادم."));
        }

    } catch (error) {
        console.error("Nova API Error:", error);
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();
        if (error.name !== "AbortError") {
            chatBox.appendChild(createAssistantMessage("تعذر الاتصال بخدمة Nova حاليًا. حاول مرة أخرى 🙏"));
        }
    }

    updateSendButtonState(false);
    currentAbortController = null;
    chatBox.scrollTop = chatBox.scrollHeight;
    saveCurrentChat();
}

// ==========================================
// باقي الدوال بدون تعديل
// ==========================================
function getDemoReply(text) {
    const lower = text.toLowerCase().trim();
    if (lower.includes("مين أنت") || lower.includes("من أنت") || lower.includes("who are you")) {
        return `أنا Nova AI 🤖\nمساعد ذكاء اصطناعي مصمم لمساعدتك في الإجابة عن الأسئلة، البرمجة، تنظيم الأفكار، والمهام اليومية.\nأنت الآن تستخدم نسخة العرض التجريبية من Nova.`.trim();
    }
    if (lower.includes("مرحبا") || lower.includes("أهلا") || lower.includes("hello") || lower.includes("hi")) {
        return `أهلاً بك! 👋\nأنا Nova AI، سعيد بوجودك هنا.\nكيف يمكنني مساعدتك اليوم؟`.trim();
    }
    return `وصلتني رسالتك:\n"${text}"\nأنا Nova AI، وهذه حاليًا نسخة العرض التجريبية من التطبيق.`.trim();
}

function appendUserMessage(text) {
    const message = document.createElement("div");
    message.className = "message user-message";
    message.innerHTML = escapeHtml(text);
    chatBox.appendChild(message);
}

function createAssistantMessage(text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message bot-message nova-message";
    messageDiv.innerHTML = `
        <div class="nova-message-content">${formatNovaResponse(text)}</div>
        <div class="message-actions">
            <button type="button" class="message-action copy-message" title="نسخ"><i class="fa-regular fa-copy"></i></button>
            <button type="button" class="message-action regenerate-message" title="إعادة التوليد"><i class="fa-solid fa-rotate"></i></button>
            <button type="button" class="message-action like-message" title="مفيد"><i class="fa-regular fa-thumbs-up"></i></button>
            <button type="button" class="message-action dislike-message" title="غير مفيد"><i class="fa-regular fa-thumbs-down"></i></button>
        </div>`;
    setupMessageActions(messageDiv, text);
    setupCodeCopyButtons(messageDiv);
    return messageDiv;
}

function setupMessageActions(messageDiv, originalText) {
    if (!messageDiv) return;
    const copyBtn = messageDiv.querySelector(".copy-message");
    const regenerateBtn = messageDiv.querySelector(".regenerate-message");
    const likeBtn = messageDiv.querySelector(".like-message");
    const dislikeBtn = messageDiv.querySelector(".dislike-message");
    copyBtn?.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(originalText);
            copyBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
            showToast("تم نسخ الرد");
            setTimeout(() => { copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`; }, 1500);
        } catch { alert("تعذر نسخ النص."); }
    });
    regenerateBtn?.addEventListener("click", () => {
        const messages = [...chatBox.querySelectorAll(".message")];
        const messageIndex = messages.indexOf(messageDiv);
        if (messageIndex <= 0) return;
        const previousUserMessage = messages.slice(0, messageIndex).reverse().find(msg => msg.classList.contains("user-message"));
        if (!previousUserMessage) return;
        const text = previousUserMessage.innerText.trim();
        messageDiv.remove();
        sendMessage(text);
    });
    likeBtn?.addEventListener("click", () => { likeBtn.classList.toggle("active"); dislikeBtn?.classList.remove("active"); });
    dislikeBtn?.addEventListener("click", () => { dislikeBtn.classList.toggle("active"); likeBtn?.classList.remove("active"); });
}

function restoreMessageActions() {
    if (!chatBox) return;
    chatBox.querySelectorAll(".nova-message").forEach(message => {
        const content = message.querySelector(".nova-message-content");
        if (!content) return;
        const text = content.innerText;
        setupMessageActions(message, text);
        setupCodeCopyButtons(message);
    });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function showToast(message) {
    let toast = document.getElementById("novaToast");
    if (!toast) { toast = document.createElement("div"); toast.id = "novaToast"; toast.className = "nova-toast"; document.body.appendChild(toast); }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove("show"); }, 1800);
}

async function translateToEnglishIfNeeded(text) {
    const dictionary = { "سبونج بوب": "Spongebob Squarepants", "سبونجبوب": "Spongebob Squarepants", "شفيق": "Squidward Tentacles", "بسيط": "Patrick Star", "مستر سلطع": "Mr. Krabs", "قاع الهامور": "Bikini Bottom", "باتمان": "Batman", "سوبرمان": "Superman" };
    let cleanedText = text.trim();
    for (const [key, value] of Object.entries(dictionary)) { cleanedText = cleanedText.replace(new RegExp(key, "g"), value); }
    const hasArabic = /[\u0600-\u06FF]/.test(cleanedText);
    if (!hasArabic) return cleanedText;
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(cleanedText)}`);
        const data = await res.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) return data[0][0][0];
    } catch (err) { console.log("تعذرت الترجمة:", err); }
    return cleanedText;
}

async function generateImage(text) {
    if (!chatBox) return;
    const loadingId = "img-loading-" + Date.now();
    chatBox.insertAdjacentHTML("beforeend", `<div class="message bot-message nova-image-loading" id="${loadingId}"><div class="image-loading-card"><div class="image-loading-preview"><div class="loading-shimmer"></div><div class="loading-icon"><i class="fas fa-image"></i></div></div><div class="image-loading-info"><div class="image-loading-title"><i class="fas fa-wand-magic-sparkles"></i> Nova AI يصنع صورتك</div><div class="image-loading-subtitle">جاري تحويل وصفك إلى صورة واقعية...</div><div class="image-progress"><div class="image-progress-bar"></div></div><div class="image-loading-status"><span class="loading-pulse"></span> جاري الإبداع، انتظر قليلًا ✨</div></div></div></div>`);
    chatBox.scrollTop = chatBox.scrollHeight;
    try {
        const translatedText = await translateToEnglishIfNeeded(text);
        const finalPrompt = `Photorealistic, ultra-realistic photography, highly detailed, natural lighting, realistic textures, professional DSLR photography, cinematic composition, sharp focus, lifelike appearance, realistic depth of field, natural colors, realistic shadows, physically accurate lighting, authentic environment, realistic proportions, high detail.\n\n${translatedText}`.trim();
        const response = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: finalPrompt }) });
        const data = await response.json();
        document.getElementById(loadingId)?.remove();
        if (response.ok && data && data.success && data.image) {
            appendMediaMessage("إليك الصورة التخيلية المطلوبة من Nova AI: ✨", data.image, text, "image");
            saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight; return;
        }
        console.error("Nova AI Image Error:", data);
        const errorMessage = data?.error || "تعذر إنشاء الصورة حاليًا.";
        chatBox.appendChild(createAssistantMessage(`❌ ${errorMessage}`));
    } catch (error) {
        console.error("Nova AI Image Exception:", error);
        document.getElementById(loadingId)?.remove();
        chatBox.appendChild(createAssistantMessage("❌ تعذر الاتصال بخدمة توليد الصور حاليًا."));
    }
    saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight;
}

async function editImageWithPrompt(text, imageSrc) {
    if (!chatBox || !imageSrc) return;
    const loadingId = "edit-image-loading-" + Date.now();
    chatBox.insertAdjacentHTML("beforeend", `<div class="message bot-message nova-message" id="${loadingId}"><div class="image-loading-card"><div class="image-loading-preview"><img src="${imageSrc}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;opacity:.65;"><div class="loading-icon"><i class="fas fa-wand-magic-sparkles"></i></div></div><div class="image-loading-info"><div class="image-loading-title"><i class="fas fa-wand-magic-sparkles"></i> Nova AI يعدّل الصورة</div><div class="image-loading-subtitle">جاري تنفيذ التعديل المطلوب...</div><div class="image-progress"><div class="image-progress-bar"></div></div><div class="image-loading-status"><span class="loading-pulse"></span> جاري معالجة الصورة ✨</div></div></div></div>`);
    chatBox.scrollTop = chatBox.scrollHeight;
    try {
        const translatedText = await translateToEnglishIfNeeded(text);
        const finalPrompt = `Edit the provided image according to the user's request. Preserve the person's identity, facial features, face structure, skin tone, hairstyle, body proportions, and overall appearance as much as possible. Only change the elements explicitly requested by the user. Make the result photorealistic, natural, highly detailed, realistic lighting, realistic textures, professional photography, natural shadows, accurate proportions, realistic environment.\n\nUser request:\n${translatedText}`.trim();
        const response = await fetch("/api/edit-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: finalPrompt, image: imageSrc }) });
        const data = await response.json();
        document.getElementById(loadingId)?.remove();
        if (response.ok && data && data.success && data.image) {
            appendMediaMessage("✨ تم تعديل الصورة حسب طلبك:", data.image, text, "image");
            saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight; return;
        }
        console.error("Nova AI Edit Image Error:", data);
        chatBox.appendChild(createAssistantMessage(`❌ ${data?.error || "تعذر تعديل الصورة حاليًا."}`));
    } catch (error) {
        console.error("Nova AI Edit Image Exception:", error);
        document.getElementById(loadingId)?.remove();
        chatBox.appendChild(createAssistantMessage("❌ حدث خطأ أثناء تعديل الصورة."));
    }
    saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight;
}

async function generateVideo(text) {
    const loadingId = "vid-loading-" + Date.now();
    chatBox.insertAdjacentHTML("beforeend", `<div class="message bot-message nova-message" id="${loadingId}">جاري إنشاء المشهد السينمائي... 🎬</div>`);
    chatBox.scrollTop = chatBox.scrollHeight;
    const translatedText = await translateToEnglishIfNeeded(text);
    document.getElementById(loadingId)?.remove();
    const cleanPrompt = encodeURIComponent(translatedText);
    const randomSeed = Math.floor(Math.random() * 1000000);
    const videoUrl = `https://image.pollinations.ai/prompt/cinematic%20video%20still%20of%20${cleanPrompt}?seed=${randomSeed}&width=600&height=400&nologo=true`;
    appendMediaMessage("إليك المشهد المطلوب: 🎥", videoUrl, text, "video");
    saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMediaMessage(title, src, altText, type) {
    const message = document.createElement("div");
    message.className = "message bot-message nova-message";
    const icon = type === "video" ? "🎬" : "✨";
    message.innerHTML = `<div class="nova-message-content"><p>${escapeHtml(title)}</p><div style="position:relative;display:inline-block;max-width:100%;border-radius:12px;overflow:hidden;margin-top:8px;"><img src="${src}" alt="${escapeHtml(altText)}" style="display:block;max-width:100%;max-height:350px;border-radius:12px;"><div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.75);color:#fff;padding:4px 10px;font-size:12px;font-weight:bold;border-radius:6px;backdrop-filter:blur(4px);">${icon} Nova AI</div></div></div>`;
    chatBox.appendChild(message);
}

function appendImageMessageWithVisionChips(imageSrc) {
    if (!chatBox) return;
    pendingVisionImage = imageSrc;
    const messageDiv = document.createElement("div");
    messageDiv.className = "message user-message";
    messageDiv.innerHTML = `<div style="margin-bottom:6px;">📷 تم إرفاق الصورة:</div><img src="${imageSrc}" alt="Uploaded Image" style="max-width:100%;max-height:250px;border-radius:10px;display:block;margin-bottom:10px;object-fit:contain;"><div class="vision-actions-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;border-top:1px solid rgba(255,255,255,.15);padding-top:8px;"><button class="vision-chip-btn" type="button" data-action="حلّل الصورة أو السكرين شوت ده">🔍 حلّل الصورة</button><button class="vision-chip-btn" type="button" data-action="استخرج الكلام الموجود في الصورة">📝 استخرج الكلام</button><button class="vision-chip-btn" type="button" data-action="اشرح لي المشكلة أو المحتوى الظاهر في هذه الصورة">💡 اشرح المحتوى</button></div>`;
    messageDiv.querySelectorAll(".vision-chip-btn").forEach(button => {
        button.addEventListener("click", () => {
            const action = button.dataset.action;
            triggerVisionAction(action, imageSrc);
        });
    });
    chatBox.appendChild(messageDiv);
}

window.triggerVisionAction = function (actionType, imageSrc) {
    const promptText = `بخصوص الصورة المرفقة، من فضلك قم بـ: ${actionType}`;
    sendMessage(promptText, { ignorePendingImage: true });
};

// File Input setup - افترض ان عندك fileInput و attachDropdown
const fileInput = document.getElementById("fileInput");
const attachDropdown = document.getElementById("attachDropdown");

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener("click", e => {
            e.preventDefault(); e.stopPropagation();
            if (window.innerWidth <= 768) sidebar.classList.toggle("mobile-open");
        });
    }
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener("click", () => {
            if (window.innerWidth <= 768) sidebar.classList.toggle("mobile-open");
            else sidebar.classList.toggle("collapsed");
        });
    }
    const optUpload = document.getElementById("optUpload");
    if (optUpload && fileInput) {
        optUpload.addEventListener("click", e => {
            e.stopPropagation();
            attachDropdown?.classList.remove("show");
            fileInput.click();
        });
        fileInput.addEventListener("change", () => {
            if (!fileInput.files || !fileInput.files.length) return;
            const file = fileInput.files[0];
            const fileName = file.name;
            const fileReader = new FileReader();
            fileReader.onload = function (e) {
                const fileResult = e.target.result;
                if (file.type.startsWith("image/")) {
                    appendImageMessageWithVisionChips(fileResult);
                } else {
                    chatBox.insertAdjacentHTML("beforeend", `<div class="message user-message">📎 تم إرفاق الملف: <b>${escapeHtml(fileName)}</b></div>`);
                }
                saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight;
                fileInput.value = "";
            };
            if (file.type.startsWith("image/")) fileReader.readAsDataURL(file);
            else {
                chatBox.insertAdjacentHTML("beforeend", `<div class="message user-message">📎 تم إرفاق الملف: <b>${escapeHtml(fileName)}</b></div>`);
                saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight;
                fileInput.value = "";
            }
        });
    }
    const optImage = document.getElementById("optImage");
    if (optImage) {
        optImage.addEventListener("click", async e => {
            e.stopPropagation(); attachDropdown?.classList.remove("show");
            const promptText = prompt("اكتب وصف الصورة (بالعربي أو الإنجليزي):");
            if (!promptText || !promptText.trim()) return;
            const userPrompt = promptText.trim();
            appendUserMessage(`رسم صورة: ${userPrompt}`);
            await generateImage(userPrompt);
        });
    }
    const optVideo = document.getElementById("optVideo");
    if (optVideo) {
        optVideo.addEventListener("click", async e => {
            e.stopPropagation(); attachDropdown?.classList.remove("show");
            const promptText = prompt("اكتب وصف الفيديو (بالعربي أو الإنجليزي):");
            if (!promptText || !promptText.trim()) return;
            const userPrompt = promptText.trim();
            appendUserMessage(`توليد فيديو: ${userPrompt}`);
            await generateVideo(userPrompt);
        });
    }
    const optMusic = document.getElementById("optMusic");
    if (optMusic) {
        optMusic.addEventListener("click", e => {
            e.stopPropagation(); attachDropdown?.classList.remove("show");
            const text = prompt("اكتب النص المراد تحويله إلى صوت:");
            if (!text || !text.trim()) return;
            const cleanText = text.trim();
            appendUserMessage(`توليد صوت: ${cleanText}`);
            const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=ar&client=tw-ob`;
            chatBox.insertAdjacentHTML("beforeend", `<div class="message bot-message nova-message"><div class="nova-message-content"><p>🎵 تم إنشاء المقطع الصوتي:</p><audio controls autoplay src="${audioUrl}" style="margin-top:10px;width:100%;"></audio></div></div>`);
            saveCurrentChat(); chatBox.scrollTop = chatBox.scrollHeight;
        });
    }
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const voiceOverlay = document.getElementById("voiceOverlay");
const closeVoiceBtn = document.getElementById("closeVoiceBtn");
const endVoiceCallBtn = document.getElementById("endVoiceCallBtn");
const voiceOrb = document.getElementById("voiceOrb");
const liveVoiceBtn = document.getElementById("liveVoiceBtn");
const micBtn = document.getElementById("micBtn");
let isLiveMode = false;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = false;
    recognition.interimResults = false;
    if (micBtn) {
        micBtn.addEventListener("click", () => {
            isLiveMode = false;
            try { recognition.start(); micBtn.classList.add("recording"); } catch (error) { console.log("Recognition already running."); }
        });
    }
    if (liveVoiceBtn) {
        liveVoiceBtn.addEventListener("click", () => {
            isLiveMode = true;
            if (voiceOverlay) voiceOverlay.classList.add("active");
            if (voiceOrb) voiceOrb.className = "voice-orb listening";
            try { recognition.start(); } catch (error) { console.log("Recognition already running."); }
        });
    }
    recognition.onresult = async event => {
        const transcript = event.results[0][0].transcript;
        micBtn?.classList.remove("recording");
        if (isLiveMode) {
            if (voiceOrb) voiceOrb.className = "voice-orb speaking";
            await sendVoiceMessageAndReply(transcript);
        } else {
            if (chatInput) {
                chatInput.value = transcript;
                chatInput.focus();
                chatInput.dispatchEvent(new Event("input"));
            }
        }
    };
    recognition.onerror = event => {
        console.error("خطأ في التعرف على الصوت:", event.error);
        micBtn?.classList.remove("recording");
        if (voiceOrb) voiceOrb.className = "voice-orb idle";
    };
    recognition.onend = () => {
        micBtn?.classList.remove("recording");
        if (isLiveMode && voiceOrb) voiceOrb.className = "voice-orb idle";
    };
}

async function sendVoiceMessageAndReply(transcript) {
    if (!transcript) return;
    if (voiceOverlay) voiceOverlay.classList.remove("active");
    await sendMessage(transcript);
}

// دوال ناقصة لازم تكون موجودة
function formatNovaResponse(text) { return escapeHtml(text); }
function setupCodeCopyButtons(div) {}
function updateSendButtonState(isSending) {
    if (sendChatBtn) sendChatBtn.disabled = isSending;
}
// إتاحة وظائف المحادثة للملفات الخارجية
window.startNewChat = startNewChat;
window.sendMessage = sendMessage;
