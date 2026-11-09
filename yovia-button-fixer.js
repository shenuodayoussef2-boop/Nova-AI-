
/*
 * YOVIA AI - Button Fixer
 * يربط أزرار المحادثة تلقائيًا دون حذف بيانات أو تعديل وظائفك الأصلية.
 */

(() => {
    "use strict";

    function connectButton(id, handler) {
        const button = document.getElementById(id);

        if (!button || button.dataset.yoviaFixerBound === "true") {
            return;
        }

        button.addEventListener("click", handler);
        button.dataset.yoviaFixerBound = "true";
    }

    function connectControls() {

        // زر محادثة جديدة
        connectButton("newChatBtn", () => {
            if (typeof window.startNewChat === "function") {
                window.startNewChat();
            } else {
                console.error("startNewChat() غير موجودة");
            }
        });

        // زر إرسال الرسالة
        connectButton("sendChatBtn", () => {
            if (typeof window.sendMessage === "function") {
                window.sendMessage();
            } else {
                console.error("sendMessage() غير موجودة");
            }
        });

        // الإرسال باستخدام Enter
        const input = document.getElementById("chatInput");

        if (
            input &&
            input.dataset.yoviaFixerEnterBound !== "true"
        ) {
            input.addEventListener("keydown", (event) => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {
                    event.preventDefault();

                    if (typeof window.sendMessage === "function") {
                        window.sendMessage();
                    }
                }
            });

            input.dataset.yoviaFixerEnterBound = "true";
        }

        // أزرار الاقتراحات السريعة
        document.querySelectorAll(".quick-prompt").forEach((button) => {

            if (button.dataset.yoviaFixerBound === "true") {
                return;
            }

            button.addEventListener("click", () => {

                const prompt = button.dataset.prompt;

                if (typeof window.sendMessage === "function") {
                    window.sendMessage(prompt || undefined);
                }
            });

            button.dataset.yoviaFixerBound = "true";
        });
    }

    // تشغيل الإصلاح بعد تحميل الصفحة
    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            connectControls,
            { once: true }
        );

    } else {

        connectControls();

    }

    console.info("YOVIA Button Fixer loaded successfully.");

})();
