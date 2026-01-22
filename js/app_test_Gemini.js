/* Star Academy POS v1.85 (Manager Hub Expansion) */

const APP_VERSION = "v1.85";
const STORAGE_KEY = "star_pos_v185_data";
const TAX_RATE = 0.0925;

// --- DATA MODEL ---
const DEFAULT_PRODUCTS = [
    { id: 1, name: "Coffee", price: 2.50, cat: "Hot Drinks", opts: ["Cream", "Sugar"], img: "https://image.pollinations.ai/prompt/hot%20black%20coffee%20cup%20white%20background?nologo=true" },
    { id: 2, name: "Hot Chocolate", price: 3.00, cat: "Hot Drinks", opts: ["Whipped Cream"], img: "https://image.pollinations.ai/prompt/hot%20chocolate%20mug%20whipped%20cream%20white%20background?nologo=true" },
    { id: 3, name: "Blueberry Muffin", price: 3.50, cat: "Snacks", opts: [], img: "https://image.pollinations.ai/prompt/blueberry%20muffin%20bakery%20white%20background?nologo=true" }
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
let editingId = null; // For edits

// --- GLOBAL APP OBJECT ---
window.app = {
    data: null,

    // Navigation
    navigate: function(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        const viewEl = document.getElementById('view-' + view);
        const navEl = document.getElementById('nav-' + view);
        if(viewEl) viewEl.classList.add('active');
        if(navEl) navEl.classList.add('active');
        
        // Refresh specific views
        if(view === 'manager') this.switchMgrTab('staff'); 
        if(view === 'pos') this.renderPOS();
        if(view === 'inventory') this.renderInventory();
    },

    // Manager Sub-Tabs
    switchMgrTab: function(tab) {
        document.querySelectorAll('.mgr-subview').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.mgr-tab').forEach(el => el.classList.remove('active'));
        document.getElementById('mgr-sub-' + tab).classList.add('active');
        // Find the button that called this, but since we pass string, we manually set active class logic in HTML or here
        // Simple fix: remove all active classes from buttons, add to clicked (logic simplified for brevity)
        
        if(tab === 'staff') { this.renderMgrStaff(); }
        if(tab === 'menu') { this.renderMgrMenu(); }
    },

    // --- CRUD: STAFF ---
    renderMgrStaff: function() {
        // Employees
        const empList = document.getElementById('mgr-employee-list');
        if(empList) empList.innerHTML = this.data.employees.map(e => `
            <tr>
                <td>${e.name}</td><td>${e.role}</td>
                <td>
                    <button class="btn-sm" onclick="window.app.editEmployee('${e.name}')">Edit</button>
                    <button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteEmployee('${e.name}')">X</button>
                </td>
            </tr>
        `).join('');

        // Roles
        const roleList = document.getElementById('mgr-role-list');
        if(roleList) roleList.innerHTML = this.data.roles.map(r => `
            <tr>
                <td>${r}</td>
                <td>${ (r==='Manager' || r==='IT Support') ? '<small>System</small>' : `<button class="btn-sm" onclick="window.app.deleteRole('${r}')">X</button>` }</td>
            </tr>
        `).join('');
    },

    editEmployee: function(name = null) {
        const emp = name ? this.data.employees.find(e => e.name === name) : null;
        editingId = name;
        const html = `
            <div class="form-group"><label>Name</label><input id="gen-input-1" class="form-control" value="${emp ? emp.name : ''}"></div>
            <div class="form-group"><label>Role</label><select id="gen-input-2" class="form-control">
                ${this.data.roles.map(r => `<option ${emp && emp.role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Photo URL (Optional)</label><input id="gen-input-3" class="form-control" value="${emp ? (emp.img||'') : ''}"></div>
        `;
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

    deleteEmployee: function(name) {
        if(confirm(`Remove ${name}?`)) {
            this.data.employees = this.data.employees.filter(e => e.name !== name);
            saveData(); this.renderMgrStaff();
        }
    },

    editRole: function() {
        const html = `<div class="form-group"><label>Role Name</label><input id="gen-input-1" class="form-control"></div>`;
        this.openGenericModal("Add Role", html, () => {
            const r = document.getElementById('gen-input-1').value;
            if(r && !this.data.roles.includes(r)) {
                this.data.roles.push(r);
                saveData(); this.renderMgrStaff(); this.closeModal('modal-generic');
            }
        });
    },
    deleteRole: function(r) {
        if(confirm(`Delete role ${r}?`)) {
            this.data.roles = this.data.roles.filter(x => x !== r);
            saveData(); this.renderMgrStaff();
        }
    },

    // --- CRUD: MENU ---
    renderMgrMenu: function() {
        const prodList = document.getElementById('mgr-product-list');
        if(prodList) prodList.innerHTML = this.data.products.map(p => `
            <tr>
                <td><img src="${p.img}" width="30" height="30" style="object-fit:cover; border-radius:4px"></td>
                <td>${p.name}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>${p.cat}</td>
                <td>
                    <button class="btn-sm" onclick="window.app.editProduct(${p.id})">Edit</button>
                    <button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteProduct(${p.id})">X</button>
                </td>
            </tr>
        `).join('');

        const catList = document.getElementById('mgr-cat-list');
        if(catList) catList.innerHTML = this.data.categories.map(c => `
            <li style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                ${c} <button class="btn-sm" style="color:var(--danger)" onclick="window.app.deleteCategory('${c}')">X</button>
            </li>
        `).join('');
    },

    editProduct: function(id = null) {
        editingId = id;
        const p = id ? this.data.products.find(x => x.id === id) : { name:'', price:'', img:'', cat: this.data.categories[0], opts:[] };
        
        // Populate specific Product Modal
        document.getElementById('edit-prod-id').value = id || '';
        document.getElementById('edit-prod-name').value = p.name;
        document.getElementById('edit-prod-price').value = p.price;
        document.getElementById('edit-prod-img').value = p.img || '';
        document.getElementById('edit-prod-opts').value = p.opts ? p.opts.join(', ') : '';
        
        // Cats
        const catSel = document.getElementById('edit-prod-cat');
        catSel.innerHTML = this.data.categories.map(c => `<option ${c===p.cat?'selected':''}>${c}</option>`).join('');
        
        document.getElementById('modal-product').classList.add('open');
    },

    saveProduct: function() {
        const id = document.getElementById('edit-prod-id').value; // string
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
        
        saveData();
        this.closeModal('modal-product');
        this.renderMgrMenu();
    },

    deleteProduct: function(id) {
        if(confirm("Delete product?")) {
            this.data.products = this.data.products.filter(p => p.id !== id);
            saveData(); this.renderMgrMenu();
        }
    },

    editCategory: function() {
        const html = `<div class="form-group"><label>Category Name</label><input id="gen-input-1" class="form-control"></div>`;
        this.openGenericModal("Add Category", html, () => {
            const c = document.getElementById('gen-input-1').value;
            if(c && !this.data.categories.includes(c)) {
                this.data.categories.push(c);
                saveData(); this.renderMgrMenu(); this.closeModal('modal-generic');
            }
        });
    },

    deleteCategory: function(c) {
        if(confirm(`Delete category ${c}?`)) {
            this.data.categories = this.data.categories.filter(x => x !== c);
            saveData(); this.renderMgrMenu();
        }
    },

    generateAIImage: function() {
        const name = document.getElementById('edit-prod-name').value;
        if(!name) return alert("Enter name first");
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(name + ' food white background')}?nologo=true`;
        document.getElementById('edit-prod-img').value = url;
    },

    // --- DATA & PRINTING ---
    printTimesheet: function() {
        const html = `
            <h1>Timesheet Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                <tr style="border-bottom:2px solid #000;"><th>Name</th><th>Role</th><th>Status</th></tr>
                ${this.data.employees.map(e => `<tr><td style="padding:10px; border-bottom:1px solid #ccc;">${e.name}</td><td>${e.role}</td><td>${e.status}</td></tr>`).join('')}
            </table>
        `;
        this.printHTML(html);
    },

    viewReceipts: function() {
        const list = document.getElementById('receipt-list');
        list.innerHTML = this.data.orders.slice().reverse().map(o => `
            <div style="border-bottom:1px solid #eee; padding:10px; display:flex; justify-content:space-between;">
                <div><strong>#${o.id}</strong> ${o.customer}</div>
                <div>$${o.total.toFixed(2)} <button class="btn-sm" onclick="window.app.printReceipt(${o.id})">Print</button></div>
            </div>
        `).join('');
        document.getElementById('modal-receipts').classList.add('open');
    },

    printReceipt: function(id) {
        const o = this.data.orders.find(x => x.id === id);
        if(!o) return;
        const html = `
            <div style="text-align:center; font-family:monospace;">
                <h2>STAR ACADEMY</h2>
                <p>Order #${o.id}</p>
                <p>${new Date(o.time).toLocaleString()}</p>
                <hr>
                ${o.items.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qty} ${i.name}</span><span>$${(i.price*i.qty).toFixed(2)}</span></div>`).join('')}
                <hr>
                <h3>Total: $${o.total.toFixed(2)}</h3>
                <p>Customer: ${o.customer}</p>
            </div>
        `;
        this.printHTML(html);
    },

    printHTML: function(htmlContent) {
        const area = document.getElementById('print-area');
        area.innerHTML = htmlContent;
        window.print();
        setTimeout(() => area.innerHTML = '', 1000);
    },

    // --- GENERIC MODAL UTILS ---
    openGenericModal: function(title, bodyHtml, saveCallback) {
        document.getElementById('gen-modal-title').innerText = title;
        document.getElementById('gen-modal-body').innerHTML = bodyHtml;
        const btn = document.getElementById('gen-save-btn');
        btn.onclick = saveCallback; // Assign logic dynamically
        document.getElementById('modal-generic').classList.add('open');
    },

    // --- EXISTING POS LOGIC (Preserved) ---
    login: function(name) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('header-cashier').innerHTML = `<i class="fa-solid fa-user-circle"></i> ${name}`;
        this.navigate('pos');
    },
    logout: function() {
        this.data.cart = [];
        document.getElementById('login-overlay').style.display = 'flex';
        document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'none');
    },
    promptPin: function(role) {
        targetRole = role;
        pinBuffer = "";
        document.getElementById('pin-display').textContent = "";
        document.getElementById('modal-pin').classList.add('open');
    },
    pinInput: function(n) {
        if(pinBuffer.length < 4) {
            pinBuffer += n;
            document.getElementById('pin-display').textContent = "•".repeat(pinBuffer.length);
        }
    },
    pinClear: function() { pinBuffer = ""; document.getElementById('pin-display').textContent = ""; },
    pinSubmit: function() {
        const PINS = { 'Manager': '1234', 'IT Support': '9753' };
        if(PINS[targetRole] && pinBuffer === PINS[targetRole]) {
            document.getElementById('modal-pin').classList.remove('open');
            this.login(targetRole);
            document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'block');
            if(targetRole === 'Manager') { this.navigate('manager'); }
            else { this.navigate('it'); }
        } else {
            alert("Incorrect PIN");
            this.pinClear();
        }
    },
    startKioskMode: function() {
        this.navigate('kiosk');
        const grid = document.getElementById('kiosk-grid');
        if(grid) grid.innerHTML = this.data.products.map(p => `<div class="product-card" onclick="alert('Preview only')"><img src="${p.img}" class="prod-img"><h4>${p.name}</h4><div>$${p.price.toFixed(2)}</div></div>`).join('');
    },
    exitKioskMode: function() { this.navigate('pos'); this.logout(); },
    
    // Cart/POS Logic
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
        const existing = this.data.cart.find(i => i.id === item.id && JSON.stringify(i.options) === JSON.stringify(item.options));
        if(existing) existing.qty++; else this.data.cart.push(item);
        document.getElementById('modal-options').classList.remove('open');
        this.renderPOS(); saveData();
    },
    removeFromCart: function(idx) { this.data.cart.splice(idx, 1); this.renderPOS(); saveData(); },
    validateAndPay: function(method) {
        if(this.data.cart.length === 0) return alert("Empty Cart");
        if(!document.getElementById('customer-name').value) return alert("Enter Customer Name");
        if(method === 'Cash') { cashTendered = ""; updateCashUI(); document.getElementById('modal-cash').classList.add('open'); }
        else { completeOrder(method); }
    },
    cashInput: function(n) { cashTendered += n; updateCashUI(); },
    cashClear: function() { cashTendered = ""; updateCashUI(); },
    finalizeCash: function() {
        const total = getCartTotal();
        if(parseFloat(cashTendered) >= total) { completeOrder('Cash'); document.getElementById('modal-cash').classList.remove('open'); }
        else { alert("Insufficient Funds"); }
    },
    clockIn: function() { handleClock('in'); },
    clockOut: function() { handleClock('out'); },
    closeModal: function(id) { document.getElementById(id).classList.remove('open'); },
    
    // UI Renderers
    renderPOS: function() {
        // Categories
        const catContainer = document.getElementById('pos-categories');
        if(catContainer) {
            // Add 'All' button and category buttons
            let cats = ['All', ...this.data.categories];
            catContainer.innerHTML = cats.map(c => 
                `<button class="btn-sm" style="margin-right:5px; margin-bottom:5px;" onclick="window.app.filterPos('${c}')">${c}</button>`
            ).join('');
        }
        this.filterPos('All');
        
        // Cart
        const list = document.getElementById('cart-list');
        const sub = this.data.cart.reduce((s,i) => s + (i.price * i.qty), 0);
        const total = sub + (sub * TAX_RATE);
        list.innerHTML = this.data.cart.map((item, i) => `
            <div class="cart-item">
                <div><strong>${item.name}</strong> x${item.qty} ${item.options.length ? `<br><small style="color:#666">${item.options.join(', ')}</small>` : ''}</div>
                <div style="color:var(--danger); cursor:pointer;" onclick="window.app.removeFromCart(${i})"><i class="fa-solid fa-trash"></i></div>
            </div>
        `).join('');
        document.getElementById('pos-subtotal').textContent = `$${sub.toFixed(2)}`;
        document.getElementById('pos-tax').textContent = `$${(sub*TAX_RATE).toFixed(2)}`;
        document.getElementById('pos-total').textContent = `$${total.toFixed(2)}`;
    },
    filterPos: function(cat) {
        const grid = document.getElementById('pos-grid');
        const prods = (cat === 'All') ? this.data.products : this.data.products.filter(p => p.cat === cat);
        grid.innerHTML = prods.map(p => `
            <div class="product-card" onclick="window.app.addToCartPrecheck(${p.id})">
                <img src="${p.img}" class="prod-img" onerror="this.src='https://placehold.co/150x100?text=${p.name}'">
                <div class="prod-info"><h4>${p.name}</h4><div>$${p.price.toFixed(2)}</div></div>
            </div>
        `).join('');
    },
    renderInventory: function() {
        const tbody = document.getElementById('inventory-body');
        if(tbody) tbody.innerHTML = this.data.products.map(p => `<tr><td>${p.name}</td><td>OK</td></tr>`).join('');
    },
    refreshUI: function() { 
        this.renderPOS(); 
        // Update login grid
        const lg = document.getElementById('student-login-grid');
        if(lg) {
            const list = (this.data.employees && this.data.employees.length>0) ? this.data.employees : [{name:'Student 1'}, {name:'Student 2'}];
            lg.innerHTML = list.map(e => `<div onclick="window.app.login('${e.name}')" style="display:inline-block; margin:10px; cursor:pointer;"><div style="width:60px; height:60px; background:#eee; border-radius:50%; margin:0 auto; border:3px solid var(--golden-bronze); overflow:hidden;">${e.img ? `<img src="${e.img}" style="width:100%;height:100%;object-fit:cover;">` : ''}</div><div style="font-weight:bold; color:var(--space-indigo); font-size:0.9rem;">${e.name}</div></div>`).join('');
        }
        // Update time clock
        const ts = document.getElementById('time-employee-select');
        if(ts) ts.innerHTML = '<option value="">Select...</option>' + this.data.employees.map(e => `<option value="${e.name}">${e.name} (${e.status||'out'})</option>`).join('');
    }
};

// --- HELPERS ---
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.app.data));
    if(window.saveToCloud) window.saveToCloud(window.app.data, true);
}
function getCartTotal() {
    const sub = window.app.data.cart.reduce((s,i) => s + (i.price * i.qty), 0);
    return sub + (sub * TAX_RATE);
}
function completeOrder(method) {
    window.app.data.orders.push({
        id: window.app.data.orderCounter++,
        customer: document.getElementById('customer-name').value,
        items: [...window.app.data.cart],
        total: getCartTotal(),
        status: "Pending",
        time: new Date().toISOString()
    });
    window.app.data.cart = [];
    document.getElementById('customer-name').value = "";
    window.app.renderPOS(); saveData(); alert("Order Placed!");
}
function updateCashUI() {
    const total = getCartTotal();
    const val = parseFloat(cashTendered || "0");
    document.getElementById('calc-display').textContent = `$${val.toFixed(2)}`;
    document.getElementById('cash-total-due').textContent = `Total: $${total.toFixed(2)}`;
    const bar = document.getElementById('change-bar');
    if(val >= total) { bar.classList.add('active'); bar.textContent = `Change Due: $${(val - total).toFixed(2)}`; }
    else { bar.classList.remove('active'); bar.textContent = "Change Due: $0.
