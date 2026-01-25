/* FILE: js/inventory_test_Gemini.js */
window.app.inventory = {
    init: function() {
        const div = document.getElementById('inventory-content');
        if(!div) return;
        const products = window.app.data.products || [];
        div.innerHTML = `
            <table class="staff-table">
                <thead><tr><th>Product</th><th>Status</th></tr></thead>
                <tbody>
                    ${products.map(p => `<tr><td>${p.name}</td><td><span style="color:green">In Stock</span></td></tr>`).join('')}
                </tbody>
            </table>
        `;
    }
};
