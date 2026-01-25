/* FILE: js/manager_hub_test_Gemini.js
   PURPOSE: Logic for the Manager Dashboard (Staff, Menu, Data).
*/

window.app.managerHub = {
    
    init: function() {
        this.switchTab('staff'); // Default tab
    },

    switchTab: function(tab) {
        // Update Buttons
        document.querySelectorAll('.mgr-tab').forEach(b => b.classList.remove('active'));
        // Find button by onclick text matching... simplified approach:
        const btns = document.querySelectorAll('.mgr-tab');
        if(tab === 'staff' && btns[0]) btns[0].classList.add('active');
        if(tab === 'menu' && btns[1]) btns[1].classList.add('active');
        if(tab === 'data' && btns[2]) btns[2].classList.add('active');

        // Inject Content
        const area = document.getElementById('mgr-content-area');
        if(!area) return;

        if(tab === 'staff') this.renderStaffView(area);
        if(tab === 'menu') this.renderMenuView(area);
        if(tab === 'data') this.renderDataView(area);
    },

    // --- STAFF VIEW ---
    renderStaffView: function(area) {
        const employees = window.app.data.employees || [];
        const roles = window.app.data.roles || [];

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
            this.switchTab('staff'); // Refresh
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
                <td><img src="${p.img}" width="30"></td>
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
        // Simplified for modularity - in real app, use a modal
        const name = prompt("Product Name:");
        if(!name) return;
        const price = parseFloat(prompt("Price:", "0.00"));
        const cat = prompt("Category:", "Hot Drinks");
        
        window.app.data.products.push({
            id: Date.now(),
            name: name,
            price: price,
            cat: cat,
            img: "https://placehold.co/150",
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

    // --- DATA VIEW ---
    renderDataView: function(area) {
        area.innerHTML = `
            <div class="mgr-grid">
                <div class="mgr-card">
                    <h3>System Data</h3>
                    <button class="btn-pay btn-train" onclick="window.app.database.sync()">Force Cloud Sync</button>
                    <p style="margin-top:10px; font-size:0.8rem; color:#666;">Version: ${window.app.version}</p>
                </div>
            </div>
        `;
    }
};
