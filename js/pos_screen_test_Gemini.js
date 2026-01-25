/* FILE: pos_screen_test_Gemini.js
   PURPOSE: Logic for the Point of Sale (Ordering) screen.
*/

window.app.posScreen = {
    
    // 1. Start up the POS screen
    init: function() {
        this.renderCategories();
        this.renderGrid('All'); // Default to showing all items
        this.renderCart();
    },

    // 2. Draw the category buttons (Hot Drinks, Snacks, etc.)
    renderCategories: function() {
        const container = document.getElementById('pos-categories');
        if(!container) return;
        
        let html = `<button class="btn-sm" onclick="window.app.posScreen.renderGrid('All')">All</button>`;
        window.app.data.categories.forEach(cat => {
            html += `<button class="btn-sm" onclick="window.app.posScreen.renderGrid('${cat}')">${cat}</button>`;
        });
        container.innerHTML = html;
    },

    // 3. Draw the grid of product cards
    renderGrid: function(category) {
        const grid = document.getElementById('pos-grid');
        grid.innerHTML = '';
        
        // Filter products: If 'All', show everything. Else, show only matching category.
        const products = category === 'All' 
            ? window.app.data.products 
            : window.app.data.products.filter(p => p.cat === category);

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // What happens when you click a product card? -> Add to Cart
            card.onclick = () => this.addToCart(p);
            
            card.innerHTML = `
                <img src="${p.img}" class="prod-img" onerror="this.src='https://placehold.co/150'">
                <div class="prod-info">
                    <h4>${p.name}</h4>
                    <div>${window.app.helpers.formatCurrency(p.price)}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    // 4. Logic to add an item to the 'cart' array
    addToCart: function(product) {
        const item = {
            id: product.id,
            name: product.name,
            price: product.price,
            qty: 1,
            opts: [] 
        };
        
        // If item exists, just increase quantity
        const existing = window.app.data.cart.find(i => i.id === item.id);
        if(existing) {
            existing.qty++;
        } else {
            window.app.data.cart.push(item);
        }
        
        this.renderCart(); // Re-draw the cart to show new item
        window.app.database.saveLocal(); // Save to browser memory
    },

    // 5. Draw the list of items on the right side
    renderCart: function() {
        const list = document.getElementById('cart-list');
        list.innerHTML = '';
        
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

        // Calculate Totals
        const tax = subtotal * window.app.taxRate;
        const total = subtotal + tax;

        // Update the screen numbers
        document.getElementById('pos-subtotal').textContent = window.app.helpers.formatCurrency(subtotal);
        document.getElementById('pos-tax').textContent = window.app.helpers.formatCurrency(tax);
        document.getElementById('pos-total').textContent = window.app.helpers.formatCurrency(total);

        // Enable/Disable the big Charge buttons based on if cart is empty
        this.updateActionButtons(window.app.data.cart.length > 0);
    },

    // 6. Increase or Decrease item quantity
    adjustQty: function(index, delta) {
        const item = window.app.data.cart[index];
        item.qty += delta;
        if(item.qty <= 0) {
            window.app.data.cart.splice(index, 1); // Remove item if qty is 0
        }
        this.renderCart();
        window.app.database.saveLocal();
    },

    // 7. Make the Charge buttons look active or disabled
    updateActionButtons: function(hasItems) {
        const btnCash = document.getElementById('btn-action-cash');
        const btnCard = document.getElementById('btn-action-card');
        
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

    // 8. Payment logic
    validateAndPay: function(method) {
        if(window.app.data.cart.length === 0) return;
        
        // For simplicity in this step, we just use a confirmation.
        // In a real version, this is where we'd open the Cash/Card modal.
        if(confirm(`Process ${method} payment?`)) {
            this.completeOrder(method);
        }
    },

    completeOrder: function(method) {
        const order = {
            id: window.app.data.orderCounter++,
            date: new Date().toISOString(),
            method: method,
            items: [...window.app.data.cart],
            total: parseFloat(document.getElementById('pos-total').textContent.replace('$',''))
        };

        window.app.data.orders.push(order);
        window.app.data.cart = []; // Empty the cart
        
        this.renderCart();
        window.app.database.saveLocal();
        window.app.database.sync(); // Save to cloud
        
        alert("Order Complete!");
    }
};
