/* FILE: js/barista_view_test_Gemini.js
   PURPOSE: Displays active orders for the barista.
*/

window.app.barista = {

    init: function() {
        this.render();
        if(this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.render(), 5000);
    },

    render: function() {
        const container = document.getElementById('barista-grid');
        if(!container) return;

        // 1. Get Orders
        const orders = window.app.data.orders || [];

        // 2. Filter: Show anything NOT 'completed'
        // This catches 'paid', 'pending', or orders with no status yet.
        const activeOrders = orders.filter(o => o.status !== 'completed');

        container.innerHTML = '';

        if(activeOrders.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px; color:#ccc;">
                    <i class="fa-solid fa-check-circle" style="font-size:4rem; margin-bottom:20px;"></i>
                    <h2>All Caught Up!</h2>
                    <p>No active drink orders.</p>
                </div>`;
            return;
        }

        // 3. Sort by Time
        const getOrderDate = (order) => {
            const raw = order.timestamp || order.date || order.time;
            const parsed = raw ? new Date(raw) : null;
            return parsed && !isNaN(parsed.getTime()) ? parsed : null;
        };

        activeOrders.sort((a, b) => {
            const aDate = getOrderDate(a);
            const bDate = getOrderDate(b);
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return aDate - bDate;
        });

        activeOrders.forEach(order => {
            const orderDate = getOrderDate(order);
            const minsAgo = orderDate
                ? Math.max(0, Math.floor((Date.now() - orderDate.getTime()) / 60000))
                : 0;
            
            // Color code
            let borderSide = "5px solid #2ecc71"; // Green
            if(minsAgo > 5) borderSide = "5px solid #f1c40f"; // Yellow
            if(minsAgo > 10) borderSide = "5px solid #e74c3c"; // Red

            const card = document.createElement('div');
            // Ensure card is visible with white background and block display
            card.className = 'barista-card';
            card.style.cssText = `background:white; border-radius:8px; padding:15px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1); border-left:${borderSide}; display:flex; justify-content:space-between; align-items:center; min-height:80px;`;

            let itemsHtml = '<ul style="list-style:none; padding:0; margin:5px 0 0 0;">';
            (order.items || []).forEach(item => {
                const qty = Number(item.qty || item.quantity || 1);
                const label = qty > 1 ? `${qty}x ${item.name}` : item.name;
                itemsHtml += `<li style="font-size:1.1rem; font-weight:600; padding:2px 0;">• ${label}</li>`;
            });
            itemsHtml += '</ul>';

            card.innerHTML = `
                <div>
                    <div style="font-size:0.8rem; color:#888; text-transform:uppercase; letter-spacing:1px;">
                        Order #${order.id} • ${minsAgo} mins ago
                    </div>
                    ${itemsHtml}
                    <div style="margin-top:5px; font-style:italic; color:#666;">
                        ${order.customerName ? order.customerName : 'Guest'}
                    </div>
                </div>
                
                <button onclick="window.app.barista.completeOrder(event, '${order.id}')"
                    style="background:var(--success); color:white; border:none; border-radius:6px; padding:0 25px; font-size:1rem; cursor:pointer; height:60px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-check" style="font-size:1.5rem; margin-bottom:5px;"></i>
                    <span>DONE</span>
                </button>
            `;
            container.appendChild(card);
        });
    },

    completeOrder: function(e, orderId) {
        if(e) { e.stopPropagation(); e.preventDefault(); }
        
        // Find order
        const order = window.app.data.orders.find(o => o.id == orderId);
        
        if(order) {
            order.status = 'completed';
            window.app.database.saveLocal();
            window.app.database.sync();
            this.render();
        }
    }
};
