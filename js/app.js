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
        currentCashier: null, cart: [], products: [], orders: [], employees: [], timeEntries: [], bugReports: [], orderCounter: 1001, taxRate: 0.0925, tempProduct: null, tempOptions: {}, tempCashEntry: "", editingId: null, 
    },
    pinBuffer: "",
    pinCallback: null,

    init: () => {
        app.loadLocalData(); 
        setInterval(app.updateClock, 1000);
        document.getElementById('order-number').innerText = app.data.orderCounter;
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
        }
    },

    loadLocalData: () => {
        const stored = localStorage.getItem('starAcademyPOS_v128');
        if (stored) {
            app.data = JSON.parse(stored);
        } else {
            app.seedData();
        }
    },

    saveData: () => { 
        localStorage.setItem('starAcademyPOS_v128', JSON.stringify(app.data));
        if(window.saveToCloud) window.saveToCloud(app.data, true); 
    },

    seedData: () => {
        // ... (Keep existing seed data from v1.27) ...
        app.data.products = [
             { id: 1, name: "Coffee", cat: "Beverages", price: 3.50, stock: 50, img: "images/coffee.jpg", options: [{ name: "Add-ins", type: "select", choices: [{name:"+ Half & Half"}, {name:"+ Extra Room"}, {name:"(No Caf) Decaf"}] }] },
             // ... include rest of products ...
             { id: 14, name: "Tap Water", cat: "Beverages", price: 0.00, stock: 100, img: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200" }
        ];
        
        app.data.employees = [
            {id: 2, name: "Alex", role: "Cashier", img: "images/placeholder.png"},
            {id: 3, name: "Brianna", role: "Barista", img: "images/placeholder.png"},
            {id: 4, name: "Jordan", role: "Inventory", img: "images/placeholder.png"},
            {id: 5, name: "Maya", role: "Cashier", img: "images/placeholder.png"},
            {id: 6, name: "Noah", role: "Barista", img: "images/placeholder.png"},
            {id: 7, name: "Zoe", role: "Floater", img: "images/placeholder.png"}
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
        if (app.data.currentCashier === 'Manager') {
            if (manLink) manLink.classList.remove('hidden');
        } else if (app.data.currentCashier === 'IT Support') {
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
                <div class="login-btn-wrap admin-account" onclick="app.login('Manager')">
                    <img src="images/placeholder.png" class="login-btn-img">
                    <span class="login-btn-name">Manager</span>
                </div>
                <div class="login-btn-wrap admin-account role-it" onclick="app.login('IT Support')">
                    <img src="images/placeholder.png" class="login-btn-img">
                    <span class="login-btn-name">IT Support</span>
                </div>
            `;
        }
    },

    login: (name) => {
        if (name === 'Manager') {
             app.requestPin((pin) => {
                if (pin === "1234") app.completeLogin("Manager", "Manager");
                else document.getElementById('pin-error').innerText = "Incorrect PIN";
            });
            return;
        }
        if (name === 'IT Support') {
             app.requestPin((pin) => {
                if (pin === "9753") app.completeLogin("IT Support", "IT Admin");
                else document.getElementById('pin-error').innerText = "Incorrect PIN";
            });
            return;
        }

        const emp = app.data.employees.find(e => e.name === name);
        if (emp) app.completeLogin(emp.name, emp.role);
    },

    completeLogin: (name, role) => {
        app.data.currentCashier = name;
        let imgUrl = 'images/placeholder.png';
        const emp = app.data.employees.find(e => e.name === name);
        if (emp) imgUrl = emp.img;
        
        document.getElementById('header-cashier').innerHTML = `<img src="${imgUrl}" class="cashier-avatar" onerror="this.src='images/placeholder.png'"> ${name}`;
        document.getElementById('login-overlay').style.display = 'none';
        app.updateSidebar();
        
        if (role === 'Manager') app.navigate('manager');
        else if (role === 'IT Admin') app.navigate('it');
        else app.navigate('pos');
    },

    logout: () => {
        app.data.currentCashier = null;
        document.getElementById('login-overlay').style.display = 'flex';
    },

    requestPin: (callback) => {
        app.pinBuffer = "";
        app.pinCallback = callback;
        document.getElementById('pin-display').innerText = "";
        document.getElementById('pin-error').innerText = "";
        document.getElementById('modal-pin').classList.add('open');
    },

    pinInput: (num) => {
        app.pinBuffer += num;
        document.getElementById('pin-display').innerText = "*".repeat(app.pinBuffer.length);
    },
    pinClear: () => {
        app.pinBuffer = "";
        document.getElementById('pin-display').innerText = "";
    },
    pinSubmit: () => {
        document.getElementById('modal-pin').classList.remove('open');
        if (app.pinCallback) app.pinCallback(app.pinBuffer);
    },

    // ... (Include rest of logic from v1.27: navigate, payments, POS, etc. exactly as before) ...
    // Note: For brevity in this response, I am assuming you will copy the remaining functions
    // (navigate, checkManagerAccess, image handling, POS logic, etc.) from the previous single-file version.
    // Ensure all those functions are inside this `app` object.
    
    // REQUIRED: Add this at the end of the object to close modals
    closeModal: (id) => document.getElementById(id).classList.remove('open')
};

// EXPOSE TO WINDOW
window.app = app;
app.init();
