export const APP_VERSION = "1.63"; 
export const BUILD_DATE = "Jan 16, 2026";

export function displayVersion() {
    const isTest = window.location.pathname.includes("_test");
    const label = isTest ? `v${APP_VERSION} (TESTING)` : `v${APP_VERSION}`;
    
    console.log(`System Loaded: ${label}`);
    
    // Auto-update Sidebar
    const sidebarVer = document.querySelector('.sidebar-version');
    if(sidebarVer) sidebarVer.innerText = label;
    
    // Auto-update Login Screen
    const loginVer = document.getElementById('login-version-text');
    if(loginVer) loginVer.innerText = label;

    // Auto-update IT Hub
    const itVer = document.getElementById('it-version-display');
    if(itVer) itVer.innerText = label;
}
