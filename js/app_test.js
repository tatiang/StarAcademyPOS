/* Star Academy POS - v1.63 (Patched for Test) */

// --- CONFIGURATION ---
const APP_VERSION = "v1.63 (Patched)";
const TAX_RATE = 0.0925; 

// --- STATE VARIABLES ---
let cart = [];
let currentOrder = null;
let currentCashier = null;
let pinBuffer = "";
let targetRole = "";

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`Initializing Star Academy POS ${APP_VERSION}...`);
    
    try {
        initLoginScreen();
        
        // Update version text
        const versionEl = document.getElementById('login-version-text');
        if(versionEl) versionEl.textContent = APP_VERSION;
        
        // WATCHDOG FIX: If still connecting after 4 seconds, force offline UI
        setTimeout(() => {
            const statusEl = document.getElementById('connection-status');
            if(statusEl && statusEl.innerText.includes('Connecting')) {
                console.warn("Cloud connection timed out - forcing Offline status");
                statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#e74c3c"></i> Offline Mode (Local)';
                statusEl.style.color = '#e74c3c';
            }
        }, 4000);

        setInterval(updateClock, 1000);
        updateClock();

    } catch (err) {
        console.error("CRITICAL INIT ERROR:", err);
    }
});

// --- LOGIN SCREEN LOGIC ---
const STUDENTS = [
    { name: "Alex",    role: "student", img: "images/student1.png" },
    { name: "Brianna", role: "student", img: "images/student2.png" },
    { name: "Jordan",  role: "student", img: "images/student3.png" },
    { name: "Casey",   role: "student", img: "images/student4.png" }
];

function initLoginScreen() {
    const grid = document.getElementById('student-login-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    STUDENTS.forEach(student => {
        const btn = document.createElement('div');
        btn.className = 'login-btn-wrap';
        btn.onclick = () => window.app.login(student.name); // Students don't need PIN
        btn.innerHTML = `
            <img src="${student.img}" class="login-btn-img" onerror="this.src='https://ui-avatars.com/api/?name=${student.name}&background=random'">
            <div class="login-btn-name">${student.name}</div>
        `;
        grid.appendChild(btn);
    });
}

// --- GLOBAL APP FUNCTIONS ---
window.app = {
    // 1. LOGIN
    login: (name) => {
        console.log("Logging in as:", name);
        currentCashier = name;
        document.getElementById('login-overlay').style.display = 'none';
        
        const headerName = document.getElementById('header-cashier');
        if(headerName) headerName.innerHTML = `<i class="fa-solid fa-user-circle" style="margin-right: 10px;"></i> ${name}`;
        
        window.app.navigate('pos');
    },

    logout: () => {
        cart = [];
        currentCashier = null;
        document.getElementById('login-overlay').style.display = 'flex';
        window.app.navigate('pos');
    },

    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        
        const target = document.getElementById('view-' + viewId);
        const nav = document.getElementById('nav-' + viewId);
        
        if(target) target.classList.add('active');
        if(nav) nav.classList.add('active');
    },

    // --- PIN SYSTEM (NEWLY ADDED) ---
    promptPin: (role) => {
        targetRole = role;
        pinBuffer = "";
        document.getElementById('pin-display').textContent = "";
        document.getElementById('modal-pin').classList.add('open');
    },
    
    pinInput: (num) => {
        if(pinBuffer.length < 4) {
            pinBuffer += num;
            document.getElementById('pin-display').textContent = "•".repeat(pinBuffer.length);
        }
    },
    
    pinClear: () => {
        pinBuffer = "";
        document.getElementById('pin-display').textContent = "";
    },
    
    pinSubmit: () => {
        // Hardcoded PINs for protection
        const PINS = { 'Manager': '1234', 'IT Support': '9753' };
        
        if (PINS[targetRole] && pinBuffer === PINS[targetRole]) {
            document.getElementById('modal-pin').classList.remove('open');
            window.app.login(targetRole);
            
            // Navigate to specific admin page
            if(targetRole === 'Manager') window.app.navigate('manager');
            if(targetRole === 'IT Support') window.app.navigate('it');
        } else {
            alert("Incorrect PIN");
            window.app.pinClear();
        }
    },
    
    closeModal: (id) => {
        document.getElementById(id).classList.remove('open');
    },

    // --- OTHER HELPERS (Simplified for brevity but compatible) ---
    startKioskMode: () => {
        document.getElementById('login-overlay').style.display = 'none';
        window.app.navigate('customer');
    },
    exitKioskMode: () => {
        window.app.logout();
    }
};

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('live-clock');
    if(clockEl) clockEl.textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
