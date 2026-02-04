/* FILE: js/variables_test_Gemini.js
   PURPOSE: The "Brain". Initializes the global app object and default data.
*/

window.app = {
    version: "v2.50", // Updated Version
    lastModified: "2026-02-04T11:15:07-08:00",
    storageKey: "star_pos_v2_data",
    taxRate: 0.0925,
    session: {
        userName: null,
        roleName: null,
        isAdmin: false
    },

    // THE DATA STORE (Active Data)
    data: {
        products: [],    
        categories: [],  
        roles: [],       
        employees: [],   
        cart: [],        
        orders: [],      
        timeEntries: [], 
        orderCounter: 1001,
        pins: {
            "Manager": "1234",
            "IT Support": "9753"
        },
        backupSettings: {
            intervalMs: 300000 // 5 minutes default
        },
        cleanupFlags: {
            removedOrder1001: false
        }
    },

    // MODULE PLACEHOLDERS (Other files will attach here)
    loginScreen: {},  
    posScreen: {},    
    managerHub: {},   
    timeClock: {},    
    itHub: {},        
    database: {},     
    helpers: {},      
    router: {},

    // DEFAULTS (Used if no saved data is found)
    defaults: {
        products: [
            { id: 1, name: "Coffee", price: 2.50, cat: "Hot Drinks", opts: ["Cream", "Sugar"], img: "https://loremflickr.com/300/300/coffee" },
            { id: 2, name: "Water", price: 1.00, cat: "Cold Drinks", opts: [], img: "https://loremflickr.com/300/300/water" }
        ],
        categories: ["Hot Drinks", "Cold Drinks", "Snacks"],
        roles: ["Manager", "IT Support", "Barista", "Cashier"],
        employees: [],
        cart: [],
        orders: [],
        timeEntries: [],
        orderCounter: 1001,
        pins: {
            "Manager": "1234",
            "IT Support": "9753"
        },
        backupSettings: {
            intervalMs: 300000
        },
        cleanupFlags: {
            removedOrder1001: false
        }
    }
};
