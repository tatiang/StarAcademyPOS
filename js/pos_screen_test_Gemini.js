/* FILE: js/pos_screen_test_Gemini.js */

window.app.posScreen = {
    
    init: function() {
        this.renderCategories();
        this.renderGrid('All');
        this.renderCart();
    },

    renderCategories: function() {
        const container = document.getElementById('pos-categories');
        if(!container) return;
        
        // Safety check for categories
        const cats = window.app.data.categories || [];
        
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
        const products = category === 'All' 
            ? allProducts 
            : allProducts.filter(p => p.cat === category);

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.onclick = () => this.addToCart(p);
            
            // Image fallback to prevent broken icons
            const imgUrl = p.img || 'https://placehold.co/150';

            card.innerHTML = `
                <img src="${imgUrl}" class="prod-img" onerror="this.src='https://placehold.co/150'">
                <div class="prod-info">
                    <h4>${p.name}</h4>
                    <div>${window.app.helpers.formatCurrency(p.price)}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    addToCart: function(product) {
        // Safety: Ensure cart exists
        if (!window.app.data.cart) window.app.data.cart = [];

        const item = {
            id: product.id,
            name: product.name,
            price: product.price,
            qty: 1,
            opts: [] 
        };
        
        const existing = window.app.data.cart.find(i => i.id === item.id);
        if(existing) {
            existing.qty++;
        } else {
            window.app.data.cart.push(item);
        }
        
        this.renderCart();
        window.app.database.saveLocal();
    },

    renderCart: function() {
        const list = document.getElementById('cart-list');
        if(!list) return;
        list.innerHTML = '';
        
        // --- CRASH FIX: SAFETY CHECK ---
        if (!window.app.data.cart) {
            console.warn("Cart was undefined, resetting.");
            window.app.data.cart = [];
        }

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
                <div style="margin-left:10px; font-weight:bold;">
                    ${window.app.helpers.formatCurrency(item.price * item.qty)}
                </div>
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
        if(item.qty <= 0) {
            window.app.data.cart.splice(index, 1);
        }
        this.renderCart();
        window.app.database.saveLocal();
    },

    updateActionButtons: function(hasItems) {
        const btnCash = document.getElementById('btn-action-cash');
        const btnCard = document.getElementById('btn-action-card');
        
        if (!btnCash || !btnCard) return;

        if (hasItems) {
            btnCash.className = 'btn-square-large charge-ready-cash';
            btnCard.className = 'btn-square-large charge-ready-card';
            btnCash.disabled = false;
            btnCard.disabled = false;
        } else {
            btnCash.className = 'btn-square-large charge-disabled';
            btnCard.className = 'btn-square-large charge-disabled';
            btnCash.disabled = true;
            btnCard.disabled = true;
        }
    },

    validateAndPay: function(method) {
        if(!window.app.data.cart || window.app.data.cart.length === 0) return;
        
        if(confirm(`Process ${method} payment?`)) {
            this.completeOrder(method);
        }
    },

    completeOrder: function(method) {
        // Safety checks for order counter
        if(!window.app.data.orderCounter) window.app.data.orderCounter = 1001;
        if(!window.app.data.orders) window.app.data.orders = [];

        const order = {
            id: window.app.data.orderCounter++,
            date: new Date().toISOString(),
            method: method,
            items: [...window.app.data.cart],
            total: parseFloat(document.getElementById('pos-total').textContent.replace('$',''))
        };

        window.app.data.orders.push(order);
        window.app.data.cart = []; 
        
        this.renderCart();
        window.app.database.saveLocal();
        window.app.database.sync(); 
        
        alert("Order Complete!");
    }
};
