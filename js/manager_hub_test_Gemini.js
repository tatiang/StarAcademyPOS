/* FILE: js/manager_hub_test_Gemini.js
   PURPOSE: Logic for the Manager Dashboard (Staff, Menu, Data, Receipts).
*/

window.app.managerHub = {
    
    init: function() {
        this.switchTab('staff'); 
    },

    switchTab: function(tab) {
        // Highlight active tab
        document.querySelectorAll('.mgr-tab').forEach(b => b.classList.remove('active'));
        const btns = document.querySelectorAll('.mgr-tab');
        if(tab === 'staff' && btns[0]) btns[0].classList.add('active');
        if(tab === 'menu' && btns[1]) btns[1].classList.add('active');
        if(tab === 'data' && btns[2]) btns[2].classList.add('active');

        // Render content
        const area = document.getElementById('mgr-content-area');
        if(!area) return;

        if(tab === 'staff') this.renderStaffView(area);
        if(tab === 'menu') this.renderMenuView(area);
        if(tab === 'data') this.renderDataView(area);
    },

    // --- STAFF VIEW ---
    renderStaffView: function(area) {
        const employees = window.app.data.employees || [];
        
        let empRows = employees.map((e, i) => `
            <tr>
                <td>${e.name}</td>
                <td>${e.role}</td>
                <td><button class="btn-sm" style="color:var(--danger)" onclick="window.app.managerHub.deleteEmployee(${i})">Remove</button></td>
            </tr>
        `).join('');

        area.innerHTML = `
            <div class="mgr-split">
                <div class="mgr-box">
                    <div class="box-header"><h3>Employees</h3><button class="btn-sm btn-gold" onclick="window.app.managerHub.addEmployee()">+ Add New</button></div>
                    <table class="staff-table"><thead><tr><th>Name</th><th>Role</th><th>Action</th></tr></thead><tbody>${empRows}</tbody></table>
                </div>
            </div>
        `;
    },

    addEmployee: function() {
        const name = prompt("Employee Name:");
        if(name) {
            const role = prompt("Role (Manager, Barista, etc):", "Barista");
            window.app.data.employees.push({ name, role, status: 'out' });
            window.app.database.saveLocal();
            this.switchTab('staff');
        }
    },

    deleteEmployee: function(index) {
        if(confirm("Remove this employee?")) {
            window.app.data.employees.splice(index, 1);
            window.app.database.saveLocal();
            this.switchTab('staff');
        }
    },

    // --- MENU VIEW ---
    renderMenuView: function(area) {
        const products = window.app.data.products || [];
        
        let prodRows = products.map((p, i) => `
            <tr>
                <td><img src="${p.img}" width="30" onerror="this.src='https://placehold.co/30'"></td>
                <td>${p.name}</td>
                <td>${window.app.helpers.formatCurrency(p.price)}</td>
                <td>${p.cat}</td>
                <td><button class="btn-sm" style="color:var(--danger)" onclick="window.app.managerHub.deleteProduct(${i})">X</button></td>
            </tr>
        `).join('');

        area.innerHTML = `
            <div class="mgr-split">
                <div class="mgr-box" style="flex:2">
                    <div class="box-header"><h3>Products</h3><button class="btn-sm btn-gold" onclick="window.app.managerHub.addProduct()">+ Add Product</button></div>
                    <table class="staff-table"><thead><tr><th>Img</th><th>Name</th><th>Price</th><th>Cat</th><th>Action</th></tr></thead><tbody>${prodRows}</tbody></table>
                </div>
            </div>
        `;
    },

    addProduct: function() {
        const name = prompt("Product Name:");
        if(!name) return;
        const price = parseFloat(prompt("Price:", "0.00"));
        const cat = prompt("Category:", "Hot Drinks");
        
        window.app.data.products.push({
            id: Date.now(),
            name: name,
            price: price,
            cat: cat,
            img: `https://loremflickr.com/300/300/${name.split(' ')[0]}`, // Simple auto-image
            opts: []
        });
        window.app.database.saveLocal();
        this.switchTab('menu');
    },

    deleteProduct: function(index) {
        if(confirm("Delete Product?")) {
            window.app.data.products.splice(index, 1);
            window.app.database.saveLocal();
            this.switchTab('menu');
        }
    },

    // --- DATA & REPORTS VIEW ---
    renderDataView: function(area) {
        area.innerHTML = `
            <div class="mgr-grid">
                <div class="mgr-card">
                    <h3>Data Management</h3>
                    <p>Sync your local data with the cloud.</p>
                    <button class="btn-pay btn-train" style="width:100%" onclick="window.app.database.sync()">Force Cloud Sync</button>
                    <p style="margin-top:10px; font-size:0.8rem; color:#666;">App Version: ${window.app.version}</p>
                </div>
                
                <div class="mgr-card">
                    <h3>Reports & History</h3>
                    <p>View past transactions and logs.</p>
                    <button class="btn-pay btn-gold" style="width:100%" onclick="window.app.managerHub.viewReceipts()">View Order History</button>
                </div>
            </div>
        `;
    },

    // --- RECEIPT VIEWER ---
    viewReceipts: function() {
        const modal = document.getElementById('modal-receipts');
        const list = document.getElementById('receipt-list');
        
        if (!window.app.data.orders || window.app.data.orders.length === 0) {
            list.innerHTML = "<p style='text-align:center; padding:20px; color:#666;'>No orders found.</p>";
        } else {
            // Sort orders newest first
            const sortedOrders = [...window.app.data.orders].reverse();
            
            list.innerHTML = sortedOrders.map(o => {
                const date = new Date(o.date).toLocaleString();
                const total = window.app.helpers.formatCurrency(o.total);
                
                return `
                    <div style="border-bottom:1px solid #eee; padding:15px 0;">
                        <div style="display:flex; justify-content:space-between; font-weight:bold;">
                            <span>Order #${o.id}</span>
                            <span>${total}</span>
                        </div>
                        <div style="color:#666; font-size:0.85rem; margin-bottom:5px;">${date} • ${o.method}</div>
                        <div style="font-size:0.9rem;">
                            ${o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                        </div>
                        <button class="btn-sm" style="margin-top:5px; width:100%; background:#f0f0f0;" onclick="window.app.managerHub.printReceipt(${o.id})">
                            <i class="fa-solid fa-print"></i> Reprint Receipt
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        window.app.helpers.openModal('modal-receipts');
    },

    printReceipt: function(orderId) {
        const order = window.app.data.orders.find(o => o.id === orderId);
        if(!order) return;

        const date = new Date(order.date).toLocaleString();
        const total = window.app.helpers.formatCurrency(order.total);

        // Simple print simulation
        alert(`
        -------------------------
        STAR ACADEMY RECEIPT
        -------------------------
        Order: #${order.id}
        Date:  ${date}
        
        ITEMS:
        ${order.items.map(i => `${i.qty}x ${i.name} ... ${window.app.helpers.formatCurrency(i.price * i.qty)}`).join('\n')}
        
        -------------------------
        TOTAL: ${total}
        PAID:  ${order.method}
        -------------------------
        `);
    }
};
