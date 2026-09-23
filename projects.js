/* =========================================
   NOVA AI - PROJECTS SYSTEM
========================================= */

"use strict";


/* =========================================
   STORAGE
========================================= */

const PROJECTS_KEY =
  "novaProjects";


let projects = [];

let editingProjectId = null;


/* =========================================
   DOM
========================================= */

const projectsGrid =
  document.getElementById(
    "projectsGrid"
  );

const emptyState =
  document.getElementById(
    "emptyState"
  );

const projectCount =
  document.getElementById(
    "projectCount"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );


const newProjectBtn =
  document.getElementById(
    "newProjectBtn"
  );

const emptyCreateBtn =
  document.getElementById(
    "emptyCreateBtn"
  );


const projectModal =
  document.getElementById(
    "projectModal"
  );

const closeModalBtn =
  document.getElementById(
    "closeModalBtn"
  );

const cancelProjectBtn =
  document.getElementById(
    "cancelProjectBtn"
  );

const createProjectBtn =
  document.getElementById(
    "createProjectBtn"
  );


const projectNameInput =
  document.getElementById(
    "projectNameInput"
  );

const projectDescriptionInput =
  document.getElementById(
    "projectDescriptionInput"
  );


const renameModal =
  document.getElementById(
    "renameModal"
  );

const renameInput =
  document.getElementById(
    "renameInput"
  );

const closeRenameBtn =
  document.getElementById(
    "closeRenameBtn"
  );

const cancelRenameBtn =
  document.getElementById(
    "cancelRenameBtn"
  );

const saveRenameBtn =
  document.getElementById(
    "saveRenameBtn"
  );


const toast =
  document.getElementById(
    "toast"
  );


/* =========================================
   LOAD
========================================= */

function loadProjects() {

  try {

    const saved =
      localStorage.getItem(
        PROJECTS_KEY
      );

    if (!saved) {

      projects = [];

      return;

    }


    const parsed =
      JSON.parse(saved);


    projects =
      Array.isArray(parsed)
        ? parsed
        : [];


  } catch (error) {

    console.error(
      "Nova Projects Load Error:",
      error
    );

    projects = [];

  }

}


/* =========================================
   SAVE
========================================= */

function saveProjects() {

  try {

    localStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify(projects)
    );

  } catch (error) {

    console.error(
      "Nova Projects Save Error:",
      error
    );

    showToast(
      "تعذر حفظ المشاريع"
    );

  }

}


/* =========================================
   ID
========================================= */

function createProjectId() {

  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );

}


/* =========================================
   DATE
========================================= */

function formatDate(timestamp) {

  if (!timestamp) {
    return "غير معروف";
  }


  try {

    return new Intl.DateTimeFormat(
      "ar-EG",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    ).format(
      new Date(timestamp)
    );

  } catch {

    return "غير معروف";

  }

}


/* =========================================
   ESCAPE
========================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================
   RENDER
========================================= */

function renderProjects() {

  const query =
    searchInput
      ? searchInput.value
          .trim()
          .toLowerCase()
      : "";


  let visibleProjects =
    projects.filter(
      project => {

        if (!query) {
          return true;
        }

        return (
          project.name
            .toLowerCase()
            .includes(query) ||

          (project.description || "")
            .toLowerCase()
            .includes(query)
        );

      }
    );


  visibleProjects.sort(
    (a, b) => {

      if (
        Boolean(b.pinned) !==
        Boolean(a.pinned)
      ) {

        return (
          Number(b.pinned) -
          Number(a.pinned)
        );

      }

      return (
        (b.updatedAt || b.createdAt) -
        (a.updatedAt || a.createdAt)
      );

    }
  );


  projectCount.textContent =
    projects.length;


  projectsGrid.innerHTML = "";


  if (
    visibleProjects.length === 0
  ) {

    projectsGrid.hidden = true;

    emptyState.hidden = false;


    if (projects.length > 0) {

      emptyState.querySelector("h3")
        .textContent =
        "مفيش نتائج";

      emptyState.querySelector("p")
        .textContent =
        "جرب تبحث باسم مشروع مختلف.";

      emptyState.querySelector("button")
        .style.display =
        "none";

    } else {

      emptyState.querySelector("h3")
        .textContent =
        "لسه مفيش مشاريع";

      emptyState.querySelector("p")
        .textContent =
        "أنشئ أول مشروع وابدأ البرمجة.";

      emptyState.querySelector("button")
        .style.display =
        "";

    }


    return;

  }


  projectsGrid.hidden = false;

  emptyState.hidden = true;


  visibleProjects.forEach(
    project => {

      projectsGrid.appendChild(
        createProjectCard(project)
      );

    }
  );

}


/* =========================================
   CARD
========================================= */

function createProjectCard(project) {

  const card =
    document.createElement("article");


  card.className =
    "project-card" +
    (
      project.pinned
        ? " pinned"
        : ""
    );


  card.innerHTML = `

    ${
      project.pinned
        ? `<div class="pin-badge">📌</div>`
        : ""
    }

    <div class="project-icon">
      💻
    </div>

    <h3>
      ${escapeHtml(project.name)}
    </h3>

    <p class="project-description">
      ${
        escapeHtml(
          project.description ||
          "مشروع برمجي جديد"
        )
      }
    </p>

    <div class="project-meta">

      <span>
        آخر تعديل:
        ${formatDate(
          project.updatedAt ||
          project.createdAt
        )}
      </span>

      <span>
        HTML · CSS · JS
      </span>

    </div>


    <div class="project-actions">

      <button
        class="open-btn"
        data-action="open"
      >
        ▶ فتح
      </button>

      <button
        data-action="pin"
      >
        ${
          project.pinned
            ? "إلغاء التثبيت"
            : "📌 تثبيت"
        }
      </button>

      <button
        data-action="rename"
      >
        ✏️
      </button>

      <button
        class="delete-btn"
        data-action="delete"
      >
        🗑️
      </button>

    </div>

  `;


  card
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          const action =
            button.dataset.action;

          handleProjectAction(
            action,
            project.id
          );

        }
      );

    });


  return card;

}


