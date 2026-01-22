/* Star Academy POS v1.80 (Gemini Edition - Standard JS) */

const APP_VERSION = "v1.80";
const STORAGE_KEY = "star_pos_v180_data";
const TAX_RATE = 0.0925;

// --- DATA MODEL ---
const DEFAULT_PRODUCTS = [
    { id: 1, name: "Coffee", price: 2.50, cat: "Hot Drinks", opts: ["Cream", "Sugar"], img: "https://image.pollinations.ai/prompt/hot%20black%20coffee%20cup%20white%20background?nologo=true" },
    { id: 2, name: "Hot Chocolate", price: 3.00, cat: "Hot Drinks", opts: ["Whipped Cream", "Not too hot"], img: "https://image.pollinations.ai/prompt/hot%20chocolate%20mug%20whipped%20cream%20white%20background?nologo=true" },
    { id: 3, name: "Apple Cider", price: 3.00, cat: "Hot Drinks", opts: ["Not too hot"], img: "https://image.pollinations.ai/prompt/hot%20apple%20cider%20cinnamon%20stick%20white%20background?nologo=true" },
    { id: 4, name: "Blueberry Muffin", price: 3.50, cat: "Snacks", opts: [], img: "https://image.pollinations.ai/prompt/blueberry%20muffin%20bakery%20white%20background?nologo=true" },
    { id: 5, name: "Chocolate Muffin", price: 3.50, cat: "Snacks", opts: [], img: "https://image.pollinations.ai/prompt/chocolate%20muffin%20white%20background?nologo=true" },
    { id: 6, name: "Bagel", price: 2.50, cat: "Snacks", opts: ["Cream Cheese"], img: "https://image.pollinations.ai/prompt/plain%20bagel%20white%20background?nologo=true" },
    { id: 7, name: "Choc Chip Cookie", price: 1.50, cat: "Snacks", opts: [], img: "https://image.pollinations.ai/prompt/chocolate%20chip%20cookie%20white%20background?nologo=true" },
    { id: 8, name: "Water", price: 0.00, cat: "Cold Drinks", opts: [], img: "https://image.pollinations.ai/prompt/water%20bottle%20white%20background?nologo=true" }
];

