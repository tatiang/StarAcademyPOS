/* FILE: js/dashboard_test_Gemini.js */
window.app.dashboard = {
    init: function() {
        const div = document.getElementById('dashboard-content');
        if(!div) return;
        
        const orders = window.app.data.orders || [];
        const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        div.innerHTML = `
            <div class="mgr-grid">
                <div class="mgr-card">
                    <h3>Total Revenue</h3>
                    <div class="value">${window.app.helpers.formatCurrency(revenue)}</div>
                </div>
                <div class="mgr-card">
                    <h3>Total Orders</h3>
                    <div class="value">${orders.length}</div>
                </div>
            </div>
        `;
    }
};
