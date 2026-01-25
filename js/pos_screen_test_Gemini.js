/* FILE: js/pos_screen_test_Gemini.js
   PURPOSE: Logic for the Point of Sale, Cart, and Payment Modals.
*/

window.app.posScreen = {
    // Internal State for Payments
    cashTendered: "",
    cardVerified: false,

    // --- INITIALIZATION ---
    init: function() {
        if (!window.app.data.cart) window.app.data.cart = [];
        this.renderCategories();
        this.renderGrid('All');
        this.renderCart();
    },

    // --- GRID & CART ---
    renderCategories: function() {
        const container = document.getElementById('pos-categories');
        if(!container) return;
        const cats = window.app.data.categories || window.app.defaults.categories;
        let html = `<button class="btn-sm" onclick="window.app.posScreen.renderGrid('All')">All</button>`;
        cats.forEach(cat => {
            html += `<button class="btn-sm" onclick="window.app.posScreen.renderGrid('${cat}')">${cat}</button>`;
        });
        container.innerHTML = html;
    },

    renderGrid: function(category) {
        const grid = document.getElementById('pos-grid');
        if(!grid) return;
        grid.innerHTML = '';
        const allProducts = window.app.data.products || [];
        const products = category === 'All' ? allProducts : allProducts.filter(p => p.cat === category);

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.onclick = () => this.addToCart(p);
            card.innerHTML = `
                <img src="${p.img || 'https://placehold.co/150'}" class="prod-img">
                <div class="prod-info"><h4>${p.name}</h4><div>${window.app.helpers.formatCurrency(p.price)}</div></div>
            `;
            grid.appendChild(card);
        });
    },

    addToCart: function(product) {
        if (!window.app.data.cart) window.app.data.cart = [];
        const item = { id: product.id, name: product.name, price: product.price, qty: 1, opts: [] };
        const existing = window.app.data.cart.find(i => i.id === item.id);
        if(existing) existing.qty++; else window.app.data.cart.push(item);
        this.renderCart();
        window.app.database.saveLocal();
    },

    renderCart: function() {
        const list = document.getElementById('cart-list');
        if(!list) return;
        list.innerHTML = '';
        if (!window.app.data.cart) window.app.data.cart = [];

        let subtotal = 0;
        window.app.data.cart.forEach((item, index) => {
            subtotal += item.price * item.qty;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div style="flex:1"><strong>${item.name}</strong></div>
                <div class="cart-qty-controls">
                    <button class="cart-qty-btn" onclick="window.app.posScreen.adjustQty(${index}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="cart-qty-btn" onclick="window.app.posScreen.adjustQty(${index}, 1)">+</button>
                </div>
                <div style="margin-left:10px; font-weight:bold;">${window.app.helpers.formatCurrency(item.price * item.qty)}</div>
            `;
            list.appendChild(div);
        });

        const tax = subtotal * window.app.taxRate;
        const total = subtotal + tax;

        document.getElementById('pos-subtotal').textContent = window.app.helpers.formatCurrency(subtotal);
        document.getElementById('pos-tax').textContent = window.app.helpers.formatCurrency(tax);
        document.getElementById('pos-total').textContent = window.app.helpers.formatCurrency(total);
        this.updateActionButtons(window.app.data.cart.length > 0);
    },

    adjustQty: function(index, delta) {
        if (!window.app.data.cart) return;
        const item = window.app.data.cart[index];
        item.qty += delta;
        if(item.qty <= 0) window.app.data.cart.splice(index, 1);
        this.renderCart();
        window.app.database.saveLocal();
    },

    updateActionButtons: function(hasItems) {
        const btnCash = document.getElementById('btn-action-cash');
        const btnCard = document.getElementById('btn-action-card');
        if (!btnCash || !btnCard) return;
        
        const cssClass = hasItems ? 'btn-square-large charge-ready' : 'btn-square-large charge-disabled';
        btnCash.className = hasItems ? 'btn-square-large charge-ready-cash' : 'btn-square-large charge-disabled';
        btnCard.className = hasItems ? 'btn-square-large charge-ready-card' : 'btn-square-large charge-disabled';
        
        btnCash.disabled = !hasItems;
        btnCard.disabled = !hasItems;
    },

    // --- PAYMENTS ---
    validateAndPay: function(method) {
        if(!window.app.data.cart || window.app.data.cart.length === 0) return;
        const total = document.getElementById('pos-total').textContent;

        if(method === 'Cash') {
            this.cashTendered = "";
            document.getElementById('cash-total-due').textContent = total;
            this.updateCashUI();
            window.app.helpers.openModal('modal-cash');
        } else {
            this.cardVerified = false;
            document.getElementById('card-msg').textContent = "";
            document.getElementById('btn-process-card').style.opacity = "0.5";
            window.app.helpers.openModal('modal-card');
        }
    },

    // Cash Logic
    cashInput: function(val) {
        if(val === '.' && this.cashTendered.includes('.')) return;
        this.cashTendered += val;
        this.updateCashUI();
    },
    cashClear: function() { this.cashTendered = ""; this.updateCashUI(); },
    addCash: function(amount) {
        let curr = parseFloat(this.cashTendered) || 0;
        this.cashTendered = (curr + amount).toString();
        this.updateCashUI();
    },
    updateCashUI: function() {
        const disp = document.getElementById('calc-display');
        const changeBox = document.getElementById('change-display-box');
        const val = parseFloat(this.cashTendered) || 0;
        const total = parseFloat(document.getElementById('pos-total').textContent.replace('$',''));
        
        if(disp) disp.textContent = `$${val.toFixed(2)}`;
        
        if(changeBox) {
            if(val >= total) {
                changeBox.textContent = `Change Due: $${(val - total).toFixed(2)}`;
                changeBox.style.color = "var(--success)";
                changeBox.style.borderColor = "var(--success)";
            } else {
                changeBox.textContent = `Change Due: $0.00`;
                changeBox.style.color = "#333";
                changeBox.style.borderColor = "#ddd";
            }
        }
    },
    finalizeCash: function() {
        const val = parseFloat(this.cashTendered) || 0;
        const total = parseFloat(document.getElementById('pos-total').textContent.replace('$',''));
        if(val < total) return alert("Insufficient Cash");
        window.app.helpers.closeModal('modal-cash');
        this.completeOrder('Cash');
    },

    // Card Logic
    simulateSwipe: function() {
        const track = document.querySelector('.swipe-track');
        if(track) track.classList.add('swiped');
        setTimeout(() => {
            if(track) track.classList.remove('swiped');
            this.cardVerified = true;
            document.getElementById('card-msg').textContent = "Card Verified!";
            document.getElementById('btn-process-card').style.opacity = "1";
            document.getElementById('btn-process-card').style.pointerEvents = "auto";
        }, 1000);
    },
    finalizeCard: function() {
        if(!this.cardVerified) return;
        window.app.helpers.closeModal('modal-card');
        this.completeOrder('Card');
    },

    completeOrder: function(method) {
        if(!window.app.data.orderCounter) window.app.data.orderCounter = 1001;
        if(!window.app.data.orders) window.app.data.orders = [];

        const order = {
            id: window.app.data.orderCounter++,
            date: new Date().toISOString(),
            method: method,
            items: [...window.app.data.cart],
            total: parseFloat(document.getElementById('pos-total').textContent.replace('$','')),
            status: 'Pending' // Important for Barista View
        };

        window.app.data.orders.push(order);
        window.app.data.cart = []; 
        
        this.renderCart();
        window.app.database.saveLocal();
        window.app.database.sync(); 
        
        alert("Order Placed Successfully!");
    }
};

// --- GLOBAL BRIDGE (Allows HTML onclick="..." to work) ---
window.app.cashInput = (n) => window.app.posScreen.cashInput(n);
window.app.cashClear = () => window.app.posScreen.cashClear();
window.app.addCash = (n) => window.app.posScreen.addCash(n);
window.app.finalizeCash = () => window.app.posScreen.finalizeCash();
window.app.simulateSwipe = () => window.app.posScreen.simulateSwipe();
window.app.finalizeCard = () => window.app.posScreen.finalizeCard();
