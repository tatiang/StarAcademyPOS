/*
Star Academy POS — v1.35 JS patches
===================================

This file assumes that your existing v1.34 app is already defined as `window.app`
and that app.data, app.renderInventory(), etc. exist.

Recommended workflow:
1. Duplicate app_v1.34.js to app_v1.35.js.
2. In app_v1.35.js, add the code below *after* the main `const app = { ... }` block
   (or anywhere after `window.app = app;`), so that it extends / overrides the
   existing behavior for Inventory, AI images, and Manager Hub bugs.

These patches implement:
- Inventory sort state + helper
- Sorted Inventory rendering with thumbnails + category emojis
- AI image generator status indicator + download helper
- Bug / feature request logging UI hooks
- Manager Hub render hook
*/


/* ---------------------------------------------------------------------
 * 1) Inventory sort state
 * ------------------------------------------------------------------- */

if (!window.app) {
  console.error("Star Academy POS v1.35 patch: window.app is not defined. Make sure app_v1.34.js runs before this file.");
} else {
  const app = window.app;

  if (!app.data) {
    app.data = {};
  }

  if (!Array.isArray(app.data.products)) {
    app.data.products = [];
  }

  if (!app.data.inventorySort) {
    app.data.inventorySort = { field: "name", dir: "asc" };
  }

  if (!Array.isArray(app.data.bugReports)) {
    app.data.bugReports = [];
  }

  /* -------------------------------------------------------------------
   * 2) Category icon helper
   * ----------------------------------------------------------------- */
  app.categoryIcon = function (cat) {
    const map = {
      "Beverages": "☕️",
      "Baked Goods": "🧁",
      "Snacks": "🍪",
      "Cold Drinks": "🥤"
    };
    const label = cat || "";
    return (map[label] || "📦") + " " + label;
  };

  /* -------------------------------------------------------------------
   * 3) Inventory sort handler
   * ----------------------------------------------------------------- */
  app.sortInventory = function (field) {
    const sort = app.data.inventorySort || (app.data.inventorySort = { field: "name", dir: "asc" });
    if (sort.field === field) {
      sort.dir = sort.dir === "asc" ? "desc" : "asc";
    } else {
      sort.field = field;
      sort.dir = "asc";
    }
    if (typeof app.renderInventory === "function") {
      app.renderInventory();
    }
  };

  /* -------------------------------------------------------------------
   * 4) Replacement renderInventory
   *    - Thumbnails
   *    - Category emojis
   *    - Sort icons
   * ----------------------------------------------------------------- */
  app.renderInventory = function () {
    const role = typeof app.getRole === "function" ? app.getRole() : app.data.currentCashier;
    const isManager = (role === "Manager" || role === "IT Support");

    // Header content with optional Add Item button
    const header = document.querySelector("#view-inventory .dash-header");
    if (header) {
      let headerHtml = "<h2>Inventory</h2>";
      if (isManager && typeof app.openProductModal === "function") {
        headerHtml += '<button class="btn-sm" onclick="app.openProductModal()">+ Add Item</button>';
      }
      header.innerHTML = headerHtml;
    }

    const sort = app.data.inventorySort || { field: "name", dir: "asc" };
    const products = (app.data.products || []).slice().sort((a, b) => {
      let va;
      let vb;
      switch (sort.field) {
        case "cat":
          va = a.cat || "";
          vb = b.cat || "";
          return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "stock":
          va = typeof a.stock === "number" ? a.stock : 0;
          vb = typeof b.stock === "number" ? b.stock : 0;
          return sort.dir === "asc" ? va - vb : vb - va;
        case "price":
          va = typeof a.price === "number" ? a.price : 0;
          vb = typeof b.price === "number" ? b.price : 0;
          return sort.dir === "asc" ? va - vb : vb - va;
        case "name":
        default:
          va = a.name || "";
          vb = b.name || "";
          return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
    });

    // Update sort icons in the header
    ["name", "cat", "stock", "price"].forEach((field) => {
      const el = document.getElementById(`inv-sort-${field}`);
      if (!el) return;
      el.classList.remove("active", "asc", "desc");
      if (field === sort.field) {
        el.classList.add("active");
        el.classList.add(sort.dir === "asc" ? "asc" : "desc");
      }
    });

    const tbody = document.getElementById("inventory-body");
    if (!tbody) return;

    tbody.innerHTML = products
      .map((p) => {
        const safePrice = typeof p.price === "number" ? p.price : 0;
        const stock = typeof p.stock === "number" ? p.stock : 0;
        const safeId = typeof p.id !== "undefined" ? p.id : "";
        const imgSrc = p.img || "images/placeholder.png";
        const statusClass = stock < 10 ? "stock-low" : "stock-ok";
        const statusLabel = stock < 10 ? "Low" : "OK";

        // Prefer existing helpers if they exist
        const onEdit =
          typeof app.inventoryEditClick === "function"
            ? `app.inventoryEditClick(${safeId})`
            : `console.warn('inventoryEditClick not implemented yet');`;
        const onDelete =
          typeof app.deleteProduct === "function"
            ? `app.deleteProduct(${safeId})`
            : `console.warn('deleteProduct not implemented yet');`;

        return `
          <tr>
            <td>
              <img src="${imgSrc}"
                   class="inv-thumb"
                   onerror="this.src='images/placeholder.png'">
            </td>
            <td>${p.name || ""}</td>
            <td>${app.categoryIcon(p.cat)}</td>
            <td><b>${stock}</b></td>
            <td>$${safePrice.toFixed(2)}</td>
            <td>
              <span class="status-badge ${statusClass}">
                ${statusLabel}
              </span>
            </td>
            <td>
              <button class="btn-sm" onclick="${onEdit}">Edit</button>
              ${
                isManager
                  ? '<button class="btn-sm btn-danger-sm" onclick="' +
                    onDelete +
                    '">X</button>'
                  : ""
              }
            </td>
          </tr>
        `;
      })
      .join("");
  };

  /* -------------------------------------------------------------------
   * 5) AI image generator with status pill
   * ----------------------------------------------------------------- */
  app.generateAIImage = function (nameId, targetId) {
    const nameInput = document.getElementById(nameId);
    const queryRaw = nameInput && nameInput.value ? nameInput.value : "coffee";
    const query = queryRaw.trim() || "coffee";

    const seed = Math.floor(Math.random() * 9999);
    const url = `https://image.pollinations.ai/prompt/delicious ${encodeURIComponent(
      query
    )} food photography, professional lighting, photorealistic, 4k?width=300&height=300&nologo=true&seed=${seed}`;

    const statusEl = document.getElementById("ai-status");
    const preview = document.getElementById("prod-img-preview");
    const target = document.getElementById(targetId);

    if (statusEl) {
      statusEl.textContent = "Generating...";
      statusEl.classList.remove("ok", "error");
      statusEl.classList.add("working");
    }

    const img = new Image();
    img.onload = function () {
      if (target) target.value = url;
      if (preview) preview.src = url;
      if (statusEl) {
        statusEl.textContent = "Ready";
        statusEl.classList.remove("working", "error");
        statusEl.classList.add("ok");
      }
    };
    img.onerror = function () {
      if (statusEl) {
        statusEl.textContent = "Error loading image";
        statusEl.classList.remove("working", "ok");
        statusEl.classList.add("error");
      }
      if (typeof app.showAlert === "function") {
        app.showAlert("There was a problem generating or loading the image. Please try again or adjust the product name.");
      } else {
        console.warn("AI image load error");
      }
    };
    img.src = url;
  };

  /* -------------------------------------------------------------------
   * 6) Download helper for product image preview
   * ----------------------------------------------------------------- */
  app.downloadProdImage = function () {
    const preview = document.getElementById("prod-img-preview");
    if (!preview || !preview.src) {
      if (typeof app.showAlert === "function") {
        app.showAlert("No image to download yet.");
      } else {
        alert("No image to download yet.");
      }
      return;
    }
    const nameInput = document.getElementById("prod-name");
    const baseName = (nameInput && nameInput.value ? nameInput.value : "product")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();

    const a = document.createElement("a");
    a.href = preview.src;
    a.download = `${baseName || "product"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* -------------------------------------------------------------------
   * 7) Bug / feature requests in Manager Hub
   * ----------------------------------------------------------------- */
  app.submitBugReport = function () {
    const typeEl = document.getElementById("bug-type");
    const detailsEl = document.getElementById("bug-details");
    if (!typeEl || !detailsEl) {
      console.warn("Bug form elements not found; is the Manager Hub HTML updated?");
      return;
    }

    const type = (typeEl.value || "Bug").trim();
    const details = (detailsEl.value || "").trim();

    if (!details) {
      if (typeof app.showAlert === "function") {
        app.showAlert("Please describe the bug, feature, or idea before submitting.");
      } else {
        alert("Please describe the bug, feature, or idea before submitting.");
      }
      return;
    }

    const now = new Date();
    const entry = {
      id: Date.now(),
      ts: now.toISOString(),
      type,
      details
    };

    app.data.bugReports.push(entry);
    if (typeof app.saveData === "function") {
      app.saveData();
    }
    detailsEl.value = "";
    app.renderBugReports();
  };

  app.renderBugReports = function () {
    const tbody = document.getElementById("bug-log-body");
    if (!tbody) return;

    const logs = (app.data.bugReports || []).slice().sort((a, b) => {
      return (b.id || 0) - (a.id || 0);
    });

    const recent = logs.slice(0, 10);
    tbody.innerHTML = recent
      .map((log) => {
        const date = log.ts ? new Date(log.ts) : null;
        const dateStr = date
          ? date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : "";
        const type = log.type || "";
        const details = log.details || "";
        return `
          <tr>
            <td>${dateStr}</td>
            <td>${type}</td>
            <td>${details}</td>
          </tr>
        `;
      })
      .join("");
  };

  /* -------------------------------------------------------------------
   * 8) Manager Hub render hook helper
   * ----------------------------------------------------------------- */
  app.renderManagerHub = function () {
    app.renderBugReports();
    if (typeof app.renderEmployeesManager === "function") {
      app.renderEmployeesManager();
    }
  };

  // Optional: if your navigate function uses string keys like "manager",
  // you can ensure it calls renderManagerHub() when landing on that view.
  // Example patch to your navigate(viewKey) implementation (not automatic):
  //
  //   if (viewKey === "manager") {
  //     app.renderManagerHub();
  //   }
  //
}
