/* FILE: js/timeclock_screen_test_Gemini.js
   PURPOSE: Renders the employee grid for Clock In/Out.
*/

window.app.timeClock = {
    
    // FIX: Added 'init' so the Router can start this module
    init: function() {
        this.render();
    },

    // 1. Draw the employee grid
    render: function() {
        const container = document.getElementById('time-clock-grid');
        if(!container) return;

        container.innerHTML = '';

        const subtitle = document.getElementById('tc-subtitle');
        const session = window.app?.session || {};
        const currentUser = session.userName || null;
        const isAdmin = !!session.isAdmin;

        if (subtitle) {
            if (!currentUser) {
                subtitle.textContent = "Please log in to clock in or out.";
            } else if (isAdmin) {
                subtitle.textContent = `${currentUser} (Admin) — you can clock anyone in or out.`;
            } else {
                subtitle.textContent = `Logged in as ${currentUser} — you can clock only your own name.`;
            }
        }

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
            const canAct = isAdmin || (currentUser && emp.name === currentUser);
            
            const card = document.createElement('div');
            // CSS classes determine if it looks Green (in) or Grey (out)
            card.className = `tc-card ${isIn ? 'status-in' : 'status-out'} ${canAct ? '' : 'tc-card-locked'}`;
            
            // Clicking opens the decision modal
            if (canAct) {
                card.onclick = () => this.openActionModal(index);
                card.tabIndex = 0;
            } else {
                card.onclick = null;
                card.tabIndex = -1;
            }

            card.innerHTML = `
                <div class="tc-avatar">
                    <div class="tc-initials">${emp.name.substring(0,1).toUpperCase()}</div>
                </div>
                <div class="tc-info">
                    <h3>${emp.name}</h3>
                    <div class="tc-badge ${isIn ? 'tc-badge-in' : 'tc-badge-out'}">
                        ${isIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
                    </div>
                    ${!canAct ? '<div class="tc-locked"><i class="fa-solid fa-lock"></i> Ask a manager</div>' : ''}
                </div>
                <div class="tc-action">
                    ${canAct ? (isIn ? 'Clock Out' : 'Clock In') : 'Locked'}
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
    ,

    // --- Helpers for login/logout prompts ---
    findEmployeeByName: function(name) {
        return (window.app.data.employees || []).find(e => e.name === name);
    },

    logTimeEntry: function(name, action) {
        if(!window.app.data.timeEntries) window.app.data.timeEntries = [];
        window.app.data.timeEntries.push({
            name: name,
            action: action,
            time: new Date().toISOString()
        });
    },

    clockInByName: function(name) {
        const emp = this.findEmployeeByName(name);
        if (!emp || emp.status === 'in') return;
        emp.status = 'in';
        this.logTimeEntry(name, 'in');
        window.app.database.saveLocal();
        window.app.database.sync();
        this.render();
    },

    clockOutByName: function(name) {
        const emp = this.findEmployeeByName(name);
        if (!emp || emp.status === 'out') return;
        emp.status = 'out';
        this.logTimeEntry(name, 'out');
        window.app.database.saveLocal();
        window.app.database.sync();
        this.render();
    },

    clockOutAll: function() {
        const emps = window.app.data.employees || [];
        let changed = false;
        emps.forEach(emp => {
            if (emp.status === 'in') {
                emp.status = 'out';
                this.logTimeEntry(emp.name, 'out');
                changed = true;
            }
        });
        if (changed) {
            window.app.database.saveLocal();
            window.app.database.sync();
            this.render();
        }
    }
};
