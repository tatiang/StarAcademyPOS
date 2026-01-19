// firestore_test_ChatGPT.js
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.appspot.com",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.firestoreDB = db;

console.log("🔥 Firestore connected");
