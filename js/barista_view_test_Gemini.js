/* FILE: js/barista_view_test_Gemini.js
   PURPOSE: Displays the Kitchen/Barista Queue and handles order completion.
*/

window.app.barista = {

    init: function() {
        this.render();
        // Auto-refresh every 15 seconds to check for new orders
        if(this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.render(), 15000);
    },

    render: function() {
        const container = document.getElementById('barista-grid');
        if(!container) return;

        // Get orders that are NOT 'completed'
        // We filter for status 'pending' or 'paid' (depending on your flow)
        // For this demo, let's assume valid active orders have no 'status' or are 'pending'
        const orders = window.app.data.orders || [];
        const activeOrders = orders.filter(o => o.status !== 'completed');

        container.innerHTML = '';

        if(activeOrders.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#888;">
                    <i class="fa-solid fa-mug-hot" style="font-size:3rem; margin-bottom:15px; opacity:0.3;"></i>
                    <p>No active orders</p>
                </div>`;
            return;
        }

        // Sort by time (oldest first)
        activeOrders.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        activeOrders.forEach((order, index) => {
            // Calculate time elapsed
            const timeDiff = Math.floor((new Date() - new Date(order.timestamp)) / 60000);
            let timeColor = '#666';
            if(timeDiff > 10) timeColor = '#e67e22'; // Orange if > 10 mins
            if(timeDiff > 20) timeColor = '#e74c3c'; // Red if > 20 mins

            const card = document.createElement('div');
            card.className = 'barista-card';
            // Inline styles for the card to ensure it looks good
            card.style.cssText = "background:white; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.08); display:flex; justify-content:space-between; align-items:center; border-left: 6px solid " + timeColor;

            // Build item list
            let itemsHtml = '<ul style="list-style:none; padding:0; margin:0;">';
            order.items.forEach(item => {
                itemsHtml += `<li style="margin-bottom:4px; font-weight:600; font-size:1.1rem;">
                    <span style="color:#666; font-weight:normal;">1x</span> ${item.name}
                </li>`;
            });
            itemsHtml += '</ul>';

            // Extract just the time string HH:MM
            const timeString = new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            card.innerHTML = `
                <div style="flex-grow:1;">
                    <div style="font-size:0.85rem; color:#888; margin-bottom:8px; font-weight:bold; letter-spacing:1px;">
                        ORDER #${order.id.toString().slice(-4)} • ${timeString} (${timeDiff}m ago)
                    </div>
                    ${itemsHtml}
                    ${order.customerName ? `<div style="margin-top:8px; font-size:0.9rem; color:#888; font-style:italic;"><i class="fa-solid fa-user"></i> ${order.customerName}</div>` : ''}
                </div>

                <div style="margin-left:20px;">
                    <button class="btn-done" onclick="window.app.barista.completeOrder(event, '${order.id}')"
                        style="background:var(--success); color:white; border:none; border-radius:8px; width:90px; height:70px; font-weight:bold; font-size:1rem; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; transition:all 0.1s;">
                        <i class="fa-solid fa-check" style="font-size:1.5rem; pointer-events:none;"></i>
                        <span style="pointer-events:none; font-size:0.8rem;">DONE</span>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // FIX: Added 'e' (event) parameter to handle the click properly
    completeOrder: function(e, orderId) {
        // 1. Stop the click from bubbling up or firing twice
        if(e) {
            e.stopPropagation();
            e.preventDefault();
        }

        // 2. Find the button that was clicked to give visual feedback
        const btn = e.target.closest('button');
        if(btn) {
            btn.style.background = "#ccc";
            btn.style.transform = "scale(0.95)";
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        }

        // 3. Find order in data
        const order = window.app.data.orders.find(o => o.id == orderId); // Use == for loose string/number match
        if(order) {
            order.status = 'completed';
            
            // 4.
