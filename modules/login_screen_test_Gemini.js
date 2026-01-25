/* FILE: login_screen_test_Gemini.js
   PURPOSE: Handles the Login Overlay, PIN entry, and Logout.
*/

window.app.loginScreen = {
    
    // Internal state for the PIN pad
    pinBuffer: "",
    targetRole: "",

    // 1. Hide the login screen (User logged in)
    login: function(name) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('header-cashier').textContent = name;
        
        // Default to POS view
        window.app.router.navigate('pos');
        
        // Trigger a cloud sync
        window.app.database.sync(5); 
    },

    // 2. Show the login screen (Logout)
    logout: function() {
        document.getElementById('login-overlay').style.display = 'flex';
        // Hide Admin links in sidebar
        document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'none');
    },

    // 3. Show PIN Modal
    promptPin: function(role) {
        this.targetRole = role;
        this.pinBuffer = "";
        
        const modal = document.getElementById('modal-pin');
        const content = modal.querySelector('.modal-content');
        
        // Build PIN Pad HTML
        content.innerHTML = `
            <h3>Enter PIN</h3>
            <div id="pin-display" style="font-size:2rem; text-align:center; background:#eee; padding:10px; border-radius:6px; margin-bottom:10px; height:40px;"></div>
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('1')">1</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('2')">2</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('3')">3</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('4')">4</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('5')">5</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('6')">6</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('7')">7</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('8')">8</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('9')">9</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinClear()" style="background:#e74c3c; color:white;">C</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinInput('0')">0</button>
                <button class="pin-btn" onclick="window.app.loginScreen.pinSubmit()" style="background:#2ecc71; color:white;">OK</button>
            </div>
            <button class="btn-sm" style="width:100%; margin-top:10px;" onclick="window.app.helpers.closeModal('modal-pin')">Cancel</button>
        `;
        
        window.app.helpers.openModal('modal-pin');
    },

    pinInput: function(num) {
        if(this.pinBuffer.length < 4) {
            this.pinBuffer += num;
            document.getElementById('pin-display').textContent = "*".repeat(this.pinBuffer.length);
        }
    },

    pinClear: function() {
        this.pinBuffer = "";
        document.getElementById('pin-display').textContent = "";
    },

    pinSubmit: function() {
        const PINS = { 'Manager': '1234', 'IT Support': '9753' };
        
        if (PINS[this.targetRole] && this.pinBuffer === PINS[this.targetRole]) {
            window.app.helpers.closeModal('modal-pin');
            this.login(this.targetRole);
            
            // Show Admin links
            document.querySelectorAll('.nav-admin-link').forEach(el => el.style.display = 'block');
            
            // Navigate to specific hub
            if (this.targetRole === 'Manager') window.app.router.navigate('manager');
            else window.app.router.navigate('it');
            
        } else {
            alert("Incorrect PIN");
            this.pinClear();
        }
    },

    startKioskMode: function() {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('view-kiosk').style.display = 'block'; // Overlay view
        // Logic to fill kiosk grid would go here or in pos.js
    },

    exitKioskMode: function() {
        this.logout();
        document.getElementById('view-kiosk').style.display = 'none';
    }
};
