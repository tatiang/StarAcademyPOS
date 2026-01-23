/* Star Academy POS v1.90 (Cash/Card Enhancements) */

const APP_VERSION = "v1.90";
const STORAGE_KEY = "star_pos_v190_data";
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
let cardVerified = false; // State for card simulation

// --- GLOBAL APP OBJECT ---
window.app = {
    data: null,

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
    },

    // --- POS & CART ---
    renderPOS: function() {
        const catContainer = document.getElementById('pos-categories');
        if(catContainer && catContainer.innerHTML === "") { // Only init if empty
            let cats = ['All', ...this.data.categories];
            catContainer.innerHTML = cats.map(c => 
                `<button class="btn-sm" style="margin-right:5px; margin-bottom:5px;" onclick="window.app.filterPos('${c}')">${c}</button>`
            ).join('');
        }
        if(document.getElementById('pos-grid').innerHTML === "") this.filterPos('All');
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
                <div style="flex:1">
                    <strong>${item.name}</strong>
                    ${item.options.length ? `<br><small style="color:#666">${item.options.join(', ')}</small>` : ''}
                </div>
                <div class="cart-qty-controls">
                    <button class="cart-qty-btn" onclick="window.app.adjustQty(${i}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="cart-qty-btn" onclick="window.app.adjustQty(${i}, 1)">+</button>
                </div>
                <div style="color:var(--danger); cursor:pointer; margin-left:10px;" onclick="window.app.removeFromCart(${i})"><i class="fa-solid fa-trash"></i></div>
            </div>
        `).join('');
        
        document.getElementById('pos-subtotal').textContent = `$${sub.toFixed(2)}`;
        document.getElementById('pos-tax').textContent = `$${(sub*TAX_RATE).toFixed(2)}`;
        document.getElementById('pos-total').textContent = `$${total.toFixed(2)}`;
    },

    adjustQty: function(index, delta) {
        const item = this.data.cart[index];
        item.qty += delta;
        if(item.qty <= 0) {
            if(confirm("Remove item?")) this.data.cart.splice(index, 1);
            else item.qty = 1;
        }
        this.renderCart();
        saveData();
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
                chip.onclick = () => {
                    chip.classList.toggle('selected');
                    if(tempOptions.includes(opt)) tempOptions = tempOptions.filter(o => o !== opt);
                    else tempOptions.push(opt);
                };
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
        // Aggregate if identical
        const existing = this.data.cart.find(i => i.id === item.id && JSON.stringify(i.options) === JSON.stringify(item.options));
        if(existing) existing.qty++; else this.data.cart.push(item);
        document.getElementById('modal-options').classList.remove('open');
        this.renderCart();
        saveData();
    },

    removeFromCart: function(idx) { this.data.cart.splice(idx, 1); this.renderCart(); saveData(); },

    // --- PAYMENTS ---
    validateAndPay: function(method) {
        if(this.data.cart.length === 0) return alert("Empty Cart");
        if(!document.getElementById('customer-name').value) return alert("Enter Customer Name");
        
        if(method === 'Cash') { 
            cashTendered = ""; 
            updateCashUI(); 
            document.getElementById('modal-cash').classList.add('open'); 
        } else if (method === 'Card') {
            cardVerified = false;
            // Reset UI
            document.querySelector('.swipe-track').classList.remove('swiped');
            document.getElementById('card-msg').textContent = "";
            document.getElementById('btn-process-card').style.opacity = "0.5";
            document.getElementById('btn-process-card').style.pointerEvents = "none";
            document.getElementById('cc-num').value = "";
            document.getElementById('cc-exp').value = "";
            document.getElementById('cc-cvv').value = "";
            
            document.getElementById('modal-card').classList.add('open');
        }
    },

    // Cash Logic
    cashInput: function(n) { cashTendered += n; updateCashUI(); },
    cashClear: function() { cashTendered = ""; updateCashUI(); },
    addCash: function(amount) {
        let current = parseFloat(cashTendered || "0");
        current += amount;
        cashTendered = current.toString();
        updateCashUI();
    },
    finalizeCash: function() {
        const total = getCartTotal();
        if(parseFloat(cashTendered) >= total) { completeOrder('Cash'); document.getElementById('modal-cash').classList.remove('open'); }
        else { alert("Insufficient Funds"); }
    },

    // Card Logic
    simulateSwipe: function() {
        const track = document.querySelector('.swipe-track');
        track.classList.add('swiped');
        setTimeout(() => {
            document.getElementById('card-msg').textContent = "Card Read Successfully!";
            cardVerified = true;
            document.getElementById('btn-process-card').style.opacity = "1";
            document.getElementById('btn-process-card').style.pointerEvents = "auto";
        }, 1000);
    },
    finalizeCard: function() {
        // If not swiped, check manual inputs
        if(!cardVerified) {
            const num = document.getElementById('cc-num').value;
            const exp = document.getElementById('cc-exp').value;
            const cvv = document.getElementById('cc-cvv').value;
            if(num.length >= 12 && exp.length >= 4 && cvv.length >= 3) {
                cardVerified = true;
            } else {
                return alert("Please swipe card or enter valid details.");
            }
        }
        
        if(cardVerified) {
            completeOrder('Card');
            document.getElementById('modal-card').classList.remove('open');
        }
    },

    // --- OTHER LOGIC (Manager, Login, etc. - maintained from v1.89) ---
    switchMgrTab: function(tab) {
        document.querySelectorAll('.mgr-subview').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.mgr-tab').forEach(el => el.classList.remove('active'));
        const sub = document.getElementById('mgr-sub-' + tab);
        if(sub) sub.classList.add('active');
        const tabs = ['staff', 'menu', 'data'];
        const btns = document.querySelectorAll('.mgr-tab');
        btns.forEach((b, i) => { if(tabs[i] === tab) b.classList.add('active'); });
        if(tab === 'staff') { this.renderMgrStaff(); }
        if(tab === 'menu') { this.renderMgrMenu(); }
    },
    renderMgrStaff: function() {
        const empList = document.getElementById('mgr-employee-list');
        if(empList && this.data.employees) {
            empList.innerHTML = this.data.employees.map(e => `<tr><td>${e.name}</td><td>${e.role}</td><td><button class="btn-sm" onclick="window.app.editEmployee('${e.name}')">Edit</button><button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteEmployee('${e.name}')">X</button></td></tr>`).join('');
        }
        const roleList = document.getElementById('mgr-role-list');
        if(roleList && this.data.roles) {
            roleList.innerHTML = this.data.roles.map(r => `<tr><td>${r}</td><td>${(r==='Manager'||r==='IT Support')?'System':`<button class="btn-sm" onclick="window.app.deleteRole('${r}')">X</button>`}</td></tr>`).join('');
        }
    },
    renderMgrMenu: function() {
        const prodList = document.getElementById('mgr-product-list');
        if(prodList && this.data.products) {
            prodList.innerHTML = this.data.products.map(p => `<tr><td><img src="${p.img}" width="30"></td><td>${p.name}</td><td>$${p.price.toFixed(2)}</td><td>${p.cat}</td><td><button class="btn-sm" onclick="window.app.editProduct(${p.id})">Edit</button><button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteProduct(${p.id})">X</button></td></tr>`).join('');
        }
        const catList = document.getElementById('mgr-cat-list');
        if(catList && this.data.categories) {
            catList.innerHTML = this.data.categories.map(c => `<li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">${c} <button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteCategory('${c}')">X</button></li>`).join('');
        }
    },
    // ... (editEmployee, deleteEmployee, editRole, deleteRole, editProduct, saveProduct, deleteProduct, editCategory, deleteCategory logic remains same as v1.89) ...
    // Note: I am including the full functions below to ensure the file works standalone.
    
    editEmployee: function(name = null) {
        const emp = name ? this.data.employees.find(e => e.name === name) : null;
        editingId = name;
        const html = `<div class="form-group"><label>Name</label><input id="gen-input-1" class="form-control" value="${emp ? emp.name : ''}"></div><div class="form-group"><label>Role</label><select id="gen-input-2" class="form-control">${this.data.roles.map(r => `<option ${emp && emp.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div><div class="form-group"><label>Photo URL</label><input id="gen-input-3" class="form-control" value="${emp ? (emp.img||'') : ''}"></div>`;
        this.openGenericModal("Employee", html, () => {
            const newName = document.getElementById('gen-input-1').value;
            const newRole = document.getElementById('gen-input-2').value;
            const newImg = document.getElementById('gen-input-3').value;
            if(!newName) return alert("Name required");
            if(editingId) {
                const idx = this.data.employees.findIndex(e => e.name === editingId);
                if(idx > -1) this.data.employees[idx] = { name: newName, role: newRole, img: newImg, status: 'out' };
            } else {
                this.data.employees.push({ name: newName, role: newRole, img: newImg, status: 'out' });
            }
            saveData(); this.renderMgrStaff(); this.closeModal('modal-generic');
        });
    },
    deleteEmployee: function(name) { if(confirm("Remove?")) { this.data.employees = this.data.employees.filter(e => e.name !== name); saveData(); this.renderMgrStaff(); } },
    editRole: function() {
        const html = `<div class="form-group"><label>Role Name</label><input id="gen-input-1" class="form-control"></div>`;
        this.openGenericModal("Add Role", html, () => {
            const r = document.getElementById('gen-input-1').value;
            if(r && !this.data.roles.includes(r)) { this.data.roles.push(r); saveData(); this.renderMgrStaff(); this.closeModal('modal-generic'); }
        });
    },
    deleteRole: function(r) { if(confirm("Delete?")) { this.data.roles = this.data.roles.filter(x => x !== r); saveData(); this.renderMgrStaff(); } },
    editProduct: function(id = null) {
        editingId = id;
        const p = id ? this.data.products.find(x => x.id === id) : { name:'', price:'', img:'', cat: this.data.categories[0], opts:[] };
        document.getElementById('edit-prod-id').value = id || '';
        document.getElementById('edit-prod-name').value = p.name;
        document.getElementById('edit-prod-price').value = p.price;
        document.getElementById('edit-prod-img').value = p.img || '';
        document.getElementById('edit-prod-opts').value = p.opts ? p.opts.join(', ') : '';
        const catSel = document.getElementById('edit-prod-cat');
        catSel.innerHTML = this.data.categories.map(c => `<option ${c===p.cat?'selected':''}>${c}</option>`).join('');
        this.updateImagePreview();
        document.getElementById('modal-product').classList.add('open');
    },
    saveProduct: function() {
        const id = document.getElementById('edit-prod-id').value;
        const name = document.getElementById('edit-prod-name').value;
        const price = parseFloat(document.getElementById('edit-prod-price').value);
        const cat = document.getElementById('edit-prod-cat').value;
        const img = document.getElementById('edit-prod-img').value;
        const optsStr = document.getElementById('edit-prod-opts').value;
        const opts = optsStr ? optsStr.split(',').map(s=>s.trim()) : [];
        if(!name) return alert("Name required");
        if(id) {
            const idx = this.data.products.findIndex(x => x.id == id);
            if(idx > -1) this.data.products[idx] = { id: parseInt(id), name, price, cat, img, opts };
        } else {
            this.data.products.push({ id: Date.now(), name, price, cat, img, opts });
        }
        saveData(); this.closeModal('modal-product'); this.renderMgrMenu(); this.renderPOS();
    },
    deleteProduct: function(id) { if(confirm("Delete?")) { this.data.products = this.data.products.filter(p => p.id !== id); saveData(); this.renderMgrMenu(); this.renderPOS(); } },
    editCategory: function() {
        const html = `<div class="form-group"><label>Category Name</label><input id="gen-input-1" class="form-control"></div>`;
        this.openGenericModal("Add Category", html, () => {
            const c = document.getElementById('gen-input-1').value;
            if(c && !this.data.categories.includes(c)) { this.data.categories.push(c); saveData(); this.renderMgrMenu(); this.closeModal('modal-generic'); }
        });
    },
    deleteCategory: function(c) { if(confirm("Delete?")) { this.data.categories = this.data.categories.filter(x => x !== c); saveData(); this.renderMgrMenu(); } },
    
    // AI & Images
    generateAIImage: function() {
        const name = document.getElementById('edit-prod-name').value;
        if(!name) return alert("Enter Product Name first");
        const keywords = name.replace(/ /g, ','); 
        const url = `https://loremflickr.com/400/300/${encodeURIComponent(keywords)}?lock=${Math.floor(Math.random()*1000)}`;
        document.getElementById('edit-prod-img').value = url;
        this.updateImagePreview(); 
    },
    updateImagePreview: function() {
        const url = document.getElementById('edit-prod-img').value;
        const box = document.getElementById('img-preview-box');
        if(url) box.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:contain;">`;
        else box.innerHTML = `<span>No Image Preview</span>`;
    },

    // Login/System
    login: function(name) { document.getElementById('login-overlay').style.display = 'none'; document.getElementById('header-cashier').innerHTML = `<i class="fa-solid fa-user-circle"></i> ${name}`; this.navigate('pos'); },
    logout: function() { this.data.cart = []; document.getElementById('login-overlay').style.display = 'flex'; document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'none'); },
    promptPin: function(role) { targetRole = role; pinBuffer = ""; document.getElementById('pin-display').textContent = "Enter PIN"; document.getElementById('modal-pin').classList.add('open'); },
    pinInput: function(n) { if(pinBuffer.length < 4) { pinBuffer += n; document.getElementById('pin-display').textContent = "•".repeat(pinBuffer.length); } },
    pinClear: function() { pinBuffer = ""; document.getElementById('pin-display').textContent = "Enter PIN"; },
    pinSubmit: function() {
        const PINS = { 'Manager': '1234', 'IT Support': '9753' };
        if(PINS[targetRole] && pinBuffer === PINS[targetRole]) {
            document.getElementById('modal-pin').classList.remove('open');
            this.login(targetRole);
            document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'block');
            if(targetRole === 'Manager') { this.navigate('manager'); } else { this.navigate('it'); }
        } else { alert("Incorrect PIN"); this.pinClear(); }
    },
    startKioskMode: function() { this.navigate('kiosk'); const grid = document.getElementById('kiosk-grid'); if(grid) grid.innerHTML = this.data.products.map(p => `<div class="product-card" onclick="alert('Please ask a cashier.')"><img src="${p.img}" class="prod-img"><h4>${p.name}</h4><div>$${p.price.toFixed(2)}</div></div>`).join(''); },
    exitKioskMode: function() { this.navigate('pos'); this.logout(); },
    clockIn: function() { handleClock('in'); },
    clockOut: function() { handleClock('out'); },
    closeModal: function(id) { document.getElementById(id).classList.remove('open'); },
    
    // Printing
    printTimesheet: function() { const html = `<h1>Timesheet Report</h1><table style="width:100%; border-collapse:collapse; margin-top:20px;"><tr style="border-bottom:2px solid #000;"><th>Name</th><th>Role</th><th>Status</th></tr>${this.data.employees.map(e => `<tr><td style="padding:10px; border-bottom:1px solid #ccc;">${e.name}</td><td>${e.role}</td><td>${e.status}</td></tr>`).join('')}</table>`; this.printHTML(html); },
    viewReceipts: function() { const list = document.getElementById('receipt-list'); list.innerHTML = this.data.orders.slice().reverse().map(o => `<div style="border-bottom:1px solid #eee; padding:10px; display:flex; justify-content:space-between;"><div><strong>#${o.id}</strong> ${o.customer}</div><div>$${o.total.toFixed(2)} <button class="btn-sm" onclick="window.app.printReceipt(${o.id})">Print</button></div></div>`).join(''); document.getElementById('modal-receipts').classList.add('open'); },
    printReceipt: function(id) { const o = this.data.orders.find(x => x.id === id); if(!o) return; const html = `<div style="text-align:center; font-family:monospace;"><h2>STAR ACADEMY</h2><p>Order #${o.id}</p><p>${new Date(o.time).toLocaleString()}</p><hr>${o.items.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qty} ${i.name}</span><span>$${(i.price*i.qty).toFixed(2)}</span></div>`).join('')}<hr><h3>Total: $${o.total.toFixed(2)}</h3><p>Customer: ${o.customer}</p></div>`; this.printHTML(html); },
    printHTML: function(htmlContent) { const area = document.getElementById('print-area'); area.innerHTML = htmlContent; window.print(); setTimeout(() => area.innerHTML = '', 1000); },
    openGenericModal: function(title, bodyHtml, saveCallback) { document.getElementById('gen-modal-title').innerText = title; document.getElementById('gen-modal-body').innerHTML = bodyHtml; const btn = document.getElementById('gen-save-btn'); btn.onclick = saveCallback; document.getElementById('modal-generic').classList.add('open'); },

    // Renderers
    renderInventory: function() { const tbody = document.getElementById('inventory-body'); if(tbody) tbody.innerHTML = this.data.products.map(p => `<tr><td>${p.name}</td><td>OK</td></tr>`).join(''); },
    renderBarista: function() {
        const grid = document.getElementById('barista-grid');
        const pending = this.data.orders.filter(o => o.status === 'Pending');
        if(grid) grid.innerHTML = pending.length ? pending.map(o => `<div style="background:white; padding:15px; border-left:5px solid var(--stormy-teal); margin-bottom:10px; border-radius:8px;"><h3>#${o.id} ${o.customer}</h3><ul>${o.items.map(i => `<li>${i.qty}x ${i.name} ${i.options.join(', ')}</li>`).join('')}</ul><button class="btn-sm" onclick="this.parentElement.style.opacity=0.5">Ready</button></div>`).join('') : '<p style="color:#888;">No pending orders</p>';
    },
    refreshUI: function() { 
        this.renderPOS(); this.renderBarista();
        const lg = document.getElementById('student-login-grid');
        if(lg) {
            if(!this.data.employees || this.data.employees.length === 0) {
                lg.innerHTML = `<button class="btn-sm" onclick="window.app.data.employees=[{name:'Admin',role:'Manager',img:''}].concat(window.app.data.employees||[]); window.app.refreshUI();">Initialize Admin User</button>`;
            } else {
                lg.innerHTML = this.data.employees.map(e => `<div onclick="window.app.login('${e.name}')" style="display:inline-block; margin:10px; cursor:pointer; text-align:center;"><div style="width:60px; height:60px; background:#eee; border-radius:50%; margin:0 auto; border:3px solid var(--golden-bronze); overflow:hidden;">${e.img ? `<img src="${e.img}" style="width:100%;height:100%;object-fit:cover;">` : ''}</div><div style="font-weight:bold; color:var(--space-indigo); font-size:0.9rem;">${e.name}</div></div>`).join('');
            }
        }
        const ts = document.getElementById('time-employee-select');
        if(ts) ts.innerHTML = '<option value="">Select...</option>' + this.data.employees.map(e => `<option value="${e.name}">${e.name} (${e.status||'out'})</option>`).join('');
        
        const rev = this.data.orders.reduce((s,o) => s + o.total, 0);
        if(document.getElementById('dash-revenue')) document.getElementById('dash-revenue').textContent = `$${rev.toFixed(2)}`;
        if(document.getElementById('dash-orders')) document.getElementById('dash-orders').textContent = this.data.orders.length;
    }
};

