// Rising Star Cafe POS — Main Logic (TEST_Gemini)
// v1.72

import * as DB from './firestore_test_Gemini.js';

// --- State ---
const state = {
  currentUser: null,
  storeData: { employees: [], products: [] }, // Cache
  cart: []
};

// --- DOM References ---
const mainView = document.getElementById('main-view');
const modalOverlay = document.getElementById('modal-overlay');

// --- Helper: Clear View ---
function clearView() {
  mainView.innerHTML = '';
}

// --- BOOTSTRAP ---
async function init() {
  renderLoading();
  // Fetch real data from Firestore
  const data = await DB.getStoreData();
  if (data) {
    state.storeData = data;
    renderLogin();
  } else {
    mainView.innerHTML = `<div class="status" style="color:red">Failed to load Store Data. Check Console.</div>`;
  }
}

// --- VIEW: Loading ---
function renderLoading() {
  mainView.innerHTML = `
    <div class="status-row">
      <div class="status">Connecting to Firestore...</div>
    </div>`;
}

// --- VIEW: Login (Employee Grid) ---
function renderLogin() {
  clearView();
  
  // Header
  const header = document.createElement('h1');
  header.className = 'card-title';
  header.textContent = 'Rising Star Cafe Login';
  mainView.appendChild(header);

  // Kiosk Button
  const kioskBtn = document.createElement('button');
  kioskBtn.className = 'btn btn-primary';
  kioskBtn.innerHTML = '<span class="btn-icon">📱</span> Customer Ordering (Kiosk)';
  mainView.appendChild(kioskBtn);

  // Employee Grid Container
  const gridLabel = document.createElement('div');
  gridLabel.className = 'divider';
  gridLabel.innerHTML = '<span>EMPLOYEES</span>';
  mainView.appendChild(gridLabel);

  const empGrid = document.createElement('div');
  empGrid.className = 'employee-grid';

  // Sort employees by ID or Name
  const employees = state.storeData.employees || [];
  
  if (employees.length === 0) {
    empGrid.innerHTML = '<div style="text-align:center; width:100%">No employees found in DB.</div>';
  }

  employees.forEach(emp => {
    const btn = document.createElement('button');
    btn.className = 'emp-card';
    // Use a default avatar if img path is generic
    const imgSrc = (emp.img && emp.img.includes('placeholder')) 
      ? 'https://ui-avatars.com/api/?name=' + emp.name + '&background=random' 
      : emp.img;
      
    btn.innerHTML = `
      <img src="${imgSrc}" class="emp-avatar" alt="${emp.name}" />
      <div class="emp-name">${emp.name}</div>
      <div class="emp-role">${emp.role}</div>
    `;
    btn.onclick = () => showPinPad(emp);
    empGrid.appendChild(btn);
  });

  mainView.appendChild(empGrid);

  // Admin Footer
  const adminDiv = document.createElement('div');
  adminDiv.className = 'divider';
  adminDiv.innerHTML = '<span>ADMINISTRATION</span>';
  mainView.appendChild(adminDiv);
  
  const adminGrid = document.createElement('div');
  adminGrid.className = 'admin-grid';
  adminGrid.innerHTML = `
    <button class="btn btn-ghost" id="btnLoginManager">Manager</button>
    <button class="btn btn-ghost" id="btnLoginIT">IT Support</button>
  `;
  mainView.appendChild(adminGrid);

  // Wire Admin buttons to fake login for now
  document.getElementById('btnLoginManager').onclick = () => renderDashboard('Manager');
  document.getElementById('btnLoginIT').onclick = () => alert('IT Console active');
}

// --- FEATURE: PIN Pad Modal ---
let currentPinUser = null;
let currentPinInput = "";

