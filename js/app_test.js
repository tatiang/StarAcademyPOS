/* Star Academy POS - v1.63 (Restored & Patched) */

// --- CONFIGURATION ---
const APP_VERSION = "v1.63";
let currentAdminTarget = null; // Stores 'manager' or 'it'

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log("App Initializing...");

    // 1. Force Offline Message if Firestore hangs (The "Connecting..." Fix)
    setTimeout(() => {
        const statusEl = document.getElementById('connection-status');
        if (statusEl && statusEl.innerText.includes('Connecting')) {
            console.warn("Firestore connection timed out - forcing Offline status");
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline Mode (Local)';
            statusEl.style.color = '#e74c3c';
        }
    }, 4000); // Wait 4 seconds then force it

    // 2. Load Students (Simulated or from Cache)
    loadStudents();

    // 3. Attach Admin Security Listeners (The PIN Fix)
    document.getElementById('manager-btn').onclick = () => openPinModal('Manager');
    document.getElementById('it-btn').onclick = () => openPinModal('IT Support');
}

function loadStudents() {
    const grid = document.getElementById('user-list');
    if(!grid) return;
    
    // v1.63 Data Structure
    const students = [
        { name: "Alex",    role: "student" },
        { name: "Brianna", role: "student" },
        { name: "Jordan",  role: "student" },
        { name: "Casey",   role: "student" }
    ];

    grid.innerHTML = students.map(s => `
        <div class="user-avatar" onclick="alert('Logging in as ${s.name}')">
            ${s.name.substring(0,2).toUpperCase()}
            <div style="font-size:0.8rem; margin-top:5px; color:#333;">${s.name}</div>
        </div>
    `).join('');
}

// --- PIN SYSTEM LOGIC ---

window.openPinModal = (role) => {
    currentAdminTarget = role;
    document.getElementById('pin-target-text').innerText = `Enter PIN for ${role}`;
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-modal').style.display = 'flex';
};

window.togglePinModal = (show) => {
    document.getElementById('pin-modal').style.display = show ? 'flex' : 'none';
};

window.pinPad = (num) => {
    const input = document.getElementById('pin-input');
    if (input.value.length < 6) input.value += num;
};

window.pinAction = (action) => {
    const input = document.getElementById('pin-input');
    if (action === 'clear') input.value = '';
    if (action === 'enter') verifyPin(input.value);
};

window.verifyPin = (enteredPin) => {
    // Hardcoded PINs for protection
    const MANAGER_PIN = '1234';
    const IT_PIN = '9999';

    let isValid = false;
    if (currentAdminTarget === 'Manager' && enteredPin === MANAGER_PIN) isValid = true;
    if (currentAdminTarget === 'IT Support' && enteredPin === IT_PIN) isValid = true;

    if (isValid) {
        togglePinModal(false);
        // Navigate based on role
        if (currentAdminTarget === 'Manager') {
            // Replace with your actual manager screen logic
            alert("Access Granted: Manager Dashboard");
        } else {
             // Replace with your actual IT screen logic
            alert("Access Granted: IT Support");
        }
    } else {
        alert("Incorrect PIN");
        input.value = '';
    }
};

// Global App Object (Preserving v1.63 structure if other files need it)
window.app = {
    refreshUI: () => console.log("UI Refreshed"),
    data: {}
};
