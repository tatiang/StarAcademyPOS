/* FILE: js/helpers_test_Gemini.js
   PURPOSE: Useful tools used across the entire app.
*/

window.app.helpers = {
    
    // Tool: Turns a number like 2.5 into "$2.50"
    formatCurrency: (amount) => {
        return "$" + parseFloat(amount).toFixed(2);
    },

    // Tool: Opens a popup window (Modal)
    openModal: (id) => {
        const el = document.getElementById(id);
        if(el) {
            el.classList.add('open'); // Adds the class that forces it visible
            el.style.display = 'flex';
        }
    },

    // Tool: Closes a popup window
    closeModal: (id) => {
        const el = document.getElementById(id);
        if(el) {
            el.classList.remove('open'); // <--- THIS IS THE CRITICAL FIX
            el.style.display = 'none';
        }
    },

    // Tool: Creates a generic "Are you sure?" popup on the fly
    showGenericModal: (title, htmlContent, onConfirm = null) => {
        const modal = document.getElementById('modal-generic');
        const content = modal.querySelector('.modal-content');
        
        // Inject HTML into the generic modal
        content.innerHTML = `
            <h3>${title}</h3>
            <div style="margin:15px 0;">${htmlContent}</div>
            <div style="display:flex; gap:10px;">
                <button class="btn-pay btn-train" id="gen-cancel-btn">Cancel</button>
                ${onConfirm ? `<button class="btn-pay btn-gold" id="gen-confirm-btn">Confirm</button>` : ''}
            </div>
        `;

        // Add click actions to the buttons we just made
        document.getElementById('gen-cancel-btn').onclick = () => {
            window.app.helpers.closeModal('modal-generic');
        };

        if(onConfirm) {
            document.getElementById('gen-confirm-btn').onclick = () => {
                onConfirm();
                window.app.helpers.closeModal('modal-generic');
            };
        }

        window.app.helpers.openModal('modal-generic');
    }
};
