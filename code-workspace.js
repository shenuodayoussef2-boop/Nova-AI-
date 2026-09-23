/* =========================================
   NOVA AI - CODE WORKSPACE
========================================= */

"use strict";


/* =========================================
   DOM
========================================= */

const htmlEditor = document.getElementById("htmlEditor");
const cssEditor = document.getElementById("cssEditor");
const jsEditor = document.getElementById("jsEditor");

const previewFrame = document.getElementById("previewFrame");

const runBtn = document.getElementById("runBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const refreshPreviewBtn =
  document.getElementById("refreshPreviewBtn");

const fullscreenBtn =
  document.getElementById("fullscreenBtn");

const clearConsoleBtn =
  document.getElementById("clearConsoleBtn");

const consoleOutput =
  document.getElementById("consoleOutput");

const statusText =
  document.getElementById("statusText");

const toast =
  document.getElementById("toast");

const htmlLines =
  document.getElementById("htmlLines");

const cssLines =
  document.getElementById("cssLines");

const jsLines =
  document.getElementById("jsLines");


/* =========================================
   DEFAULT PROJECT
========================================= */

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Project</title>
</head>

<body>

  <div class="card">
    <div class="icon">✦</div>

    <h1>أهلاً بك في Nova Code</h1>

    <p>
      اكتب HTML و CSS و JavaScript
      وشوف النتيجة هنا مباشرة.
    </p>

    <button id="helloBtn">
      اضغط هنا
    </button>
  </div>

</body>
</html>`;


const DEFAULT_CSS = `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #0b0d13;
  color: white;

  font-family: Arial, sans-serif;
}

.card {
  width: min(90%, 500px);

  padding: 40px;

  text-align: center;

  border: 1px solid #252b38;
  border-radius: 20px;

  background: #121620;

  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.35);
}

.icon {
  font-size: 40px;

  margin-bottom: 15px;

  color: #8b6cff;
}

h1 {
  margin: 0 0 12px;

  font-size: 28px;
}

p {
  color: #9ca3af;

  line-height: 1.8;
}

button {
  margin-top: 15px;

  padding: 11px 22px;

  border: none;

  border-radius: 9px;

  background: #7c5cff;

  color: white;

  cursor: pointer;

  font-size: 14px;
}

button:hover {
  background: #6848e8;
}`;


const DEFAULT_JS = `const button = document.getElementById("helloBtn");

button.addEventListener("click", () => {
  console.log("Nova Code شغال!");

  button.textContent = "اشتغل 🎉";
});`;


/* =========================================
   STORAGE
========================================= */

const STORAGE_KEY =
  "novaCodeWorkspace";


function loadProject() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {

      htmlEditor.value = DEFAULT_HTML;
      cssEditor.value = DEFAULT_CSS;
      jsEditor.value = DEFAULT_JS;

      return;
    }

    const project =
      JSON.parse(saved);

    htmlEditor.value =
      project.html || DEFAULT_HTML;

    cssEditor.value =
      project.css || DEFAULT_CSS;

    jsEditor.value =
      project.js || DEFAULT_JS;

  } catch (error) {

    console.error(
      "Nova Code Storage Error:",
      error
    );

    htmlEditor.value = DEFAULT_HTML;
    cssEditor.value = DEFAULT_CSS;
    jsEditor.value = DEFAULT_JS;

  }

}


function saveProject() {

  try {

    const project = {

      html: htmlEditor.value,

      css: cssEditor.value,

      js: jsEditor.value,

      updatedAt: Date.now()

    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(project)
    );

  } catch (error) {

    console.error(
      "Nova Code Save Error:",
      error
    );

  }

}


/* =========================================
   STATUS
========================================= */

function setStatus(text) {

  if (statusText) {
    statusText.textContent = text;
  }

}


/* =========================================
   TOAST
========================================= */

let toastTimer = null;


function showToast(message) {

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 2200);

}


/* =========================================
   LINE COUNTER
========================================= */

function countLines(text) {

  return Math.max(
    1,
    text.split("\n").length
  );

}


function updateLineCounters() {

  if (htmlLines) {
    htmlLines.textContent =
      countLines(htmlEditor.value) + " سطر";
  }

  if (cssLines) {
    cssLines.textContent =
      countLines(cssEditor.value) + " سطر";
  }

  if (jsLines) {
    jsLines.textContent =
      countLines(jsEditor.value) + " سطر";
  }

}


/* =========================================
   CONSOLE
========================================= */

function clearConsole() {

  consoleOutput.innerHTML = `
    <div class="console-empty">
      Console جاهز...
    </div>
  `;

}


function addConsoleMessage(
  type,
  message
) {

  if (!consoleOutput) return;

  const empty =
    consoleOutput.querySelector(
      ".console-empty"
    );

  if (empty) {
    empty.remove();
  }

  const line =
    document.createElement("div");

  line.className =
    `console-line ${type}`;

  line.textContent =
    `[${type.toUpperCase()}] ${message}`;

  consoleOutput.appendChild(line);

  consoleOutput.scrollTop =
    consoleOutput.scrollHeight;

}


/* =========================================
   BUILD PROJECT
========================================= */

function buildDocument() {

  const html =
    htmlEditor.value;

  const css =
    cssEditor.value;

  const js =
    jsEditor.value;


  const safeJS =
    js.replace(
      /<\/script/gi,
      "<\\/script"
    );


  return `<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<style>

