/* FILE: js/barista_view_test_Gemini.js
   PURPOSE: Displays incoming orders for the kitchen/barista.
*/

window.app.baristaView = {
    
    init: function() {
        this.render();
    },

    render: function() {
        const container = document.getElementById('barista-grid');
        if(!container) return;

        container.innerHTML = '';

        // 1. Get orders that are NOT completed
        // We assume an order is "Open" if it doesn't have status: 'completed'
        const orders = window.app.data.orders || [];
        const activeOrders = orders.filter(o => o.status !== 'completed');

        if (activeOrders.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px; color:#aaa;">
                    <i class="fa-solid fa-mug-hot" style="font-size:4rem; margin-bottom:20px;"></i>
                    <h2>All Caught Up!</h2>
                    <p>No active orders in queue.</p>
                </div>
            `;
            return;
        }

        // 2. Draw Cards
        activeOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'barista-card';
            // Add some inline style for the card if not in CSS
            card.style.cssText = `
                background: white; 
                border-left: 6px solid var(--space-indigo); 
                padding: 15px; 
                border-radius: 8px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
            `;

            const timeString = new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Generate Item List HTML
            const itemsHtml = order.items.map(item => `
                <div style="font-size:1.1rem; margin-bottom:4px;">
                    <span style="font-weight:bold; color:var(--space-indigo);">${item.qty}x</span> 
                    ${item.name}
                    ${item.opts && item.opts.length > 0 ? `<div style="font-size:0.85rem; color:#666; margin-left:25px; font-style:italic;">+ ${item.opts.join(', ')}</div>` : ''}
                </div>
            `).join('');

            card.innerHTML = `
                <div style="flex:1;">
                    <div style="font-weight:bold; color:#888; font-size:0.9rem; margin-bottom:5px;">
                        ORDER #${order.id} • ${timeString}
                    </div>
                    <div>${itemsHtml}</div>
                    <div style="margin-top:10px; font-weight:bold; color:#d35400;">
                        ${order.customerName ? `Customer: ${order.customerName}` : ''}
                    </div>
                </div>
                
                <div style="margin-left:20px;">
                    <button class="btn-pay" onclick="window.app.baristaView.completeOrder(${order.id})" 
                        style="background:var(--success); font-size:1rem; padding:15px 20px; border-radius:8px;">
                        <i class="fa-solid fa-check"></i><br>DONE
                    </button>
                </div>
            `;

            container.appendChild(card);
        });
    },

    // 3. Mark Order as Completed
    completeOrder: function(orderId) {
        const order = window.app.data.orders.find(o => o.id === orderId);
        if(order) {
            order.status = 'completed';
            window.app.database.saveLocal();
            window.app.database.sync(); // Sync to cloud so other screens update
            this.render(); // Refresh this screen
        }
    }
};
