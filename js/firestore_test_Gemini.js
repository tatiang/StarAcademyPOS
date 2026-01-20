// Rising Star Cafe POS — Firestore Service (TEST_Gemini)
// v1.70

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

let app, db, auth;
let isConnected = false;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  isConnected = true;
  console.log('[RSC POS] Firestore v1.70 initialized');
} catch (err) {
  console.error('[RSC POS] Firebase Init Error:', err);
}

// --- PUBLIC API ---

export const dbStatus = () => isConnected;

/**
 * Fetch all documents from a collection
 * @param {string} colName - 'products' or 'employees'
 */
export async function getCollectionData(colName) {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, colName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error(`Error getting ${colName}:`, e);
    throw e;
  }
}

/**
 * Add a new document
 * @param {string} colName 
 * @param {object} data 
 */
export async function addData(colName, data) {
  if (!db) throw new Error("Database offline");
  // Add server timestamp
  const payload = { ...data, createdAt: serverTimestamp() };
  return await addDoc(collection(db, colName), payload);
}

/**
 * Delete a document by ID
 * @param {string} colName 
 * @param {string} docId 
 */
export async function deleteData(colName, docId) {
  if (!db) throw new Error("Database offline");
  await deleteDoc(doc(db, colName, docId));
}
