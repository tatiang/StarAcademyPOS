/* File: js/app_test_ChatGPT.js
   Rising Star Cafe POS (TEST_ChatGPT)
   Version: v1.68
*/

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* -----------------------------
   Config
------------------------------ */

const APP_NAME = "Rising Star Cafe POS";
const VERSION = "v1.68";
const BUILD = "TEST_ChatGPT";

// Where you store the canonical store doc
const STORE_DOC_PATH = { collection: "stores", docId: "classroom_cafe_main" };

// TEMP (replace later with Firestore-stored PINs or Firebase Auth)
const ADMIN_PINS = {
  manager: "1234",
  it: "9753",
};

// Where we store a lightweight session auth
const SESSION_KEYS = {
  role: "rsc_role",
  employeeName: "rsc_employee_name",
  employeeId: "rsc_employee_id",
};

/* -----------------------------
   Utilities
------------------------------ */

function $(id) { return document.getElementById(id); }

function safeAlert(msg) {
  try { alert(msg); } catch (e) { console.log(msg); }
}

function setConnectionStatus(text) {
  const el = $("connectionStatus");
  if (el) el.textContent = text;
}

function setVersionLabels() {
  const v = `${VERSION} (${BUILD})`;
  const versionLabel = $("versionLabel");
  if (versionLabel) versionLabel.textContent = v;

  const footerBuild = $("footerBuild");
  if (footerBuild) footerBuild.textContent = `${APP_NAME} — ${v}`;
}

function ensureHttpsHint() {
  if (location.protocol === "file:") {
    const hint = $("hostingHint");
    if (hint) hint.hidden = false;
  }
}

/* -----------------------------
   Firestore: load employees
   Expected structure (you showed):
   stores/classroom_cafe_main
     employees: {
       "0": {id, name, role, img},
       "1": {...}
     }
   OR employees: [ {..}, {..} ]
------------------------------ */

function normalizeEmployees(employeesField) {
  if (!employeesField) return [];

  // If it's already an array
  if (Array.isArray(employeesField)) {
    return employeesField
      .filter(e => e && e.name)
      .map(e => ({
        id: e.id ?? null,
        name: String(e.name),
        role: e.role ?? "",
        img: e.img ?? "images/placeholder.png",
      }));
  }

  // If it's an object keyed by numbers/strings
  if (typeof employeesField === "object") {
    return Object.values(employeesField)
      .filter(e => e && e.name)
      .map(e => ({
        id: e.id ?? null,
        name: String(e.name),
        role: e.role ?? "",
        img: e.img ?? "images/placeholder.png",
      }));
  }

  return [];
}

async function fetchEmployeesFromFirestore() {
  const fb = window.RSC_FIREBASE;
  if (!fb?.db) {
    return { ok: false, employees: [], error: "Firestore db not available (RSC_FIREBASE.db missing)." };
  }

  try {
    const ref = doc(fb.db, STORE_DOC_PATH.collection, STORE_DOC_PATH.docId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ok: false, employees: [], error: "Store doc not found in Firestore." };
    }

    const data = snap.data() || {};
    const employees = normalizeEmployees(data.employees);

    // Filter out admin-ish roles from the “employee tiles”
    // You can tune this list as you like.
    const filtered = employees.filter(e => {
      const r = (e.role || "").toLowerCase();
      return !["manager", "it", "it support", "it admin", "admin"].includes(r);
    });

    return { ok: true, employees: filtered, raw: employees, error: null };
  } catch (err) {
    return { ok: false, employees: [], error: String(err) };
  }
}

/* -----------------------------
   Login UI: render employee tiles
   Works even if your HTML doesn’t have a container:
   it will create one and insert it below the kiosk button.
------------------------------ */

function getOrCreateEmployeeContainer() {
  // If you later add a real container, this will use it:
  let c = $("employeeLoginGrid");
  if (c) return c;

  // Otherwise create a simple grid under the kiosk button
  const kioskBtn = $("btnKiosk");
  if (!kioskBtn) return null;

  c = document.createElement("div");
  c.id = "employeeLoginGrid";
  c.style.marginTop = "18px";

  const title = document.createElement("div");
  title.textContent = "EMPLOYEES";
  title.style.opacity = "0.7";
  title.style.letterSpacing = "0.14em";
  title.style.fontWeight = "700";
  title.style.fontSize = "12px";
  title.style.margin = "14px 0 10px 0";
  c.appendChild(title);

  const grid = document.createElement("div");
  grid.id = "employeeLoginGridInner";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(120px, 1fr))";
  grid.style.gap = "10px";
  c.appendChild(grid);

  kioskBtn.insertAdjacentElement("afterend", c);
  return c;
}

