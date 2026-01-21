/* Star Academy POS - v1.42 (Spec Compliant) */

const APP_VERSION = "v1.42";
const STORAGE_KEY = "star_academy_v1_42";

// --- DATA MODEL (v1.42 Req #4) ---
const DEFAULT_DATA = {
    currentCashier: null,
    cart: [],
    products: [
        { id: 1, name: "Coffee", price: 2.50, category: "Hot Drinks", stock: 50 },
        { id: 2, name: "Latte",  price: 3.50, category: "Hot Drinks", stock: 40 },
        { id: 3, name: "Muffin", price: 3.00, category: "Snacks",    stock: 20 },
        { id: 4, name: "Tea",    price: 2.00, category: "Hot Drinks", stock: 30 }
    ],
    orders: [],
    employees: [
        { name: "Eloise", role: "Barista", status: "out" },
        { name: "Jamil",  role: "Cashier", status: "out" }
    ],
    timeEntries: [],
    bugReports: [],
    orderCounter: 1001,
    taxRate: 0.0925
};

// Temp State
let tempProduct = null;
let pinBuffer = "";
let targetRole = "";
let cashTendered = "";

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`Initializing ${APP_VERSION}...`);
    
    // 1. Load Local Data First (Offline-First)
    const stored = localStorage.getItem(STORAGE_KEY);
    window.app.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_DATA));
    
    // 2. Render Login Screen
    initLoginScreen();

    // 3. Watchdog (Fix for "Stuck Connecting")
    setTimeout(() => {
        const statusEl = document.getElementById('connection-status');
        if(statusEl && statusEl.innerText.includes('Connecting')) {
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#e74c3c"></i> Offline Mode';
            statusEl.style.color = '#e74c3c';
        }
    }, 4000);

    // 4. Start Clock
    setInterval(() => {
        const d = new Date();
        const t = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        if(document.getElementById('live-clock')) document.getElementById('live-clock').textContent = t;
    }, 1000);
});

