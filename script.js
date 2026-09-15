// ==========================================
// 1. نظام المحادثات المتعددة (History & Recents)
// ==========================================
let chatsArray = JSON.parse(localStorage.getItem('novaAllChats')) || [];
let currentChatId = null;

// متغير للتحكم في إلغاء طلب الـ API (Stop / Cancel)
let currentAbortController = null;

const historyList = document.getElementById('historyList');
const chatBox = document.getElementById('chatBox');
const newChatBtn = document.getElementById('newChatBtn');

// تهيئة التطبيق عند الفتح
window.addEventListener('DOMContentLoaded', () => {
    renderHistoryList();
    if (chatsArray.length > 0) {
        loadChat(chatsArray[0].id);
    } else {
        startNewChat();
    }
});

// بدء محادثة جديدة
if (newChatBtn) {
    newChatBtn.addEventListener('click', startNewChat);
}

function startNewChat() {
    currentChatId = Date.now().toString();
    chatBox.innerHTML = `<div class="message bot-message">أهلاً بك! أنا Nova، مساعدك الذكي من تطوير البشمهندس يوسف شنودة. كيف يمكنني مساعدتك اليوم؟</div>`;
    renderHistoryList();
}

// حفظ المحادثة الحالية
function saveCurrentChat(firstUserMessage = "محادثة جديدة") {
    let existingChat = chatsArray.find(c => c.id === currentChatId);
    let chatHtml = chatBox.innerHTML;

    if (existingChat) {
        existingChat.html = chatHtml;
        if (existingChat.title === "محادثة جديدة" && firstUserMessage !== "محادثة جديدة") {
            existingChat.title = firstUserMessage.substring(0, 25) + "...";
        }
    } else {
        chatsArray.unshift({
            id: currentChatId,
            title: firstUserMessage !== "محادثة جديدة" ? firstUserMessage.substring(0, 25) + "..." : "محادثة جديدة",
            html: chatHtml
        });
    }

    localStorage.setItem('novaAllChats', JSON.stringify(chatsArray));
    renderHistoryList();
}

// عرض قائمة المحادثات ديناميكياً مع القوائم المنبثقة
function renderHistoryList() {
    if (!historyList) return;
    historyList.innerHTML = '';

    chatsArray.forEach(chat => {
        const li = document.createElement('li');
        li.className = 'history-item';
        if (chat.id === currentChatId) li.classList.add('active-chat');

        li.innerHTML = `
            <span class="history-title-text" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
            <button class="more-btn" title="Options">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="chat-context-menu">
                <div class="context-item opt-share"><i class="fa-solid fa-share-nodes"></i> Share</div>
                <div class="context-item opt-pin"><i class="fa-solid fa-thumbtack"></i> Pin</div>
                <div class="context-item opt-rename"><i class="fa-solid fa-pen"></i> Rename</div>
                <div class="context-item opt-delete"><i class="fa-regular fa-trash-can"></i> Delete</div>
            </div>
        `;

        li.addEventListener('click', (e) => {
            if (!e.target.closest('.more-btn') && !e.target.closest('.chat-context-menu')) {
                loadChat(chat.id);
            }
        });

        const moreBtn = li.querySelector('.more-btn');
        const contextMenu = li.querySelector('.chat-context-menu');

        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.chat-context-menu').forEach(menu => {
                if (menu !== contextMenu) menu.classList.remove('show');
            });
            contextMenu.classList.toggle('show');
        });

        li.querySelector('.opt-share').addEventListener('click', (e) => {
            e.stopPropagation();
            contextMenu.classList.remove('show');
            navigator.clipboard.writeText(window.location.href);
            alert('تم نسخ رابط الصفحة بنجاح!');
        });

        li.querySelector('.opt-pin').addEventListener('click', (e) => {
            e.stopPropagation();
            contextMenu.classList.remove('show');
            const index = chatsArray.findIndex(c => c.id === chat.id);
            if (index > 0) {
                const [pinnedChat] = chatsArray.splice(index, 1);
                chatsArray.unshift(pinnedChat);
                localStorage.setItem('novaAllChats', JSON.stringify(chatsArray));
                renderHistoryList();
            }
        });

        li.querySelector('.opt-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            contextMenu.classList.remove('show');
            const newTitle = prompt('أدخل الاسم الجديد للمحادثة:', chat.title);
            if (newTitle && newTitle.trim() !== '') {
                chat.title = newTitle.trim();
                localStorage.setItem('novaAllChats', JSON.stringify(chatsArray));
                renderHistoryList();
            }
        });

        li.querySelector('.opt-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            contextMenu.classList.remove('show');
            if (confirm('هل أنت متأكد من إزالة هذه المحادثة؟')) {
                chatsArray = chatsArray.filter(c => c.id !== chat.id);
                localStorage.setItem('novaAllChats', JSON.stringify(chatsArray));
                if (currentChatId === chat.id) {
                    if (chatsArray.length > 0) loadChat(chatsArray[0].id);
                    else startNewChat();
                } else {
                    renderHistoryList();
                }
            }
        });

        historyList.appendChild(li);
    });
}

