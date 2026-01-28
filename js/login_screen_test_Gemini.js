/* FILE: js/login_screen_test_Gemini.js
   PURPOSE: Manages the login overlay, PIN validation, and user sessions.
*/

window.app.loginScreen = {

    init: function() {
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

        // B. Admin Section
        const adminDiv = document.createElement('div');
        adminDiv.innerHTML = `
            <div class="admin-divider"><span>ADMIN ACCESS</span></div>
            <div class="admin-buttons-row">
                <div class="admin-login-btn" onclick="window.app.loginScreen.promptPin('Manager', '1234')">
                    <i class="fa-solid fa-user-tie"></i> Manager
                </div>
                <div class="admin-login-btn" onclick="window.app.loginScreen.promptPin('IT Support', '9753')">
                    <i class="fa-solid fa-microchip"></i> IT Support
                </div>
            </div>
            <div class="admin-divider" style="margin-top:15px;"><span>STAFF LOGIN</span></div>
        `;
        container.appendChild(adminDiv);

        // C. Employee Buttons
        let employees = window.app.data.employees || [];
        if(employees.length === 0) {
            console.log("No employees found in DB. Loading defaults.");
            employees = [ { name: 'Sarah', pin: '1111' }, { name: 'Mike', pin: '2222' } ];
            window.app.data.employees = employees;
            window.app.database.saveLocal();
        }

        employees.forEach(emp => {
            const btn = document.createElement('button');
            btn.className = 'btn-pay'; 
            btn.style.cssText = "background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); justify-content:flex-start; padding-left:20px; text-align:left; margin-bottom:8px;";
            btn.innerHTML = `<i class="fa-solid fa-user" style="margin-right:15px; opacity:0.7;"></i> ${emp.name}`;
            btn.onclick = () => this.promptPin(emp.name, emp.pin); 
            container.appendChild(btn);
        });
    },

    promptPin: function(userRole, correctPin = null) {
        const modal = document.getElementById('modal-pin');
        const content = modal.querySelector('.modal-content');

        // Ensure hardcoded PINs are used if passed (redundant check but safe)
        if(userRole === 'Manager' && !correctPin) correctPin = '1234';
        if(userRole === 'IT Support' && !correctPin) correctPin = '9753';

        content.innerHTML = `
            <h2 style="color:var(--space-indigo); margin-bottom:10px;">Hello, ${userRole}</h2>
            <p style="margin-bottom:15px; color:#666;">Enter PIN to continue</p>
            <input type="password" id="pin-input" readonly 
                style="width:100%; padding:15px; font-size:2rem; text-align:center; letter-spacing:10px; border:2px solid #ddd; border-radius:8px; margin-bottom:20px; background:#f9f9f9;">
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('1')">1</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('2')">2</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('3')">3</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('4')">4</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('5')">5</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('6')">6</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('7')">7</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('8')">8</button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('9')">9</button>
                <button class="btn-pin" onclick="window.app.loginScreen.clearPin()" style="background:#e74c3c; color:white;"><i class="fa-solid fa-xmark"></i></button>
                <button class="btn-pin" onclick="window.app.loginScreen.appendPin('0')">0</button>
                <button class="btn-pin" onclick="window.app.loginScreen.checkPin('${correctPin}', '${userRole}')" style="background:var(--success); color:white;"><i class="fa-solid fa-check"></i></button>
            </div>
            <button class="btn-sm" style="margin-top:15px; width:100%; background:transparent; color:#888; border:none;" onclick="window.app.helpers.closeModal('modal-pin')">Cancel</button>
            <style>
                .btn-pin { padding: 15px 0; font-size: 1.5rem; background: white; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.2s; color: var(--space-indigo); font-weight: bold; }
                .btn-pin:active { background: #eee; transform:scale(0.95); }
            </style>
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
        // Fallback for testing if no PIN provided
        const valid = correctPin ? (input.value === correctPin) : (input.value === '1234');

        if(valid) {
            window.app.helpers.closeModal('modal-pin');
            this.completeLogin(userRole);
        } else {
            input.style.borderColor = "red";
            input.value = '';
            setTimeout(() => input.style.borderColor = "#ddd", 500);
        }
    },

    completeLogin: function(userRole) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('header-cashier').innerText = `Cashier: ${userRole}`;
        
        const mgrLink = document.getElementById('nav-manager');
        const itLink = document.getElementById('nav-it');
        
        if(mgrLink) mgrLink.style.display = (userRole === 'Manager' || userRole === 'IT Support') ? 'block' : 'none';
        if(itLink) itLink.style.display = (userRole === 'IT Support') ? 'block' : 'none';
    },

    logout: function() {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('header-cashier').innerText = "Not Logged In";
        this.renderEmployeeButtons();
    },

    startKioskMode: function() {
        document.getElementById('login-overlay').style.display = 'none';
        window.app.router.navigate('kiosk');
        // Simple clone of POS grid for kiosk view
        const container = document.getElementById('kiosk-grid');
        const posGrid = document.getElementById('pos-grid');
        if(container && posGrid) container.innerHTML = posGrid.innerHTML;
    },

    exitKioskMode: function() {
        window.app.router.navigate('pos');
        document.getElementById('login-overlay').style.display = 'flex';
    }
};
