/* =========================
   NOVA AI - FULL UI I18N
   ========================= */

(function () {
    "use strict";

    const STORAGE_KEY = "novaLanguage";
    const CACHE_PREFIX = "novaUITranslations_";

    const RTL_LANGUAGES = new Set([
        "ar",
        "ar-eg",
        "ar-ma",
        "fa",
        "ur",
        "he"
    ]);

    const SKIP_SELECTORS = [
        "#chatBox",
        "#chatInput",
        ".message",
        ".nova-message",
        ".user-message",
        ".nova-loading",
        "pre",
        "code",
        "script",
        "style",
        "noscript"
    ];

    const originalTextNodes = new WeakMap();
    const originalAttributes = new WeakMap();

    let currentLanguage = localStorage.getItem(STORAGE_KEY) || "auto";
    let applying = false;
    let translationTimer = null;

    function getEffectiveLanguage(language) {
        if (language !== "auto") {
            return language;
        }

        const browserLang = (
            navigator.language ||
            navigator.userLanguage ||
            "ar"
        ).toLowerCase();

        if (browserLang.startsWith("ar")) return "ar";
        if (browserLang.startsWith("fa")) return "fa";
        if (browserLang.startsWith("ur")) return "ur";
        if (browserLang.startsWith("he")) return "he";
        if (browserLang.startsWith("fr")) return "fr";
        if (browserLang.startsWith("es")) return "es";
        if (browserLang.startsWith("de")) return "de";
        if (browserLang.startsWith("it")) return "it";
        if (browserLang.startsWith("pt")) return "pt";
        if (browserLang.startsWith("ru")) return "ru";
        if (browserLang.startsWith("tr")) return "tr";
        if (browserLang.startsWith("zh")) return "zh";
        if (browserLang.startsWith("ja")) return "ja";
        if (browserLang.startsWith("ko")) return "ko";
        if (browserLang.startsWith("hi")) return "hi";

        return "en";
    }

    function shouldSkip(node) {
        const parent = node.parentElement;
        if (!parent) return true;

        return SKIP_SELECTORS.some(selector => {
            try {
                return parent.closest(selector);
            } catch {
                return false;
            }
        });
    }

    function getTextNodes() {
        const result = [];

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (shouldSkip(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const value = node.nodeValue?.trim();

                    if (!value) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // تجاهل النصوص اللي شكلها كود أو أرقام فقط
                    if (
                        value.length < 2 ||
                        /^[\d\s.,:;!?+\-/*=()[\]{}<>]+$/.test(value)
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;

        while ((node = walker.nextNode())) {
            if (!originalTextNodes.has(node)) {
                originalTextNodes.set(node, node.nodeValue);
            }

            result.push(node);
        }

        return result;
    }

    function getAttributes() {
        const elements = document.querySelectorAll(
            "input, textarea, button, [title], [aria-label], [placeholder]"
        );

        const result = [];

        elements.forEach(el => {
            if (
                SKIP_SELECTORS.some(selector => {
                    try {
                        return el.closest(selector);
                    } catch {
                        return false;
                    }
                })
            ) {
                return;
            }

            ["placeholder", "title", "aria-label"].forEach(attr => {
                if (!el.hasAttribute(attr)) return;

                if (!originalAttributes.has(el)) {
                    originalAttributes.set(el, {});
                }

                const saved = originalAttributes.get(el);

                if (!(attr in saved)) {
                    saved[attr] = el.getAttribute(attr);
                }

                const value = saved[attr];

                if (value && value.trim().length >= 2) {
                    result.push({
                        element: el,
                        attr,
                        text: value.trim()
                    });
                }
            });
        });

        return result;
    }

    function restoreOriginalUI() {
        originalTextNodes.forEach?.(() => {});

        // WeakMap لا يمكن عمل forEach لها،
        // لذلك نستعيد النص الأصلي من العناصر التي تحمل النسخة الأصلية.
        const allTextNodes = getAllTextNodes();

        allTextNodes.forEach(node => {
            const original = originalTextNodes.get(node);
            if (original != null) {
                node.nodeValue = original;
            }
        });

        document.querySelectorAll(
            "input, textarea, button, [title], [aria-label], [placeholder]"
        ).forEach(el => {
            const saved = originalAttributes.get(el);

            if (!saved) return;

            Object.entries(saved).forEach(([attr, value]) => {
                if (value == null) {
                    el.removeAttribute(attr);
                } else {
                    el.setAttribute(attr, value);
                }
            });
        });
    }

    function getAllTextNodes() {
        const result = [];

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT
        );

        let node;

        while ((node = walker.nextNode())) {
            result.push(node);
        }

        return result;
    }

    async function translateTexts(language, texts) {
        if (!texts.length) return {};

        if (language === "ar" || language === "ar-eg") {
            const result = {};
            texts.forEach(text => {
                result[text] = text;
            });
            return result;
        }

        const cacheKey =
            CACHE_PREFIX +
            language +
            "_" +
            btoa(unescape(encodeURIComponent(texts.join("\n"))))
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 80);

        try {
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
                const parsed = JSON.parse(cached);

                if (parsed && typeof parsed === "object") {
                    return parsed;
                }
            }
        } catch {}

        const response = await fetch("/api/translate-ui", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                language,
                texts
            })
        });

        if (!response.ok) {
            throw new Error("UI translation request failed");
        }

        const data = await response.json();

        const translations = data.translations || {};

        try {
            localStorage.setItem(
                cacheKey,
                JSON.stringify(translations)
            );
        } catch {}

        return translations;
    }

    async function applyLanguage(language = currentLanguage) {
        if (applying) return;

        currentLanguage = language;
        localStorage.setItem(STORAGE_KEY, language);

        const effectiveLanguage = getEffectiveLanguage(language);

        document.documentElement.lang = effectiveLanguage;
        document.documentElement.dir = RTL_LANGUAGES.has(effectiveLanguage)
            ? "rtl"
            : "ltr";

        document.body.classList.toggle(
            "nova-rtl",
            RTL_LANGUAGES.has(effectiveLanguage)
        );

        if (effectiveLanguage === "ar-eg" || effectiveLanguage === "ar") {
            restoreOriginalUI();
            return;
        }

        applying = true;

        try {
            const textNodes = getTextNodes();
            const attributes = getAttributes();

            const texts = [];

            textNodes.forEach(node => {
                const original = originalTextNodes.get(node);

                if (original && original.trim()) {
                    texts.push(original.trim());
                }
            });

            attributes.forEach(item => {
                if (item.text) {
                    texts.push(item.text);
                }
            });

            const uniqueTexts = [...new Set(texts)];

            if (!uniqueTexts.length) {
                return;
            }

            const translations = await translateTexts(
                effectiveLanguage,
                uniqueTexts
            );

            textNodes.forEach(node => {
                const original = originalTextNodes.get(node);

                if (!original) return;

                const key = original.trim();

                if (translations[key]) {
                    const leading = original.match(/^\s*/)?.[0] || "";
                    const trailing = original.match(/\s*$/)?.[0] || "";

                    node.nodeValue =
                        leading +
                        translations[key] +
                        trailing;
                }
            });

            attributes.forEach(item => {
                if (translations[item.text]) {
                    item.element.setAttribute(
                        item.attr,
                        translations[item.text]
                    );
                }
            });

        } catch (error) {
            console.error(
                "Nova UI Translation Error:",
                error
            );
        } finally {
            applying = false;
        }
    }

    function refresh() {
        clearTimeout(translationTimer);

        translationTimer = setTimeout(() => {
            applyLanguage(currentLanguage);
        }, 300);
    }

    window.NovaI18n = {
        setLanguage(language) {
            currentLanguage = language || "auto";
            localStorage.setItem(
                STORAGE_KEY,
                currentLanguage
            );

            applyLanguage(currentLanguage);
        },

        getLanguage() {
            return currentLanguage;
        },

        refresh
    };

    // أول تشغيل
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            applyLanguage(currentLanguage);
        }, 250);
    });

    // أي واجهة جديدة تظهر مثل Modal أو Settings
    const observer = new MutationObserver(() => {
        if (!applying) {
            refresh();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

})();
