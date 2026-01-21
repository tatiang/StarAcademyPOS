/* Firestore Integration v1.80 (Gemini) */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "stores", "classroom_cafe_main");

let unsubscribe = null;

// --- CLOUD SYNC ---
window.saveToCloud = async (data, silent = false) => {
    const dot = document.getElementById('status-dot');
    if(!silent && dot) dot.className = 'status-dot error'; // Temp blink
    try {
        await setDoc(docRef, data);
        if(!silent && dot) setTimeout(() => dot.className = 'status-dot online', 500);
    } catch(e) {
        console.error("Save failed", e);
        if(dot) dot.className = 'status-dot error';
    }
};

// Start Listener
unsubscribe = onSnapshot(docRef, (doc) => {
    const statusEl = document.getElementById('connection-status');
    const dot = document.getElementById('status-dot');
    
    if (doc.exists()) {
        const cloudData = doc.data();
        if(window.app && window.app.data) {
            // Prioritize Employees from Cloud
            if(cloudData.employees && cloudData.employees.length > 0) {
                window.app.data.employees = cloudData.employees;
            }
            // Sync other criticals if needed, or merge
            window.app.refreshUI();
        }
        
        if(statusEl) statusEl.innerHTML = '';
        if(dot) dot.className = 'status-dot online';
    }
}, (error) => {
    const statusEl = document.getElementById('connection-status');
    const dot = document.getElementById('status-dot');
    console.error("Offline:", error);
    if(statusEl) {
        statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#e74c3c"></i> Offline Mode';
        statusEl.style.color = '#e74c3c';
    }
    if(dot) dot.className = 'status-dot error';
});
