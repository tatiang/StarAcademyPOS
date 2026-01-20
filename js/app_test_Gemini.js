// Rising Star Cafe POS — Main Logic (TEST_Gemini)
// v1.70

import * as DB from './firestore_test_Gemini.js';

// --- State Management ---
const state = {
  view: 'home', // home, kiosk, manager, it
  managerTab: 'products' // products, employees
};

// --- DOM References ---
const mainView = document.getElementById('main-view');
const headerSuffix = document.getElementById('header-suffix');

// --- Helper: Clear View ---
function clearView() {
  mainView.innerHTML = '';
  headerSuffix.textContent = '';
}

// --- VIEW: Home / Login ---
function renderHome() {
  clearView();
  state.view = 'home';
  
  const html = `
    <h1 class="card-title">Rising Star Cafe Login</h1>
    <div class="status-row">
      <div id="connectionStatus" class="status">${DB.dbStatus() ? 'Cloud Connected' : 'Connecting...'}</div>
    </div>

    <button id="btnKiosk" class="btn btn-primary" type="button">
      <span class="btn-icon">📱</span> Customer Ordering (Kiosk)
    </button>

    <div class="divider"><span>ADMINISTRATION</span></div>

    <div class="admin-grid">
      <button id="btnManager" class="btn btn-ghost" type="button">
        <span class="btn-icon">👤</span> Manager Hub
      </button>
      <button id="btnIT" class="btn btn-ghost" type="button">
        <span class="btn-icon">🖥️</span> IT Support
      </button>
    </div>
  `;
  
  mainView.innerHTML = html;

  // Event Listeners
  document.getElementById('btnKiosk').onclick = () => alert("Kiosk Mode coming in v1.75");
  document.getElementById('btnManager').onclick = () => renderManagerHub();
  document.getElementById('btnIT').onclick = () => renderITHub();
}

// --- VIEW: Manager Hub ---
async function renderManagerHub() {
  clearView();
  state.view = 'manager';
  headerSuffix.textContent = '// MANAGER';

  // 1. Scaffold the Layout
  const container = document.createElement('div');
  container.innerHTML = `
    <button id="btnBack" class="btn-back">← Home</button>
    <h2 class="card-title">Manager Dashboard</h2>
    
    <div class="nav-tabs">
      <button id="tabProd" class="nav-tab ${state.managerTab === 'products' ? 'active' : ''}">Products</button>
      <button id="tabEmp" class="nav-tab ${state.managerTab === 'employees' ? 'active' : ''}">Employees</button>
    </div>

    <div id="managerContent">
      <div class="status-row">Loading Firestore Data...</div>
    </div>
  `;
  mainView.appendChild(container);

  // Wire Navigation
  document.getElementById('btnBack').onclick = renderHome;
  document.getElementById('tabProd').onclick = () => { state.managerTab = 'products'; renderManagerHub(); };
  document.getElementById('tabEmp').onclick = () => { state.managerTab = 'employees'; renderManagerHub(); };

  // 2. Fetch & Render Data
  const contentDiv = document.getElementById('managerContent');
  
  if (state.managerTab === 'products') {
    renderProductManager(contentDiv);
  } else {
    renderEmployeeManager(contentDiv);
  }
}

// --- SUB-VIEW: Product Manager ---
async function renderProductManager(targetDiv) {
  try {
    const products = await DB.getCollectionData('products');
    
    let html = `
      <div class="input-group">
        <input type="text" id="newProdName" class="form-input" placeholder="Product Name" />
        <input type="number" id="newProdPrice" class="form-input" placeholder="Price ($)" />
        <button id="btnAddProd" class="btn btn-sm btn-primary">Add Product</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Price</th><th>Action</th></tr></thead>
        <tbody>
    `;

    if (products.length === 0) {
      html += `<tr><td colspan="3" style="text-align:center">No products found. Add one!</td></tr>`;
    } else {
      products.forEach(p => {
        html += `
          <tr>
            <td>${p.name}</td>
            <td>$${p.price}</td>
            <td><button class="btn btn-sm btn-danger" onclick="window.app.deleteProduct('${p.id}')">Delete</button></td>
          </tr>`;
      });
    }
    html += `</tbody></table>`;
    targetDiv.innerHTML = html;

    // Add Logic
    document.getElementById('btnAddProd').onclick = async () => {
      const name = document.getElementById('newProdName').value;
      const price = document.getElementById('newProdPrice').value;
      if(name && price) {
        await DB.addData('products', { name, price });
        renderManagerHub(); // Refresh
      }
    };

  } catch (err) {
    targetDiv.innerHTML = `<div class="status" style="color:red">Error loading products: ${err.message}</div>`;
  }
}

