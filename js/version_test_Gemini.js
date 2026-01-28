/* FILE: js/variables_test_Gemini.js */

window.app = {
    // SYSTEM CONSTANTS
    version: "v2.2.0", // UPDATED HERE
    storageKey: "rising_star_data_v1", // Keep this same to preserve current data
    defaults: {
        // ... (Your existing defaults) ...
        orderCounter: 1000,
        products: [
            { id: 1, name: "Coffee", price: 2.00, cat: "Hot Drinks", img: "", opts: ["Milk", "Sugar"] },
            { id: 2, name: "Water", price: 0.00, cat: "Cold Drinks", img: "", opts: [] }
        ],
        employees: [
            { name: "Manager", role: "admin", status: "out" },
            { name: "IT Support", role: "admin", status: "out" }
        ],
        categories: ["Hot Drinks", "Cold Drinks", "Snacks"],
        orders: [],
        timeEntries: []
    }
};
