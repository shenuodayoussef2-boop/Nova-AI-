document.addEventListener('DOMContentLoaded', () => {
    // 1. تفعيل زر القائمة الجانبية (Sidebar Toggle)
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    function toggleSidebar() {
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);

    // 2. تفعيل قائمة حساب المستخدم (Profile Menu)
    const novaProfileBtn = document.getElementById('novaProfileBtn');
    const novaProfileMenu = document.getElementById('novaProfileMenu');

    if (novaProfileBtn && novaProfileMenu) {
        novaProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            novaProfileMenu.classList.toggle('show');
        });

        // إغلاق القائمة عند الضغط خارجها
        document.addEventListener('click', () => {
            novaProfileMenu.classList.remove('show');
        });
    }

    // 3. تفعيل قائمة إرفاق الملفات (+)
    const attachBtn = document.getElementById('attachBtn');
    const attachDropdown = document.getElementById('attachDropdown');

    if (attachBtn && attachDropdown) {
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            attachDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            attachDropdown.classList.remove('show');
        });
    }

    // 4. تفعيل أقتراحات الأسئلة السريعة (Quick Prompts)
    const chatInput = document.getElementById('chatInput');
    const quickPrompts = document.querySelectorAll('.quick-prompt');

    quickPrompts.forEach(btn => {
        btn.addEventListener('click', () => {
            const promptText = btn.getAttribute('data-prompt');
            if (chatInput && promptText) {
                chatInput.value = promptText;
                chatInput.focus();
            }
        });
    });

    // 5. تفعيل فتح نافذة الإعدادات (Settings Modal)
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'flex';
        });
    }

    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    // 6. إرسال الرسائل (Send Chat)
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatBox = document.getElementById('chatBox');
    const novaWelcome = document.getElementById('novaWelcome');

    function handleSendMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        // إخفاء رسالة الترحيب عند بدء الشات
        if (novaWelcome) {
            novaWelcome.style.display = 'none';
        }

        // إضافة رسالة المستخدم للشات
        const userMsg = document.createElement('div');
        userMsg.style.cssText = 'margin: 10px 0; padding: 10px 16px; background: #1e293b; border-radius: 12px; align-self: flex-start; max-width: 70%;';
        userMsg.textContent = text;
        chatBox.appendChild(userMsg);

        chatInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', handleSendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }
});
