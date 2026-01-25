/* FILE: main_test_Gemini.js
   PURPOSE: Entry point. Starts the app once HTML is ready.
*/

document.addEventListener('DOMContentLoaded', () => {
    console.log(`System Boot: ${window.app.version}`);

    // 1. Load data from Browser Memory (LocalStorage)
    if(window.app.database.loadLocal) {
        window.app.database.loadLocal();
    }

    // 2. Define the Navigation Router
    window.app.router = {
        navigate: function(viewId) {
            // Hide all views
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            // Remove active style from sidebar
            document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));

            // Show new view
            const viewEl = document.getElementById('view-' + viewId);
            if(viewEl) viewEl.classList.add('active');

            // Highlight sidebar button
            const navEl = document.getElementById('nav-' + viewId);
            if(navEl) navEl.classList.add('active');

            // Trigger specific screen logic
            if(viewId === 'pos') window.app.posScreen.init();
            if(viewId === 'timeclock') window.app.timeClock.render();
            if(viewId === 'it') window.app.itHub.render();
            if(viewId === 'manager') window.app.managerHub.init();
        }
    };

    // 3. Connect to Cloud (Firestore)
    if(window.app.database.init) {
        window.app.database.init();
    }

    // 4. Update the Clock in header every second
    setInterval(() => {
        const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const el = document.getElementById('live-clock');
        if(el) el.textContent = t;
    }, 1000);
});
