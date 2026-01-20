// Rising Star Cafe POS — Firestore Service (TEST_Gemini)
// v1.72

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove 
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
  console.log('[RSC POS] Firestore v1.72 initialized');
} catch (err) {
  console.error('[RSC POS] Firebase Init Error:', err);
}

// --- PUBLIC API ---

export const dbStatus = () => isConnected;

// Your specific document path based on screenshots
const STORE_DOC_REF = () => doc(db, "stores", "classroom_cafe_main");

/**
 * Fetches the entire store configuration (Employees & Products)
 * from the single document 'stores/classroom_cafe_main'
 */
export async function getStoreData() {
  if (!db) return null;
  try {
    const docSnap = await getDoc(STORE_DOC_REF());
    if (docSnap.exists()) {
      return docSnap.data(); // Returns { employees: [...], products: [...] }
    } else {
      console.error("No such document: stores/classroom_cafe_main");
      return null;
    }
  } catch (e) {
    console.error("Error fetching store data:", e);
    throw e;
  }
}

/**
 * Helper to update the arrays (for future editing)
 */
export async function updateStoreArray(field, newItem) {
    // This is a placeholder for adding items. 
    // Complex array manipulation requires reading, modifying, and writing back
    // or using arrayUnion if the data is simple.
    // implementation reserved for v1.75
}
