/* FILE: js/login_screen_test_Gemini.js
   PURPOSE: Manages login. 
   FIX: 
    1. Reverted to "Lookup Table" logic (like the old version) to fix the 'undefined' error.
    2. Kept the new UI/Design.
    3. Added Timestamp and System Ready status.
*/

window.app.loginScreen = {
    // --- STATIC TIMESTAMP ---
    buildTimestamp: "Jan 28, 2026 • 10:00 PM PST",
    
    // Internal state
    targetRole: "", 

    init: function() {
        console.log(`Login Screen Initialized [Build: ${this.buildTimestamp}]`);
        
        // 1. Update Status Text
        const statusHTML = `
            <i class="fa-solid fa-circle-check" style="color:#2ecc71"></i> 
            System Ready 
            <span style="opacity:0.5; font-size:0.8em; margin-left:10px;">(Bld: ${this.buildTimestamp})</span>
        `;

        const statusEl = document.getElementById('login-version');
        if(statusEl) {
            statusEl.innerHTML = statusHTML;
            statusEl.style.color = '#ccc';
        } else {
            // Robust fallback to find the "Initializing" text
            const allElements = document.querySelectorAll('p, div, span, h3');
            allElements.forEach(el => {
                if(el.innerText && el.innerText.includes('Initializing')) {
                    el.innerHTML = statusHTML;
                    el.style.color = '#ccc';
                }
            });
        }

        this.renderEmployeeButtons();
    },

    renderEmployeeButtons: function() {
        const container = document.querySelector('.login-grid');
        if(!container) return;
        container.innerHTML = '';

        // A. Kiosk Button
        const kioskBtn = document.createElement('button');
        kioskBtn.className = 'btn-pay';
        kioskBtn.style.cssText = "background:var(--space-indigo); border:1px solid rgba(255,255,255,0.2); margin-bottom:15px; font-size:1.2rem;";
        kioskBtn.innerHTML = '<i class="fa-solid fa-tablet-screen-button"></i> Kiosk Mode';
        kioskBtn.onclick = () => this.startKioskMode();
        container.appendChild(kioskBtn);

        // B. Admin Section
        const adminDiv = document.createElement('div');
        // FIX: Removed the explicit PINs from the function calls here. 
        // We now just say "This is the Manager button". The PIN is checked internally later.
        adminDiv.innerHTML = `
            <div class="admin-divider" style="color:#aaa; font-size:0.9rem; margin:15px 0;"><span>ADMIN (PIN REQUIRED)</span></div>
            <div class="admin-buttons-row" style="display:flex; gap:10px;">
                <div class="admin-login-btn" style="flex:1; padding:15px; background:rgba(255,255,255,0.1); text-align:center; border-radius:8px; cursor:pointer;" 
                     onclick="window.app.loginScreen.promptPin('Manager')">
                    <i class="fa-solid fa-user-tie"></i> Mgr
                </div>
                <div class="admin-login-btn" style="flex:1; padding:15px; background:rgba(255,255,255,0.1); text-align:center; border-radius:8px; cursor:pointer;" 
                     onclick="window.app.loginScreen.promptPin('IT Support')">
                    <i class="fa-solid fa-microchip"></i> IT
                </div>
            </div>
            <div class="admin-divider" style="color:#aaa; font-size:0.9rem; margin:15px 0 10px 0;"><span>STAFF (TAP TO LOGIN)</span></div>
        `;
        container.appendChild(adminDiv);

        // C. Employee Buttons
        let employees = window.app.data.employees || [];
        if(employees.length === 0) {
            employees = [ { name: 'Sarah' }, { name: 'Mike' }, { name: 'Jasmine' } ];
            window.app.data.employees = employees;
            window.app.database.saveLocal();
        }

        employees.forEach(emp => {
            const btn = document.createElement('button');
            btn.className = 'btn-pay'; 
            btn.style.cssText = "background:rgba(46, 204, 113, 0.15); border:1px solid rgba(46, 204, 113, 0.4); justify-content:flex-start; padding:15px 20px; text-align:left; margin-bottom:8px; font-size:1.1rem; color:white;";
            btn.innerHTML = `<i class="fa-solid fa-id-badge" style="margin-right:15px; color:#2ecc71;"></i> ${emp.name}`;
            btn.onclick = () => this.completeLogin(emp.name); 
            container.appendChild(btn);
        });
    },

    // --- PIN LOGIC ---
    promptPin: function(userRole) {
        // Save the Role, NOT the PIN. We look up the PIN later.
        this.targetRole = userRole;

        const modal = document.getElementById('modal-pin');
        const content = modal.querySelector('.modal-content');
        
        // Styling configuration
        modal.style.background = "rgba(0,0,0,0.85)";
        content.style.background = "#1c1c1e"; 
        content.style.color = "white";
        content.style.border = "1px solid #333";
        content.style.borderRadius = "20px";
        content.style.maxWidth = "360px";

        // Button Styles
        const btnStyle = "width:70px; height:70px; border-radius:50%; border:none; background:rgba(255,255,255,0.15); color:white; font-size:24px; cursor:pointer; display:flex; align-items:center; justify-content:center; margin:0 auto;";
        const btnGreen = "background:#2ecc71;";
        const btnRed = "background:#e74c3c;";

        content.innerHTML = `
            <div style="padding:10px;">
                <h3 style="margin-bottom:10px; font-weight:normal;">${userRole}</h3>
                
                <input type="password" id="pin-input" readonly autocomplete="off"
                    style="background:transparent; border:none; color:white; font-size:3rem; letter-spacing:15px; text-align:center; width:100%; margin-bottom:30px; outline:none; -webkit-text-security:disc;">
                
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
                    
                    <button style="${btnStyle} ${btnRed}" onclick="window.app.loginScreen.clearPin()"><i class="fa-solid fa-xmark"></i></button>
                    <button style="${btnStyle}" onclick="window.app.loginScreen.appendPin('0')">0</button>
                    <button style="${btnStyle} ${btnGreen}" onclick="window.app.loginScreen.checkPin()"><i class="fa-solid fa-check"></i></button>
                </div>
                
                <button style="margin-top:20px; background:transparent; border:none; color:#888; width:100%; font-size:1rem;" 
                    onclick="window.app.helpers.closeModal('modal-pin')">Cancel</button>
            </div>
        `;
        
        window.app.helpers.openModal('modal-pin');
    },

    appendPin: function(num) {
        const input = document.getElementById('pin-input');
        if(input.value.length < 4) {
            input.value += num;
        }
    },

    clearPin: function() {
        document.getElementById('pin-input').value = '';
    },

    checkPin: function() {
        const input = document.getElementById('pin-input');
        const entered = input.value.toString();
        const userRole = this.targetRole;

        // FIX: Define PINs here (Old Version Logic)
        // This ensures they are NEVER undefined
        const VALID_PINS = {
            'Manager': '1234',
            'IT Support': '9753'
        };

        const correctPin = VALID_PINS[userRole];
        
        console.log(`Checking PIN. Entered: ${entered}, Expected: ${correctPin}`);

        if(entered === correctPin) {
            window.app.helpers.closeModal('modal-pin');
            this.completeLogin(userRole);
        } else {
            // Error animation
            input.style.color = "#e74c3c";
            input.style.transform = "translateX(5px)";
            setTimeout(() => input.style.transform = "translateX(-5px)", 50);
            setTimeout(() => input.style.transform = "translateX(0)", 100);
            
            setTimeout(() => {
                input.value = '';
                input.style.color = "white";
            }, 600);
        }
    },

    completeLogin: function(userRole) {
        document.getElementById('login-overlay').style.display = 'none';
        
        const header = document.getElementById('header-cashier');
        if(header) header.innerText = `Cashier: ${userRole}`;
        
        const mgrLink = document.getElementById('nav-manager');
        const itLink = document.getElementById('nav-it');
        
        if(mgrLink) mgrLink.style.display = 'none';
        if(itLink) itLink.style.display = 'none';

        if(userRole === 'Manager' || userRole === 'IT Support') {
            if(mgrLink) mgrLink.style.display = 'block';
        }
        if(userRole === 'IT Support') {
            if(itLink) itLink.style.display = 'block';
        }
    },

    logout: function() {
        document.getElementById('login-overlay').style.display = 'flex';
        const header = document.getElementById('header-cashier');
        if(header) header.innerText = "Not Logged In";
        this.renderEmployeeButtons();
    },

    startKioskMode: function() {
        document.getElementById('login-overlay').style.display = 'none';
        window.app.router.navigate('kiosk');
        const container = document.getElementById('kiosk-grid');
        const posGrid = document.getElementById('pos-grid');
        if(container && posGrid) container.innerHTML = posGrid.innerHTML;
    },

    exitKioskMode: function() {
        window.app.router.navigate('pos');
        document.getElementById('login-overlay').style.display = 'flex';
    }
};
