/* FILE: js/timeclock_screen_test_Gemini.js
   PURPOSE: Renders the employee grid for Clock In/Out.
*/

window.app.timeClock = {
    
    // 1. Draw the employee grid
    render: function() {
        const container = document.getElementById('time-clock-grid');
        if(!container) return;

        container.innerHTML = '';

        // Safety check
        if(!window.app.data.employees || window.app.data.employees.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">
                    <i class="fa-solid fa-users" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <p>No employees found.</p>
                    <button class="btn-sm btn-gold" onclick="window.app.router.navigate('manager')">Go to Manager Hub to Add Staff</button>
                </div>
            `;
            return;
        }

        window.app.data.employees.forEach((emp, index) => {
            const isIn = (emp.status === 'in');
            
            const card = document.createElement('div');
            // CSS classes determine if it looks Green (in) or Grey (out)
            card.className = `tc-card ${isIn ? 'status-in' : 'status-out'}`;
            
            // Clicking opens the decision modal
            card.onclick = () => this.openActionModal(index);

            card.innerHTML = `
                <div class="tc-avatar">
                    <div class="tc-initials">${emp.name.substring(0,1).toUpperCase()}</div>
                </div>
                <div class="tc-info">
                    <h3>${emp.name}</h3>
                    <div class="tc-badge">${isIn ? 'CLOCKED IN' : 'CLOCKED OUT'}</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // 2. Open the modal to choose In/Out
    openActionModal: function(index) {
        const emp = window.app.data.employees[index];
        const modal = document.getElementById('modal-time-action');
        const content = modal.querySelector('.modal-content');
        
        // Store the index so we know who to update
        modal.dataset.empIndex = index;

        const isClockedIn = emp.status === 'in';
        const statusColor = isClockedIn ? 'var(--success)' : '#666';

        content.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h3 style="margin-bottom:5px;">${emp.name}</h3>
                <div style="color:${statusColor}; font-weight:bold;">
                    Currently: ${isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
                </div>
            </div>

            <div style="display:flex; gap:15px; margin-bottom:15px;">
                <button class="btn-pay" onclick="window.app.timeClock.process('in')" 
                    style="flex:1; height:80px; font-size:1.1rem; background:var(--success); opacity:${isClockedIn ? '0.5' : '1'}">
                    <i class="fa-solid fa-right-to-bracket"></i><br>CLOCK IN
                </button>
                
                <button class="btn-pay" onclick="window.app.timeClock.process('out')" 
                    style="flex:1; height:80px; font-size:1.1rem; background:#e74c3c; opacity:${!isClockedIn ? '0.5' : '1'}">
                    <i class="fa-solid fa-right-from-bracket"></i><br>CLOCK OUT
                </button>
            </div>
            
            <button class="btn-pay btn-train" onclick="window.app.helpers.closeModal('modal-time-action')" style="width:100%">Cancel</button>
        `;
        
        window.app.helpers.openModal('modal-time-action');
    },

    // 3. Save the Clock In/Out action
    process: function(action) {
        const modal = document.getElementById('modal-time-action');
        const index = modal.dataset.empIndex;
        if(index === undefined) return;

        const emp = window.app.data.employees[index];
        
        // Prevent double clock-in
        if(emp.status === action) {
            alert(`Already clocked ${action}!`);
            return;
        }

        // 1. Update Status
        emp.status = action;

        // 2. Log History
        if(!window.app.data.timeEntries) window.app.data.timeEntries = [];
        window.app.data.timeEntries.push({
            name: emp.name,
            action: action,
            time: new Date().toISOString()
        });

        // 3. Save & Sync
        window.app.database.saveLocal();
        window.app.database.sync(); 
        
        // 4. Refresh Screen
        window.app.helpers.closeModal('modal-time-action');
        this.render();
    }
};
