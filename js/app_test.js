/* Star Academy POS - v1.65 (TEST) */

// --- CONFIGURATION ---
const APP_VERSION = "1.65";
let db = null; // Global DB reference
let currentAdminTarget = null; 

// Firebase Config (Derived from your uploaded files)
const firebaseConfig = {
  apiKey: "AIzaSyBt6HIzo_onaft9h-RiwROnsfv3otXKB20",
  authDomain: "star-academy-cafe-pos.firebaseapp.com",
  projectId: "star-academy-cafe-pos",
  storageBucket: "star-academy-cafe-pos.firebasestorage.app",
  messagingSenderId: "148643314098",
  appId: "1:148643314098:web:fd730b7d111f5fd374ccab",
  measurementId: "G-Y61XRHTJ3Y"
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    console.log(`Initializing Test Environment v${APP_VERSION}`);
    const statusText = document.querySelector('#connection-status span');
    const statusIcon = document.querySelector('#connection-status i');
    const statusDiv = document.getElementById('connection-status');

    try {
        // 1. Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();

        // 2. Test Connection
        // We try to fetch the 'system' doc, or just wait for online status
        statusText.textContent = "Checking Cloud...";
        
        // Simple ping to see if we can read anything or if we are online
        // Using a timeout to prevent infinite "Connecting..."
        const connectionPromise = db.collection('stores').doc('classroom_cafe_main').get();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 5000));

        await Promise.race([connectionPromise, timeoutPromise])
            .then(() => {
                statusText.textContent = "Connected (Test Mode)";
                statusIcon.className = "fas fa-wifi";
                statusDiv.style.color = "#2ecc71"; // Green
                loadUsers();
            })
            .catch((e) => {
                console.warn("Cloud check slow/failed:", e);
                throw e;
            });

    } catch (error) {
        console.error("Offline/Init Error:", error);
        statusText.textContent = "Offline Mode";
        statusIcon.className = "fas fa-exclamation-triangle";
        statusDiv.style.color = "#e74c3c"; // Red
        
        // Load fallback users so app is still usable
        renderPlaceholderUsers();
    }

    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('kiosk-btn').addEventListener('click', () => {
        alert("Kiosk Mode (Test) - Functionality would load here.");
    });

    // Admin Buttons
    document.getElementById('manager-btn').addEventListener('click', () => openPinModal('Manager'));
    document.getElementById('it-btn').addEventListener('click', () => openPinModal('IT Support'));
}

// --- User Logic ---
function loadUsers() {
    const grid = document.getElementById('user-list');
    grid.innerHTML = ''; 

    // In a real app, you might fetch this list from Firestore:
    // db.collection('users').where('role', '==', 'student').get()...
    
    // For now, we use the standard list:
    const students = ['Alex', 'Brianna', 'Jordan', 'Casey'];
    
    students.forEach(name => {
        const div = document.createElement('div');
        div.className = 'user-container';
        div.innerHTML = `
            <div class="user-avatar">${name.substring(0,2).toUpperCase()}</div>
            <div style="margin-top:8px; font-weight:bold;">${name}</div>
        `;
        div.onclick = () => alert(`Login attempt: ${name}`);
        grid.appendChild(div);
    });
}

function renderPlaceholderUsers() {
    loadUsers(); // Uses the same hardcoded list for now
}

// --- PIN System (Fixed) ---

function openPinModal(role) {
    currentAdminTarget = role;
    document.getElementById('pin-target-text').textContent = `Enter PIN for ${role}`;
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-modal').style.display = 'flex';
}

// Global functions for HTML onclick attributes
window.togglePinModal = (show) => {
    document.getElementById('pin-modal').style.display = show ? 'flex' : 'none';
    if (!show) currentAdminTarget = null;
}

window.pinPad = (num) => {
    const input = document.getElementById('pin-input');
    if (input.value.length < 6) input.value += num;
}

window.pinAction = (action) => {
    const input = document.getElementById('pin-input');
    if (action === 'clear') input.value = '';
    if (action === 'enter') verifyPin(input.value);
}

async function verifyPin(enteredPin) {
    // Hardcoded PINs for Testing
    const MANAGER_PIN = '1234';
    const IT_PIN = '9999';

    let isValid = false;
    if (currentAdminTarget === 'Manager' && enteredPin === MANAGER_PIN) isValid = true;
    if (currentAdminTarget === 'IT Support' && enteredPin === IT_PIN) isValid = true;

    if (isValid) {
        window.togglePinModal(false);
        setTimeout(() => {
            alert(`SUCCESS: Logged in as ${currentAdminTarget}`);
            // Here you would redirect: window.location.href = 'manager_dashboard.html';
        }, 100);
    } else {
        alert("Incorrect PIN. (Hint: Manager=1234, IT=9999)");
        document.getElementById('pin-input').value = '';
    }
}
