// Rising Star Cafe POS — Main Logic (TEST_Gemini)
// v1.77 (Implementing v1.42 Spec Features)

import * as DB from './firestore_test_Gemini.js';

// --- State (v1.42 Spec Compliant) ---
const state = {
  view: 'login',
  currentUser: null,
  // Mirroring the v1.42 data model
  storeData: { 
    currentCashier: '',
    cart: [],
    products: [],
    orders: [],
    employees: [],
    timeEntries: [],
    bugReports: [],
    orderCounter: 1001,
    taxRate: 0.0925
  }, 
  cart: [],
  customerName: '',
  // Temp states for modals
  tempProduct: null,
  currentOrder: null
};

// --- DOM References ---
const mainView = document.getElementById('main-view');
const modalOverlay = document.getElementById('modal-overlay');
const optionsOverlay = document.getElementById('options-overlay');
const cashOverlay = document.getElementById('cash-overlay');

function getInitials(name) { return name ? name.substring(0, 2).toUpperCase() : '??'; }

// --- BOOTSTRAP (Offline First) ---
async function init() {
  renderLoading();
  
  // 1. Load from LocalStorage immediately
  const local = localStorage.getItem('rsc_store_data');
  if (local) {
    try {
      state.storeData = JSON.parse(local);
      console.log("Loaded from LocalStorage");
    } catch(e) { console.error("Local load error", e); }
  }

  // 2. Render immediately (don't wait for cloud)
  renderLogin();

  // 3. Sync with Cloud in background
  try {
    const cloudData = await DB.getStoreData();
    if (cloudData) {
      console.log("Cloud Sync Successful");
      state.storeData = { ...state.storeData, ...cloudData };
      // Sort for UI consistency
      if(state.storeData.employees) state.storeData.employees.sort((a,b) => a.id - b.id);
      saveLocal(); // Update local
      // Only refresh if we are still on login screen to avoid disrupting user
      if(!state.currentUser) renderLogin(); 
    }
  } catch (err) {
    console.warn("Cloud offline, using local data.");
  }
}

function saveLocal() {
  localStorage.setItem('rsc_store_data', JSON.stringify(state.storeData));
}

async function saveToCloud() {
  saveLocal();
  await DB.saveStoreData(state.storeData);
}

function renderLoading() {
  mainView.className = 'card';
  mainView.innerHTML = `<h2 style="color:#307785;">Booting System v1.77...</h2>`;
}

// --- VIEW: Login ---
function renderLogin() {
  mainView.className = 'card';
  document.body.className = ''; 
  mainView.innerHTML = '';
  
  const title = document.createElement('h1');
  title.className = 'card-title';
  title.textContent = 'Rising Star Cafe Login';
  mainView.appendChild(title);

  const btnKiosk = document.createElement('button');
  btnKiosk.className = 'btn btn-primary';
  btnKiosk.innerHTML = '<span>📱</span> Customer Ordering (Kiosk)';
  mainView.appendChild(btnKiosk);

  const divEmp = document.createElement('div');
  divEmp.className = 'divider';
  divEmp.innerHTML = '<span>Select User</span>';
  mainView.appendChild(divEmp);

  const grid = document.createElement('div');
  grid.className = 'employee-grid';

  (state.storeData.employees || []).forEach(emp => {
    const card = document.createElement('div');
    card.className = 'emp-card';
    // Logic: Admin roles need PIN, Students don't
    const needsPin = (emp.role === 'admin' || emp.role === 'it' || emp.role === 'manager');
    card.onclick = () => needsPin ? showPinPad(emp) : loginUser(emp);

    let avatarHtml = emp.img && !emp.img.includes('placeholder') 
      ? `<img src="${emp.img}" class="emp-avatar" onerror="this.style.display='none'"/>` 
      : `<div class="emp-initials">${getInitials(emp.name)}</div>`;

    card.innerHTML = `${avatarHtml}<div class="emp-name">${emp.name}</div><div class="emp-role">${emp.role}</div>`;
    grid.appendChild(card);
  });
  mainView.appendChild(grid);
  
  // Admin Footer
  const adminDiv = document.createElement('div');
  adminDiv.className = 'divider';
  adminDiv.innerHTML = '<span>Administration</span>';
  mainView.appendChild(adminDiv);
  
  const adminGrid = document.createElement('div');
  adminGrid.className = 'admin-grid';
  adminGrid.innerHTML = `
    <button id="btnMgr" class="btn btn-ghost" style="padding:10px 20px">Manager</button>
    <button id="btnIT" class="btn btn-ghost" style="padding:10px 20px">IT Support</button>
  `;
  mainView.appendChild(adminGrid);
  
  document.getElementById('btnMgr').onclick = () => showPinPad({ name: 'Manager', role: 'manager' });
  document.getElementById('btnIT').onclick = () => showPinPad({ name: 'IT Support', role: 'it' });
}

