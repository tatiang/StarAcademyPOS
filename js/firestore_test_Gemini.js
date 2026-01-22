/* Firestore Integration v1.86 (Gemini - Compat Mode) */

// NOTE: This uses the global 'firebase' object loaded in index.html via script tags.

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

// Attempt Connection
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        docRef = db.collection("stores").doc("classroom_cafe_main");
        backupRef = db.collection("backups");
        console.log("Firebase Initialized (Compat Mode)");
    } else {
        console.warn("Firebase SDK not found. App running in Offline Mode.");
    }
} catch(e) {
    console.error("Firebase Initialization Error:", e);
}

// --- CLOUD SYNC FUNCTION ---
// Handles saving data to the main document OR creating a timestamped backup
window.saveToCloud = async (data, silent = false, isBackup = false) => {
    if(!db || !docRef) return;
    
    const dot = document.getElementById('status-dot');
    
    // UI Feedback (Blink Orange if manual save)
    if(!silent && dot && !isBackup) dot.className = 'status-dot error'; 
    
    try {
        if(isBackup && backupRef) {
            // --- BACKUP LOGIC ---
            const status = document.getElementById('backup-status');
            if(status) status.innerText = "Backing up...";
            
            await backupRef.add({
                data: data,
                timestamp: new Date().toISOString(),
                version: "v1.86",
                type: "auto-hourly"
            });
            
            if(status) status.innerText = "Last Backup: " + new Date().toLocaleTimeString();
            console.log("✅ Backup Created Successfully");
        } else {
            // --- REGULAR SYNC ---
            await docRef.set(data);
            if(!silent && dot) setTimeout(() => dot.className = 'status-dot online', 500);
        }
    } catch(e) {
        console.error("Cloud Save/Backup Failed", e);
        if(dot && !isBackup) dot.className = 'status-dot error';
        
        // Update UI to show error
        const status = document.getElementById('backup-status');
        if(status && isBackup) status.innerText = "Backup Failed (Check Console)";
    }
};

// --- AUTOMATIC HOURLY BACKUP ---
setInterval(() => {
    if(window.app && window.app.data) {
        console.log("⏰ Triggering Hourly Backup...");
        window.saveToCloud(window.app.data, true, true);
    }
}, 3600000); // 3600000 ms = 1 Hour

// --- REAL-TIME LISTENER ---
// Listens for changes from other devices (e.g., Manager updates menu)
if(docRef) {
    docRef.onSnapshot((doc) => {
        const statusEl = document.getElementById('connection-status');
        const dot = document.getElementById('status-dot');
        
        if (doc.exists) {
            const cloudData = doc.data();
            
            if(window.app && window.app.data) {
                console.log("☁️ Cloud Update Received");
                
                // 1. Sync Employees (Priority)
                if(cloudData.employees && Array.isArray(cloudData.employees)) {
                    window.app.data.employees = cloudData.employees;
                }
                
                // 2. Sync Products/Categories (Optional: Un-comment to force sync menu across devices)
                if(cloudData.products) window.app.data.products = cloudData.products;
                if(cloudData.categories) window.app.data.categories = cloudData.categories;
                if(cloudData.roles) window.app.data.roles = cloudData.roles;

                // Refresh UI to show new data
                window.app.refreshUI();
            }
            
            // Update Connection Status Indicators
            if(statusEl) statusEl.innerHTML = ''; // Clear "Connecting..." text
            if(dot) dot.className = 'status-dot online';
        }
    }, (error) => {
        const statusEl = document.getElementById('connection-status');
        const dot = document.getElementById('status-dot');
        
        console.error("🔥 Firestore Listen Error:", error);
        
        if(statusEl) {
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#e74c3c"></i> Offline Mode';
            statusEl.style.color = '#e74c3c';
        }
        if(dot) dot.className = 'status-dot error';
    });
}
