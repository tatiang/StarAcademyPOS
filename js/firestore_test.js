/* firestore_test.js - Handles Cloud UI Status */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Monitor Connection
const docRef = doc(db, "stores", "classroom_cafe_main");
const statusEl = document.getElementById('connection-status');
const dot = document.getElementById('status-dot');

onSnapshot(docRef, 
    (doc) => {
        if(statusEl) {
            statusEl.innerHTML = '<i class="fa-solid fa-wifi"></i> Connected';
            statusEl.style.color = '#2ecc71';
        }
        if(dot) dot.className = 'status-dot online';
        console.log("Cloud Connection: Active");
    }, 
    (error) => {
        if(statusEl) {
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Offline (Check Rules)';
            statusEl.style.color = '#e74c3c';
        }
        if(dot) dot.className = 'status-dot error';
        console.warn("Cloud Connection: Failed", error);
    }
);