// --- PIN Logic ---
let pinInput = "";
let pinUser = null;
function showPinPad(user) {
  pinUser = user; pinInput = "";
  document.getElementById('pinDisplay').textContent = "_ _ _ _";
  document.getElementById('pinName').textContent = "Login: " + user.name;
  modalOverlay.classList.add('open');
}
// Expose handlers
window.app = window.app || {};
window.app.closeModal = () => modalOverlay.classList.remove('open');
window.app.handlePin = (key) => {
  const display = document.getElementById('pinDisplay');
  if (key === 'C') pinInput = "";
  else if (key === 'GO') {
    // Spec: Manager=1234, IT=9753
    let valid = false;
    if (pinUser.role === 'manager' && pinInput === '1234') valid = true;
    else if (pinUser.role === 'it' && pinInput === '9753') valid = true;
    else if (pinUser.role === 'admin' && (pinInput === '1234' || pinInput === '9753')) valid = true; // Fallback
    
    if (valid) { window.app.closeModal(); loginUser(pinUser); }
    else { display.style.color = 'red'; setTimeout(() => display.style.color = '#152149', 400); }
    return;
  } else if (pinInput.length < 4) pinInput += key;
  display.textContent = Array(4).fill(0).map((_, i) => i < pinInput.length ? "• " : "_ ").join("");
};

function loginUser(user) {
  state.currentUser = user;
  state.cart = [];
  state.customerName = '';
  renderDashboard();
}

// --- VIEW: Dashboard Shell ---
function renderDashboard() {
  mainView.classList.remove('card');
  document.body.classList.add('dashboard-mode');
  
  // Sidebar Items based on Role
  let navItems = `
    <div class="nav-item active" onclick="window.ui.switch('pos', this)">☕ POS</div>
    <div class="nav-item" onclick="window.ui.switch('barista', this)">🔔 Barista View</div>
    <div class="nav-item" onclick="window.ui.switch('inventory', this)">📦 Inventory</div>
    <div class="nav-item" onclick="window.ui.switch('timeclock', this)">🕒 Time Clock</div>
  `;
  
  if (state.currentUser.role === 'manager' || state.currentUser.role === 'it') {
    navItems += `<div class="nav-item" onclick="window.ui.switch('dashboard', this)">📈 Dashboard</div>`;
  }

  mainView.innerHTML = `
    <div class="dash-container">
      <aside class="dash-sidebar">
        <div class="sidebar-brand">⭐ STAR ACADEMY</div>
        <nav class="sidebar-nav">${navItems}</nav>
        <div class="sidebar-footer">
          <button class="btn-logout" onclick="window.location.reload()">↪ Sign Out</button>
        </div>
      </aside>
      <main class="dash-main">
        <header class="dash-header">
          <div style="font-weight:bold; font-size:18px;">👤 ${state.currentUser.name}</div>
          <div style="font-size:14px;">🟢 Online</div>
        </header>
        <div id="workspace" class="pos-layout"></div>
      </main>
    </div>`;

  renderPOS(); // Default view
}

window.ui = {
  switch: (view, el) => {
    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
    if(el) el.classList.add('active');
    
    const ws = document.getElementById('workspace');
    ws.innerHTML = ''; // clear
    ws.className = (view === 'pos') ? 'pos-layout' : 'std-layout'; // switch layout mode

    if(view === 'pos') renderPOS();
    if(view === 'barista') renderBarista();
    if(view === 'inventory') renderInventory();
    if(view === 'timeclock') renderTimeClock();
    if(view === 'dashboard') ws.innerHTML = '<div style="padding:40px; text-align:center; color:#666">Manager Dashboard features coming soon...</div>';
  }
};

// --- SUB-VIEW: POS ---
function renderPOS() {
  const ws = document.getElementById('workspace');
  ws.innerHTML = `
    <div class="product-area" id="productGrid"></div>
    <div class="cart-area">
      <input type="text" id="custName" class="cart-customer-input" placeholder="Customer Name (Required)" value="${state.customerName}" oninput="state.customerName = this.value">
      <div style="font-weight:800; color:#152149; margin-bottom:10px;">Order #${state.storeData.orderCounter}</div>
      <div class="cart-items" id="cartList"></div>
      <div class="cart-summary" id="cartSummary"></div>
      <div class="pay-buttons">
        <button class="btn-pay-cash" onclick="window.pos.payCheck('Cash')">CASH</button>
        <button class="btn-pay-card" onclick="window.pos.payCheck('Card')">CARD</button>
      </div>
    </div>
  `;
  renderProductGrid();
  renderCart();
}

