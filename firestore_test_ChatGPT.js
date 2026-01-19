import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * 🔧 Replace with your real Firebase config
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("🔥 Firestore connected");
} catch (err) {
  console.warn("⚠️ Firestore not connected", err);
}

window.firestoreDB = db;

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("connectionStatus");
  if (status) {
    status.textContent = db ? "Connected to cloud" : "Offline / Config missing";
  }
});
