/* FILE: js/database_test_Gemini.js
   PURPOSE: Handles saving/loading data from LocalStorage and Firestore.
*/

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab"
};

window.app.database = {
    db: null,
    docRef: null,

    // 1. Connect to Firebase
    init: function() {
        try {
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                this.db = firebase.firestore();
                this.docRef = this.db.collection("stores").doc("classroom_cafe_main");
                
                // Start Listening for updates
                this.startListener();
            } else {
                console.error("Firebase SDK not loaded.");
            }
        } catch(e) {
            console.error("Firebase Error", e);
            document.getElementById('connection-status').textContent = "Offline Mode";
            document.getElementById('connection-status').style.color = "var(--danger)";
        }
    },

    // 2. Load from LocalStorage (Browser Memory)
    loadLocal: function() {
        try {
            const stored = localStorage.getItem(window.app.storageKey);
            if(stored) {
                window.app.data = JSON.parse(stored);
                console.log("Loaded local data");
            } else {
                window.app.data = JSON.parse(JSON.stringify(window.app.defaults));
            }
        } catch(e) {
            console.error("Local Load Error", e);
            window.app.data = JSON.parse(JSON.stringify(window.app.defaults));
        }
    },

    // 3. Save to LocalStorage
    saveLocal: function() {
        localStorage.setItem(window.app.storageKey, JSON.stringify(window.app.data));
    },

    // 4. Send to Cloud
    sync: async function() {
        if(!this.docRef) return;
        const status = document.getElementById('connection-status');
        if(status) {
             status.innerText = "Syncing...";
             status.style.color = "orange";
        }
        
        try {
            await this.docRef.set(window.app.data);
            if(status) {
                status.innerText = "Online";
                status.style.color = "var(--success)";
            }
        } catch(e) {
            console.error("Sync Failed", e);
            if(status) {
                status.innerText = "Sync Error";
                status.style.color = "var(--danger)";
            }
        }
    },

    // 5. Listen for changes from other computers
    startListener: function() {
        if(!this.docRef) return;
        
        this.docRef.onSnapshot((doc) => {
            const status = document.getElementById('connection-status');
            
            if (doc.exists) {
                // SUCCESS: We are connected!
                if(status) {
                    status.innerText = "Online";
                    status.style.color = "var(--success)";
                }

                const cloudData = doc.data();
                
                // Merge logic: Don't overwrite local cart or pending orders if possible
                // For this version, we will trust the cloud for Products and Employees
                if(cloudData.products) window.app.data.products = cloudData.products;
                if(cloudData.employees) window.app.data.employees = cloudData.employees;
                if(cloudData.categories) window.app.data.categories = cloudData.categories;
                
                // If we are a manager, we might want to see other people's orders
                if(cloudData.orders && cloudData.orders.length > window.app.data.orders.length) {
                    window.app.data.orders = cloudData.orders;
                }

                // Refresh active screens
                if(document.getElementById('view-pos').classList.contains('active') && window.app.posScreen.init) window.app.posScreen.init();
                if(document.getElementById('view-timeclock').classList.contains('active') && window.app.timeClock.render) window.app.timeClock.render();
                if(document.getElementById('view-manager').classList.contains('active') && window.app.managerHub.init) window.app.managerHub.init();
                
                // Save the new cloud data to local backup
                this.saveLocal();
            }
        }, (error) => {
            console.error("Listener Error:", error);
            if(status) status.innerText = "Offline";
        });
    }
};
