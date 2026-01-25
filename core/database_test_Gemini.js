/* FILE: database_test_Gemini.js
   PURPOSE: Handles saving/loading data from LocalStorage and Firestore.
*/

// Firebase Config (Keep your API keys here)
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
            }
        } catch(e) {
            console.error("Firebase Error", e);
        }
    },

    // 2. Load from LocalStorage (Browser Memory)
    loadLocal: function() {
        try {
            const stored = localStorage.getItem(window.app.storageKey);
            if(stored) {
                window.app.data = JSON.parse(stored);
            } else {
                // Load defaults if new
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
        if(status) status.innerText = "Syncing...";
        
        try {
            await this.docRef.set(window.app.data);
            if(status) status.innerText = "Synced";
        } catch(e) {
            console.error("Sync Failed", e);
        }
    },

    // 5. Listen for changes from other computers
    startListener: function() {
        if(!this.docRef) return;
        this.docRef.onSnapshot((doc) => {
            if (doc.exists) {
                const cloudData = doc.data();
                // Merge logic could go here, for now we overwrite lists
                if(cloudData.products) window.app.data.products = cloudData.products;
                if(cloudData.employees) window.app.data.employees = cloudData.employees;
                
                // Refresh whatever screen we are on
                if(document.getElementById('view-pos').classList.contains('active')) window.app.posScreen.init();
                if(document.getElementById('view-timeclock').classList.contains('active')) window.app.timeClock.render();
            }
        });
    }
};
