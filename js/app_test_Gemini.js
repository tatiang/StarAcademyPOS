// Rising Star Cafe POS — Main Logic (TEST_Gemini)
// v1.73

import * as DB from './firestore_test_Gemini.js';

// --- State ---
const state = {
  currentUser: null,
  storeData: { employees: [], products: [] }, 
  cart: []
};

// --- DOM References ---
const mainView = document.getElementById('main-view');
const modalOverlay = document.getElementById('modal-overlay');

// --- Helper: Initials for Avatar ---
function getInitials(name) {
  return name ? name.substring(0, 2).toUpperCase() : '??';
}

// --- BOOTSTRAP ---
async function init() {
  renderLoading();
  // Fetch real data from Firestore
  const data = await DB.getStoreData();
  
  if (data) {
    // Sort employees by ID to keep order consistent
    if(data.employees) data.employees.sort((a,b) => a.id - b.id);
    state.storeData = data;
    renderLogin();
  } else {
    mainView.innerHTML = `
      <div class="status-row" style="color:#ef4444; font-weight:bold;">
        ⚠ Connection Failed <br> Could not load 'stores/classroom_cafe_main'
      </div>`;
  }
}

function renderLoading() {
  mainView.innerHTML = `
    <h2 style="color:#6b7280; font-weight:300;">Booting System v1.73...</h2>
    <div class="status" style="color:#9ca3af; margin-top:10px;">Connecting to Cloud Database</div>
  `;
}

// --- VIEW: Login Screen ---
function renderLogin() {
  mainView.innerHTML = ''; // Clear
  
  // 1. Title
  const title = document.createElement('h1');
  title.className = 'card-title';
  title.textContent = 'Rising Star Cafe Login';
  mainView.appendChild(title);

  // 2. Kiosk Button
  const btnKiosk = document.createElement('button');
  btnKiosk.className = 'btn btn-primary';
  btnKiosk.innerHTML = '<span>📱</span> Customer Ordering (Kiosk)';
  btnKiosk.onclick = () => alert('Kiosk Mode launching soon...');
  mainView.appendChild(btnKiosk);

  // 3. Employee Section
  const divEmp = document.createElement('div');
  divEmp.className = 'divider';
  divEmp.innerHTML = '<span>Employees</span>';
  mainView.appendChild(divEmp);

  const grid = document.createElement('div');
  grid.className = 'employee-grid';

  const emps = state.storeData.employees || [];
  if (emps.length === 0) grid.innerHTML = '<div style="color:#999">No employees found in database.</div>';

  emps.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'emp-card';
    card.onclick = () => showPinPad(emp);

    // Check if image is placeholder or real
    let avatarHtml = '';
    if (emp.img && !emp.img.includes('placeholder')) {
       avatarHtml = `<img src="${emp.img}" class="emp-avatar" alt="${emp.name}" onerror="this.style.display='none'"/>`;
    } else {
       avatarHtml = `<div class="emp-initials">${getInitials(emp.name)}</div>`;
    }

    card.innerHTML = `
      ${avatarHtml}
      <div class="emp-name">${emp.name}</div>
      <div class="emp-role">${emp.role}</div>
    `;
    grid.appendChild(card);
  });
  mainView.appendChild(grid);

  // 4. Admin Section
  const divAdm = document.createElement('div');
  divAdm.className = 'divider';
  divAdm.innerHTML = '<span>Administration</span>';
  mainView.appendChild(divAdm);

  const adminGrid = document.createElement('div');
  adminGrid.className = 'admin-grid';
  adminGrid.innerHTML = `
    <button id="btnMgr" class="btn btn-ghost">Manager</button>
    <button id="btnIT" class="btn btn-ghost">IT Support</button>
  `;
  mainView.appendChild(adminGrid);

  // Wire buttons
  document.getElementById('btnMgr').onclick = () => renderDashboard({ name: 'Manager', role: 'Admin' });
  document.getElementById('btnIT').onclick = () => alert('System Status: ONLINE\nVersion: 1.73\nDB: Connected');
}