function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = (state.storeData.products || []).map(p => `
    <div class="prod-card" onclick="window.pos.clickProduct('${p.id}')">
      <div style="height:80px; display:flex; align-items:center; justify-content:center; font-size:30px; background:#f8fafc; border-radius:8px; margin-bottom:10px;">
        ${p.img && !p.img.includes('placeholder') ? `<img src="${p.img}" style="height:100%; object-fit:contain">` : '☕'}
      </div>
      <div class="prod-name">${p.name}</div>
      <div class="prod-price">$${Number(p.price).toFixed(2)}</div>
    </div>
  `).join('');
}

function renderCart() {
  const list = document.getElementById('cartList');
  if (state.cart.length === 0) {
    list.innerHTML = `<div style="text-align:center; color:#ccc; margin-top:50px;">Cart is empty</div>`;
  } else {
    list.innerHTML = state.cart.map((item, idx) => `
      <div class="cart-item">
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div style="font-size:12px; color:#666">${item.note ? '📝 '+item.note : ''}</div>
          <div class="item-price">$${item.price} x ${item.qty}</div>
        </div>
        <div class="item-controls">
          <button class="btn-qty" onclick="window.pos.mod(${idx}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="btn-qty" onclick="window.pos.mod(${idx}, 1)">+</button>
          <button class="btn-qty" style="color:red; border-color:red" onclick="window.pos.del(${idx})">🗑</button>
        </div>
      </div>
    `).join('');
  }
  
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * state.storeData.taxRate;
  const total = subtotal + tax;
  
  document.getElementById('cartSummary').innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    <div class="summary-row"><span>Tax (9.25%)</span><span>$${tax.toFixed(2)}</span></div>
    <div class="total-row"><span>Total</span><span>$${total.toFixed(2)}</span></div>
  `;
}

// --- POS LOGIC & MODALS ---
window.pos = {
  clickProduct: (id) => {
    state.tempProduct = state.storeData.products.find(x => x.id == id);
    // Show Options Modal
    document.getElementById('optTitle').textContent = state.tempProduct.name;
    document.getElementById('optNote').value = '';
    optionsOverlay.classList.add('open');
  },
  mod: (idx, delta) => {
    state.cart[idx].qty += delta;
    if (state.cart[idx].qty <= 0) state.cart.splice(idx, 1);
    renderCart();
  },
  del: (idx) => {
    state.cart.splice(idx, 1);
    renderCart();
  },
  payCheck: (method) => {
    if (state.cart.length === 0) return alert("Cart is empty!");
    if (!state.customerName) return alert("Customer Name is required!");
    
    if (method === 'Cash') {
      openCashModal();
    } else {
      processPayment(method);
    }
  },
  calcChange: () => {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const total = subtotal + (subtotal * state.storeData.taxRate);
    const tendered = parseFloat(document.getElementById('cashTendered').value) || 0;
    const change = tendered - total;
    
    const display = document.getElementById('cashChangeDisplay');
    const box = document.getElementById('cashChangeBox');
    const btn = document.getElementById('btnFinalizeCash');

    if (change >= 0) {
      display.textContent = '$' + change.toFixed(2);
      box.style.backgroundColor = '#d1fae5'; // Green tint
      btn.disabled = false;
    } else {
      display.textContent = 'Insufficient';
      box.style.backgroundColor = '#f3f4f6';
      btn.disabled = true;
    }
  },
  finalizeCash: () => {
    processPayment('Cash');
    document.getElementById('cash-overlay').classList.remove('open');
  }
};

// Options Modal Actions
window.app.closeOptions = () => optionsOverlay.classList.remove('open');
window.app.confirmOptions = () => {
  const note = document.getElementById('optNote').value;
  // Aggregate if same item + same note
  const existing = state.cart.find(x => x.id === state.tempProduct.id && x.note === note);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ ...state.tempProduct, qty: 1, note: note });
  }
  optionsOverlay.classList.remove('open');
  renderCart();
};

// Cash Modal Actions
function openCashModal() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + (subtotal * state.storeData.taxRate);
  
  document.getElementById('cashTotalDisplay').textContent = '$' + total.toFixed(2);
  document.getElementById('cashTendered').value = '';
  document.getElementById('cashChangeDisplay').textContent = '$0.00';
  document.getElementById('btnFinalizeCash').disabled = true;
  document.getElementById('cash-overlay').classList.add('open');
}
window.app.closeCash = () => document.getElementById('cash-overlay').classList.remove('open');

async function processPayment(method) {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * state.storeData.taxRate;
  const total = subtotal + tax;

  const order = {
    id: "ORD-" + state.storeData.orderCounter,
    items: [...state.cart],
    customer: state.customerName,
    subtotal, tax, total, method,
    status: 'open', 
    timestamp: new Date().toISOString()
  };

  // Update State
  state.storeData.orderCounter++;
  state.storeData.orders.push(order);
  state.currentOrder = order;
  
  // Save
  saveToCloud();

  // Clear Cart & Show Receipt
  state.cart = [];
  state.customerName = '';
  renderReceipt();
}

function renderReceipt() {
  const o = state.currentOrder;
  const ws = document.getElementById('workspace');
  ws.innerHTML = `
    <div class="receipt-view">
      <h2 style="color:#152149; margin-bottom:20px;">Payment Successful!</h2>
      <div class="receipt-paper">
        <div style="text-align:center; font-weight:bold; margin-bottom:10px;">RISING STAR CAFE</div>
        <div style="border-bottom:1px dashed #ccc; padding-bottom:10px; margin-bottom:10px;">
           Order: ${o.id}<br>
           Date: ${new Date().toLocaleDateString()}<br>
           Customer: ${o.customer}
        </div>
        ${o.items.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qty} x ${i.name}</span><span>$${(i.price*i.qty).toFixed(2)}</span></div>`).join('')}
        <div style="border-top:1px dashed #ccc; margin-top:10px; padding-top:5px; text-align:right;">
          <strong>Total: $${o.total.toFixed(2)}</strong><br>
          <span style="font-size:12px; color:#666;">Paid via ${o.method}</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="window.ui.switch('pos')">New Order</button>
    </div>
  `;
}