function showPinPad(user) {
  currentPinUser = user;
  currentPinInput = "";
  
  modalOverlay.innerHTML = `
    <div class="pin-modal">
      <h2>Hello, ${user.name}</h2>
      <p>Enter your PIN to login</p>
      <div class="pin-display" id="pinDisplay">_ _ _ _</div>
      <div class="pin-pad">
        <button onclick="window.app.handlePin('1')">1</button>
        <button onclick="window.app.handlePin('2')">2</button>
        <button onclick="window.app.handlePin('3')">3</button>
        <button onclick="window.app.handlePin('4')">4</button>
        <button onclick="window.app.handlePin('5')">5</button>
        <button onclick="window.app.handlePin('6')">6</button>
        <button onclick="window.app.handlePin('7')">7</button>
        <button onclick="window.app.handlePin('8')">8</button>
        <button onclick="window.app.handlePin('9')">9</button>
        <button onclick="window.app.handlePin('C')" style="color:#ef4444">C</button>
        <button onclick="window.app.handlePin('0')">0</button>
        <button onclick="window.app.handlePin('GO')" style="background:#10b981; color:white">➜</button>
      </div>
      <button class="btn-close-modal" onclick="window.app.closeModal()">Cancel</button>
    </div>
  `;
  modalOverlay.hidden = false;
}

window.app = {
  // Expose PIN logic to HTML
  handlePin: (key) => {
    const display = document.getElementById('pinDisplay');
    
    if (key === 'C') {
      currentPinInput = "";
    } else if (key === 'GO') {
      // Mock validation: In real app, check against DB
      if (currentPinInput.length === 4) {
        window.app.closeModal();
        renderDashboard(currentPinUser);
      } else {
        display.style.color = 'red';
        setTimeout(() => display.style.color = 'inherit', 500);
      }
      return;
    } else {
      if (currentPinInput.length < 4) currentPinInput += key;
    }
    
    // Update display (show dots)
    let masked = "";
    for(let i=0; i<4; i++) {
      masked += (i < currentPinInput.length) ? "• " : "_ ";
    }
    display.textContent = masked;
  },
  
  closeModal: () => {
    modalOverlay.hidden = true;
    currentPinUser = null;
  }
};

// --- VIEW: Dashboard (POS / Manager) ---
function renderDashboard(user) {
  state.currentUser = user;
  
  // Enable Dark Mode Container
  document.body.classList.add('dashboard-mode');
  
  // Sidebar + Main Content Layout
  const html = `
    <div class="dash-container">
      <aside class="dash-sidebar">
        <div class="sidebar-brand">
          <div class="icon">⭐</div>
          <div>STAR ACADEMY</div>
        </div>
        
        <nav class="sidebar-nav">
          <a href="#" class="active">☕ POS</a>
          <a href="#">🔔 Barista View</a>
          <a href="#">📈 Dashboard</a>
          <a href="#">📦 Inventory</a>
          <a href="#">🕒 Time Clock</a>
        </nav>
        
        <div class="sidebar-footer">
           <button onclick="window.location.reload()" class="btn-logout">↪ Sign Out</button>
        </div>
      </aside>

      <main class="dash-main">
        <header class="dash-header">
          <div class="user-info">👤 ${user.name || user}</div>
          <div class="sys-info">🟢 Cloud Sync | ${new Date().toLocaleTimeString()}</div>
        </header>
        
        <div class="pos-layout">
          <div class="product-area">
             ${renderProductGrid()}
          </div>
          
          <div class="cart-area">
             <h3>Order #001</h3>
             <div class="cart-items">
                <div style="color:#aaa; text-align:center; margin-top:40px;">Cart is empty</div>
             </div>
             <div class="cart-total">
               <div>Total</div>
               <div style="font-size:24px">$0.00</div>
             </div>
             <button class="btn btn-primary" style="margin-top:10px;">Pay Now</button>
          </div>
        </div>
      </main>
    </div>
  `;
  
  mainView.innerHTML = html;
  
  // Unwrap the main view from the centered card style
  mainView.className = ''; 
}

function renderProductGrid() {
  const products = state.storeData.products || [];
  if (products.length === 0) return "<div>No products loaded</div>";
  
  return products.map(p => `
    <div class="prod-card">
      <div class="prod-name">${p.name}</div>
      <div class="prod-price">$${p.price}</div>
    </div>
  `).join('');
}


// --- INIT ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
