// File: js/app_test_ChatGPT.js
// Rising Star Cafe POS — app_test_ChatGPT.js
// v1.68 (TEST_ChatGPT)
//
// What this update does:
// 1) Pulls employee list from Firestore (stores/classroom_cafe_main -> employees array)
// 2) Makes Manager + IT Support buttons open the PIN modal and authenticate
// 3) On successful auth, routes user into the app and shows Manager Hub / IT Hub as appropriate
//
// IMPORTANT:
// - This expects Firestore to have: collection "stores", doc "classroom_cafe_main", field "employees" (array)
// - Admin PINs can come from:
//    A) employee objects with role "Manager" or "IT Admin" that include pin: "1234"
//    B) OR doc-level fields: managerPin, itPin
// - If no cloud PINs exist, it falls back to the legacy demo pins (Manager: 1234, IT: 9753)

import {
  doc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- AUDIO SYSTEM ---
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
  } catch (e) { console.log("Audio not supported"); }
};

// --------- Helpers ----------
const $ = (id) => document.getElementById(id);
const safeText = (el, t) => { if (el) el.textContent = t; };
const safeHTML = (el, h) => { if (el) el.innerHTML = h; };
const hasEl = (id) => !!document.getElementById(id);

const CLOUD = {
  storeDocPath: { collection: "stores", docId: "classroom_cafe_main" },
  // Legacy fallback pins if none exist in Firestore data
  fallbackPins: { manager: "1234", it: "9753" }
};

function normalizeRole(role) {
  const r = String(role || "").trim().toLowerCase();
  if (r === "it support") return "IT Admin";
  if (r === "it admin") return "IT Admin";
  if (r === "manager") return "Manager";
  // keep other roles as-is but capitalized-ish
  return role || "Cashier";
}

function isAdminRole(role) {
  const r = normalizeRole(role);
  return r === "Manager" || r === "IT Admin";
}

