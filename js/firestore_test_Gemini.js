/* Firestore Integration v1.96 (Priority Sync) */

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab"
};

// Initialize Variables
let db = null;
let docRef = null;
let backupRef = null;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        docRef = db.collection("stores").doc("classroom_cafe_main");
        backupRef = db.collection("backups");
        console.log("Firebase Initialized (Compat Mode)");
    } else {
        console.warn("Firebase SDK not found.");
    }
} catch(e) {
    console.error("Firebase Initialization Error:", e);
}

// --- CLOUD SYNC ---
window.saveToCloud = async (data, silent = false, isBackup = false) => {
    if(!db || !docRef) return;
    const dot = document.getElementById('status-dot');
    if(!silent && dot && !isBackup) dot.className = 'status-dot error'; 
    try {
        if(isBackup && backupRef) {
            const status = document.getElementById('backup-status');
            if(status) status.innerText = "Backing up...";
            await backupRef.add({ data: data, timestamp: new Date().toISOString(), version: "v1.96", type: "auto-hourly" });
            if(status) status.innerText = "Last Backup: " + new Date().toLocaleTimeString();
        } else {
            await docRef.set(data);
            if(!silent && dot) setTimeout(() => dot.className = 'status-dot online', 500);
        }
    } catch(e) {
        console.error("Cloud Save Failed", e);
        if(dot && !isBackup) dot.className = 'status-dot error';
    }
};

// --- LISTENER ---
if(docRef) {
    docRef.onSnapshot((doc) => {
        const statusEl = document.getElementById('connection-status');
        const dot = document.getElementById('status-dot');
        
        if (doc.exists) {
            const cloudData = doc.data();
            if(window.app && window.app.data) {
                // Priority Sync: Overwrite local employees with Cloud
                if(cloudData.employees && Array.isArray(cloudData.employees)) {
                    window.app.data.employees = cloudData.employees;
                }
                // Optional: Sync Products
                if(cloudData.products) window.app.data.products = cloudData.products;
                
                window.app.refreshUI();
            }
            if(statusEl) statusEl.innerHTML = '';
            if(dot) dot.className = 'status-dot online';
        }
    }, (error) => {
        const statusEl = document.getElementById('connection-status');
        if(statusEl) statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#e74c3c"></i> Offline Mode';
    });
}
