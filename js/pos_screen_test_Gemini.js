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
            
            const imgUrl = p.img || 'https://placehold.co/150';

            card.innerHTML = `
                <img src="${imgUrl}" class="prod-img" onerror="this.src='https://placehold.co/150'">
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
        
        btnCash.className = hasItems ? 'btn-square-large charge-ready-cash' : 'btn-square-large charge-disabled';
        btnCard.className = hasItems ? 'btn-square-large charge-ready-card' : 'btn-square-large charge-disabled';
        
        btnCash.disabled = !hasItems;
        btnCard.disabled = !hasItems;
    },

    // --- PAYMENTS & MODALS ---

    renderCashModal: function() {
        const modal = document.getElementById('modal-cash');
        const content = modal.querySelector('.modal-content');
        
        // This injects the missing HTML!
        content.innerHTML = `
            <h3>Cash Payment</h3>
            <div class="total-display-large" id="cash-total-due">$0.00</div>
            <div id="calc-display">$0.00</div>
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <button class="btn-sm" style="flex:1; background:#e0e0e0; font-weight:bold;" onclick="window.app.posScreen.addCash(5)">+$5</button>
                <button class="btn-sm" style="flex:1; background:#e0e0e0; font-weight:bold;" onclick="window.app.posScreen.addCash(10)">+$10</button>
                <button class="btn-sm" style="flex:1; background:#e0e0e0; font-weight:bold;" onclick="window.app.posScreen.addCash(20)">+$20</button>
            </div>
            <div class="calc-grid">
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('1')">1</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('2')">2</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('3')">3</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('4')">4</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('5')">5</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('6')">6</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('7')">7</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('8')">8</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('9')">9</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('.')">.</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashInput('0')">0</button>
                <button class="calc-btn" onclick="window.app.posScreen.cashClear()" style="background:#e74c3c; color:white;">C</button>
            </div>
            <div id="change-display-box" class="change-display-box">Change: $0.00</div>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn-pay btn-train" style="flex:1" onclick="window.app.helpers.closeModal('modal-cash')">Cancel</button>
                <button class="btn-pay btn-success" style="flex:1; background:var(--success);" onclick="window.app.posScreen.finalizeCash()">Finalize</button>
            </div>
        `;
    },

    renderCardModal: function() {
        const modal = document.getElementById('modal-card');
        const content = modal.querySelector('.modal-content');
        
        content.innerHTML = `
            <div style="text-align:center; margin-bottom:15px;">
                <h3 style="margin-top:5px;">Card Terminal</h3>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <button class="btn-sm" style="flex:1" onclick="document.getElementById('card-mode-swipe').style.display='block'; document.getElementById('card-mode-manual').style.display='none';">Swipe</button>
                <button class="btn-sm" style="flex:1" onclick="document.getElementById('card-mode-swipe').style.display='none'; document.getElementById('card-mode-manual').style.display='block';">Manual Entry</button>
            </div>
            <div id="card-mode-swipe">
                <div class="swipe-track" onclick="window.app.posScreen.simulateSwipe()"><div id="swipe-anim" class="swipe-anim">SLIDE CARD HERE &rarr;</div></div>
                <p style="text-align:center; color:#888; font-size:0.8rem;">Click track to simulate swipe</p>
            </div>
            <div id="card-mode-manual" style="display:none;">
                <input type="tel" id="cc-num" class="form-control" placeholder="Card Number (0000 0000 0000 0000)">
                <div style="display:flex; gap:10px;">
                    <input type="text" id="cc-exp" class="form-control" placeholder="MM/YY">
                    <input type="tel" id="cc-cvv" class="form-control" placeholder="CVV">
                </div>
            </div>
            <div id="card-msg" style="text-align:center; color:var(--success); font-weight:bold; height:20px; margin:10px 0;"></div>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn-pay btn-train" style="flex:1" onclick="window.app.helpers.closeModal('modal-card')">Cancel</button>
                <button id="btn-process-card" class="btn-pay btn-card" style="flex:1; opacity:0.5; pointer-events:none;" onclick="window.app.posScreen.finalizeCard()">Process</button>
            </div>
        `;
    },

    validateAndPay: function(method) {
        if(!window.app.data.cart || window.app.data.cart.length === 0) return;
        const total = document.getElementById('pos-total').textContent;

        if(method === 'Cash') {
            this.renderCashModal(); // <--- Fix: Render HTML first
            this.cashTendered = "";
            document.getElementById('cash-total-due').textContent = total; 
            this.updateCashUI();
            window.app.helpers.openModal('modal-cash');
        } else {
            this.renderCardModal(); // <--- Fix: Render HTML first
            this.cardVerified = false;
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
            status: 'Pending'
        };

        window.app.data.orders.push(order);
        window.app.data.cart = []; 
        
        this.renderCart();
        window.app.database.saveLocal();
        window.app.database.sync(); 
        
        alert("Order Placed Successfully!");
    }
};
