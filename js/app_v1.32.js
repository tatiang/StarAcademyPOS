// Star Academy Classroom Café POS
// App logic v1.32

const APP_VERSION = "v1.32";

// --- AUDIO SYSTEM ---
const playTone = (freq, type, duration) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.log("Audio not supported");
    }
};

const app = {
    data: {
        currentCashier: null,
        cart: [],
        products: [],
        orders: [],
        employees: [],
        timeEntries: [],
        bugReports: [],
        orderCounter: 1001,
        taxRate: 0.0925,
        tempProduct: null,
        tempOptions: {},
        tempCashEntry: "",
        editingId: null
    },
    pinBuffer: "",
    pinCallback: null,

    init: () => {
        app.loadLocalData();
        setInterval(app.updateClock, 1000);
        const orderNumEl = document.getElementById('order-number');
        if (orderNumEl) orderNumEl.innerText = app.data.orderCounter;
        app.renderLogin();
        app.updateLoginOverlay();
        
        // Try to update version label if present
        const vEl = document.getElementById('app-version');
        if (vEl) vEl.textContent = APP_VERSION;
    },

    refreshUI: () => {
        const orderNumEl = document.getElementById('order-number');
        if (orderNumEl) orderNumEl.innerText = app.data.orderCounter;
        app.renderLogin();
        app.updateSidebar();
        app.updateLoginOverlay();

        const active = document.querySelector('.view.active');
        if (active) {
            if (active.id === 'view-pos') app.renderPOS();
            if (active.id === 'view-barista') app.renderBarista();
            if (active.id === 'view-dashboard') app.renderDashboard();
            if (active.id === 'view-inventory') app.renderInventory();
        }
    },

    // Ensure login overlay matches currentCashier state
    updateLoginOverlay: () => {
        const overlay = document.getElementById('login-overlay');
        if (!overlay) return;
        if (app.data.currentCashier) {
            overlay.style.display = 'none';
        } else {
            overlay.style.display = 'flex';
        }
    },

    loadLocalData: () => {
        const stored = localStorage.getItem('starAcademyPOS_v131');
        if (stored) {
            try {
                app.data = JSON.parse(stored);
            } catch (e) {
                console.error("Local data parse error, seeding fresh data.", e);
                app.seedData();
            }
        } else {
            app.seedData();
        }
    },

    saveData: () => {
        localStorage.setItem('starAcademyPOS_v131', JSON.stringify(app.data));
        if (window.saveToCloud) window.saveToCloud(app.data, true);
    },

    seedData: () => {
        app.data.products = [
            { id: 1, name: "Coffee", cat: "Beverages", price: 3.50, stock: 50, img: "images/coffee.jpg", options: [{ name: "Add-ins", type: "select", choices: [{name:"+ Half & Half"}, {name:"+ Extra Room"}, {name:"(No Caf) Decaf"}] }] },
            { id: 2, name: "Herbal Tea", cat: "Beverages", price: 3.25, stock: 40, img: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200", options: [{ name: "Temp", type: "toggle", choice: {name:"Not too hot"} }] },
            { id: 3, name: "Black Tea", cat: "Beverages", price: 3.25, stock: 40, img: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200", options: [{ name: "Temp", type: "toggle", choice: {name:"Not too hot"} }] },
            { id: 4, name: "Iced Tea", cat: "Beverages", price: 3.75, stock: 35, img: "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=200", options: [{ name: "Ice Level", type: "radio", choices: [{name:"(No Ice)"}, {name:"(Low Ice)"}, {name:"+ Extra Ice"}] }] },
            { id: 5, name: "Hot Chocolate", cat: "Beverages", price: 4.00, stock: 30, img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=200", options: [{ name: "Temp", type: "toggle", choice: {name:"Not too hot"} }, { name: "Topping", type: "toggle", choice: {name:"+ Whipped Cream"} }] },
            { id: 6, name: "Hot Cider", cat: "Beverages", price: 3.75, stock: 30, img: "https://images.unsplash.com/photo-1579619563346-63304eb4098c?w=200", options: [{ name: "Temp", type: "toggle", choice: {name:"Not too hot"} }] },
            { id: 7, name: "Latte", cat: "Beverages", price: 4.50, stock: 40, img: "https://via.placeholder.com/150?text=Latte", options: [{ name: "Syrup", type: "select", choices: [{name:"Plain"}, {name:"+ Vanilla"}, {name:"+ Hazelnut"}] }, { name: "Temp", type: "toggle", choice: {name:"Not too hot"} }, { name: "Topping", type: "toggle", choice: {name:"+ Whipped Cream"} }] },
            { id: 8, name: "Blueberry Muffin", cat: "Baked Goods", price: 3.75, stock: 20, img: "images/muffin.jpg" },
            { id: 9, name: "Chocolate Muffin", cat: "Baked Goods", price: 3.75, stock: 20, img: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=200" },
            { id: 10, name: "Choc Chip Cookie", cat: "Baked Goods", price: 2.50, stock: 30, img: "https://images.unsplash.com/photo-1499636138143-bd630f5cf38a?w=200" },
            { id: 11, name: "Biscotti", cat: "Baked Goods", price: 2.00, stock: 25, img: "https://via.placeholder.com/150?text=Biscotti" },
            { id: 12, name: "Plain Bagel", cat: "Baked Goods", price: 3.00, stock: 15, img: "https://via.placeholder.com/150?text=Bagel", options: [{ name: "Prep", type: "toggle", choice: {name:"Toasted"} }, { name: "Add-on", type: "toggle", choice: {name:"+ Cream Cheese", price: 1.00} }] },
            { id: 13, name: "Bottled Water", cat: "Beverages", price: 1.50, stock: 50, img: "https://images.unsplash.com/photo-1603394630854-e0b62d294e33?w=200" },
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
        if (c) {
            const students = app.data.employees.filter(e => e.role !== 'Manager' && e.role !== 'IT Admin');
            c.innerHTML = students.map(e => `
                <div class="login-btn-wrap" onclick="app.login('${e.name}')">
                    <img src="${e.img}" class="login-btn-img" onerror="this.src='images/placeholder.png'">
                    <span class="login-btn-name">${e.name}</span>
                </div>
            `).join('');
        }

        const adminContainer = document.getElementById('admin-login-buttons');
        if (adminContainer) {
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
        let imgUrl = 'images/placeholder.png';
        const emp = app.data.employees.find(e => e.name === name);
        if (emp) imgUrl = emp.img;
        
        const header = document.getElementById('header-cashier');
        if (header) {
            header.innerHTML = `<img src="${imgUrl}" class="cashier-avatar" onerror="this.src='images/placeholder.png'"> ${name}`;
        }
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
        app.updateSidebar();
        
        if (role === 'Manager') app.navigate('manager');
        else if (role === 'IT Admin') app.navigate('it');
        else app.navigate('pos');
    },

    logout: () => {
        app.data.currentCashier = null;
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'flex';
        const header = document.getElementById('header-cashier');
        if (header) header.innerHTML = 'Not Logged In';
        app.updateSidebar();
    },

    requestPin: (callback) => {
        app.pinBuffer = "";
        app.pinCallback = callback;
        const disp = document.getElementById('pin-display');
        const err = document.getElementById('pin-error');
        if (disp) disp.innerText = "";
        if (err) err.innerText = "";
        const modal = document.getElementById('modal-pin');
        if (modal) modal.classList.add('open');
    },

    pinInput: (num) => {
        app.pinBuffer += num;
        const disp = document.getElementById('pin-display');
        if (disp) disp.innerText = "*".repeat(app.pinBuffer.length);
    },

    pinClear: () => {
        app.pinBuffer = "";
        const disp = document.getElementById('pin-display');
        if (disp) disp.innerText = "";
    },

    pinSubmit: () => {
        const modal = document.getElementById('modal-pin');
        if (modal) modal.classList.remove('open');
        if (app.pinCallback) app.pinCallback(app.pinBuffer);
    },

    // --- Custom Alert ---
    showAlert: (msg, title = "Alert") => {
        const tEl = document.getElementById('alert-title');
        const mEl = document.getElementById('alert-message');
        if (tEl) tEl.innerText = title;
        if (mEl) mEl.innerText = msg;
        const modal = document.getElementById('modal-alert');
        if (modal) modal.classList.add('open');
    },

    // --- IT Hub Fetch ---
    fetchTestingNotes: async () => {
        const pre = document.getElementById('github-notes-content');
        if (!pre) return;
        pre.innerText = "Loading...";
        try {
            const res = await fetch('https://raw.githubusercontent.com/tatiang/StarAcademyPOS/main/TESTING_NOTES?t=' + new Date().getTime());
            if (res.ok) {
                const text = await res.text();
                pre.innerText = text;
            } else {
                pre.innerText = "Could not load notes. Ensure TESTING_NOTES file exists in repo root.";
            }
        } catch (e) {
            pre.innerText = "Error fetching notes: " + e.message;
        }
    },
    
    renderITHub: () => {
        const pre = document.getElementById('github-notes-content');
        if (pre && pre.innerText.includes("Loading")) app.fetchTestingNotes();
    },

    handleImageUpload: (input, targetId) => {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const tgt = document.getElementById(targetId);
                const prev = document.getElementById('prod-img-preview');
                if (tgt) tgt.value = e.target.result;
                if (prev) prev.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    generateAIImage: (nameId, targetId) => {
        const nameEl = document.getElementById(nameId);
        const targetEl = document.getElementById(targetId);
        const prev = document.getElementById('prod-img-preview');
        const query = (nameEl && nameEl.value) ? nameEl.value : 'coffee';
        const seed = Math.floor(Math.random() * 9999);
        const url = `https://image.pollinations.ai/prompt/delicious ${encodeURIComponent(query)} food photography, professional lighting, photorealistic, 4k?width=300&height=300&nologo=true&seed=${seed}`;
        if (targetEl) targetEl.value = url;
        if (prev) prev.src = url;
    },

    // NAVIGATION
    navigate: (view) => {
        const views = document.querySelectorAll('.view');
        views.forEach(v => v.classList.remove('active'));
        const navBtns = document.querySelectorAll('.nav-link');
        navBtns.forEach(b => b.classList.remove('active'));

        let targetId = '';
        if (view === 'pos') targetId = 'view-pos';
        if (view === 'barista') targetId = 'view-barista';
        if (view === 'dashboard') targetId = 'view-dashboard';
        if (view === 'inventory') targetId = 'view-inventory';
        if (view === 'time') targetId = 'view-time';
        if (view === 'manager') targetId = 'view-manager';
        if (view === 'it') targetId = 'view-it';

        if (targetId) {
            const viewEl = document.getElementById(targetId);
            if (viewEl) viewEl.classList.add('active');
        }

        const navId = 'nav-' + view;
        const navEl = document.getElementById(navId);
        if (navEl) navEl.classList.add('active');

        // Trigger render for that view if needed
        if (view === 'pos') app.renderPOS();
        if (view === 'barista') app.renderBarista();
        if (view === 'dashboard') app.renderDashboard();
        if (view === 'inventory') app.renderInventory();
        if (view === 'time') app.renderTimeClock();
        if (view === 'manager') app.renderManagerHub();
        if (view === 'it') app.renderITHub();
    },

    renderManagerHub: () => {
        app.renderBugReports();
        app.renderProductsManager();
        app.renderEmployeesManager();
    },

    renderBugReports: () => {
        const tbody = document.getElementById('bug-log-body');
        if (!tbody) return;
        const logs = [...app.data.bugReports].reverse();
        tbody.innerHTML = logs.length
            ? logs.slice(0, 5).map(l => `
                <tr>
                    <td style="font-size:0.8rem; white-space:nowrap;">
                        ${new Date(l.date).toLocaleDateString()} ${new Date(l.date).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}
                    </td>
                    <td><b>${l.type}</b></td>
                    <td>${l.details}</td>
                </tr>`).join('')
            : '<tr><td colspan="3">No logs.</td></tr>';
    },

    submitBugReport: () => {
        const typeEl = document.getElementById('bug-type');
        const detailsEl = document.getElementById('bug-details');
        if (!typeEl || !detailsEl) return;
        const type = typeEl.value;
        const details = detailsEl.value;
        if (!details) return app.showAlert("Details required.");
        app.data.bugReports.push({id: Date.now(), date: new Date().toISOString(), type, details});
        detailsEl.value = "";
        app.saveData();
        app.renderBugReports();
        app.showAlert("Log saved.");
    },

    exportBugReports: () => {
        let csv = "Date,Type,Details\n";
        app.data.bugReports.forEach(l => {
            csv += `"${l.date}","${l.type}","${l.details.replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StarAcademy_Logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    },

    printBugReports: () => {
        window.print();
    },

    downloadFullBackup: () => {
        const dataStr = JSON.stringify(app.data);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `star_academy_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        app.showAlert("Backup file downloaded.");
    },

    renderPOS: (cat = 'All') => {
        const cats = ['All', ...new Set(app.data.products.map(p => p.cat))];
        const catContainer = document.getElementById('pos-categories');
        if (catContainer) {
            catContainer.innerHTML = cats.map(c => `
                <button class="cat-tab ${c === cat ? 'active' : ''}" onclick="app.renderPOS('${c}')">
                    ${c}
                </button>`).join('');
        }
        const grid = document.getElementById('pos-grid');
        if (grid) {
            grid.innerHTML = app.data.products
                .filter(p => cat === 'All' || p.cat === cat)
                .map(p => `
                    <div class="product-card" onclick="app.addToCartClick(${p.id})">
                        <div class="p-image" style="background-image:url('${p.img}')"></div>
                        <div class="p-info">
                            <div class="p-name">${p.name}</div>
                            <div class="p-price">$${p.price.toFixed(2)}</div>
                        </div>
                    </div>`).join('');
        }
        app.renderCart();
    },

    addToCartClick: (id) => {
        playTone(600, 'sine', 0.1);
        app.data.tempProduct = app.data.products.find(p => p.id === id);
        if (!app.data.tempProduct) return;
        const title = document.getElementById('opt-modal-title');
        if (title) title.innerText = app.data.tempProduct.name;
        const noteEl = document.getElementById('opt-custom-note');
        if (noteEl) noteEl.value = "";
        const container = document.getElementById('opt-dynamic-container');
        if (!container) return;
        container.innerHTML = '';
        app.data.tempOptions = {};

        if (app.data.tempProduct.options && app.data.tempProduct.options.length > 0) {
            app.data.tempProduct.options.forEach((optGroup) => {
                const groupDiv = document.createElement('div');
                groupDiv.innerHTML = `<div class="opt-group-title">${optGroup.name}</div>`;
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'opt-buttons';

                if (optGroup.type === 'select' || optGroup.type === 'radio') {
                    optGroup.choices.forEach(choice => {
                        const btn = document.createElement('button');
                        btn.className = 'opt-btn';
                        btn.innerText = choice.name + (choice.price ? ` (+$${choice.price.toFixed(2)})` : '');
                        btn.onclick = () => {
                            buttonsDiv.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            app.data.tempOptions[optGroup.name] = choice;
                        };
                        buttonsDiv.appendChild(btn);
                    });
                } else if (optGroup.type === 'toggle') {
                    const btn = document.createElement('button');
                    btn.className = 'opt-btn';
                    btn.innerText = optGroup.choice.name + (optGroup.choice.price ? ` (+$${optGroup.choice.price.toFixed(2)})` : '');
                    btn.onclick = () => {
                        btn.classList.toggle('selected');
                        if (btn.classList.contains('selected')) {
                            app.data.tempOptions[optGroup.name] = optGroup.choice;
                        } else {
                            delete app.data.tempOptions[optGroup.name];
                        }
                    };
                    buttonsDiv.appendChild(btn);
                }
                groupDiv.appendChild(buttonsDiv);
                container.appendChild(groupDiv);
            });
        } else {
            container.innerHTML = '<p style="color:#777; font-style:italic;">No options.</p>';
        }
        const modal = document.getElementById('modal-options');
        if (modal) modal.classList.add('open');
    },

    confirmOptions: () => {
        const noteEl = document.getElementById('opt-custom-note');
        const note = noteEl ? noteEl.value : "";
        let optionsString = "";
        let addedPrice = 0;
        for (const key in app.data.tempOptions) {
            const choice = app.data.tempOptions[key];
            if (optionsString) optionsString += ", ";
            optionsString += choice.name;
            if (choice.price) addedPrice += choice.price;
        }
        const fullNotes = [optionsString, note].filter(Boolean).join('. Note: ');
        const finalPrice = app.data.tempProduct.price + addedPrice;
        const exist = app.data.cart.find(i => i.id === app.data.tempProduct.id && i.notes === fullNotes && i.price === finalPrice);
        if (exist) {
            exist.qty++;
        } else {
            app.data.cart.push({
                ...app.data.tempProduct,
                qty: 1,
                notes: fullNotes,
                price: finalPrice,
                baseId: app.data.tempProduct.id
            });
        }
        app.closeModal('modal-options');
        app.renderCart();
    },

    renderCart: () => {
        const list = document.getElementById('cart-list');
        if (!list) return;
        if (!app.data.cart.length) {
            list.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>`;
        } else {
            list.innerHTML = app.data.cart.map((i, idx) => `
                <div class="cart-item">
                    <div class="item-info">
                        <h4>${i.name}</h4>
                        <div class="opts">${i.notes || '(Standard)'}</div>
                    </div>
                    <div class="qty-control">
                        <button class="btn-qty" onclick="app.adjQty(${idx}, -1)">-</button>
                        <span>${i.qty}</span>
                        <button class="btn-qty" onclick="app.adjQty(${idx}, 1)">+</button>
                        <button class="btn-del" onclick="app.adjQty(${idx}, -999)"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`).join('');
        }
        const sub = app.data.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        const subEl = document.getElementById('pos-subtotal');
        const taxEl = document.getElementById('pos-tax');
        const totEl = document.getElementById('pos-total');
        if (subEl) subEl.innerText = `$${sub.toFixed(2)}`;
        const taxVal = sub * app.data.taxRate;
        if (taxEl) taxEl.innerText = `$${taxVal.toFixed(2)}`;
        const totalVal = sub * (1 + app.data.taxRate);
        if (totEl) totEl.innerText = `$${totalVal.toFixed(2)}`;
    },

    adjQty: (i, d) => {
        if (!app.data.cart[i]) return;
        app.data.cart[i].qty += d;
        if (app.data.cart[i].qty <= 0) app.data.cart.splice(i, 1);
        app.renderCart();
    },

    validateAndPay: (type) => {
        const nameInput = document.getElementById('customer-name');
        const name = nameInput ? nameInput.value.trim() : "";
        if (!name) {
            app.showAlert("Please enter the Customer Name first.", "Required Field");
            if (nameInput) {
                nameInput.classList.add('input-error');
                setTimeout(() => nameInput.classList.remove('input-error'), 1000);
            }
            return;
        }
        if (type === 'Cash') app.initiateCashPayment();
        else app.processPayment('Card');
    },

    initiateCashPayment: () => {
        if (!app.data.cart.length) return app.showAlert("Cart is empty");
        const total = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0) * (1 + app.data.taxRate);
        const totalEl = document.getElementById('cash-modal-total');
        if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
        app.data.tempCashEntry = "";
        const disp = document.getElementById('calc-display');
        if (disp) disp.innerText = "$0.00";
        const changeRes = document.getElementById('change-result');
        if (changeRes) changeRes.style.display = 'none';
        const modal = document.getElementById('modal-cash');
        if (modal) modal.classList.add('open');
    },

    calcInput: (v) => {
        if (v === '.' && app.data.tempCashEntry.includes('.')) return;
        app.data.tempCashEntry += v;
        app.updateCalc();
    },

    calcClear: () => {
        app.data.tempCashEntry = "";
        app.updateCalc();
    },

    calcExact: () => {
        const t = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0) * (1 + app.data.taxRate);
        app.data.tempCashEntry = t.toFixed(2);
        app.updateCalc();
    },

    calcNext: (n) => {
        app.data.tempCashEntry = n.toString();
        app.updateCalc();
    },

    updateCalc: () => {
        const val = parseFloat(app.data.tempCashEntry) || 0;
        const disp = document.getElementById('calc-display');
        if (disp) disp.innerText = `$${val.toFixed(2)}`;
        const total = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0) * (1 + app.data.taxRate);
        const change = val - total;
        const res = document.getElementById('change-result');
        const amt = document.getElementById('change-amt');
        if (res) res.style.display = change >= 0 ? 'block' : 'none';
        if (amt) amt.innerText = `$${change.toFixed(2)}`;
    },

    finalizeCash: () => {
        const total = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0) * (1 + app.data.taxRate);
        const tender = parseFloat(app.data.tempCashEntry);
        if (tender < total - 0.01) return app.showAlert("Insufficient funds.");
        app.processPayment('Cash', tender, tender - total);
    },

    processPayment: (type, tender = 0, change = 0) => {
        if (!app.data.cart.length) return;
        const nameInput = document.getElementById('customer-name');
        const customerName = (nameInput && nameInput.value.trim()) || "Walk-in";
        const sub = app.data.cart.reduce((s, i) => s + i.price * i.qty, 0);
        const order = {
            id: app.data.orderCounter++,
            date: new Date().toISOString(),
            cashier: app.data.currentCashier,
            customer: customerName,
            items: [...app.data.cart],
            sub,
            tax: sub * app.data.taxRate,
            total: sub * (1 + app.data.taxRate),
            type,
            tender,
            change,
            status: 'Pending'
        };
        order.items.forEach(i => {
            const p = app.data.products.find(x => x.id === (i.baseId || i.id));
            if (p) p.stock -= i.qty;
        });
        app.data.orders.push(order);
        app.saveData();
        app.closeModal('modal-cash');
        app.showReceipt(order);
        const orderNumEl = document.getElementById('order-number');
        if (orderNumEl) orderNumEl.innerText = app.data.orderCounter;
        if (nameInput) nameInput.value = "";
        playTone(1200, 'square', 0.1);
        setTimeout(() => playTone(1600, 'square', 0.2), 100);
    },

    showReceipt: (o) => {
        const d = new Date(o.date);
        const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const content = document.getElementById('receipt-content');
        if (!content) return;
        content.innerHTML = `
            <div class="r-center">
                <h3>STAR ACADEMY CAFE</h3>
                <p>${d.toLocaleDateString()} ${timeStr}</p>
                <p>Order #: ${o.id}</p>
                <p>Cashier: ${o.cashier}</p>
                <p>Customer: ${o.customer}</p>
            </div>
            <div class="r-line"></div>
            ${o.items.map(i => `
                <div class="r-row">
                    <span>${i.qty}x ${i.name}</span>
                    <span>$${(i.price * i.qty).toFixed(2)}</span>
                </div>
                ${i.notes ? `<div style="font-size:0.8rem;font-style:italic">- ${i.notes}</div>` : ''}
            `).join('')}
            <div class="r-line"></div>
            <div class="r-row"><span>Subtotal</span><span>$${o.sub.toFixed(2)}</span></div>
            <div class="r-row"><span>Tax</span><span>$${o.tax.toFixed(2)}</span></div>
            <div class="r-row r-total"><span>TOTAL</span><span>$${o.total.toFixed(2)}</span></div>
            ${o.type === 'Cash'
                ? `<div class="r-line"></div>
                   <div class="r-row"><span>Cash</span><span>$${o.tender.toFixed(2)}</span></div>
                   <div class="r-row"><span>Change</span><span>$${o.change.toFixed(2)}</span></div>`
                : `<div class="r-center" style="margin-top:10px;">Paid: ${o.type}</div>`}
            <div class="r-center" style="margin-top:20px;">Thank You!</div>
        `;
        const modal = document.getElementById('modal-receipt');
        if (modal) modal.classList.add('open');
    },

    closeReceiptAndReset: () => {
        app.data.cart = [];
        app.closeModal('modal-receipt');
        app.renderCart();
    },

    renderBarista: () => {
        const pending = app.data.orders.filter(o => o.status === 'Pending').reverse();
        const grid = document.getElementById('barista-grid');
        if (!grid) return;
        grid.innerHTML = pending.length ? pending.map(o => `
            <div class="order-card">
                <div class="oc-header">
                    <div class="oc-title">
                        <span>#${o.id}</span>
                        <span>${new Date(o.date).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span>
                    </div>
                    <div class="oc-customer">
                        <i class="fa-solid fa-user"></i> ${o.customer}
                    </div>
                </div>
                <div class="oc-body">
                    ${o.items.map(i => `
                        <div class="oc-item">
                            <div class="oc-item-name">${i.qty}x ${i.name}</div>
                            ${i.notes ? `<span class="oc-opts">${i.notes}</span>` : ''}
                        </div>`).join('')}
                </div>
                <div class="oc-footer">
                    <button class="btn-ready" onclick="app.markReady(${o.id})">Mark Ready</button>
                </div>
            </div>`).join('') : '<p>No orders.</p>';
    },

    markReady: (id) => {
        const o = app.data.orders.find(o => o.id === id);
        if (o) {
            o.status = 'Completed';
            app.saveData();
            app.renderBarista();
        }
    },

    renderDashboard: () => {
        const rev = app.data.orders.reduce((s, o) => s + o.total, 0);
        const revEl = document.getElementById('stat-revenue');
        const ordEl = document.getElementById('stat-orders');
        const lowEl = document.getElementById('stat-low');
        if (revEl) revEl.innerText = `$${rev.toFixed(2)}`;
        if (ordEl) ordEl.innerText = app.data.orders.length;
        if (lowEl) lowEl.innerText = app.data.products.filter(p => p.stock < 10).length;

        const recent = [...app.data.orders].reverse().slice(0, 10);
        const body = document.getElementById('dashboard-orders-body');
        if (!body) return;
        body.innerHTML = recent.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${new Date(o.date).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</td>
                <td>${o.customer}</td>
                <td>${o.cashier}</td>
                <td>$${o.total.toFixed(2)}</td>
                <td>${o.status}</td>
                <td><button class="btn-sm" onclick="app.showReceiptById(${o.id})">Receipt</button></td>
            </tr>`).join('');
    },

    showReceiptById: (id) => {
        const o = app.data.orders.find(o => o.id === id);
        if (o) app.showReceipt(o);
    },

    renderInventory: () => {
        const role = app.getRole();
        const isManager = (role === 'Manager' || role === 'IT Admin');
        const header = document.querySelector('#view-inventory .dash-header');
        if (header) {
            let headerHtml = '<h2>Inventory</h2>';
            if (isManager) headerHtml += '<button class="btn-sm" onclick="app.openProductModal()">+ Add Item</button>';
            header.innerHTML = headerHtml;
        }

        const body = document.getElementById('inventory-body');
        if (!body) return;
        body.innerHTML = app.data.products.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.cat}</td>
                <td><b>${p.stock}</b></td>
                <td>$${p.price.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${p.stock<10?'stock-low':'stock-ok'}">
                        ${p.stock<10?'Low':'OK'}
                    </span>
                </td>
                <td>
                    <button class="btn-sm" onclick="app.inventoryEditClick(${p.id})">Edit</button>
                    ${isManager ? `<button class="btn-sm btn-danger-sm" onclick="app.deleteProduct(${p.id})">X</button>` : ''}
                </td>
            </tr>`).join('');
    },

    getRole: () => {
        const emp = app.data.employees.find(e => e.name === app.data.currentCashier);
        if (app.data.currentCashier === 'Manager') return 'Manager';
        if (app.data.currentCashier === 'IT Support') return 'IT Admin';
        return emp ? emp.role : 'Student';
    },

    inventoryEditClick: (id) => {
        const role = app.getRole();
        if (role === 'Manager' || role === 'IT Admin') app.editProduct(id);
        else app.editInventory(id);
    },

    editInventory: (id) => {
        app.data.editingId = id;
        const p = app.data.products.find(x => x.id === id);
        if (!p) return;
        const nameEl = document.getElementById('edit-inv-name');
        const stockEl = document.getElementById('edit-inv-stock');
        const priceEl = document.getElementById('edit-inv-price');
        if (nameEl) nameEl.innerText = p.name;
        if (stockEl) stockEl.value = p.stock;
        if (priceEl) priceEl.value = p.price;
        const modal = document.getElementById('modal-edit-inventory');
        if (modal) modal.classList.add('open');
    },

    saveInventory: () => {
        const p = app.data.products.find(x => x.id === app.data.editingId);
        if (!p) return;
        const stockEl = document.getElementById('edit-inv-stock');
        const priceEl = document.getElementById('edit-inv-price');
        if (!stockEl || !priceEl) return;
        p.stock = parseInt(stockEl.value || "0", 10);
        p.price = parseFloat(priceEl.value || "0");
        app.saveData();
        app.closeModal('modal-edit-inventory');
        app.renderInventory();
    },

    updateClock: () => {
        const now = new Date();
        const bigClock = document.getElementById('big-clock');
        const bigDate = document.getElementById('big-date');
        const liveClock = document.getElementById('live-clock');
        if (bigClock) bigClock.innerText = now.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
        if (bigDate) bigDate.innerText = now.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
        if (liveClock) liveClock.innerText = now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    },

    renderTimeClock: () => {
        const select = document.getElementById('time-employee-select');
        if (select) {
            select.innerHTML = '<option value="">Select your name...</option>' +
                app.data.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        }
        const active = app.data.timeEntries.filter(e => !e.out);
        const activeList = document.getElementById('active-workers-list');
        if (activeList) {
            activeList.innerHTML = active.map(e => {
                const emp = app.data.employees.find(x => x.id == e.empId);
                return `<div class="worker-pill"><i class="fa-solid fa-user-clock"></i> ${emp ? emp.name : '?'}</div>`;
            }).join('');
        }
        const activeCount = document.getElementById('time-active-count');
        if (activeCount) activeCount.innerText = active.length;

        let weekHrs = 0;
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        app.data.timeEntries.forEach(e => {
            if (e.out && new Date(e.out) >= startOfWeek) {
                weekHrs += (new Date(e.out) - new Date(e.in)) / 36e5;
            }
        });
        const hrsWeekEl = document.getElementById('time-hours-week');
        if (hrsWeekEl) hrsWeekEl.innerText = weekHrs.toFixed(1);

        const tbody = document.getElementById('time-entries-body');
        if (tbody) {
            tbody.innerHTML = [...app.data.timeEntries].reverse().slice(0, 5).map(e => {
                const emp = app.data.employees.find(x => x.id == e.empId);
                return `
                    <tr>
                        <td>${emp ? emp.name : '?'}</td>
                        <td>${new Date(e.in).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</td>
                        <td>${e.out ? new Date(e.out).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}) : '-'}</td>
                        <td>${e.out ? ((new Date(e.out)-new Date(e.in))/36e5).toFixed(2) : 'Running'}</td>
                    </tr>`;
            }).join('');
        }
    },

    clockIn: () => {
        const select = document.getElementById('time-employee-select');
        if (!select) return;
        const eid = select.value;
        if (!eid) return app.showAlert("Select name");
        if (app.data.timeEntries.find(e => e.empId == eid && !e.out)) return app.showAlert("Already clocked in");
        app.data.timeEntries.push({id: Date.now(), empId: eid, in: new Date().toISOString(), out: null});
        app.saveData();
        app.renderTimeClock();
    },

    clockOut: () => {
        const select = document.getElementById('time-employee-select');
        if (!select) return;
        const eid = select.value;
        if (!eid) return app.showAlert("Select name");
        const entry = app.data.timeEntries.find(e => e.empId == eid && !e.out);
        if (!entry) return app.showAlert("Not clocked in");
        entry.out = new Date().toISOString();
        app.saveData();
        app.renderTimeClock();
    },

    renderProductsManager: () => {
        const body = document.getElementById('products-manager-body');
        if (!body) return;
        body.innerHTML = app.data.products.map(p => `
            <tr>
                <td>
                    <img src="${p.img}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.src='https://via.placeholder.com/40'">
                </td>
                <td>${p.name}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>
                    <button class="btn-sm" onclick="app.editProduct(${p.id})">Edit</button>
                    <button class="btn-sm btn-danger-sm" onclick="app.deleteProduct(${p.id})">X</button>
                </td>
            </tr>`).join('');
    },

    openProductModal: (isEdit = false) => {
        const titleEl = document.getElementById('prod-modal-title');
        if (titleEl) titleEl.innerText = isEdit ? "Edit Product" : "Add Product";
        const listEl = document.getElementById('prod-options-list');
        if (listEl) listEl.innerHTML = '';
        if (!isEdit) {
            app.data.editingId = null;
            const nameEl = document.getElementById('prod-name');
            const priceEl = document.getElementById('prod-price');
            const stockEl = document.getElementById('prod-stock');
            const imgEl = document.getElementById('prod-img-url');
            const prev = document.getElementById('prod-img-preview');
            if (nameEl) nameEl.value = "";
            if (priceEl) priceEl.value = "";
            if (stockEl) stockEl.value = "";
            if (imgEl) imgEl.value = "";
            if (prev) prev.src = "";
            app.data.tempOptionsList = [];
        }
        app.renderProductOptionsUI();
        const modal = document.getElementById('modal-product');
        if (modal) modal.classList.add('open');
    },

    editProduct: (id) => {
        const p = app.data.products.find(x => x.id === id);
        if (!p) return;
        app.data.editingId = id;
        const nameEl = document.getElementById('prod-name');
        const catEl = document.getElementById('prod-cat');
        const priceEl = document.getElementById('prod-price');
        const stockEl = document.getElementById('prod-stock');
        const imgEl = document.getElementById('prod-img-url');
        const prev = document.getElementById('prod-img-preview');
        if (nameEl) nameEl.value = p.name;
        if (catEl) catEl.value = p.cat;
        if (priceEl) priceEl.value = p.price;
        if (stockEl) stockEl.value = p.stock;
        if (imgEl) imgEl.value = p.img;
        if (prev) prev.src = p.img;
        app.data.tempOptionsList = p.options ? JSON.parse(JSON.stringify(p.options)) : [];
        app.openProductModal(true);
    },

    renderProductOptionsUI: () => {
        const c = document.getElementById('prod-options-list');
        if (!c) return;
        c.innerHTML = '';
        if (!app.data.tempOptionsList || !app.data.tempOptionsList.length) {
            c.innerHTML = '<p style="color:#777">No options.</p>';
            return;
        }
        app.data.tempOptionsList.forEach((g, i) => {
            c.innerHTML += `
                <div>
                    <b>${g.name} (${g.type})</b>
                    <button class="btn-sm btn-danger-sm" onclick="app.removeProductOptionGroup(${i})">x</button>
                </div>`;
        });
    },

    addProductOptionUI: () => {
        const n = prompt("Name:");
        if (!n) return;
        const t = prompt("Type (select/radio/toggle):");
        if (['select','radio','toggle'].includes(t)) {
            if (!app.data.tempOptionsList) app.data.tempOptionsList = [];
            app.data.tempOptionsList.push({name:n, type:t, choices:[]});
            app.renderProductOptionsUI();
        }
    },

    removeProductOptionGroup: (i) => {
        if (!app.data.tempOptionsList) return;
        app.data.tempOptionsList.splice(i, 1);
        app.renderProductOptionsUI();
    },

    saveProduct: () => {
        const nameEl = document.getElementById('prod-name');
        const priceEl = document.getElementById('prod-price');
        const stockEl = document.getElementById('prod-stock');
        const imgEl = document.getElementById('prod-img-url');
        const catEl = document.getElementById('prod-cat');
        if (!nameEl || !priceEl || !stockEl || !imgEl || !catEl) return;
        const name = nameEl.value.trim();
        const price = parseFloat(priceEl.value);
        const stock = parseInt(stockEl.value || "0", 10);
        const img = imgEl.value;
        const cat = catEl.value;
        if (!name || isNaN(price)) return app.showAlert("Name/Price required.");
        const pData = {name, price, stock, img, cat, options: app.data.tempOptionsList || []};
        if (app.data.editingId) {
            const p = app.data.products.find(x => x.id === app.data.editingId);
            if (p) Object.assign(p, pData);
        } else {
            app.data.products.push({id: Date.now(), ...pData});
        }
        app.saveData();
        app.closeModal('modal-product');
        app.refreshUI();
        const invView = document.getElementById('view-inventory');
        if (invView && invView.classList.contains('active')) app.renderInventory();
    },

    deleteProduct: (id) => {
        if (!confirm("Delete?")) return;
        app.data.products = app.data.products.filter(p => p.id !== id);
        app.saveData();
        app.renderProductsManager();
        const invView = document.getElementById('view-inventory');
        if (invView && invView.classList.contains('active')) app.renderInventory();
    },

    renderEmployeesManager: () => {
        const body = document.getElementById('employees-body');
        if (!body) return;
        body.innerHTML = app.data.employees.map(e => `
            <tr>
                <td><img src="${e.img}" class="emp-thumb"></td>
                <td>${e.name}</td>
                <td>${e.role}</td>
                <td>
                    <button class="btn-sm" onclick="app.editEmployee(${e.id})">Edit</button>
                    <button class="btn-sm btn-danger-sm" onclick="app.deleteEmployee(${e.id})">X</button>
                </td>
            </tr>`).join('');
    },

    openEmployeeModal: (isEdit = false) => {
        const titleEl = document.getElementById('emp-modal-title');
        if (titleEl) titleEl.innerText = isEdit ? "Edit Employee" : "Add Employee";
        if (!isEdit) {
            app.data.editingId = null;
            const nameEl = document.getElementById('emp-name');
            const imgEl = document.getElementById('emp-img-url');
            if (nameEl) nameEl.value = "";
            if (imgEl) imgEl.value = "";
        }
        const modal = document.getElementById('modal-employee');
        if (modal) modal.classList.add('open');
    },

    editEmployee: (id) => {
        const e = app.data.employees.find(x => x.id === id);
        if (!e) return;
        app.data.editingId = id;
        const nameEl = document.getElementById('emp-name');
        const roleEl = document.getElementById('emp-role');
        const imgEl = document.getElementById('emp-img-url');
        if (nameEl) nameEl.value = e.name;
        if (roleEl) roleEl.value = e.role;
        if (imgEl) imgEl.value = e.img;
        app.openEmployeeModal(true);
    },

    saveEmployee: () => {
        const nameEl = document.getElementById('emp-name');
        const roleEl = document.getElementById('emp-role');
        const imgEl = document.getElementById('emp-img-url');
        if (!nameEl || !roleEl || !imgEl) return;
        const n = nameEl.value.trim();
        if (!n) return;
        const r = roleEl.value;
        const i = imgEl.value || 'images/placeholder.png';
        if (app.data.editingId) {
            const e = app.data.employees.find(x => x.id === app.data.editingId);
            if (e) {
                e.name = n;
                e.role = r;
                e.img = i;
            }
        } else {
            app.data.employees.push({id: Date.now(), name: n, role: r, img: i});
        }
        app.saveData();
        app.closeModal('modal-employee');
        app.renderEmployeesManager();
        app.renderLogin();
    },

    deleteEmployee: (id) => {
        if (!confirm("Remove?")) return;
        app.requestPin((pin) => {
            if (pin === "1234") {
                app.data.employees = app.data.employees.filter(e => e.id !== id);
                app.saveData();
                app.renderEmployeesManager();
                app.renderLogin();
            } else app.showAlert("Incorrect PIN");
        });
    },
    
    closeModal: (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('open');
    }
};

// Attach app to window for inline onclick handlers and initialize
window.app = app;
app.init();
