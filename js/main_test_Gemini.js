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

            // 3. Start Default View (POS)
            this.navigate('pos'); 
        });
    },

    // NAVIGATION LOGIC
    navigate: function(viewName) {
        
        // A. Hide all views
        // FIX: Changed from '.app-view' to '.view' to match HTML tags
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
            
            // --- MODULE ROUTER ---
            if(viewName === 'pos') {
                if(window.app.posScreen) window.app.posScreen.init();
                else if(window.app.pos) window.app.pos.init();
            }
            else if(viewName === 'barista') {
                if(window.app.barista) window.app.barista.init();
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
            }
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