/* =========================================
   ACTIONS
========================================= */

function handleProjectAction(
  action,
  id
) {

  const project =
    projects.find(
      item => item.id === id
    );


  if (!project) {
    return;
  }


  if (action === "open") {

    openProject(project);

    return;

  }


  if (action === "pin") {

    project.pinned =
      !project.pinned;

    project.updatedAt =
      Date.now();

    saveProjects();

    renderProjects();

    showToast(
      project.pinned
        ? "تم تثبيت المشروع 📌"
        : "تم إلغاء تثبيت المشروع"
    );

    return;

  }


  if (action === "rename") {

    openRenameModal(project);

    return;

  }


  if (action === "delete") {

    deleteProject(project);

    return;

  }

}


/* =========================================
   OPEN PROJECT
========================================= */

function openProject(project) {

  /*
   * نمرر ID المشروع للـWorkspace
   */

  const url =
    "code-workspace.html?project=" +
    encodeURIComponent(
      project.id
    );


  window.location.href =
    url;

}


/* =========================================
   CREATE
========================================= */

function openCreateModal() {

  projectNameInput.value = "";

  projectDescriptionInput.value = "";

  projectModal.hidden = false;

  setTimeout(
    () => {
      projectNameInput.focus();
    },
    50
  );

}


function closeCreateModal() {

  projectModal.hidden = true;

}


function createProject() {

  const name =
    projectNameInput.value
      .trim();


  const description =
    projectDescriptionInput.value
      .trim();


  if (!name) {

    showToast(
      "اكتب اسم المشروع الأول"
    );

    projectNameInput.focus();

    return;

  }


  const now =
    Date.now();


  const project = {

    id:
      createProjectId(),

    name,

    description,

    pinned: false,

    createdAt:
      now,

    updatedAt:
      now

  };


  projects.unshift(
    project
  );


  saveProjects();

  renderProjects();

  closeCreateModal();


  showToast(
    "تم إنشاء المشروع 🎉"
  );


  /*
   * افتح المشروع مباشرة
   */

  setTimeout(
    () => {

      openProject(project);

    },
    350
  );

}


/* =========================================
   RENAME
========================================= */

function openRenameModal(project) {

  editingProjectId =
    project.id;


  renameInput.value =
    project.name;


  renameModal.hidden = false;


  setTimeout(
    () => {

      renameInput.focus();

      renameInput.select();

    },
    50
  );

}


function closeRenameModal() {

  editingProjectId =
    null;

  renameModal.hidden = true;

}


function saveRename() {

  if (!editingProjectId) {
    return;
  }


  const name =
    renameInput.value
      .trim();


  if (!name) {

    showToast(
      "اكتب الاسم الجديد"
    );

    return;

  }


  const project =
    projects.find(
      item =>
        item.id ===
        editingProjectId
    );


  if (!project) {

    closeRenameModal();

    return;

  }


  project.name =
    name;

  project.updatedAt =
    Date.now();


  saveProjects();

  renderProjects();

  closeRenameModal();


  showToast(
    "تم تغيير اسم المشروع ✏️"
  );

}


/* =========================================
   DELETE
========================================= */

function deleteProject(project) {

  const confirmed =
    confirm(
      `هل أنت متأكد من حذف مشروع "${project.name}"؟`
    );


  if (!confirmed) {
    return;
  }


  projects =
    projects.filter(
      item =>
        item.id !==
        project.id
    );


  /*
   * حذف بيانات المشروع من Workspace
   */

  localStorage.removeItem(
    "novaCodeProject_" +
    project.id
  );


  saveProjects();

  renderProjects();


  showToast(
    "تم حذف المشروع 🗑️"
  );

}


/* =========================================
   TOAST
========================================= */

let toastTimer = null;


function showToast(message) {

  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


/* =========================================
   EVENTS
========================================= */

newProjectBtn.addEventListener(
  "click",
  openCreateModal
);


emptyCreateBtn.addEventListener(
  "click",
  openCreateModal
);


closeModalBtn.addEventListener(
  "click",
  closeCreateModal
);


cancelProjectBtn.addEventListener(
  "click",
  closeCreateModal
);


createProjectBtn.addEventListener(
  "click",
  createProject
);


closeRenameBtn.addEventListener(
  "click",
  closeRenameModal
);


cancelRenameBtn.addEventListener(
  "click",
  closeRenameModal
);


saveRenameBtn.addEventListener(
  "click",
  saveRename
);


searchInput.addEventListener(
  "input",
  renderProjects
);


/* =========================
   ENTER
========================= */

projectNameInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      event.preventDefault();

      createProject();

    }

  }
);


renameInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      event.preventDefault();

      saveRename();

    }

  }
);


/* =========================
   ESC
========================= */

document.addEventListener(
  "keydown",
  event => {

    if (event.key !== "Escape") {
      return;
    }


    if (!projectModal.hidden) {

      closeCreateModal();

    }


    if (!renameModal.hidden) {

      closeRenameModal();

    }

  }
);


/* =========================
   MODAL CLICK
========================= */

projectModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      projectModal
    ) {

      closeCreateModal();

    }

  }
);


renameModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      renameModal
    ) {

      closeRenameModal();

    }

  }
);


/* =========================================
   INIT
========================================= */

loadProjects();

renderProjects();