${css}

</style>

</head>

<body>

${extractBody(html)}

<script>

(function() {

  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  function send(type, args) {

    try {

      window.parent.postMessage({
        source: "nova-code",
        type: type,
        message: args
          .map(function(item) {

            try {

              if (
                typeof item === "object"
              ) {

                return JSON.stringify(
                  item,
                  null,
                  2
                );

              }

              return String(item);

            } catch (error) {

              return String(item);

            }

          })
          .join(" ")

      }, "*");

    } catch (error) {}

  }


  console.log = function() {

    send("log", Array.from(arguments));

    originalLog.apply(
      console,
      arguments
    );

  };


  console.info = function() {

    send("info", Array.from(arguments));

    originalInfo.apply(
      console,
      arguments
    );

  };


  console.warn = function() {

    send("warn", Array.from(arguments));

    originalWarn.apply(
      console,
      arguments
    );

  };


  console.error = function() {

    send("error", Array.from(arguments));

    originalError.apply(
      console,
      arguments
    );

  };


  window.addEventListener(
    "error",
    function(event) {

      send(
        "error",
        [
          event.message ||
          "JavaScript Error"
        ]
      );

    }
  );


  window.addEventListener(
    "unhandledrejection",
    function(event) {

      send(
        "error",
        [
          event.reason ||
          "Unhandled Promise Rejection"
        ]
      );

    }
  );

})();

${safeJS}

<\/script>

</body>

</html>`;
}


/* =========================================
   EXTRACT BODY
========================================= */

function extractBody(html) {

  const bodyMatch =
    html.match(
      /<body[^>]*>([\\s\\S]*?)<\\/body>/i
    );

  if (bodyMatch) {

    return bodyMatch[1];

  }

  return html;

}


/* =========================================
   RUN
========================================= */

function runCode() {

  clearConsole();

  setStatus("جاري التشغيل...");

  saveProject();

  const documentCode =
    buildDocument();


  previewFrame.srcdoc =
    documentCode;


  setTimeout(() => {

    setStatus("يعمل الآن");

  }, 300);

}


/* =========================================
   COPY
========================================= */

async function copyCode() {

  const combinedCode =
`${htmlEditor.value}

/* ================= CSS ================= */

${cssEditor.value}

/* ================= JS ================= */

${jsEditor.value}`;


  try {

    await navigator.clipboard.writeText(
      combinedCode
    );

    showToast(
      "تم نسخ المشروع بالكامل 📋"
    );

  } catch (error) {

    fallbackCopy(combinedCode);

  }

}


function fallbackCopy(text) {

  const textarea =
    document.createElement("textarea");

  textarea.value = text;

  textarea.style.position =
    "fixed";

  textarea.style.opacity =
    "0";

  document.body.appendChild(
    textarea
  );

  textarea.select();

  try {

    document.execCommand("copy");

    showToast(
      "تم نسخ المشروع 📋"
    );

  } catch (error) {

    showToast(
      "تعذر نسخ المشروع"
    );

  }

  textarea.remove();

}


/* =========================================
   DOWNLOAD
========================================= */

function downloadProject() {

  saveProject();

  const html =
    htmlEditor.value;

  const css =
    cssEditor.value;

  const js =
    jsEditor.value;


  const finalHTML =
`<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>Nova Project</title>

