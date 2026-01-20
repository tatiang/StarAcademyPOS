// Rising Star Cafe POS — Main Logic (TEST_Gemini)
// v1.74

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
  const data = await DB.getStoreData();
  
  if (data) {
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
    <h2 style="color:#307785; font-weight:300;">Booting System v1.74...</h2>
    <div class="status" style="color:#64748b; margin-top:10px;">Connecting to Cloud Database</div>
  `;
}

// --- VIEW: Login Screen ---
function renderLogin() {
  mainView.innerHTML = '';
  
  const title = document.createElement('h1');
  title.className = 'card-title';
  title.textContent = 'Rising Star Cafe Login';
  mainView.appendChild(title);

  const btnKiosk = document.createElement('button');
  btnKiosk.className = 'btn btn-primary';
  btnKiosk.innerHTML = '<span>📱</span> Customer Ordering (Kiosk)';
  btnKiosk.onclick = () => alert('Kiosk Mode launching soon...');
  mainView.appendChild(btnKiosk);

  const divEmp = document.createElement('div');
  divEmp.className = 'divider';
  divEmp.innerHTML = '<span>Select User</span>';
  mainView.appendChild(divEmp);

  const grid = document.createElement('div');
  grid.className = 'employee-grid';

  const emps = state.storeData.employees || [];
  
  if (emps.length === 0) grid.innerHTML = '<div style="color:#999">No employees found.</div>';

  emps.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'emp-card';
    
    // LOGIC CHANGE: Employees login directly (No PIN)
    card.onclick = () => renderDashboard(emp); 

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

  // Admin Section
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

  // LOGIC CHANGE: Admin roles REQUIRE PIN
  document.getElementById('btnMgr').onclick = () => showPinPad({ name: 'Manager', role: 'admin' });
  document.getElementById('btnIT').onclick = () => showPinPad({ name: 'IT Support', role: 'it' });
}

// --- FEATURE: PIN Pad ---
let currentPinInput = "";
let currentPinUser = null;

function showPinPad(user) {
  currentPinUser = user;
  currentPinInput = "";
  document.getElementById('pinDisplay').textContent = "_ _ _ _";
  document.getElementById('pinName').textContent = "Login: " + user.name;
  
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
      // Simple validation: Any 4 digits allowed for now
      if (currentPinInput.length === 4) {
        window.app.closeModal();
        renderDashboard(currentPinUser);
      } else {
        display.style.color = '#ef4444';
        setTimeout(() => display.style.color = '#152149', 400);
      }
      return;
    } else {
      if (currentPinInput.length < 4) currentPinInput += key;
    }

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
          <div style="font-weight:bold; font-size:18px;">👤 ${user.name} <span style="font-weight:400; opacity:0.8; font-size:14px;">(${user.role || 'Staff'})</span></div>
          <div style="font-size:14px; opacity:0.9;">🟢 Online | ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </header>
        
        <div class="pos-layout">
          <div class="product-area" id="productArea"></div>
          
          <div class="cart-area">
            <div style="font-size:20px; font-weight:800; color:#152149; margin-bottom:10px;">Current Order #001</div>
            <div class="cart-items" id="cartItems" style="flex:1; border-top:1px solid #eee; border-bottom:1px solid #eee;">
              <div style="text-align:center; color:#999; margin-top:50px;">Cart is empty</div>
            </div>
            <div style="padding-top:20px;">
              <div style="display:flex; justify-content:space-between; font-weight:800; font-size:22px; color:#152149;">
                 <span>Total</span><span>$0.00</span>
              </div>
              <button class="btn btn-pay">PAY</button>
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
    container.innerHTML = "<div>No products loaded</div>";
    return;
  }

  container.innerHTML = products.map(p => {
    let img = `<div style="height:90px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; margin-bottom:10px; border-radius:8px; color:#cbd5e1; font-size:30px;">☕</div>`;
    if (p.img && !p.img.includes('placeholder')) {
        img = `<img src="${p.img}" style="width:100%; height:90px; object-fit:contain; margin-bottom:10px;" onerror="this.style.display='none'"/>`;
    }

    return `
    <div class="prod-card" onclick="alert('Added ${p.name}')">
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
