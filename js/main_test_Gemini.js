/* FILE: js/main_test_Gemini.js */

document.addEventListener('DOMContentLoaded', () => {
    console.log(`System Boot: ${window.app.version}`);

    if(window.app.database.loadLocal) window.app.database.loadLocal();

    window.app.router = {
        navigate: function(viewId) {
            // UI Toggle
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
            
            const viewEl = document.getElementById('view-' + viewId);
            if(viewEl) viewEl.classList.add('active');
            
            const navEl = document.getElementById('nav-' + viewId);
            if(navEl) navEl.classList.add('active');

            // Trigger Module Logic
            if(viewId === 'pos' && window.app.posScreen) window.app.posScreen.init();
            if(viewId === 'timeclock' && window.app.timeClock) window.app.timeClock.render();
            if(viewId === 'manager' && window.app.managerHub) window.app.managerHub.init();
            if(viewId === 'barista' && window.app.barista) window.app.barista.init();
            if(viewId === 'inventory' && window.app.inventory) window.app.inventory.init();
            if(viewId === 'dashboard' && window.app.dashboard) window.app.dashboard.init();
            if(viewId === 'it' && window.app.itHub && window.app.itHub.render) window.app.itHub.render();
        }
    };

    if(window.app.database.init) window.app.database.init();

    setInterval(() => {
        const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const el = document.getElementById('live-clock');
        if(el) el.textContent = t;
    }, 1000);
});