// --- SUB-VIEW: Barista ---
function renderBarista() {
  const ws = document.getElementById('workspace');
  const openOrders = (state.storeData.orders || []).filter(o => o.status === 'open');

  if (openOrders.length === 0) {
    ws.innerHTML = `<div style="text-align:center; padding:50px; color:#888; width:100%;">No active orders. Kitchen is clear! 🧹</div>`;
    return;
  }

  ws.innerHTML = `<div class="barista-grid">
    ${openOrders.map(o => `
      <div class="order-card">
        <div class="order-header">
          <span class="order-id">#${o.id.split('-')[1]}</span>
          <span class="order-time">${new Date(o.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="font-weight:bold; margin-bottom:5px;">${o.customer}</div>
        <div class="order-items">
          ${o.items.map(i => `<div class="order-item">⬜ <strong>${i.qty}</strong> ${i.name} <br><span style="font-size:11px;color:#666;margin-left:20px">${i.note || ''}</span></div>`).join('')}
        </div>
        <button class="btn-complete" onclick="window.barista.done('${o.id}')">✅ Complete</button>
      </div>
    `).join('')}
  </div>`;
}

window.barista = {
  done: (oid) => {
    const order = state.storeData.orders.find(x => x.id === oid);
    if(order) {
      order.status = 'closed';
      saveToCloud();
      renderBarista();
    }
  }
};

// --- SUB-VIEW: Inventory ---
function renderInventory() {
  const ws = document.getElementById('workspace');
  const products = state.storeData.products || [];
  
  // Basic Table
  let html = `
    <div style="padding:20px; overflow:auto;">
      <h2 style="color:#152149;">Inventory</h2>
      <table class="inv-table">
        <thead>
          <tr>
             <th>Image</th>
             <th>Name</th>
             <th>Stock</th>
             <th>Price</th>
             <th>Action</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  products.forEach((p, idx) => {
    html += `
      <tr>
        <td>${p.img ? '📷' : ''}</td>
        <td>${p.name}</td>
        <td><span class="badge ${p.stock < 10 ? 'badge-red' : 'badge-green'}">${p.stock || 0}</span></td>
        <td>$${p.price}</td>
        <td>
           <button class="btn-sm" onclick="alert('Stock edit for ${p.name} coming soon')">Edit</button>
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  ws.innerHTML = html;
}

// --- SUB-VIEW: Time Clock ---
function renderTimeClock() {
  const ws = document.getElementById('workspace');
  ws.innerHTML = `
    <div style="padding:40px; text-align:center;">
      <h2 style="color:#152149;">Time Clock</h2>
      <div style="font-size:40px; font-weight:bold; margin:20px 0; font-family:monospace;">
        ${new Date().toLocaleTimeString()}
      </div>
      <div style="margin-bottom:20px;">Employee: <strong>${state.currentUser.name}</strong></div>
      <button class="btn btn-primary" style="max-width:300px; margin:0 auto;" onclick="alert('Punched IN at ' + new Date().toLocaleTimeString())">👊 Punch In / Out</button>
      
      <div style="margin-top:40px; text-align:left; max-width:600px; margin-left:auto; margin-right:auto;">
        <h3>Recent Activity</h3>
        <ul style="color:#666;">
           <li>Today: In at 8:00 AM</li>
           <li>Yesterday: 8:00 AM - 3:30 PM</li>
        </ul>
      </div>
    </div>
  `;
}


// --- INIT ---
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