// --- SUB-VIEW: Employee Manager ---
async function renderEmployeeManager(targetDiv) {
  try {
    const employees = await DB.getCollectionData('employees');
    
    let html = `
      <div class="input-group">
        <input type="text" id="newEmpName" class="form-input" placeholder="Name" />
        <input type="number" id="newEmpPin" class="form-input" placeholder="PIN (4 digits)" />
        <button id="btnAddEmp" class="btn btn-sm btn-primary">Add Staff</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Role</th><th>PIN</th><th>Action</th></tr></thead>
        <tbody>
    `;

    employees.forEach(e => {
      html += `
        <tr>
          <td>${e.name}</td>
          <td><span class="badge badge-blue">Staff</span></td>
          <td>****</td>
          <td><button class="btn btn-sm btn-danger" onclick="window.app.deleteEmployee('${e.id}')">Remove</button></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    targetDiv.innerHTML = html;

    // Add Logic
    document.getElementById('btnAddEmp').onclick = async () => {
      const name = document.getElementById('newEmpName').value;
      const pin = document.getElementById('newEmpPin').value;
      if(name && pin) {
        await DB.addData('employees', { name, pin, role: 'staff' });
        renderManagerHub(); // Refresh
      }
    };

  } catch (err) {
    targetDiv.innerHTML = `<div class="status" style="color:red">Error loading employees: ${err.message}</div>`;
  }
}

// --- VIEW: IT Hub ---
function renderITHub() {
  clearView();
  state.view = 'it';
  headerSuffix.textContent = '// IT SUPPORT';

  mainView.innerHTML = `
    <button id="btnBack" class="btn-back">← Home</button>
    <h2 class="card-title">System Diagnostics</h2>
    
    <table class="data-table">
      <tr><td><strong>App Version</strong></td><td>${window.RSCPOS.version} (${window.RSCPOS.build})</td></tr>
      <tr><td><strong>Browser</strong></td><td>${navigator.userAgent.slice(0, 50)}...</td></tr>
      <tr><td><strong>Database Status</strong></td><td><span class="badge ${DB.dbStatus() ? 'badge-green' : 'badge-blue'}">${DB.dbStatus() ? 'ONLINE' : 'OFFLINE'}</span></td></tr>
      <tr><td><strong>Protocol</strong></td><td>${window.location.protocol}</td></tr>
    </table>

    <div class="divider"><span>ACTIONS</span></div>

    <div style="text-align:center">
      <button id="btnReload" class="btn btn-ghost" style="margin-bottom:10px">♻️ Force Reload App</button>
      <button id="btnTest" class="btn btn-ghost">🧪 Test Alert System</button>
    </div>
  `;

  document.getElementById('btnBack').onclick = renderHome;
  document.getElementById('btnReload').onclick = () => window.location.reload();
  document.getElementById('btnTest').onclick = () => alert("System Alert: Test Successful.");
}

// --- Expose Global Actions for Inline HTML OnClick ---
window.app = {
  deleteProduct: async (id) => {
    if(confirm("Delete this product?")) {
      await DB.deleteData('products', id);
      renderManagerHub(); 
    }
  },
  deleteEmployee: async (id) => {
    if(confirm("Remove this employee?")) {
      await DB.deleteData('employees', id);
      renderManagerHub();
    }
  }
};

// --- BOOT ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderHome);
} else {
  renderHome();
}
