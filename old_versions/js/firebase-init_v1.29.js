import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const docRef = doc(db, "stores", "classroom_cafe_main");

let unsubscribe = null;

// Attach functions to window so app.js can use them
window.saveToCloud = async (data, silent = false) => {
    const dot = document.getElementById('status-dot');
    if (!silent && dot) dot.className = 'status-dot syncing';
    try {
        await setDoc(docRef, data);
        if (!silent && dot) setTimeout(() => dot.className = 'status-dot online', 500);
    } catch (e) {
        console.error("Save Error", e);
        if (!silent && dot) dot.className = 'status-dot error';
    }
};

window.loadFromCloud = (manual = false) => {
    const dot = document.getElementById('status-dot');
    const itStatus = document.getElementById('it-db-status');
    if (manual && dot) dot.className = 'status-dot syncing';

    if (!unsubscribe) {
        // Safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            const loadMsg = document.getElementById('loading-msg');
            if(loadMsg && loadMsg.style.display !== 'none') {
                console.warn("Cloud timeout - forcing local load");
                loadMsg.style.display = 'none';
                if (window.app && window.app.renderLogin) window.app.renderLogin();
            }
        }, 3000);

        unsubscribe = onSnapshot(docRef, (doc) => {
            clearTimeout(safetyTimeout);
            if (doc.exists()) {
                console.log("Real-time update received!");
                if (window.app) {
                    window.app.data = doc.data();
                    window.app.refreshUI();
                }
                
                const loadMsg = document.getElementById('loading-msg');
                if(loadMsg) loadMsg.style.display = 'none';
                
                if(dot) dot.className = 'status-dot online';
                if (itStatus) itStatus.innerText = "Connected (Real-Time Listening)";
            }
        }, (error) => {
            clearTimeout(safetyTimeout);
            console.error("Listen Error", error);
            if(dot) dot.className = 'status-dot error';
            if (itStatus) itStatus.innerText = "Error (Check Console)";
            
            const loadMsg = document.getElementById('loading-msg');
            if(loadMsg) {
                loadMsg.innerHTML = "Offline Mode (Local Data Only)";
                if (window.app && window.app.renderLogin) window.app.renderLogin();
            }
        });
    }
};

// Start listening immediately
window.loadFromCloud();
