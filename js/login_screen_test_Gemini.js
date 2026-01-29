/* FILE: js/login_screen_test_Gemini.js
   PURPOSE: Modern Login Screen with Avatar Buttons & Bulletproof PINs.
*/

window.app.loginScreen = {
    lastMod: "Jan 28 • 11:45 PM",
    targetRole: "", 

    init: function() {
        console.log("Modern Login Screen Initializing...");
        
        // 1. Locate or Create the Container
        let container = document.querySelector('.login-box') || document.querySelector('.login-card-body');
        
        if (!container) {
            const overlay = document.getElementById('login-overlay');
            if(overlay) {
                // Preserve the logo if it exists in the overlay
                const img = overlay.querySelector('img');
                overlay.innerHTML = ''; 
                if(img) overlay.appendChild(img);
                
                // Create the card container
                container = document.createElement('div');
                container.className = 'login-box';
                overlay.appendChild(container);
            }
        }

        if (container) {
            this.renderInterface(container);
        }
    },

    renderInterface: function(container) {
        container.innerHTML = '';

        // 1. Welcome Message
        const title = document.createElement('h2');
        title.innerText = "Welcome Back";
        title.style.margin = "0 0 5px 0";
        title.style.color = "var(--space-indigo)";
        container.appendChild(title);

        const subtitle = document.createElement('div');
        subtitle.innerHTML = `System Ready <span style="font-size:0.8em; opacity:0.5; margin-left:5px;">(Updated: ${this.lastMod})</span>`;
        subtitle.style.color = "#2ecc71";
        subtitle.style.fontSize = "0.9rem";
        subtitle.style.fontWeight = "bold";
        subtitle.style.marginBottom = "20px";
        container.appendChild(subtitle);

        // 2. Employee List (The Main Focus)
        let employees = window.app.data.employees || [];
        // Fallback if empty
        if(employees.length === 0) employees = [{name:'Sarah'}, {name:'Mike'}, {name:'Jasmine'}];

        const empGrid = document.createElement('div');
        empGrid.className = 'employee-grid';

        employees.forEach(emp => {
            // Get Initials for Avatar
            const initial = emp.name.charAt(0).toUpperCase();
            
            const btn = document.createElement('button');
            btn.className = 'btn-employee';
            // Layout: Avatar Circle + Name + Chevron
            btn.innerHTML = `
                <div class="emp-avatar">${initial}</div>
                <span>${emp.name}</span>
                <i class="fa-solid fa-chevron-right" style="margin-left:auto; color:#ccc; font-size:0.8rem;"></i>
            `;
            btn.onclick = () => this.completeLogin(emp.name);
            empGrid.appendChild(btn);
        });
        container.appendChild(empGrid);

        // 3. Admin Section (Subtle)
        const adminRow = document.createElement('div');
        adminRow.className = 'admin-row';
        adminRow.innerHTML = `
            <button class="btn-admin" onclick="window.app.loginScreen.promptPin('Manager')">
                <i class="fa-solid fa-lock"></i> Manager
            </button>
            <button class="btn-admin" onclick="window.app.loginScreen.promptPin('IT Support')">
                <i class="fa-solid fa-tools"></i> IT Support
            </button>
        `;
        container.appendChild(adminRow);

        // 4. Footer Links (Kiosk & Help)
        const footer = document.createElement('div');
        footer.className = 'login-footer-links';
        footer.innerHTML = `
            <button class="link-btn" onclick="window.app.loginScreen.startKioskMode()">
                <i class="fa-solid fa-tablet-button"></i> Kiosk Mode
            </button>
            <a href="mailto:tatiangreenleaf@gmail.com?subject=PIN Reset Request&body=I need to reset the PIN for the Manager or IT account." 
               class="link-btn">
               Forgot PIN?
            </a>
        `;
        container.appendChild(footer);
    },

    // --- PIN LOGIC (Stable Version) ---
    promptPin: function(role) {
        this.targetRole = role;
        const modal = document.getElementById('modal-pin');
        const content = modal.querySelector('.modal-content');
        
        // Rebuild PIN Modal content
        content.innerHTML = `
            <h3 style="text-align:center; margin-top:0;">${role} Access</h3>
            <div style="background:#f0f0f0; padding:15px; border-radius:8px; margin-bottom:15px; text-align:center;">
                <input type="password" id="pin-input" readonly 
                    style="background:transparent; border:none; font-size:2rem; letter-spacing:10px; width:100%; text-align:center; outline:none;">
            </div>
            <div id="pin-pad-grid">
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('1')">1</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('2')">2</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('3')">3</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('4')">4</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('5')">5</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('6')">6</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('7')">7</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('8')">8</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('9')">9</button>
                <button class="pin-btn" style="color:var(--danger);" onclick="window.app.loginScreen.clearPin()">CLR</button>
                <button class="pin-btn" onclick="window.app.loginScreen.appendPin('0')">0</button>
                <button class="pin-btn" style="background:var(--success); color:white;" onclick="window.app.loginScreen.checkPin()">GO</button>
            </div>
            <button onclick="window.app.helpers.closeModal('modal-pin')" style="width:100%; padding:15px; border:none; background:transparent; color:#888; cursor:pointer;">Cancel</button>
        `;
        window.app.helpers.openModal('modal-pin');
    },

    appendPin: function(n) { document.getElementById('pin-input').value += n; },
    clearPin: function() { document.getElementById('pin-input').value = ''; },
    
    checkPin: function() {
        const val = document.getElementById('pin-input').value;
        const PINS = { 'Manager': '1234', 'IT Support': '9753' };
        
        if (val === PINS[this.targetRole]) {
            window.app.helpers.closeModal('modal-pin');
            this.completeLogin(this.targetRole);
        } else {
            const inp = document.getElementById('pin-input');
            inp.style.color = 'red';
            setTimeout(() => { inp.value = ''; inp.style.color = 'black'; }, 500);
        }
    },

    completeLogin: function(role) {
        document.getElementById('login-overlay').style.display = 'none';
        
        // Update Header
        const header = document.getElementById('header-cashier');
        if(header) header.innerText = `Cashier: ${role}`;

        // Show/Hide Nav
        const mgr = document.getElementById('nav-manager');
        const it = document.getElementById('nav-it');
        if(mgr) mgr.style.display = (role === 'Manager' || role === 'IT Support') ? 'block' : 'none';
        if(it) it.style.display = (role === 'IT Support') ? 'block' : 'none';
    },
    
    logout: function() {
        document.getElementById('login-overlay').style.display = 'flex';
        this.init(); 
    },

    startKioskMode: function() {
        document.getElementById('login-overlay').style.display = 'none';
        window.app.router.navigate('kiosk');
        const pos = document.getElementById('pos-grid');
        const kiosk = document.getElementById('kiosk-grid');
        if(pos && kiosk) kiosk.innerHTML = pos.innerHTML;
    }
};
