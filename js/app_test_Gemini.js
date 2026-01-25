/* Star Academy POS v1.97 (Diagnostics & 10min Backup) */

const APP_VERSION = "v1.97";
const STORAGE_KEY = "star_pos_v197_data";
const TAX_RATE = 0.0925;

const DEFAULT_PRODUCTS = [
    { id: 1, name: "Coffee", price: 2.50, cat: "Hot Drinks", opts: ["Cream", "Sugar"], img: "https://loremflickr.com/300/300/coffee,cup" },
    { id: 2, name: "Hot Chocolate", price: 3.00, cat: "Hot Drinks", opts: ["Whipped Cream"], img: "https://loremflickr.com/300/300/hot,chocolate" },
    { id: 3, name: "Blueberry Muffin", price: 3.50, cat: "Snacks", opts: [], img: "https://loremflickr.com/300/300/blueberry,muffin" }
];

const DEFAULT_DATA = {
    products: DEFAULT_PRODUCTS,
    categories: ["Hot Drinks", "Cold Drinks", "Snacks"],
    roles: ["Manager", "IT Support", "Barista", "Cashier"],
    employees: [], 
    cart: [],
    orders: [],
    timeEntries: [],
    orderCounter: 1001
};

// Temp State
let tempProduct = null;
let tempOptions = [];
let pinBuffer = "";
let targetRole = "";
let cashTendered = "";
let editingId = null;
let cardVerified = false;
let selectedTimeClockUser = null; 

