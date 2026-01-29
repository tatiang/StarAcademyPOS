/* FILE: js/main_test_Gemini.js
   PURPOSE: Main entry point. Handles navigation and startup.
*/

window.app.router = {
    
    init: function() {
        console.log("System Boot: " + window.app.version);
        
        // 1. Initialize Database & Load Data
        window.app.database.init(() => {
            // 2. Render Sidebar Version
            const verEl = document.getElementById('app-version');
            if(verEl) verEl.innerText = window.app.version;

            // --- THE FIX IS HERE ---
            // 3. Update Login Screen Status and Version
            const loginVerEl = document.getElementById('login-version');
            if(loginVerEl) {
                 // Change text from "Initializing..." to "Ready" and show version
                 loginVerEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> System Ready • ${window.app.version}`;
                 loginVerEl.style.color = 'white'; // Make it stand out more
            }
            // -----------------------

            // 4. Initialize Login Screen (Render Employee Buttons)
            if(window.app.loginScreen) window.app.loginScreen.init();
window.app.loginScreen.show();       // or .render(), .init(), etc.
window.app.loginScreen.renderLogin(); // whichever exists

            // 5. Start Default View (POS) underneath
            this.navigate('pos'); 
        });
    },

    navigate: function(viewName) {
        document.querySelectorAll('.view').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.nav-links li').forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = document.getElementById(`nav-${viewName}`);
        if(activeBtn) activeBtn.classList.add('active');

        const viewId = `view-${viewName}`;
        const viewEl = document.getElementById(viewId);
        
        if(viewEl) {
            viewEl.style.display = 'block';
            
            if(viewName === 'pos') {
                if(window.app.posScreen) window.app.posScreen.init();
                else if(window.app.pos) window.app.pos.init();
            }
            else if(viewName === 'barista') {
                if(window.app.barista) window.app.barista.init();
                else if(window.app.baristaView) window.app.baristaView.init();
            }
            else if(viewName === 'manager') {
                if(window.app.managerHub) window.app.managerHub.init();
            }
            else if(viewName === 'it') {
                if(window.app.itHub) window.app.itHub.render();
            }
            else if(viewName === 'inventory') {
                if(window.app.inventory) window.app.inventory.init();
            }
            else if(viewName === 'timeclock') {
                 if(window.app.timeclock) window.app.timeclock.init();
                 else if(window.app.timeClock) window.app.timeClock.init();
            }
            else if(viewName === 'dashboard') {
                 if(window.app.dashboard) window.app.dashboard.init();
            }
        } else {
            console.error("View container not found: " + viewId);
        }
    }
};

window.onload = function() {
    window.app.router.init();
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.app?.loginScreen?.init) {
    window.app.loginScreen.init();
  }
});
