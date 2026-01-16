import { firebaseConfig } from './firebase-init_v1.50.js';

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
    data: {
        currentCashier: null,
        cart: [],
        products: [],
        orders: [],
        employees: [],
        roles: [], // Added for v1.50
        timeEntries: [],
        bugReports: [],
        orderCounter: 1001,
        taxRate: 0.0925,
        tempProduct: null,
        tempOptions: {},
        tempCashEntry: "",
        editingId: null,
        inventorySort: { field: "name", dir: "asc" },
    },
    pinBuffer: "",
    pinCallback: null,

    init: () => {
        app.loadLocalData();
        setInterval(app.updateClock, 1000);
        if(document.getElementById('order-number')) document.getElementById('order-number').innerText = app.data.orderCounter;
        app.renderLogin();
    },

    refreshUI: () => {
        if(document.getElementById('order-number')) document.getElementById('order-number').innerText = app.data.orderCounter;
        app.renderLogin();
        app.updateSidebar();
        
        const active = document.querySelector('.view.active');
        if(active) {
            if(active.id === 'view-pos') app.renderPOS();
            if(active.id === 'view-barista') app.renderBarista();
            if(active.id === 'view-dashboard') app.renderDashboard();
            if(active.id === 'view-inventory') app.renderInventory();
            if(active.id === 'view-time') app.renderTimeClock();
            if(active.id === 'view-manager') app.renderManager();
            if(active.id === 'view-it') app.renderIT();
        }
    },

    loadLocalData: () => {
        // Updated key for v1.50
        const stored = localStorage.getItem('starAcademyPOS_v150');
        if (stored) {
            app.data = JSON.parse(stored);
            // v1.50 Migration: Ensure roles exist if upgrading from old data
            if (!app.data.roles || app.data.roles.length === 0) {
                app.data.roles = ["Cashier", "Barista", "Inventory", "Manager", "IT Admin", "Floater"];
            }
        } else {
            app.seedData();
        }
    },

    saveData: () => { 
        localStorage.setItem('starAcademyPOS_v150', JSON.stringify(app.data));
        // Simulate cloud sync hook
        if(window.saveToCloud) window.saveToCloud(app.data, true); 
    },

    seedData: () => {
        app.data.roles = ["Cashier", "Barista", "Inventory", "Manager", "IT Admin", "Floater"]; // v1.50
        app.data.products = [
            { id: 1, name: "Coffee", cat: "Beverages", price: 3.50, stock: 50, img: "images/coffee.jpg", options: [{ name: "Add-ins", type: "select", choices: [{name:"+ Half & Half"}, {name:"+ Extra Room"}, {name:"(No Caf) Decaf"}] }] },
            { id: 2, name: "Herbal Tea", cat: "Beverages", price: 3.25, stock: 40, img: "", options: [{ name: "Temp", type: "toggle", choice: {name:"Not too hot"} }] },
            { id: 3, name: "Latte", cat: "Beverages", price: 4.50, stock: 40, img: "", options: [{ name: "Syrup", type: "select", choices: [{name:"Plain"}, {name:"+ Vanilla"}, {name:"+ Hazelnut"}] }] },
            { id: 8, name: "Blueberry Muffin", cat: "Baked Goods", price: 3.75, stock: 20, img: "" },
            { id: 13, name: "Bottled Water", cat: "Beverages", price: 1.50, stock: 50, img: "" }
        ];
        
        app.data.employees = [
            {id: 1, name: "Manager", role: "Manager", img: "images/placeholder.png"}, // Hidden in grid
            {id: 2, name: "Alex", role: "Cashier", img: "images/placeholder.png"},
            {id: 3, name: "Brianna", role: "Barista", img: "images/placeholder.png"}
        ];
        app.data.orderCounter = 1001;
        app.data.orders = [];
        app.data.timeEntries = [];
        app.data.bugReports = [];
        app.saveData();
    },

    updateSidebar: () => {
        const manLink = document.getElementById('nav-manager');
        const itLink = document.getElementById('nav-it');
        if (manLink) manLink.classList.add('hidden');
        if (itLink) itLink.classList.add('hidden');
        
        const currentUser = app.data.employees.find(e => e.name === app.data.currentCashier);
        const role = currentUser ? currentUser.role : app.data.currentCashier;

        if (role === 'Manager') {
            if (manLink) manLink.classList.remove('hidden');
        } else if (role === 'IT Admin' || role === 'IT Support') {
            if (itLink) itLink.classList.remove('hidden');
            if (manLink) manLink.classList.remove('hidden'); 
        }
    },

    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        document.getElementById('view-' + viewId).classList.add('active');
        const navLink = document.getElementById('nav-' + viewId);
        if(navLink) navLink.classList.add('active');
        app.refreshUI();
    },

    logout: () => {
        app.data.currentCashier = null;
        document.getElementById('login-overlay').style.display = "flex";
        app.renderLogin();
    },

    renderLogin: () => {
        const c = document.getElementById('student-login-grid');
        if(c) {
             const students = app.data.employees.filter(e => e.role !== 'Manager' && e.role !== 'IT Admin');
             c.innerHTML = students.map(e => `
                <div class="login-btn-wrap" onclick="app.login('${e.name}')">
                    <img src="${e.img}" class="login-btn-img" onerror="this.src='images/placeholder.png'">
                    <span class="login-btn-name">${e.name}</span>
                </div>
            `).join('');
        }

        const adminContainer = document.getElementById('admin-login-buttons');
        if(adminContainer) {
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
                else app.showAlert("Incorrect PIN", "Access Denied");
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
        app.updateSidebar();
        app.navigate('pos');
    },

    // --- POS & CART ---
    renderPOS: () => {
        const catContainer = document.getElementById('pos-categories');
        const grid = document.getElementById('pos-grid');
        // Simple distinct categories
        const cats = [...new Set(app.data.products.map(p => p.cat))];
        
        catContainer.innerHTML = cats.map(c => `<div class="cat-tab" onclick="app.filterPos('${c}')">${c}</div>`).join('') + `<div class="cat-tab" onclick="app.filterPos('All')">All</div>`;
        
        app.filterPos('All'); // Initial render
        app.renderCart();
    },

    filterPos: (cat) => {
        const grid = document.getElementById('pos-grid');
        const items = cat === 'All' ? app.data.products : app.data.products.filter(p => p.cat === cat);
        grid.innerHTML = items.map(p => `
            <div class="product-card" onclick="app.addToCart(${p.id})">
                <div style="height:100px; background:#eee; display:flex; align-items:center; justify-content:center; color:#999;">${p.name.substring(0,2)}</div>
                <div class="prod-info">
                    <div class="prod-name">${p.name}</div>
                    <div class="prod-price">$${p.price.toFixed(2)}</div>
                    <div class="prod-stock">Stock: ${p.stock}</div>
                </div>
            </div>
        `).join('');
    },

    addToCart: (id) => {
        const prod = app.data.products.find(p => p.id === id);
        if(!prod) return;
        if(prod.stock <= 0) { app.showAlert("Out of Stock", "Cannot add item."); return; }
        
        app.data.cart.push({ ...prod, cartId: Date.now(), optionsSelected: [] });
        app.renderCart();
        playTone(600, 'sine', 0.1);
    },

    renderCart: () => {
        const list = document.getElementById('cart-list');
        if(app.data.cart.length === 0) {
            list.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>`;
            document.getElementById('pos-subtotal').innerText = "$0.00";
            document.getElementById('pos-tax').innerText = "$0.00";
            document.getElementById('pos-total').innerText = "$0.00";
            return;
        }

        list.innerHTML = app.data.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <strong>${item.name}</strong> - $${item.price.toFixed(2)}
                </div>
                <button class="btn-sm" onclick="app.removeFromCart(${index})" style="color:var(--danger)">X</button>
            </div>
        `).join('');

        const sub = app.data.cart.reduce((sum, i) => sum + i.price, 0);
        const tax = sub * app.data.taxRate;
        document.getElementById('pos-subtotal').innerText = "$" + sub.toFixed(2);
        document.getElementById('pos-tax').innerText = "$" + tax.toFixed(2);
        document.getElementById('pos-total').innerText = "$" + (sub + tax).toFixed(2);
    },

    removeFromCart: (index) => {
        app.data.cart.splice(index, 1);
        app.renderCart();
    },

    validateAndPay: (method) => {
        if(app.data.cart.length === 0) return;
        if(method === 'Cash') {
            const total = parseFloat(document.getElementById('pos-total').innerText.replace('$',''));
            document.getElementById('cash-modal-total').innerText = "$" + total.toFixed(2);
            app.tempCashEntry = "";
            document.getElementById('calc-display').innerText = "$0.00";
            document.getElementById('change-result').style.opacity = 0;
            document.getElementById('modal-cash').classList.add('open');
        } else {
            // Card simulation
            app.finalizeOrder(method, 0);
        }
    },

    finalizeCash: () => {
        const tendered = parseFloat(app.tempCashEntry);
        const total = parseFloat(document.getElementById('cash-modal-total').innerText.replace('$',''));
        if(tendered < total) { app.showAlert("Insufficient Funds", "Amount tendered is less than total."); return; }
        app.finalizeOrder('Cash', tendered - total);
        app.closeModal('modal-cash');
    },

    finalizeOrder: (method, change) => {
        const total = parseFloat(document.getElementById('pos-total').innerText.replace('$',''));
        const order = {
            id: app.data.orderCounter++,
            date: new Date().toISOString(),
            items: [...app.data.cart],
            total: total,
            method: method,
            cashier: app.data.currentCashier,
            customer: document.getElementById('customer-name').value || "Walk-in",
            status: "Pending" // For barista view
        };
        
        // Deduct Stock
        app.data.cart.forEach(cItem => {
            const p = app.data.products.find(prod => prod.id === cItem.id);
            if(p) p.stock--;
        });

        app.data.orders.unshift(order);
        app.data.cart = [];
        document.getElementById('customer-name').value = "";
        app.saveData();
        app.renderCart(); // Clear cart UI
        
        // Show Receipt
        const rCont = document.getElementById('receipt-content');
        rCont.innerHTML = `
            <div style="text-align:center; border-bottom:1px dashed #333; padding-bottom:10px; margin-bottom:10px;">
                <h3>STAR ACADEMY</h3>
                <p>Order #${order.id}</p>
                <p>${new Date().toLocaleString()}</p>
            </div>
            ${order.items.map(i => `<div>${i.name} - $${i.price.toFixed(2)}</div>`).join('')}
            <div style="border-top:1px dashed #333; margin-top:10px; padding-top:10px; text-align:right;">
                <strong>Total: $${order.total.toFixed(2)}</strong><br>
                <small>${method} Payment</small><br>
                ${method==='Cash'?`Change: $${change.toFixed(2)}`:''}
            </div>
        `;
        document.getElementById('modal-receipt').classList.add('open');
    },

    // --- BARISTA ---
    renderBarista: () => {
        const grid = document.getElementById('barista-grid');
        const pending = app.data.orders.filter(o => o.status === "Pending");
        
        if(pending.length === 0) { grid.innerHTML = "<p>No pending orders.</p>"; return; }
        
        grid.innerHTML = pending.map(o => `
            <div class="order-card">
                <div class="order-header">
                    <span>#${o.id} - ${o.customer}</span>
                    <span>${new Date(o.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div class="order-items">
                    <ul>${o.items.map(i => `<li>${i.name}</li>`).join('')}</ul>
                </div>
                <button class="btn-sm" style="width:100%; margin-top:10px; background:var(--success); color:white;" onclick="app.markReady(${o.id})">Mark Ready</button>
            </div>
        `).join('');
    },

    markReady: (id) => {
        const o = app.data.orders.find(ord => ord.id === id);
        if(o) { o.status = "Completed"; app.saveData(); app.renderBarista(); }
    },

    // --- DASHBOARD ---
    renderDashboard: () => {
        document.getElementById('dash-date').innerText = new Date().toLocaleDateString();
        
        // Stats
        const today = new Date().toDateString();
        const todaysOrders = app.data.orders.filter(o => new Date(o.date).toDateString() === today);
        const revenue = todaysOrders.reduce((s, o) => s + o.total, 0);
        
        document.getElementById('stat-revenue').innerText = "$" + revenue.toFixed(2);
        document.getElementById('stat-orders').innerText = todaysOrders.length;
        document.getElementById('stat-low').innerText = app.data.products.filter(p => p.stock < 10).length;

        // Table
        const tbody = document.getElementById('dashboard-orders-body');
        tbody.innerHTML = app.data.orders.slice(0, 10).map(o => `
            <tr>
                <td>${o.id}</td>
                <td>${new Date(o.date).toLocaleTimeString()}</td>
                <td>${o.customer}</td>
                <td>${o.cashier}</td>
                <td>$${o.total.toFixed(2)}</td>
                <td>${o.status}</td>
                <td><button class="btn-sm" onclick="app.printOrder(${o.id})">Print</button></td>
            </tr>
        `).join('');
    },

    // --- INVENTORY ---
    renderInventory: () => {
        const tbody = document.getElementById('inventory-body');
        tbody.innerHTML = app.data.products.map(p => `
            <tr>
                <td><div style="width:40px; height:40px; background:#eee; border-radius:4px;"></div></td>
                <td>${p.name}</td>
                <td>${p.cat}</td>
                <td>${p.stock}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>${p.stock < 10 ? '<span style="color:var(--danger)">Low</span>' : 'OK'}</td>
                <td><button class="btn-sm" onclick="app.editInventory(${p.id})">Edit</button></td>
            </tr>
        `).join('');
    },

    editInventory: (id) => {
        const p = app.data.products.find(x => x.id === id);
        if(p) {
            document.getElementById('edit-inv-name').innerText = p.name;
            document.getElementById('edit-inv-stock').value = p.stock;
            document.getElementById('edit-inv-price').value = p.price;
            app.data.editingId = id;
            document.getElementById('modal-edit-inventory').classList.add('open');
        }
    },

    saveInventory: () => {
        const p = app.data.products.find(x => x.id === app.data.editingId);
        if(p) {
            p.stock = parseInt(document.getElementById('edit-inv-stock').value);
            p.price = parseFloat(document.getElementById('edit-inv-price').value);
            app.saveData();
            app.closeModal('modal-edit-inventory');
            app.renderInventory();
        }
    },

    // --- TIME CLOCK ---
    renderTimeClock: () => {
        const sel = document.getElementById('time-employee-select');
        sel.innerHTML = '<option value="">Select your name...</option>' + app.data.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        
        // Active List
        const activeContainer = document.getElementById('active-workers-list');
        const active = app.data.timeEntries.filter(t => !t.out);
        if(active.length === 0) activeContainer.innerHTML = "No one is clocked in.";
        else activeContainer.innerHTML = active.map(t => `<span style="background:var(--success); color:white; padding:5px 10px; border-radius:15px; margin-right:5px;">${t.name}</span>`).join('');

        document.getElementById('time-active-count').innerText = active.length;
    },

    clockIn: () => {
        const name = document.getElementById('time-employee-select').value;
        if(!name) return;
        if(app.data.timeEntries.find(t => t.name === name && !t.out)) { app.showAlert("Error", "Already clocked in."); return; }
        
        app.data.timeEntries.push({ name: name, in: new Date().toISOString(), out: null });
        app.saveData();
        app.renderTimeClock();
        app.showAlert("Success", "Clocked In!");
    },

    clockOut: () => {
        const name = document.getElementById('time-employee-select').value;
        if(!name) return;
        const entry = app.data.timeEntries.find(t => t.name === name && !t.out);
        if(!entry) { app.showAlert("Error", "Not clocked in."); return; }
        
        entry.out = new Date().toISOString();
        app.saveData();
        app.renderTimeClock();
        app.showAlert("Success", "Clocked Out!");
    },

    // --- MANAGER & ROLES (v1.50 Features) ---
    renderManager: () => {
        const empBody = document.getElementById('employees-body');
        empBody.innerHTML = app.data.employees.map(e => `
            <tr>
                <td><img src="${e.img}" style="width:30px; height:30px; border-radius:50%;" onerror="this.src='images/placeholder.png'"></td>
                <td>${e.name}</td>
                <td>${e.role}</td>
                <td><button class="btn-sm" onclick="app.deleteEmployee(${e.id})" style="color:var(--danger)">X</button></td>
            </tr>
        `).join('');

        // --- NEW v1.50: Render Dynamic Roles ---
        const roleBody = document.getElementById('role-list-body');
        if (roleBody) {
            roleBody.innerHTML = app.data.roles.map(r => `
                <li>
                    <span>${r}</span>
                    ${(r !== 'Manager' && r !== 'IT Admin') ? `<button class="btn-sm" style="color:var(--danger); border:none;" onclick="app.deleteRole('${r}')"><i class="fa-solid fa-trash"></i></button>` : '<span style="color:#ccc; font-size:0.8rem;">(Locked)</span>'}
                </li>
            `).join('');
        }
    },

    // New v1.50 Function
    addRole: () => {
        const newRole = prompt("Enter the name of the new Role (e.g., 'Senior Barista'):");
        if(newRole && newRole.trim() !== "") {
            if(app.data.roles.includes(newRole)) {
                app.showAlert("Error", "Role already exists.");
                return;
            }
            app.data.roles.push(newRole);
            app.saveData();
            app.renderManager();
        }
    },

    // New v1.50 Function
    deleteRole: (roleName) => {
        if(confirm(`Are you sure you want to delete the "${roleName}" role?`)) {
            app.data.roles = app.data.roles.filter(r => r !== roleName);
            app.saveData();
            app.renderManager();
        }
    },

    openEmployeeModal: () => {
        document.getElementById('emp-name').value = "";
        document.getElementById('emp-img-url').value = "";
        
        // v1.50: Populate select with dynamic roles
        const select = document.getElementById('emp-role');
        select.innerHTML = app.data.roles.map(r => `<option value="${r}">${r}</option>`).join('');
        
        document.getElementById('modal-employee').classList.add('open');
    },

    saveEmployee: () => {
        const name = document.getElementById('emp-name').value;
        const role = document.getElementById('emp-role').value;
        const img = document.getElementById('emp-img-url').value;
        
        if(!name) return;
        app.data.employees.push({
            id: Date.now(),
            name, role, img
        });
        app.saveData();
        app.closeModal('modal-employee');
        app.renderManager();
    },

    deleteEmployee: (id) => {
        if(confirm("Delete employee?")) {
            app.data.employees = app.data.employees.filter(e => e.id !== id);
            app.saveData();
            app.renderManager();
        }
    },

    // --- IT & SYSTEM (v1.50 Features) ---
    renderIT: () => {
        // Basic IT render logic
        document.getElementById('it-db-status').innerText = (window.firebase) ? "Connected" : "Local Only";
    },

    // New v1.50 Function
    resetITPassword: () => {
        const email = "tatiangreenleaf@gmail.com";
        const subject = "Star Academy POS - Admin Password Reset";
        const body = "Please reset the password for the IT Admin account.";
        
        // In a real app, this would hit an API. Here we simulate via mailto
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        app.showAlert("Reset Initiated", `Instructions have been prepared for ${email}`);
    },

    downloadFullBackup: () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(app.data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "StarAcademy_Backup_v1.50.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    // --- UTILS ---
    updateClock: () => {
        const now = new Date();
        const t = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if(document.getElementById('live-clock')) document.getElementById('live-clock').innerText = t;
        if(document.getElementById('big-clock')) document.getElementById('big-clock').innerText = t;
        if(document.getElementById('big-date')) document.getElementById('big-date').innerText = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    },

    showAlert: (title, msg) => {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-message').innerText = msg;
        document.getElementById('modal-alert').classList.add('open');
    },

    closeModal: (id) => { document.getElementById(id).classList.remove('open'); },
    closeReceiptAndReset: () => { app.closeModal('modal-receipt'); },
    
    // PIN Logic
    requestPin: (cb) => {
        app.pinBuffer = "";
        app.pinCallback = cb;
        document.getElementById('pin-display').innerText = "";
        document.getElementById('pin-error').innerText = "";
        document.getElementById('modal-pin').classList.add('open');
    },
    pinInput: (num) => {
        if(app.pinBuffer.length < 4) {
            app.pinBuffer += num;
            document.getElementById('pin-display').innerText = "*".repeat(app.pinBuffer.length);
        }
    },
    pinClear: () => { app.pinBuffer = ""; document.getElementById('pin-display').innerText = ""; },
    pinSubmit: () => {
        app.closeModal('modal-pin');
        if(app.pinCallback) app.pinCallback(app.pinBuffer);
    },

    // Calculator Logic (Cash Modal)
    calcInput: (val) => {
        if(val === '.') {
            if(!app.tempCashEntry.includes('.')) app.tempCashEntry += val;
        } else {
            app.tempCashEntry += val;
        }
        document.getElementById('calc-display').innerText = "$" + app.tempCashEntry;
        
        // Real-time change calc
        const tendered = parseFloat(app.tempCashEntry);
        const total = parseFloat(document.getElementById('cash-modal-total').innerText.replace('$',''));
        if(!isNaN(tendered) && tendered >= total) {
             const change = tendered - total;
             document.getElementById('change-amt').innerText = "$" + change.toFixed(2);
             document.getElementById('change-result').style.opacity = 1;
        } else {
             document.getElementById('change-result').style.opacity = 0;
        }
    },
    calcClear: () => { app.tempCashEntry = ""; document.getElementById('calc-display').innerText = "$0.00"; document.getElementById('change-result').style.opacity = 0; },
    calcExact: () => {
         const total = document.getElementById('cash-modal-total').innerText.replace('$','');
         app.tempCashEntry = total;
         document.getElementById('calc-display').innerText = "$" + total;
    },
    calcNext: (amt) => {
         app.tempCashEntry = amt.toString();
         app.calcInput(''); // trigger update
    }
};

window.app = app;
window.onload = app.init;