function renderEmployeeTiles(employees) {
  const container = getOrCreateEmployeeContainer();
  if (!container) return;

  const grid = $("employeeLoginGridInner");
  const target = grid || container;

  target.innerHTML = "";

  if (!employees.length) {
    const empty = document.createElement("div");
    empty.style.opacity = "0.75";
    empty.style.fontSize = "14px";
    empty.textContent = "No employees found in Firestore.";
    target.appendChild(empty);
    return;
  }

  for (const e of employees) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost";
    btn.style.display = "flex";
    btn.style.flexDirection = "column";
    btn.style.alignItems = "center";
    btn.style.gap = "8px";
    btn.style.padding = "14px";

    const img = document.createElement("img");
    img.src = e.img || "images/placeholder.png";
    img.alt = e.name;
    img.style.width = "56px";
    img.style.height = "56px";
    img.style.borderRadius = "50%";
    img.style.objectFit = "cover";
    img.onerror = () => { img.src = "images/placeholder.png"; };

    const name = document.createElement("div");
    name.textContent = e.name;
    name.style.fontWeight = "700";

    btn.appendChild(img);
    btn.appendChild(name);

    btn.addEventListener("click", () => {
      // “Employee login” (no pin) — store session and route into app
      sessionStorage.setItem(SESSION_KEYS.employeeName, e.name);
      if (e.id != null) sessionStorage.setItem(SESSION_KEYS.employeeId, String(e.id));
      sessionStorage.setItem(SESSION_KEYS.role, "employee");
      safeAlert(`Logged in as: ${e.name}\nRole: employee\n${VERSION} (${BUILD})\n\nNext: route into full POS view.`);
      // TODO: route into full app view when your full POS UI exists in this build.
      // e.g. window.location.href = "index.html#pos";
    });

    target.appendChild(btn);
  }
}

/* -----------------------------
   PIN Modal (created dynamically)
   Fixes: “PIN modal not found in HTML (modal-pin)”
------------------------------ */

function ensurePinModalExists() {
  if ($("modal-pin")) return;

  // Backdrop/modal container
  const modal = document.createElement("div");
  modal.id = "modal-pin";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.display = "none";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.zIndex = "9999";

  // Panel
  const panel = document.createElement("div");
  panel.style.width = "min(420px, 92vw)";
  panel.style.background = "white";
  panel.style.borderRadius = "16px";
  panel.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)";
  panel.style.padding = "18px";

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div style="font-weight:800; font-size:18px;">Enter PIN</div>
      <button id="pinClose" type="button" class="btn btn-ghost" style="padding:8px 10px;">✕</button>
    </div>

    <div id="pinRoleLabel" style="margin-top:6px; opacity:0.7; font-size:13px;"></div>

    <div style="margin-top:14px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div id="pin-display" style="flex:1; font-size:22px; letter-spacing:0.25em; font-weight:800; padding:12px 14px; border:1px solid #ddd; border-radius:12px; min-height:52px;"></div>
      <button id="pinClear" type="button" class="btn btn-ghost" style="padding:12px 14px;">Clear</button>
    </div>

    <div id="pin-error" style="margin-top:10px; min-height:18px; color:#b00020; font-weight:700;"></div>

    <div style="margin-top:10px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pinKey btn btn-primary" data-n="${n}" type="button" style="padding:16px 0;">${n}</button>`).join("")}
      <button class="pinKey btn btn-ghost" data-n="0" type="button" style="grid-column:2; padding:16px 0;">0</button>
    </div>

    <div style="margin-top:14px; display:flex; gap:10px;">
      <button id="pinCancel" type="button" class="btn btn-ghost" style="flex:1; padding:14px;">Cancel</button>
      <button id="pinSubmit" type="button" class="btn btn-primary" style="flex:1; padding:14px;">Submit</button>
    </div>
  `;

  modal.appendChild(panel);
  document.body.appendChild(modal);

  // Wire buttons
  $("pinClose").addEventListener("click", () => hidePinModal());
  $("pinCancel").addEventListener("click", () => hidePinModal());
  $("pinClear").addEventListener("click", () => pinClear());

  panel.querySelectorAll(".pinKey").forEach(btn => {
    btn.addEventListener("click", () => {
      const n = btn.getAttribute("data-n");
      pinInput(n);
    });
  });

  $("pinSubmit").addEventListener("click", () => pinSubmit());
}

