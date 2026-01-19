/* firestore_test.js - Cloud Logic */

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab"
};

// Initialize Firebase (Compat Mode)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Attempt to listen to the store
const docRef = db.collection("stores").doc("classroom_cafe_main");
const statusEl = document.getElementById('connection-status');

docRef.onSnapshot((doc) => {
    if (doc.exists) {
        // Success: Update UI
        console.log("Cloud Data Received");
        if(statusEl) {
            statusEl.innerHTML = '<i class="fas fa-wifi"></i> Connected';
            statusEl.style.color = '#2ecc71';
        }
        
        // Update App Data if app exists
        if (window.app) {
            window.app.data = doc.data();
            if(window.app.refreshUI) window.app.refreshUI();
        }
    }
}, (error) => {
    console.error("Firestore Error:", error);
    if(statusEl) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline (Permission/Net)';
        statusEl.style.color = '#e74c3c';
    }
});
