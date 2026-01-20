// Rising Star Cafe POS — Firestore Service (TEST_Gemini)
// v1.76

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, updateDoc, arrayUnion
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
  console.log('[RSC POS] Firestore v1.76 initialized');
} catch (err) {
  console.error('[RSC POS] Firebase Init Error:', err);
}

// --- PUBLIC API ---

export const dbStatus = () => isConnected;

const STORE_DOC_REF = () => doc(db, "stores", "classroom_cafe_main");

export async function getStoreData() {
  if (!db) return null;
  try {
    const docSnap = await getDoc(STORE_DOC_REF());
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.warn("Document 'stores/classroom_cafe_main' not found.");
      return null;
    }
  } catch (e) {
    console.error("Error fetching store data:", e);
    return null;
  }
}

// --- ORDER MANAGEMENT ---

export async function saveOrder(order) {
  if (!db) return false;
  try {
    // Append the new order object to the 'orders' array in the document
    await updateDoc(STORE_DOC_REF(), {
      orders: arrayUnion(order)
    });
    console.log("Order saved:", order.id);
    return true;
  } catch (e) {
    console.error("Error saving order:", e);
    alert("Database Error: Could not save order.");
    return false;
  }
}

// For updating status, we read the whole array, modify, and write back.
// (Firestore doesn't allow updating a specific array element by index easily)
export async function updateOrdersList(newOrdersArray) {
  if (!db) return false;
  try {
    await updateDoc(STORE_DOC_REF(), {
      orders: newOrdersArray
    });
    return true;
  } catch (e) {
    console.error("Error updating orders:", e);
    return false;
  }
}
