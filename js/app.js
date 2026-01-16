/* Star Academy POS - v1.63 (LIVE)
   Matches new index.html structure
*/

// --- CONFIGURATION ---
const APP_VERSION = "v1.63";
const TAX_RATE = 0.0925; // 9.25%

// --- DATA: STUDENTS (The Login Buttons) ---
// You can edit these names/images
const STUDENTS = [
    { name: "Alex",    role: "student", img: "images/student1.png" },
    { name: "Brianna", role: "student", img: "images/student2.png" },
    { name: "Jordan",  role: "student", img: "images/student3.png" },
    { name: "Casey",   role: "student", img: "images/student4.png" }
];

// --- DATA: EMPLOYEES (Time Clock) ---
let employees = [
    { name: "Eloise", role: "Barista", status: "out" },
    { name: "Jamil",  role: "Cashier", status: "out" },
    { name: "Diego",  role: "Inventory", status: "out" }
];

// --- DATA: PRODUCTS ---
const PRODUCTS = [
    { id: 1, name: "Coffee", price: 2.50, category: "Hot Drinks", img: "images/coffee.jpg" },
    { id: 2, name: "Latte",  price: 3.50, category: "Hot Drinks", img: "images/latte.jpg" },
    { id: 3, name: "Tea",    price: 2.00, category: "Hot Drinks", img: "images/tea.jpg" },
    { id: 4, name: "Muffin", price: 3.00, category: "Food",       img: "images/muffin.jpg" },
    { id: 5, name: "Bagel",  price: 2.50, category: "Food",       img: "images/bagel.jpg" },
    { id: 6, name: "Water",  price: 1.00, category: "Cold Drinks",img: "images/water.jpg" }
];

// --- STATE VARIABLES ---
let cart = [];
let currentOrder = null;
let currentCashier = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`Initializing Star Academy POS ${APP_VERSION}...`);
    
    try {
        initLoginScreen();
        
        // Update the version text at the bottom of login screen
        const versionEl = document.getElementById('login-version-text');
        if(versionEl) versionEl.textContent = APP_VERSION;
        
        // Setup Clock
        setInterval(updateClock, 1000);
        updateClock();

        console.log("Initialization Complete.");
    } catch (err) {
        console.error("CRITICAL INIT ERROR:", err);
        alert("System Error: Check Console");
    }
});

// --- LOGIN SCREEN LOGIC ---
function initLoginScreen() {
    const grid = document.getElementById('student-login-grid');
    if (!grid) return; // Safety check
    
    grid.innerHTML = ''; // Clear existing

    STUDENTS.forEach(student => {
        // Create the circular button
        const btn = document.createElement('div');
        btn.className = 'login-btn-wrap';
        btn.onclick = () => login(student.name);
        
        btn.innerHTML = `
            <img src="${student.img}" class="login-btn-img" onerror="this.src='https://ui-avatars.com/api/?name=${student.name}&background=random'">
            <div class="login-btn-name">${student.name}</div>
        `;
        grid.appendChild(btn);
    });
}

// --- GLOBAL APP FUNCTIONS (window.app) ---
window.app = {
    // 1. LOGIN
    login: (name) => {
        console.log("Logging in as:", name);
        currentCashier = name;
        
        // Hide Login Overlay
        document.getElementById('login-overlay').style.display = 'none';
        
        // Show Name in Header
        const headerName = document.getElementById('header-cashier');
        if(headerName) headerName.innerHTML = `<i class="fa-solid fa-user-circle" style="margin-right: 10px;"></i> ${name}`;
        
        // Go to POS view
        window.app.navigate('pos');
        
        // Load Products
        renderProducts();
    },

    // 2. LOGOUT
    logout: () => {
        // Clear data
        cart = [];
        currentCashier = null;
        updateCartDisplay();
        
        // Show Login Overlay
        document.getElementById('login-overlay').style.display = 'flex';
        window.app.navigate('pos'); // Reset view behind overlay
    },

    // 3. NAVIGATION
    navigate: (viewId) => {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        
        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        if(target) target.classList.add('active');
        
        // Highlight Sidebar
        const navItem = document.getElementById(`nav-${viewId}`);
        if(navItem) navItem.classList.add('active');
    },

    // 4. POS LOGIC
    addToCart: (productId) => {
        const prod = PRODUCTS.find(p => p.id === productId);
        if(!prod) return;

        const existing = cart.find(item => item.id === productId);
        if(existing) {
            existing.qty++;
        } else {
            cart.push({ ...prod, qty: 1 });
        }
        updateCartDisplay();
    },

    removeFromCart: (index) => {
        cart.splice(index, 1);
        updateCartDisplay();
    },
    
    // KIOSK MODE
    startKioskMode: () => {
        document.getElementById('login-overlay').style.display = 'none';
        window.app.navigate('customer'); // Assumes <section id="view-customer"> exists
        renderKioskGrid();
    },
    
    exitKioskMode: () => {
        window.app.logout();
    }
};

// --- HELPER FUNCTIONS ---

function renderProducts() {
    const grid = document.getElementById('pos-grid');
    if(!grid) return;
    
    grid.innerHTML = PRODUCTS.map(p => `
        <div class="product-card" onclick="window.app.addToCart(${p.id})">
            <div class="p-image" style="background-image: url('${p.img}');"></div>
            <div class="p-info">
                <div class="p-name">${p.name}</div>
                <div class="p-price">$${p.price.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

function renderKioskGrid() {
    const grid = document.getElementById('kiosk-grid');
    if(!grid) return;
    
    // Same products for now
    grid.innerHTML = PRODUCTS.map(p => `
        <div class="product-card" onclick="window.app.addToCart(${p.id})">
            <div class="p-image" style="background-image: url('${p.img}');"></div>
            <div class="p-info">
                <div class="p-name">${p.name}</div>
                <div class="p-price">$${p.price.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

function updateCartDisplay() {
    // 1. Standard POS Cart
    const list = document.getElementById('cart-list');
    const subtotalEl = document.getElementById('pos-subtotal');
    const taxEl = document.getElementById('pos-tax');
    const totalEl = document.getElementById('pos-total');
    
    if(list) {
        if(cart.length === 0) {
            list.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>`;
        } else {
            list.innerHTML = cart.map((item, i) => `
                <div class="cart-item">
                    <div class="item-info">
                        <h4>${item.name}</h4>
                        <div class="opts">$${item.price.toFixed(2)}</div>
                    </div>
                    <div class="qty-control">
                        <button class="btn-qty" onclick="cart[${i}].qty--; window.app.updateCartDisplay()">-</button>
                        <span>${item.qty}</span>
                        <button class="btn-qty" onclick="cart[${i}].qty++; window.app.updateCartDisplay()">+</button>
                        <button class="btn-del" onclick="window.app.removeFromCart(${i})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }
    }

    // Calculate Totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    if(subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if(taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if(totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    
    // Also update Kiosk totals if visible
    const kioskSub = document.getElementById('kiosk-subtotal');
    if(kioskSub) kioskSub.textContent = `$${total.toFixed(2)}`;
}

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const clockEl = document.getElementById('live-clock');
    if(clockEl) clockEl.textContent = timeString;
}

// Expose internal helper to window so onclick handlers inside strings can work
window.app.updateCartDisplay = updateCartDisplay;

// Short alias for login buttons in HTML
window.login = window.app.login;
