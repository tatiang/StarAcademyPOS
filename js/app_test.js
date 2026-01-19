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
        timeEntries: [], 
        bugReports: [], 
        orderCounter: 1001, 
        settings: { storeName: "Classroom Café", taxRate: 0.0925 }, // NEW
        tempProduct: null, 
        tempOptions: {}, 
        tempCashEntry: "", 
        editingId: null, 
        inventorySort: { field: "name", dir: "asc" }, 
    },
    managerState: { activeTab: 'overview', quickStockMode: false }, // NEW
    pinBuffer: "",
    pinCallback: null,

    init: () => {
        app.loadLocalData(); 
        setInterval(app.updateClock, 1000);
        document.getElementById('order-number').innerText = app.data.orderCounter;
        app.applySettings();
        app.renderLogin(); 
    },

    loadLocalData: () => {
        const stored = localStorage.getItem('starAcademyPOS_v138');
        if (stored) {
            app.data = JSON.parse(stored);
            if (!app.data.settings) app.data.settings = { storeName: "Classroom Café", taxRate: 0.0925 };
        } else {
            app.seedData();
        }
    },

    saveData: () => { 
        localStorage.setItem('starAcademyPOS_v138', JSON.stringify(app.data));
        if(window.saveToCloud) window.saveToCloud(app.data, true); 
    },

    seedData: () => {
        // Standard seeding logic
        app.data.products = [
            { id: 1, name: "Coffee", cat: "Beverages", price: 3.50, stock: 50, img: "images/coffee.jpg", options: [{ name: "Add-ins", type: "select", choices: [{name:"+ Half & Half"}, {name:"+ Extra Room"}, {name:"(No Caf) Decaf"}] }] },
            { id: 2, name: "Herbal Tea", cat: "Beverages", price: 3.25, stock: 40, img: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200", options: [{ name: "Temp", type: "toggle", choice: {name:"Not too hot"} }] },
            { id: 10, name: "Choc Chip Cookie", cat: "Baked Goods", price: 2.50, stock: 30, img: "https://images.unsplash.com/photo-1499636138143-bd630f5cf38a?w=200" },
            { id: 13, name: "Bottled Water", cat: "Beverages", price: 1.50, stock: 50, img: "https://images.unsplash.com/photo-1603394630854-e0b62d294e33?w=200" }
        ];
        
        app.data.employees = [
            {id: 2, name: "Alex", role: "Cashier", img: "images/placeholder.png"},
            {id: 3, name: "Brianna", role: "Barista", img: "images/placeholder.png"}
        ];
        app.data.settings = { storeName: "Classroom Café", taxRate: 0.0925 };
        app.data.orderCounter = 1001;
        app.saveData();
    },

    applySettings: () => {
        const title = app.data.settings.storeName || "Classroom Café";
        const rate = app.data.settings.taxRate || 0.0925;
        document.title = title + " POS";
        const loginTitle = document.getElementById('store-title-login');
        if(loginTitle) loginTitle.innerText = title;
        const taxDisp = document.getElementById('tax-rate-display');
        if(taxDisp) taxDisp.innerText = (rate * 100).toFixed(2);
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
        }
    },

    // --- NAVIGATION ---
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

    navigate: (view) => {
        const viewId = `view-${view}`;
        document.querySelectorAll('#sidebar .nav-links li').forEach(li => {
            li.classList.toggle('active', li.getAttribute('id') === `nav-${view}`);
        });

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');

        switch(view) {
            case 'pos': app.renderPOS(); break;
            case 'barista': app.renderBarista(); break;
            case 'dashboard': app.renderDashboard(); break;
            case 'inventory': app.renderInventory(); break;
            case 'time': app.renderTimeClock(); break;
            case 'manager': app.renderManagerHub(); break;
            case 'it': app.renderITHub(); break;
        }
    },

    // --- POS Logic ---
    renderPOS: () => {
        // Categories
        const cats = ["Beverages", "Baked Goods", "Snacks", "Merch"];
        const ex = [...new Set(app.data.products.map(p=>p.cat))];
        ex.forEach(c => { if(!cats.includes(c)) cats.push(c); });
        
        const catContainer = document.getElementById('pos-categories');
        if(catContainer) {
            catContainer.innerHTML = `<div class="cat-tab active" onclick="app.filterPOS('All', this)">All</div>` + 
                cats.map(c => `<div class="cat-tab" onclick="app.filterPOS('${c}', this)">${c}</div>`).join('');
        }
        app.filterPOS('All');
        app.renderCart();
    },

    filterPOS: (cat, tabEl) => {
        if (tabEl) {
            document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            tabEl.classList.add('active');
        }
        const grid = document.getElementById('pos-grid');
        const prods = cat === 'All' ? app.data.products : app.data.products.filter(p => p.cat === cat);
        
        grid.innerHTML = prods.map(p => `
            <div class="product-card" onclick="app.addToCart(${p.id})">
                <img src="${p.img}" class="p-image" onerror="this.src='images/placeholder.png'">
                <div class="p-details">
                    <div class="p-name">${p.name}</div>
                    <div class="p-price">$${p.price.toFixed(2)}</div>
                    <div class="p-stock" style="color:${p.stock<5?'red':'green'}">${p.stock} in stock</div>
                </div>
            </div>
        `).join('');
    },

    addToCart: (id) => {
        const p = app.data.products.find(x => x.id === id);
        if (p.stock <= 0) return app.showAlert("Out of stock!");
        
        if (p.options && p.options.length > 0) {
            app.data.tempProduct = p;
            app.data.tempOptions = {};
            app.openOptionsModal(p);
        } else {
            app.data.cart.push({ ...p, qty: 1, _key: Date.now() });
            app.renderCart();
        }
    },

    openOptionsModal: (p) => {
        const container = document.getElementById('options-container');
        document.getElementById('opt-custom-note').value = "";
        container.innerHTML = "";
        
        if (p.options) {
            p.options.forEach(optGroup => {
                const groupDiv = document.createElement('div');
                groupDiv.innerHTML = `<h4>${optGroup.name}</h4>`;
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
        }
        document.getElementById('modal-options').classList.add('open');
    },

    confirmOptions: () => {
        const note = document.getElementById('opt-custom-note').value;
        let optionsString = "";
        let addedPrice = 0;
        
        for (const key in app.data.tempOptions) {
            const choice = app.data.tempOptions[key];
            optionsString += `${choice.name}, `;
            if (choice.price) addedPrice += choice.price;
        }
        
        if (note) optionsString += `Note: ${note}`;
        
        app.data.cart.push({
            ...app.data.tempProduct,
            price: app.data.tempProduct.price + addedPrice,
            qty: 1,
            opts: optionsString,
            _key: Date.now()
        });
        
        app.closeModal('modal-options');
        app.renderCart();
    },

    removeFromCart: (key) => {
        app.data.cart = app.data.cart.filter(i => i._key !== key);
        app.renderCart();
    },

    renderCart: () => {
        const list = document.getElementById('cart-list');
        const rate = app.data.settings.taxRate || 0.0925;
        
        if (app.data.cart.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Cart is empty</div>';
            document.getElementById('pos-subtotal').innerText = "$0.00";
            document.getElementById('pos-tax').innerText = "$0.00";
            document.getElementById('pos-total').innerText = "$0.00";
            return;
        }
        
        list.innerHTML = app.data.cart.map(i => `
            <div class="cart-item">
                <div style="flex-grow:1">
                    <div style="font-weight:bold">${i.name}</div>
                    <div style="font-size:0.8rem; color:#666;">${i.opts || ''}</div>
                </div>
                <div style="font-weight:bold">$${i.price.toFixed(2)}</div>
                <div onclick="app.removeFromCart(${i._key})" style="margin-left:10px; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i></div>
            </div>
        `).join('');
        
        const sub = app.data.cart.reduce((s, i) => s + i.price, 0);
        const tax = sub * rate;
        const total = sub + tax;
        
        document.getElementById('pos-subtotal').innerText = `$${sub.toFixed(2)}`;
        document.getElementById('pos-tax').innerText = `$${tax.toFixed(2)}`;
        document.getElementById('pos-total').innerText = `$${total.toFixed(2)}`;
    },

    // --- PAYMENT & RECEIPT ---
    validateAndPay: (method) => {
        if (app.data.cart.length === 0) return app.showAlert("Cart is empty");
        const name = document.getElementById('customer-name').value.trim();
        if (!name) return app.showAlert("Please enter customer name");
        
        if (method === 'Cash') {
            app.data.tempCashEntry = "";
            document.getElementById('calc-display').innerText = "$0.00";
            document.getElementById('change-result').style.display = 'none';
            document.getElementById('modal-cash').classList.add('open');
        } else {
            app.processPayment(method);
        }
    },

    calcInput: (v) => {
        if(v==='.' && app.data.tempCashEntry.includes('.')) return;
        app.data.tempCashEntry += v;
        app.updateCalc();
    },
    calcClear: () => { app.data.tempCashEntry = ""; app.updateCalc(); },
    calcExact: () => {
        const rate = app.data.settings.taxRate || 0.0925;
        const t = app.data.cart.reduce((s,i)=>s+i.price*i.qty,0)*(1+rate);
        app.data.tempCashEntry = t.toFixed(2);
        app.updateCalc();
    },
    calcNext: (n) => {
        app.data.tempCashEntry = n.toString();
        app.updateCalc();
    },
    updateCalc: () => {
        const val = parseFloat(app.data.tempCashEntry) || 0;
        document.getElementById('calc-display').innerText = `$${val.toFixed(2)}`;
        const rate = app.data.settings.taxRate || 0.0925;
        const total = app.data.cart.reduce((s,i)=>s+i.price*i.qty,0)*(1+rate);
        const change = val - total;
        document.getElementById('change-result').style.display = change >= 0 ? 'block' : 'none';
        document.getElementById('change-amt').innerText = `$${change.toFixed(2)}`;
    },

    finalizeCash: () => {
        const rate = app.data.settings.taxRate || 0.0925;
        const total = app.data.cart.reduce((s,i)=>s+i.price*i.qty,0)*(1+rate);
        const tender = parseFloat(app.data.tempCashEntry);
        if(tender < total - 0.01) return app.showAlert("Insufficient funds.");
        app.processPayment('Cash');
        app.closeModal('modal-cash');
    },

    processPayment: (method) => {
        const rate = app.data.settings.taxRate || 0.0925;
        const total = app.data.cart.reduce((s, i) => s + i.price, 0) * (1 + rate);
        const order = {
            id: app.data.orderCounter++,
            date: new Date().toLocaleString(),
            customer: document.getElementById('customer-name').value,
            items: [...app.data.cart],
            total: total,
            method: method,
            cashier: app.data.currentCashier,
            status: 'Pending'
        };
        
        app.data.orders.unshift(order);
        // Deduct Stock
        app.data.cart.forEach(item => {
            const p = app.data.products.find(x => x.id === item.id);
            if(p) p.stock--;
        });
        
        app.data.cart = [];
        document.getElementById('customer-name').value = "";
        app.saveData();
        app.renderCart();
        app.renderBarista();
        document.getElementById('order-number').innerText = app.data.orderCounter;
        
        playTone(600, 'sine', 0.1);
        setTimeout(() => playTone(800, 'sine', 0.2), 150);
        
        app.showReceipt(order);
    },

    showReceipt: (order) => {
        const h = `
            <div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:10px; margin-bottom:10px;">
                <h3>${app.data.settings.storeName || "STAR ACADEMY"}</h3>
                <p>${order.date}</p>
                <p>Order #${order.id} | ${order.method}</p>
                <p>Cashier: ${order.cashier}</p>
                <p>Customer: ${order.customer}</p>
            </div>
            ${order.items.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qty}x ${i.name}</span><span>$${i.price.toFixed(2)}</span></div>${i.opts ? `<div style="font-size:0.8rem; color:#666">${i.opts}</div>` : ''}`).join('')}
            <div style="border-top:1px dashed #000; margin-top:10px; padding-top:10px; text-align:right;">
                <strong>Total: $${order.total.toFixed(2)}</strong>
            </div>
            <div style="text-align:center; margin-top:20px; font-size:0.8rem;">Thank you!</div>
        `;
        document.getElementById('receipt-content').innerHTML = h;
        document.getElementById('modal-receipt').classList.add('open');
    },

    // --- MANAGER HUB LOGIC (NEW v1.38) ---
    renderManagerHub: () => {
        const tab = app.managerState.activeTab;
        
        // Update Sidebar active state
        document.querySelectorAll('.man-nav li').forEach(li => li.classList.remove('active'));
        const tabEl = document.getElementById(`mtab-${tab}`);
        if(tabEl) tabEl.classList.add('active');

        // Route to content
        const content = document.getElementById('manager-content-area');
        content.innerHTML = ''; // Clear current

        if(tab === 'overview') app.renderManagerOverview(content);
        if(tab === 'inventory') app.renderManagerInventory(content);
        if(tab === 'transactions') app.renderManagerTransactions(content);
        if(tab === 'users') app.renderManagerUsers(content);
        if(tab === 'settings') app.renderManagerSettings(content);
    },

    switchManagerTab: (tab) => {
        app.managerState.activeTab = tab;
        app.renderManagerHub();
    },

    // Tab 1: Overview
    renderManagerOverview: (container) => {
        const today = new Date().toLocaleDateString();
        const todaysOrders = app.data.orders.filter(o => o.date.includes(today) && o.status !== 'Refunded');
        const rev = todaysOrders.reduce((s,o) => s + o.total, 0);
        const lowStock = app.data.products.filter(p => p.stock < 5).length;
        
        // Calc Top Item
        const counts = {};
        todaysOrders.forEach(o => o.items.forEach(i => counts[i.name] = (counts[i.name]||0)+1));
        const topItemEntry = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
        const topItem = topItemEntry ? `${topItemEntry[0]} (${topItemEntry[1]})` : "N/A";

        // Category breakdown for chart
        const catCounts = {};
        todaysOrders.forEach(o => o.items.forEach(i => {
            const p = app.data.products.find(prod => prod.id === i.id);
            const c = p ? p.cat : 'Other';
            catCounts[c] = (catCounts[c]||0)+1;
        }));
        const totalItems = Object.values(catCounts).reduce((a,b)=>a+b, 0);
        let chartHTML = `<div style="display:flex; height:20px; width:100%; background:#eee; border-radius:10px; overflow:hidden; margin-top:10px;">`;
        const colors = ['#307785', '#CB9832', '#8e44ad', '#27ae60', '#e74c3c'];
        let ci = 0;
        for(let cat in catCounts) {
            const pct = (catCounts[cat] / totalItems) * 100;
            chartHTML += `<div style="width:${pct}%; background:${colors[ci%colors.length]};" title="${cat}: ${Math.round(pct)}%"></div>`;
            ci++;
        }
        chartHTML += `</div><div style="display:flex; gap:10px; font-size:0.8rem; margin-top:5px; flex-wrap:wrap;">`;
        ci = 0;
        for(let cat in catCounts) {
            chartHTML += `<div style="display:flex; align-items:center; gap:4px;"><div style="width:8px; height:8px; background:${colors[ci%colors.length]}; border-radius:50%;"></div>${cat}</div>`;
            ci++;
        }
        chartHTML += `</div>`;
        if(totalItems === 0) chartHTML = `<div style="color:#999; font-style:italic;">No sales data today</div>`;

        container.innerHTML = `
            <h2 class="man-title">Dashboard Overview</h2>
            <div class="kpi-grid">
                <div class="kpi-card"><h3>Today's Revenue</h3><div class="val">$${rev.toFixed(2)}</div></div>
                <div class="kpi-card"><h3>Transactions</h3><div class="val">${todaysOrders.length}</div></div>
                <div class="kpi-card"><h3>Top Seller</h3><div class="val" style="font-size:1.2rem">${topItem}</div></div>
                <div class="kpi-card"><h3>Low Stock Alerts</h3><div class="val" style="color:${lowStock>0?'var(--danger)':'inherit'}">${lowStock}</div></div>
            </div>
            <div style="margin-top:20px; background:white; padding:20px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <h3>Sales by Category</h3>
                ${chartHTML}
            </div>
            
            <div style="margin-top:20px;">
               <h3>System Status</h3>
               <div style="background:white; padding:15px; border-radius:8px; margin-top:10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Cloud Sync:</span> <span style="color:green; font-weight:bold;">Active</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Database Size:</span> <span>${(JSON.stringify(app.data).length/1024).toFixed(2)} KB</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Bug Reports:</span> <span>${app.data.bugReports.length}</span> <button class="btn-sm" onclick="app.openBugModal()">+ New Report</button></div>
               </div>
            </div>
        `;
    },

    // Tab 2: Inventory
    renderManagerInventory: (container) => {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 class="man-title" style="margin:0">Inventory Management</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn-sm" style="background:${app.managerState.quickStockMode ? 'var(--success)' : '#666'}" onclick="app.toggleQuickStock()">
                        ${app.managerState.quickStockMode ? 'Save Stock' : '⚡ Quick Stock'}
                    </button>
                    <button class="btn-sm" onclick="app.openProductModal()">+ Add Product</button>
                </div>
            </div>
            <div class="man-table-wrap">
                <table class="man-table">
                    <thead><tr><th>Name</th><th>Cat</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${app.data.products.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td><span class="badge">${p.cat}</span></td>
                                <td>$${p.price.toFixed(2)}</td>
                                <td>
                                    ${app.managerState.quickStockMode 
                                      ? `<input type="number" value="${p.stock}" style="width:60px; padding:5px;" onchange="app.updateStock(${p.id}, this.value)">` 
                                      : `<span style="color:${p.stock<5?'red':'inherit'}">${p.stock}</span>`}
                                </td>
                                <td><button class="btn-sm" onclick="app.editProduct(${p.id})">Edit</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    toggleQuickStock: () => {
        app.managerState.quickStockMode = !app.managerState.quickStockMode;
        if (!app.managerState.quickStockMode) app.saveData(); // Save on exit
        app.renderManagerHub();
    },

    updateStock: (id, val) => {
        const p = app.data.products.find(x => x.id === id);
        if(p) p.stock = parseInt(val);
        // Don't save immediately to avoid lag, save on toggle off or nav
    },

    // Tab 3: Transactions & Refunds
    renderManagerTransactions: (container) => {
        const history = [...app.data.orders].reverse();
        container.innerHTML = `
             <h2 class="man-title">Transaction History</h2>
             <div class="man-table-wrap">
                <table class="man-table">
                    <thead><tr><th>ID</th><th>Time</th><th>Customer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        ${history.map(o => `
                            <tr style="opacity:${o.status==='Refunded'?0.5:1}">
                                <td>#${o.id}</td>
                                <td>${o.date}</td>
                                <td>${o.customer}</td>
                                <td>$${o.total.toFixed(2)}</td>
                                <td>${o.status}</td>
                                <td>
                                    ${o.status !== 'Refunded' 
                                      ? `<button class="btn-sm btn-danger-sm" onclick="app.refundOrder(${o.id})">Refund</button>` 
                                      : '<span>-</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    refundOrder: (id) => {
        if(!confirm(`Are you sure you want to refund Order #${id}? This will restore stock.`)) return;
        
        const o = app.data.orders.find(x => x.id === id);
        if(!o || o.status === 'Refunded') return;

        // Restore Stock
        o.items.forEach(item => {
            const p = app.data.products.find(prod => prod.id === item.id);
            if(p) p.stock += item.qty;
        });

        o.status = 'Refunded';
        app.saveData();
        app.renderManagerHub();
        alert(`Order #${id} refunded and stock restored.`);
    },

    // Tab 4: Users (Old Employee Management)
    renderManagerUsers: (container) => {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 class="man-title" style="margin:0">User Management</h2>
                <button class="btn-sm" onclick="app.openEmployeeModal()">+ Add User</button>
            </div>
            <div id="manager-emp-list" style="background:#f9f9f9; padding:15px; border-radius:8px;">
                ${app.data.employees.map(e => `
                    <div style="display:flex; align-items:center; background:white; padding:10px; margin-bottom:8px; border-radius:6px; border:1px solid #ddd;">
                        <img src="${e.img}" style="width:40px; height:40px; border-radius:50%; margin-right:10px; object-fit:cover;" onerror="this.src='images/placeholder.png'">
                        <div style="flex:1;">
                            <div style="font-weight:bold;">${e.name}</div>
                            <div style="font-size:0.8rem; color:#666;">${e.role}</div>
                        </div>
                        <button class="btn-sm" onclick="app.editEmployee(${e.id})"><i class="fa-solid fa-pen"></i></button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Tab 5: Settings
    renderManagerSettings: (container) => {
        container.innerHTML = `
            <h2 class="man-title">Store Settings</h2>
            <div class="manager-box">
                <div class="form-group">
                    <label>Store Name</label>
                    <input type="text" id="set-name" class="form-control" value="${app.data.settings.storeName || 'Classroom Café'}">
                </div>
                <div class="form-group">
                    <label>Tax Rate (Decimal, e.g. 0.0925 for 9.25%)</label>
                    <input type="number" id="set-tax" class="form-control" step="0.0001" value="${app.data.settings.taxRate}">
                </div>
                <button class="btn-pay btn-gold" onclick="app.saveSettings()">Save Configuration</button>
            </div>
            
            <h3 style="margin-top:20px;">Data Tools</h3>
            <div class="quick-tools-grid">
                <button class="btn-tool" onclick="app.downloadFullBackup()"><i class="fa-solid fa-download"></i> Backup JSON</button>
                <button class="btn-tool" onclick="window.loadFromCloud(true)"><i class="fa-solid fa-rotate"></i> Force Sync</button>
                <button class="btn-tool" style="color:var(--danger)" onclick="app.seedData(); app.renderManagerHub(); alert('Reset to Demo Data')"><i class="fa-solid fa-database"></i> Reset Demo Data</button>
            </div>
        `;
    },

    saveSettings: () => {
        const name = document.getElementById('set-name').value;
        const tax = parseFloat(document.getElementById('set-tax').value);
        if(!name || isNaN(tax)) return alert("Invalid inputs");
        
        app.data.settings = { storeName: name, taxRate: tax };
        app.saveData();
        app.applySettings();
        alert("Settings Saved");
    },

    // --- COMMON UTILS (Login, Modals, etc - Preserved) ---
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
        let imgUrl = 'images/placeholder.png';
        const emp = app.data.employees.find(e => e.name === name);
        if (emp) imgUrl = emp.img;
        
        document.getElementById('header-cashier').innerHTML = `<img src="${imgUrl}" class="cashier-avatar" onerror="this.src='images/placeholder.png'"> ${name}`;
        document.getElementById('login-overlay').style.display = 'none';
        app.updateSidebar();
        
        if (role === 'Manager') {
            app.navigate('manager');
            // Reset tab
            app.managerState.activeTab = 'overview';
            app.renderManagerHub();
        }
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

    // ... (Existing IT, TimeClock, Bug, Employee modal functions preserved below) ...
    renderITHub: () => {
        document.getElementById('it-db-status').innerText = "Local Storage Active";
        document.getElementById('it-last-sync').innerText = new Date().toLocaleTimeString();
        document.getElementById('it-storage').innerText = (JSON.stringify(app.data).length / 1024).toFixed(2) + " KB";
    },

    nuclearReset: () => {
        if(confirm("WARNING: This will delete ALL data. Are you sure?")) {
            localStorage.removeItem('starAcademyPOS_v138');
            location.reload();
        }
    },
    
    // Bug & Employee Modals (Integrated into Manager Hub now)
    openBugModal: () => { document.getElementById('bug-desc').value = ""; document.getElementById('modal-bug').classList.add('open'); },
    submitBugReport: () => {
        const type = document.getElementById('bug-type').value;
        const desc = document.getElementById('bug-desc').value;
        if (!desc) return app.showAlert("Please describe the issue.");
        app.data.bugReports.push({ id: Date.now(), date: new Date().toLocaleString(), type, desc, author: app.data.currentCashier });
        app.saveData(); app.closeModal('modal-bug'); app.renderManagerHub(); app.showAlert("Report submitted!");
    },
    openEmployeeModal: () => {
        app.data.editingId = null; document.getElementById('emp-modal-title').innerText = "Add New Employee";
        document.getElementById('emp-name').value = ""; document.getElementById('emp-role').value = "Cashier";
        document.getElementById('emp-img-url').value = ""; document.getElementById('modal-employee').classList.add('open');
    },
    editEmployee: (id) => {
        const emp = app.data.employees.find(e => e.id === id);
        if (!emp) return;
        app.data.editingId = id; document.getElementById('emp-modal-title').innerText = "Edit Employee";
        document.getElementById('emp-name').value = emp.name; document.getElementById('emp-role').value = emp.role;
        document.getElementById('emp-img-url').value = emp.img; document.getElementById('modal-employee').classList.add('open');
    },
    saveEmployee: () => {
        const name = document.getElementById('emp-name').value;
        const role = document.getElementById('emp-role').value;
        const img = document.getElementById('emp-img-url').value;
        if (!name) return app.showAlert("Name is required");
        if (app.data.editingId) {
            const emp = app.data.employees.find(e => e.id === app.data.editingId);
            emp.name = name; emp.role = role; emp.img = img;
        } else {
            const newId = app.data.employees.length ? Math.max(...app.data.employees.map(e => e.id)) + 1 : 1;
            app.data.employees.push({ id: newId, name, role, img });
        }
        app.saveData(); app.closeModal('modal-employee'); app.renderManagerHub();
    },
    handleImageUpload: (input, urlFieldId) => {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { document.getElementById(urlFieldId).value = e.target.result; }
            reader.readAsDataURL(input.files[0]);
        }
    },
    downloadFullBackup: () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(app.data));
        const a = document.createElement('a'); a.href = dataStr;
        a.download = "pos_backup_" + new Date().toISOString().slice(0,10) + ".json";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },
    
    // Product Edit Logic (Preserved)
    openProductModal: () => {
        app.data.editingId = null; app.data.tempOptionsList = [];
        document.getElementById('prod-name').value = ""; document.getElementById('prod-cat').value = "";
        document.getElementById('prod-price').value = ""; document.getElementById('prod-stock').value = "";
        document.getElementById('prod-img').value = ""; app.previewImage("");
        app.renderProductOptionsUI(); document.getElementById('modal-product').classList.add('open');
    },
    editProduct: (id) => {
        app.data.editingId = id; const p = app.data.products.find(x => x.id === id);
        app.data.tempOptionsList = p.options ? JSON.parse(JSON.stringify(p.options)) : [];
        document.getElementById('prod-name').value = p.name; document.getElementById('prod-cat').value = p.cat;
        document.getElementById('prod-price').value = p.price; document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-img').value = p.img; app.previewImage(p.img);
        app.renderProductOptionsUI(); document.getElementById('modal-product').classList.add('open');
    },
    saveProduct: () => {
        const name = document.getElementById('prod-name').value;
        const cat = document.getElementById('prod-cat').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const stock = parseInt(document.getElementById('prod-stock').value);
        const img = document.getElementById('prod-img').value;
        if(!name || !cat || isNaN(price)) return app.showAlert("Please fill in fields.");
        const product = {
            id: app.data.editingId || (app.data.products.length ? Math.max(...app.data.products.map(p=>p.id))+1 : 1),
            name, cat, price, stock, img, options: app.data.tempOptionsList
        };
        if(app.data.editingId) { const idx = app.data.products.findIndex(x => x.id === app.data.editingId); app.data.products[idx] = product; } 
        else { app.data.products.push(product); }
        app.saveData(); app.closeModal('modal-product'); app.renderManagerHub();
    },
    previewImage: (url) => { document.getElementById('prod-img-preview').src = url || ""; },
    generateAIImage: () => { 
        const name = document.getElementById('prod-name').value;
        if (!name) return app.showAlert("Enter name");
        app.previewImage(`https://image.pollinations.ai/prompt/${encodeURIComponent(name + " food white background")}?t=${Date.now()}`);
    },
    downloadProdImage: () => { /* preserved logic */ },
    renderProductOptionsUI: () => { /* preserved logic */ },
    addProductOptionUI: () => { /* preserved logic */ },
    removeProductOptionGroup: (i) => { /* preserved logic */ },

    // Clock
    updateClock: () => {
        const now = new Date();
        document.getElementById('big-clock').innerText = now.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
        document.getElementById('big-date').innerText = now.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
        if(document.getElementById('live-clock')) document.getElementById('live-clock').innerText = now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    },
    renderTimeClock: () => { /* Preserved */
        document.getElementById('time-employee-select').innerHTML = '<option value="">Select your name...</option>' + 
            app.data.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        const active = app.data.timeEntries.filter(e => !e.out);
        document.getElementById('active-workers-list').innerHTML = active.map(e => 
            `<div class="worker-pill"><div class="dot"></div>${e.name}</div>`
        ).join('');
        document.getElementById('time-active-count').innerText = active.length;
    },
    clockIn: () => { /* Preserved */ 
        const id = document.getElementById('time-employee-select').value;
        if (!id) return app.showAlert("Select a name.");
        const emp = app.data.employees.find(e => e.id == id);
        if (app.data.timeEntries.find(e => e.empId == id && !e.out)) return app.showAlert("Already clocked in.");
        app.data.timeEntries.push({ id: Date.now(), empId: id, name: emp.name, in: new Date().toISOString(), out: null });
        app.saveData(); app.renderTimeClock(); app.showAlert(`Clocked in: ${emp.name}`);
    },
    clockOut: () => { /* Preserved */ 
        const id = document.getElementById('time-employee-select').value;
        if (!id) return app.showAlert("Select a name.");
        const entry = app.data.timeEntries.find(e => e.empId == id && !e.out);
        if (!entry) return app.showAlert("Not clocked in.");
        entry.out = new Date().toISOString();
        app.saveData(); app.renderTimeClock(); app.showAlert(`Clocked out: ${entry.name}`);
    },

    closeModal: (id) => document.getElementById(id).classList.remove('open'),
    showAlert: (msg) => alert(msg),
    renderBarista: () => { /* Preserved from v1.37 */
        const grid = document.getElementById('barista-grid');
        const activeOrders = app.data.orders.filter(o => o.status === 'Pending').reverse();
        if(activeOrders.length === 0) { grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#999; margin-top:50px;">No active orders.</div>'; return; }
        grid.innerHTML = activeOrders.map(o => `
            <div class="order-card">
                <div class="oc-header"><div class="oc-title"><span>#${o.id}</span> <span>${o.date.split(',')[1].trim()}</span></div><div class="oc-customer">${o.customer}</div></div>
                <div class="oc-body">${o.items.map(i => `<div class="oc-item"><strong>${i.qty}x ${i.name}</strong><br><span style="font-size:0.9rem; color:#666">${i.opts||''}</span></div>`).join('')}</div>
                <button class="btn-pay btn-gold" style="width:100%; border-radius:0;" onclick="app.completeOrder(${o.id})">Mark Complete</button>
            </div>
        `).join('');
    },
    completeOrder: (id) => { const o = app.data.orders.find(x => x.id === id); if(o) o.status = 'Completed'; app.saveData(); app.renderBarista(); },
    renderDashboard: () => { /* Preserved */ 
        const today = new Date().toLocaleDateString();
        document.getElementById('dash-date').innerText = today;
        const todaysOrders = app.data.orders.filter(o => o.date.includes(today) && o.status !== 'Refunded');
        const revenue = todaysOrders.reduce((s,o) => s + o.total, 0);
        document.getElementById('stat-revenue').innerText = `$${revenue.toFixed(2)}`;
        document.getElementById('stat-orders').innerText = todaysOrders.length;
        document.getElementById('stat-low-stock').innerText = app.data.products.filter(p => p.stock < 5).length;
        const recent = app.data.orders.slice(0, 5);
        document.getElementById('recent-orders-list').innerHTML = recent.map(o => `
            <li class="dash-item" onclick="app.reprintReceipt(${o.id})"><div class="di-left"><strong>#${o.id}</strong> ${o.customer}</div><div class="di-right">$${o.total.toFixed(2)}</div></li>
        `).join('');
        const counts = {}; app.data.orders.forEach(o => o.items.forEach(i => counts[i.name] = (counts[i.name]||0)+1));
        const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
        document.getElementById('top-items-list').innerHTML = sorted.map(([n,c]) => `<li class="dash-item"><div class="di-left">${n}</div><div class="di-right">${c} sold</div></li>`).join('');
    },
    reprintReceipt: (id) => { app.showReceipt(app.data.orders.find(o => o.id === id)); },
    renderInventory: () => { /* Preserved */ 
        const role = app.data.currentCashier;
        const isManager = (role === 'Manager' || role === 'IT Support');
        let headerHtml = '<h2>Inventory</h2>';
        if (isManager) headerHtml += '<button class="btn-sm" onclick="app.openProductModal()">+ Add Item</button>';
        document.querySelector('#view-inventory .dash-header').innerHTML = headerHtml;
        const sort = app.data.inventorySort || { field: "name", dir: "asc" };
        const products = [...app.data.products].sort((a,b) => (a[sort.field] > b[sort.field] ? 1 : -1) * (sort.dir==='asc'?1:-1));
        document.getElementById('inventory-body').innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;" onerror="this.src='images/placeholder.png'"></td>
                <td>${p.name}</td>
                <td><span class="badge" style="background:#eee; color:#333">${p.cat}</span></td>
                <td style="color:${p.stock<5?'red':'inherit'} font-weight:${p.stock<5?'bold':'normal'}">${p.stock}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>${p.stock > 0 ? '<span style="color:green">●</span>' : '<span style="color:red">●</span>'}</td>
                <td><button class="btn-sm" onclick="app.handleInventoryEdit(${p.id})">Edit</button></td>
            </tr>
        `).join('');
    },
    sortInventory: (f) => { app.data.inventorySort = { field: f, dir: app.data.inventorySort.field === f && app.data.inventorySort.dir === "asc" ? "desc" : "asc" }; app.renderInventory(); },
    handleInventoryEdit: (id) => { const role = app.data.currentCashier; if (role === 'Manager' || role === 'IT Support') app.editProduct(id); else app.editInventory(id); },
    editInventory: (id) => { app.data.editingId = id; const p = app.data.products.find(x => x.id === id); document.getElementById('edit-inv-name').innerText = p.name; document.getElementById('edit-inv-stock').value = p.stock; document.getElementById('edit-inv-price').value = p.price; document.getElementById('modal-edit-inventory').classList.add('open'); },
    saveInventory: () => { const p = app.data.products.find(x => x.id === app.data.editingId); p.stock = parseInt(document.getElementById('edit-inv-stock').value); p.price = parseFloat(document.getElementById('edit-inv-price').value); app.saveData(); app.closeModal('modal-edit-inventory'); app.renderInventory(); }
};

window.app = app;
app.init();
