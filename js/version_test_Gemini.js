/* Star Academy Version Control */

const CURRENT_VERSION = "v1.94";
const BUILD_DATE = new Date().toLocaleDateString();

console.log(`Version Controller: Loaded ${CURRENT_VERSION}`);

document.addEventListener('DOMContentLoaded', () => {
    // Update login screen
    const vDisplay = document.getElementById('version-display');
    if(vDisplay) vDisplay.textContent = `(${CURRENT_VERSION})`;

    // Update IT screen
    const itDisplay = document.getElementById('it-version-display');
    if(itDisplay) itDisplay.textContent = `${CURRENT_VERSION} [Build: ${BUILD_DATE}]`;
});