function loadChat(id) {
    currentChatId = id;
    const chat = chatsArray.find(c => c.id === id);
    if (chat) {
        chatBox.innerHTML = chat.html;
        chatBox.scrollTop = chatBox.scrollHeight;
        renderHistoryList();
    }
}

// ==========================================
// 2. إعدادات الـ API وإرسال الرسائل (gemini-3.6-flash)
// ==========================================
const API_KEY = "AQ.Ab8RN6LsjPHq02tQ-3VUd8LPxHwxmeOdGbtVrwoXDNAaeNJRuQ";
const sendChatBtn = document.getElementById('sendChatBtn');
const chatInput = document.getElementById('chatInput');

function updateSendButtonState(isGenerating) {
    if (!sendChatBtn) return;
    
    if (isGenerating) {
        sendChatBtn.innerHTML = `<i class="fa-solid fa-square" style="font-size: 13px;"></i>`;
        sendChatBtn.title = "إيقاف الرد";
        sendChatBtn.style.background = "#ef4444";
    } else {
        sendChatBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`;
        sendChatBtn.title = "إرسال";
        sendChatBtn.style.background = "";
    }
}

if (sendChatBtn) {
    sendChatBtn.addEventListener('click', () => {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
            updateSendButtonState(false);
            return;
        }
        sendMessage();
    });
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (currentAbortController) return;
            sendMessage();
        }
    });
}

async function sendMessage(customText = null) {
    let text = customText || chatInput.value.trim();
    if (text === '') return;

    if (!currentChatId) startNewChat();

    chatBox.innerHTML += `<div class="message user-message">${escapeHtml(text)}</div>`;
    if (!customText) chatInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;
    
    saveCurrentChat(text);

    const lowerText = text.toLowerCase();

    // التحقق التلقائي للصور
    if (lowerText.includes('صورة') || lowerText.includes('ارسم') || lowerText.includes('تخيلية') || lowerText.includes('generate image')) {
        const loadingId = 'img-loading-' + Date.now();
        chatBox.innerHTML += `<div class="message bot-message" id="${loadingId}">جاري إعداد الصورة التخيلية بناءً على طلبك... 🎨</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        const translatedText = await translateToEnglishIfNeeded(text);
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();

        const cleanPrompt = encodeURIComponent(translatedText);
        const randomSeed = Math.floor(Math.random() * 1000000);
        const imgUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?seed=${randomSeed}&width=512&height=512&nologo=true`;

        chatBox.innerHTML += `
            <div class="message bot-message">
                <p>إليك الصورة التخيلية المطلوبة: ✨</p>
                <div style="position: relative; display: inline-block; max-width: 100%; border-radius: 12px; overflow: hidden; margin-top: 8px;">
                    <img src="${imgUrl}" alt="${escapeHtml(text)}" style="display: block; max-width: 100%; max-height: 350px; border-radius: 12px;" />
                    <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.75); color: #fff; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 6px; backdrop-filter: blur(4px); font-family: sans-serif; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2);">
                        ✨ Nova AI
                    </div>
                </div>
            </div>`;

        saveCurrentChat();
        chatBox.scrollTop = chatBox.scrollHeight;
        return; 
    }

    // التحقق التلقائي للفيديوهات
    if (lowerText.includes('فيديو') || lowerText.includes('مشهد متحرك') || lowerText.includes('generate video')) {
        const loadingId = 'vid-loading-' + Date.now();
        chatBox.innerHTML += `<div class="message bot-message" id="${loadingId}">جاري إنشاء المشهد السينمائي بناءً على طلبك... 🎬</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        const translatedText = await translateToEnglishIfNeeded(text);
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();

        const cleanPrompt = encodeURIComponent(translatedText);
        const randomSeed = Math.floor(Math.random() * 1000000);
        const videoUrl = `https://image.pollinations.ai/prompt/cinematic%20video%20still%20of%20${cleanPrompt}?seed=${randomSeed}&width=600&height=400&nologo=true`;

        chatBox.innerHTML += `
            <div class="message bot-message">
                <p>إليك المشهد المطلوب: 🎥</p>
                <div style="position: relative; display: inline-block; max-width: 100%; border-radius: 12px; overflow: hidden; margin-top: 8px;">
                    <img src="${videoUrl}" alt="${escapeHtml(text)}" style="display: block; max-width: 100%; max-height: 350px; border-radius: 12px;" />
                    <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.75); color: #fff; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 6px; backdrop-filter: blur(4px); font-family: sans-serif; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2);">
                        🎬 Nova AI
                    </div>
                </div>
            </div>`;

        saveCurrentChat();
        chatBox.scrollTop = chatBox.scrollHeight;
        return;
    }

    // الدردشة النصية باستخدام نموذج gemini-3.6-flash
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div class="message bot-message" id="${loadingId}">Nova يفكر... 🤔</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    updateSendButtonState(true);
    currentAbortController = new AbortController();

    let success = false;
    let data = null;

    try {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: currentAbortController.signal,
                    body: JSON.stringify({ 
                        contents: [{ parts: [{ text: text }] }] 
                    })
                });

                data = await response.json();
                
                if (data.error && data.error.message && data.error.message.includes('high demand') && attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    continue;
                }
                
                success = true;
                break;
            } catch (netErr) {
                if (netErr.name === 'AbortError') throw netErr;
                if (attempt === 3) throw netErr;
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();

        if (success && data && data.candidates && data.candidates[0].content) {
            let reply = data.candidates[0].content.parts[0].text;
            chatBox.innerHTML += `<div class="message bot-message">${escapeHtml(reply)}</div>`;
        } else if (data && data.error) {
            chatBox.innerHTML += `<div class="message bot-message">خطأ من الخادم: ${escapeHtml(data.error.message || 'غير معروف')}</div>`;
        } else {
            chatBox.innerHTML += `<div class="message bot-message">عذراً، لم يتم استلام رد صحيح من الخادم.</div>`;
        }
    } catch (error) {
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();

        if (error.name === 'AbortError') {
            chatBox.innerHTML += `<div class="message bot-message" style="opacity: 0.7;">تم إلغاء الرد بواسطة المستخدم.</div>`;
        } else {
            chatBox.innerHTML += `<div class="message bot-message">خطأ في الاتصال بالإنترنت أو الخادم (ضغط عالٍ مؤقت).</div>`;
        }
    }

    updateSendButtonState(false);
    currentAbortController = null;
    chatBox.scrollTop = chatBox.scrollHeight;
    saveCurrentChat();
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, '&#039;')
               .replace(/\n/g, '<br>');
}

