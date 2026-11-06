
/* ==========================================
   YOVIA AI - CENTRAL BRANDING SYSTEM
   ========================================== */

const BRAND = {
    name: "YOVIA AI",
    shortName: "YOVIA",
    oldName: "Nova AI",
    oldShortName: "Nova",
    slogan: "Your Smart AI Companion",
    description:
        "YOVIA AI is your smart AI companion for coding, writing, learning and creativity."
};

// Replace old brand names
function replaceBrandText(value) {
    if (typeof value !== "string") return value;

    return value
        .replace(/\bNova\s+AI\b/gi, BRAND.name)
        .replace(/\bNova\b/gi, BRAND.shortName);
}

// Update document title
function updateDocumentTitle() {
    document.title = replaceBrandText(document.title);
}

// Update visible text nodes
function updateTextNodes(root = document.body) {
    if (!root) return;

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
    );

    const nodes = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;

        if (!parent) continue;

        // Avoid changing user content and code
        if (parent.closest(
            "script, style, textarea, input, code, pre, " +
            "[contenteditable='true'], .chat-messages, " +
            ".message, .user-message, .assistant-message"
        )) continue;

        nodes.push(node);
    }

    nodes.forEach(node => {
        const updated = replaceBrandText(node.nodeValue);

        if (updated !== node.nodeValue) {
            node.nodeValue = updated;
        }
    });
}

// Update SEO and accessibility attributes
function updateAttributes() {
    const selectors = [
        "meta[name='description']",
        "meta[name='keywords']",
        "meta[name='author']",
        "meta[property='og:title']",
        "meta[property='og:description']",
        "meta[property='og:site_name']",
        "meta[property='og:image:alt']",
        "meta[name='twitter:title']",
        "meta[name='twitter:description']",
        "meta[name='twitter:image:alt']"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(el => {
        const content = el.getAttribute("content");

        if (content) {
            const updated = replaceBrandText(content);

            if (updated !== content) {
                el.setAttribute("content", updated);
            }
        }
    });

    document.querySelectorAll(
        "[alt], [title], [aria-label], [placeholder]"
    ).forEach(el => {
        ["alt", "title", "aria-label", "placeholder"]
            .forEach(attr => {
                if (!el.hasAttribute(attr)) return;

                const current = el.getAttribute(attr);
                const updated = replaceBrandText(current);

                if (updated !== current) {
                    el.setAttribute(attr, updated);
                }
            });
    });
}

// Update structured data ONCE
function updateStructuredData() {
    document.querySelectorAll(
        'script[type="application/ld+json"]'
    ).forEach(script => {
        try {
            const original = script.textContent;
            const data = JSON.parse(original);

            function updateObject(obj) {
                if (Array.isArray(obj)) {
                    obj.forEach(updateObject);
                    return;
                }

                if (!obj || typeof obj !== "object") return;

                Object.keys(obj).forEach(key => {
                    if (
                        typeof obj[key] === "string" &&
                        !["url", "image"].includes(key)
                    ) {
                        obj[key] = replaceBrandText(obj[key]);
                    } else if (
                        obj[key] &&
                        typeof obj[key] === "object"
                    ) {
                        updateObject(obj[key]);
                    }
                });
            }

            updateObject(data);

            const updated = JSON.stringify(data, null, 2);

            if (updated !== original) {
                script.textContent = updated;
            }

        } catch (error) {
            console.warn(
                "YOVIA branding: JSON-LD update failed",
                error
            );
        }
    });
}

// Main branding function
function applyBranding(root = document.body) {
    updateDocumentTitle();
    updateTextNodes(root);
    updateAttributes();
}

// Initial execution
applyBranding();
updateStructuredData();

// Observe dynamically added elements
const brandingObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                applyBranding(node);
            } else if (node.nodeType === Node.TEXT_NODE) {
                const parent = node.parentElement;

                if (
                    parent &&
                    !parent.closest(
                        "script, style, textarea, input, code, pre, " +
                        "[contenteditable='true'], .chat-messages, " +
                        ".message, .user-message, .assistant-message"
                    )
                ) {
                    const updated = replaceBrandText(node.nodeValue);

                    if (updated !== node.nodeValue) {
                        node.nodeValue = updated;
                    }
                }
            }
        });
    });
});

if (document.body) {
    brandingObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

console.log("YOVIA AI Branding System initialized 🚀");
   
