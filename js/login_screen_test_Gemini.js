/* FILE: js/login_screen_test_Gemini.js
   PURPOSE: Manages the login overlay, PIN validation, and user sessions.
*/

window.app.loginScreen = {

    // 1. Initialize: Render the employee buttons
    init: function() {
        this.renderEmployeeButtons();
    },

    // 2. Dynamically create buttons for each employee
    renderEmployeeButtons: function() {
        const container = document.querySelector('.login-grid');
        if(!container) return;

        // Clear existing hardcoded buttons (keeps the UI clean)
        container.innerHTML = '';

        // A. Always add the Kiosk Mode button first
        const kioskBtn = document.createElement('button');
        kioskBtn.className = 'btn-pay';
        kioskBtn.style.cssText = "background:var(--space-indigo); border:1px solid rgba(255,255,255,0.2); margin-bottom:10px;";
        kioskBtn.innerHTML = '<i class="fa-solid fa-tablet-screen-button"></i> Customer Kiosk Mode';
        kioskBtn.onclick = () => this.startKioskMode();
        container.appendChild(kioskBtn);

        // B. Add a button for each Employee found in the DB
        const employees = window.app.data.employees || [];
        
        if(employees.length === 0) {
            // Fallback if no data exists yet
            container.innerHTML += '<div style="color:#888; text-align:center; padding:10px;">No employees loaded</div>';
        }

        employees.forEach(emp => {
            const btn = document.createElement('button');
            btn.className = 'btn-pay';
            // Styling to make them look like user cards
            btn.style.cssText = "background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); justify-content:flex-start; padding-left:20px; text-align:left;";
            btn.innerHTML = `<i class="fa-solid fa-user" style="margin-right:15px; opacity:0.7;"></i> ${emp.name}`;
            
            // When clicked, prompt for THAT specific user's PIN
            btn.onclick = () => this.promptPin(emp.name, emp.pin); 
            
            container.appendChild(btn);
        });
    },

    // 3. Handle PIN Entry (Updated to handle specific employee PINs)
    promptPin: function(userRole, correctPin = null) {
        // If it's a known admin role, set hardcoded PINs (for testing)
        if(userRole === 'Manager' && !correctPin) correctPin = '1234';
        if(userRole === 'IT Support' && !correctPin) correctPin = '9999';

        const modal = document.getElementById('modal-pin');
        const content = modal.querySelector('.modal-content');

        content.innerHTML = `
            <h2 style="color:var(--space-indigo); margin-bottom:15px;">Hello, ${userRole}</h2>
            <p>Enter your PIN to access the system</p>
            <input type="password" id="pin-input" class="form-control" style="text-align:center; letter-spacing:8px; font-size:1.5rem; margin-bottom:20px;" maxlength="4" autofocus>
            
            <div class="pin-pad">
                <button onclick="window.app.loginScreen.appendPin('1')">1</button>
                <button onclick="window.app.loginScreen.appendPin('2')">2</button>
                <button onclick="window.app.loginScreen.appendPin('3')">3</button>
                <button onclick="window.app.loginScreen.appendPin('4')">4</button>
                <button onclick="window.app.loginScreen.appendPin('5')">5</button>
                <button onclick="window.app.loginScreen.appendPin('6')">6</button>
                <button onclick="window.app.loginScreen.appendPin('7')">7</button>
                <button onclick="window.app.loginScreen.appendPin('8')">8</button>
                <button onclick="window.app.loginScreen.appendPin('9')">9</button>
                <button onclick="window.app.loginScreen.clearPin()" style="background:#e74c3c; color:white;">C</button>
                <button onclick="window.app.loginScreen.appendPin('0')">0</button>
                <button onclick="window.app.loginScreen.checkPin('${correctPin}', '${userRole}')" style="background:var(--success); color:white;">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
            <button class="btn-sm" style="margin-top:15px; width:100%; background:#ccc; color:#333;" onclick="window.app.helpers.closeModal('modal-pin')">Cancel</button>
        `;

        window.app.helpers.openModal('modal-pin');
        setTimeout(() => document.getElementById('pin-input').focus(), 100);
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
        
        if(input.value === correctPin) {
            // SUCCESS: Login
            window.app.helpers.closeModal('modal-pin');
            this.completeLogin(userRole);
        } else {
            // FAILURE: Shake effect
            input.style.border = "2px solid red";
            input.value = '';
            input.placeholder = "Try Again";
            setTimeout(() => input.style.border = "1px solid #ddd", 1000);
        }
    },

    completeLogin: function(userRole) {
        // 1. Hide Overlay
        document.getElementById('login-overlay').style.display = 'none';
        
        // 2. Update Header
        document.getElementById('header-cashier').innerText = `Cashier: ${userRole}`;
        
        // 3. Show Admin Links if needed
        const mgrLink = document.getElementById('nav-manager');
        const itLink = document.getElementById('nav-it');
        
        if(userRole === 'Manager') {
            if(mgrLink) mgrLink.style.display = 'block';
            if(itLink) itLink.style.display = 'none';
        } else if (userRole === 'IT Support') {
            if(mgrLink) mgrLink.style.display = 'block';
            if(itLink) itLink.style.display = 'block';
        } else {
            // Regular staff
            if(mgrLink) mgrLink.style.display = 'none';
            if(itLink) itLink.style.display = 'none';
        }
    },

    logout: function() {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('header-cashier').innerText = "Not Logged In";
        
        // Re-render buttons just in case new employees were added during the session
        this.renderEmployeeButtons();
    },

    startKioskMode: function() {
        document.getElementById('login-overlay').style.display = 'none';
        window.app.router.navigate('kiosk');
        
        // Initialize Kiosk products
        const container = document.getElementById('kiosk-grid');
        if(container && window.app.posScreen) {
             // Reuse POS render logic but simplify it? 
             // For now, simple clone of POS grid logic or placeholder
             container.innerHTML = document.getElementById('pos-grid').innerHTML;
        }
    },

    exitKioskMode: function() {
        window.app.router.navigate('pos'); // Reset view
        document.getElementById('login-overlay').style.display = 'flex';
    }
};
