/* FILE: js/main_test_Gemini.js */

document.addEventListener('DOMContentLoaded', () => {
    console.log(`System Boot: ${window.app.version}`);

    // Update Version Text in Sidebar
    const verEl = document.getElementById('app-version');
    if(verEl) verEl.textContent = window.app.version;

    // 1. Load Local Data
    if(window.app.database.loadLocal) window.app.database.loadLocal();

    // 2. Setup Router
    window.app.router = {
        navigate: function(viewId) {
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
            
            const viewEl = document.getElementById('view-' + viewId);
            if(viewEl) viewEl.classList.add('active');
            
            const navEl = document.getElementById('nav-' + viewId);
            if(navEl) navEl.classList.add('active');

            if(viewId === 'pos' && window.app.posScreen.init) window.app.posScreen.init();
            if(viewId === 'timeclock' && window.app.timeClock.render) window.app.timeClock.render();
            if(viewId === 'manager' && window.app.managerHub.init) window.app.managerHub.init();
            if(viewId === 'barista' && window.app.barista.init) window.app.barista.init();
            if(viewId === 'inventory' && window.app.inventory.init) window.app.inventory.init();
            if(viewId === 'dashboard' && window.app.dashboard.init) window.app.dashboard.init();
            if(viewId === 'it' && window.app.itHub.render) window.app.itHub.render();
        }
    };

    // 3. Connect to Cloud
    if(window.app.database.init) window.app.database.init();

    // 4. Clock Loop
    setInterval(() => {
        const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const el = document.getElementById('live-clock');
        if(el) el.textContent = t;
    }, 1000);
});