<style>

${css}

</style>

</head>

<body>

${extractBody(html)}

<script>

${js}

<\/script>

</body>

</html>`;


  const blob =
    new Blob(
      [finalHTML],
      {
        type:
          "text/html;charset=utf-8"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "nova-project.html";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);


  showToast(
    "تم تنزيل المشروع 💾"
  );

}


/* =========================================
   CLEAR
========================================= */

function clearProject() {

  const confirmed =
    confirm(
      "هل أنت متأكد من مسح المشروع الحالي؟"
    );

  if (!confirmed) return;


  htmlEditor.value = "";

  cssEditor.value = "";

  jsEditor.value = "";


  clearConsole();

  updateLineCounters();

  saveProject();

  previewFrame.srcdoc = "";


  setStatus("تم المسح");

  showToast(
    "تم مسح المشروع"
  );

}


/* =========================================
   FULLSCREEN
========================================= */

function toggleFullscreen() {

  const element =
    document.querySelector(
      ".preview-panel"
    );


  if (!document.fullscreenElement) {

    if (
      element &&
      element.requestFullscreen
    ) {

      element.requestFullscreen();

    }

  } else {

    document.exitFullscreen();

  }

}


/* =========================================
   KEYBOARD
========================================= */

function setupEditorKeyboard(
  editor
) {

  editor.addEventListener(
    "keydown",
    function(event) {

      /*
       * Tab
       */

      if (event.key === "Tab") {

        event.preventDefault();

        const start =
          editor.selectionStart;

        const end =
          editor.selectionEnd;


        editor.value =
          editor.value.substring(
            0,
            start
          ) +
          "  " +
          editor.value.substring(
            end
          );


        editor.selectionStart =
          start + 2;

        editor.selectionEnd =
          start + 2;


        updateLineCounters();

        saveProject();

      }


      /*
       * Ctrl + Enter
       * تشغيل
       */

      if (
        event.ctrlKey &&
        event.key === "Enter"
      ) {

        event.preventDefault();

        runCode();

      }

    }
  );


  editor.addEventListener(
    "input",
    function() {

      updateLineCounters();

      saveProject();

    }
  );

}


/* =========================================
   MESSAGE FROM PREVIEW
========================================= */

window.addEventListener(
  "message",
  function(event) {

    const data =
      event.data;


    if (
      !data ||
      data.source !== "nova-code"
    ) {
      return;
    }


    addConsoleMessage(
      data.type || "log",
      data.message || ""
    );

  }
);


/* =========================================
   EVENTS
========================================= */

if (runBtn) {

  runBtn.addEventListener(
    "click",
    runCode
  );

}


if (refreshPreviewBtn) {

  refreshPreviewBtn.addEventListener(
    "click",
    runCode
  );

}


if (clearBtn) {

  clearBtn.addEventListener(
    "click",
    clearProject
  );

}


if (copyBtn) {

  copyBtn.addEventListener(
    "click",
    copyCode
  );

}


if (downloadBtn) {

  downloadBtn.addEventListener(
    "click",
    downloadProject
  );

}


if (clearConsoleBtn) {

  clearConsoleBtn.addEventListener(
    "click",
    clearConsole
  );

}


if (fullscreenBtn) {

  fullscreenBtn.addEventListener(
    "click",
    toggleFullscreen
  );

}


/* =========================================
   INITIALIZE
========================================= */

function initializeWorkspace() {

  loadProject();

  updateLineCounters();

  setupEditorKeyboard(
    htmlEditor
  );

  setupEditorKeyboard(
    cssEditor
  );

  setupEditorKeyboard(
    jsEditor
  );


  clearConsole();

  runCode();

}


initializeWorkspace();
