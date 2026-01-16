import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("Initializing Firebase v1.50 (Stable Base)");

const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

// Initialize Firebase
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const docRef = doc(db, "stores", "classroom_cafe_main");

let unsubscribe = null;

// --- EXPORTED FUNCTIONS ---

// Function to save data to Firestore
window.saveToCloud = async (data, silent = false) => {
  const dot = document.getElementById('status-dot');
  
  // Set UI to syncing
  if (!silent && dot) dot.className = 'status-dot syncing';
  
  try {
    // Write data to the document
    await setDoc(docRef, data);
    
    // On success, set UI to online
    if (!silent && dot) setTimeout(() => dot.className = 'status-dot online', 500);
    
  } catch (e) {
    console.error("Save Error:", e);
    // On error, set UI to error state
    if (!silent && dot) dot.className = 'status-dot error';
  }
};

// Function to start listening for real-time updates
window.loadFromCloud = (manual = false) => {
  const dot = document.getElementById('status-dot');
  const itStatus = document.getElementById('it-db-status');
  const connMsg = document.getElementById('connection-status');
  
  // Update UI if manually triggered
  if (manual && dot) dot.className = 'status-dot syncing';

  // Prevent multiple listeners: if already listening, reset UI and exit
  if (unsubscribe) {
    console.log("Database listener is already active.");
    if (manual && dot) setTimeout(() => dot.className = 'status-dot online', 500);
    return;
  }

  // Set initial connection message
  if(connMsg) connMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting to cloud...';

  // Start the listener
  unsubscribe = onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      console.log("Real-time update received (v1.50)");
      
      // Update global app state if available
      if (window.app) {
        window.app.data = doc.data();
        if (typeof window.app.refreshUI === 'function') {
          window.app.refreshUI();
        }
      }
      
      // Update UI Status Elements
      if(connMsg) connMsg.innerHTML = ''; // Clear connecting message
      if(dot) dot.className = 'status-dot online';
      if (itStatus) itStatus.innerText = "Connected (Real-Time Listening)";
    }
  }, (error) => {
    console.error("Listen Error:", error);
    
    // Handle UI for errors
    if(dot) dot.className = 'status-dot error';
    if (itStatus) itStatus.innerText = "Error (Check Console)";
    if(connMsg) connMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i> Offline Mode';
    
    // Reset unsubscribe so we can try again later if needed
    unsubscribe = null;
  });
};

// Start listening immediately upon load
window.loadFromCloud();
