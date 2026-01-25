/* FILE: timeclock_screen_test_Gemini.js
   PURPOSE: Renders the employee grid for Clock In/Out.
*/

window.app.timeClock = {
    
    // 1. Draw the employee grid
    render: function() {
        const container = document.getElementById('time-clock-grid');
        if(!container) return;

        container.innerHTML = '';

        if(window.app.data.employees.length === 0) {
            container.innerHTML = "<p style='text-align:center;color:#666;'>No employees found. Please sync data.</p>";
            return;
        }

        window.app.data.employees.forEach((emp, index) => {
            const isClockedIn = (emp.status === 'in');
            
            const card = document.createElement('div');
            card.className = `tc-card ${isClockedIn ? 'status-in' : 'status-out'}`;
            
            // When clicked, open the Action Modal
            card.onclick = () => this.openActionModal(index);

            card.innerHTML = `
                <div class="tc-avatar">
                    <div class="tc-initials">${emp.name.substring(0,1)}</div>
                </div>
                <div class="tc-info">
                    <h3>${emp.name}</h3>
                    <div class="tc-badge">${isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // 2. Open the modal to choose In/Out
    openActionModal: function(index) {
        const emp = window.app.data.employees[index];
        const modal = document.getElementById('modal-time-action');
        
        // Tag the modal with the employee index so we know who to update later
        modal.dataset.empIndex = index;

        // Fill in the modal details
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <h3>${emp.name}</h3>
            <p style="margin-bottom:20px; color:#666;">Currently: ${emp.status === 'in' ? 'Clocked IN' : 'Clocked OUT'}</p>
            <div style="display:flex; gap:15px; margin-bottom:15px;">
                <button class="btn-pay btn-success" onclick="window.app.timeClock.process('in')" style="flex:1; height:80px; font-size:1.2rem;"><i class="fa-solid fa-right-to-bracket"></i> CLOCK IN</button>
                <button class="btn-pay btn-card" onclick="window.app.timeClock.process('out')" style="flex:1; height:80px; font-size:1.2rem; background:#e74c3c;"><i class="fa-solid fa-right-from-bracket"></i> CLOCK OUT</button>
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
        emp.status = action;

        // Log history
        window.app.data.timeEntries.push({
            name: emp.name,
            action: action,
            time: new Date().toISOString()
        });

        // Save
        window.app.database.saveLocal();
        window.app.database.sync(); 
        
        // Refresh grid
        this.render(); 
        window.app.helpers.closeModal('modal-time-action');
        
        alert(`${emp.name} is now Clocked ${action.toUpperCase()}`);
    }
};
