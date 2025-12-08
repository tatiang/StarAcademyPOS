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
        const safetyTimeout = setTimeout(() => {
            const loadMsg = document.getElementById('loading-msg');
            if(loadMsg && loadMsg.innerHTML.includes("Connecting")) {
                loadMsg.innerHTML = ""; // Clear msg but don't error
                console.warn("Cloud timeout - continuing in offline mode");
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
                if(loadMsg) loadMsg.innerHTML = "";
                
                if(dot) dot.className = 'status-dot online';
                if (itStatus) itStatus.innerText = "Connected (Real-Time Listening)";
            }
        }, (error) => {
            clearTimeout(safetyTimeout);
            console.error("Listen Error", error);
            if(dot) dot.className = 'status-dot error';
            if (itStatus) itStatus.innerText = "Error (Check Console)";
            const loadMsg = document.getElementById('loading-msg');
            if(loadMsg) loadMsg.innerHTML = "Offline Mode (Local Data Only)";
        });
    }
};

window.loadFromCloud();
