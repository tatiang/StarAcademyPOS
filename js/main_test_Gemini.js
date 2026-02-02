/* FILE: js/main_test_Gemini.js
   PURPOSE: Main entry point. Handles startup and navigation for Gemini test build.

   KEY BEHAVIORS:
   - Instant boot from LocalStorage (safe-merge to preserve schema keys).
   - Start Firestore real-time listener (database_test_Gemini.js).
   - Render login UI immediately at launch (employee buttons, etc.).
   - Re-render login UI on cloud updates when login overlay is visible.
*/

(function () {
  "use strict";

  // -----------------------------
  // Small helpers
  // -----------------------------
  function isLoginOverlayVisible() {
    const overlay = document.getElementById("login-overlay");
    if (!overlay) return false;

    // If no inline style, CSS shows it → treat as visible
    const disp = overlay.style.display;
    return disp !== "none";
  }

  function safeMergeData(target, source) {
    // Shallow merge for known top-level keys to preserve schema.
    // (Avoids losing new keys when old LocalStorage data is missing them.)
    const out = { ...target };

    if (!source || typeof source !== "object") return out;

    // Only merge the known data keys
    const keys = [
      "products",
      "categories",
      "roles",
      "employees",
      "cart",
      "orders",
      "timeEntries",
      "orderCounter",
      "inventory",
    ];

    keys.forEach((k) => {
      if (k in source) out[k] = source[k];
    });

    return out;
  }

  // -----------------------------
  // Router
  // -----------------------------
  window.app.router = {
    init: function () {
      try {
        console.log("System Boot:", window.app.version);

        // 1) Load local data first (instant boot), but keep schema safe
        // Your database.loadLocal() currently overwrites window.app.data.
        // We'll still call it (to keep your logic), then merge back with defaults.
        if (window.app?.database?.loadLocal) {
          window.app.database.loadLocal();

          // Merge the loaded data with the current schema to ensure all keys exist
          const schema = window.app.defaults
            ? JSON.parse(JSON.stringify(window.app.defaults))
            : {};
          const merged = safeMergeData(schema, window.app.data);
          window.app.data = merged;
        }

        // 2) Render sidebar version from window.app.version
        const verEl = document.getElementById("app-version");
        if (verEl) verEl.innerText = window.app.version || "";

        // (Optional) Keep <title> in sync with version
        if (window.app.version) {
          document.title = `Rising Star Cafe POS ${window.app.version}`;
        }

        // 3) Render login UI immediately (this replaces the static HTML login box)
        if (window.app?.loginScreen?.init) {
          window.app.loginScreen.init();
        }

        // 4) Start Firestore listener (merges cloud updates and refreshes screens)
        if (window.app?.database?.init) {
          window.app.database.init();
        }

        // 5) Patch database.refreshScreens to also refresh login overlay when visible
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
        // Run original refresh logic for the active view(s)
        original();

        // Also refresh login UI if overlay is visible (e.g., new employees from Firestore)
        if (isLoginOverlayVisible() && window.app?.loginScreen?.init) {
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
        // database.refreshScreens references window.app.timeClock.render,
        // but your modules may attach as window.app.timeclock
        if (window.app.timeclock?.init) window.app.timeclock.init();
        else if (window.app.timeClock?.render) window.app.timeClock.render();
      } else if (viewName === "dashboard") {
        if (window.app.dashboard?.init) window.app.dashboard.init();
      } else if (viewName === "kiosk") {
        // kiosk view is special; no init required here unless you add one
      }
    },
  };

  // -----------------------------
  // Startup: single entry point
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.app) {
      console.error(
        "window.app not found. Check script load order (main_test_Gemini.js should load last)."
      );
      return;
    }
    if (!window.app.router?.init) {
      console.error("window.app.router.init not found.");
      return;
    }
    window.app.router.init();
  });
})();
