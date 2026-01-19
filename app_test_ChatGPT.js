window.app = {
  login(role) {
    alert(`Login: ${role.toUpperCase()} (v1.67 TEST)`);
  },

  enterKiosk() {
    alert("Entering Customer Kiosk (v1.67 TEST)");
  }
};

console.log("✅ Rising Star Cafe POS loaded", window.RSCPOS);
