// Rising Star Cafe POS — minimal boot + navigation stubs (TEST_ChatGPT)
// v1.68

function safeAlert(msg){
  // Keep alerts from crashing embedded/blocked contexts.
  try { alert(msg); } catch (_) { console.log(msg); }
}

function wireButtons(){
  const btnKiosk = document.getElementById('btnKiosk');
  const btnManager = document.getElementById('btnManager');
  const btnIT = document.getElementById('btnIT');

  if (btnKiosk) btnKiosk.addEventListener('click', () => window.app.enterKiosk());
  if (btnManager) btnManager.addEventListener('click', () => window.app.login('manager'));
  if (btnIT) btnIT.addEventListener('click', () => window.app.login('it'));
}

// Provide a guaranteed window.app so the buttons ALWAYS do something.
window.app = {
  login(role){
    const fb = window.RSC_FIREBASE || {};
    const cloud = fb.connected ? 'Cloud OK' : 'Cloud NOT connected';
    safeAlert(`Login: ${role.toUpperCase()}\n${cloud}\n${(window.RSCPOS && window.RSCPOS.version) ? window.RSCPOS.version : ''}`);
  },
  enterKiosk(){
    safeAlert(`Entering Kiosk (TEST)\n${(window.RSCPOS && window.RSCPOS.version) ? window.RSCPOS.version : ''}`);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireButtons);
} else {
  wireButtons();
}

console.log('[RSC POS] App loaded', window.RSCPOS);
