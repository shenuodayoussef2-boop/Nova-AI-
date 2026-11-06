
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

// Replace brand names in visible text
function replaceBrandText(value) {
    return value
        .replace(/\bNova\s+AI\b/gi, BRAND.name)
        .replace(/\bNova\b/gi, BRAND.shortName);
}

// Update document title
document.title = replaceBrandText(document.title);

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

        if (parent.closest(
            "script, style, textarea, input, code, pre"
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
        "meta[name='twitter:image:alt']",
        "title"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(el => {
        if (el.hasAttribute("content")) {
            el.setAttribute(
                "content",
                replaceBrandText(el.getAttribute("content"))
            );
        } else {
            el.textContent = replaceBrandText(el.textContent);
        }
    });

    document.querySelectorAll(
        "[alt], [title], [aria-label], [placeholder]"
    ).forEach(el => {
        ["alt", "title", "aria-label", "placeholder"]
            .forEach(attr => {
                if (el.hasAttribute(attr)) {
                    el.setAttribute(
                        attr,
                        replaceBrandText(el.getAttribute(attr))
                    );
                }
            });
    });
}

// Update structured data without changing URLs
function updateStructuredData() {
    document.querySelectorAll(
        'script[type="application/ld+json"]'
    ).forEach(script => {
        try {
            const data = JSON.parse(script.textContent);

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
                    } else if (typeof obj[key] === "object") {
                        updateObject(obj[key]);
                    }
                });
            }

            updateObject(data);
            script.textContent = JSON.stringify(data, null, 2);

        } catch (error) {
            console.warn("YOVIA branding: JSON-LD update failed", error);
        }
    });
}

// Run branding system
function applyBranding() {
    document.title = replaceBrandText(document.title);
    updateTextNodes();
    updateAttributes();
    updateStructuredData();
}

applyBranding();

// Support dynamically created elements
const brandingObserver = new MutationObserver(() => {
    applyBranding();
});

brandingObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
});

console.log("YOVIA AI Branding System initialized 🚀");
      