const DEFAULT_DATA = {
    products: DEFAULT_PRODUCTS,
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
        
        if(view === 'pos') this.renderPOS();
        if(view === 'inventory') this.renderInventory();
        if(view === 'time') this.renderTimeClock();
        if(view === 'barista') this.renderBarista();
    },

    // Kiosk Mode
    startKioskMode: function() {
        this.navigate('kiosk');
        // Render POS grid into Kiosk
        const grid = document.getElementById('kiosk-grid');
        if(grid) {
             grid.innerHTML = this.data.products.map(p => `
                <div class="product-card" onclick="alert('Kiosk ordering coming soon!')">
                    <img src="${p.img}" class="prod-img">
                    <div class="prod-info"><h4>${p.name}</h4><div>$${p.price.toFixed(2)}</div></div>
                </div>
            `).join('');
        }
    },
    
    exitKioskMode: function() {
        this.navigate('pos'); // Return to safe view
        document.getElementById('view-kiosk').classList.remove('active');
        this.logout();
    },

    // Login/Security
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
            if(targetRole === 'Manager') this.navigate('inventory');
            else this.navigate('dashboard');
        } else {
            alert("Incorrect PIN");
            this.pinClear();
        }
    },

    // POS Logic
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
                chip.className = 'opt-chip';
                chip.textContent = opt;
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
        if(existing) existing.qty++;
        else this.data.cart.push(item);
        
        document.getElementById('modal-options').classList.remove('open');
        this.renderCart();
        saveData();
    },

    removeFromCart: function(idx) {
        this.data.cart.splice(idx, 1);
        this.renderCart();
        saveData();
    },

    validateAndPay: function(method) {
        if(this.data.cart.length === 0) return alert("Empty Cart");
        if(!document.getElementById('customer-name').value) return alert("Enter Customer Name");
        if(method === 'Cash') {
            cashTendered = "";
            updateCashUI();
            document.getElementById('modal-cash').classList.add('open');
        } else {
            completeOrder(method);
        }
    },

    // Cash Logic
    cashInput: function(n) { cashTendered += n; updateCashUI(); },
    cashClear: function() { cashTendered = ""; updateCashUI(); },
    finalizeCash: function() {
        const total = getCartTotal();
        if(parseFloat(cashTendered) >= total) {
            completeOrder('Cash');
            document.getElementById('modal-cash').classList.remove('open');
        } else { alert("Insufficient Funds"); }
    },

    // Product Management (AI Image)
    openProductModal: function(id = null) {
        if(id) {
            const p = this.data.products.find(x => x.id === id);
            document.getElementById('edit-prod-id').value = p.id;
            document.getElementById('edit-prod-name').value = p.name;
            document.getElementById('edit-prod-price').value = p.price;
            document.getElementById('edit-prod-img').value = p.img;
        } else {
            document.getElementById('edit-prod-id').value = "";
            document.getElementById('edit-prod-name').value = "";
            document.getElementById('edit-prod-price').value = "";
            document.getElementById('edit-prod-img').value = "";
        }
        document.getElementById('modal-product').classList.add('open');
    },

    generateAIImage: function() {
        const name = document.getElementById('edit-prod-name').value;
        if(!name) return alert("Enter a product name first!");
        const prompt = `${name} food photography white background appetizing`;
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true`;
        document.getElementById('edit-prod-img').value = url;
    },

    saveProduct: function() {
        const id = document.getElementById('edit-prod-id').value;
        const name = document.getElementById('edit-prod-name').value;
        const price = parseFloat(document.getElementById('edit-prod-price').value);
        const img = document.getElementById('edit-prod-img').value;

        if(id) {
            const p = this.data.products.find(x => x.id == id);
            if(p) { p.name = name; p.price = price; p.img = img; }
        } else {
            this.data.products.push({ id: Date.now(), name, price, img, cat: "Misc", opts: [] });
        }
        document.getElementById('modal-product').classList.remove('open');
        saveData();
        this.renderInventory();
        this.renderPOS(); // Refresh POS grid too
    },

    // Time Clock
    clockIn: function() { handleClock('in'); },
    clockOut: function() { handleClock('out'); },

    closeModal: function(id) { document.getElementById(id).classList.remove('open'); },
    
    refreshUI: function() { 
        this.renderLoginGrid(); 
        this.renderPOS(); 
        this.renderInventory(); 
        this.renderBarista();
    },

    // RENDERERS
    renderLoginGrid: function() {
        const grid = document.getElementById('student-login-grid');
        if(!grid) return;
        
        const list = (this.data.employees && this.data.employees.length > 0) 
            ? this.data.employees 
            : [{name:'Student 1'}, {name:'Student 2'}];

        grid.innerHTML = list.map(e => `
            <div onclick="window.app.login('${e.name}')" style="display:inline-block; margin:10px; cursor:pointer;">
                <div style="width:60px; height:60px; background:#eee; border-radius:50%; margin:0 auto; border:3px solid var(--golden-bronze); overflow:hidden;">
                    ${e.img ? `<img src="${e.img}" style="width:100%;height:100%;object-fit:cover;">` : ''}
                </div>
                <div style="font-weight:bold; color:var(--space-indigo); font-size:0.9rem;">${e.name}</div>
            </div>
        `).join('');
    },

    renderPOS: function() {
        const grid = document.getElementById('pos-grid');
        if(grid && this.data.products) {
            grid.innerHTML = this.data.products.map(p => `
                <div class="product-card" onclick="window.app.addToCartPrecheck(${p.id})">
                    <img src="${p.img}" class="prod-img" onerror="this.src='https://placehold.co/150x100?text=${p.name}'">
                    <div class="prod-info">
                        <h4>${p.name}</h4>
                        <div>$${p.price.toFixed(2)}</div>
                    </div>
                </div>
            `).join('');
        }
        this.renderCart();
    },

    renderCart: function() {
        const list = document.getElementById('cart-list');
        const sub = this.data.cart.reduce((s,i) => s + (i.price * i.qty), 0);
        const total = sub + (sub * TAX_RATE);
        
        if(list) list.innerHTML = this.data.cart.map((item, i) => `
            <div class="cart-item">
                <div><strong>${item.name}</strong> x${item.qty} ${item.options.length ? `<br><small style="color:#666">${item.options.join(', ')}</small>` : ''}</div>
                <div style="color:var(--danger); cursor:pointer;" onclick="window.app.removeFromCart(${i})"><i class="fa-solid fa-trash"></i></div>
            </div>
        `).join('');
        
        document.getElementById('pos-subtotal').textContent = `$${sub.toFixed(2)}`;
        document.getElementById('pos-tax').textContent = `$${(sub*TAX_RATE).toFixed(2)}`;
        document.getElementById('pos-total').textContent = `$${total.toFixed(2)}`;
    },

    renderInventory: function() {
        const tbody = document.getElementById('inventory-body');
        if(tbody) tbody.innerHTML = this.data.products.map(p => `
            <tr>
                <td><img src="${p.img}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;"></td>
                <td>${p.name}</td>
                <td>${p.cat}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td><button class="btn-sm" onclick="window.app.openProductModal(${p.id})">Edit</button></td>
            </tr>
        `).join('');
    },

    renderTimeClock: function() {
        const sel = document.getElementById('time-employee-select');
        if(sel && this.data.employees) {
            sel.innerHTML = '<option value="">Select your name...</option>' + 
                this.data.employees.map(e => `<option value="${e.name}">${e.name} (${e.status || 'out'})</option>`).join('');
        }
    },

    renderBarista: function() {
        const grid = document.getElementById('barista-grid');
        const pending = this.data.orders.filter(o => o.status === 'Pending');
        if(grid) grid.innerHTML = pending.length ? pending.map(o => `
            <div style="background:white; padding:15px; border-left:5px solid var(--stormy-teal); margin-bottom:10px; border-radius:8px;">
                <h3>#${o.id} ${o.customer}</h3>
                <ul>${o.items.map(i => `<li>${i.qty}x ${i.name} ${i.options.join(', ')}</li>`).join('')}</ul>
                <button class="btn-sm" onclick="this.parentElement.style.opacity=0.5">Ready</button>
            </div>
        `).join('') : '<p style="color:#888;">No pending orders</p>';
    }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`System Loaded: ${APP_VERSION}`);
    
    // Load Local
    const stored = localStorage.getItem(STORAGE_KEY);
    window.app.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_DATA));
    
    // Safety check
    if(!window.app.data.products || window.app.data.products.length < 5) window.app.data.products = DEFAULT_PRODUCTS;

    window.app.refreshUI();

    // Clock
    setInterval(() => {
        const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        if(document.getElementById('live-clock')) document.getElementById('live-clock').textContent = t;
    }, 1000);
});

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
    window.app.renderCart();
    saveData();
    alert("Order Placed!");
}

function updateCashUI() {
    const total = getCartTotal();
    const val = parseFloat(cashTendered || "0");
    document.getElementById('calc-display').textContent = `$${val.toFixed(2)}`;
    document.getElementById('cash-total-due').textContent = `Total: $${total.toFixed(2)}`;
    const bar = document.getElementById('change-bar');
    if(val >= total) {
        bar.classList.add('active');
        bar.textContent = `Change Due: $${(val - total).toFixed(2)}`;
    } else {
        bar.classList.remove('active');
        bar.textContent = "Change Due: $0.00";
    }
}

function handleClock(type) {
    const name = document.getElementById('time-employee-select').value;
    if(!name) return alert("Select Name");
    const emp = window.app.data.employees.find(e => e.name === name);
    if(emp) {
        emp.status = type;
        alert(`${name} Clocked ${type.toUpperCase()}`);
        window.app.renderTimeClock();
        saveData();
    }
}
