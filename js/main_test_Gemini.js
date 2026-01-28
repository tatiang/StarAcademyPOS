/* FILE: js/main_test_Gemini.js
   PURPOSE: Main entry point. Handles navigation and startup.
*/

window.app.main = {
    init: function() {
        console.log("System Boot: " + window.app.version);
        
        // 1. Initialize Database & Load Data
        window.app.database.init(() => {
            // 2. Render Sidebar Version
            const verEl = document.getElementById('app-version');
            if(verEl) verEl.innerText = window.app.version;

            // 3. Start Default View (POS)
            this.switchView('pos');
        });
    },

    // NAVIGATION LOGIC
    switchView: function(viewName) {
        // A. Hide all views
        document.querySelectorAll('.app-view').forEach(el => el.style.display = 'none');
        
        // B. Update Sidebar Buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${viewName}`);
        if(activeBtn) activeBtn.classList.add('active');

        // C. Show Selected View & Initialize Module
        const viewId = `view-${viewName}`;
        const viewEl = document.getElementById(viewId);
        
        if(viewEl) {
            viewEl.style.display = 'block';
            
            // --- MODULE ROUTER ---
            // This triggers the specific logic for each screen
            if(viewName === 'pos') {
                if(window.app.pos) window.app.pos.init();
            }
            else if(viewName === 'kitchen') {
                if(window.app.kitchen) window.app.kitchen.init();
            }
            else if(viewName === 'manager') {
                if(window.app.managerHub) window.app.managerHub.init();
            }
            else if(viewName === 'it') {
                if(window.app.itHub) window.app.itHub.render();
            }
            else if(viewName === 'inventory') {
                // HERE IS THE FIX:
                if(window.app.inventory) window.app.inventory.init();
            }
        } else {
            console.error("View container not found: " + viewId);
        }
    }
};

// Start the App when page loads
window.onload = function() {
    window.app.main.init();
};
