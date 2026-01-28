/* FILE: js/main_test_Gemini.js */

document.addEventListener('DOMContentLoaded', () => {
    console.log(`System Boot: ${window.app.version}`);

    // 1. Update Version Text (Sidebar + Login Screen)
    const sidebarVer = document.getElementById('app-version');
    const loginVer = document.getElementById('login-version');
    
    if(sidebarVer) sidebarVer.textContent = window.app.version;
    if(loginVer) loginVer.textContent = `System Ready • ${window.app.version}`;

    // 2. Load Local Data
    if(window.app.database.loadLocal) window.app.database.loadLocal();

    // 3. Setup Router
    window.app.router = {
        navigate: function(viewId) {
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
            
            const viewEl = document.getElementById('view-' + viewId);
            if(viewEl) viewEl.classList.add('active');
            
            const navEl = document.getElementById('nav-' + viewId);
            if(navEl) navEl.classList.add('active');

            // Trigger specific screen logic
            if(viewId === 'pos' && window.app.posScreen.init) window.app.posScreen.init();
            if(viewId === 'timeclock' && window.app.timeClock.render) window.app.timeClock.render();
            if(viewId === 'manager' && window.app.managerHub.init) window.app.managerHub.init();
            if(viewId === 'dashboard' && window.app.dashboard.init) window.app.dashboard.init();
            if(viewId === 'it' && window.app.itHub.render) window.app.itHub.render();
            if(viewId === 'barista') window.app.baristaView.init();
        }
    };

    // 4. Connect to Cloud
    if(window.app.database.init) window.app.database.init();

    // 5. Clock Loop
    setInterval(() => {
        const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const el = document.getElementById('live-clock');
        if(el) el.textContent = t;
    }, 1000);
});
