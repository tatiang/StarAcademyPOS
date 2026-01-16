export const APP_VERSION = "1.59"; // Change this one number to update everywhere
export const IS_TESTING = window.location.pathname.includes("_test");

export function displayVersion() {
    const v = IS_TESTING ? `${APP_VERSION} (TEST)` : `v${APP_VERSION}`;
    console.log(`System Loaded: ${v}`);
    
    // Update sidebar and login screen automatically
    const sidebarVer = document.querySelector('.sidebar-version');
    if(sidebarVer) sidebarVer.innerText = v;
    
    const loginVer = document.querySelector('.login-version-display');
    if(loginVer) loginVer.innerText = v;
}
