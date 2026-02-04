/* File: js/login_screen_test_Gemini.js
   PURPOSE: Login Logic + Improved UI (search, scroll, 2-column on desktop)
*/

window.app.loginScreen = {
  targetRole: "",

  init: function () {
    console.log("Login Screen Initializing...");

    // Locate the container
    let container =
      document.querySelector(".login-box") ||
      document.querySelector(".login-card-body");

    // If we can't find the specific box, find the overlay and create the box inside it
    if (!container) {
      const overlay = document.getElementById("login-overlay");
      if (overlay) {
        // Clear overlay but KEEP the logo image if it exists
        const img = overlay.querySelector("img");
        const logoArea = overlay.querySelector(".logo-area");

        overlay.innerHTML = "";

        // Rebuild minimal overlay structure
        if (logoArea) overlay.appendChild(logoArea);
        else if (img) overlay.appendChild(img);
        else if (img) overlay.appendChild(img);

        container = document.createElement("div");
        container.className = "login-box";
        overlay.appendChild(container);
      }
    }

    if (container) {
      this.renderInterface(container);
    } else {
      console.warn("Login container not found.");
    }
  },

  renderInterface: function (container) {
    container.innerHTML = "";

    const versionLabel = window.app?.version ? window.app.version : "";
    const lastMod =
      window.app?.lastModified ||
      (() => {
        const raw = document.lastModified;
        const date = raw ? new Date(raw) : null;
        if (date && !isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
        return "Unknown";
      })();

    const lastModDate = (() => {
      const date = lastMod ? new Date(lastMod) : null;
      if (date && !isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      return lastMod;
    })();

    const statusLabel = `${versionLabel ? versionLabel + " • " : ""}Updated: ${lastModDate}`;

    // Title
    const title = document.createElement("h2");
    title.innerText = "System Login";
    container.appendChild(title);

    // Status row
    const statusRow = document.createElement("div");
    statusRow.className = "login-status-row";
    statusRow.innerHTML = `
      <span class="dot"></span>
      <span style="color: var(--success); font-weight:800;">Ready</span>
      <span class="muted">${statusLabel}</span>
    `;
    container.appendChild(statusRow);

    // Kiosk Mode
    const kioskBtn = document.createElement("button");
    kioskBtn.className = "btn-kiosk";
    kioskBtn.type = "button";
    kioskBtn.innerHTML =
      '<i class="fa-solid fa-tablet-screen-button"></i> Customer Kiosk Mode';
    kioskBtn.onclick = () => this.startKioskMode();
    container.appendChild(kioskBtn);

    // Cashier header
    const staffHeader = document.createElement("div");
    staffHeader.className = "admin-divider";
    staffHeader.innerHTML = "<span>Select Cashier</span>";
    container.appendChild(staffHeader);

    // Employee list wrapper (scrollable, 2-column on desktop via CSS)
    const listWrap = document.createElement("div");
    listWrap.className = "employee-list";
    container.appendChild(listWrap);

    // Get employees from Firestore-merged app data
    const employees = Array.isArray(window.app?.data?.employees)
      ? window.app.data.employees
      : [];

    // Render function with filtering + sorting
    const renderEmployees = () => {
      listWrap.innerHTML = "";

      const sorted = employees
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      if (!sorted.length) {
        const msg = document.createElement("div");
        msg.style.cssText =
          "color:#999; text-align:center; padding:14px 0; grid-column: 1 / -1;";
        msg.innerText = "Loading cashiers…";
        listWrap.appendChild(msg);
        return;
      }

      sorted.forEach((emp) => {
        const btn = document.createElement("button");
        btn.className = "btn-employee";
        btn.type = "button";
        btn.innerHTML = `<i class="fa-solid fa-user"></i> ${emp.name}`;
        btn.onclick = () => this.completeLogin(emp.name);
        listWrap.appendChild(btn);
      });
    };

    renderEmployees();

    // Admin section
    const adminHeader = document.createElement("div");
    adminHeader.className = "admin-divider";
    adminHeader.innerHTML = "<span>Administration</span>";
    container.appendChild(adminHeader);

    const adminRow = document.createElement("div");
    adminRow.className = "admin-row";
    adminRow.innerHTML = `
      <button class="btn-admin" type="button" onclick="window.app.loginScreen.promptPin('Manager')">
        <i class="fa-solid fa-lock"></i> Manager
      </button>
      <button class="btn-admin" type="button" onclick="window.app.loginScreen.promptPin('IT Support')">
        <i class="fa-solid fa-tools"></i> IT Support
      </button>
    `;
    container.appendChild(adminRow);

    // Forgot PIN link
    const forgot = document.createElement("a");
    forgot.className = "forgot-link";
    forgot.href = "#";
    forgot.innerText = "Forgot PIN?";
    forgot.onclick = (e) => {
      e.preventDefault();
      this.showForgotPin();
    };
    container.appendChild(forgot);
  },

  // --- LOGIC ---
  promptPin: function (role) {
    this.targetRole = role;
    const modal = document.getElementById("modal-pin");
    const content = modal.querySelector(".modal-content");

    content.innerHTML = `
      <h3 style="text-align:center; margin-top:0;">${role} Access</h3>
      <div style="background:#f0f0f0; padding:15px; border-radius:8px; margin-bottom:15px; text-align:center;">
        <input type="password" id="pin-input" readonly
          style="background:transparent; border:none; font-size:2rem; letter-spacing:10px; width:100%; text-align:center; outline:none;">
      </div>
      <div id="pin-pad-grid">
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('1')">1</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('2')">2</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('3')">3</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('4')">4</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('5')">5</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('6')">6</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('7')">7</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('8')">8</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('9')">9</button>
        <button class="pin-btn" style="color:var(--danger);" onclick="window.app.loginScreen.clearPin()">CLR</button>
        <button class="pin-btn" onclick="window.app.loginScreen.appendPin('0')">0</button>
        <button class="pin-btn" style="background:var(--success); color:white;" onclick="window.app.loginScreen.checkPin()">GO</button>
      </div>
      <button onclick="window.app.helpers.closeModal('modal-pin')"
        style="width:100%; padding:15px; border:none; background:transparent; color:#888; cursor:pointer;">
        Cancel
      </button>
    `;

    window.app.helpers.openModal("modal-pin");
  },

  appendPin: function (n) {
    document.getElementById("pin-input").value += n;
  },

  clearPin: function () {
    document.getElementById("pin-input").value = "";
  },

  checkPin: function () {
    const val = document.getElementById("pin-input").value;
    const pins = window.app?.data?.pins || window.app?.defaults?.pins || {};
    const expected = pins[this.targetRole];

    if (expected && val === expected) {
      window.app.helpers.closeModal("modal-pin");
      this.completeLogin(this.targetRole);
    } else {
      const inp = document.getElementById("pin-input");
      inp.style.color = "red";
      setTimeout(() => {
        inp.value = "";
        inp.style.color = "black";
      }, 500);
    }
  },

  showForgotPin: function () {
    const html = `
      <p style="margin:0 0 10px 0;">
        An admin can reset your PIN in the IT Hub. The new PIN is saved to Firestore and updates instantly.
      </p>
      <p style="margin:0; color:#666; font-size:0.9rem;">
        Ask a Manager or IT Support to open <strong>IT Hub → PIN Management</strong> and generate a new PIN.
      </p>
    `;
    window.app.helpers.showGenericModal("Forgot PIN?", html, null);
    window.app.helpers.openModal("modal-generic");
  },

  completeLogin: function (role) {
    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.style.display = "none";

    const isAdmin = role === "Manager" || role === "IT Support";
    if (window.app?.session) {
      window.app.session.userName = role;
      window.app.session.roleName = isAdmin ? role : "Cashier";
      window.app.session.isAdmin = isAdmin;
    }

    // Update Header
    const header = document.getElementById("header-cashier");
    if (header) header.innerText = `Cashier: ${role}`;

    // Update Sidebar Version
    const verEl = document.getElementById("app-version");
    if (verEl && window.app?.version) verEl.innerText = window.app.version;

    // Prompt clock-in for employees
    if (!isAdmin && window.app?.timeClock?.clockInByName) {
      const emp = window.app.timeClock.findEmployeeByName(role);
      if (emp && emp.status !== "in") {
        if (window.confirm(`Clock in now, ${role}?`)) {
          window.app.timeClock.clockInByName(role);
        }
      }
    }

    // Show/Hide Nav
    const mgr = document.getElementById("nav-manager");
    const it = document.getElementById("nav-it");
    if (mgr)
      mgr.style.display =
        role === "Manager" || role === "IT Support" ? "block" : "none";
    if (it) it.style.display = role === "IT Support" ? "block" : "none";
  },

  logout: function () {
    const session = window.app?.session || {};
    const userName = session.userName;
    const isAdmin = session.isAdmin;

    if (userName && window.app?.timeClock) {
      if (isAdmin) {
        const confirmOut = window.confirm(
          "Clock out all currently clocked-in employees before logging out?"
        );
        if (confirmOut) window.app.timeClock.clockOutAll();
      } else {
        const emp = window.app.timeClock.findEmployeeByName(userName);
        if (emp && emp.status === "in") {
          const confirmOut = window.confirm(`Clock out now, ${userName}?`);
          if (confirmOut) window.app.timeClock.clockOutByName(userName);
        }
      }
    }

    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.style.display = "flex";

    if (window.app?.session) {
      window.app.session.userName = null;
      window.app.session.roleName = null;
      window.app.session.isAdmin = false;
    }

    const header = document.getElementById("header-cashier");
    if (header) header.innerText = "Not Logged In";

    this.init();
  },

  startKioskMode: function () {
    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.style.display = "none";

    if (window.app?.router?.navigate) window.app.router.navigate("kiosk");

    if (window.app?.posScreen?.renderKioskCategories) {
      window.app.posScreen.renderKioskCategories();
      window.app.posScreen.renderKioskGrid("All");
    }
  },

  exitKioskMode: function () {
    const kioskView = document.getElementById("view-kiosk");
    if (kioskView) kioskView.style.display = "none";

    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.style.display = "flex";

    this.init();
  },
};
