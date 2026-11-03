
(() => {
    const style = document.createElement("style");

    style.textContent = `
        .password-toggle-wrap {
            position: relative !important;
        }

        .password-toggle {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            border: 0;
            background: transparent;
            color: #8295a5;
            cursor: pointer;
            padding: 7px;
            font-size: 16px;
            z-index: 5;
            transition: color .2s;
        }

        .password-toggle:hover {
            color: #00d9ff;
        }

        .password-toggle-wrap input[type="password"],
        .password-toggle-wrap input[type="text"] {
            padding-left: 45px !important;
        }
    `;

    document.head.appendChild(style);

    function addToggle(input) {
        if (
            input.dataset.toggleReady ||
            input.type !== "password" ||
            input.disabled ||
            input.dataset.noToggle !== undefined
        ) return;

        let wrapper = input.closest(".input-wrap");

        if (!wrapper) {
            wrapper = document.createElement("div");
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }

        wrapper.classList.add("password-toggle-wrap");

        const button = document.createElement("button");

        button.type = "button";
        button.className = "password-toggle";
        button.innerHTML = '<i class="fa-regular fa-eye"></i>';
        button.title = "إظهار كلمة المرور";
        button.setAttribute("aria-label", "إظهار كلمة المرور");

        button.addEventListener("click", () => {
            const visible = input.type === "password";

            input.type = visible ? "text" : "password";

            button.innerHTML = visible
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';

            button.title = visible
                ? "إخفاء كلمة المرور"
                : "إظهار كلمة المرور";

            button.setAttribute(
                "aria-label",
                button.title
            );

            input.focus();
        });

        wrapper.appendChild(button);
        input.dataset.toggleReady = "true";
    }

    function scan() {
        document
            .querySelectorAll('input[type="password"]')
            .forEach(addToggle);
    }

    scan();

    // دعم حقول كلمة المرور التي تظهر لاحقًا
    const observer = new MutationObserver(scan);

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
