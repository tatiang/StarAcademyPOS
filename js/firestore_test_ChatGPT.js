// Rising Star Cafe POS — Firestore wiring (TEST_ChatGPT)
// v1.68

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your Firebase configuration (from your project)
// NOTE: apiKey is not a secret; security depends on Firestore rules.
const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

function setStatus(text){
  const el = document.getElementById('connectionStatus');
  if (el) el.textContent = text;
}

// Helpful hint when someone accidentally opens via file://
if (location.protocol === 'file:') {
  setStatus('Offline (opened via file:// — serve over http/https)');
  const hint = document.getElementById('hostingHint');
  if (hint) hint.hidden = false;
}

let app = null;
let db = null;
let auth = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  // Expose for app_test_ChatGPT.js
  window.RSC_FIREBASE = { app, db, auth, connected: true };

  if (location.protocol !== 'file:') {
    setStatus('Connected to cloud');
  }

  console.log('[RSC POS] Firebase initialized');
} catch (err) {
  console.warn('[RSC POS] Firebase init failed:', err);
  window.RSC_FIREBASE = { app: null, db: null, auth: null, connected: false, error: String(err) };

  if (location.protocol !== 'file:') {
    setStatus('Cloud error (see console)');
  }
}
