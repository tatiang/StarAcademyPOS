/* FILE: js/manager_hub_test_Gemini.js
   PURPOSE: Logic for the Manager Dashboard (Staff, Menu, Data, Receipts).
*/

window.app.managerHub = {
    
    // Internal state for the Menu tab
    menuState: {
        view: 'products', // 'products' or 'categories'
        editId: null      // ID of product being edited
    },

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

        area.innerHTML = ''; // Clear current

        if(tab === 'staff') this.renderStaffView(area);
        if(tab === 'menu') this.renderMenuView(area);
        if(tab === 'data') this.renderDataView(area);
    },

    // ============================================================
    // 1. STAFF VIEW
    // ============================================================
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

    // ============================================================
    // 2. MENU VIEW (Redesigned)
    // ============================================================
    renderMenuView: function(area) {
        // Sub-tabs for Products vs Categories
        area.innerHTML = `
            <div style="margin-bottom:15px; display:flex; gap:10px;">
                <button class="btn-sm ${this.menuState.view === 'products' ? 'btn-train' : ''}" onclick="window.app.managerHub.setMenuView('products')">Products</button>
                <button class="btn-sm ${this.menuState.view === 'categories' ? 'btn-train' : ''}" onclick="window.app.managerHub.setMenuView('categories')">Categories</button>
            </div>
            <div id="menu-content"></div>
        `;
        this.renderMenuContent();
    },

    setMenuView: function(view) {
        this.menuState.view = view;
        this.renderMenuContent();
    },

    renderMenuContent: function() {
        const container = document.getElementById('menu-content');
        if(!container) return;

        if (this.menuState.view === 'categories') {
            // CATEGORY LIST
            const cats = window.app.data.categories || [];
            const rows = cats.map((c, i) => `
                <tr>
                    <td>${c}</td>
                    <td style="text-align:right;">
                        <button class="btn-sm" style="color:var(--danger)" onclick="window.app.managerHub.deleteCategory(${i})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            container.innerHTML = `
                <div class="mgr-box">
                    <div class="box-header"><h3>Categories</h3><button class="btn-sm btn-gold" onclick="window.app.managerHub.addCategory()">+ Add Category</button></div>
                    <table class="staff-table"><tbody>${rows}</tbody></table>
                </div>
            `;
        } else {
            // PRODUCT LIST
            const products = window.app.data.products || [];
            const rows = products.map((p) => `
                <tr>
                    <td><img src="${p.img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;" onerror="this.src='https://placehold.co/40'"></td>
                    <td><b>${p.name}</b><br><span style="font-size:0.8rem; color:#666">${p.cat}</span></td>
                    <td>${window.app.helpers.formatCurrency(p.price)}</td>
                    <td style="text-align:right;">
                        <button class="btn-sm" onclick="window.app.managerHub.editProduct(${p.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-sm" style="color:var(--danger)" onclick="window.app.managerHub.deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            container.innerHTML = `
                <div class="mgr-box">
                    <div class="box-header">
                        <h3>Product List</h3>
                        <button class="btn-sm btn-gold" onclick="window.app.managerHub.openProductModal()">+ Add Product</button>
                    </div>
                    <div style="max-height:500px; overflow-y:auto;">
                        <table class="staff-table">
                            <thead><tr><th>Img</th><th>Name</th><th>Price</th><th>Actions</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    },

    // --- Category Logic ---
    addCategory: function() {
        const name = prompt("New Category Name:");
        if(name) {
            window.app.data.categories.push(name);
            window.app.database.saveLocal();
            this.renderMenuContent();
        }
    },

    deleteCategory: function(index) {
        const name = window.app.data.categories[index];
        if(confirm(`Delete category "${name}"? Products in this category will remain but need reassignment.`)) {
            window.app.data.categories.splice(index, 1);
            window.app.database.saveLocal();
            this.renderMenuContent();
        }
    },

    // --- Product Logic ---
    deleteProduct: function(id) {
        if(confirm("Delete this product?")) {
            window.app.data.products = window.app.data.products.filter(p => p.id !== id);
            window.app.database.saveLocal();
            this.renderMenuContent();
        }
    },

    // Opens the Add/Edit Modal
    openProductModal: function(editProduct = null) {
        const isEdit = !!editProduct;
        const p = editProduct || { name: '', price: 0, cat: window.app.data.categories[0], opts: [], img: '' };
        
        // Build the form HTML
        const catOptions = window.app.data.categories.map(c => 
            `<option value="${c}" ${p.cat === c ? 'selected' : ''}>${c}</option>`
        ).join('');

        const html = `
            <div style="display:flex; flex-direction:column; gap:10px;">
                <label>Name: <input type="text" id="prod-name" class="form-control" value="${p.name}"></label>
                <div style="display:flex; gap:10px;">
                    <label style="flex:1">Price: <input type="number" id="prod-price" class="form-control" value="${p.price}" step="0.01"></label>
                    <label style="flex:1">Category: <select id="prod-cat" class="form-control">${catOptions}</select></label>
                </div>
                <label>Options (comma separated): <input type="text" id="prod-opts" class="form-control" value="${p.opts.join(', ')}"></label>
                
                <div style="border-top:1px solid #eee; padding-top:10px; margin-top:5px;">
                    <label style="font-weight:bold; margin-bottom:5px; display:block;">Image Source:</label>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button class="btn-sm btn-train" onclick="document.getElementById('img-uploader').click()">Upload File</button>
                        <button class="btn-sm btn-gold" onclick="window.app.managerHub.autoGenerateImage()">Auto-Match (AI)</button>
                    </div>
                    <input type="file" id="img-uploader" accept="image/*" style="display:none" onchange="window.app.managerHub.handleImageUpload(this)">
                    <input type="text" id="prod-img" class="form-control" placeholder="Image URL (or upload above)" value="${p.img}">
                    <div id="img-preview" style="margin-top:5px; height:100px; background:#f0f0f0; text-align:center; line-height:100px; color:#999; border-radius:4px; overflow:hidden;">
                        ${p.img ? `<img src="${p.img}" style="height:100%; width:auto;">` : 'No Image'}
                    </div>
                </div>
            </div>
        `;

        window.app.helpers.showGenericModal(
            isEdit ? "Edit Product" : "New Product",
            html,
            () => this.saveProduct(isEdit ? p.id : null) // Confirm Action
        );
    },

    editProduct: function(id) {
        const p = window.app.data.products.find(x => x.id === id);
        if(p) this.openProductModal(p);
    },

    saveProduct: function(id) {
        const name = document.getElementById('prod-name').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const cat = document.getElementById('prod-cat').value;
        const img = document.getElementById('prod-img').value;
        const optsStr = document.getElementById('prod-opts').value;
        const opts = optsStr.split(',').map(s => s.trim()).filter(s => s !== '');

        if(!name) return alert("Product name required");

        if(id) {
            // Update existing
            const p = window.app.data.products.find(x => x.id === id);
            p.name = name; p.price = price; p.cat = cat; p.img = img; p.opts = opts;
        } else {
            // Create new
            window.app.data.products.push({
                id: Date.now(),
                name, price, cat, img, opts
            });
        }

        window.app.database.saveLocal();
        this.renderMenuContent();
    },

    // --- Image Handling Helpers ---
    
    // 1. Simulates AI generation by using a keyword search API
    autoGenerateImage: function() {
        const name = document.getElementById('prod-name').value;
        if(!name) return alert("Enter a product name first!");
        
        // Use Unsplash Source for high quality random images based on keyword
        const keyword = name.split(' ')[0]; // Take first word (e.g., "Latte" from "Latte Macchiato")
        const url = `https://loremflickr.com/400/400/${keyword},food/all`; 
        
        document.getElementById('prod-img').value = url;
        document.getElementById('img-preview').innerHTML = `<img src="${url}" style="height:100%; width:auto;">`;
    },

    // 2. Converts uploaded file to Base64 string for local storage
    handleImageUpload: function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Resize logic could go here, but for now we just use the raw base64
                // Warning: Large images can fill LocalStorage quickly.
                document.getElementById('prod-img').value = e.target.result;
                document.getElementById('img-preview').innerHTML = `<img src="${e.target.result}" style="height:100%; width:auto;">`;
            }
            reader.readAsDataURL(input.files[0]);
        }
    },

    // ============================================================
    // 3. DATA & REPORTS VIEW
    // ============================================================
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
