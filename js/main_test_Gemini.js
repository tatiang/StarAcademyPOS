/* FILE: js/main_test_Gemini.js
   PURPOSE: Main entry point. Handles startup and navigation for Gemini test build.
   NOTES:
   - database_test_Gemini.js init() has NO callback; it starts a real-time listener.
   - We boot from LocalStorage immediately, then Firestore merges in and refreshes screens.
   - We render the login UI at launch, and re-render it when employees update (if login overlay is visible).
*/

(function () {
  "use strict";

  // -----------------------------
  // Router
  // -----------------------------
  window.app.router = {
    init: function () {
      try {
        console.log("System Boot:", window.app.version);

        // 1) Load local data first for instant boot
        if (window.app?.database?.loadLocal) {
          window.app.database.loadLocal();
        }

        // 2) Render sidebar version
        const verEl = document.getElementById("app-version");
        if (verEl) verEl.innerText = window.app.version || "";

        // 3) Ensure login UI is rendered immediately (employee buttons, etc.)
        if (window.app?.loginScreen?.init) {
          window.app.loginScreen.init();
        }

        // 4) Start Firestore (real-time listener will merge cloud data + refresh screens)
        if (window.app?.database?.init) {
          window.app.database.init();
        }

        // 5) Patch database.refreshScreens so cloud updates can also refresh login UI
        //    (only when login overlay is visible)
        this._patchDatabaseRefreshScreens();

        // 6) Start default view underneath the login overlay
        this.navigate("pos");
      } catch (e) {
        console.error("Router init failed:", e);
      }
    },

    _patchDatabaseRefreshScreens: function () {
      const db = window.app?.database;
      if (!db || typeof db.refreshScreens !== "function") return;

      // Patch only once
      if (db.__refreshScreensPatched) return;
      db.__refreshScreensPatched = true;

      const original = db.refreshScreens.bind(db);

      db.refreshScreens = function () {
        // Run the original screen refresh logic
        original();

        // If login overlay is visible, rebuild login UI so employee list updates immediately
        const overlay = document.getElementById("login-overlay");
        const overlayVisible =
          overlay && overlay.style.display !== "none" && overlay.style.display !== "";

        // Important:
        // - On first load, overlay has no inline style (""), but it's visible due to CSS.
        // - Treat "" as visible.
        const visible = overlay && overlay.style.display !== "none";

        if (visible && window.app?.loginScreen?.init) {
          window.app.loginScreen.init();
        }
      };
    },

    navigate: function (viewName) {
      // Hide all views
      document.querySelectorAll(".view").forEach((el) => {
        el.style.display = "none";
        el.classList.remove("active");
      });

      // Un-highlight all nav items
      document.querySelectorAll(".nav-links li").forEach((btn) =>
        btn.classList.remove("active")
      );

      // Highlight active nav item
      const activeBtn = document.getElementById(`nav-${viewName}`);
      if (activeBtn) activeBtn.classList.add("active");

      // Show the target view
      const viewId = `view-${viewName}`;
      const viewEl = document.getElementById(viewId);

      if (!viewEl) {
        console.error("View container not found:", viewId);
        return;
      }

      viewEl.style.display = "block";
      viewEl.classList.add("active");

      // Initialize per-view screens (keep your existing compatibility fallbacks)
      if (viewName === "pos") {
        if (window.app.posScreen?.init) window.app.posScreen.init();
        else if (window.app.pos?.init) window.app.pos.init();
      } else if (viewName === "barista") {
        if (window.app.baristaView?.render) window.app.baristaView.render();
        else if (window.app.barista?.init) window.app.barista.init();
      } else if (viewName === "manager") {
        if (window.app.managerHub?.init) window.app.managerHub.init();
      } else if (viewName === "it") {
        if (window.app.itHub?.render) window.app.itHub.render();
      } else if (viewName === "inventory") {
        if (window.app.inventory?.init) window.app.inventory.init();
      } else if (viewName === "timeclock") {
        // Your database.refreshScreens references window.app.timeClock.render,
        // but your index includes timeclock_screen_test_Gemini.js (likely window.app.timeclock)
        if (window.app.timeclock?.init) window.app.timeclock.init();
        else if (window.app.timeClock?.render) window.app.timeClock.render();
      } else if (viewName === "dashboard") {
        if (window.app.dashboard?.init) window.app.dashboard.init();
      }
    },
  };

  // -----------------------------
  // Startup (single entry point)
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.app) {
      console.error("window.app not found. Check load order (main_test_Gemini.js should load last).");
      return;
    }
    if (!window.app.router) {
      console.error("window.app.router not defined.");
      return;
    }
    window.app.router.init();
  });
})();
