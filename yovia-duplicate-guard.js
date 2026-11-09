
(() => {
    "use strict";

    // منع تشغيل ملف الحماية أكثر من مرة
    if (window.__YOVIA_DUPLICATE_GUARD__) return;

    window.__YOVIA_DUPLICATE_GUARD__ = true;

    // منع تحميل نفس ملف JavaScript الخارجي أكثر من مرة
    const loadedScripts = new Set();

    document.querySelectorAll('script[src]').forEach((script) => {
        const url = new URL(script.src, location.href).href;

        if (loadedScripts.has(url)) {
            console.warn("YOVIA: Duplicate script detected:", url);
            script.remove();
            return;
        }

        loadedScripts.add(url);
    });

    // منع تنفيذ نفس عملية الحماية أكثر من مرة
    window.YOVIA = window.YOVIA || {};

    window.YOVIA.runOnce = function (key, callback) {
        if (typeof key !== "string" || typeof callback !== "function") {
            return false;
        }

        const storageKey = "__YOVIA_ONCE__" + key;

        if (window[storageKey]) {
            console.warn("YOVIA: Duplicate execution blocked:", key);
            return false;
        }

        window[storageKey] = true;
        callback();

        return true;
    };

    console.info("YOVIA Duplicate Guard initialized");
})();
