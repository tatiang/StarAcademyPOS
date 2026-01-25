/* Firestore Integration v1.97 (10min Backup) */

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
        console.warn("Firebase SDK not found. App running in Offline Mode.");
    }
} catch(e) {
    console.error("Firebase Initialization Error:", e);
}

// --- CLOUD FETCH (Promise-based for Retry Logic) ---
window.fetchCloudData = async () => {
    if (!db || !docRef) return null;
    try {
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data();
        }
    } catch (e) {
        console.error("Fetch Cloud Data Failed", e);
    }
    return null;
};

// --- CLOUD SYNC ---
window.saveToCloud = async (data, silent = false, isBackup = false) => {
    if(!db || !docRef) return;
    
    const dot = document.getElementById('status-dot');
    if(!silent && dot && !isBackup) dot.className = 'status-dot error'; 
    
    try {
        if(isBackup && backupRef) {
            // Backup Logic
            const status = document.getElementById('backup-status');
            if(status) status.innerText = "Backing up...";
            
            await backupRef.add({
                data: data,
                timestamp: new Date().toISOString(),
                version: "v1.97",
                type: "auto-hourly"
            });
            
            if(status) status.innerText = "Last Backup: " + new Date().toLocaleTimeString();
            console.log("✅ Backup Created Successfully");
        } else {
            // Regular Sync
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

// --- AUTOMATIC 10-MINUTE BACKUP ---
setInterval(() => {
    if(window.app && window.app.data) {
        console.log("⏰ Triggering Auto Backup (10m)...");
        window.saveToCloud(window.app.data, true, true);
    }
}, 600000); // 10 minutes

// --- REAL-TIME LISTENER ---
if(docRef) {
    docRef.onSnapshot((doc) => {
        const statusEl = document.getElementById('connection-status');
        const dot = document.getElementById('status-dot');
        
        if (doc.exists) {
            const cloudData = doc.data();
            
            if(window.app && window.app.data) {
                console.log("☁️ Cloud Update Received");
                if(cloudData.employees && Array.isArray(cloudData.employees)) {
                    window.app.data.employees = cloudData.employees;
                }
                if(cloudData.products) window.app.data.products = cloudData.products;
                if(cloudData.categories) window.app.data.categories = cloudData.categories;
                if(cloudData.roles) window.app.data.roles = cloudData.roles;

                window.app.refreshUI();
            }
            if(statusEl) statusEl.innerHTML = ''; 
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
