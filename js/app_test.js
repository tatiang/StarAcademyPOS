/* Star Academy POS - v1.63 (Manager Hub Edition) */

const APP_VERSION = "v1.63 (Manager)";
const TAX_RATE = 0.0925; 

// --- STATE DATA ---
let products = [
    { id: 1, name: "Coffee", price: 2.50, category: "Hot Drinks", stock: 50 },
    { id: 2, name: "Latte",  price: 3.50, category: "Hot Drinks", stock: 40 },
    { id: 3, name: "Tea",    price: 2.00, category: "Hot Drinks", stock: 60 },
    { id: 4, name: "Muffin", price: 3.00, category: "Snacks",    stock: 20 },
    { id: 5, name: "Cookie", price: 1.50, category: "Snacks",    stock: 35 }
];

let employees = [
    { name: "Eloise", role: "Barista", status: "out" },
    { name: "Jamil",  role: "Cashier", status: "out" },
    { name: "Diego",  role: "Manager", status: "out" }
];

let orders = []; // Stores completed sales
let cart = [];
let pinBuffer = "";
let targetRole = "";
let currentOrderNumber = 1001;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`Initializing ${APP_VERSION}...`);
    initLoginScreen();
    
    // Watchdog for Cloud Status
    setTimeout(() => {
        const statusEl = document.getElementById('connection-status');
        if(statusEl && statusEl.innerText.includes('Connecting')) {
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#e74c3c"></i> Offline Mode (Local)';
            statusEl.style.color = '#e74c3c';
        }
    }, 4000);

    setInterval(updateClock, 1000);
    updateClock();
});

// --- GLOBAL FUNCTIONS ---
window.app = {
    // NAVIGATION
    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        
        const target = document.getElementById('view-' + viewId);
        const nav = document.getElementById('nav-' + viewId);
        
        if(target) target.classList.add('active');
        if(nav) nav.classList.add('active');

        // Render specific view data when navigated to
        if(viewId === 'manager') renderManagerHub();
        if(viewId === 'inventory') renderInventory();
        if(viewId === 'time') renderTimeClock();
        if(viewId === 'pos') renderPOS();
    },

    login: (name) => {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('header-cashier').innerHTML = `<i class="fa-solid fa-user-circle"></i> ${name}`;
        window.app.navigate('pos');
    },

    logout: () => {
        document.getElementById('login-overlay').style.display = 'flex';
        // Hide Admin Links on logout
        document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'none');
    },

    // --- MANAGER HUB LOGIC ---
    openProductModal: () => {
        document.getElementById('prod-id').value = ''; // Clear for new
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-stock').value = '';
        document.getElementById('modal-product').classList.add('open');
    },

    saveProduct: () => {
        const name = document.getElementById('prod-name').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const cat = document.getElementById('prod-cat').value;
        const stock = parseInt(document.getElementById('prod-stock').value);

        if(name && price) {
            products.push({ id: Date.now(), name, price, category: cat, stock });
            alert("Product Saved!");
            document.getElementById('modal-product').classList.remove('open');
            renderInventory(); // Refresh list if open
            renderPOS(); // Refresh POS grid
        } else {
            alert("Please enter Name and Price");
        }
    },

    openEmployeeModal: () => {
        document.getElementById('emp-name').value = '';
        document.getElementById('modal-employee').classList.add('open');
    },

    saveEmployee: () => {
        const name = document.getElementById('emp-name').value;
        const role = document.getElementById('emp-role').value;
        if(name) {
            employees.push({ name, role, status: "out" });
            alert("Employee Added!");
            document.getElementById('modal-employee').classList.remove('open');
            renderTimeClock(); // Refresh lists
        }
    },
    
    exportData: () => {
        console.log("Exporting Data:", { orders, products, employees });
        alert("Data logged to console (Simulation)");
    },

    // --- SECURITY PIN LOGIC ---
    promptPin: (role) => {
        targetRole = role;
        pinBuffer = "";
        document.getElementById('pin-display').textContent = "";
        document.getElementById('modal-pin').classList.add('open');
    },
    pinInput: (n) => {
        if(pinBuffer.length < 4) {
            pinBuffer += n;
            document.getElementById('pin-display').textContent = "•".repeat(pinBuffer.length);
        }
    },
    pinClear: () => { pinBuffer = ""; document.getElementById('pin-display').textContent = ""; },
    pinSubmit: () => {
        const PINS = { 'Manager': '1234', 'IT Support': '9999' };
        if (PINS[targetRole] && pinBuffer === PINS[targetRole]) {
            document.getElementById('modal-pin').classList.remove('open');
            window.app.login(targetRole); // Log in
            
            // Unlock Admin Sidebar Links
            document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'block');
            
            if(targetRole === 'Manager') window.app.navigate('manager');
            if(targetRole === 'IT Support') window.app.navigate('it');
        } else {
            alert("Incorrect PIN");
            window.app.pinClear();
        }
    },
    closeModal: (id) => document.getElementById(id).classList.remove('open'),
    
    // --- TIME CLOCK ---
    clockIn: () => handleClock('in'),
    clockOut: () => handleClock('out')
};

