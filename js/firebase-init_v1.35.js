/*
Star Academy POS — firebase-init_v1.35.js
========================================

Per your v1.35 plan, there are **no functional changes** required from v1.34
for the Firebase / Firestore layer. You can safely:

1. Duplicate firebase-init_v1.34.js to firebase-init_v1.35.js in your repo.
2. Keep all of your existing configuration and helper logic exactly the same.
3. Only update any visible version strings you might have hard-coded (if any).

If, for convenience, you want a minimal template, here is one. You should
REPLACE the firebaseConfig object with your actual config from the Firebase
console, or simply overwrite this entire file with your current v1.34 content.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// TODO: Replace with your actual config, or overwrite this file with
// your existing firebase-init_v1.34.js content.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const docRef = doc(db, "stores", "classroom_cafe_main");

window.saveToCloud = async function (data, silent = false) {
  const statusDot = document.getElementById("status-dot");
  const connectionStatus = document.getElementById("connection-status");

  try {
    if (!silent && statusDot) {
      statusDot.className = "status-dot syncing";
    }
    await setDoc(docRef, data);
    if (statusDot) {
      statusDot.className = "status-dot online";
    }
    if (connectionStatus) {
      connectionStatus.textContent = "Online";
    }
  } catch (err) {
    console.error("saveToCloud error:", err);
    if (statusDot) {
      statusDot.className = "status-dot error";
    }
    if (connectionStatus) {
      connectionStatus.textContent = "Sync error";
    }
  }
};

window.loadFromCloud = function (manual = false) {
  const statusDot = document.getElementById("status-dot");
  const connectionStatus = document.getElementById("connection-status");
  const itDbStatus = document.getElementById("it-db-status");

  try {
    if (statusDot) {
      statusDot.className = "status-dot syncing";
    }
    onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data();
          if (window.app && window.app.data) {
            window.app.data = Object.assign({}, window.app.data, cloudData);
            if (typeof window.app.refreshUI === "function") {
              window.app.refreshUI();
            }
          }
          if (statusDot) statusDot.className = "status-dot online";
          if (connectionStatus) connectionStatus.textContent = "Online (Firestore)";
          if (itDbStatus) itDbStatus.textContent = "Connected to Firestore (classroom_cafe_main)";
        } else {
          if (connectionStatus) connectionStatus.textContent = "No Firestore data found yet.";
          if (itDbStatus) itDbStatus.textContent = "No document at stores/classroom_cafe_main";
        }
      },
      (error) => {
        console.error("loadFromCloud onSnapshot error:", error);
        if (statusDot) statusDot.className = "status-dot error";
        if (connectionStatus) connectionStatus.textContent = "Offline / Firestore error";
        if (itDbStatus) itDbStatus.textContent = "Error listening to Firestore";
      }
    );
  } catch (err) {
    console.error("loadFromCloud error:", err);
    if (statusDot) statusDot.className = "status-dot error";
    if (connectionStatus) connectionStatus.textContent = "Offline / Firestore error";
    if (itDbStatus) itDbStatus.textContent = "Error listening to Firestore";
  }
};
