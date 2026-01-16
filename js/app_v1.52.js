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
        roles: ['Cashier', 'Barista', 'Inventory', 'Manager', 'IT Admin'], 
        timeEntries: [], 
        bugReports: [], 
        orderCounter: 1001, 
        taxRate: 0.0925, 
        tempProduct: null, 
        tempOptions: {}, 
        tempCashEntry: "", 
        editingId: null, 
        inventorySort: { field: "name", dir: "asc" }
    },
    
    // Auth State
    pinBuffer: "",
    pinCallback: null,
    itAuthAttempts: 0, 

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
            if(active.id === 'view-manager') app.renderManagerHub(); 
            if(active.id === 'view-it') app.renderITHub(); 
            if(active.id === 'view-time') app.renderTimeClock();
        }
    },

    loadLocalData: () => {
        // We use v1.35 key to maintain compatibility, or upgrade to v1.52 key
        const stored = localStorage.getItem('starAcademyPOS_v131') || localStorage.getItem('starAcademyPOS_v152');
        if (stored) {
            app.data = JSON.parse(stored);
            // v1.52 SELF-REPAIR: Add missing arrays to prevent crashes
            if (!app.data.roles) app.data.roles = ['Cashier', 'Barista', 'Inventory', 'Manager', 'IT Admin'];
            if (!app.data.bugReports) app.data.bugReports = [];
            if (!app.data.timeEntries) app.data.timeEntries = [];
            if (!app.data.orders) app.data.orders = [];
        } else {
            app.seedData();
        }
    },

    saveData: () => { 
        localStorage.setItem('starAcademyPOS_v152', JSON.stringify(app.data));
        if(window.saveToCloud) window.saveToCloud(app.data, true); 
    },

    seedData: () => {
        // Initialize default structure
        app.data.roles = ['Cashier', 'Barista', 'Inventory', 'Manager', 'IT Admin'];
        app.data.products = [
            // ... (keep your product list or leave empty) ...
        ];
        app.data.employees = [
            // ... (keep your default employees) ...
        ];
        app.data.orderCounter = 1001;
        app.data.orders = [];
        app.data.timeEntries = [];
        app.data.bugReports = [];
        
        // SAFETY FIX: Save ONLY to LocalStorage initially.
        // We DO NOT call window.saveToCloud() here.
        // This prevents overwriting your real Firebase data with this seed data
        // if the app loads on a new device before the cloud sync finishes.
        localStorage.setItem('starAcademyPOS_v152', JSON.stringify(app.data));
        
        console.log("Seed data initialized (Local Only). Waiting for Cloud Sync...");
    },

    updateSidebar: () => {
        const manLink = document.getElementById('nav-manager');
        const itLink = document.getElementById('nav-it');
        if (manLink) manLink.classList.add('hidden');
        if (itLink) itLink.classList.add('hidden');
        
        const currentUser = app.data.employees.find(e => e.name === app.data.currentCashier);
        const role = (app.data.currentCashier === 'Manager') ? 'Manager' : 
                     (app.data.currentCashier === 'IT Support') ? 'IT Admin' : 
                     (currentUser ? currentUser.role : null);

        if (role === 'Manager') {
            if (manLink) manLink.classList.remove('hidden');
        } else if (role === 'IT Admin') {
            if (itLink) itLink.classList.remove('hidden');
            if (manLink) manLink.classList.remove('hidden'); 
        }
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

    // --- AUTHENTICATION & SECURITY (v1.52) ---
    login: (name) => {
        if (name === 'Manager') {
             app.requestPin((pin) => {
                if (pin === "1234") app.completeLogin("Manager", "Manager");
                else app.showAlert("Incorrect PIN", "Access Denied");
            });
            return;
        }
        if (name === 'IT Support') {
             app.itAuthAttempts = 0;
             document.getElementById('it-reset-btn').classList.add('hidden');
             
             app.requestPin((pin) => {
                if (pin === "9753") {
                    app.itAuthAttempts = 0;
                    app.closeModal('modal-pin'); // v1.52 FIX: Close modal on success
                    app.completeLogin("IT Support", "IT Admin");
                } else {
                    app.itAuthAttempts++;
                    let msg = "Incorrect PIN.";
                    if (app.itAuthAttempts >= 2) {
                        msg += " (Attempts exceeded)";
                        document.getElementById('it-reset-btn').classList.remove('hidden');
                    }
                    app.showAlert("Access Denied", msg);
                }
            });
            return;
        }

        const emp = app.data.employees.find(e => e.name === name);
        if (emp) app.completeLogin(emp.name, emp.role);
    },

    resetITPassword: () => {
        if(confirm("Send password reset instructions to tatiangreenleaf@gmail.com?")) {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().sendPasswordResetEmail('tatiangreenleaf@gmail.com')
                .then(() => app.showAlert("Email Sent", "Check your inbox."))
                .catch((e) => app.showAlert("Error", e.message));
            } else {
                app.showAlert("Simulation", "Reset link sent to tatiangreenleaf@gmail.com");
            }
            app.closeModal('modal-pin');
        }
    },

    completeLogin: (name, role) => {
        app.data.currentCashier = name;
        document.getElementById('login-overlay').style.display = "none";
        document.getElementById('header-cashier').innerHTML = `<i class="fa-solid fa-user-circle" style="margin-right: 10px;"></i> ${name} (${role})`;
        app.updateSidebar();
        app.navigate('pos');
    },

    logout: () => {
        app.data.currentCashier = null;
        document.getElementById('login-overlay').style.display = "flex";
        app.renderLogin();
    },

    // --- MANAGER HUB ---
    renderManagerHub: () => { 
        app.renderBugReports(); 
        app.renderProductsManager(); 
        app.renderEmployeesManager(); 
        app.renderRoles(); 
    },

    // Role Management
    renderRoles: () => {
        const list = document.getElementById('role-list');
        if(!list) return;
        list.innerHTML = app.data.roles.map(r => {
            const isSystem = ['Manager', 'IT Admin'].includes(r);
            return `
                <li class="role-item">
                    <span>${r}</span>
                    <div>
                        ${!isSystem ? `<button class="btn-role-action" onclick="app.editRole('${r}')"><i class="fa-solid fa-pen"></i></button>` : ''}
                        ${!isSystem ? `<button class="btn-role-action btn-role-delete" onclick="app.deleteRole('${r}')"><i class="fa-solid fa-trash"></i></button>` : '<i class="fa-solid fa-lock" style="color:#ccc; font-size:0.8rem; margin-left:5px;"></i>'}
                    </div>
                </li>
            `;
        }).join('');
    },

    addRole: () => {
        const name = prompt("Enter new role name:");
        if(name) {
            if(app.data.roles.includes(name)) return app.showAlert("Error", "Role already exists.");
            app.data.roles.push(name);
            app.saveData();
            app.renderRoles();
        }
    },

    deleteRole: (name) => {
        if(confirm(`Delete role "${name}"?`)) {
            app.data.roles = app.data.roles.filter(r => r !== name);
            app.saveData();
            app.renderRoles();
        }
    },

    editRole: (oldName) => {
        const newName = prompt("Rename role:", oldName);
        if(newName && newName !== oldName) {
            if(app.data.roles.includes(newName)) return app.showAlert("Error", "Role exists.");
            const idx = app.data.roles.indexOf(oldName);
            if(idx !== -1) app.data.roles[idx] = newName;
            app.data.employees.forEach(e => {
                if(e.role === oldName) e.role = newName;
            });
            app.saveData();
            app.renderManagerHub(); 
        }
    },

    // Employee Management
    renderEmployeesManager: () => {
        const tbody = document.getElementById('employees-body');
        tbody.innerHTML = app.data.employees.map(e => `
            <tr>
                <td><img src="${e.img}" class="emp-thumb" onerror="this.src='images/placeholder.png'"> ${e.name}</td>
                <td>${e.role}</td>
                <td>
                    <button class="btn-sm" onclick="app.editEmployee(${e.id})">Edit</button>
                    <button class="btn-sm btn-danger-sm" onclick="app.deleteEmployee(${e.id})">X</button>
                </td>
            </tr>
        `).join('');
    },

    openEmployeeModal: () => {
        const sel = document.getElementById('emp-role');
        sel.innerHTML = app.data.roles.map(r => `<option value="${r}">${r}</option>`).join('');
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
        sel.innerHTML = app.data.roles.map(r => `<option value="${r}" ${r === emp.role ? 'selected' : ''}>${r}</option>`).join('');
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

    // --- STANDARD POS FUNCTIONS ---
    renderPOS: () => {
        const cats = ['All', ...new Set(app.data.products.map(p => p.cat))];
        document.getElementById('pos-categories').innerHTML = cats.map(c => `<div class="cat-tab" onclick="app.filterPos('${c}')">${c}</div>`).join('');
        app.filterPos('All');
        app.renderCart();
    },
    filterPos: (cat) => {
        const items = cat === 'All' ? app.data.products : app.data.products.filter(p => p.cat === cat);
        document.getElementById('pos-grid').innerHTML = items.map(p => `
            <div class="product-card" onclick="app.addToCart(${p.id})">
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
        if(!app.data.cart.length) {
            list.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>`;
            document.getElementById('pos-total').innerText = "$0.00";
            return;
        }
        list.innerHTML = app.data.cart.map((i, idx) => `
            <div class="cart-item">
                <div class="item-info"><h4>${i.name}</h4><div class="opts">$${i.price.toFixed(2)}</div></div>
                <button class="btn-del" onclick="app.data.cart.splice(${idx},1);app.renderCart()">X</button>
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
        
        // Receipt
        document.getElementById('receipt-content').innerHTML = `
            <div class="r-center"><h3>STAR ACADEMY</h3><p>Order #${order.id}</p></div>
            ${order.items.map(i => `<div class="r-row"><span>${i.name}</span><span>$${i.price.toFixed(2)}</span></div>`).join('')}
            <div class="r-line"></div>
            <div class="r-total r-row"><span>TOTAL</span><span>$${total.toFixed(2)}</span></div>
        `;
        document.getElementById('modal-receipt').classList.add('open');
    },
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
    
    // UTILS & CLOCK
    updateClock: () => {
        const d = new Date();
        if(document.getElementById('live-clock')) document.getElementById('live-clock').innerText = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    },
    renderTimeClock: () => {
        const s = document.getElementById('time-employee-select');
        s.innerHTML = `<option>Select name...</option>` + app.data.employees.map(e => `<option>${e.name}</option>`).join('');
        const active = app.data.timeEntries.filter(t => !t.out);
        document.getElementById('time-active-count').innerText = active.length;
        document.getElementById('active-workers-list').innerHTML = active.length ? active.map(a => `<span class="worker-pill">${a.name}</span>`).join('') : "Nobody clocked in.";
    },
    clockIn: () => {
        const n = document.getElementById('time-employee-select').value;
        if(n === 'Select name...') return;
        if(app.data.timeEntries.find(t => t.name === n && !t.out)) return app.showAlert("Error", "Already clocked in.");
        app.data.timeEntries.push({name:n, in:new Date().toISOString(), out:null});
        app.saveData(); app.renderTimeClock(); app.showAlert("Success", "Clocked in.");
    },
    clockOut: () => {
        const n = document.getElementById('time-employee-select').value;
        const e = app.data.timeEntries.find(t => t.name === n && !t.out);
        if(!e) return app.showAlert("Error", "Not clocked in.");
        e.out = new Date().toISOString();
        app.saveData(); app.renderTimeClock(); app.showAlert("Success", "Clocked out.");
    },
    
    // MODAL UTILS
    requestPin: (cb) => {
        app.pinBuffer = ""; app.pinCallback = cb;
        document.getElementById('pin-display').innerText = "";
        document.getElementById('pin-error').innerText = "";
        document.getElementById('modal-pin').classList.add('open');
    },
    pinInput: (n) => { if(app.pinBuffer.length < 4) app.pinBuffer += n; document.getElementById('pin-display').innerText = "*".repeat(app.pinBuffer.length); },
    pinClear: () => { app.pinBuffer = ""; document.getElementById('pin-display').innerText = ""; },
    pinSubmit: () => {
        if(app.pinCallback) app.pinCallback(app.pinBuffer);
    },
    closeModal: (id) => document.getElementById(id).classList.remove('open'),
    closeReceiptAndReset: () => { app.closeModal('modal-receipt'); },
    showAlert: (t, m) => { document.getElementById('alert-title').innerText = t; document.getElementById('alert-message').innerText = m; document.getElementById('modal-alert').classList.add('open'); },
    
    // IT TOOLS
    fetchTestingNotes: () => document.getElementById('github-notes-content').innerText = "Simulated Fetch: No updates.",
    downloadFullBackup: () => {
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(app.data));
        a.download = "StarAcademy_Backup_v1.52.json";
        a.click();
    },
    nuclearReset: () => { if(confirm("WIPE ALL DATA?")) { localStorage.clear(); location.reload(); } },
    
    // Other renders
    renderBarista: () => {
        document.getElementById('barista-grid').innerHTML = app.data.orders.filter(o => o.status === 'Pending').map(o => `
            <div class="order-card"><div class="oc-header">#${o.id} - ${o.customer}</div><div class="oc-body">${o.items.map(i => i.name).join('<br>')}</div><button class="btn-ready" onclick="app.markReady(${o.id})">Done</button></div>
        `).join('');
    },
    markReady: (id) => { app.data.orders.find(o => o.id === id).status = 'Completed'; app.saveData(); app.renderBarista(); },
    
    // Products
    renderProductsManager: () => {
        document.getElementById('products-manager-body').innerHTML = app.data.products.map(p => `<tr><td><img src="${p.img}" width="30"></td><td>${p.name}</td><td>$${p.price}</td><td><button class="btn-sm" onclick="app.editProduct(${p.id})">Edit</button></td></tr>`).join('');
    },
    openProductModal: () => {
        document.getElementById('prod-modal-title').innerText = "Add Product";
        document.getElementById('prod-name').value = "";
        document.getElementById('prod-price').value = "";
        document.getElementById('prod-stock').value = "";
        document.getElementById('prod-img-url').value = "";
        app.data.editingId = null;
        document.getElementById('modal-product').classList.add('open');
    },
    editProduct: (id) => {
        const p = app.data.products.find(x => x.id === id);
        document.getElementById('prod-modal-title').innerText = "Edit Product";
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-img-url').value = p.img;
        app.data.editingId = id;
        document.getElementById('modal-product').classList.add('open');
    },
    saveProduct: () => {
        const name = document.getElementById('prod-name').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const stock = parseInt(document.getElementById('prod-stock').value);
        const img = document.getElementById('prod-img-url').value;
        if(!name) return;
        const pData = {name, price, stock, img, cat:'Beverages'};
        if(app.data.editingId) {
            Object.assign(app.data.products.find(x => x.id === app.data.editingId), pData);
        } else {
            app.data.products.push({id:Date.now(), ...pData});
        }
        app.saveData(); app.closeModal('modal-product'); app.renderManagerHub();
    },
    generateAIImage: () => app.showAlert("AI Tool", "Simulated Image Generation."),
    addProductOptionUI: () => alert("Option Groups are simplified in this version."),
    
    // UTILS
    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-' + viewId).classList.add('active');
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        const navItem = document.getElementById('nav-' + viewId);
        if (navItem) navItem.classList.add('active');
        app.refreshUI();
    },
    renderBugReports: () => {
        const tbody = document.getElementById('bug-log-body');
        if (app.data.bugReports && app.data.bugReports.length > 0) {
            const logs = [...app.data.bugReports].reverse();
            tbody.innerHTML = logs.slice(0,5).map(l => `<tr><td style="font-size:0.8rem;">${new Date(l.date).toLocaleDateString()}</td><td>${l.type}</td><td>${l.details}</td></tr>`).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="3">No logs.</td></tr>';
        }
    },
    submitBugReport: () => {
        const type = document.getElementById('bug-type').value; 
        const details = document.getElementById('bug-details').value;
        if(!details) return app.showAlert("Details required.");
        app.data.bugReports.push({id: Date.now(), date: new Date().toISOString(), type, details});
        document.getElementById('bug-details').value = ""; 
        app.saveData(); 
        app.renderBugReports(); 
        app.showAlert("Log saved.");
    }
};

window.app = app;
window.onload = app.init;
