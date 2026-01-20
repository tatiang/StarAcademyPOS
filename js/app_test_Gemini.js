// Rising Star Cafe POS — Main Logic (TEST_Gemini)
// v1.76

import * as DB from './firestore_test_Gemini.js';

// --- State ---
const state = {
  view: 'login', // login, pos, barista, receipt
  currentUser: null,
  storeData: { employees: [], products: [], orders: [] }, 
  cart: [],
  currentOrder: null, // For receipt
  customerName: ''
};

const TAX_RATE = 0.0925; // 9.25%

// --- DOM References ---
const mainView = document.getElementById('main-view');
const modalOverlay = document.getElementById('modal-overlay');

function getInitials(name) { return name ? name.substring(0, 2).toUpperCase() : '??'; }

// --- BOOTSTRAP ---
async function init() {
  renderLoading();
  await refreshData();
  renderLogin();
}

async function refreshData() {
  const data = await DB.getStoreData();
  if (data) {
    if(data.employees) data.employees.sort((a,b) => a.id - b.id);
    state.storeData = data;
  }
}

function renderLoading() {
  mainView.className = 'card';
  mainView.innerHTML = `<h2 style="color:#307785;">Booting System v1.76...</h2>`;
}

// --- VIEW: Login ---
function renderLogin() {
  mainView.className = 'card';
  document.body.className = ''; // Clear dashboard mode
  
  mainView.innerHTML = '';
  
  const title = document.createElement('h1');
  title.className = 'card-title';
  title.textContent = 'Rising Star Cafe Login';
  mainView.appendChild(title);

  const btnKiosk = document.createElement('button');
  btnKiosk.className = 'btn btn-primary';
  btnKiosk.innerHTML = '<span>📱</span> Customer Ordering (Kiosk)';
  mainView.appendChild(btnKiosk);

  const grid = document.createElement('div');
  grid.className = 'employee-grid';
  grid.style.marginTop = '40px';

  (state.storeData.employees || []).forEach(emp => {
    const card = document.createElement('div');
    card.className = 'emp-card';
    card.onclick = () => emp.role === 'admin' || emp.role === 'it' ? showPinPad(emp) : loginUser(emp);

    let avatarHtml = emp.img && !emp.img.includes('placeholder') 
      ? `<img src="${emp.img}" class="emp-avatar" onerror="this.style.display='none'"/>` 
      : `<div class="emp-initials">${getInitials(emp.name)}</div>`;

    card.innerHTML = `${avatarHtml}<div class="emp-name">${emp.name}</div><div class="emp-role">${emp.role}</div>`;
    grid.appendChild(card);
  });
  mainView.appendChild(grid);
  
  // Admin Buttons
  const adminDiv = document.createElement('div');
  adminDiv.className = 'admin-grid';
  adminDiv.style.marginTop = '40px';
  adminDiv.innerHTML = `<button id="btnMgr" class="btn btn-ghost" style="padding:10px 20px">Manager</button><button id="btnIT" class="btn btn-ghost" style="padding:10px 20px">IT Support</button>`;
  mainView.appendChild(adminDiv);
  
  document.getElementById('btnMgr').onclick = () => showPinPad({ name: 'Manager', role: 'admin' });
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
window.app = {
  closeModal: () => { modalOverlay.classList.remove('open'); },
  handlePin: (key) => {
    const display = document.getElementById('pinDisplay');
    if (key === 'C') pinInput = "";
    else if (key === 'GO') {
      if (pinInput.length === 4) { window.app.closeModal(); loginUser(pinUser); }
      else { display.style.color = 'red'; setTimeout(() => display.style.color = '#152149', 400); }
      return;
    } else if (pinInput.length < 4) pinInput += key;
    display.textContent = Array(4).fill(0).map((_, i) => i < pinInput.length ? "• " : "_ ").join("");
  }
};

function loginUser(user) {
  state.currentUser = user;
  state.cart = [];
  state.customerName = '';
  renderDashboard();
}

// --- VIEW: Dashboard (Shell) ---
function renderDashboard() {
  mainView.classList.remove('card');
  document.body.classList.add('dashboard-mode');
  
  mainView.innerHTML = `
    <div class="dash-container">
      <aside class="dash-sidebar">
        <div class="sidebar-brand">⭐ STAR ACADEMY</div>
        <nav class="sidebar-nav">
          <div class="nav-item active" id="navPOS" onclick="window.ui.switch('pos')">☕ POS</div>
          <div class="nav-item" id="navBarista" onclick="window.ui.switch('barista')">🔔 Barista View</div>
          <div class="nav-item">📈 Dashboard</div>
          <div class="nav-item">📦 Inventory</div>
        </nav>
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

  // Expose switcher
  window.ui = { switch: (view) => {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(view === 'pos') { document.getElementById('navPOS').classList.add('active'); renderPOS(); }
    if(view === 'barista') { document.getElementById('navBarista').classList.add('active'); renderBarista(); }
  }};
  
  renderPOS(); // Default
}

// --- SUB-VIEW: POS ---
function renderPOS() {
  const workspace = document.getElementById('workspace');
  workspace.innerHTML = `
    <div class="product-area" id="productGrid"></div>
    <div class="cart-area">
      <input type="text" id="custName" class="cart-customer-input" placeholder="Customer Name (Optional)" value="${state.customerName}" oninput="window.pos.setName(this.value)">
      <div style="font-weight:800; color:#152149; margin-bottom:10px;">Order #${Math.floor(Math.random()*9000)+1000}</div>
      <div class="cart-items" id="cartList"></div>
      <div class="cart-summary" id="cartSummary"></div>
      <div class="pay-buttons">
        <button class="btn-pay-cash" onclick="window.pos.pay('Cash')">CASH</button>
        <button class="btn-pay-card" onclick="window.pos.pay('Credit Card')">CARD</button>
      </div>
    </div>
  `;
  
  renderProductGrid();
  renderCart();
  
  // Logic Hooks
  window.pos = {
    add: (id) => {
      const p = state.storeData.products.find(x => x.id == id);
      const existing = state.cart.find(x => x.id == id);
      if (existing) existing.qty++; else state.cart.push({ ...p, qty: 1 });
      renderCart();
    },
    mod: (id, delta) => {
      const item = state.cart.find(x => x.id == id);
      if (item) {
        item.qty += delta;
        if (item.qty <= 0) state.cart = state.cart.filter(x => x.id != id);
        renderCart();
      }
    },
    setName: (val) => state.customerName = val,
    pay: async (method) => {
      if (state.cart.length === 0) return alert("Cart is empty!");
      
      const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const tax = subtotal * TAX_RATE;
      const total = subtotal + tax;

      const order = {
        id: "ORD-" + Date.now().toString().slice(-6),
        items: state.cart,
        customer: state.customerName || "Walk-in",
        subtotal, tax, total, method,
        status: 'open', // Open for Barista
        timestamp: new Date().toISOString()
      };
      
      // Save to DB
      const success = await DB.saveOrder(order);
      if(success) {
        state.currentOrder = order;
        state.cart = [];
        state.customerName = '';
        renderReceipt();
        // Refresh local data so Barista view sees it
        refreshData(); 
      }
    }
  };
}

function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = (state.storeData.products || []).map(p => `
    <div class="prod-card" onclick="window.pos.add('${p.id}')">
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
    list.innerHTML = state.cart.map(item => `
      <div class="cart-item">
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-price">$${item.price} x ${item.qty}</div>
        </div>
        <div class="item-controls">
          <button class="btn-qty" onclick="window.pos.mod('${item.id}', -1)">-</button>
          <span>${item.qty}</span>
          <button class="btn-qty" onclick="window.pos.mod('${item.id}', 1)">+</button>
        </div>
      </div>
    `).join('');
  }
  
  // Calcs
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  
  document.getElementById('cartSummary').innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    <div class="summary-row"><span>Tax (9.25%)</span><span>$${tax.toFixed(2)}</span></div>
    <div class="total-row"><span>Total</span><span>$${total.toFixed(2)}</span></div>
  `;
}

// --- SUB-VIEW: Receipt ---
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
           Date: ${new Date().toLocaleDateString()}
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
async function renderBarista() {
  await refreshData(); // Get latest
  const ws = document.getElementById('workspace');
  // Filter active orders from the big list
  const allOrders = state.storeData.orders || [];
  const openOrders = allOrders.filter(o => o.status === 'open');

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
          ${o.items.map(i => `<div class="order-item">⬜ <strong>${i.qty}</strong> ${i.name}</div>`).join('')}
        </div>
        <button class="btn-complete" onclick="window.barista.done('${o.id}')">✅ Complete</button>
      </div>
    `).join('')}
  </div>`;
  
  window.barista = {
    done: async (oid) => {
      // Find order, set status 'closed', save whole array
      const idx = allOrders.findIndex(x => x.id === oid);
      if(idx !== -1) {
        allOrders[idx].status = 'closed';
        await DB.updateOrdersList(allOrders);
        renderBarista();
      }
    }
  };
}

// --- INIT ---
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
