/* FILE: js/login_screen_test_Gemini.js
   PURPOSE: Login Logic, UI Styling, Authentication.
   FIX: 
    1. Uses "Style Injection" to force the Logo change (Rounded Rect).
    2. Hunts down the Login Card by text content to ensure it renders.
    3. Clears the "Initializing" text by rebuilding the whole interface.
*/

window.app.loginScreen = {
    buildTimestamp: "Jan 28 • 10:30 PM",
    targetRole: "", 

    init: function() {
        console.log("Gemini Login Screen: Starting Init...");

        // --- STEP 1: FORCE STYLES (Logo & Layout) ---
        // We inject a CSS block to guarantee the logo changes, 
        // regardless of what the old code tries to do.
        const styleId = 'gemini-login-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                /* 1. Force Logo to be larger and Rounded Rectangle */
                .login-header img, img[src*="logo"], .logo-container img {
                    border-radius: 25px !important; /* Rounded, not oval */
                    width: 200px !important;        /* Much larger */
                    height: auto !important;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    margin-bottom: 20px;
                    transition: transform 0.3s ease;
                }
                .login-header img:hover { transform: scale(1.05); }

                /* 2. Make the Login Card wider */
                .login-card, .card, .auth-container {
                    max-width: 450px !important;
                    width: 90% !important;
                }
            `;
            document.head.appendChild(style);
        }

        // --- STEP 2: FIND THE UI CONTAINER ---
        // We look for the container that holds the text "System Login"
        let container = this.findLoginContainer();

        if (container) {
            // Found it! Now we completely wipe it and rebuild it.
            // This guarantees "Initializing..." is gone.
            this.renderNewInterface(container);
        } else {
            console.error("Gemini Error: Could not find the Login Card element.");
        }
    },

    // Helper to find the white card on screen
    findLoginContainer: function() {
        // Try standard selectors first
        let el = document.querySelector('.login-grid') || document.querySelector('.login-card-body');
        
        // If not found, hunt by text content (Nuclear option)
        if (!el) {
            const allDivs = document.querySelectorAll('div');
            for (let div of allDivs) {
                if (div.innerText && div.innerText.includes("System Login")) {
                    // We found the header, return its parent or the div itself
                    return div; 
                }
            }
        }
        return el;
    },

    // --- STEP 3: RENDER THE NEW INTERFACE ---
    renderNewInterface: function(container) {
        // Clear EVERYTHING inside the card
        container.innerHTML = '';

        // 1. Re-add the Title
        const title = document.createElement('h2');
        title.style.cssText = "text-align:center; margin-bottom:5px; color:#333;";
        title.innerText = "System Login";
        container.appendChild(title);

        // 2. Add Status (Replaces Initializing...)
        const status = document.createElement('div');
        status.id = 'login-version';
        status.style.cssText = "text-align:center; color:#2ecc71; font-size:0.9rem; margin-bottom:20px;";
        status.innerHTML = `<i class="fa-solid fa-circle-check"></i> System Ready <span style="color:#ccc; font-size:0.8em;">(v${this.buildTimestamp})</span>`;
        container.appendChild(status);

        // 3. Kiosk Button
        const kioskBtn = document.createElement('button');
        kioskBtn.className = 'btn-pay'; // Use existing class for style
        kioskBtn.style.cssText = "background:var(--space-indigo, #2c3e50); color:white; width:100%; padding:12px; border-radius:8px; border:none; margin-bottom:15px; font-size:1.1rem; cursor:pointer;";
        kioskBtn.innerHTML = '<i class="fa-solid fa-tablet-screen-button"></i> Customer Kiosk Mode';
        kioskBtn.onclick = () => this.startKioskMode();
        container.appendChild(kioskBtn);

        // 4. Admin Section (Manager / IT)
        const adminDiv = document.createElement('div');
        adminDiv.innerHTML = `
            <div style="border-top:1px solid #eee; margin:15px 0; padding-top:10px; color:#aaa; font-size:0.8rem; text-align:center; letter-spacing:1px;">ADMINISTRATION</div>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <button onclick="window.app.loginScreen.promptPin('Manager')" style="flex:1; padding:12px; background:#f0f0f0; border:1px solid #ddd; border-radius:8px; cursor:pointer; color:#555; font-weight:bold;">
                    <i class="fa-solid fa-user-tie"></i> Manager
                </button>
                <button onclick="window.app.loginScreen.promptPin('IT Support')" style="flex:1; padding:12px; background:#f0f0f0; border:1px solid #ddd; border-radius:8px; cursor:pointer; color:#555; font-weight:bold;">
                    <i class="fa-solid fa-microchip"></i> IT Support
                </button>
            </div>
             <div style="text-align:center; margin-bottom:15px;">
                <a href="mailto:tatiangreenleaf@gmail.com?subject=POS PIN Reset Request&body=I need to reset the PIN for the Manager or IT account." 
                   style="color:#3498db; font-size:0.8rem; text-decoration:none;">
                   Forgot PIN?
                </a>
            </div>
        `;
        container.appendChild(adminDiv);

        // 5. Employee Section
        const staffDiv = document.createElement('div');
        staffDiv.innerHTML = `<div style="border-top:1px solid #eee; margin:15px 0 10px 0; padding-top:10px; color:#aaa; font-size:0.8rem; text-align:center; letter-spacing:1px;">STAFF LOGIN</div>`;
        container.appendChild(staffDiv);

        // Get Employees or Default
        let employees = window.app.data ? window.app.data.employees : [];
        if(!employees || employees.length === 0) {
            employees = [ { name: 'Sarah' }, { name: 'Mike' }, { name: 'Jasmine' } ];
        }

        employees.forEach(emp => {
            const btn = document.createElement('button');
            btn.style.cssText = "width:100%; padding:14px; background:rgba(46, 204, 113, 0.1); border:1px solid #2ecc71; border-radius:8px; margin-bottom:8px; text-align:left; color:#27ae60; font-size:1.1rem; font-weight:bold; cursor:pointer; display:flex; align-items:center;";
            btn.innerHTML = `<i class="fa-solid fa-id-badge" style="margin-right:15px;"></i> ${emp.name}`;
            btn.onclick = () => this.completeLogin(emp.name);
            container.appendChild(btn);
        });
    },

    // --- PIN MODAL LOGIC (Unchanged & Stable) ---
    promptPin: function(userRole) {
        this.targetRole = userRole;
        // Logic to show modal...
        const modal = document.getElementById('modal-pin');
        const content = modal.querySelector('.modal-content');
        
        modal.style.background = "rgba(0,0,0,0.85)";
        content.style.background = "#1c1c1e"; 
        content.style.color = "white";
        content.style.border = "1px solid #333";
        content.style.borderRadius = "20px";

        const btnStyle = "width:70px; height:70px; border-radius:50%; border:none; background:rgba(255,255,255,0.15); color:white; font-size:24px; cursor:pointer; display:flex; align-items:center; justify-content:center; margin:0 auto;";

        content.innerHTML = `
            <div style="padding:10px;">
                <h3 style="margin-bottom:10px; font-weight:normal;">${userRole}</h3>
                <input type="password" id="pin-input" readonly autocomplete="off" style="background:transparent; border:none; color:white; font-size:3rem; letter-spacing:15px; text-align:center; width:100%; margin-bottom:30px; outline:none; -webkit-text-security:disc;">
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; justify-content:center;">
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('1')">1</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('2')">2</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('3')">3</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('4')">4</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('5')">5</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('6')">6</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('7')">7</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('8')">8</button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('9')">9</button>
                    <button style="${btnStyle} background:#e74c3c;" onclick="window.app.loginScreen.clearPin()"><i class="fa-solid fa-xmark"></i></button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('0')">0</button>
                    <button style="${btnStyle} background:#2ecc71;" onclick="window.app.loginScreen.checkPin()"><i class="fa-solid fa-check"></i></button>
                </div>
                <button style="margin-top:20px; background:transparent; border:none; color:#888; width:100%; font-size:1rem;" onclick="window.app.helpers.closeModal('modal-pin')">Cancel</button>
            </div>
        `;
        window.app.helpers.openModal('modal-pin');
    },

    appendPin: function(n) { document.getElementById('pin-input').value += n; },
    clearPin: function() { document.getElementById('pin-input').value = ''; },
    
    checkPin: function() {
        const entered = document.getElementById('pin-input').value;
        const PINS = { 'Manager': '1234', 'IT Support': '9753' };
        if(entered === PINS[this.targetRole]) {
            window.app.helpers.closeModal('modal-pin');
            this.completeLogin(this.targetRole);
        } else {
            const el = document.getElementById('pin-input');
            el.style.color = '#e74c3c';
            setTimeout(() => { el.value = ''; el.style.color = 'white'; }, 600);
        }
    },

    completeLogin: function(role) {
        document.getElementById('login-overlay').style.display = 'none';
        const header = document.getElementById('header-cashier');
        if(header) header.innerText = `Cashier: ${role}`;
        
        // Handle Sidebar Links
        const mgr = document.getElementById('nav-manager');
        const it = document.getElementById('nav-it');
        if(mgr) mgr.style.display = (role === 'Manager' || role === 'IT Support') ? 'block' : 'none';
        if(it) it.style.display = (role === 'IT Support') ? 'block' : 'none';
    },

    logout: function() {
        document.getElementById('login-overlay').style.display = 'flex';
        this.init(); // Re-run init to rebuild the buttons
    },

    startKioskMode: function() {
        document.getElementById('login-overlay').style.display = 'none';
        window.app.router.navigate('kiosk');
        // Copy POS grid to Kiosk grid if needed
        const pos = document.getElementById('pos-grid');
        const kiosk = document.getElementById('kiosk-grid');
        if(pos && kiosk) kiosk.innerHTML = pos.innerHTML;
    },
    
    exitKioskMode: function() {
        window.app.router.navigate('pos');
        document.getElementById('login-overlay').style.display = 'flex';
    }
};