// --------- APP ----------
const app = {
  data: {
    currentCashier: null,
    cart: [],
    products: [],
    orders: [],
    employees: [],
    timeEntries: [],
    bugReports: [],
    orderCounter: 1001,
    settings: { storeName: "Classroom Café", taxRate: 0.0925 },
    tempProduct: null,
    tempOptions: {},
    tempCashEntry: "",
    editingId: null,
    inventorySort: { field: "name", dir: "asc" },
  },

  managerState: { activeTab: 'overview', quickStockMode: false },
  pinBuffer: "",
  pinCallback: null,

  cloud: {
    // Will be populated after Firestore fetch
    managerPin: null,
    itPin: null,
    unsubStore: null,
    lastStoreDoc: null,
  },

  // ---------- INIT ----------
  init: async () => {
    app.loadLocalData();
    setInterval(app.updateClock, 1000);

    if (hasEl('order-number')) $('order-number').innerText = app.data.orderCounter;

    app.applySettings();
    app.renderLogin(); // show local immediately

    // Wire admin/login buttons in HTML if you have the new login screen buttons
    app.wireLandingButtons();

    // Start cloud connection (employees + optional pins/settings)
    await app.bootstrapCloudEmployees();

    // OPTIONAL: keep syncing employees in real-time (safe for your use case)
    app.startEmployeesListener();

    console.log('[RSC POS] App initialized', window.RSCPOS);
  },

  wireLandingButtons: () => {
    // If your current HTML has these buttons (like your index_test_ChatGPT.html)
    // we wire them to the existing login flows.
    const kiosk = $('btnKiosk');
    const mgr = $('btnManager');
    const it = $('btnIT');

    if (kiosk) kiosk.addEventListener('click', () => {
      // Kiosk goes into POS (or your kiosk flow)
      // If you have a dedicated kiosk screen, swap this.
      app.completeLogin("Kiosk", "Cashier");
    });

    if (mgr) mgr.addEventListener('click', () => app.login('Manager'));
    if (it) it.addEventListener('click', () => app.login('IT Support'));
  },

  // ---------- LOCAL STORAGE ----------
  loadLocalData: () => {
    const stored = localStorage.getItem('starAcademyPOS_v138');
    if (stored) {
      try {
        app.data = JSON.parse(stored);
        if (!app.data.settings) app.data.settings = { storeName: "Classroom Café", taxRate: 0.0925 };
      } catch (e) {
        console.warn('[RSC POS] Failed parsing local data, reseeding', e);
        app.seedData();
      }
    } else {
      app.seedData();
    }
  },

  saveData: () => {
    localStorage.setItem('starAcademyPOS_v138', JSON.stringify(app.data));
    // If you later add save-to-cloud in firestore_test_ChatGPT.js, this hook can remain:
    if (window.saveToCloud) window.saveToCloud(app.data, true);
  },

  // ---------- SEED ----------
  seedData: () => {
    app.data.products = [
      { id: 1, name: "Coffee", cat: "Beverages", price: 3.50, stock: 50, img: "images/coffee.jpg", options: [{ name: "Add-ins", type: "select", choices: [{ name: "+ Half & Half" }, { name: "+ Extra Room" }, { name: "(No Caf) Decaf" }] }] },
      { id: 2, name: "Herbal Tea", cat: "Beverages", price: 3.25, stock: 40, img: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200", options: [{ name: "Temp", type: "toggle", choice: { name: "Not too hot" } }] },
      { id: 10, name: "Choc Chip Cookie", cat: "Baked Goods", price: 2.50, stock: 30, img: "https://images.unsplash.com/photo-1499636138143-bd630f5cf38a?w=200" },
      { id: 13, name: "Bottled Water", cat: "Beverages", price: 1.50, stock: 50, img: "https://images.unsplash.com/photo-1603394630854-e0b62d294e33?w=200" }
    ];

    // Local fallback employees (will be replaced by Firestore if available)
    app.data.employees = [
      { id: 2, name: "Alex", role: "Cashier", img: "images/placeholder.png" },
      { id: 3, name: "Brianna", role: "Barista", img: "images/placeholder.png" }
    ];

    app.data.settings = { storeName: "Classroom Café", taxRate: 0.0925 };
    app.data.orderCounter = 1001;
    app.saveData();
  },

  // ---------- SETTINGS ----------
  applySettings: () => {
    const title = app.data.settings.storeName || "Classroom Café";
    const rate = app.data.settings.taxRate ?? 0.0925;

    document.title = title + " POS";

    const loginTitle = $('store-title-login');
    if (loginTitle) loginTitle.innerText = title;

    const taxDisp = $('tax-rate-display');
    if (taxDisp) taxDisp.innerText = (rate * 100).toFixed(2);
  },

  // ---------- CLOUD EMPLOYEES ----------
  getFirebaseDb: () => {
    const fb = window.RSC_FIREBASE;
    if (!fb || !fb.connected || !fb.db) return null;
    return fb.db;
  },

  fetchStoreDocOnce: async () => {
    const db = app.getFirebaseDb();
    if (!db) return null;
    const ref = doc(db, CLOUD.storeDocPath.collection, CLOUD.storeDocPath.docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data();
  },

  applyStoreDocToApp: (storeDoc) => {
    if (!storeDoc) return;

    app.cloud.lastStoreDoc = storeDoc;

    // Employees
    if (Array.isArray(storeDoc.employees)) {
      // Expect array of objects: {id, name, role, img, pin?}
      const cleaned = storeDoc.employees
        .filter(e => e && e.name)
        .map(e => ({
          id: e.id ?? Date.now(),
          name: String(e.name),
          role: normalizeRole(e.role),
          img: e.img || "images/placeholder.png",
          pin: (e.pin != null && String(e.pin).trim() !== "") ? String(e.pin) : null
        }));

      app.data.employees = cleaned;
      app.saveData();
      app.renderLogin();
    }

    // Optional: Store settings can be in storeDoc.settings
    if (storeDoc.settings && typeof storeDoc.settings === "object") {
      const s = storeDoc.settings;
      const next = {
        storeName: s.storeName ?? app.data.settings.storeName,
        taxRate: (typeof s.taxRate === "number") ? s.taxRate : app.data.settings.taxRate
      };
      app.data.settings = next;
      app.saveData();
      app.applySettings();
    }

    // Admin pins (doc-level override)
    if (storeDoc.managerPin != null && String(storeDoc.managerPin).trim() !== "") {
      app.cloud.managerPin = String(storeDoc.managerPin);
    }
    if (storeDoc.itPin != null && String(storeDoc.itPin).trim() !== "") {
      app.cloud.itPin = String(storeDoc.itPin);
    }
  },

  bootstrapCloudEmployees: async () => {
    const db = app.getFirebaseDb();
    const status = $('connectionStatus');

    if (!db) {
      safeText(status, 'Cloud not connected (see console)');
      return;
    }

    try {
      safeText(status, 'Connecting to cloud…');
      const storeDoc = await app.fetchStoreDocOnce();
      if (!storeDoc) {
        safeText(status, 'Cloud connected (no store doc)');
        console.warn('[RSC POS] Store doc not found: stores/classroom_cafe_main');
        return;
      }
      app.applyStoreDocToApp(storeDoc);
      safeText(status, 'Connected to cloud');
    } catch (err) {
      console.warn('[RSC POS] Failed to load employees from cloud:', err);
      safeText(status, 'Cloud error (employees)');
    }
  },

  startEmployeesListener: () => {
    const db = app.getFirebaseDb();
    if (!db) return;

    // Avoid double-listeners
    if (typeof app.cloud.unsubStore === "function") {
      try { app.cloud.unsubStore(); } catch (_) {}
      app.cloud.unsubStore = null;
    }

    try {
      const ref = doc(db, CLOUD.storeDocPath.collection, CLOUD.storeDocPath.docId);
      app.cloud.unsubStore = onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        app.applyStoreDocToApp(snap.data());
      }, (err) => {
        console.warn('[RSC POS] onSnapshot error:', err);
      });
    } catch (err) {
      console.warn('[RSC POS] Could not start employees listener:', err);
    }
  },

  // ---------- UI REFRESH ----------
  refreshUI: () => {
    if (hasEl('order-number')) $('order-number').innerText = app.data.orderCounter;

    app.renderLogin();
    app.updateSidebar();

    const active = document.querySelector('.view.active');
    if (active) {
      if (active.id === 'view-pos') app.renderPOS();
      if (active.id === 'view-barista') app.renderBarista();
      if (active.id === 'view-dashboard') app.renderDashboard();
      if (active.id === 'view-inventory') app.renderInventory();
      if (active.id === 'view-manager') app.renderManagerHub();
    }
  },

  // ---------- NAVIGATION ----------
  updateSidebar: () => {
    const manLink = $('nav-manager');
    const itLink = $('nav-it');
    if (manLink) manLink.classList.add('hidden');
    if (itLink) itLink.classList.add('hidden');

    if (app.data.currentCashier === 'Manager') {
      if (manLink) manLink.classList.remove('hidden');
    } else if (app.data.currentCashier === 'IT Support') {
      if (itLink) itLink.classList.remove('hidden');
      if (manLink) manLink.classList.remove('hidden');
    }
  },

  navigate: (view) => {
    const viewId = `view-${view}`;

    document.querySelectorAll('#sidebar .nav-links li').forEach(li => {
      li.classList.toggle('active', li.getAttribute('id') === `nav-${view}`);
    });

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = $(viewId);
    if (target) target.classList.add('active');

    switch (view) {
      case 'pos': app.renderPOS(); break;
      case 'barista': app.renderBarista(); break;
      case 'dashboard': app.renderDashboard(); break;
      case 'inventory': app.renderInventory(); break;
      case 'time': app.renderTimeClock(); break;
      case 'manager': app.renderManagerHub(); break;
      case 'it': app.renderITHub(); break;
    }
  },

  // ---------- LOGIN ----------
  renderLogin: () => {
    // Student/employee grid
    const c = $('student-login-grid');
    if (c) {
      const staff = app.data.employees
        .filter(e => !isAdminRole(e.role)); // exclude Manager/IT Admin from student grid

      c.innerHTML = staff.map(e => `
        <div class="login-btn-wrap" onclick="app.login('${String(e.name).replace(/'/g, "\\'")}')">
          <img src="${e.img}" class="login-btn-img" onerror="this.src='images/placeholder.png'">
          <span class="login-btn-name">${e.name}</span>
        </div>
      `).join('');
    }

    // Admin login buttons (these are separate from the new landing buttons btnManager/btnIT)
    const adminContainer = $('admin-login-buttons');
    if (adminContainer) {
      adminContainer.innerHTML = `
        <div class="admin-login-btn" onclick="app.login('Manager')">
          <i class="fa-solid fa-user-tie"></i> Manager
        </div>
        <div class="admin-login-btn" onclick="app.login('IT Support')">
          <i class="fa-solid fa-microchip"></i> IT Support
        </div>
      `;
    }
  },

  getAdminPinFromCloud: (which /* 'manager' | 'it' */) => {
    // 1) doc-level override
    if (which === 'manager' && app.cloud.managerPin) return app.cloud.managerPin;
    if (which === 'it' && app.cloud.itPin) return app.cloud.itPin;

    // 2) employee-based pin
    const wantedRole = (which === 'manager') ? "Manager" : "IT Admin";
    const emp = app.data.employees.find(e => normalizeRole(e.role) === wantedRole && e.pin);
    if (emp && emp.pin) return emp.pin;

    // 3) fallback
    return which === 'manager' ? CLOUD.fallbackPins.manager : CLOUD.fallbackPins.it;
  },

  login: (name) => {
    // Admin buttons from the main screen are "Manager" and "IT Support"
    if (name === 'Manager') {
      app.requestPin((pin) => {
        const correct = app.getAdminPinFromCloud('manager');
        if (String(pin) === String(correct)) app.completeLogin("Manager", "Manager");
        else app.showAlert("Incorrect PIN", "Access Denied");
      });
      return;
    }

    if (name === 'IT Support') {
      app.requestPin((pin) => {
        const correct = app.getAdminPinFromCloud('it');
        if (String(pin) === String(correct)) app.completeLogin("IT Support", "IT Admin");
        else app.showAlert("Incorrect PIN", "Access Denied");
      });
      return;
    }

    // Normal employee login by name
    const emp = app.data.employees.find(e => e.name === name);
    if (!emp) return app.showAlert(`No employee found: ${name}`);

    // Optional: if you later add employee PIN login for non-admins
    // you can enforce it here if emp.pin exists.
    app.completeLogin(emp.name, emp.role);
  },

  completeLogin: (name, role) => {
    app.data.currentCashier = name;

    let imgUrl = 'images/placeholder.png';
    const emp = app.data.employees.find(e => e.name === name);
    if (emp) imgUrl = emp.img || imgUrl;

    const header = $('header-cashier');
    if (header) {
      header.innerHTML = `<img src="${imgUrl}" class="cashier-avatar" onerror="this.src='images/placeholder.png'"> ${name}`;
    }

    // Hide overlay if it exists
    const overlay = $('login-overlay');
    if (overlay) overlay.style.display = 'none';

    app.updateSidebar();

    const r = normalizeRole(role);

    if (r === 'Manager') {
      app.managerState.activeTab = 'overview';
      app.navigate('manager');
      app.renderManagerHub();
    } else if (r === 'IT Admin') {
      app.navigate('it');
      app.renderITHub();
    } else {
      app.navigate('pos');
      app.renderPOS();
    }
  },

  logout: () => {
    app.data.currentCashier = null;
    const overlay = $('login-overlay');
    if (overlay) overlay.style.display = 'flex';
  },

  requestPin: (callback) => {
    app.pinBuffer = "";
    app.pinCallback = callback;

    safeText($('pin-display'), "");
    safeText($('pin-error'), "");

    const modal = $('modal-pin');
    if (modal) modal.classList.add('open');
    else app.showAlert("PIN modal not found in HTML (modal-pin)");
  },

  pinInput: (num) => {
    app.pinBuffer += num;
    safeText($('pin-display'), "*".repeat(app.pinBuffer.length));
  },

  pinClear: () => {
    app.pinBuffer = "";
    safeText($('pin-display'), "");
  },

  pinSubmit: () => {
    const modal = $('modal-pin');
    if (modal) modal.classList.remove('open');
    if (app.pinCallback) app.pinCallback(app.pinBuffer);
  },

  // ---------- POS ----------
  renderPOS: () => {
    const cats = ["Beverages", "Baked Goods", "Snacks", "Merch"];
    const ex = [...new Set(app.data.products.map(p => p.cat))];
    ex.forEach(c => { if (!cats.includes(c)) cats.push(c); });

    const catContainer = $('pos-categories');
    if (catContainer) {
      catContainer.innerHTML =
        `<div class="cat-tab active" onclick="app.filterPOS('All', this)">All</div>` +
        cats.map(c => `<div class="cat-tab" onclick="app.filterPOS('${c}', this)">${c}</div>`).join('');
    }
    app.filterPOS('All');
    app.renderCart();
  },

  filterPOS: (cat, tabEl) => {
    if (tabEl) {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tabEl.classList.add('active');
    }
    const grid = $('pos-grid');
    if (!grid) return;

    const prods = cat === 'All' ? app.data.products : app.data.products.filter(p => p.cat === cat);

    grid.innerHTML = prods.map(p => `
      <div class="product-card" onclick="app.addToCart(${p.id})">
        <img src="${p.img}" class="p-image" onerror="this.src='images/placeholder.png'">
        <div class="p-details">
          <div class="p-name">${p.name}</div>
          <div class="p-price">$${p.price.toFixed(2)}</div>
          <div class="p-stock" style="color:${p.stock < 5 ? 'red' : 'green'}">${p.stock} in stock</div>
        </div>
      </div>
    `).join('');
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
    const container = $('options-container');
    const noteEl = $('opt-custom-note');
    if (noteEl) noteEl.value = "";
    if (!container) return;

    container.innerHTML = "";

    if (p.options) {
      p.options.forEach(optGroup => {
        const groupDiv = document.createElement('div');
        groupDiv.innerHTML = `<h4>${optGroup.name}</h4>`;
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'opt-buttons';

        if (optGroup.type === 'select' || optGroup.type === 'radio') {
          optGroup.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'opt-btn';
            btn.innerText = choice.name + (choice.price ? ` (+$${choice.price.toFixed(2)})` : '');
            btn.onclick = () => {
              buttonsDiv.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              app.data.tempOptions[optGroup.name] = choice;
            };
            buttonsDiv.appendChild(btn);
          });
        } else if (optGroup.type === 'toggle') {
          const btn = document.createElement('button');
          btn.className = 'opt-btn';
          btn.innerText = optGroup.choice.name + (optGroup.choice.price ? ` (+$${optGroup.choice.price.toFixed(2)})` : '');
          btn.onclick = () => {
            btn.classList.toggle('selected');
            if (btn.classList.contains('selected')) app.data.tempOptions[optGroup.name] = optGroup.choice;
            else delete app.data.tempOptions[optGroup.name];
          };
          buttonsDiv.appendChild(btn);
        }
        groupDiv.appendChild(buttonsDiv);
        container.appendChild(groupDiv);
      });
    }

    const modal = $('modal-options');
    if (modal) modal.classList.add('open');
  },

  confirmOptions: () => {
    const noteEl = $('opt-custom-note');
    const note = noteEl ? noteEl.value : "";
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

    app.closeModal('modal-options');
    app.renderCart();
  },

  removeFromCart: (key) => {
    app.data.cart = app.data.cart.filter(i => i._key !== key);
    app.renderCart();
  },

  renderCart: () => {
    const list = $('cart-list');
    if (!list) return;

    const rate = app.data.settings.taxRate ?? 0.0925;

    if (app.data.cart.length === 0) {
      list.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>';
      safeText($('pos-subtotal'), "$0.00");
      safeText($('pos-tax'), "$0.00");
      safeText($('pos-total'), "$0.00");
      return;
    }

    list.innerHTML = app.data.cart.map(i => `
      <div class="cart-item">
        <div style="flex-grow:1">
          <div style="font-weight:bold">${i.name}</div>
          <div style="font-size:0.8rem; color:#666;">${i.opts || ''}</div>
        </div>
        <div style="font-weight:bold">$${i.price.toFixed(2)}</div>
        <div onclick="app.removeFromCart(${i._key})" style="margin-left:10px; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i></div>
      </div>
    `).join('');

    const sub = app.data.cart.reduce((s, i) => s + i.price, 0);
    const tax = sub * rate;
    const total = sub + tax;

    safeText($('pos-subtotal'), `$${sub.toFixed(2)}`);
    safeText($('pos-tax'), `$${tax.toFixed(2)}`);
    safeText($('pos-total'), `$${total.toFixed(2)}`);
  },

  // ---------- PAYMENT ----------
  validateAndPay: (method) => {
    if (app.data.cart.length === 0) return app.showAlert("Cart is empty");
    const nameEl = $('customer-name');
    const name = nameEl ? nameEl.value.trim() : "";
    if (!name) return app.showAlert("Please enter customer name");

    if (method === 'Cash') {
      app.data.tempCashEntry = "";
      safeText($('calc-display'), "$0.00");
      const cr = $('change-result');
      if (cr) cr.style.display = 'none';
      const modal = $('modal-cash');
      if (modal) modal.classList.add('open');
    } else {
      app.processPayment(method);
    }
  },

  calcInput: (v) => {
    if (v === '.' && app.data.tempCashEntry.includes('.')) return;
    app.data.tempCashEntry += v;
    app.updateCalc();
  },
  calcClear: () => { app.data.tempCashEntry = ""; app.updateCalc(); },
  calcExact: () => {
    const rate = app.data.settings.taxRate ?? 0.0925;
    const t = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0) * (1 + rate);
    app.data.tempCashEntry = t.toFixed(2);
    app.updateCalc();
  },
  calcNext: (n) => {
    app.data.tempCashEntry = n.toString();
    app.updateCalc();
  },
  updateCalc: () => {
    const val = parseFloat(app.data.tempCashEntry) || 0;
    safeText($('calc-display'), `$${val.toFixed(2)}`);

    const rate = app.data.settings.taxRate ?? 0.0925;
    const total = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0) * (1 + rate);

    const change = val - total;
    const cr = $('change-result');
    if (cr) cr.style.display = change >= 0 ? 'block' : 'none';
    safeText($('change-amt'), `$${change.toFixed(2)}`);
  },

  finalizeCash: () => {
    const rate = app.data.settings.taxRate ?? 0.0925;
    const total = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0) * (1 + rate);
    const tender = parseFloat(app.data.tempCashEntry);
    if (tender < total - 0.01) return app.showAlert("Insufficient funds.");
    app.processPayment('Cash');
    app.closeModal('modal-cash');
  },

  processPayment: (method) => {
    const rate = app.data.settings.taxRate ?? 0.0925;
    const total = app.data.cart.reduce((s, i) => s + i.price, 0) * (1 + rate);

    const custEl = $('customer-name');
    const customer = custEl ? custEl.value : "";

    const order = {
      id: app.data.orderCounter++,
      date: new Date().toLocaleString(),
      customer,
      items: [...app.data.cart],
      total,
      method,
      cashier: app.data.currentCashier,
      status: 'Pending'
    };

    app.data.orders.unshift(order);

    app.data.cart.forEach(item => {
      const p = app.data.products.find(x => x.id === item.id);
      if (p) p.stock--;
    });

    app.data.cart = [];
    if (custEl) custEl.value = "";

    app.saveData();
    app.renderCart();
    app.renderBarista();
    safeText($('order-number'), app.data.orderCounter);

    playTone(600, 'sine', 0.1);
    setTimeout(() => playTone(800, 'sine', 0.2), 150);

    app.showReceipt(order);
  },

  showReceipt: (order) => {
    const h = `
      <div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:10px; margin-bottom:10px;">
        <h3>${app.data.settings.storeName || "RISING STAR CAFE"}</h3>
        <p>${order.date}</p>
        <p>Order #${order.id} | ${order.method}</p>
        <p>Cashier: ${order.cashier}</p>
        <p>Customer: ${order.customer}</p>
      </div>
      ${order.items.map(i =>
        `<div style="display:flex; justify-content:space-between;">
          <span>${i.qty}x ${i.name}</span>
          <span>$${i.price.toFixed(2)}</span>
        </div>
        ${i.opts ? `<div style="font-size:0.8rem; color:#666">${i.opts}</div>` : ''}`
      ).join('')}
      <div style="border-top:1px dashed #000; margin-top:10px; padding-top:10px; text-align:right;">
        <strong>Total: $${order.total.toFixed(2)}</strong>
      </div>
      <div style="text-align:center; margin-top:20px; font-size:0.8rem;">Thank you!</div>
    `;

    safeHTML($('receipt-content'), h);
    const modal = $('modal-receipt');
    if (modal) modal.classList.add('open');
  },

  // ---------- MANAGER HUB ----------
  renderManagerHub: () => {
    const tab = app.managerState.activeTab;

    document.querySelectorAll('.man-nav li').forEach(li => li.classList.remove('active'));
    const tabEl = $(`mtab-${tab}`);
    if (tabEl) tabEl.classList.add('active');

    const content = $('manager-content-area');
    if (!content) return;
    content.innerHTML = '';

    if (tab === 'overview') app.renderManagerOverview(content);
    if (tab === 'inventory') app.renderManagerInventory(content);
    if (tab === 'transactions') app.renderManagerTransactions(content);
    if (tab === 'users') app.renderManagerUsers(content);
    if (tab === 'settings') app.renderManagerSettings(content);
  },

  switchManagerTab: (tab) => {
    app.managerState.activeTab = tab;
    app.renderManagerHub();
  },

  // Tab: Overview
  renderManagerOverview: (container) => {
    const today = new Date().toLocaleDateString();
    const todaysOrders = app.data.orders.filter(o => o.date.includes(today) && o.status !== 'Refunded');
    const rev = todaysOrders.reduce((s, o) => s + o.total, 0);
    const lowStock = app.data.products.filter(p => p.stock < 5).length;

    const counts = {};
    todaysOrders.forEach(o => o.items.forEach(i => counts[i.name] = (counts[i.name] || 0) + 1));
    const topItemEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const topItem = topItemEntry ? `${topItemEntry[0]} (${topItemEntry[1]})` : "N/A";

    const catCounts = {};
    todaysOrders.forEach(o => o.items.forEach(i => {
      const p = app.data.products.find(prod => prod.id === i.id);
      const c = p ? p.cat : 'Other';
      catCounts[c] = (catCounts[c] || 0) + 1;
    }));

    const totalItems = Object.values(catCounts).reduce((a, b) => a + b, 0);
    let chartHTML = `<div style="display:flex; height:20px; width:100%; background:#eee; border-radius:10px; overflow:hidden; margin-top:10px;">`;
    const colors = ['#307785', '#CB9832', '#8e44ad', '#27ae60', '#e74c3c'];
    let ci = 0;
    for (let cat in catCounts) {
      const pct = (catCounts[cat] / totalItems) * 100;
      chartHTML += `<div style="width:${pct}%; background:${colors[ci % colors.length]};" title="${cat}: ${Math.round(pct)}%"></div>`;
      ci++;
    }
    chartHTML += `</div><div style="display:flex; gap:10px; font-size:0.8rem; margin-top:5px; flex-wrap:wrap;">`;
    ci = 0;
    for (let cat in catCounts) {
      chartHTML += `<div style="display:flex; align-items:center; gap:4px;"><div style="width:8px; height:8px; background:${colors[ci % colors.length]}; border-radius:50%;"></div>${cat}</div>`;
      ci++;
    }
    chartHTML += `</div>`;
    if (totalItems === 0) chartHTML = `<div style="color:#999; font-style:italic;">No sales data today</div>`;

    container.innerHTML = `
      <h2 class="man-title">Dashboard Overview</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><h3>Today's Revenue</h3><div class="val">$${rev.toFixed(2)}</div></div>
        <div class="kpi-card"><h3>Transactions</h3><div class="val">${todaysOrders.length}</div></div>
        <div class="kpi-card"><h3>Top Seller</h3><div class="val" style="font-size:1.2rem">${topItem}</div></div>
        <div class="kpi-card"><h3>Low Stock Alerts</h3><div class="val" style="color:${lowStock > 0 ? 'var(--danger)' : 'inherit'}">${lowStock}</div></div>
      </div>
      <div style="margin-top:20px; background:white; padding:20px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <h3>Sales by Category</h3>
        ${chartHTML}
      </div>
    `;
  },

  // Tab: Inventory
  renderManagerInventory: (container) => {
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 class="man-title" style="margin:0">Inventory Management</h2>
        <div style="display:flex; gap:10px;">
          <button class="btn-sm" style="background:${app.managerState.quickStockMode ? 'var(--success)' : '#666'}" onclick="app.toggleQuickStock()">
            ${app.managerState.quickStockMode ? 'Save Stock' : '⚡ Quick Stock'}
          </button>
          <button class="btn-sm" onclick="app.openProductModal()">+ Add Product</button>
        </div>
      </div>
      <div class="man-table-wrap">
        <table class="man-table">
          <thead><tr><th>Name</th><th>Cat</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
          <tbody>
            ${app.data.products.map(p => `
              <tr>
                <td>${p.name}</td>
                <td><span class="badge">${p.cat}</span></td>
                <td>$${p.price.toFixed(2)}</td>
                <td>
                  ${app.managerState.quickStockMode
        ? `<input type="number" value="${p.stock}" style="width:60px; padding:5px;" onchange="app.updateStock(${p.id}, this.value)">`
        : `<span style="color:${p.stock < 5 ? 'red' : 'inherit'}">${p.stock}</span>`}
                </td>
                <td><button class="btn-sm" onclick="app.editProduct(${p.id})">Edit</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  toggleQuickStock: () => {
    app.managerState.quickStockMode = !app.managerState.quickStockMode;
    if (!app.managerState.quickStockMode) app.saveData();
    app.renderManagerHub();
  },

  updateStock: (id, val) => {
    const p = app.data.products.find(x => x.id === id);
    if (p) p.stock = parseInt(val, 10);
  },

  // Tab: Transactions
  renderManagerTransactions: (container) => {
    const history = [...app.data.orders].reverse();
    container.innerHTML = `
      <h2 class="man-title">Transaction History</h2>
      <div class="man-table-wrap">
        <table class="man-table">
          <thead><tr><th>ID</th><th>Time</th><th>Customer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${history.map(o => `
              <tr style="opacity:${o.status === 'Refunded' ? 0.5 : 1}">
                <td>#${o.id}</td>
                <td>${o.date}</td>
                <td>${o.customer}</td>
                <td>$${o.total.toFixed(2)}</td>
                <td>${o.status}</td>
                <td>
                  ${o.status !== 'Refunded'
        ? `<button class="btn-sm btn-danger-sm" onclick="app.refundOrder(${o.id})">Refund</button>`
        : '<span>-</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  refundOrder: (id) => {
    if (!confirm(`Are you sure you want to refund Order #${id}? This will restore stock.`)) return;
    const o = app.data.orders.find(x => x.id === id);
    if (!o || o.status === 'Refunded') return;

    o.items.forEach(item => {
      const p = app.data.products.find(prod => prod.id === item.id);
      if (p) p.stock += item.qty;
    });

    o.status = 'Refunded';
    app.saveData();
    app.renderManagerHub();
    alert(`Order #${id} refunded and stock restored.`);
  },

  // Tab: Users
  renderManagerUsers: (container) => {
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 class="man-title" style="margin:0">User Management</h2>
        <button class="btn-sm" onclick="app.openEmployeeModal()">+ Add User</button>
      </div>
      <div id="manager-emp-list" style="background:#f9f9f9; padding:15px; border-radius:8px;">
        ${app.data.employees.map(e => `
          <div style="display:flex; align-items:center; background:white; padding:10px; margin-bottom:8px; border-radius:6px; border:1px solid #ddd;">
            <img src="${e.img}" style="width:40px; height:40px; border-radius:50%; margin-right:10px; object-fit:cover;" onerror="this.src='images/placeholder.png'">
            <div style="flex:1;">
              <div style="font-weight:bold;">${e.name}</div>
              <div style="font-size:0.8rem; color:#666;">${e.role}</div>
            </div>
            <button class="btn-sm" onclick="app.editEmployee(${e.id})"><i class="fa-solid fa-pen"></i></button>
          </div>
        `).join('')}
      </div>
    `;
  },

  // Tab: Settings
  renderManagerSettings: (container) => {
    container.innerHTML = `
      <h2 class="man-title">Store Settings</h2>
      <div class="manager-box">
        <div class="form-group">
          <label>Store Name</label>
          <input type="text" id="set-name" class="form-control" value="${app.data.settings.storeName || 'Classroom Café'}">
        </div>
        <div class="form-group">
          <label>Tax Rate (Decimal, e.g. 0.0925 for 9.25%)</label>
          <input type="number" id="set-tax" class="form-control" step="0.0001" value="${app.data.settings.taxRate}">
        </div>
        <button class="btn-pay btn-gold" onclick="app.saveSettings()">Save Configuration</button>
      </div>
    `;
  },

  saveSettings: () => {
    const name = $('set-name') ? $('set-name').value : "";
    const tax = $('set-tax') ? parseFloat($('set-tax').value) : NaN;
    if (!name || isNaN(tax)) return alert("Invalid inputs");

    app.data.settings = { storeName: name, taxRate: tax };
    app.saveData();
    app.applySettings();
    alert("Settings Saved");
  },

  // ---------- IT HUB ----------
  renderITHub: () => {
    safeText($('it-db-status'), "Local Storage Active");
    safeText($('it-last-sync'), new Date().toLocaleTimeString());
    safeText($('it-storage'), (JSON.stringify(app.data).length / 1024).toFixed(2) + " KB");
  },

  // ---------- BUG + EMPLOYEE MODALS ----------
  openBugModal: () => { if ($('bug-desc')) $('bug-desc').value = ""; $('modal-bug')?.classList.add('open'); },
  submitBugReport: () => {
    const type = $('bug-type') ? $('bug-type').value : "Bug";
    const desc = $('bug-desc') ? $('bug-desc').value : "";
    if (!desc) return app.showAlert("Please describe the issue.");
    app.data.bugReports.push({ id: Date.now(), date: new Date().toLocaleString(), type, desc, author: app.data.currentCashier });
    app.saveData(); app.closeModal('modal-bug'); app.renderManagerHub(); app.showAlert("Report submitted!");
  },

  openEmployeeModal: () => {
    app.data.editingId = null;
    safeText($('emp-modal-title'), "Add New Employee");
    if ($('emp-name')) $('emp-name').value = "";
    if ($('emp-role')) $('emp-role').value = "Cashier";
    if ($('emp-img-url')) $('emp-img-url').value = "";
    $('modal-employee')?.classList.add('open');
  },

  editEmployee: (id) => {
    const emp = app.data.employees.find(e => e.id === id);
    if (!emp) return;
    app.data.editingId = id;
    safeText($('emp-modal-title'), "Edit Employee");
    if ($('emp-name')) $('emp-name').value = emp.name;
    if ($('emp-role')) $('emp-role').value = emp.role;
    if ($('emp-img-url')) $('emp-img-url').value = emp.img;
    $('modal-employee')?.classList.add('open');
  },

  saveEmployee: () => {
    const name = $('emp-name') ? $('emp-name').value : "";
    const role = $('emp-role') ? $('emp-role').value : "Cashier";
    const img = $('emp-img-url') ? $('emp-img-url').value : "";

    if (!name) return app.showAlert("Name is required");

    if (app.data.editingId) {
      const emp = app.data.employees.find(e => e.id === app.data.editingId);
      if (emp) {
        emp.name = name; emp.role = role; emp.img = img;
      }
    } else {
      const newId = app.data.employees.length ? Math.max(...app.data.employees.map(e => e.id)) + 1 : 1;
      app.data.employees.push({ id: newId, name, role, img });
    }

    app.saveData();
    app.closeModal('modal-employee');
    app.renderManagerHub();
  },

  // ---------- UTIL ----------
  closeModal: (id) => $(id)?.classList.remove('open'),

  showAlert: (msg) => {
    try { alert(msg); } catch (_) { console.log(msg); }
  },

  // ---------- CLOCK ----------
  updateClock: () => {
    const now = new Date();
    if ($('big-clock')) $('big-clock').innerText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if ($('big-date')) $('big-date').innerText = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    if ($('live-clock')) $('live-clock').innerText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  },

  // ---------- STUBS (preserved placeholders) ----------
  // Keep your existing implementations for these if they exist in your HTML/CSS versions
  renderBarista: () => { /* your existing function can stay; this is here to avoid crashes */ },
  renderDashboard: () => { /* preserved */ },
  renderInventory: () => { /* preserved */ },
  renderTimeClock: () => { /* preserved */ },
  openProductModal: () => { /* preserved */ },
  editProduct: () => { /* preserved */ },
  saveProduct: () => { /* preserved */ },
  previewImage: () => { /* preserved */ },
  renderProductOptionsUI: () => { /* preserved */ },
  addProductOptionUI: () => { /* preserved */ },
  removeProductOptionGroup: () => { /* preserved */ },
};

// Expose to inline onclick handlers in your HTML
window.app = app;

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
