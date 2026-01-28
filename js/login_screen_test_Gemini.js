/* FILE: js/login_screen_test_Gemini.js
   PURPOSE: Manages login. STAFF NO LONGER NEED PINS. FIXES PIN PAD VISUALS.
*/

window.app.loginScreen = {

    init: function() {
        // 1. Force the status text to update immediately
        const statusEl = document.getElementById('login-version');
        if(statusEl) {
            statusEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> System Ready • ${window.app.version}`;
            statusEl.style.color = 'white';
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
        kioskBtn.style.cssText = "background:var(--space-indigo); border:1px solid rgba(255,255,255,0.2); margin-bottom:15px;";
        kioskBtn.innerHTML = '<i class="fa-solid fa-tablet-screen-button"></i> Customer Kiosk Mode';
        kioskBtn.onclick = () => this.startKioskMode();
        container.appendChild(kioskBtn);

        // B. Admin Section (Manager & IT - THESE REQUIRE PINS)
        const adminDiv = document.createElement('div');
        adminDiv.innerHTML = `
            <div class="admin-divider"><span>ADMIN ACCESS (PIN REQUIRED)</span></div>
            <div class="admin-buttons-row">
                <div class="admin-login-btn" onclick="window.app.loginScreen.promptPin('Manager', '1234')">
                    <i class="fa-solid fa-user-tie"></i> Manager
                </div>
                <div class="admin-login-btn" onclick="window.app.loginScreen.promptPin('IT Support', '9753')">
                    <i class="fa-solid fa-microchip"></i> IT Support
                </div>
            </div>
            <div class="admin-divider" style="margin-top:15px;"><span>STAFF QUICK LOGIN</span></div>
        `;
        container.appendChild(adminDiv);

        // C. Employee Buttons (NO PINS)
        let employees = window.app.data.employees || [];
        if(employees.length === 0) {
            employees = [ { name: 'Sarah' }, { name: 'Mike' }, { name: 'Jasmine' } ];
            window.app.data.employees = employees;
            window.app.database.saveLocal();
        }

        employees.forEach(emp => {
            const btn = document.createElement('button');
            btn.className = 'btn-pay'; 
            btn.style.cssText = "background:rgba(46, 204, 113, 0.15); border:1px solid rgba(46, 204, 113, 0.4); justify-content:flex-start; padding-left:20px; text-align:left; margin-bottom:8px;";
            btn.innerHTML = `<i class="fa-solid fa-id-badge" style="margin-right:15px; color:#2ecc71;"></i> ${emp.name}`;
            // DIRECT LOGIN - NO PIN
            btn.onclick = () => this.completeLogin(emp.name); 
            container.appendChild(btn);
        });
    },

    // --- PIN PAD LOGIC (STYLES FIXED) ---
    promptPin: function(userRole, correctPin) {
        const modal = document.getElementById('modal-pin');
        const content = modal.querySelector('.modal-content');

        // Styles for the buttons
        const btnStyle = "padding: 20px 0; font-size: 1.6rem; background: white; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; color: #2c3e50; font-weight: bold; width:100%; touch-action: manipulation;";
        const btnRed = "background: #e74c3c; color: white; border:none;";
        const btnGreen = "background: #2ecc71; color: white; border:none;";

        content.innerHTML = `
            <h2 style="color:var(--space-indigo); margin-bottom:15px;">${userRole} Access</h2>
            
            <input type="password" id="pin-input" readonly 
                style="width:80%; padding:15px; font-size:2rem; text-align:center; letter-spacing:10px; border:2px solid #3498db; border-radius:8px; margin-bottom:25px; background:white; color:#333;">
            
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; max-width:320px; margin:0 auto;">
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
                <button style="${btnStyle} ${btnGreen}" onclick="window.app.loginScreen.checkPin('${correctPin}', '${userRole}')"><i class="fa-solid fa-check"></i></button>
            </div>
            
            <button class="btn-sm" style="margin-top:20px; width:100%; background:transparent; color:#888; border:none;" onclick="window.app.helpers.closeModal('modal-pin')">Cancel</button>
        `;
        window.app.helpers.openModal('modal-pin');
    },

    appendPin: function(num) {
        const input = document.getElementById('pin-input');
        if(input.value.length < 4) input.value += num;
    },

    clearPin: function() {
        document.getElementById('pin-input').value = '';
    },

    checkPin: function(correctPin, userRole) {
        const input = document.getElementById('pin-input');
        // Ensure strictly string comparison to avoid type errors
        if(input.value.toString() === correctPin.toString()) {
            window.app.helpers.closeModal('modal-pin');
            this.completeLogin(userRole);
        } else {
            // Shake / Error effect
            input.style.borderColor = "#e74c3c";
            input.style.background = "#fadbd8";
            setTimeout(() => {
                input.value = '';
                input.style.borderColor = "#3498db";
                input.style.background = "white";
            }, 600);
        }
    },

    completeLogin: function(userRole) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('header-cashier').innerText = `Cashier: ${userRole}`;
        
        const mgrLink = document.getElementById('nav-manager');
        const itLink = document.getElementById('nav-it');
        
        // Hide admin links by default
        if(mgrLink) mgrLink.style.display = 'none';
        if(itLink) itLink.style.display = 'none';

        // Show based on role
        if(userRole === 'Manager' || userRole === 'IT Support') {
            if(mgrLink) mgrLink.style.display = 'block';
        }
        if(userRole === 'IT Support') {
            if(itLink) itLink.style.display = 'block';
        }
    },

    logout: function() {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('header-cashier').innerText = "Not Logged In";
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
