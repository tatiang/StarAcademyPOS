/* FILE: js/barista_view_test_Gemini.js
   PURPOSE: Shows pending orders for the kitchen/barista.
*/

window.app.barista = {
    init: function() {
        this.render();
        // Auto-refresh every 5 seconds
        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.render(), 5000);
    },

    render: function() {
        const grid = document.getElementById('barista-grid');
        if(!grid) return;
        
        const orders = window.app.data.orders || [];
        const pending = orders.filter(o => o.status === 'Pending');

        if(pending.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color:#999; width:100%;">No pending orders</p>';
            return;
        }

        grid.innerHTML = pending.map(o => `
            <div class="mgr-card" style="text-align:left; border-left:5px solid var(--golden-bronze);">
                <h3>Order #${o.id}</h3>
                <p><strong>${o.customer}</strong></p>
                <ul style="padding-left:20px; margin:10px 0;">
                    ${o.items.map(i => `<li>${i.qty}x ${i.name}</li>`).join('')}
                </ul>
                <button class="btn-sm" style="width:100%; background:var(--success); color:white;" onclick="window.app.barista.complete(${o.id})">Mark Ready</button>
            </div>
        `).join('');
    },

    complete: function(id) {
        const order = window.app.data.orders.find(o => o.id === id);
        if(order) {
            order.status = 'Completed';
            window.app.database.saveLocal();
            window.app.database.sync();
            this.render();
        }
    }
};