// --- GLOBAL APP OBJECT ---
window.app = {
    data: null, // Populated in init

    // --- NAVIGATION ---
    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        
        const target = document.getElementById('view-' + viewId);
        const nav = document.getElementById('nav-' + viewId);
        if(target) target.classList.add('active');
        if(nav) nav.classList.add('active');

        // View Specific Renders
        if(viewId === 'pos') renderPOS();
        if(viewId === 'barista') renderBarista();
        if(viewId === 'dashboard') renderDashboard();
        if(viewId === 'inventory') renderInventory();
        if(viewId === 'time') renderTimeClock();
        if(viewId === 'manager') renderManager();
    },

    // --- LOGIN / SECURITY ---
    login: (name) => {
        window.app.data.currentCashier = name;
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('header-cashier').innerHTML = `<i class="fa-solid fa-user-circle"></i> ${name}`;
        window.app.navigate('pos');
    },

    logout: () => {
        window.app.data.cart = [];
        document.getElementById('login-overlay').style.display = 'flex';
        document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'none'); // Lock admin
    },

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
        // v1.42 Spec PINS
        const PINS = { 'Manager': '1234', 'IT Support': '9753' }; // Updated IT PIN
        
        if (PINS[targetRole] && pinBuffer === PINS[targetRole]) {
            document.getElementById('modal-pin').classList.remove('open');
            window.app.login(targetRole);
            
            // Unlock Admin Areas
            document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'block');
            if(targetRole === 'Manager') window.app.navigate('manager');
            if(targetRole === 'IT Support') window.app.navigate('it');
        } else {
            alert("Incorrect PIN");
            window.app.pinClear();
        }
    },

    // --- POS LOGIC ---
    addToCartPrecheck: (prodId) => {
        tempProduct = window.app.data.products.find(p => p.id === prodId);
        // Spec 8: Open Options Modal
        document.getElementById('opt-product-name').textContent = tempProduct.name;
        document.getElementById('opt-notes').value = "";
        document.getElementById('modal-options').classList.add('open');
    },

    confirmAddToCart: () => {
        const note = document.getElementById('opt-notes').value;
        const item = {
            ...tempProduct,
            qty: 1,
            note: note
        };
        
        // Aggregation Logic (Spec 8)
        const existing = window.app.data.cart.find(i => i.id === item.id && i.note === item.note);
        if(existing) {
            existing.qty++;
        } else {
            window.app.data.cart.push(item);
        }
        
        document.getElementById('modal-options').classList.remove('open');
        renderCart();
        saveData();
    },

    removeFromCart: (idx) => {
        window.app.data.cart.splice(idx, 1);
        renderCart();
        saveData();
    },

    validateAndPay: (type) => {
        if(window.app.data.cart.length === 0) return alert("Cart is empty");
        if(!document.getElementById('customer-name').value) return alert("Customer Name Required");
        
        if(type === 'Cash') {
            openCashModal();
        } else {
            completeOrder(type);
        }
    },

    // --- CASH MODAL (Req #9) ---
    cashInput: (val) => {
        cashTendered += val;
        updateCashUI();
    },
    cashClear: () => { cashTendered = ""; updateCashUI(); },
    
    finalizeCash: () => {
        const total = getCartTotal();
        const tendered = parseFloat(cashTendered || "0");
        if(tendered >= total) {
            completeOrder('Cash');
            document.getElementById('modal-cash').classList.remove('open');
        } else {
            alert("Insufficient Funds");
        }
    },

    // --- MANAGER / IT ---
    logBug: () => {
        const msg = document.getElementById('bug-input').value;
        if(msg) {
            window.app.data.bugReports.push({ date: new Date().toISOString(), msg });
            document.getElementById('bug-input').value = '';
            renderManager();
            saveData();
        }
    },
    
    saveEmployee: () => {
        const name = document.getElementById('emp-name').value;
        const role = document.getElementById('emp-role').value;
        if(name) {
            window.app.data.employees.push({ name, role, status: 'out' });
            document.getElementById('modal-employee').classList.remove('open');
            saveData();
        }
    },

    openEmployeeModal: () => document.getElementById('modal-employee').classList.add('open'),
    
    forceSync: () => alert("Syncing to Cloud... (Simulation)"),
    wipeData: () => { if(confirm("Wipe all data?")) { localStorage.clear(); location.reload(); } },

    // --- SYSTEM ---
    closeModal: (id) => document.getElementById(id).classList.remove('open'),
    refreshUI: () => { renderPOS(); renderBarista(); } // Called by Firestore
};

// --- HELPER FUNCTIONS ---

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.app.data));
    if(window.saveToCloud) window.saveToCloud(window.app.data, true);
}

function getCartTotal() {
    const sub = window.app.data.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    return sub + (sub * window.app.data.taxRate);
}

function completeOrder(method) {
    const order = {
        id: window.app.data.orderCounter++,
        customer: document.getElementById('customer-name').value,
        items: [...window.app.data.cart],
        total: getCartTotal(),
        method: method,
        status: "Pending",
        time: new Date().toISOString()
    };
    window.app.data.orders.push(order);
    window.app.data.cart = []; // Clear cart
    document.getElementById('customer-name').value = '';
    
    saveData();
    renderCart();
    alert("Order Placed!");
}

function updateCashUI() {
    const display = document.getElementById('calc-display');
    const bar = document.getElementById('change-bar');
    const total = getCartTotal();
    const tenderVal = parseFloat(cashTendered || "0");
    
    display.textContent = `$${tenderVal.toFixed(2)}`;
    document.getElementById('cash-total-due').textContent = `Total: $${total.toFixed(2)}`;
    
    if(tenderVal >= total) {
        bar.classList.add('active');
        bar.textContent = `Change Due: $${(tenderVal - total).toFixed(2)}`;
    } else {
        bar.classList.remove('active');
        bar.textContent = "Change Due: $0.00";
    }
}

function openCashModal() {
    cashTendered = "";
    updateCashUI();
    document.getElementById('modal-cash').classList.add('open');
}

// --- RENDERERS ---

function initLoginScreen() {
    const grid = document.getElementById('student-login-grid');
    // For demo, we use hardcoded students or from data
    const students = ["Alex", "Brianna", "Jordan", "Casey"];
    if(grid) grid.innerHTML = students.map(name => `
        <div class="login-btn-wrap" onclick="window.app.login('${name}')" style="display:inline-block; margin:10px; text-align:center; cursor:pointer;">
             <div style="width:60px; height:60px; background:#eee; border-radius:50%; margin:0 auto 5px; border:3px solid var(--golden-bronze);"></div>
             <div style="font-weight:bold; color:var(--space-indigo);">${name}</div>
        </div>
    `).join('');
}

