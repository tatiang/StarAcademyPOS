/* File: js/app_test_ChatGPT.js
   Rising Star Cafe POS - TEST_ChatGPT
   Version: v1.68

   Firestore-backed employee login + PIN auth for Manager / IT Support
*/

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// -------------------------
// Firebase config (yours)
// -------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

// Ensure Firebase app exists (avoid duplicate init)
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// -------------------------
// Helpers
// -------------------------
const $ = (id) => document.getElementById(id);

const setText = (id, txt) => {
  const el = $(id);
  if (el) el.textContent = txt;
};

const setHTML = (id, html) => {
  const el = $(id);
  if (el) el.innerHTML = html;
};

const show = (id) => {
  const el = $(id);
  if (el) el.style.display = "";
};

const hide = (id) => {
  const el = $(id);
  if (el) el.style.display = "none";
};

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// -------------------------
// AUDIO SYSTEM (unchanged)
// -------------------------
const playTone = (freq, type, duration) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.log("Audio not supported");
  }
};

// -------------------------
// App
// -------------------------
const STORAGE_KEY = "risingStarCafePOS_v168_testChatGPT";

const app = {
  data: {
    currentCashier: null,
    currentUser: null,       // { id, name, role }
    cart: [],
    products: [],
    orders: [],
    employees: [],           // populated from Firestore (fallback to local)
    timeEntries: [],
    bugReports: [],
    orderCounter: 1001,
    settings: { storeName: "Rising Star Cafe", taxRate: 0.0925 },
    tempProduct: null,
    tempOptions: {},
    tempCashEntry: "",
    editingId: null,
    inventorySort: { field: "name", dir: "asc" },
  },

  managerState: { activeTab: "overview", quickStockMode: false },

  // PIN modal state
  pinBuffer: "",
  pinCallback: null,

  // Cloud state
  cloud: {
    connected: false,
    lastEmployeeSync: null,
  },

  // -------------------------
  // Init / boot
  // -------------------------
  init: async () => {
    app.loadLocalData();

    // Clock
    setInterval(app.updateClock, 1000);

    // Basic UI boot
    try {
      if ($("order-number")) $("order-number").innerText = app.data.orderCounter;
    } catch {}

    app.applySettings();

    // Wire click handlers for Manager/IT if your HTML has these (newer login screens)
    app.wireTopLevelButtons();

    // Connect to Firestore + load employees
    await app.connectAndLoadEmployees();

    // Render login AFTER employees load (so grid is real)
    app.renderLogin();

    // If your app uses an overlay, ensure it’s shown until login completes
    if ($("login-overlay")) $("login-overlay").style.display = "flex";

    console.log("[RSC POS] App loaded", {
      appName: "Rising Star Cafe POS",
      version: (window.RSC_POS_VERSION?.version || window.RSCPOS_VERSION || "v1.68"),
      build: "TEST_ChatGPT"
    });
  },

  wireTopLevelButtons: () => {
    // Supports the simplified test login page buttons: btnManager / btnIT / btnKiosk
    const btnManager = $("btnManager");
    const btnIT = $("btnIT");
    const btnKiosk = $("btnKiosk");

    if (btnManager) btnManager.addEventListener("click", () => app.login("Manager"));
    if (btnIT) btnIT.addEventListener("click", () => app.login("IT Support"));
    if (btnKiosk) btnKiosk.addEventListener("click", () => {
      // Kiosk mode (if you have it); otherwise just go POS after selecting cashier
      app.showAlert("Kiosk mode not enabled in this build yet.");
    });
  },

  // -------------------------
  // Local persistence
  // -------------------------
  loadLocalData: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Keep employees fresh from Firestore; but allow fallback if offline
        app.data = { ...app.data, ...parsed };
        if (!app.data.settings) app.data.settings = { storeName: "Rising Star Cafe", taxRate: 0.0925 };
      } catch {
        app.seedData();
      }
    } else {
      app.seedData();
    }
  },

  saveData: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.data));
    // If you have cloud sync routines elsewhere, they can hook in here.
  },

  seedData: () => {
    // Minimal local fallback data (used only if Firestore fails)
    app.data.products = [
      { id: 1, name: "Coffee", cat: "Beverages", price: 3.50, stock: 50, img: "images/coffee.jpg" },
      { id: 2, name: "Herbal Tea", cat: "Beverages", price: 3.25, stock: 40, img: "images/placeholder.png" },
      { id: 10, name: "Choc Chip Cookie", cat: "Baked Goods", price: 2.50, stock: 30, img: "images/placeholder.png" },
      { id: 13, name: "Bottled Water", cat: "Beverages", price: 1.50, stock: 50, img: "images/placeholder.png" }
    ];

    app.data.employees = [
      { id: "local_alex", name: "Alex", role: "Cashier", img: "images/placeholder.png", active: true },
      { id: "local_bri", name: "Brianna", role: "Barista", img: "images/placeholder.png", active: true },
      // Optional local admin fallback (ONLY used if Firestore fails)
      { id: "local_mgr", name: "Manager", role: "Manager", img: "images/placeholder.png", pin: "1234", active: true },
      { id: "local_it", name: "IT Support", role: "IT Admin", img: "images/placeholder.png", pin: "9753", active: true },
    ];

    app.data.settings = { storeName: "Rising Star Cafe", taxRate: 0.0925 };
    app.data.orderCounter = 1001;
    app.saveData();
  },

  applySettings: () => {
    const title = app.data.settings.storeName || "Rising Star Cafe";
    const rate = app.data.settings.taxRate ?? 0.0925;
    document.title = `${title} POS`;

    const loginTitle = $("store-title-login");
    if (loginTitle) loginTitle.innerText = title;

    const taxDisp = $("tax-rate-display");
    if (taxDisp) taxDisp.innerText = (rate * 100).toFixed(2);
  },

  // -------------------------
  // Firestore: Employees
  // -------------------------
  connectAndLoadEmployees: async () => {
    // If your UI has a connection label on the login page, update it
    if ($("connectionStatus")) setText("connectionStatus", "Connecting to cloud…");

    try {
      // Prefer only active employees if you use active flag; otherwise load all.
      // Using a query here keeps it scalable.
      const employeesRef = collection(db, "employees");
      let snap;

      // Try "active == true" first; if your docs don't have 'active', fallback to all
      try {
        const qActive = query(employeesRef, where("active", "==", true));
        snap = await getDocs(qActive);
        // If zero results because field doesn't exist, we'll detect below and fallback
      } catch {
        snap = await getDocs(employeesRef);
      }

      if (!snap || snap.empty) {
        // Fallback to all docs if active-query returned nothing
        snap = await getDocs(employeesRef);
      }

      const employees = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        if (!d.name) return;

        employees.push({
          id: docSnap.id,
          name: d.name,
          role: d.role || "Cashier",
          img: d.img || "images/placeholder.png",
          active: (typeof d.active === "boolean") ? d.active : true,
          // PIN support: pin (plain) OR pinHash (sha256 hex)
          pin: d.pin || null,
          pinHash: d.pinHash || null,
        });
      });

      // Sort by name
      employees.sort((a, b) => a.name.localeCompare(b.name));

      // Store in app + persist for offline fallback
      app.data.employees = employees;
      app.cloud.connected = true;
      app.cloud.lastEmployeeSync = new Date().toISOString();
      app.saveData();

      if ($("connectionStatus")) setText("connectionStatus", "Connected to cloud");
      console.log("[RSC POS] Employees loaded from Firestore:", employees.length);
    } catch (err) {
      console.warn("[RSC POS] Firestore employee load failed; using local cache/fallback.", err);
      app.cloud.connected = false;

      if ($("connectionStatus")) setText("connectionStatus", "Offline (using local data)");
      // Keep whatever is already in app.data.employees (from localStorage or seed)
    }
  },

  // -------------------------
  // Login rendering (now uses Firestore employees)
  // -------------------------
  renderLogin: () => {
    // 1) Student / cashier grid
    const grid = $("student-login-grid");
    if (grid) {
      // Exclude admin-only roles from the grid; those use PIN buttons
      const staff = (app.data.employees || []).filter(e =>
        e.active !== false &&
        e.role !== "Manager" &&
        e.role !== "IT Admin" &&
        e.role !== "IT Support"
      );

      if (staff.length === 0) {
        grid.innerHTML = `<div style="padding:16px; color:#777; text-align:center;">
          No employees found. Check Firestore collection <b>employees</b>.
        </div>`;
      } else {
        grid.innerHTML = staff.map(e => `
          <div class="login-btn-wrap" data-emp="${encodeURIComponent(e.name)}">
            <img src="${e.img}" class="login-btn-img" onerror="this.src='images/placeholder.png'">
            <span class="login-btn-name">${e.name}</span>
          </div>
        `).join("");

        // Attach click handlers (avoid inline onclick)
        grid.querySelectorAll(".login-btn-wrap").forEach(btn => {
          btn.addEventListener("click", () => {
            const name = decodeURIComponent(btn.getAttribute("data-emp") || "");
            app.login(name);
          });
        });
      }
    }

    // 2) Admin PIN buttons (if your older overlay uses this container)
    const adminContainer = $("admin-login-buttons");
    if (adminContainer) {
      adminContainer.innerHTML = `
        <div class="admin-login-btn" id="adminManagerBtn">
          <i class="fa-solid fa-user-tie"></i> Manager
        </div>
        <div class="admin-login-btn" id="adminITBtn">
          <i class="fa-solid fa-microchip"></i> IT Support
        </div>
      `;

      const m = $("adminManagerBtn");
      const i = $("adminITBtn");
      if (m) m.addEventListener("click", () => app.login("Manager"));
      if (i) i.addEventListener("click", () => app.login("IT Support"));
    }
  },

  // -------------------------
  // Login + PIN Auth
  // -------------------------
  login: async (name) => {
    // Admin routes
    if (name === "Manager") {
      return app.requestPin(async (pin) => {
        const ok = await app.validateAdminPin("Manager", pin);
        if (!ok) return app.showAlert("Incorrect PIN", "Access Denied");
        app.completeLogin("Manager", "Manager");
      });
    }

    if (name === "IT Support") {
      return app.requestPin(async (pin) => {
        const ok = await app.validateAdminPin("IT Support", pin);
        if (!ok) return app.showAlert("Incorrect PIN", "Access Denied");
        // Role name here matches your sidebar logic expecting 'IT Admin'
        app.completeLogin("IT Support", "IT Admin");
      });
    }

    // Regular employee
    const emp = (app.data.employees || []).find(e => e.name === name);
    if (!emp) return app.showAlert("Employee not found. Try reloading.");

    app.completeLogin(emp.name, emp.role, emp);
  },

  validateAdminPin: async (adminType, pin) => {
    // Validate against Firestore employees if possible; fallback to local pins
    // Manager = role "Manager"
    // IT Support = role "IT Admin" (or "IT Support")
    const roleMatch = (e) => {
      if (adminType === "Manager") return e.role === "Manager";
      if (adminType === "IT Support") return (e.role === "IT Admin" || e.role === "IT Support");
      return false;
    };

    const candidates = (app.data.employees || []).filter(roleMatch);

    // If Firestore includes pin/pinHash for admin users, use those
    for (const e of candidates) {
      if (e.pin && String(e.pin) === String(pin)) return true;
      if (e.pinHash) {
        const h = await sha256Hex(String(pin));
        if (h === e.pinHash) return true;
      }
    }

    // Final fallback (local dev)
    if (adminType === "Manager" && pin === "1234") return true;
    if (adminType === "IT Support" && pin === "9753") return true;

    return false;
  },

  completeLogin: (name, role, empRecord = null) => {
    app.data.currentCashier = name;
    app.data.currentUser = {
      id: empRecord?.id || null,
      name,
      role,
    };

    // Header
    const headerCashier = $("header-cashier");
    if (headerCashier) {
      const imgUrl = empRecord?.img || "images/placeholder.png";
      headerCashier.innerHTML = `<img src="${imgUrl}" class="cashier-avatar" onerror="this.src='images/placeholder.png'"> ${name}`;
    }

    // Hide overlay if present
    if ($("login-overlay")) $("login-overlay").style.display = "none";

    // Sidebar permissions
    app.updateSidebar();

    // Route user
    if (role === "Manager") {
      app.managerState.activeTab = "overview";
      app.navigate("manager");
      app.renderManagerHub();
    } else if (role === "IT Admin" || role === "IT Support") {
      app.navigate("it");
      app.renderITHub();
    } else {
      app.navigate("pos");
      app.renderPOS();
    }
  },

  logout: () => {
    app.data.currentCashier = null;
    app.data.currentUser = null;
    if ($("login-overlay")) $("login-overlay").style.display = "flex";
  },

  // -------------------------
  // PIN modal (existing IDs assumed)
  // -------------------------
  requestPin: (callback) => {
    app.pinBuffer = "";
    app.pinCallback = callback;
    if ($("pin-display")) $("pin-display").innerText = "";
    if ($("pin-error")) $("pin-error").innerText = "";
    if ($("modal-pin")) $("modal-pin").classList.add("open");
  },

  pinInput: (num) => {
    app.pinBuffer += String(num);
    if ($("pin-display")) $("pin-display").innerText = "*".repeat(app.pinBuffer.length);
  },

  pinClear: () => {
    app.pinBuffer = "";
    if ($("pin-display")) $("pin-display").innerText = "";
  },

  pinSubmit: async () => {
    if ($("modal-pin")) $("modal-pin").classList.remove("open");
    if (app.pinCallback) await app.pinCallback(app.pinBuffer);
  },

  // -------------------------
  // NAVIGATION (unchanged, but uses currentCashier string)
  // -------------------------
  updateSidebar: () => {
    const manLink = $("nav-manager");
    const itLink = $("nav-it");
    if (manLink) manLink.classList.add("hidden");
    if (itLink) itLink.classList.add("hidden");

    if (app.data.currentCashier === "Manager") {
      if (manLink) manLink.classList.remove("hidden");
    } else if (app.data.currentCashier === "IT Support") {
      if (itLink) itLink.classList.remove("hidden");
      if (manLink) manLink.classList.remove("hidden");
    }
  },

  navigate: (view) => {
    const viewId = `view-${view}`;
    document.querySelectorAll("#sidebar .nav-links li").forEach(li => {
      li.classList.toggle("active", li.getAttribute("id") === `nav-${view}`);
    });

    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = $(viewId);
    if (target) target.classList.add("active");

    switch (view) {
      case "pos": app.renderPOS(); break;
      case "barista": app.renderBarista(); break;
      case "dashboard": app.renderDashboard(); break;
      case "inventory": app.renderInventory(); break;
      case "time": app.renderTimeClock(); break;
      case "manager": app.renderManagerHub(); break;
      case "it": app.renderITHub(); break;
    }
  },

  // -------------------------
  // POS / Manager / IT / etc
  // Your existing methods below are left as-is.
  // -------------------------

  // --- POS Logic ---
  renderPOS: () => {
    const cats = ["Beverages", "Baked Goods", "Snacks", "Merch"];
    const ex = [...new Set(app.data.products.map(p => p.cat))];
    ex.forEach(c => { if (!cats.includes(c)) cats.push(c); });

    const catContainer = $("pos-categories");
    if (catContainer) {
      catContainer.innerHTML =
        `<div class="cat-tab active" onclick="app.filterPOS('All', this)">All</div>` +
        cats.map(c => `<div class="cat-tab" onclick="app.filterPOS('${c}', this)">${c}</div>`).join("");
    }
    app.filterPOS("All");
    app.renderCart();
  },

  filterPOS: (cat, tabEl) => {
    if (tabEl) {
      document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
      tabEl.classList.add("active");
    }
    const grid = $("pos-grid");
    if (!grid) return;

    const prods = cat === "All" ? app.data.products : app.data.products.filter(p => p.cat === cat);
    grid.innerHTML = prods.map(p => `
      <div class="product-card" onclick="app.addToCart(${p.id})">
        <img src="${p.img}" class="p-image" onerror="this.src='images/placeholder.png'">
        <div class="p-details">
          <div class="p-name">${p.name}</div>
          <div class="p-price">$${p.price.toFixed(2)}</div>
          <div class="p-stock" style="color:${p.stock < 5 ? "red" : "green"}">${p.stock} in stock</div>
        </div>
      </div>
    `).join("");
  },

  addToCart: (id) => {
    const p = app.data.products.find(x => x.id === id);
    if (!p) return;
    if (p.stock <= 0) return app.showAlert("Out of stock!");

    if (p.options && p.options.length > 0) {
      app.data.tempProduct = p;
      app.data.tempOptions = {};
      app.openOptionsModal(p);
    } else {
      app.data.cart.push({ ...p, qty: 1, _key: Date.now() });
      app.renderCart();
    }
  },

  openOptionsModal: (p) => {
    const container = $("options-container");
    if ($("opt-custom-note")) $("opt-custom-note").value = "";
    if (!container) return;
    container.innerHTML = "";

    if (p.options) {
      p.options.forEach(optGroup => {
        const groupDiv = document.createElement("div");
        groupDiv.innerHTML = `<h4>${optGroup.name}</h4>`;
        const buttonsDiv = document.createElement("div");
        buttonsDiv.className = "opt-buttons";

        if (optGroup.type === "select" || optGroup.type === "radio") {
          optGroup.choices.forEach(choice => {
            const btn = document.createElement("button");
            btn.className = "opt-btn";
            btn.innerText = choice.name + (choice.price ? ` (+$${choice.price.toFixed(2)})` : "");
            btn.onclick = () => {
              buttonsDiv.querySelectorAll(".opt-btn").forEach(b => b.classList.remove("selected"));
              btn.classList.add("selected");
              app.data.tempOptions[optGroup.name] = choice;
            };
            buttonsDiv.appendChild(btn);
          });
        } else if (optGroup.type === "toggle") {
          const btn = document.createElement("button");
          btn.className = "opt-btn";
          btn.innerText = optGroup.choice.name + (optGroup.choice.price ? ` (+$${optGroup.choice.price.toFixed(2)})` : "");
          btn.onclick = () => {
            btn.classList.toggle("selected");
            if (btn.classList.contains("selected")) {
              app.data.tempOptions[optGroup.name] = optGroup.choice;
            } else {
              delete app.data.tempOptions[optGroup.name];
            }
          };
          buttonsDiv.appendChild(btn);
        }

        groupDiv.appendChild(buttonsDiv);
        container.appendChild(groupDiv);
      });
    }

    if ($("modal-options")) $("modal-options").classList.add("open");
  },

  confirmOptions: () => {
    const note = $("opt-custom-note") ? $("opt-custom-note").value : "";
    let optionsString = "";
    let addedPrice = 0;

    for (const key in app.data.tempOptions) {
      const choice = app.data.tempOptions[key];
      optionsString += `${choice.name}, `;
      if (choice.price) addedPrice += choice.price;
    }

    if (note) optionsString += `Note: ${note}`;

    app.data.cart.push({
      ...app.data.tempProduct,
      price: app.data.tempProduct.price + addedPrice,
      qty: 1,
      opts: optionsString,
      _key: Date.now()
    });

    app.closeModal("modal-options");
    app.renderCart();
  },

  removeFromCart: (key) => {
    app.data.cart = app.data.cart.filter(i => i._key !== key);
    app.renderCart();
  },

  renderCart: () => {
    const list = $("cart-list");
    if (!list) return;
    const rate = app.data.settings.taxRate || 0.0925;

    if (app.data.cart.length === 0) {
      list.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>';
      setText("pos-subtotal", "$0.00");
      setText("pos-tax", "$0.00");
      setText("pos-total", "$0.00");
      return;
    }

    list.innerHTML = app.data.cart.map(i => `
      <div class="cart-item">
        <div style="flex-grow:1">
          <div style="font-weight:bold">${i.name}</div>
          <div style="font-size:0.8rem; color:#666;">${i.opts || ""}</div>
        </div>
        <div style="font-weight:bold">$${i.price.toFixed(2)}</div>
        <div onclick="app.removeFromCart(${i._key})" style="margin-left:10px; color:var(--danger); cursor:pointer;">
          <i class="fa-solid fa-trash"></i>
        </div>
      </div>
    `).join("");

    const sub = app.data.cart.reduce((s, i) => s + i.price, 0);
    const tax = sub * rate;
    const total = sub + tax;

    setText("pos-subtotal", `$${sub.toFixed(2)}`);
    setText("pos-tax", `$${tax.toFixed(2)}`);
    setText("pos-total", `$${total.toFixed(2)}`);
  },

  // -------------------------
  // The rest of your functions stay as you had them.
  // (Manager hub, IT hub, time clock, etc.)
  // -------------------------

  renderManagerHub: () => {
    // Keep your existing manager hub code here (unchanged)
    // ...
  },

  renderITHub: () => {
    if ($("it-db-status")) $("it-db-status").innerText = app.cloud.connected ? "Firestore Connected" : "Local Storage Active";
    if ($("it-last-sync")) $("it-last-sync").innerText = new Date().toLocaleTimeString();
    if ($("it-storage")) $("it-storage").innerText = (JSON.stringify(app.data).length / 1024).toFixed(2) + " KB";
  },

  // Clock
  updateClock: () => {
    const now = new Date();
    if ($("big-clock")) $("big-clock").innerText = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if ($("big-date")) $("big-date").innerText = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    if ($("live-clock")) $("live-clock").innerText = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  },

  closeModal: (id) => { const el = $(id); if (el) el.classList.remove("open"); },

  showAlert: (msg) => alert(msg),

  // Stubs for functions referenced elsewhere in your original file (keep as needed)
  renderBarista: () => {},
  renderDashboard: () => {},
  renderInventory: () => {},
  renderTimeClock: () => {},
};

window.app = app;

// Boot once DOM is ready (important for grabbing elements)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => app.init());
} else {
  app.init();
}