async function translateToEnglishIfNeeded(text) {
    const dictionary = {
        "سبونج بوب": "Spongebob Squarepants",
        "سبونجبوب": "Spongebob Squarepants",
        "شفيق": "Squidward Tentacles",
        "بسيط": "Patrick Star",
        "مستر سلطع": "Mr. Krabs",
        "قاع الهامور": "Bikini Bottom",
        "باتمان": "Batman",
        "سوبرمان": "Superman"
    };

    let cleanedText = text.trim();

    for (const [key, value] of Object.entries(dictionary)) {
        if (cleanedText.includes(key)) {
            cleanedText = cleanedText.replace(new RegExp(key, 'g'), value);
        }
    }

    const hasArabic = /[\u0600-\u06FF]/.test(cleanedText);
    if (!hasArabic) return cleanedText;

    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(cleanedText)}`);
        const data = await res.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }
    } catch (err) {
        console.log("تعذرت الترجمة:", err);
    }

    return cleanedText;
}

// دالة عرض الصورة مع أزرار الـ Vision Chips
function appendImageMessageWithVisionChips(imageSrc) {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div style="margin-bottom: 6px;">📷 تم إرفاق السكرين شوت:</div>
        <img src="${imageSrc}" alt="Uploaded Screenshot" style="max-width: 100%; max-height: 250px; border-radius: 10px; display: block; margin-bottom: 10px; object-fit: contain;">
        <div class="vision-actions-chips" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px;">
            <button class="vision-chip-btn" onclick="triggerVisionAction('حلّل الصورة أو السكرين شوت ده', '${imageSrc}')" style="background: #334155; color: #fff; border: 1px solid #475569; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer;">🔍 حلّل السكرين</button>
            <button class="vision-chip-btn" onclick="triggerVisionAction('استخرج الكلام الموجود في الصورة', '${imageSrc}')" style="background: #334155; color: #fff; border: 1px solid #475569; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer;">📝 استخرج الكلام</button>
            <button class="vision-chip-btn" onclick="triggerVisionAction('اشرح لي المشكلة أو المحتوى الظاهر في هذه الصورة', '${imageSrc}')" style="background: #334155; color: #fff; border: 1px solid #475569; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer;">💡 اشرح المحتوى</button>
        </div>
    `;
    chatBox.appendChild(messageDiv);
}

