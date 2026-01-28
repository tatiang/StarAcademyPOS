/* FILE: js/main_test_Gemini.js
   PURPOSE: Main entry point. Handles navigation and startup.
   FIX: Added robust checks for TimeClock and Barista module names.
*/

window.app.router = {
    
    init: function() {
        console.log("System Boot: " + window.app.version);
        
        // 1. Initialize Database & Load Data
        window.app.database.init(() => {
            // 2. Render Sidebar Version
            const verEl = document.getElementById('app-version');
            if(verEl) verEl.innerText = window.app.version;

            // 3. Start Default View (POS)
            this.navigate('pos'); 
        });
    },

    navigate: function(viewName) {
        
        // A. Hide all views
        document.querySelectorAll('.view').forEach(el => el.style.display = 'none');
        
        // B. Update Sidebar Buttons
        document.querySelectorAll('.nav-links li').forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = document.getElementById(`nav-${viewName}`);
        if(activeBtn) activeBtn.classList.add('active');

        // C. Show Selected View & Initialize Module
        const viewId = `view-${viewName}`;
        const viewEl = document.getElementById(viewId);
        
        if(viewEl) {
            viewEl.style.display = 'block';
            
            // --- MODULE ROUTER (The Fix is Here) ---
            
            // 1. POS Check
            if(viewName === 'pos') {
                if(window.app.posScreen) window.app.posScreen.init();
                else if(window.app.pos) window.app.pos.init();
            }

            // 2. Barista Check (Checks for 'barista' OR 'baristaView')
            else if(viewName === 'barista') {
                if(window.app.barista) window.app.barista.init();
                else if(window.app.baristaView) window.app.baristaView.init(); // Fallback
                else console.error("Barista module missing");
            }

            // 3. Manager Check
            else if(viewName === 'manager') {
                if(window.app.managerHub) window.app.managerHub.init();
            }

            // 4. IT Check
            else if(viewName === 'it') {
                if(window.app.itHub) window.app.itHub.render();
            }

            // 5. Inventory Check
            else if(viewName === 'inventory') {
                if(window.app.inventory) window.app.inventory.init();
            }

            // 6. Time Clock Check (Checks for 'timeclock' OR 'timeClock')
            else if(viewName === 'timeclock') {
                 if(window.app.timeclock) window.app.timeclock.init();
                 else if(window.app.timeClock) window.app.timeClock.init(); // Fallback
                 else console.error("Timeclock module missing");
            }

            // 7. Dashboard Check
            else if(viewName === 'dashboard') {
                 if(window.app.dashboard) window.app.dashboard.init();
            }

        } else {
            console.error("View container not found: " + viewId);
        }
    }
};

// Start the App when page loads
window.onload = function() {
    window.app.router.init();
};
