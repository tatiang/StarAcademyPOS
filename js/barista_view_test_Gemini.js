/* FILE: js/barista_view_test_Gemini.js
   PURPOSE: Displays active orders for the barista.
*/

window.app.barista = {

    init: function() {
        this.render();
        // Refresh check every 5 seconds (faster is better for testing)
        if(this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.render(), 5000);
    },

    render: function() {
        const container = document.getElementById('barista-grid');
        if(!container) return;

        // 1. Get Orders
        const orders = window.app.data.orders || [];

        // 2. Filter: Show anything that is NOT completed.
        // This includes 'paid', 'pending', or even undefined status.
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

        // 3. Sort by Time (Oldest first)
        activeOrders.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        activeOrders.forEach(order => {
            // Calculate minutes ago
            const minsAgo = Math.floor((new Date() - new Date(order.timestamp)) / 60000);
            
            // Color code based on wait time
            let borderSide = "5px solid #2ecc71"; // Green (fresh)
            if(minsAgo > 5) borderSide = "5px solid #f1c40f"; // Yellow
            if(minsAgo > 10) borderSide = "5px solid #e74c3c"; // Red

            const card = document.createElement('div');
            card.className = 'barista-card';
            card.style.cssText = `background:white; border-radius:8px; padding:15px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1); border-left:${borderSide}; display:flex; justify-content:space-between; align-items:center;`;

            // List Items
            let itemsHtml = '<ul style="list-style:none; padding:0; margin:5px 0 0 0;">';
            order.items.forEach(item => {
                itemsHtml += `<li style="font-size:1.1rem; font-weight:600; padding:2px 0;">• ${item.name}</li>`;
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
                    style="background:var(--success); color:white; border:none; border-radius:6px; padding:15px 25px; font-size:1.2rem; cursor:pointer; height:100%;">
                    DONE
                </button>
            `;
            container.appendChild(card);
        });
    },

    completeOrder: function(e, orderId) {
        if(e) { e.stopPropagation(); e.preventDefault(); }

        // Find and update
        // We use loose equality (==) in case ID is string vs number
        const order = window.app.data.orders.find(o => o.id == orderId);
        
        if(order) {
            order.status = 'completed';
            window.app.database.saveLocal();
            this.render(); // Re-render immediately
        } else {
            console.error("Could not find order to complete:", orderId);
        }
    }
};
