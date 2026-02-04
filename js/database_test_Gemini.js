/* FILE: js/database_test_Gemini.js
   PURPOSE: Handles saving/loading data from LocalStorage and Firestore.
   Manages Online/Offline states and real-time listeners.
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
    backupRef: null,
    backupTimer: null,
    lastBackupAt: null,
    backupDebounceMs: 5000,

    // 1. Initialize Connection
    init: function() {
        try {
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                this.db = firebase.firestore();
                // We use a single document for the entire store's data for simplicity
                this.docRef = this.db.collection("stores").doc("classroom_cafe_main");
                this.backupRef = this.db.collection("backups");
                
                // Start listening for changes immediately
                this.startListener();
            } else {
                console.error("Firebase SDK not loaded.");
            }
        } catch(e) {
            console.error("Firebase Error", e);
            this.setOfflineMode(true);
        }
    },

    // 2. Load from LocalStorage (Instant Boot)
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

    // 3. Save to LocalStorage (Backup)
    saveLocal: function() {
        localStorage.setItem(window.app.storageKey, JSON.stringify(window.app.data));
        this.scheduleBackup("local-save");
    },

    // 4. Send Data to Cloud (Sync)
    sync: async function() {
        if(!this.docRef) return;
        
        this.updateStatus("Syncing...", "orange");
        
        try {
            // Write local data to the cloud
            await this.docRef.set(window.app.data);
            
            this.updateStatus("Online", "var(--success)");
            this.setOfflineMode(false);
        } catch(e) {
            console.error("Sync Failed", e);
            this.updateStatus("Sync Error", "var(--danger)");
            this.setOfflineMode(true);
        }
    },

    // 5. Listen for updates from other devices (Real-time)
    startListener: function() {
        if(!this.docRef) return;
        
        this.docRef.onSnapshot((doc) => {
            if (doc.exists) {
                // CONNECTION SUCCESS
                this.setOfflineMode(false);
                this.updateStatus("Online", "var(--success)");

                const cloudData = doc.data();
                
                // MERGE STRATEGY:
                // We accept the Cloud as the "Source of Truth" for shared lists.
                if(cloudData.products) window.app.data.products = cloudData.products;
                if(cloudData.employees) window.app.data.employees = cloudData.employees;
                if(cloudData.categories) window.app.data.categories = cloudData.categories;
                if(cloudData.roles) window.app.data.roles = cloudData.roles;
                if(cloudData.inventory) window.app.data.inventory = cloudData.inventory;
                if(cloudData.timeEntries) window.app.data.timeEntries = cloudData.timeEntries;
                if(cloudData.pins) window.app.data.pins = cloudData.pins;
                
                // For orders, merge to preserve local completions
                if(cloudData.orders) {
                    const localOrders = window.app.data.orders || [];
                    const localById = new Map(localOrders.map(o => [o.id, o]));
                    const cloudOrders = cloudData.orders || [];

                    const merged = cloudOrders.map(o => {
                        const local = localById.get(o.id);
                        if (local && local.status === 'completed' && o.status !== 'completed') {
                            return { ...o, status: 'completed' };
                        }
                        if (local && local.customerName && !o.customerName) {
                            return { ...o, customerName: local.customerName };
                        }
                        return o;
                    });

                    const mergedIds = new Set(merged.map(o => o.id));
                    localOrders.forEach(o => {
                        if (!mergedIds.has(o.id)) merged.push(o);
                    });

                    window.app.data.orders = merged;
                }
                
                // Also sync order counter to avoid duplicates
                if(cloudData.orderCounter > window.app.data.orderCounter) {
                    window.app.data.orderCounter = cloudData.orderCounter;
                }

                // Update the screen immediately
                this.refreshScreens();
                this.saveLocal();
            }
        }, (error) => {
            console.error("Listener Error:", error);
            this.setOfflineMode(true);
            this.updateStatus("Offline", "var(--danger)");
        });
    },

    // --- HELPERS ---

    // Updates the active view so the user sees changes instantly
    refreshScreens: function() {
        // POS Screen
        if(document.getElementById('view-pos').classList.contains('active') && window.app.posScreen.init) {
            window.app.posScreen.init();
        }
        // Time Clock
        if(document.getElementById('view-timeclock').classList.contains('active') && window.app.timeClock.render) {
            window.app.timeClock.render();
        }
        // Manager Hub
        if(document.getElementById('view-manager').classList.contains('active') && window.app.managerHub.init) {
            window.app.managerHub.init();
        }
        // Barista View (CRITICAL FIX: Updates queue when new order arrives)
        if(document.getElementById('view-barista').classList.contains('active')) {
            if (window.app.baristaView?.render) window.app.baristaView.render();
            else if (window.app.barista?.render) window.app.barista.render();
        }
        // Inventory View
        if(document.getElementById('view-inventory').classList.contains('active') && window.app.inventory.init) {
            window.app.inventory.init();
        }
    },

    // Toggles the Red Offline Banner at the top of the screen
    setOfflineMode: function(isOffline) {
        const banner = document.getElementById('offline-banner');
        if(banner) {
            banner.style.display = isOffline ? 'block' : 'none';
        }
    },

    // Updates the text in the Sidebar Footer
    updateStatus: function(text, color) {
        const el = document.getElementById('connection-status');
        if(el) {
            el.innerText = text;
            el.style.color = color;
        }
    },

    scheduleBackup: function(reason = "auto") {
        if (!this.backupRef) return;

        if (this.backupTimer) clearTimeout(this.backupTimer);
        this.backupTimer = setTimeout(() => {
            this.runBackup(reason);
        }, this.backupDebounceMs);
    },

    runBackup: async function(reason = "auto") {
        if (!this.backupRef) return;

        try {
            await this.backupRef.add({
                data: window.app.data,
                timestamp: new Date().toISOString(),
                version: window.app.version || "",
                type: "auto-quick",
                reason: reason
            });
            this.lastBackupAt = new Date();
            this.updateBackupStatus();
        } catch (e) {
            console.error("Auto Backup Failed", e);
        }
    },

    updateBackupStatus: function() {
        const el = document.getElementById('backup-status');
        if (!el) return;

        if (!this.lastBackupAt) {
            el.innerText = "Auto backup: pending";
            return;
        }

        el.innerText = "Auto backup: " + this.lastBackupAt.toLocaleTimeString();
    }
};
