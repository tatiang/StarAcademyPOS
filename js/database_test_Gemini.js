/* FILE: js/database_test_Gemini.js */

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

    init: function() {
        try {
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                this.db = firebase.firestore();
                this.docRef = this.db.collection("stores").doc("classroom_cafe_main");
                this.startListener();
            }
        } catch(e) {
            console.error("Firebase Error", e);
            this.setOfflineMode(true);
        }
    },

    loadLocal: function() {
        try {
            const stored = localStorage.getItem(window.app.storageKey);
            if(stored) {
                window.app.data = JSON.parse(stored);
            } else {
                window.app.data = JSON.parse(JSON.stringify(window.app.defaults));
            }
        } catch(e) {
            window.app.data = JSON.parse(JSON.stringify(window.app.defaults));
        }
    },

    saveLocal: function() {
        localStorage.setItem(window.app.storageKey, JSON.stringify(window.app.data));
    },

    sync: async function() {
        if(!this.docRef) return;
        this.updateStatus("Syncing...", "orange");
        
        try {
            await this.docRef.set(window.app.data);
            this.updateStatus("Online", "var(--success)");
            this.setOfflineMode(false);
        } catch(e) {
            console.error("Sync Failed", e);
            this.updateStatus("Sync Error", "var(--danger)");
            this.setOfflineMode(true);
        }
    },

    startListener: function() {
        if(!this.docRef) return;
        
        this.docRef.onSnapshot((doc) => {
            if (doc.exists) {
                this.setOfflineMode(false);
                this.updateStatus("Online", "var(--success)");

                const cloudData = doc.data();
                if(cloudData.products) window.app.data.products = cloudData.products;
                if(cloudData.employees) window.app.data.employees = cloudData.employees;
                if(cloudData.categories) window.app.data.categories = cloudData.categories;
                
                // Merge orders (don't lose local ones)
                if(cloudData.orders && cloudData.orders.length > window.app.data.orders.length) {
                    window.app.data.orders = cloudData.orders;
                }

                this.refreshScreens();
                this.saveLocal();
            }
        }, (error) => {
            console.error("Listener Error:", error);
            this.setOfflineMode(true);
            this.updateStatus("Offline", "var(--danger)");
        });
    },

    // HELPER: Toggle the Red Banner
    setOfflineMode: function(isOffline) {
        const banner = document.getElementById('offline-banner');
        if(banner) {
            banner.style.display = isOffline ? 'block' : 'none';
        }
    },

    // HELPER: Update Sidebar Text
    updateStatus: function(text, color) {
        const el = document.getElementById('connection-status');
        if(el) {
            el.innerText = text;
            el.style.color = color;
        }
    },

    refreshScreens: function() {
        if(document.getElementById('view-pos').classList.contains('active') && window.app.posScreen.init) window.app.posScreen.init();
        if(document.getElementById('view-timeclock').classList.contains('active') && window.app.timeClock.render) window.app.timeClock.render();
        if(document.getElementById('view-manager').classList.contains('active') && window.app.managerHub.init) window.app.managerHub.init();
    }
};
