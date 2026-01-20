// Rising Star Cafe POS — Firestore Service (TEST_Gemini)
// v1.77

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

let db;
let isConnected = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isConnected = true;
  console.log('[RSC POS] Firestore v1.77 initialized');
} catch (err) {
  console.error('[RSC POS] Firebase Init Error:', err);
}

// --- PUBLIC API ---

const STORE_DOC_REF = () => doc(db, "stores", "classroom_cafe_main");

export async function getStoreData() {
  if (!db) return null;
  try {
    const docSnap = await getDoc(STORE_DOC_REF());
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.error("Error fetching store data:", e);
    return null;
  }
}

// v1.42 Spec: Writes entire app state to single doc
export async function saveStoreData(fullData) {
  if (!db) return false;
  try {
    await setDoc(STORE_DOC_REF(), fullData);
    console.log("Cloud Save Complete");
    return true;
  } catch (e) {
    console.error("Cloud Save Failed:", e);
    return false;
  }
}
