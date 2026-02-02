/* FILE: js/inventory_test_Gemini.js
   PURPOSE: Inventory Management.
   Allows students/staff to track stock levels (Milk, Cups, Beans) visually.
*/

window.app.inventory = {

    init: function() {
        // 1. Ensure Inventory Data Exists
        if (!window.app.data.inventory) {
            window.app.data.inventory = [
                { name: "Milk Gallons", qty: 2, max: 5, unit: "jugs" },
                { name: "Coffee Beans", qty: 3, max: 6, unit: "bags" },
                { name: "Paper Cups", qty: 45, max: 100, unit: "cups" },
                { name: "Sugar Packets", qty: 20, max: 50, unit: "packs" },
                { name: "Napkins", qty: 1, max: 5, unit: "packs" }
            ];
        }
        this.render();
    },

    render: function() {
        const area = document.getElementById('view-inventory');
        if (!area) return;

        const items = window.app.data.inventory;

        // Calculate if we need to shop
        const lowItems = items.filter(i => (i.qty / i.max) < 0.3);
        const statusMsg = lowItems.length > 0 
            ? `<span style="color:var(--danger)"><i class="fa-solid fa-circle-exclamation"></i> Low Stock: ${lowItems.map(i=>i.name).join(', ')}</span>` 
            : `<span style="color:var(--success)"><i class="fa-solid fa-check-circle"></i> Stock Levels Good</span>`;

        area.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="color:var(--space-indigo); margin:0;">
                    <i class="fa-solid fa-boxes-stacked"></i> Inventory
                </h2>
                <div style="text-align:right;">
                    <button class="btn-sm btn-gold" onclick="window.app.inventory.addNewItem()">+ New Item</button>
                </div>
            </div>

            <div style="background:white; padding:15px; border-radius:8px; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <strong>Status:</strong> ${statusMsg}
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">
                ${items.map((item, index) => {
                    // Calculate Percentage for Progress Bar
                    let pct = (item.qty / item.max) * 100;
                    if(pct > 100) pct = 100;
                    
                    // Determine Color
                    let color = 'var(--success)';
                    if(pct < 50) color = '#f1c40f'; // Yellow
                    if(pct < 25) color = 'var(--danger)'; // Red

                    return `
                    <div class="mgr-card" style="text-align:left; position:relative;">
                        <button onclick="window.app.inventory.editItem(${index})" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#999; cursor:pointer;">
                            <i class="fa-solid fa-gear"></i>
                        </button>

                        <h3 style="margin-bottom:5px;">${item.name}</h3>
                        <div style="font-size:0.9rem; color:#666; margin-bottom:15px;">Target: ${item.max} ${item.unit}</div>

                        <div style="height:20px; background:#eee; border-radius:10px; overflow:hidden; margin-bottom:15px; border:1px solid #ddd;">
                            <div style="height:100%; width:${pct}%; background:${color}; transition: width 0.3s ease;"></div>
                        </div>

                        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                            <button class="btn-pay" style="width:50px; background:#ddd; color:#333;" onclick="window.app.inventory.adjustStock(${index}, -1)">
                                <i class="fa-solid fa-minus"></i>
                            </button>
                            
                            <div style="font-size:1.5rem; font-weight:bold; width:80px; text-align:center;">
                                ${item.qty}
                            </div>

                            <button class="btn-pay" style="width:50px; background:var(--space-indigo);" onclick="window.app.inventory.adjustStock(${index}, 1)">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    // --- ACTIONS ---

    adjustStock: function(index, amount) {
        const item = window.app.data.inventory[index];
        item.qty += amount;
        
        // Prevent negative stock
        if(item.qty < 0) item.qty = 0;

        window.app.database.saveLocal();
        window.app.database.sync(); // Cloud Sync immediately
        this.render();
    },

    addNewItem: function() {
        const name = prompt("Item Name (e.g., 'Oat Milk'):");
        if(!name) return;
        
        const max = parseInt(prompt("Max/Target Quantity:", "10"));
        const unit = prompt("Unit (e.g., 'cartons'):", "units");

        window.app.data.inventory.push({
            name: name,
            qty: max, // Start full
            max: max,
            unit: unit
        });
        
        window.app.database.saveLocal();
        window.app.database.sync();
        this.render();
    },

    editItem: function(index) {
        const item = window.app.data.inventory[index];
        const newMax = prompt(`Update Target Quantity for ${item.name}:`, item.max);
        
        if(newMax !== null) {
            item.max = parseInt(newMax);
            
            // Optional: Delete if empty
            if(isNaN(item.max)) {
                if(confirm("Delete this item?")) {
                    window.app.data.inventory.splice(index, 1);
                }
            }

            window.app.database.saveLocal();
            window.app.database.sync();
            this.render();
        }
    }
};
