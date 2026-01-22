/* Firestore Integration v1.85 (Backup Enabled) */

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab"
};

let db = null;
let docRef = null;
let backupRef = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    docRef = db.collection("stores").doc("classroom_cafe_main");
    backupRef = db.collection("backups");
    console.log("Firebase Initialized");
} catch(e) {
    console.error("Firebase init failed", e);
}

// --- CLOUD SYNC ---
window.saveToCloud = async (data, silent = false, isBackup = false) => {
    if(!docRef) return;
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
                version: "v1.85"
            });
            
            if(status) status.innerText = "Last Backup: " + new Date().toLocaleTimeString();
            console.log("Backup Success");
        } else {
            // Regular Sync
            await docRef.set(data);
            if(!silent && dot) setTimeout(() => dot.className = 'status-dot online', 500);
        }
    } catch(e) {
        console.error("Cloud Save Failed", e);
        if(dot && !isBackup) dot.className = 'status-dot error';
    }
};

// --- AUTOMATIC HOURLY BACKUP ---
setInterval(() => {
    if(window.app && window.app.data) {
        console.log("Running Hourly Backup...");
        window.saveToCloud(window.app.data, true, true);
    }
}, 3600000); // 1 Hour

// --- LISTENER ---
if(docRef) {
    docRef.onSnapshot((doc) => {
        const statusEl = document.getElementById('connection-status');
        const dot = document.getElementById('status-dot');
        
        if (doc.exists) {
            const cloudData = doc.data();
            if(window.app && window.app.data) {
                // Merge strategies could go here, for now simple overwrite of key arrays if they exist
                if(cloudData.employees) window.app.data.employees = cloudData.employees;
                // window.app.data.products = cloudData.products; // Optional: Sync products too
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
