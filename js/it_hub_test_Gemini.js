/* FILE: js/it_hub_test_Gemini.js
   PURPOSE: IT Admin Dashboard.
   Features: Health Checks, Data Management, Factory Reset, and Documentation.
*/

window.app.itHub = {
    
    // Internal State
    currentTab: 'dashboard', // 'dashboard' or 'docs'
    getLastUpdatedLabel: function() {
        const raw = window.app?.lastModified || document.lastModified;
        const date = raw ? new Date(raw) : null;
        if (!date || isNaN(date.getTime())) return "Last Updated: Unknown";
        return `Last Updated: ${date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        })}`;
    },

    render: function() {
        const area = document.getElementById('view-it');
        if(!area) return;

        // Toggle Views based on Tab
        if (this.currentTab === 'dashboard') {
            this.renderDashboard(area);
        } else {
            this.renderDocs(area);
        }
    },

    switchTab: function(tabName) {
        this.currentTab = tabName;
        this.render();
    },

    // ============================================================
    // 1. DASHBOARD VIEW (Health, Stats, Actions)
    // ============================================================
    renderDashboard: function(area) {
        // --- 1. CALCULATE HEALTH METRICS ---
        const dataStr = JSON.stringify(window.app.data);
        const bytes = new Blob([dataStr]).size;
        const usageKB = (bytes / 1024).toFixed(2);
        const usagePercent = ((bytes / 5000000) * 100).toFixed(2); // ~5MB LocalStorage Limit
        
        const isOnline = navigator.onLine;
        const isCloudConnected = window.app.database?.cloudConnected === true;
        const retryCountdown = window.app.database?.retryCountdown;
        const lastError = window.app.database?.lastFirestoreError;
        const isPermissionsIssue = lastError && /permission|insufficient/i.test(lastError);
        const isDataValid = window.app.data && Array.isArray(window.app.data.products);

        // --- 2. CALCULATE RECORD STATS ---
        const orderCount = window.app.data.orders ? window.app.data.orders.length : 0;
        const empCount = window.app.data.employees ? window.app.data.employees.length : 0;
        const logCount = window.app.data.timeEntries ? window.app.data.timeEntries.length : 0;

        // --- 3. GENERATE HTML ---
        area.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="color:var(--space-indigo); margin:0;"><i class="fa-solid fa-server"></i> IT Operations Center</h2>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                    <div style="color:#777; font-size:0.85rem;">${this.getLastUpdatedLabel()}</div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-sm ${this.currentTab === 'dashboard' ? 'btn-active' : ''}" onclick="window.app.itHub.switchTab('dashboard')">Monitor</button>
                        <button class="btn-sm ${this.currentTab === 'docs' ? 'btn-active' : ''}" onclick="window.app.itHub.switchTab('docs')">Docs & Logs</button>
                    </div>
                </div>
            </div>

            <div class="mgr-grid">
                
                <div class="mgr-card" style="text-align:left;">
                    <h3 style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">System Health</h3>
                    
                    ${this.renderStatusPill("Network Connection", isOnline, isOnline ? "Online" : "Offline")}
                    ${this.renderStatusPill("Cloud Database", isCloudConnected, isCloudConnected ? "Connected" : "Disconnected")}
                    <div style="font-size:0.85rem; color:#666; margin-top:6px;">
                        ${retryCountdown !== null && !isCloudConnected ? `Auto-retry in ${retryCountdown}s...` : "Auto-retry idle"}
                    </div>
                    <div style="font-size:0.8rem; color:#888; margin-top:4px;">
                        Last Firestore error: ${lastError ? lastError : "None"}
                    </div>
                    ${isPermissionsIssue ? `
                        <div style="margin-top:6px; padding:8px 10px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; color:#9a3412; font-size:0.8rem;">
                            Permissions blocked. Check Firestore rules and allow access for this app.
                        </div>
                    ` : ""}
                    ${this.renderStatusPill("Local Data Integrity", isDataValid, isDataValid ? "Valid JSON" : "Corrupt")}
                    
                    <div style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                            <span>Browser Storage</span>
                            <span style="font-weight:bold;">${usagePercent}% Used</span>
                        </div>
                        <div style="width:100%; background:#eee; height:10px; border-radius:5px; overflow:hidden;">
                            <div style="width:${usagePercent}%; background:${usagePercent > 80 ? 'var(--danger)' : 'var(--success)'}; height:100%;"></div>
                        </div>
                        <div style="font-size:0.8rem; color:#888; margin-top:5px;">${usageKB} KB / 5000 KB</div>
                    </div>
                </div>

                <div class="mgr-card" style="text-align:left;">
                    <h3 style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">Database Analytics</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                        <div style="text-align:center; background:#f8f9fa; padding:10px; border-radius:8px;">
                            <div style="font-size:1.5rem; font-weight:bold; color:var(--space-indigo);">${orderCount}</div>
                            <div style="font-size:0.8rem; color:#666;">Total Orders</div>
                        </div>
                        <div style="text-align:center; background:#f8f9fa; padding:10px; border-radius:8px;">
                            <div style="font-size:1.5rem; font-weight:bold; color:var(--space-indigo);">${empCount}</div>
                            <div style="font-size:0.8rem; color:#666;">Employees</div>
                        </div>
                        <div style="text-align:center; background:#f8f9fa; padding:10px; border-radius:8px;">
                            <div style="font-size:1.5rem; font-weight:bold; color:var(--space-indigo);">${logCount}</div>
                            <div style="font-size:0.8rem; color:#666;">Time Logs</div>
                        </div>
                        <div style="text-align:center; background:#f8f9fa; padding:10px; border-radius:8px;">
                            <div style="font-size:1.5rem; font-weight:bold; color:var(--space-indigo);">${window.app.version}</div>
                            <div style="font-size:0.8rem; color:#666;">App Version</div>
                        </div>
                    </div>
                </div>

                <div class="mgr-card" style="text-align:left;">
                    <h3 style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">Data Actions</h3>
                    
                    <button class="btn-pay btn-train" onclick="window.app.itHub.downloadBackup()" style="width:100%; margin-bottom:10px;">
                        <i class="fa-solid fa-download"></i> Download JSON Backup
                    </button>

                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button class="btn-pay" onclick="window.app.database.sync()" style="flex:1; background:var(--space-indigo);">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Force Sync
                        </button>
                        <button class="btn-pay" onclick="document.getElementById('restore-file').click()" style="flex:1; background:#95a5a6;">
                            <i class="fa-solid fa-upload"></i> Restore
                        </button>
                    </div>
                    <button class="btn-pay" style="width:100%; margin-bottom:10px; background:#f1f5f9; color:#1f2937;" onclick="window.app.database.recheckFirestore()">
                        <i class="fa-solid fa-rotate"></i> Recheck Firestore
                    </button>
                    <input type="file" id="restore-file" style="display:none;" accept=".json" onchange="window.app.itHub.restoreBackup(this)">

                    <div id="backup-status" style="margin-top:10px; font-size:0.85rem; color:#666;">
                        Auto backup: pending
                    </div>

                    <button class="btn-pay" style="width:100%; margin-top:12px; background:#eef3ff; color:#1E2741;" onclick="window.app.itHub.openFirestoreConsole()">
                        <i class="fa-solid fa-database"></i> Open Firestore Console
                    </button>
                    <button class="btn-pay" style="width:100%; margin-top:8px; background:#f8fafc; color:#1f2937;" onclick="window.app.itHub.openFirestoreRules()">
                        <i class="fa-solid fa-shield-halved"></i> Firestore Rules (Test)
                    </button>
                    <div style="margin-top:10px; padding:10px; border:1px solid #e5e7eb; border-radius:8px; background:#f8fafc;">
                        <div style="font-weight:700; font-size:0.85rem; margin-bottom:6px;">Rules Snippet (Testing)</div>
                        <textarea readonly style="width:100%; min-height:110px; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; font-size:0.8rem; padding:8px; border-radius:6px; border:1px solid #e5e7eb; background:white;">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /stores/{docId} {
      allow read, write: if true;
    }
  }
}</textarea>
                        <button class="btn-sm" style="margin-top:8px;" onclick="window.app.itHub.copyRulesSnippet()">Copy Snippet</button>
                    </div>
                </div>

                <div class="mgr-card" style="text-align:left;">
                    <h3 style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">Recent Backups</h3>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                        <button class="btn-sm" onclick="window.app.itHub.setBackupFilter('all')">All</button>
                        <button class="btn-sm" onclick="window.app.itHub.setBackupFilter('hour')">Last Hour</button>
                        <button class="btn-sm" onclick="window.app.itHub.setBackupFilter('auto')">Auto Only</button>
                        <button class="btn-sm" onclick="window.app.itHub.setBackupFilter('manual')">Manual Only</button>
                    </div>
                    <div id="backup-list" style="display:flex; flex-direction:column; gap:8px; font-size:0.9rem; color:#555;">
                        Loading backups...
                    </div>
                    <div style="display:flex; gap:10px; margin-top:12px;">
                        <button class="btn-sm" onclick="window.app.itHub.loadBackupList()">Refresh Backups</button>
                        <button class="btn-sm" onclick="window.app.database.runBackup('manual')">Create Manual Backup</button>
                    </div>
                </div>

                <div class="mgr-card" style="text-align:left;">
                    <h3 style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">Backup Frequency</h3>
                    <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                        <input id="backup-interval-value" type="number" min="1" value="5" style="width:80px; padding:6px;">
                        <select id="backup-interval-unit" style="padding:6px;">
                            <option value="seconds">Seconds</option>
                            <option value="minutes" selected>Minutes</option>
                            <option value="hours">Hours</option>
                        </select>
                        <button class="btn-sm btn-active" onclick="window.app.itHub.applyBackupInterval()">Apply</button>
                    </div>
                    <div id="backup-interval-current" style="font-size:0.85rem; color:#666;">
                        Current interval: 5 minutes
                    </div>
                </div>

                <div class="mgr-card" style="text-align:left;">
                    <h3 style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">PIN Management</h3>
                    <p style="font-size:0.85rem; color:#666; margin-bottom:12px;">
                        Generate and save new PINs in Firestore. Share them securely with staff.
                    </p>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button class="btn-pay" style="flex:1; background:var(--space-indigo);" onclick="window.app.itHub.resetPin('Manager')">
                            Reset Manager PIN
                        </button>
                        <button class="btn-pay" style="flex:1; background:var(--stormy-teal);" onclick="window.app.itHub.resetPin('IT Support')">
                            Reset IT PIN
                        </button>
                    </div>
                    <button class="btn-pay" style="width:100%; background:#95a5a6;" onclick="window.app.itHub.setCustomPin()">
                        Set Custom PIN
                    </button>
                </div>

                <div class="mgr-card" style="text-align:left; border:2px solid var(--danger);">
                    <h3 style="color:var(--danger); border-bottom:1px solid var(--danger); padding-bottom:10px; margin-bottom:15px;">
                        <i class="fa-solid fa-biohazard"></i> Danger Zone
                    </h3>
                    <p style="font-size:0.85rem; color:#666; margin-bottom:15px;">
                        Factory reset wipes this device's local memory. Use if app is glitching or to clean a shared device.
                    </p>
                    <button class="btn-pay" onclick="window.app.itHub.factoryReset()" style="width:100%; background:var(--danger);">
                        <i class="fa-solid fa-skull"></i> FACTORY RESET DEVICE
                    </button>
                    <button class="btn-pay" onclick="window.app.itHub.clearOldOrders()" style="width:100%; margin-top:10px; background:#e67e22;">
                        <i class="fa-solid fa-broom"></i> Clear Old Orders
                    </button>
                </div>

            </div>
        `;

        if (window.app?.database?.updateBackupStatus) {
            window.app.database.updateBackupStatus();
        }

        this.loadBackupList();
        this.renderBackupInterval();
    },

    // ============================================================
    // 2. DOCUMENTATION VIEW (Docs, Bugs, Features)
    // ============================================================
    renderDocs: function(area) {
        area.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="color:var(--space-indigo); margin:0;"><i class="fa-solid fa-book"></i> Documentation</h2>
                    <div style="display:flex; gap:10px;">
                    <button class="btn-sm ${this.currentTab === 'dashboard' ? 'btn-active' : ''}" onclick="window.app.itHub.switchTab('dashboard')">Monitor</button>
                    <button class="btn-sm ${this.currentTab === 'docs' ? 'btn-active' : ''}" onclick="window.app.itHub.switchTab('docs')">Docs & Logs</button>
                    </div>
                </div>

            <div style="background:white; padding:20px; border-radius:10px; height:70vh; overflow-y:auto;">
                
                <div style="margin-bottom:30px;">
                    <h3 style="color:var(--space-indigo); border-bottom:2px solid var(--golden-bronze); padding-bottom:5px;">
                        <i class="fa-solid fa-code-branch"></i> Version History
                    </h3>
                    <ul style="list-style:none; padding:0;">
                        <li style="margin-bottom:15px;">
                            <strong>v2.50</strong> <span style="font-size:0.8rem; background:#d4edda; padding:2px 6px; border-radius:4px;">Current • Baseline</span><br>
                            Baseline build. Added faster auto-backups and admin PIN reset tools.
                        </li>
                        <li style="margin-bottom:15px;">
                            <strong>v2.1.0</strong><br>
                            Added "Barista View", "Inventory", and "Dashboard" modules. Fixed Cloud Sync race conditions. Added Offline banner.
                        </li>
                        <li style="margin-bottom:15px;">
                            <strong>v2.0.2</strong><br>
                            Modularized Javascript files (POS, Manager, Auth split into separate files). Added IT Hub skeleton.
                        </li>
                        <li style="margin-bottom:15px;">
                            <strong>v1.9.0</strong><br>
                            Initial transition to Firestore Cloud database.
                        </li>
                    </ul>
                </div>

                <div style="margin-bottom:30px;">
                    <h3 style="color:#d35400; border-bottom:2px solid #d35400; padding-bottom:5px;">
                        <i class="fa-solid fa-bug"></i> Known Issues
                    </h3>
                    <ul style="padding-left:20px; color:#555;">
                        <li>If "Force Sync" is pressed while offline, the app may not retry automatically until page refresh.</li>
                        <li>Large product images (>2MB) may slow down the "Save" process in Manager Hub.</li>
                    </ul>
                </div>

                <div>
                    <h3 style="color:#2980b9; border-bottom:2px solid #2980b9; padding-bottom:5px;">
                        <i class="fa-solid fa-lightbulb"></i> Feature Wishlist
                    </h3>
                    <ul style="padding-left:20px; color:#555;">
                        <li><strong>Report Export:</strong> Ability to export monthly sales to Excel/CSV.</li>
                        <li><strong>Ingredient Tracking:</strong> Deduct milk/beans from inventory when drinks are sold.</li>
                        <li><strong>Student Pin Generation:</strong> Auto-generate random pins for new students.</li>
                    </ul>
                </div>

            </div>
        `;
    },

    // ============================================================
    // 3. UTILITY FUNCTIONS
    // ============================================================

    // HELPER: Renders a Green/Red status row
    renderStatusPill: function(label, isGood, text) {
        const color = isGood ? 'var(--success)' : 'var(--danger)';
        const icon = isGood ? 'fa-check-circle' : 'fa-times-circle';
        
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed #eee;">
                <span>${label}</span>
                <span style="color:${color}; font-weight:bold; display:flex; align-items:center; gap:5px;">
                    <i class="fa-solid ${icon}"></i> ${text}
                </span>
            </div>
        `;
    },

    // ACTION: Backup
    downloadBackup: function() {
        const dataStr = JSON.stringify(window.app.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const fileName = `rising_star_backup_${new Date().toISOString().slice(0,10)}.json`;

        const link = document.createElement('a');
        link.href = dataUri;
        link.download = fileName;
        link.click();
    },

    openFirestoreConsole: function() {
        const url = "https://console.firebase.google.com/u/1/project/star-academy-cafe-pos/firestore/databases/-default-/data";
        window.open(url, "_blank", "noopener");
    },

    openFirestoreRules: function() {
        const url = "https://console.firebase.google.com/u/1/project/star-academy-cafe-pos/firestore/rules";
        window.open(url, "_blank", "noopener");
    },

    copyRulesSnippet: async function() {
        const snippet = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /stores/{docId} {\n      allow read, write: if true;\n    }\n  }\n}`;
        try {
            await navigator.clipboard.writeText(snippet);
            alert("Rules snippet copied.");
        } catch (e) {
            console.error("Copy failed", e);
            alert("Copy failed. Please select and copy manually.");
        }
    },

    backupFilter: "all",

    setBackupFilter: function(filter) {
        this.backupFilter = filter;
        this.loadBackupList();
    },

    loadBackupList: async function() {
        const listEl = document.getElementById('backup-list');
        if (!listEl) return;

        const db = window.app?.database?.db;
        if (!db) {
            listEl.innerHTML = '<div>Offline or not connected.</div>';
            return;
        }

        listEl.innerHTML = 'Loading backups...';

        try {
            const snap = await db.collection("backups")
                .orderBy("timestamp", "desc")
                .limit(8)
                .get();

            if (snap.empty) {
                listEl.innerHTML = '<div>No backups found yet.</div>';
                return;
            }

            this.backupCache = {};
            const rows = [];
            snap.forEach(doc => {
                const data = doc.data() || {};
                this.backupCache[doc.id] = data;
                const ts = data.timestamp ? new Date(data.timestamp) : null;
                if (this.backupFilter === "hour" && ts) {
                    const ageMs = Date.now() - ts.getTime();
                    if (ageMs > 3600000) return;
                }
                if (this.backupFilter === "auto" && data.type !== "auto-quick" && data.type !== "interval") return;
                if (this.backupFilter === "manual" && data.reason !== "manual" && data.type !== "manual") return;
                const tsLabel = ts && !isNaN(ts.getTime())
                    ? ts.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                    : "Unknown time";
                const ver = data.version ? ` • ${data.version}` : "";
                const reason = data.reason ? ` • ${data.reason}` : "";
                rows.push(`<button class="btn-sm" style="text-align:left;" onclick="window.app.itHub.showBackupDetails('${doc.id}')">• ${tsLabel}${ver}${reason}</button>`);
            });

            listEl.innerHTML = rows.length ? rows.join("") : "<div>No backups found for this filter.</div>";
        } catch (e) {
            console.error("Failed to load backups", e);
            listEl.innerHTML = '<div>Unable to load backups.</div>';
        }
    },

    renderBackupInterval: function() {
        const current = window.app?.data?.backupSettings?.intervalMs || 0;
        const labelEl = document.getElementById("backup-interval-current");
        if (!labelEl) return;
        if (!current) {
            labelEl.textContent = "Current interval: Off";
            return;
        }
        const minutes = current / 60000;
        if (minutes >= 60 && minutes % 60 === 0) {
            labelEl.textContent = `Current interval: ${minutes / 60} hours`;
        } else if (minutes >= 1) {
            labelEl.textContent = `Current interval: ${minutes} minutes`;
        } else {
            labelEl.textContent = `Current interval: ${current / 1000} seconds`;
        }
    },

    applyBackupInterval: function() {
        const val = parseInt(document.getElementById("backup-interval-value").value, 10);
        const unit = document.getElementById("backup-interval-unit").value;
        if (!val || val < 1) return alert("Enter a valid interval.");
        let ms = val * 1000;
        if (unit === "minutes") ms = val * 60000;
        if (unit === "hours") ms = val * 3600000;
        window.app.database.setBackupInterval(ms);
        this.renderBackupInterval();
    },

    showBackupDetails: function(docId) {
        const data = this.backupCache?.[docId];
        if (!data) return;

        const sizeKb = data.data ? (JSON.stringify(data.data).length / 1024).toFixed(2) : "0.00";
        const products = data.data?.products?.length || 0;
        const employees = data.data?.employees?.length || 0;
        const orders = data.data?.orders?.length || 0;
        const inventory = data.data?.inventory?.length || 0;
        const timeEntries = data.data?.timeEntries?.length || 0;

        const html = `
            <div style="text-align:left;">
                <p><strong>Backup Size:</strong> ${sizeKb} KB</p>
                <p><strong>Products:</strong> ${products}</p>
                <p><strong>Employees:</strong> ${employees}</p>
                <p><strong>Orders:</strong> ${orders}</p>
                <p><strong>Inventory Items:</strong> ${inventory}</p>
                <p><strong>Time Entries:</strong> ${timeEntries}</p>
            </div>
        `;

        window.app.helpers.showGenericModal("Backup Details", html, null);
        window.app.helpers.openModal("modal-generic");
    },

    // ============================================================
    // 4. PIN MANAGEMENT
    // ============================================================
    ensurePins: function() {
        if (!window.app.data.pins) {
            const defaults = window.app.defaults?.pins || {};
            window.app.data.pins = { ...defaults };
        }
    },

    generatePin: function() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },

    resetPin: function(role) {
        this.ensurePins();

        const confirmReset = confirm(`Generate a new PIN for ${role}?`);
        if (!confirmReset) return;

        const newPin = this.generatePin();
        window.app.data.pins[role] = newPin;

        window.app.database.saveLocal();
        window.app.database.sync();

        window.app.helpers.showGenericModal(
            `${role} PIN Updated`,
            `<p style="margin:0 0 10px 0;">New PIN for <strong>${role}</strong>:</p>
             <div style="font-size:2rem; font-weight:800; text-align:center; letter-spacing:4px;">${newPin}</div>
             <p style="margin:10px 0 0 0; color:#666; font-size:0.85rem;">This PIN was saved to Firestore.</p>`,
            null
        );
        window.app.helpers.openModal("modal-generic");
    },

    setCustomPin: function() {
        this.ensurePins();

        const role = prompt("Enter role to update (Manager or IT Support):", "Manager");
        if (!role) return;
        if (!["Manager", "IT Support"].includes(role)) {
            alert("Role must be Manager or IT Support.");
            return;
        }

        const pin = prompt(`Enter new 4-digit PIN for ${role}:`, "");
        if (!pin || !/^\d{4}$/.test(pin)) {
            alert("PIN must be exactly 4 digits.");
            return;
        }

        window.app.data.pins[role] = pin;
        window.app.database.saveLocal();
        window.app.database.sync();

        alert(`${role} PIN updated.`);
    },

    // ACTION: Restore
    restoreBackup: function(input) {
        const file = input.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if(!importedData.products || !importedData.employees) {
                    throw new Error("File missing critical data fields.");
                }
                if(confirm("DANGER: Overwrite ALL current data with this backup?")) {
                    window.app.data = importedData;
                    window.app.database.saveLocal();
                    window.app.database.sync(); 
                    alert("Restore Successful. Reloading...");
                    location.reload();
                }
            } catch(err) {
                alert("Restore Failed: " + err.message);
            }
        };
        reader.readAsText(file);
    },

    // ACTION: Nuke
    factoryReset: function() {
        const code = prompt("SECURITY CHECK:\nType 'DELETE' to wipe this device:");
        if(code === 'DELETE') {
            window.app.data = JSON.parse(JSON.stringify(window.app.defaults));
            window.app.database.saveLocal();
            // Note: We don't auto-sync the wipe to cloud for safety, 
            // but the next sync/edit will propagate the clean state.
            alert("Device Reset.");
            location.reload();
        }
    },

    clearOldOrders: function() {
        const daysStr = prompt("Clear orders older than how many days?", "30");
        const days = parseInt(daysStr, 10);
        if (!days || days < 1) return;

        if (!confirm(`Delete orders older than ${days} days? This cannot be undone.`)) return;

        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const orders = window.app.data.orders || [];
        const filtered = orders.filter(o => {
            const ts = o.date || o.timestamp || o.time;
            const dt = ts ? new Date(ts) : null;
            if (!dt || isNaN(dt.getTime())) return true;
            return dt.getTime() >= cutoff;
        });

        window.app.data.orders = filtered;
        window.app.database.saveLocal();
        window.app.database.sync();
        alert("Old orders cleared.");
    }
};