window.app = {
    data: null,

    // --- NAVIGATION & INIT ---
    navigate: function(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        const viewEl = document.getElementById('view-' + view);
        const navEl = document.getElementById('nav-' + view);
        if(viewEl) viewEl.classList.add('active');
        if(navEl) navEl.classList.add('active');
        
        if(view === 'manager') this.switchMgrTab('staff'); 
        if(view === 'pos') this.renderPOS();
        if(view === 'inventory') this.renderInventory();
        if(view === 'barista') this.renderBarista();
        if(view === 'timeclock') this.renderTimeClock();
        if(view === 'it') this.renderIT();
    },

    // --- CLOUD SYNC ---
    syncData: async function(attempts = 5) {
        const statusEl = document.getElementById('cloud-status-indicator');
        if(statusEl) statusEl.textContent = "Syncing...";
        console.log(`Sync Attempt: ${6 - attempts}/5`);

        if (typeof window.fetchCloudData === "function") {
            try {
                const cloudData = await window.fetchCloudData();
                if (cloudData) {
                    console.log("Cloud Data Received");
                    if(cloudData.products && cloudData.products.length > 0) this.data.products = cloudData.products;
                    if(cloudData.employees && cloudData.employees.length > 0) this.data.employees = cloudData.employees;
                    else if(this.data.employees.length === 0) this.data.employees = [{name: 'Manager', role: 'Manager', status: 'out'}];
                    
                    if(cloudData.categories) this.data.categories = cloudData.categories;
                    
                    saveData();
                    this.refreshUI();
                    if(statusEl) statusEl.textContent = "Online";
                    return;
                }
            } catch (err) {
                console.error("Cloud Sync Error:", err);
            }
        }

        if(attempts > 0) {
            setTimeout(() => this.syncData(attempts - 1), 1000);
        } else {
            if(statusEl) statusEl.textContent = "Offline (Local)";
            if(this.data.employees.length === 0) {
                this.data.employees = [{name: 'Manager', role: 'Manager', status: 'out'}];
                this.refreshUI();
            }
        }
    },

    // --- IT HUB ---
    renderIT: function() {
        const container = document.getElementById('view-it');
        if(!container) return;
        container.innerHTML = `
            <div class="card">
                <h2 class="card-title"><i class="fa-solid fa-server"></i> IT Support Hub</h2>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
                        <h3><i class="fa-solid fa-book"></i> Documentation</h3>
                        <p>Access system files and project notes.</p>
                        <button class="btn" style="width:100%; margin-bottom:10px;" onclick="window.app.fetchDoc('docs/TESTING_NOTES.md')">View Testing Notes</button>
                        <button class="btn" style="width:100%;" onclick="window.app.fetchDoc('docs/FEATURE_SUGGESTIONS.md')">View Feature Suggestions</button>
                    </div>
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
                        <h3><i class="fa-solid fa-microchip"></i> System Tools</h3>
                        <p>Manage local data and connection.</p>
                        <button class="btn" style="width:100%; margin-bottom:10px; background:var(--stormy-teal); color:white;" onclick="window.app.syncData(5)">Force Cloud Sync</button>
                        <button class="btn" style="width:100%; margin-bottom:10px; background:var(--barista-purple); color:white;" onclick="window.app.runDiagnostics()">Run Diagnostics</button>
                        <button class="btn" style="width:100%; background:var(--danger); color:white;" onclick="if(confirm('Reset ALL local data?')){localStorage.removeItem('${STORAGE_KEY}'); location.reload();}">Factory Reset Local Data</button>
                    </div>
                </div>
                <div style="margin-top:20px; font-family:monospace; color:#666;">System Version: ${APP_VERSION}<br>Storage Key: ${STORAGE_KEY}</div>
            </div>
        `;
    },

    runDiagnostics: async function() {
        let log = "DIAGNOSTICS REPORT\n==================\n\n";
        
        // 1. Local App Health
        log += "[LOCAL DATA]\n";
        log += `App Version: ${APP_VERSION}\n`;
        log += `Data Loaded: ${this.data ? 'YES' : 'NO'}\n`;
        if(this.data) {
            log += `Employees: ${this.data.employees.length}\n`;
            log += `Products: ${this.data.products.length}\n`;
            log += `Categories: ${this.data.categories.length}\n`;
            log += `Pending Orders: ${this.data.orders.filter(o => o.status === 'Pending').length}\n`;
        }
        log += "\n";

        // 2. Cloud Health
        log += "[CLOUD CONNECTION]\n";
        const dot = document.getElementById('status-dot');
        const isOnline = dot && dot.classList.contains('online');
        log += `UI Status: ${isOnline ? 'Online' : 'Offline'}\n`;
        
        if(window.fetchCloudData) {
            log += "Probing Firestore...\n";
            try {
                const start = Date.now();
                const cloud = await window.fetchCloudData();
                const duration = Date.now() - start;
                if(cloud) {
                    log += `Latency: ${duration}ms\n`;
                    log += `Cloud Products: ${cloud.products ? cloud.products.length : 0}\n`;
                    log += `Cloud Employees: ${cloud.employees ? cloud.employees.length : 0}\n`;
                    log += "RESULT: HEALTHY ✅\n";
                } else {
                    log += "RESULT: EMPTY OR UNAVAILABLE ⚠️\n";
                }
            } catch(e) {
                log += `RESULT: ERROR ❌ (${e.message})\n`;
            }
        } else {
            log += "RESULT: MODULE MISSING ❌\n";
        }

        // Show Report
        const html = `<div style="background:#222; color:#0f0; padding:15px; border-radius:5px; height:400px; overflow-y:auto; font-family:monospace; white-space:pre-wrap;">${log}</div>`;
        this.openGenericModal("System Diagnostics", html, null);
        document.getElementById('gen-save-btn').style.display = 'none';
    },

    fetchDoc: function(path) {
        fetch(path)
            .then(response => { if(!response.ok) throw new Error("File not found or CORS blocked."); return response.text(); })
            .then(text => {
                const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const html = `<div style="background:#2d2d2d; color:#eee; padding:15px; border-radius:5px; height:400px; overflow-y:auto; font-family:monospace; white-space:pre-wrap;">${safeText}</div>`;
                this.openGenericModal(path, html, null);
                document.getElementById('gen-save-btn').style.display = 'none';
            })
            .catch(err => {
                alert("Error loading file. If opening via file://, browsers block this. Use a local server.");
                console.error(err);
            });
    },

    // --- POS & CART ---
    renderPOS: function() {
        const catContainer = document.getElementById('pos-categories');
        if(catContainer && catContainer.innerHTML === "") {
            let cats = ['All', ...this.data.categories];
            catContainer.innerHTML = cats.map(c => 
                `<button class="btn-sm" style="margin-right:5px; margin-bottom:5px;" onclick="window.app.filterPos('${c}')">${c}</button>`
            ).join('');
        }
        
        this.filterPos('All');
        this.renderCart();
    },

    filterPos: function(cat) {
        const grid = document.getElementById('pos-grid');
        const prods = (cat === 'All') ? this.data.products : this.data.products.filter(p => p.cat === cat);
        grid.innerHTML = prods.map(p => `
            <div class="product-card" onclick="window.app.addToCartPrecheck(${p.id})">
                <img src="${p.img}" class="prod-img" onerror="this.src='https://placehold.co/150x100?text=No+Img'">
                <div class="prod-info"><h4>${p.name}</h4><div>$${p.price.toFixed(2)}</div></div>
            </div>
        `).join('');
    },

    renderCart: function() {
        const list = document.getElementById('cart-list');
        const sub = this.data.cart.reduce((s,i) => s + (i.price * i.qty), 0);
        const total = sub + (sub * TAX_RATE);
        list.innerHTML = this.data.cart.map((item, i) => `
            <div class="cart-item">
                <div style="flex:1"><strong>${item.name}</strong>${item.options.length ? `<br><small style="color:#666">${item.options.join(', ')}</small>` : ''}</div>
                <div class="cart-qty-controls"><button class="cart-qty-btn" onclick="window.app.adjustQty(${i}, -1)">-</button><span>${item.qty}</span><button class="cart-qty-btn" onclick="window.app.adjustQty(${i}, 1)">+</button></div>
                <div style="color:var(--danger); cursor:pointer; margin-left:10px;" onclick="window.app.removeFromCart(${i})"><i class="fa-solid fa-trash"></i></div>
            </div>`).join('');
        document.getElementById('pos-subtotal').textContent = `$${sub.toFixed(2)}`;
        document.getElementById('pos-tax').textContent = `$${(sub*TAX_RATE).toFixed(2)}`;
        document.getElementById('pos-total').textContent = `$${total.toFixed(2)}`;
    },

    adjustQty: function(index, delta) {
        const item = this.data.cart[index];
        item.qty += delta;
        if(item.qty <= 0) { if(confirm("Remove item?")) this.data.cart.splice(index, 1); else item.qty = 1; }
        this.renderCart(); saveData();
    },

    addToCartPrecheck: function(id) {
        tempProduct = this.data.products.find(p => p.id === id);
        tempOptions = [];
        document.getElementById('opt-product-name').textContent = tempProduct.name;
        document.getElementById('opt-notes').value = "";
        const box = document.getElementById('opt-checkboxes');
        box.innerHTML = '';
        if(tempProduct.opts && tempProduct.opts.length > 0) {
            tempProduct.opts.forEach(opt => {
                const chip = document.createElement('div');
                chip.className = 'opt-chip'; chip.textContent = opt;
                chip.onclick = () => { chip.classList.toggle('selected'); if(tempOptions.includes(opt)) tempOptions = tempOptions.filter(o => o !== opt); else tempOptions.push(opt); };
                box.appendChild(chip);
            });
        }
        document.getElementById('modal-options').classList.add('open');
    },

    confirmAddToCart: function() {
        const note = document.getElementById('opt-notes').value;
        const finalOptions = [...tempOptions];
        if(note) finalOptions.push(note);
        const item = { ...tempProduct, qty: 1, options: finalOptions };
        const existing = this.data.cart.find(i => i.id === item.id && JSON.stringify(i.options) === JSON.stringify(item.options));
        if(existing) existing.qty++; else this.data.cart.push(item);
        document.getElementById('modal-options').classList.remove('open');
        this.renderCart(); saveData();
    },
    removeFromCart: function(idx) { this.data.cart.splice(idx, 1); this.renderCart(); saveData(); },

    // --- PAYMENTS ---
    validateAndPay: function(method) {
        if(this.data.cart.length === 0) return alert("Empty Cart");
        if(!document.getElementById('customer-name').value) return alert("Enter Customer Name");
        if(method === 'Cash') { cashTendered = ""; document.getElementById('modal-cash').classList.add('open'); try { updateCashUI(); } catch(e) {} } 
        else if (method === 'Card') {
            cardVerified = false; document.querySelector('.swipe-track').classList.remove('swiped');
            document.getElementById('card-msg').textContent = ""; document.getElementById('btn-process-card').style.opacity = "0.5"; document.getElementById('btn-process-card').style.pointerEvents = "none";
            document.getElementById('cc-num').value = ""; document.getElementById('cc-exp').value = ""; document.getElementById('cc-cvv').value = "";
            document.getElementById('modal-card').classList.add('open');
        }
    },
    cashInput: function(n) { cashTendered += n; updateCashUI(); },
    cashClear: function() { cashTendered = ""; updateCashUI(); },
    addCash: function(amount) { let current = parseFloat(cashTendered || "0"); current += amount; cashTendered = current.toString(); updateCashUI(); },
    finalizeCash: function() { if(parseFloat(cashTendered) >= getCartTotal()) { completeOrder('Cash'); document.getElementById('modal-cash').classList.remove('open'); } else { alert("Insufficient Funds"); } },
    simulateSwipe: function() { const track = document.querySelector('.swipe-track'); track.classList.add('swiped'); setTimeout(() => { document.getElementById('card-msg').textContent = "Card Read Successfully!"; cardVerified = true; document.getElementById('btn-process-card').style.opacity = "1"; document.getElementById('btn-process-card').style.pointerEvents = "auto"; }, 1000); },
    finalizeCard: function() {
        if(!cardVerified) {
            const num = document.getElementById('cc-num').value;
            if(num.length >= 12) cardVerified = true; else return alert("Please swipe card or enter valid details.");
        }
        if(cardVerified) { completeOrder('Card'); document.getElementById('modal-card').classList.remove('open'); }
    },

    // --- MANAGER ---
    switchMgrTab: function(tab) {
        document.querySelectorAll('.mgr-subview').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.mgr-tab').forEach(el => el.classList.remove('active'));
        if(document.getElementById('mgr-sub-' + tab)) document.getElementById('mgr-sub-' + tab).classList.add('active');
        const tabs = ['staff', 'menu', 'data'];
        document.querySelectorAll('.mgr-tab').forEach((b, i) => { if(tabs[i] === tab) b.classList.add('active'); });
        if(tab === 'staff') this.renderMgrStaff(); if(tab === 'menu') this.renderMgrMenu();
    },
    renderMgrStaff: function() {
        const empList = document.getElementById('mgr-employee-list');
        if(empList && this.data.employees) empList.innerHTML = this.data.employees.map(e => `<tr><td>${e.name}</td><td>${e.role}</td><td><button class="btn-sm" onclick="window.app.editEmployee('${e.name}')">Edit</button><button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteEmployee('${e.name}')">X</button></td></tr>`).join('');
        const roleList = document.getElementById('mgr-role-list');
        if(roleList && this.data.roles) roleList.innerHTML = this.data.roles.map(r => `<tr><td>${r}</td><td>${(r==='Manager'||r==='IT Support')?'System':`<button class="btn-sm" onclick="window.app.deleteRole('${r}')">X</button>`}</td></tr>`).join('');
    },
    renderMgrMenu: function() {
        const prodList = document.getElementById('mgr-product-list');
        if(prodList && this.data.products) prodList.innerHTML = this.data.products.map(p => `<tr><td><img src="${p.img}" width="30"></td><td>${p.name}</td><td>$${p.price.toFixed(2)}</td><td>${p.cat}</td><td><button class="btn-sm" onclick="window.app.editProduct(${p.id})">Edit</button><button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteProduct(${p.id})">X</button></td></tr>`).join('');
        const catList = document.getElementById('mgr-cat-list');
        if(catList && this.data.categories) catList.innerHTML = this.data.categories.map(c => `<li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">${c} <button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteCategory('${c}')">X</button></li>`).join('');
    },
    editEmployee: function(name = null) {
        const emp = name ? this.data.employees.find(e => e.name === name) : null; editingId = name;
        const html = `<div class="form-group"><label>Name</label><input id="gen-input-1" class="form-control" value="${emp ? emp.name : ''}"></div><div class="form-group"><label>Role</label><select id="gen-input-2" class="form-control">${this.data.roles.map(r => `<option ${emp && emp.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div><div class="form-group"><label>Photo URL</label><input id="gen-input-3" class="form-control" value="${emp ? (emp.img||'') : ''}"></div>`;
        this.openGenericModal("Employee", html, () => {
            const newName = document.getElementById('gen-input-1').value, newRole = document.getElementById('gen-input-2').value, newImg = document.getElementById('gen-input-3').value;
            if(!newName) return alert("Name required");
            if(editingId) { const idx = this.data.employees.findIndex(e => e.name === editingId); if(idx > -1) this.data.employees[idx] = { name: newName, role: newRole, img: newImg, status: 'out' }; } 
            else { this.data.employees.push({ name: newName, role: newRole, img: newImg, status: 'out' }); }
            saveData(); this.renderMgrStaff(); this.closeModal('modal-generic');
        });
    },
    deleteEmployee: function(name) { if(confirm("Remove?")) { this.data.employees = this.data.employees.filter(e => e.name !== name); saveData(); this.renderMgrStaff(); } },
    editRole: function() { this.openGenericModal("Add Role", `<div class="form-group"><label>Role Name</label><input id="gen-input-1" class="form-control"></div>`, () => { const r = document.getElementById('gen-input-1').value; if(r && !this.data.roles.includes(r)) { this.data.roles.push(r); saveData(); this.renderMgrStaff(); this.closeModal('modal-generic'); } }); },
    deleteRole: function(r) { if(confirm("Delete?")) { this.data.roles = this.data.roles.filter(x => x !== r); saveData(); this.renderMgrStaff(); } },
    editProduct: function(id = null) {
        editingId = id; const p = id ? this.data.products.find(x => x.id === id) : { name:'', price:'', img:'', cat: this.data.categories[0], opts:[] };
        document.getElementById('edit-prod-id').value = id || ''; document.getElementById('edit-prod-name').value = p.name; document.getElementById('edit-prod-price').value = p.price; document.getElementById('edit-prod-img').value = p.img || ''; document.getElementById('edit-prod-opts').value = p.opts ? p.opts.join(', ') : '';
        document.getElementById('edit-prod-cat').innerHTML = this.data.categories.map(c => `<option ${c===p.cat?'selected':''}>${c}</option>`).join('');
        this.updateImagePreview(); document.getElementById('modal-product').classList.add('open');
    },
    saveProduct: function() {
        const id = document.getElementById('edit-prod-id').value, name = document.getElementById('edit-prod-name').value, price = parseFloat(document.getElementById('edit-prod-price').value), cat = document.getElementById('edit-prod-cat').value, img = document.getElementById('edit-prod-img').value, opts = document.getElementById('edit-prod-opts').value.split(',').map(s=>s.trim()).filter(x=>x);
        if(!name) return alert("Name required");
        if(id) { const idx = this.data.products.findIndex(x => x.id == id); if(idx > -1) this.data.products[idx] = { id: parseInt(id), name, price, cat, img, opts }; } 
        else { this.data.products.push({ id: Date.now(), name, price, cat, img, opts }); }
        saveData(); this.closeModal('modal-product'); this.renderMgrMenu(); this.renderPOS();
    },
    deleteProduct: function(id) { if(confirm("Delete?")) { this.data.products = this.data.products.filter(p => p.id !== id); saveData(); this.renderMgrMenu(); this.renderPOS(); } },
    editCategory: function() { this.openGenericModal("Add Category", `<div class="form-group"><label>Category Name</label><input id="gen-input-1" class="form-control"></div>`, () => { const c = document.getElementById('gen-input-1').value; if(c && !this.data.categories.includes(c)) { this.data.categories.push(c); saveData(); this.renderMgrMenu(); this.closeModal('modal-generic'); } }); },
    deleteCategory: function(c) { if(confirm("Delete?")) { this.data.categories = this.data.categories.filter(x => x !== c); saveData(); this.renderMgrMenu(); } },
    generateAIImage: function() { const name = document.getElementById('edit-prod-name').value; if(!name) return alert("Enter Product Name"); const url = `https://loremflickr.com/400/300/${encodeURIComponent(name.replace(/ /g, ','))}?lock=${Math.floor(Math.random()*1000)}`; document.getElementById('edit-prod-img').value = url; this.updateImagePreview(); },
    updateImagePreview: function() { const url = document.getElementById('edit-prod-img').value; document.getElementById('img-preview-box').innerHTML = url ? `<img src="${url}" style="width:100%; height:100%; object-fit:contain;">` : `<span>No Image Preview</span>`; },

    // --- SYSTEM ---
    login: function(name) { document.getElementById('login-overlay').style.display = 'none'; document.getElementById('header-cashier').innerHTML = `<i class="fa-solid fa-user-circle"></i> ${name}`; this.navigate('pos'); this.syncData(5); },
    logout: function() { this.data.cart = []; document.getElementById('login-overlay').style.display = 'flex'; document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'none'); },
    promptPin: function(role) { targetRole = role; pinBuffer = ""; document.getElementById('pin-display').textContent = "Enter PIN"; document.getElementById('modal-pin').classList.add('open'); },
    pinInput: function(n) { if(pinBuffer.length < 4) { pinBuffer += n; document.getElementById('pin-display').textContent = "•".repeat(pinBuffer.length); } },
    pinClear: function() { pinBuffer = ""; document.getElementById('pin-display').textContent = "Enter PIN"; },
    pinSubmit: function() {
        const PINS = { 'Manager': '1234', 'IT Support': '9753' };
        if(PINS[targetRole] && pinBuffer === PINS[targetRole]) {
            document.getElementById('modal-pin').classList.remove('open'); this.login(targetRole);
            document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'block');
            if(targetRole === 'Manager') this.navigate('manager'); else this.navigate('it');
        } else { alert("Incorrect PIN"); this.pinClear(); }
    },
    startKioskMode: function() { this.navigate('kiosk'); const grid = document.getElementById('kiosk-grid'); if(grid) grid.innerHTML = this.data.products.map(p => `<div class="product-card" onclick="alert('Please ask a cashier.')"><img src="${p.img}" class="prod-img"><h4>${p.name}</h4><div>$${p.price.toFixed(2)}</div></div>`).join(''); },
    exitKioskMode: function() { this.navigate('pos'); this.logout(); },
    
    // --- TIMECLOCK ---
    renderTimeClock: function() {
        let container = document.getElementById('time-clock-grid');
        if (!container) {
            const oldSelect = document.getElementById('time-employee-select');
            if (oldSelect) { const parent = oldSelect.closest('.card'); if(parent) { parent.innerHTML = `<h2 class="card-title">Employee Time Clock</h2><div id="time-clock-grid" class="tc-grid"></div>`; container = document.getElementById('time-clock-grid'); } }
            else { const view = document.getElementById('view-timeclock'); if(view) { const card = view.querySelector('.card'); if(card) { card.innerHTML = `<h2 class="card-title">Employee Time Clock</h2><div id="time-clock-grid" class="tc-grid"></div>`; container = document.getElementById('time-clock-grid'); } } }
        }
        if(!container) return;
        if(this.data.employees.length === 0) { container.innerHTML = `<p style="text-align:center; color:#666;">No employees found. <br>Syncing from cloud...</p>`; return; }
        container.innerHTML = this.data.employees.map((e, index) => {
            return `<div class="tc-card ${e.status === 'in' ? 'status-in' : 'status-out'}" onclick="window.app.selectTimeClockUser(${index})"><div class="tc-avatar">${e.img ? `<img src="${e.img}">` : `<div class="tc-initials">${e.name.substring(0,1)}</div>`}</div><div class="tc-info"><h3>${e.name}</h3><div class="tc-badge">${e.status === 'in' ? 'CLOCKED IN' : 'CLOCKED OUT'}</div></div></div>`;
        }).join('');
    },
    selectTimeClockUser: function(index) {
        selectedTimeClockUser = this.data.employees[index]; const status = selectedTimeClockUser.status || 'out';
        const html = `<div style="text-align:center;"><div class="tc-avatar large" style="margin:0 auto 15px auto; width:100px; height:100px; font-size:3rem; line-height:100px;">${selectedTimeClockUser.img ? `<img src="${selectedTimeClockUser.img}">` : selectedTimeClockUser.name.substring(0,1)}</div><h3>${selectedTimeClockUser.name}</h3><p>Currently: <strong>${status.toUpperCase()}</strong></p><hr><div style="display:flex; gap:10px; justify-content:center; margin-top:20px;"><button class="btn" style="background:var(--success); color:white; flex:1;" onclick="window.app.processTimeClock('in')">Clock IN</button><button class="btn" style="background:var(--danger); color:white; flex:1;" onclick="window.app.processTimeClock('out')">Clock OUT</button></div></div>`;
        this.openGenericModal("Time Clock Action", html, null); document.getElementById('gen-save-btn').style.display = 'none';
    },
    processTimeClock: function(action) {
        if(!selectedTimeClockUser) return; selectedTimeClockUser.status = action;
        this.data.timeEntries = this.data.timeEntries || []; this.data.timeEntries.push({ name: selectedTimeClockUser.name, action: action, time: new Date().toISOString() });
        saveData(); this.closeModal('modal-generic'); document.getElementById('gen-save-btn').style.display = 'inline-block';
        alert(`${selectedTimeClockUser.name} Clocked ${action.toUpperCase()}`); this.renderTimeClock(); if(window.saveToCloud) window.saveToCloud(this.data);
    },

    closeModal: function(id) { document.getElementById(id).classList.remove('open'); },
    printTimesheet: function() { const html = `<h1>Timesheet Report</h1><table style="width:100%; border-collapse:collapse; margin-top:20px;"><tr style="border-bottom:2px solid #000;"><th>Name</th><th>Role</th><th>Status</th></tr>${this.data.employees.map(e => `<tr><td style="padding:10px; border-bottom:1px solid #ccc;">${e.name}</td><td>${e.role}</td><td>${e.status}</td></tr>`).join('')}</table>`; this.printHTML(html); },
    viewReceipts: function() { const list = document.getElementById('receipt-list'); list.innerHTML = this.data.orders.slice().reverse().map(o => `<div style="border-bottom:1px solid #eee; padding:10px; display:flex; justify-content:space-between;"><div><strong>#${o.id}</strong> ${o.customer}</div><div>$${o.total.toFixed(2)} <button class="btn-sm" onclick="window.app.printReceipt(${o.id})">Print</button></div></div>`).join(''); document.getElementById('modal-receipts').classList.add('open'); },
    printReceipt: function(id) { const o = this.data.orders.find(x => x.id === id); if(!o) return; const html = `<div style="text-align:center; font-family:monospace;"><h2>STAR ACADEMY</h2><p>Order #${o.id}</p><p>${new Date(o.time).toLocaleString()}</p><hr>${o.items.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qty} ${i.name}</span><span>$${(i.price*i.qty).toFixed(2)}</span></div>`).join('')}<hr><h3>Total: $${o.total.toFixed(2)}</h3><p>Customer: ${o.customer}</p></div>`; this.printHTML(html); },
    printHTML: function(htmlContent) { const area = document.getElementById('print-area'); area.innerHTML = htmlContent; window.print(); setTimeout(() => area.innerHTML = '', 1000); },
    openGenericModal: function(title, bodyHtml, saveCallback) { 
        document.getElementById('gen-modal-title').innerText = title; 
        document.getElementById('gen-modal-body').innerHTML = bodyHtml; 
        const btn = document.getElementById('gen-save-btn'); 
        if(saveCallback) { btn.onclick = saveCallback; btn.style.display='inline-block'; } else { btn.style.display='none'; } 
        document.getElementById('modal-generic').classList.add('open'); 
    },

    // Renderers
    renderInventory: function() { const tbody = document.getElementById('inventory-body'); if(tbody) tbody.innerHTML = this.data.products.map(p => `<tr><td>${p.name}</td><td>OK</td></tr>`).join(''); },
    renderBarista: function() {
        const grid = document.getElementById('barista-grid'); const pending = this.data.orders.filter(o => o.status === 'Pending');
        if(grid) grid.innerHTML = pending.length ? pending.map(o => `<div style="background:white; padding:15px; border-left:5px solid var(--stormy-teal); margin-bottom:10px; border-radius:8px;"><h3>#${o.id} ${o.customer}</h3><ul>${o.items.map(i => `<li>${i.qty}x ${i.name} ${i.options.join(', ')}</li>`).join('')}</ul><button class="btn-sm" onclick="this.parentElement.style.opacity=0.5">Ready</button></div>`).join('') : '<p style="color:#888;">No pending orders</p>';
    },
    refreshUI: function() { 
        this.renderPOS(); this.renderBarista();
        const lg = document.getElementById('student-login-grid');
        if(lg) {
            if(!this.data.employees || this.data.employees.length === 0) lg.innerHTML = `<p>Loading users...</p>`;
            else lg.innerHTML = this.data.employees.map(e => `<div onclick="window.app.login('${e.name}')" style="display:inline-block; margin:10px; cursor:pointer; text-align:center;"><div style="width:60px; height:60px; background:#eee; border-radius:50%; margin:0 auto; border:3px solid var(--golden-bronze); overflow:hidden;">${e.img ? `<img src="${e.img}" style="width:100%;height:100%;object-fit:cover;">` : ''}</div><div style="font-weight:bold; color:var(--space-indigo); font-size:0.9rem;">${e.name}</div></div>`).join('');
        }
        const rev = this.data.orders.reduce((s,o) => s + o.total, 0);
        if(document.getElementById('dash-revenue')) document.getElementById('dash-revenue').textContent = `$${rev.toFixed(2)}`;
        if(document.getElementById('dash-orders')) document.getElementById('dash-orders').textContent = this.data.orders.length;
    }
};

