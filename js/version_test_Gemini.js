// Rising Star Cafe POS — TEST build metadata
// v1.76
(function(){
  window.RSCPOS = {
    appName: 'Rising Star Cafe POS',
    version: 'v1.76',
    build: 'TEST_Gemini_FullPOS'
  };
  // (Render logic omitted for brevity, same as before)
  function render(){
      var el = document.getElementById('versionLabel');
      if (el) el.textContent = window.RSCPOS.version + ' (' + window.RSCPOS.build + ')';
      var footer = document.getElementById('footerBuild');
      if (footer) footer.textContent = window.RSCPOS.appName + ' — ' + window.RSCPOS.version + ' (' + window.RSCPOS.build + ')';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
