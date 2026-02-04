/* FILE: js/manager_hub_test_Gemini.js
   PURPOSE: The Admin Interface.
   MERGED FEATURES: AI Images, Category Mgmt, Financial Analytics, Staff Mgmt.
*/

window.app.managerHub = {
    
    // Internal state
    state: {
        tab: 'dashboard',    // 'dashboard', 'menu', 'staff', 'data'
        menuView: 'products' // 'products' or 'categories'
    },
    getLastUpdatedLabel: function() {
        const raw = window.app?.lastModified || document.lastModified;
        const date = raw ? new Date(raw) : null;
        if (!date || isNaN(date.getTime())) return "Last Updated: Unknown";
        return `Last Updated: ${date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        })}`;
    },

    init: function() {
        this.render();
    },

    // Main Layout Renderer
    render: function() {
        const area = document.getElementById('view-manager');
        if(!area) return;

        // 1. Navigation Header
        area.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="color:var(--space-indigo); margin:0;">
                    <i class="fa-solid fa-briefcase"></i> Manager Hub
                </h2>
                <div style="color:#777; font-size:0.85rem;">${this.getLastUpdatedLabel()}</div>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                <div style="display:flex; gap:10px;">
                    <button class="btn-sm ${this.state.tab === 'dashboard' ? 'btn-active' : ''}" onclick="window.app.managerHub.switchTab('dashboard')">Dashboard</button>
                    <button class="btn-sm ${this.state.tab === 'menu' ? 'btn-active' : ''}" onclick="window.app.managerHub.switchTab('menu')">Menu</button>
                    <button class="btn-sm ${this.state.tab === 'staff' ? 'btn-active' : ''}" onclick="window.app.managerHub.switchTab('staff')">Staff</button>
                    <button class="btn-sm ${this.state.tab === 'data' ? 'btn-active' : ''}" onclick="window.app.managerHub.switchTab('data')">History</button>
                </div>
            </div>
            <div id="mgr-content-area"></div>
        `;

        // 2. Load Content
        this.loadTabContent();
    },

    switchTab: function(tabName) {
        this.state.tab = tabName;
        this.render(); // Re-render to update active button state
    },

    loadTabContent: function() {
        const area = document.getElementById('mgr-content-area');
        if(!area) return;
        area.innerHTML = '';

        if(this.state.tab === 'dashboard') this.renderDashboard(area);
        if(this.state.tab === 'menu') this.renderMenuView(area);
        if(this.state.tab === 'staff') this.renderStaffView(area);
        if(this.state.tab === 'data') this.renderDataView(area);
    },

    // ============================================================
    // 1. DASHBOARD (Analytics from Gemini)
    // ============================================================
    renderDashboard: function(container) {
        const orders = window.app.data.orders || [];
        
        // Calcs
        const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = orders
            .filter(o => o.date && o.date.startsWith(todayStr))
            .reduce((sum, o) => sum + (o.total || 0), 0);
        
        // Find Top Item
        const itemCounts = {};
        orders.forEach(o => {
            const items = Array.isArray(o.items) ? o.items : [];
            items.forEach(i => itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty);
        });
        const topItem = Object.keys(itemCounts).reduce((a, b) => itemCounts[a] > itemCounts[b] ? a : b, "No Data");

        container.innerHTML = `
            <div class="mgr-grid">
                <div class="mgr-card">
                    <h3>Today's Revenue</h3>
                    <div style="font-size:2.5rem; color:var(--success); font-weight:bold; margin:10px 0;">
                        ${window.app.helpers.formatCurrency(todaySales)}
                    </div>
                </div>
                <div class="mgr-card">
                    <h3>Total Lifetime Sales</h3>
                    <div style="font-size:2.5rem; color:var(--space-indigo); font-weight:bold; margin:10px 0;">
                        ${window.app.helpers.formatCurrency(totalSales)}
                    </div>
                </div>
                <div class="mgr-card">
                    <h3>Bestseller</h3>
                    <div style="font-size:1.8rem; color:#d35400; font-weight:bold; margin:10px 0;">
                        ${topItem}
                    </div>
                </div>
            </div>
        `;
    },

    // ============================================================
    // 2. MENU VIEW (Preserved your AI & Categories)
    // ============================================================
    renderMenuView: function(area) {
        area.innerHTML = `
            <div style="margin-bottom:15px; display:flex; gap:10px;">
                <button class="btn-sm ${this.state.menuView === 'products' ? 'btn-active' : ''}" onclick="window.app.managerHub.setMenuView('products')">Products</button>
                <button class="btn-sm ${this.state.menuView === 'categories' ? 'btn-active' : ''}" onclick="window.app.managerHub.setMenuView('categories')">Categories</button>
            </div>
            <div id="menu-inner-content"></div>
        `;
        this.renderMenuInner();
    },

    setMenuView: function(view) {
        this.state.menuView = view;
        this.renderMenuView(document.getElementById('mgr-content-area'));
    },

    renderMenuInner: function() {
        const container = document.getElementById('menu-inner-content');
        if(!container) return;

        if (this.state.menuView === 'categories') {
            const cats = window.app.data.categories || [];
            container.innerHTML = `
                <div class="mgr-card" style="text-align:left;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <h3>Categories</h3>
                        <button class="btn-sm btn-success" onclick="window.app.managerHub.addCategory()">+ Add Category</button>
                    </div>
                    <table style="width:100%;">
                        ${cats.map((c, i) => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:10px;">${c}</td>
                                <td style="text-align:right;"><button class="btn-sm" style="color:var(--danger)" onclick="window.app.managerHub.deleteCategory(${i})"><i class="fa-solid fa-trash"></i></button></td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `;
        } else {
            const products = window.app.data.products || [];
            container.innerHTML = `
                <div class="mgr-card" style="text-align:left;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <h3>Products</h3>
                        <button class="btn-sm btn-success" onclick="window.app.managerHub.openProductModal()">+ Add Product</button>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:15px;">
                        ${products.map(p => `
                            <div style="border:1px solid #eee; padding:10px; border-radius:8px; display:flex; gap:10px; align-items:center;">
                                <img src="${p.img}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" onerror="this.src='https://placehold.co/50'">
                                <div style="flex:1;">
                                    <b>${p.name}</b><br><span style="font-size:0.8rem; color:#666">${p.cat}</span>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-weight:bold;">${window.app.helpers.formatCurrency(p.price)}</div>
                                    <div style="margin-top:5px;">
                                        <button class="btn-sm" onclick="window.app.managerHub.editProduct(${p.id})"><i class="fa-solid fa-pen"></i></button>
                                        <button class="btn-sm" style="color:var(--danger)" onclick="window.app.managerHub.deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    },

    // --- Menu Actions ---
    addCategory: function() {
        const name = prompt("New Category Name:");
        if(name) {
            window.app.data.categories.push(name);
            this.saveAndRefresh();
        }
    },
    deleteCategory: function(index) {
        if(confirm(`Delete category? Products in this category will need updating.`)) {
            window.app.data.categories.splice(index, 1);
            this.saveAndRefresh();
        }
    },
    deleteProduct: function(id) {
        if(confirm("Delete this product?")) {
            window.app.data.products = window.app.data.products.filter(p => p.id !== id);
            this.saveAndRefresh();
        }
    },

    // --- Product Modal & AI Image ---
    openProductModal: function(editProduct = null) {
        const isEdit = !!editProduct;
        const p = editProduct || { name: '', price: 0, cat: window.app.data.categories[0], opts: [], img: '' };
        
        const catOptions = window.app.data.categories.map(c => 
            `<option value="${c}" ${p.cat === c ? 'selected' : ''}>${c}</option>`
        ).join('');

        const html = `
            <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
                <label>Name: <input type="text" id="prod-name" value="${p.name}" style="padding:8px; width:100%;"></label>
                <div style="display:flex; gap:10px;">
                    <label style="flex:1">Price: <input type="number" id="prod-price" value="${p.price}" step="0.25" style="padding:8px; width:100%;"></label>
                    <label style="flex:1">Category: <select id="prod-cat" style="padding:8px; width:100%;">${catOptions}</select></label>
                </div>
                <label>Options (comma separated): <input type="text" id="prod-opts" value="${p.opts ? p.opts.join(', ') : ''}" style="padding:8px; width:100%;"></label>
                
                <div style="border-top:1px solid #eee; padding-top:10px; margin-top:5px;">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Image Source</label>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button class="btn-sm btn-train" onclick="document.getElementById('img-uploader').click()">Upload File</button>
                        <button class="btn-sm btn-gold" id="btn-auto-gen" onclick="window.app.managerHub.autoGenerateImage()">Auto-Match (AI)</button>
                    </div>
                    <input type="file" id="img-uploader" accept="image/*" style="display:none" onchange="window.app.managerHub.handleImageUpload(this)">
                    <input type="text" id="prod-img" placeholder="Image URL" value="${p.img}" style="padding:8px; width:100%;">
                    <div id="img-preview" style="margin-top:5px; height:150px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        ${p.img ? `<img src="${p.img}" style="height:100%; width:auto;">` : '<span style="color:#999">Preview</span>'}
                    </div>
                </div>
            </div>
        `;

        window.app.helpers.showGenericModal(
            isEdit ? "Edit Product" : "New Product",
            html,
            () => {
                // Save Logic
                const name = document.getElementById('prod-name').value;
                const price = parseFloat(document.getElementById('prod-price').value);
                const cat = document.getElementById('prod-cat').value;
                const img = document.getElementById('prod-img').value;
                const opts = document.getElementById('prod-opts').value.split(',').map(s=>s.trim()).filter(s=>s);

                if(isEdit) {
                    const existing = window.app.data.products.find(x => x.id === p.id);
                    existing.name = name; existing.price = price; existing.cat = cat; existing.img = img; existing.opts = opts;
                } else {
                    window.app.data.products.push({ id: Date.now(), name, price, cat, img, opts });
                }
                this.saveAndRefresh();
            }
        );
        window.app.helpers.openModal('modal-generic');
    },

    editProduct: function(id) {
        const p = window.app.data.products.find(x => x.id === id);
        if(p) this.openProductModal(p);
    },

    // AI IMAGE GEN
    autoGenerateImage: function() {
        const name = document.getElementById('prod-name').value;
        const btn = document.getElementById('btn-auto-gen');
        const preview = document.getElementById('img-preview');
        const input = document.getElementById('prod-img');

        if(!name) return alert("Enter Product Name first!");
        
        btn.innerText = 'Generating...';
        btn.disabled = true;

        const prompt = `${name}, delicious food photography, cafe lighting, high quality, 4k`;
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=400&nologo=true&seed=${Math.floor(Math.random()*9999)}`;
        
        const imgObj = new Image();
        imgObj.onload = function() {
            input.value = url;
            preview.innerHTML = `<img src="${url}" style="height:100%; width:auto;">`;
            btn.innerText = 'Auto-Match (AI)';
            btn.disabled = false;
        };
        imgObj.src = url;
    },

    handleImageUpload: function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('prod-img').value = e.target.result;
                document.getElementById('img-preview').innerHTML = `<img src="${e.target.result}" style="height:100%; width:auto;">`;
            }
            reader.readAsDataURL(input.files[0]);
        }
    },

    // ============================================================
    // 3. STAFF VIEW
    // ============================================================
    renderStaffView: function(container) {
        const staff = window.app.data.employees || [];
        container.innerHTML = `
            <div class="mgr-card" style="text-align:left;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <h3>Staff List</h3>
                    <button class="btn-sm btn-success" onclick="window.app.managerHub.addStaff()">+ Add Student</button>
                </div>
                <table style="width:100%;">
                    <thead><tr style="background:#f8f9fa; text-align:left;"><th style="padding:10px;">Name</th><th style="padding:10px;">Role</th><th style="padding:10px;">Status</th><th style="padding:10px;">Action</th></tr></thead>
                    <tbody>
                        ${staff.map((e, i) => `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:10px; font-weight:bold;">${e.name}</td>
                                <td style="padding:10px;">${e.role || 'Cashier'}</td>
                                <td style="padding:10px;">${e.status === 'in' ? '<span style="color:var(--success)">Clocked In</span>' : '<span style="color:#999">Out</span>'}</td>
                                <td style="padding:10px; display:flex; gap:6px;">
                                    <button class="btn-sm" onclick="window.app.managerHub.editStaff(${i})">Edit</button>
                                    <button class="btn-sm" style="color:var(--danger)" onclick="window.app.managerHub.deleteStaff(${i})">Remove</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    addStaff: function() {
        this.openStaffModal();
    },
    editStaff: function(i) {
        const emp = window.app.data.employees[i];
        if (!emp) return;
        this.openStaffModal(emp, i);
    },
    openStaffModal: function(emp = null, index = null) {
        const roles = window.app.data.roles || window.app.defaults.roles || ["Cashier", "Barista", "Manager", "IT Support"];
        const currentRole = emp?.role || "Cashier";
        const options = roles.map(r =>
            `<option value="${r}" ${r === currentRole ? "selected" : ""}>${r}</option>`
        ).join("");

        const html = `
            <div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
                <label>Name
                    <input id="staff-name" type="text" value="${emp?.name || ""}" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;">
                </label>
                <label>Role
                    <select id="staff-role" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;">
                        ${options}
                    </select>
                </label>
            </div>
        `;

        window.app.helpers.showGenericModal(emp ? "Edit Staff" : "Add Staff", html, () => {
            const nameInput = document.getElementById("staff-name");
            const roleSelect = document.getElementById("staff-role");
            const name = nameInput ? nameInput.value.trim() : "";
            const role = roleSelect ? roleSelect.value : "Cashier";

            if (!name) {
                alert("Please enter a name.");
                return;
            }

            if (index !== null && index !== undefined) {
                window.app.data.employees[index].name = name;
                window.app.data.employees[index].role = role;
            } else {
                window.app.data.employees.push({ name, role, status: 'out' });
            }
            this.saveAndRefresh();
        });
        window.app.helpers.openModal("modal-generic");
    },
    deleteStaff: function(i) {
        if(confirm("Remove student?")) {
            window.app.data.employees.splice(i, 1);
            this.saveAndRefresh();
        }
    },

    // ============================================================
    // 4. HISTORY / DATA VIEW
    // ============================================================
    renderDataView: function(container) {
        container.innerHTML = `
            <div class="mgr-card">
                <h3>Order History</h3>
                <button class="btn-pay btn-gold" style="width:100%; margin-top:10px;" onclick="window.app.managerHub.viewReceipts()">View Receipts</button>
            </div>
        `;
    },

    viewReceipts: function() {
        const orders = (window.app.data.orders || []).slice().reverse();
        const html = orders.length === 0 ? '<p>No orders yet.</p>' : 
            orders.map(o => `
                <div style="border-bottom:1px solid #eee; padding:10px 0; text-align:left;">
                    <div style="font-weight:bold; display:flex; justify-content:space-between;">
                        <span>Order #${o.id}</span>
                        <span>${window.app.helpers.formatCurrency(o.total)}</span>
                    </div>
                    <div style="font-size:0.85rem; color:#666;">${new Date(o.date).toLocaleString()}</div>
                    <div style="font-size:0.9rem; margin-top:5px;">${o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</div>
                    <button class="btn-sm" style="margin-top:5px; background:#f0f0f0;" onclick="window.app.managerHub.printReceipt(${o.id})"><i class="fa-solid fa-print"></i> Reprint</button>
                </div>
            `).join('');

        window.app.helpers.showGenericModal("Order History", `<div style="max-height:400px; overflow-y:auto;">${html}</div>`, null);
        window.app.helpers.openModal('modal-generic');
    },

    printReceipt: function(id) {
        const order = window.app.data.orders.find(o => o.id === id);
        alert(`REPRINT RECEIPT\nOrder #${id}\nTotal: ${window.app.helpers.formatCurrency(order.total)}`);
    },

    // UTILS
    saveAndRefresh: function() {
        window.app.database.saveLocal();
        window.app.database.sync();
        this.loadTabContent(); // Refresh UI
    }
};
