window.RSCPOS = {
  version: "v1.67",
  build: "TEST_ChatGPT",
  appName: "Rising Star Cafe POS"
};

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("versionLabel");
  if (el) {
    el.textContent = `${RSCPOS.appName} — ${RSCPOS.version} (${RSCPOS.build})`;
  }
});
