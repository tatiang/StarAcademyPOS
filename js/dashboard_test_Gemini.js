/* FILE: js/dashboard_test_Gemini.js 
   PURPOSE: The "Command Center" for the Manager. 
   Shows Sales, Student Performance, and Inventory Alerts.
*/

window.app.dashboard = {
    init: function() {
        const div = document.getElementById('dashboard-content');
        if(!div) return;
        
        // 1. GATHER DATA
        const orders = window.app.data.orders || [];
        const products = window.app.data.products || [];
        const employees = window.app.data.employees || [];

        // Calculate Revenue
        const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        // Calculate Top Seller (Simple version: counts items sold)
        let productCounts = {};
        orders.forEach(o => {
            o.items.forEach(i => {
                productCounts[i.name] = (productCounts[i.name] || 0) + i.qty;
            });
        });
        // Sort to find top item
        const sortedProducts = Object.entries(productCounts).sort((a,b) => b[1] - a[1]);
        const topItem = sortedProducts.length > 0 ? `${sortedProducts[0][0]} (${sortedProducts[0][1]} sold)` : "No sales yet";

        // Calculate "Busy Hour" (Time of day with most orders)
        // (Simplified logic for demo)
        const lastOrderTime = orders.length > 0 ? new Date(orders[orders.length-1].date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "N/A";

        // 2. RENDER DASHBOARD
        div.innerHTML = `
            <div style="padding:20px;">
                <h2 style="color:var(--space-indigo); border-bottom:2px solid var(--golden-bronze); padding-bottom:10px;">
                    <i class="fa-solid fa-chart-pie"></i> Daily Snapshot
                </h2>

                <div class="mgr-grid" style="margin-bottom:30px;">
                    <div class="mgr-card" style="border-left:5px solid var(--success);">
                        <h3>Total Revenue</h3>
                        <div class="value">${window.app.helpers.formatCurrency(revenue)}</div>
                        <p style="color:#888; margin-top:5px;">${orders.length} Orders Processed</p>
                    </div>
                    <div class="mgr-card" style="border-left:5px solid var(--barista-purple);">
                        <h3>Top Selling Item</h3>
                        <div class="value" style="font-size:1.5rem;">${topItem}</div>
                        <p style="color:#888; margin-top:5px;">Students are selling this the most!</p>
                    </div>
                    <div class="mgr-card" style="border-left:5px solid var(--stormy-teal);">
                        <h3>Last Activity</h3>
                        <div class="value" style="font-size:1.5rem;">${lastOrderTime}</div>
                        <p style="color:#888; margin-top:5px;">Active Staff: ${employees.filter(e=>e.status==='in').length}</p>
                    </div>
                </div>

                <h3 style="color:#666; margin-bottom:15px;">Manager Quick Actions</h3>
                <div style="display:flex; gap:20px; flex-wrap:wrap;">
                    
                    <div style="flex:1; background:white; padding:20px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <h4 style="margin-top:0;"><i class="fa-solid fa-triangle-exclamation" style="color:var(--golden-bronze)"></i> System Alerts</h4>
                        <ul style="list-style:none; padding:0; color:#555;">
                            ${orders.length === 0 ? '<li>⚠️ No sales recorded today.</li>' : '<li>✅ Sales system active.</li>'}
                            ${window.app.data.employees.length === 0 ? '<li>⚠️ No students registered. Go to "Staff" tab.</li>' : '<li>✅ Student database loaded.</li>'}
                            <li style="margin-top:10px; font-weight:bold; color:var(--space-indigo);">
                                Storage Usage: ${(JSON.stringify(window.app.data).length / 1024).toFixed(2)} KB
                            </li>
                        </ul>
                    </div>

                    <div style="flex:1; background:white; padding:20px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                        <h4 style="margin-top:0;"><i class="fa-solid fa-file-invoice"></i> End of Day</h4>
                        <p>Ready to close shop? This will print the Z-Report.</p>
                        <button class="btn-pay" style="background:var(--space-indigo); width:100%;" onclick="window.app.dashboard.printZReport()">
                            Print Daily Report
                        </button>
                    </div>

                </div>
            </div>
        `;
    },

    // 3. FEATURE: PRINT Z-REPORT
    printZReport: function() {
        const orders = window.app.data.orders || [];
        const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const cash = orders.filter(o => o.method === 'Cash').reduce((sum, o) => sum + o.total, 0);
        const card = orders.filter(o => o.method === 'Card').reduce((sum, o) => sum + o.total, 0);

        const report = `
        --------------------------------
           STAR ACADEMY - END OF DAY
        --------------------------------
        DATE: ${new Date().toLocaleDateString()}
        TIME: ${new Date().toLocaleTimeString()}

        TOTAL ORDERS: ${orders.length}
        TOTAL SALES:  ${window.app.helpers.formatCurrency(revenue)}
        
        PAYMENT SPLIT:
        - CASH: ${window.app.helpers.formatCurrency(cash)}
        - CARD: ${window.app.helpers.formatCurrency(card)}

        --------------------------------
        Manager Signature: _____________
        --------------------------------
        `;

        // In a real app, this sends to a printer. Here we alert.
        alert(report);
    }
};
