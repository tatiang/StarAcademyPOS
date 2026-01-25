/* FILE: variables_test_Gemini.js
   PURPOSE: This is the "Brain" of the app. It creates the empty buckets 
   where we will store data (employees, cart items) and where other 
   files will attach their logic.
*/

window.app = {
    // Basic Info
    version: "v2.0.0",
    storageKey: "star_pos_v2_data",
    taxRate: 0.0925,

    // THE DATA STORE (This is where all your app's memory lives)
    data: {
        products: [],    // List of items to sell
        categories: [],  // "Hot Drinks", "Snacks"
        roles: [],       // "Manager", "Barista"
        employees: [],   // List of student/staff users
        cart: [],        // Items currently being ordered
        orders: [],      // History of past orders
        timeEntries: [], // Clock in/out history
        orderCounter: 1001 // Starts order numbers at 1001
    },

    // MODULE PLACEHOLDERS (We create empty slots for other files to fill)
    loginScreen: {},  // Will be filled by login_screen_test_Gemini.js
    posScreen: {},    // Will be filled by pos_screen_test_Gemini.js
    managerHub: {},   // Will be filled by manager_hub_test_Gemini.js
    timeClock: {},    // Will be filled by timeclock_screen_test_Gemini.js
    itHub: {},        // Will be filled by it_hub_test_Gemini.js
    
    database: {},     // Will be filled by database_test_Gemini.js
    helpers: {},      // Will be filled by helpers_test_Gemini.js
    router: {}        // Will be filled by main_test_Gemini.js
};

// DEFAULT DATA (Used if the database is empty or offline)
window.app.defaults = {
    products: [
        { id: 1, name: "Coffee", price: 2.50, cat: "Hot Drinks", opts: ["Cream", "Sugar"], img: "https://loremflickr.com/300/300/coffee" },
        { id: 2, name: "Water", price: 1.00, cat: "Cold Drinks", opts: [], img: "https://loremflickr.com/300/300/water" }
    ],
    categories: ["Hot Drinks", "Cold Drinks", "Snacks"],
    roles: ["Manager", "IT Support", "Barista", "Cashier"],
    employees: [] // We expect this to sync from the cloud
};

// --- FIX: ADDED MISSING ARRAYS HERE ---
    
    // These were missing, causing the crash:
    cart: [],
    orders: [],
    timeEntries: [],
    orderCounter: 1001
};