// --- RENDER FUNCTIONS ---

function renderManagerHub() {
    // 1. Calculate Stats
    const totalRev = orders.reduce((sum, ord) => sum + ord.total, 0);
    const activeStaff = employees.filter(e => e.status === 'in');
    
    // 2. Update Cards
    document.getElementById('mgr-revenue').textContent = `$${totalRev.toFixed(2)}`;
    document.getElementById('mgr-orders').textContent = orders.length;
    document.getElementById('mgr-staff-count').textContent = activeStaff.length;

    // 3. Update Staff List
    const list = document.getElementById('mgr-staff-list');
    list.innerHTML = activeStaff.length === 0 ? '<tr><td>No staff clocked in</td></tr>' : 
        activeStaff.map(e => `
            <tr>
                <td><strong>${e.name}</strong></td>
                <td><span class="status-badge status-in">Clocked In</span></td>
            </tr>
        `).join('');
}

function renderInventory() {
    const tbody = document.getElementById('inventory-body');
    if(!tbody) return;
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><div style="width:40px; height:40px; background:#eee; border-radius:4px;"></div></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.category}</td>
            <td>$${p.price.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><button class="btn-sm" style="background:#eee; color:#333;">Edit</button></td>
        </tr>
    `).join('');
}

function renderTimeClock() {
    const select = document.getElementById('time-employee-select');
    select.innerHTML = '<option value="">Select your name...</option>' + 
        employees.map(e => `<option value="${e.name}">${e.name} (${e.status})</option>`).join('');
}

function handleClock(action) {
    const name = document.getElementById('time-employee-select').value;
    if(!name) return alert("Select a name first");
    
    const emp = employees.find(e => e.name === name);
    if(emp) {
        emp.status = action;
        alert(`${name} Clocked ${action.toUpperCase()}!`);
        renderTimeClock(); // refresh UI
    }
}

// --- HELPER: POS & LOGIN ---
function initLoginScreen() {
    const grid = document.getElementById('student-login-grid');
    const students = ["Alex", "Brianna", "Jordan", "Casey"];
    if(grid) grid.innerHTML = students.map(name => `
        <div class="login-btn-wrap" onclick="window.app.login('${name}')">
             <div style="width:50px; height:50px; background:#eee; border-radius:50%; margin:0 auto 5px;"></div>
             <div class="login-btn-name">${name}</div>
        </div>
    `).join('');
}

function renderPOS() {
    const grid = document.getElementById('pos-grid');
    if(grid) grid.innerHTML = products.map(p => `
        <div class="product-card" onclick="alert('Added ${p.name} to cart')">
            <div style="height:80px; background:#f4f4f4; margin-bottom:10px;"></div>
            <h4>${p.name}</h4>
            <div class="price">$${p.price.toFixed(2)}</div>
        </div>
    `).join('');
}

function updateClock() {
    const now = new Date();
    const el = document.getElementById('live-clock');
    if(el) el.textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const el2 = document.getElementById('big-clock');
    if(el2) el2.textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
