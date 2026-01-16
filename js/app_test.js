import { APP_VERSION, displayVersion } from './version.js';

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

const app = {
    // --- STORAGE KEY ---
    STORAGE_KEY: "StarAcademy_Test_v1.63", 

    data: {
        currentCashier: null, 
        cart: [], 
        customerCart: [], 
        products: [], 
        orders: [], 
        employees: [], 
        roles: ['Barista', 'Cashier', 'Inventory', 'Marketing', 'Shopper'], 
        timeEntries: [], 
        bugReports: [], 
        orderCounter: 1001, 
        taxRate: 0.0925, 
        tempProduct: null, 
        tempOptions: {}, 
        tempCashEntry: "", 
        editingId: null,
        editingRoleOriginalName: null, // NEW: For tracking role renames
        inventorySort: { field: "name", dir: "asc" }
    },
    
    pinBuffer: "",
    pinCallback: null,
    
    init: () => {
        displayVersion(); 
        app.loadLocalData(); 
        setInterval(app.updateClock, 1000);
        
        // Disable generic cloud overwrite for this test version
        if(window.firebase) window.firebase = null; 

        if(document.getElementById('order-number')) document.getElementById('order-number').innerText = app.data.orderCounter;
        app.renderLogin(); 
    },

    refreshUI: () => {
        const orderNum = document.getElementById('order-number');
        if(orderNum) orderNum.innerText = app.data.orderCounter;
        
        app.updateSidebar();
        
        if (!app.data.currentCashier) {
            app.renderLogin();
        }

        const active = document.querySelector('.view.active');
        if(active) {
            const id = active.id;
            if(id === 'view-pos') app.renderPOS();
            if(id === 'view-customer') app.renderCustomerKiosk();
            if(id === 'view-barista') app.renderBarista();
            if(id === 'view-dashboard') app.renderDashboard();
            if(id === 'view-inventory') app.renderInventory();
            if(id === 'view-manager') app.renderManagerHub(); 
            if(id === 'view-it') app.renderITHub(); 
            if(id === 'view-time') app.renderTimeClock();
        }
    },

    loadLocalData: () => {
        const stored = localStorage.getItem(app.STORAGE_KEY);
        if (stored) {
            app.data = JSON.parse(stored);
            if (!app.data.roles || app.data.roles.length === 0) app.data.roles = ['Barista', 'Cashier', 'Inventory', 'Marketing', 'Shopper'];
            if (!app.data.bugReports) app.data.bugReports = [];
            if (!app.data.timeEntries) app.data.timeEntries = [];
            if (!app.data.orders) app.data.orders = [];
            if (!app.data.customerCart) app.data.customerCart = [];
        } else {
            console.log("No local data found. Seeding new test data...");
            app.seedData();
        }
    },

    saveData: () => { 
        localStorage.setItem(app.STORAGE_KEY, JSON.stringify(app.data));
        if (window.saveToCloud) window.saveToCloud(app.data, true);
    },

    seedData: () => {
        app.data.roles = ['Barista', 'Cashier', 'Inventory', 'Marketing', 'Shopper'];
        app.data.products = [
            { id: 1, name: "Coffee", cat: "Beverages", price: 3.50, stock: 50, img: "images/coffee.jpg" },
            { id: 2, name: "Herbal Tea", cat: "Beverages", price: 3.25, stock: 40, img: "" },
            { id: 3, name: "Latte", cat: "Beverages", price: 4.50, stock: 40, img: "" },
            { id: 8, name: "Blueberry Muffin", cat: "Baked Goods", price: 3.75, stock: 20, img: "" },
            { id: 13, name: "Bottled Water", cat: "Beverages", price: 1.50, stock: 50, img: "" }
        ];
        app.data.employees = [
            {id: 101, name: "Eloise", role: "Barista", img: "images/placeholder.png"},
            {id: 102, name: "Jamil", role: "Cashier", img: "images/placeholder.png"},
            {id: 103, name: "Diego", role: "Inventory", img: "images/placeholder.png"},
            {id: 104, name: "Lexi", role: "Inventory", img: "images/placeholder.png"},
            {id: 105, name: "Finn", role: "Cashier", img: "images/placeholder.png"},
            {id: 106, name: "Twyla", role: "Inventory", img: "images/placeholder.png"}
        ];
        app.data.orderCounter = 1001;
        app.saveData();
    },

    updateSidebar: () => {
        const manLink = document.getElementById('nav-manager');
        const itLink = document.getElementById('nav-it');
        if (manLink) manLink.classList.add('hidden');
        if (itLink) itLink.classList.add('hidden');
        
        const sidebar = document.querySelector('.sidebar');
        const active = document.querySelector('.view.active');
        
        if (active && active.id === 'view-customer') {
            if(sidebar) sidebar.style.display = 'none';
            document.querySelector('.main-content').style.marginLeft = '0';
            return;
        } else {
            if(sidebar) sidebar.style.display = 'block';
            document.querySelector('.main-content').style.marginLeft = ''; 
        }

        let role = null;
        if (app.data.currentCashier === 'Manager') role = 'Manager';
        else if (app.data.currentCashier === 'IT Support') role = 'IT Admin';
        else {
            const emp = app.data.employees.find(e => e.name === app.data.currentCashier);
            if(emp) role = emp.role;
        }

        if (role === 'Manager' || role === 'IT Admin') {
            if (manLink) manLink.classList.remove('hidden');
        } 
        if (role === 'IT Admin') {
            if (itLink) itLink.classList.remove('hidden');
        }
    },

    // --- LOGIN & PIN ---
    renderLogin: () => {
        const c = document.getElementById('student-login-grid');
        if(c) {
             const students = app.data.employees;
             students.sort((a,b) => a.name.localeCompare(b.name));
             c.innerHTML = students.map(e => `
                <div class="login-btn-wrap" onclick="window.app.login('${e.name}')">
                    <img src="${e.img}" class="login-btn-img" onerror="this.src='images/placeholder.png'">
                    <span class="login-btn-name">${e.name}</span>
                </div>
            `).join('');
        }
    },
    login: (name) => {
        if (name === 'Manager') {
             app.requestPin((pin) => {
                if (pin === "1234") app.completeLogin("Manager", "Manager");
                else app.showAlert("Incorrect PIN", "Access Denied");
            });
            return;
        }
        if (name === 'IT Support') {
             app.requestPin((pin) => {
                if (pin === "9753") app.completeLogin("IT Support", "IT Admin");
                else app.showAlert("Access Denied", "Incorrect PIN.");
            });
            return;
        }
        const emp = app.data.employees.find(e => e.name === name);
        if (emp) app.completeLogin(emp.name, emp.role);
    },
    completeLogin: (name, role) => {
        app.data.currentCashier = name;
        document.getElementById('login-overlay').style.display = "none";
        document.getElementById('header-cashier').innerHTML = `<i class="fa-solid fa-user-circle" style="margin-right: 10px;"></i> ${name} (${role})`;
        app.closeModal('modal-pin');
        app.updateSidebar();
        app.navigate('pos');
    },
    logout: () => {
        app.data.currentCashier = null;
        document.getElementById('login-overlay').style.display = "flex";
        app.renderLogin();
    },
    requestPin: (cb) => {
        app.pinBuffer = ""; app.pinCallback = cb;
        const disp = document.getElementById('pin-display');
        if(disp) disp.innerText = "";
        document.getElementById('modal-pin').classList.add('open');
    },
    pinInput: (n) => { 
        if(app.pinBuffer.length < 4) app.pinBuffer += n; 
        document.getElementById('pin-display').innerText = "*".repeat(app.pinBuffer.length); 
    },
    pinClear: () => { app.pinBuffer = ""; document.getElementById('pin-display').innerText = ""; },
    pinSubmit: () => { 
        app.closeModal('modal-pin');
        if(app.pinCallback) { try { app.pinCallback(app.pinBuffer); } catch(e) { console.error(e); } }
        app.pinBuffer = "";
    },

    // --- POS & KIOSK ---
    startKioskMode: () => {
        document.getElementById('login-overlay').style.display = "none";
        app.data.customerCart = [];
        app.navigate('customer');
    },
    exitKioskMode: () => {
        app.requestPin((pin) => {
            if(pin === "1234") app.logout();
            else app.showAlert("Restricted", "Manager PIN required.");
        });
    },
    renderCustomerKiosk: () => {
        const grid = document.getElementById('kiosk-grid');
        if(grid) {
            grid.innerHTML = app.data.products.map(p => `
                <div class="product-card" onclick="window.app.addToCustomerCart(${p.id})">
                    <div class="p-image" style="background-image:url('${p.img}');"></div>
                    <div class="p-info"><div class="p-name">${p.name}</div><div class="p-price">$${p.price.toFixed(2)}</div></div>
                </div>
            `).join('');
        }
        app.renderCustomerCart();
    },
    addToCustomerCart: (id) => {
        const p = app.data.products.find(x => x.id === id);
        if(p.stock <= 0) return app.showAlert("Sorry", "Item out of stock.");
        app.data.customerCart.push({ ...p, cartId: Date.now() });
        playTone(800, 'sine', 0.1); 
        app.renderCustomerCart();
    },
    renderCustomerCart: () => {
        const list = document.getElementById('kiosk-cart-list');
        const subEl = document.getElementById('kiosk-subtotal');
        if(!list) return;
        if(app.data.customerCart.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:30px; color:#999; font-style:italic;">Your tray is empty.<br>Tap items to add them.</div>`;
            subEl.innerText = "$0.00";
            return;
        }
        list.innerHTML = app.data.customerCart.map((item, idx) => `
            <div class="cart-item">
                <div class="item-info"><h4>${item.name}</h4><div class="opts">$${item.price.toFixed(2)}</div></div>
                <button class="btn-del" onclick="window.app.removeFromCustomerCart(${idx})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
        subEl.innerText = `$${app.data.customerCart.reduce((acc, item) => acc + item.price, 0).toFixed(2)}`;
    },
    removeFromCustomerCart: (idx) => { app.data.customerCart.splice(idx, 1); app.renderCustomerCart(); },
    submitKioskOrder: () => {
        const name = document.getElementById('kiosk-name').value;
        if(!name) return app.showAlert("Name Required", "Please enter your name.");
        if(app.data.customerCart.length === 0) return app.showAlert("Empty Tray", "Please add items first.");
        const pendingOrder = {
            id: app.data.orderCounter++, date: new Date().toISOString(),
            items: [...app.data.customerCart], total: app.data.customerCart.reduce((a,b) => a+b.price, 0),
            type: "Unpaid", cashier: "Kiosk", customer: name, status: "Awaiting Payment"
        };
        app.data.customerCart.forEach(c => { const p = app.data.products.find(x => x.id === c.id); if(p) p.stock--; });
        app.data.orders.unshift(pendingOrder);
        app.saveData();
        app.data.customerCart = [];
        document.getElementById('kiosk-name').value = "";
        app.showAlert("Order Sent!", "Please see the Cashier to pay.");
        app.renderCustomerKiosk();
    },

    renderPOS: () => {
        const cats = ['All', ...new Set(app.data.products.map(p => p.cat))];
        const catContainer = document.getElementById('pos-categories');
        if(catContainer) catContainer.innerHTML = cats.map(c => `<div class="cat-tab" onclick="window.app.filterPos('${c}')">${c}</div>`).join('');
        app.filterPos('All');
        app.renderCart();
        app.checkPickupCount();
    },
    checkPickupCount: () => {
        const count = app.data.orders.filter(o => o.status === 'Awaiting Payment').length;
        const btn = document.getElementById('btn-pickup-orders');
        if(btn) btn.innerHTML = `<i class="fa-solid fa-inbox"></i> Pick Up Orders ${count > 0 ? `<span class="badge-count">${count}</span>` : ''}`;
    },
    showPickupModal: () => {
        const unpaid = app.data.orders.filter(o => o.status === 'Awaiting Payment');
        const list = document.getElementById('pickup-list');
        if(!list) return;
        if(unpaid.length === 0) list.innerHTML = "<li style='padding:20px; text-align:center;'>No orders waiting.</li>";
        else list.innerHTML = unpaid.map(o => `
            <li class="pickup-item">
                <div><strong>#${o.id} - ${o.customer}</strong><br><small>${o.items.length} items • $${o.total.toFixed(2)}</small></div>
                <button class="btn-sm" style="background:var(--success)" onclick="window.app.loadPickupOrder(${o.id})">Load</button>
            </li>
        `).join('');
        document.getElementById('modal-pickup').classList.add('open');
    },
    loadPickupOrder: (orderId) => {
        const idx = app.data.orders.findIndex(o => o.id === orderId);
        if(idx === -1) return;
        const order = app.data.orders[idx];
        app.data.cart = [...order.items];
        document.getElementById('customer-name').value = order.customer;
        order.items.forEach(c => { const p = app.data.products.find(x => x.id === c.id); if(p) p.stock++; });
        app.data.orders.splice(idx, 1);
        app.saveData();
        app.closeModal('modal-pickup');
        app.renderCart();
    },
    filterPos: (cat) => {
        const items = cat === 'All' ? app.data.products : app.data.products.filter(p => p.cat === cat);
        const grid = document.getElementById('pos-grid');
        if(grid) grid.innerHTML = items.map(p => `
            <div class="product-card" onclick="window.app.addToCart(${p.id})">
                <div class="p-image" style="background-image:url('${p.img}');"></div>
                <div class="p-info"><div class="p-name">${p.name}</div><div class="p-price">$${p.price.toFixed(2)}</div></div>
            </div>
        `).join('');
    },
    addToCart: (id) => {
        const p = app.data.products.find(x => x.id === id);
        if(p.stock <= 0) return app.showAlert("Out of Stock", "Item unavailable.");
        app.data.cart.push({ ...p, cartId: Date.now() });
        playTone(600, 'sine', 0.1);
        app.renderCart();
    },
    renderCart: () => {
        const list = document.getElementById('cart-list');
        if(!list) return;
        if(!app.data.cart.length) {
            list.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>`;
            document.getElementById('pos-total').innerText = "$0.00";
            return;
        }
        list.innerHTML = app.data.cart.map((i, idx) => `
            <div class="cart-item">
                <div class="item-info"><h4>${i.name}</h4><div class="opts">$${i.price.toFixed(2)}</div></div>
                <button class="btn-del" onclick="window.app.data.cart.splice(${idx},1);window.app.renderCart()">X</button>
            </div>
        `).join('');
        const sub = app.data.cart.reduce((s, i) => s + i.price, 0);
        document.getElementById('pos-subtotal').innerText = `$${sub.toFixed(2)}`;
        document.getElementById('pos-tax').innerText = `$${(sub * app.data.taxRate).toFixed(2)}`;
        document.getElementById('pos-total').innerText = `$${(sub * (1+app.data.taxRate)).toFixed(2)}`;
    },
    validateAndPay: (type) => {
        if(!app.data.cart.length) return;
        if(type === 'Cash') {
            const total = document.getElementById('pos-total').innerText.replace('$','');
            document.getElementById('cash-modal-total').innerText = `$${total}`;
            app.tempCashEntry = "";
            document.getElementById('calc-display').innerText = "$0.00";
            document.getElementById('change-result').style.display = 'none';
            document.getElementById('modal-cash').classList.add('open');
        } else {
            app.finalizeOrder(type, 0);
        }
    },
    finalizeOrder: (type, change) => {
        const total = parseFloat(document.getElementById('pos-total').innerText.replace('$',''));
        const order = {
            id: app.data.orderCounter++, date: new Date().toISOString(),
            items: [...app.data.cart], total, type,
            cashier: app.data.currentCashier, customer: document.getElementById('customer-name').value || "Walk-in",
            status: 'Pending'
        };
        app.data.cart.forEach(c => { const p = app.data.products.find(x => x.id === c.id); if(p) p.stock--; });
        app.data.orders.unshift(order);
        app.data.cart = [];
        document.getElementById('customer-name').value = "";
        app.saveData();
        app.renderCart();
        app.closeModal('modal-cash');
        app.checkPickupCount();
        document.getElementById('receipt-content').innerHTML = `
            <div class="r-center"><h3>STAR ACADEMY</h3><p>Order #${order.id}</p></div>
            ${order.items.map(i => `<div class="r-row"><span>${i.name}</span><span>$${i.price.toFixed(2)}</span></div>`).join('')}
            <div class="r-line"></div>
            <div class="r-total r-row"><span>TOTAL</span><span>$${total.toFixed(2)}</span></div>
        `;
        document.getElementById('modal-receipt').classList.add('open');
    },

    // --- UTILS ---
    calcInput: (v) => {
        if(v==='.'){ if(!app.tempCashEntry.includes('.')) app.tempCashEntry += v; } else app.tempCashEntry += v;
        document.getElementById('calc-display').innerText = `$${app.tempCashEntry}`;
        const t = parseFloat(document.getElementById('cash-modal-total').innerText.replace('$',''));
        const p = parseFloat(app.tempCashEntry);
        if(p >= t) {
            document.getElementById('change-result').style.display = 'block';
            document.getElementById('change-amt').innerText = `$${(p-t).toFixed(2)}`;
        }
    },
    finalizeCash: () => {
        const t = parseFloat(document.getElementById('cash-modal-total').innerText.replace('$',''));
        const p = parseFloat(app.tempCashEntry);
        if(p < t) return app.showAlert("Insufficient Funds", "Entry too low.");
        app.finalizeOrder('Cash', p-t);
    },
    
    updateClock: () => {
        const d = new Date();
        if(document.getElementById('live-clock')) document.getElementById('live-clock').innerText = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    },
    closeModal: (id) => document.getElementById(id).classList.remove('open'),
    closeReceiptAndReset: () => { app.closeModal('modal-receipt'); },
    showAlert: (t, m) => { document.getElementById('alert-title').innerText = t; document.getElementById('alert-message').innerText = m; document.getElementById('modal-alert').classList.add('open'); },
    
    // --- VIEWS ---
    renderBarista: () => {
        const grid = document.getElementById('barista-grid');
        if(grid) grid.innerHTML = app.data.orders.filter(o => o.status === 'Pending').map(o => `
            <div class="order-card"><div class="oc-header">#${o.id} - ${o.customer}</div><div class="oc-body">${o.items.map(i => i.name).join('<br>')}</div><button class="btn-ready" onclick="window.app.markReady(${o.id})">Done</button></div>
        `).join('');
    },
    markReady: (id) => { app.data.orders.find(o => o.id === id).status = 'Completed'; app.saveData(); app.renderBarista(); },

    // --- MANAGER HUB (IMPROVED) ---
    renderManagerHub: () => {
        const view = document.getElementById('view-manager');
        if(!view) return;
        
        view.innerHTML = `
            <div class="header-main">
                <h2>Manager Hub</h2>
                <span id="live-clock"></span>
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; padding: 20px;">
                
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3>Employees</h3>
                        <button class="btn-primary" onclick="window.app.openEmployeeModal()">+ Add Employee</button>
                    </div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
                            <tbody id="employees-body"></tbody>
                        </table>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:20px;">
                    
                    <div class="card">
                        <h3>Roles & Titles</h3>
                        <div style="display:flex; gap:5px; margin-bottom:10px;">
                            <input type="text" id="new-role-input" class="search-bar" placeholder="New Role Name">
                            <button id="btn-role-action" class="btn-primary" onclick="window.app.saveRoleAction()">Add</button>
                            <button id="btn-role-cancel" class="btn-sm" style="display:none; background:#999;" onclick="window.app.cancelRoleEdit()">X</button>
                        </div>
                        <ul id="role-manager-list" style="list-style:none; padding:0; max-height: 250px; overflow-y:auto; border:1px solid #eee; border-radius:4px;">
                            </ul>
                    </div>

                    <div class="card">
                        <h3>System Data</h3>
                        <p>Total Orders: ${app.data.orders.length}</p>
                        <p>Total Revenue: $${app.data.orders.reduce((a,b)=>a+b.total,0).toFixed(2)}</p>
                        <hr>
                        <button class="btn-danger" style="width:100%" onclick="window.app.nuclearReset()">Factory Reset (Wipe All)</button>
                    </div>

                </div>
            </div>
        `;
        app.renderEmployeesManager();
        app.renderRoleManager();
    },

    renderEmployeesManager: () => {
        const tbody = document.getElementById('employees-body');
        if(!tbody) return;
        tbody.innerHTML = app.data.employees.map(e => `
            <tr>
                <td><img src="${e.img}" class="emp-thumb" onerror="this.src='images/placeholder.png'"> ${e.name}</td>
                <td>${e.role}</td>
                <td>
                    <button class="btn-sm" onclick="window.app.editEmployee(${e.id})">Edit</button>
                    <button class="btn-sm btn-danger-sm" onclick="window.app.deleteEmployee(${e.id})">X</button>
                </td>
            </tr>
        `).join('');
    },

    // --- ROLE MANAGEMENT (NEW LOGIC) ---
    renderRoleManager: () => {
        const list = document.getElementById('role-manager-list');
        if(!list) return;
        
        list.innerHTML = app.data.roles.map(r => {
            // Calculate usage count
            const count = app.data.employees.filter(e => e.role === r).length;
            const isEditing = (app.data.editingRoleOriginalName === r);
            const bg = isEditing ? '#e3f2fd' : 'transparent';

            return `
            <li style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; align-items:center; background:${bg};">
                <span>${r} <span style="font-size:0.8rem; color:#888;">(${count})</span></span>
                <div style="display:flex; gap:5px;">
                    <button class="btn-sm" style="background:#f39c12;" title="Rename" onclick="window.app.editRole('${r}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-sm" style="background:#e74c3c;" title="Delete" onclick="window.app.deleteRole('${r}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </li>
        `}).join('');
    },

    saveRoleAction: () => {
        const input = document.getElementById('new-role-input');
        const val = input.value.trim();
        if(!val) return;

        // MODE: UPDATE
        if(app.data.editingRoleOriginalName) {
            const oldName = app.data.editingRoleOriginalName;
            
            // Check duplicate
            if(val !== oldName && app.data.roles.includes(val)) return app.showAlert("Duplicate", "Role already exists.");
            
            // 1. Update Role List
            const idx = app.data.roles.indexOf(oldName);
            if(idx !== -1) app.data.roles[idx] = val;
            
            // 2. Update All Employees with this role
            app.data.employees.forEach(e => {
                if(e.role === oldName) e.role = val;
            });
            
            app.showAlert("Success", `Renamed '${oldName}' to '${val}' and updated employees.`);
            app.cancelRoleEdit(); // Reset UI
            
        } 
        // MODE: ADD NEW
        else {
            if(app.data.roles.includes(val)) return app.showAlert("Duplicate", "Role already exists.");
            app.data.roles.push(val);
        }

        app.saveData();
        app.renderRoleManager();
        app.renderEmployeesManager(); // Refresh employee table just in case
        if(!app.data.editingRoleOriginalName) input.value = "";
    },

    editRole: (roleName) => {
        app.data.editingRoleOriginalName = roleName;
        const input = document.getElementById('new-role-input');
        const btn = document.getElementById('btn-role-action');
        const cancel = document.getElementById('btn-role-cancel');
        
        input.value = roleName;
        input.focus();
        btn.innerText = "Update";
        cancel.style.display = "inline-block";
        app.renderRoleManager(); // re-render to highlight
    },

    cancelRoleEdit: () => {
        app.data.editingRoleOriginalName = null;
        const input = document.getElementById('new-role-input');
        const btn = document.getElementById('btn-role-action');
        const cancel = document.getElementById('btn-role-cancel');
        
        input.value = "";
        btn.innerText = "Add";
        cancel.style.display = "none";
        app.renderRoleManager();
    },

    deleteRole: (roleName) => {
        // 1. Check if assigned
        const count = app.data.employees.filter(e => e.role === roleName).length;
        if(count > 0) {
            return app.showAlert("Action Blocked", `Cannot delete role '${roleName}'. It is assigned to ${count} employee(s). Please reassign them first.`);
        }
        
        if(app.data.roles.length <= 1) return app.showAlert("Error", "Must have at least one role.");
        
        if(confirm(`Delete role "${roleName}"?`)) {
            app.data.roles = app.data.roles.filter(r => r !== roleName);
            app.saveData();
            app.renderRoleManager();
        }
    },

    // --- EMPLOYEE MODAL ---
    openEmployeeModal: () => {
        const sel = document.getElementById('emp-role');
        if(sel) sel.innerHTML = app.data.roles.map(r => `<option value="${r}">${r}</option>`).join('');
        document.getElementById('emp-modal-title').innerText = "Add Employee";
        document.getElementById('emp-name').value = "";
        document.getElementById('emp-img-url').value = "";
        app.data.editingId = null;
        document.getElementById('modal-employee').classList.add('open');
    },
    editEmployee: (id) => {
        const emp = app.data.employees.find(e => e.id === id);
        if(!emp) return;
        const sel = document.getElementById('emp-role');
        if(sel) sel.innerHTML = app.data.roles.map(r => `<option value="${r}" ${r === emp.role ? 'selected' : ''}>${r}</option>`).join('');
        document.getElementById('emp-modal-title').innerText = "Edit Employee";
        document.getElementById('emp-name').value = emp.name;
        document.getElementById('emp-img-url').value = emp.img;
        app.data.editingId = id;
        document.getElementById('modal-employee').classList.add('open');
    },
    saveEmployee: () => {
        const name = document.getElementById('emp-name').value;
        const role = document.getElementById('emp-role').value;
        const img = document.getElementById('emp-img-url').value || 'images/placeholder.png';
        if(!name) return app.showAlert("Name required.");
        if(app.data.editingId) {
            const e = app.data.employees.find(x => x.id === app.data.editingId);
            e.name = name; e.role = role; e.img = img;
        } else {
            app.data.employees.push({ id: Date.now(), name, role, img });
        }
        app.saveData();
        app.closeModal('modal-employee');
        app.renderManagerHub();
    },
    deleteEmployee: (id) => {
        if(confirm("Delete employee?")) {
            app.data.employees = app.data.employees.filter(e => e.id !== id);
            app.saveData();
            app.renderManagerHub();
        }
    },

    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-' + viewId).classList.add('active');
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        const navItem = document.getElementById('nav-' + viewId);
        if (navItem) navItem.classList.add('active');
        app.refreshUI();
    },
    renderITHub: () => {
        const pre = document.getElementById('github-notes-content');
        if(pre && pre.innerText.includes("Loading")) app.fetchTestingNotes();
        const dbStatus = document.getElementById('it-db-status');
        if(dbStatus) dbStatus.innerText = window.firebase ? "Active" : "Offline";
        app.renderBackupList();
    },
    fetchTestingNotes: () => { fetch('TESTING_NOTES.md').then(r=>r.text()).then(t=>document.getElementById('github-notes-content').innerText=t).catch(e=>console.log(e)); },
    renderBackupList: () => { },
    nuclearReset: () => { if(confirm("WIPE ALL DATA?")) { localStorage.clear(); location.reload(); } },
    renderInventory: () => {
        const tbody = document.getElementById('inventory-body');
        if(!tbody) return;
        tbody.innerHTML = app.data.products.map(p => {
             const status = p.stock < 10 ? `<span class="badge-low">Low</span>` : `<span class="badge-ok">OK</span>`;
             return `<tr><td><img src="${p.img}" width="40"></td><td>${p.name}</td><td>${p.cat}</td><td>${p.stock}</td><td>$${p.price.toFixed(2)}</td><td>${status}</td><td>-</td></tr>`;
        }).join('');
    }
};

window.app = app;
window.onload = app.init;