// --- HELPERS ---
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(window.app.data)); if(window.saveToCloud) window.saveToCloud(window.app.data, true); }
function getCartTotal() { const sub = window.app.data.cart.reduce((s,i) => s + (i.price * i.qty), 0); return sub + (sub * TAX_RATE); }
function completeOrder(method) {
    window.app.data.orders.push({ id: window.app.data.orderCounter++, customer: document.getElementById('customer-name').value, items: [...window.app.data.cart], total: getCartTotal(), status: "Pending", time: new Date().toISOString() });
    window.app.data.cart = [];
    document.getElementById('customer-name').value = "";
    window.app.renderPOS(); window.app.renderBarista();
    saveData(); alert("Order Placed!");
}
function updateCashUI() {
    const total = getCartTotal();
    const val = parseFloat(cashTendered || "0");
    document.getElementById('calc-display').textContent = `$${val.toFixed(2)}`;
    document.getElementById('cash-total-due').textContent = `Total: $${total.toFixed(2)}`;
    const bar = document.getElementById('change-display-box');
    if(val >= total) { bar.style.background = "#d4edda"; bar.style.color = "#155724"; bar.textContent = `Change Due: $${(val - total).toFixed(2)}`; }
    else { bar.style.background = "transparent"; bar.style.color = "#333"; bar.textContent = "Change Due: $0.00"; }
}
function handleClock(type) {
    const name = document.getElementById('time-employee-select').value;
    if(!name) return alert("Select Name");
    const emp = window.app.data.employees.find(e => e.name === name);
    if(emp) { emp.status = type; alert(`${name} Clocked ${type.toUpperCase()}`); saveData(); window.app.refreshUI(); }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`System Loaded: ${APP_VERSION}`);
    try { const stored = localStorage.getItem(STORAGE_KEY); window.app.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_DATA)); } catch(e) { window.app.data = JSON.parse(JSON.stringify(DEFAULT_DATA)); }
    if(!window.app.data.products) window.app.data.products = DEFAULT_PRODUCTS;
    if(!window.app.data.categories) window.app.data.categories = DEFAULT_DATA.categories;
    if(!window.app.data.employees) window.app.data.employees = []; 
    window.app.refreshUI();
    setInterval(() => { const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); if(document.getElementById('live-clock')) document.getElementById('live-clock').textContent = t; }, 1000);
});