let pinBuffer = "";
let pinResolve = null;
let currentPinRole = "";

function showPinModal(roleLabelText) {
  ensurePinModalExists();
  pinBuffer = "";
  currentPinRole = roleLabelText || "";
  $("pin-display").textContent = "";
  $("pin-error").textContent = "";
  $("pinRoleLabel").textContent = roleLabelText ? `Access: ${roleLabelText}` : "";

  const modal = $("modal-pin");
  modal.style.display = "flex";
}

function hidePinModal() {
  const modal = $("modal-pin");
  if (modal) modal.style.display = "none";
  pinResolve = null;
  pinBuffer = "";
}

function pinInput(n) {
  pinBuffer += String(n);
  $("pin-display").textContent = "*".repeat(pinBuffer.length);
}

function pinClear() {
  pinBuffer = "";
  $("pin-display").textContent = "";
  $("pin-error").textContent = "";
}

function pinSubmit() {
  const p = pinBuffer;
  hidePinModal();
  if (typeof pinResolve === "function") pinResolve(p);
}

function requestPin(roleLabel) {
  return new Promise((resolve) => {
    pinResolve = resolve;
    showPinModal(roleLabel);
  });
}

/* -----------------------------
   Admin login flow + routing stubs
------------------------------ */

async function adminLogin(role /* "manager" | "it" */) {
  const roleUpper = role.toUpperCase();

  // If modal exists, use it; otherwise (shouldn’t happen) fallback to prompt
  let entered = "";
  try {
    entered = await requestPin(roleUpper);
  } catch (e) {
    entered = prompt(`${roleUpper} PIN:`) || "";
  }

  const expected = ADMIN_PINS[role];
  if (!expected) {
    safeAlert(`No PIN configured for role: ${roleUpper}`);
    return;
  }
  if (entered !== expected) {
    safeAlert("Incorrect PIN");
    return;
  }

  sessionStorage.setItem(SESSION_KEYS.role, role);
  safeAlert(`Login: ${roleUpper}\nCloud OK\n${VERSION} (${BUILD})\n\nNext: route into ${roleUpper} hub.`);

  // TODO: When your full app is in this build, replace with real navigation:
  // window.location.href = `index.html#${role}`;
}

/* -----------------------------
   Boot / wire UI
------------------------------ */

function wireButtons() {
  const btnKiosk = $("btnKiosk");
  const btnManager = $("btnManager");
  const btnIT = $("btnIT");

  if (btnKiosk) {
    btnKiosk.addEventListener("click", () => {
      sessionStorage.setItem(SESSION_KEYS.role, "kiosk");
      safeAlert(`Entering Kiosk (TEST)\n${VERSION} (${BUILD})`);
      // TODO: route into kiosk UI when included in this build
      // window.location.href = "index.html#kiosk";
    });
  }

  if (btnManager) btnManager.addEventListener("click", () => adminLogin("manager"));
  if (btnIT) btnIT.addEventListener("click", () => adminLogin("it"));
}

async function boot() {
  setVersionLabels();
  ensureHttpsHint();
  ensurePinModalExists(); // prevents your “modal-pin not found” error

  // Cloud status already set by firestore_test_ChatGPT.js, but keep safe fallback:
  const fb = window.RSC_FIREBASE;
  if (location.protocol === "file:") {
    setConnectionStatus("Offline (opened via file://)");
  } else if (fb?.connected) {
    setConnectionStatus("Connected to cloud");
  } else {
    setConnectionStatus("Cloud not connected");
  }

  wireButtons();

  // Load employees from Firestore and render on login screen
  const res = await fetchEmployeesFromFirestore();
  if (!res.ok) {
    console.warn("[RSC POS] Employee load failed:", res.error);
    // Don’t block; just show empty state
    renderEmployeeTiles([]);
    return;
  }

  renderEmployeeTiles(res.employees);
  console.log("[RSC POS] Employees loaded:", res.employees);
  console.log("[RSC POS] App loaded", { appName: APP_NAME, version: VERSION, build: BUILD });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
