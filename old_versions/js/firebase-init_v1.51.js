import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("Firebase Init v1.51 Loaded");

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
    const connMsg = document.getElementById('connection-status');
    
    if (manual && dot) dot.className = 'status-dot syncing';

    if (!unsubscribe) {
        if(connMsg) connMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting to cloud...';

        unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                console.log("Real-time update received!");
                if (window.app) {
                    window.app.data = doc.data();
                    window.app.refreshUI();
                }
                
                if(connMsg) connMsg.innerHTML = ''; 
                if(dot) dot.className = 'status-dot online';
                if (itStatus) itStatus.innerText = "Connected (Real-Time Listening)";
            }
        }, (error) => {
            console.error("Listen Error", error);
            if(dot) dot.className = 'status-dot error';
            if (itStatus) itStatus.innerText = "Error (Check Console)";
            if(connMsg) connMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i> Offline Mode';
        });
    }
};

window.loadFromCloud();
