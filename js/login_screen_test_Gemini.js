/* FILE: js/login_screen_test_Gemini.js
   PURPOSE: Login Logic. Uses new CSS classes for styling.
*/

window.app.loginScreen = {
    lastMod: "Jan 28 • 10:45 PM",
    targetRole: "", 

    init: function() {
        console.log("✅ Gemini test JS loaded at", new Date().toISOString());
      alert("Gemini test JS loaded");

       console.log("Login Screen Initializing...");
        
        // 1. Locate the container
        let container = document.querySelector('.login-box') || document.querySelector('.login-card-body');
        
        // If we can't find the specific box, find the overlay and create the box inside it
        if (!container) {
            const overlay = document.getElementById('login-overlay');
            if(overlay) {
                // Clear overlay but KEEP the logo image if it exists
                const img = overlay.querySelector('img');
                overlay.innerHTML = ''; 
                if(img) overlay.appendChild(img);
                
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

        // 1. Header
        const title = document.createElement('h2');
        title.innerText = "System Login";
        title.style.marginBottom = "5px";
        container.appendChild(title);

        // 2. Status / Timestamp
        const status = document.createElement('div');
        status.style.cssText = "color:#ccc; font-size:0.85rem; margin-bottom:20px;";
        status.innerHTML = `<span style="color:#2ecc71">● Ready</span> <span style="margin-left:8px;">Updated: ${this.lastMod}</span>`;
        container.appendChild(status);

        // 3. Kiosk Mode
        const kioskBtn = document.createElement('button');
        kioskBtn.className = 'btn-kiosk';
        kioskBtn.innerHTML = '<i class="fa-solid fa-tablet-screen-button"></i> Customer Kiosk Mode';
        kioskBtn.onclick = () => this.startKioskMode();
        container.appendChild(kioskBtn);

        // 4. Employee List (Buttons)
        const staffHeader = document.createElement('div');
        staffHeader.className = 'admin-divider';
        staffHeader.innerHTML = '<span>SELECT CASHIER</span>';
        container.appendChild(staffHeader);

        let employees = window.app.data.employees || [];
        if(employees.length === 0) employees = [{name:'Sarah'}, {name:'Mike'}, {name:'Jasmine'}];

        employees.forEach(emp => {
            const btn = document.createElement('button');
            btn.className = 'btn-employee'; // Uses the new CSS class
            btn.innerHTML = `<i class="fa-solid fa-user"></i> ${emp.name}`;
            btn.onclick = () => this.completeLogin(emp.name);
            container.appendChild(btn);
        });

        // 5. Admin Section
        const adminHeader = document.createElement('div');
        adminHeader.className = 'admin-divider';
        adminHeader.innerHTML = '<span>ADMINISTRATION</span>';
        container.appendChild(adminHeader);

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

        // 6. Forgot PIN Link
        const forgotDiv = document.createElement('div');
        forgotDiv.style.textAlign = 'center';
        forgotDiv.innerHTML = `
            <a href="mailto:tatiangreenleaf@gmail.com?subject=POS PIN Reset Request&body=I need to reset the PIN for the Manager or IT account." 
               style="color:#3498db; font-size:0.85rem; text-decoration:none;">
               Forgot PIN?
            </a>
        `;
        container.appendChild(forgotDiv);
    },

    // --- LOGIC REMAINS THE SAME ---
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