// --- HELPERS & INIT ---
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(window.app.data)); if(window.saveToCloud) window.saveToCloud(window.app.data, true); }
function getCartTotal() { const sub = window.app.data.cart.reduce((s,i) => s + (i.price * i.qty), 0); return sub + (sub * TAX_RATE); }
function completeOrder(method) { window.app.data.orders.push({ id: window.app.data.orderCounter++, customer: document.getElementById('customer-name').value, items: [...window.app.data.cart], total: getCartTotal(), status: "Pending", time: new Date().toISOString() }); window.app.data.cart = []; document.getElementById('customer-name').value = ""; window.app.renderPOS(); window.app.renderBarista(); saveData(); alert("Order Placed!"); }
function updateCashUI() { const total = getCartTotal(); const val = parseFloat(cashTendered || "0"); const bar = document.getElementById('change-display-box'); if(document.getElementById('calc-display')) document.getElementById('calc-display').textContent = `$${val.toFixed(2)}`; if(document.getElementById('cash-total-due')) document.getElementById('cash-total-due').textContent = `Total: $${total.toFixed(2)}`; if(bar) { if(val >= total) { bar.style.background = "#d4edda"; bar.style.color = "#155724"; bar.textContent = `Change Due: $${(val - total).toFixed(2)}`; } else { bar.style.background = "transparent"; bar.style.color = "#333"; bar.textContent = "Change Due: $0.00"; } } }
function injectStyles() { const css = `.tc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; padding: 20px; } .tc-card { background: white; border: 2px solid #eee; border-radius: 12px; padding: 15px; text-align: center; cursor: pointer; transition: transform 0.2s; } .tc-card:hover { transform: translateY(-3px); border-color: var(--golden-bronze); } .tc-card.status-in { border-bottom: 5px solid var(--success); } .tc-card.status-out { border-bottom: 5px solid #ccc; opacity: 0.8; } .tc-avatar { width: 60px; height: 60px; background: #f0f0f0; border-radius: 50%; margin: 0 auto 10px; overflow: hidden; display:flex; align-items:center; justify-content:center; } .tc-avatar img { width: 100%; height: 100%; object-fit: cover; } .tc-initials { font-weight: bold; font-size: 1.5rem; color: #888; } .tc-badge { font-size: 0.75rem; font-weight: bold; padding: 3px 8px; border-radius: 10px; display: inline-block; margin-top: 5px; } .status-in .tc-badge { background: #d4edda; color: #155724; } .status-out .tc-badge { background: #f8f9fa; color: #666; }`; const style = document.createElement('style'); style.innerHTML = css; document.head.appendChild(style); }

document.addEventListener('DOMContentLoaded', () => {
    console.log(`System Loaded: ${APP_VERSION}`); injectStyles();
    try { const stored = localStorage.getItem(STORAGE_KEY); window.app.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_DATA)); } catch(e) { window.app.data = JSON.parse(JSON.stringify(DEFAULT_DATA)); }
    if(!window.app.data.products) window.app.data.products = DEFAULT_PRODUCTS; if(!window.app.data.categories) window.app.data.categories = DEFAULT_DATA.categories;
    if(!window.app.data.employees) window.app.data.employees = []; 

    // Initial Sync with Retry
    window.app.syncData(5); 

    window.app.refreshUI();
    setInterval(() => { const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); if(document.getElementById('live-clock')) document.getElementById('live-clock').textContent = t; }, 1000);
});