function renderPOS() {
    const catDiv = document.getElementById('pos-categories');
    const grid = document.getElementById('pos-grid');
    
    // Categories
    const cats = [...new Set(window.app.data.products.map(p => p.category))];
    if(catDiv) catDiv.innerHTML = cats.map(c => `<button class="btn-sm" style="margin-right:5px;">${c}</button>`).join('');
    
    // Products
    if(grid) grid.innerHTML = window.app.data.products.map(p => `
        <div class="product-card" onclick="window.app.addToCartPrecheck(${p.id})" style="background:white; padding:15px; border-radius:8px; border:1px solid #ddd; cursor:pointer;">
            <h4>${p.name}</h4>
            <div style="color:var(--golden-bronze); font-weight:bold;">$${p.price.toFixed(2)}</div>
        </div>
    `).join('');
    
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-list');
    const total = getCartTotal();
    const sub = window.app.data.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    
    if(list) list.innerHTML = window.app.data.cart.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px 0;">
            <div>${item.name} x${item.qty} ${item.note ? '<br><small>'+item.note+'</small>' : ''}</div>
            <div style="color:var(--danger); cursor:pointer;" onclick="window.app.removeFromCart(${idx})"><i class="fa-solid fa-trash"></i></div>
        </div>
    `).join('');
    
    document.getElementById('pos-subtotal').textContent = `$${sub.toFixed(2)}`;
    document.getElementById('pos-tax').textContent = `$${(sub * window.app.data.taxRate).toFixed(2)}`;
    document.getElementById('pos-total').textContent = `$${total.toFixed(2)}`;
}

function renderBarista() {
    const grid = document.getElementById('barista-grid');
    const pending = window.app.data.orders.filter(o => o.status === 'Pending');
    
    if(grid) grid.innerHTML = pending.length === 0 ? '<p>No pending orders</p>' : pending.map(o => `
        <div style="background:white; padding:15px; border-radius:8px; border-left:5px solid var(--stormy-teal); margin-bottom:10px;">
            <h3>Order #${o.id} <small>(${o.customer})</small></h3>
            <ul>${o.items.map(i => `<li>${i.qty}x ${i.name} ${i.note ? '('+i.note+')' : ''}</li>`).join('')}</ul>
            <button class="btn-sm" onclick="this.parentElement.style.opacity='0.5'; setTimeout(()=>window.app.refreshUI(), 500);">Mark Ready</button>
        </div>
    `).join('');
}

function renderDashboard() {
    const revenue = window.app.data.orders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('dash-revenue').textContent = `$${revenue.toFixed(2)}`;
    document.getElementById('dash-orders').textContent = window.app.data.orders.length;
    
    const tbody = document.getElementById('dashboard-body');
    if(tbody) tbody.innerHTML = window.app.data.orders.slice(-5).reverse().map(o => `
        <tr><td>${o.id}</td><td>${o.customer}</td><td>$${o.total.toFixed(2)}</td><td>${o.status}</td><td><button>Receipt</button></td></tr>
    `).join('');
}

function renderInventory() {
    const tbody = document.getElementById('inventory-body');
    if(tbody) tbody.innerHTML = window.app.data.products.map(p => `
        <tr>
            <td><div style="width:30px; height:30px; background:#ddd;"></div></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td><span class="${p.stock < 10 ? 'badge-low' : 'badge-ok'}">${p.stock}</span></td>
            <td><button class="btn-sm">Edit</button></td>
        </tr>
    `).join('');
}

function renderManager() {
    const list = document.getElementById('bug-list');
    if(list) list.innerHTML = window.app.data.bugReports.map(b => `<li><small>${b.date}</small>: ${b.msg}</li>`).join('');
}

function renderTimeClock() {
    const sel = document.getElementById('time-employee-select');
    if(sel) sel.innerHTML = '<option value="">Select...</option>' + window.app.data.employees.map(e => `<option>${e.name}</option>`).join('');
}