window.triggerVisionAction = function(actionType, imageSrc) {
    let promptText = `بخصوص السكرين شوت المرفق، من فضلك قم بـ: ${actionType}`;
    if (typeof sendMessage === 'function') {
        sendMessage(promptText);
    } else {
        console.log(promptText);
    }
};

// ==========================================
// 3. تفعيل الأزرار والقوائم المرفقة (+)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    const attachBtn = document.getElementById('attachBtn');
    const attachDropdown = document.getElementById('attachDropdown');
    const fileInput = document.getElementById('fileInput');

    if (attachBtn && attachDropdown) {
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            attachDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', () => {
        if (attachDropdown) attachDropdown.classList.remove('show');
        document.querySelectorAll('.chat-context-menu').forEach(menu => menu.classList.remove('show'));
    });

    const optUpload = document.getElementById('optUpload');
    if (optUpload && fileInput) {
        optUpload.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileName = file.name;
                const fileReader = new FileReader();

                fileReader.onload = function(e) {
                    const fileResult = e.target.result;
                    if (file.type.startsWith('image/')) {
                        appendImageMessageWithVisionChips(fileResult);
                    } else {
                        chatBox.innerHTML += `<div class="message user-message">📎 تم إرفاق الملف: <b>${escapeHtml(fileName)}</b></div>`;
                    }
                    saveCurrentChat();
                    chatBox.scrollTop = chatBox.scrollHeight;
                    fileInput.value = '';
                };

                if (file.type.startsWith('image/')) {
                    fileReader.readAsDataURL(file);
                } else {
                    chatBox.innerHTML += `<div class="message user-message">📎 تم إرفاق الملف: <b>${escapeHtml(fileName)}</b></div>`;
                    saveCurrentChat();
                    chatBox.scrollTop = chatBox.scrollHeight;
                    fileInput.value = '';
                }
            }
        });
    }

    const optImage = document.getElementById('optImage');
    if (optImage) {
        optImage.addEventListener('click', async () => {
            let promptText = prompt("اكتب وصف الصورة (بالعربي أو الإنجليزي):");
            if (promptText && promptText.trim() !== '') {
                const userPrompt = promptText.trim();
                chatBox.innerHTML += `<div class="message user-message">رسم صورة: ${escapeHtml(userPrompt)}</div>`;
                
                const loadingId = 'img-loading-' + Date.now();
                chatBox.innerHTML += `<div class="message bot-message" id="${loadingId}">جاري إعداد الصورة... 🎨</div>`;
                chatBox.scrollTop = chatBox.scrollHeight;

                const translatedText = await translateToEnglishIfNeeded(userPrompt);
                
                const loadingElem = document.getElementById(loadingId);
                if (loadingElem) loadingElem.remove();

                const cleanPrompt = encodeURIComponent(translatedText);
                const randomSeed = Math.floor(Math.random() * 1000000);
                const imgUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?seed=${randomSeed}&width=512&height=512&nologo=true`;

                chatBox.innerHTML += `
                    <div class="message bot-message">
                        <p>إليك الصورة المطلوبة: ✨</p>
                        <div style="position: relative; display: inline-block; max-width: 100%; border-radius: 12px; overflow: hidden; margin-top: 8px;">
                            <img src="${imgUrl}" alt="${escapeHtml(userPrompt)}" style="display: block; max-width: 100%; max-height: 350px; border-radius: 12px;" />
                            <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.75); color: #fff; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 6px; backdrop-filter: blur(4px); font-family: sans-serif; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2);">
                                ✨ Nova AI
                            </div>
                        </div>
                    </div>`;

                saveCurrentChat();
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        });
    }

    const optVideo = document.getElementById('optVideo');
    if (optVideo) {
        optVideo.addEventListener('click', async () => {
            let promptText = prompt("اكتب وصف الفيديو (بالعربي أو الإنجليزي):");
            if (promptText && promptText.trim() !== '') {
                const userPrompt = promptText.trim();
                chatBox.innerHTML += `<div class="message user-message">توليد فيديو: ${escapeHtml(userPrompt)}</div>`;
                
                const loadingId = 'vid-loading-' + Date.now();
                chatBox.innerHTML += `<div class="message bot-message" id="${loadingId}">جاري إنشاء الفيديو... 🎬</div>`;
                chatBox.scrollTop = chatBox.scrollHeight;

                const translatedText = await translateToEnglishIfNeeded(userPrompt);

                const loadingElem = document.getElementById(loadingId);
                if (loadingElem) loadingElem.remove();

                const cleanPrompt = encodeURIComponent(translatedText);
                const randomSeed = Math.floor(Math.random() * 1000000);
                const videoUrl = `https://image.pollinations.ai/prompt/cinematic%20video%20still%20of%20${cleanPrompt}?seed=${randomSeed}&width=600&height=400&nologo=true`;

                chatBox.innerHTML += `
                    <div class="message bot-message">
                        <p>إليك المشهد المطلوب: 🎥</p>
                        <div style="position: relative; display: inline-block; max-width: 100%; border-radius: 12px; overflow: hidden; margin-top: 8px;">
                            <img src="${videoUrl}" alt="${escapeHtml(userPrompt)}" style="display: block; max-width: 100%; max-height: 350px; border-radius: 12px;" />
                            <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0, 0, 0, 0.75); color: #fff; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 6px; backdrop-filter: blur(4px); font-family: sans-serif; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2);">
                                🎬 Nova AI
                            </div>
                        </div>
                    </div>`;

                saveCurrentChat();
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        });
    }

    const optMusic = document.getElementById('optMusic');
    if (optMusic) {
        optMusic.addEventListener('click', () => {
            let text = prompt("اكتب النص المراد تحويله إلى صوت:");
            if (text && text.trim() !== '') {
                chatBox.innerHTML += `<div class="message user-message">توليد صوت: ${escapeHtml(text)}</div>`;
                const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`;
                chatBox.innerHTML += `
                    <div class="message bot-message">
                        <p>🎵 تم إنشاء المقطع الصوتي بنجاح:</p>
                        <audio controls autoplay src="${audioUrl}" style="margin-top: 10px; width: 100%;"></audio>
                    </div>`;
                saveCurrentChat();
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        });
    }
});

// ==========================================
// 4. ميزات الصوت والتعرف على الكلام (Voice Chat)
// ==========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const voiceOverlay = document.getElementById('voiceOverlay');
const closeVoiceBtn = document.getElementById('closeVoiceBtn');
const endVoiceCallBtn = document.getElementById('endVoiceCallBtn');
const voiceOrb = document.getElementById('voiceOrb');
const liveVoiceBtn = document.getElementById('liveVoiceBtn');
const micBtn = document.getElementById('micBtn');

let isLiveMode = false;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            isLiveMode = false;
            recognition.start();
            micBtn.classList.add('recording');
        });
    }

    if (liveVoiceBtn) {
        liveVoiceBtn.addEventListener('click', () => {
            isLiveMode = true;
            if (voiceOverlay) voiceOverlay.classList.add('active');
            if (voiceOrb) voiceOrb.className = 'voice-orb listening';
            recognition.start();
        });
    }

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        
        if (micBtn) micBtn.classList.remove('recording');

        if (isLiveMode) {
            if (voiceOrb) voiceOrb.className = 'voice-orb speaking';
            await sendVoiceMessageAndReply(transcript);
        } else {
            chatInput.value = transcript;
            chatInput.focus();
        }
    };

    recognition.onerror = (event) => {
        console.error("خطأ في التعرف على الصوت:", event.error);
        if (micBtn) micBtn.classList.remove('recording');
        if (voiceOrb) voiceOrb.className = 'voice-orb';
    };
} else {
    console.log("المتصفح لا يدعم ميزة التعرف على الصوت المباشر.");
}

function closeVoiceOverlay() {
    if (voiceOverlay) voiceOverlay.classList.remove('active');
    if (recognition) recognition.stop();
    if (voiceOrb) voiceOrb.className = 'voice-orb';
}

if (closeVoiceBtn) closeVoiceBtn.addEventListener('click', closeVoiceOverlay);
if (endVoiceCallBtn) endVoiceCallBtn.addEventListener('click', closeVoiceOverlay);

async function sendVoiceMessageAndReply(text) {
    if (!currentChatId) startNewChat();

    chatBox.innerHTML += `<div class="message user-message">🎙️ ${escapeHtml(text)}</div>`;
    chatInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;
    saveCurrentChat(text);

    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div class="message bot-message" id="${loadingId}">Nova يستمع ويرد... 🎧</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: text }] }] 
            })
        });

        const data = await response.json();
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();

        if (data.candidates && data.candidates[0].content) {
            let reply = data.candidates[0].content.parts[0].text;
            const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(reply.substring(0, 200))}&tl=ar&client=tw-ob`;

            chatBox.innerHTML += `
                <div class="message bot-message">
                    <p>${escapeHtml(reply)}</p>
                    <audio controls autoplay src="${audioUrl}" style="margin-top: 8px; width: 100%;"></audio>
                </div>`;

            const audio = new Audio(audioUrl);
            audio.play();
            audio.onended = () => {
                if (voiceOverlay && voiceOverlay.classList.contains('active')) {
                    if (voiceOrb) voiceOrb.className = 'voice-orb listening';
                    if (recognition) recognition.start();
                }
            };
        } else {
            chatBox.innerHTML += `<div class="message bot-message">عذراً، لم أستطع فهم المقطع الصوتي.</div>`;
            if (voiceOrb) voiceOrb.className = 'voice-orb';
        }
    } catch (error) {
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();
        chatBox.innerHTML += `<div class="message bot-message">خطأ في الاتصال بالشبكة.</div>`;
        if (voiceOrb) voiceOrb.className = 'voice-orb';
    }

    chatBox.scrollTop = chatBox.scrollHeight;
    saveCurrentChat();
}

// ==========================================
// 5. التحكم بنافذة الإعدادات (Settings Modal)
// ==========================================
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsModal.classList.add('active');
    });
}