// --- FEATURE: PIN Pad ---
let currentPinInput = "";
let currentPinUser = null;

function showPinPad(user) {
  currentPinUser = user;
  currentPinInput = "";
  document.getElementById('pinDisplay').textContent = "_ _ _ _";
  document.getElementById('pinName').textContent = "Hello, " + user.name;
  
  // OPEN THE MODAL
  modalOverlay.classList.add('open');
}

window.app = {
  closeModal: () => {
    modalOverlay.classList.remove('open');
    currentPinUser = null;
  },
  
  handlePin: (key) => {
    const display = document.getElementById('pinDisplay');
    
    if (key === 'C') {
      currentPinInput = "";
    } else if (key === 'GO') {
      // Allow any 4 digits for testing
      if (currentPinInput.length === 4) {
        window.app.closeModal();
        renderDashboard(currentPinUser);
      } else {
        // Shake/Red effect
        display.style.color = '#ef4444';
        setTimeout(() => display.style.color = '#111', 400);
      }
      return;
    } else {
      if (currentPinInput.length < 4) currentPinInput += key;
    }

    // Render Dots
    let html = "";
    for(let i=0; i<4; i++) {
      html += (i < currentPinInput.length) ? "• " : "_ ";
    }
    display.textContent = html;
  }
};

// --- VIEW: Dashboard ---
function renderDashboard(user) {
  state.currentUser = user;
  document.body.classList.add('dashboard-mode');

  // Build the Dashboard HTML
  mainView.innerHTML = `
    <div class="dash-container">
      <aside class="dash-sidebar">
        <div class="sidebar-brand">
           ⭐ STAR ACADEMY
        </div>
        <nav class="sidebar-nav">
          <a href="#" class="nav-item active">☕ POS</a>
          <a href="#" class="nav-item">🔔 Barista View</a>
          <a href="#" class="nav-item">📈 Dashboard</a>
          <a href="#" class="nav-item">📦 Inventory</a>
          <a href="#" class="nav-item">🕒 Time Clock</a>
        </nav>
        <div class="sidebar-footer">
          <button class="btn-logout" onclick="window.location.reload()">↪ Sign Out</button>
        </div>
      </aside>

      <main class="dash-main">
        <header class="dash-header">
          <div class="user-badge">👤 ${user.name}</div>
          <div style="font-size:14px; opacity:0.9;">🟢 Cloud Sync | ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </header>
        
        <div class="pos-layout">
          <div class="product-area" id="productArea">
            </div>
          
          <div class="cart-area">
            <div class="cart-header">
              <div class="cart-title">Current Order</div>
              <div style="color:#6b7280">#001</div>
            </div>
            
            <div class="cart-items" id="cartItems">
              <div class="cart-empty">Cart is empty</div>
            </div>
            
            <div class="cart-summary">
              <div class="summary-row"><span>Subtotal</span><span>$0.00</span></div>
              <div class="summary-row"><span>Tax (9.25%)</span><span>$0.00</span></div>
              <div class="total-row"><span>Total</span><span>$0.00</span></div>
              <button class="btn btn-pay">Pay Now</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  renderProducts();
}

function renderProducts() {
  const container = document.getElementById('productArea');
  const products = state.storeData.products || [];

  if (products.length === 0) {
    container.innerHTML = "<div>No products loaded from Firestore</div>";
    return;
  }

  container.innerHTML = products.map(p => {
    // Determine image logic
    let img = `<div style="height:100px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; margin-bottom:10px; border-radius:8px; color:#ccc; font-size:30px;">☕</div>`;
    if (p.img && !p.img.includes('placeholder')) {
        img = `<img src="${p.img}" class="prod-img" onerror="this.style.display='none'"/>`;
    }

    return `
    <div class="prod-card" onclick="alert('Add to cart: ${p.name}')">
      <span class="prod-stock">x${p.stock || 0}</span>
      ${img}
      <div class="prod-name">${p.name}</div>
      <div class="prod-price">$${Number(p.price).toFixed(2)}</div>
    </div>
    `;
  }).join('');
}

// --- Init ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