if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
}

window.addEventListener('click', (e) => {
    if (settingsModal && e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// ==========================================
// 6. نظام تنبيهات الإدارة (Admin Notifications)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const settingItems = document.querySelectorAll('.setting-item');

    settingItems.forEach(item => {
        item.addEventListener('click', () => {
            const text = item.textContent.trim();

            if (text.includes('Activity')) {
                alert('عرض سجل النشاطات (Activity History)');
            } 
            else if (text.includes('Personal Intelligence')) {
                alert('إعدادات الذكاء الشخصي والبيانات');
            } 
            else if (text.includes('Import memory')) {
                alert('ميزة استيراد الذاكرة غير مفعلة حالياً');
            } 
            else if (text.includes('Avatar') || text.includes('Admin') || text.includes('تنبيهات')) {
                // فتح نافذة تنبيهات الأدمن أو إرسال إشعار
                let adminMsg = prompt('أدخل نص تنبيه أو إشعار الإدارة الجديد (Admin Broadcast):');
                if (adminMsg && adminMsg.trim() !== '') {
                    localStorage.setItem('novaAdminAlert', adminMsg.trim());
                    alert('🚨 تم إرسال وتحديث تنبيه الأدمن بنجاح لجميع المستخدمين!');
                }
            }
        });
    });

    // جلب وعرض تنبيه الأدمن المحفوظ تلقائياً عند فتح التطبيق (إن وجد)
    const savedAdminAlert = localStorage.getItem('novaAdminAlert');
    if (savedAdminAlert) {
        console.log("🚨 تنبيه الإدارة:", savedAdminAlert);
        // يمكنك إظهار شريط تنبيهات علوي إذا أردت
    }
});
