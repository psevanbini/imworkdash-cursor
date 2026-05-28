const MPC_VALUES = { "T1": 70, "T2": 90, "T3": 120, "T4": 120, "T5": 90 };
const SIZE_PTS = { "Strategic": 4, "Large": 2, "Medium": 3, "Small": 1 };
const SIS_PTS = { "PowerSchool": 3, "Infinite Campus": 2, "Aeries": 2, "Skyward SFTP": 2, "Clever": 2, "RenWeb/FACTS": 1 };
const ADJ_OPTIONS = ["Extended Launch", "Proof of Concept", "Pilots", "DSAs/DUAs/DPAs", "DOEs", "New Hire"];

let currentLayout = 'list', currentSort = 'tier', currentTZ = 'all', sortDir = 'desc', eligSortDir = 'desc', editingIM = null;

let teamData = [
  { name: "Alex Rivers", tz: "EST", tier: "T4", dealPts: 65, projPts: 15, deals: 10, projects: 2, pd: 0, y: 1, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Jordan Miller", tz: "EST", tier: "T3", dealPts: 75, projPts: 10, deals: 11, projects: 1, pd: 0, y: 0, r: 0, velocity: 3, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Casey Smith", tz: "EST", tier: "T2", dealPts: 55, projPts: 5, deals: 8, projects: 2, pd: 1, y: 1, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Morgan Lane", tz: "CST", tier: "T1", dealPts: 45, projPts: 10, deals: 9, projects: 2, pd: 0, y: 0, r: 1, velocity: 6, med: true, lg: false, onRotation: false, reason: "Velocity Limit" },
  { name: "Riley West", tz: "CST", tier: "T4", dealPts: 95, projPts: 25, deals: 15, projects: 3, pd: 0, y: 2, r: 1, velocity: 4, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Taylor Brooks", tz: "PST", tier: "T3", dealPts: 85, projPts: 10, deals: 12, projects: 1, pd: 1, y: 1, r: 0, velocity: 3, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Quinn Jones", tz: "PST", tier: "T2", dealPts: 50, projPts: 10, deals: 7, projects: 1, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Skyler Page", tz: "EST", tier: "T5", dealPts: 55, projPts: 10, deals: 8, projects: 2, pd: 0, y: 0, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Dakota Hayes", tz: "CST", tier: "T4", dealPts: 115, projPts: 10, deals: 16, projects: 1, pd: 1, y: 1, r: 2, velocity: 4, med: true, lg: true, onRotation: false, reason: "Capacity Overload" },
  { name: "Jamie Frost", tz: "PST", tier: "T3", dealPts: 65, projPts: 20, deals: 10, projects: 2, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Peyton Gray", tz: "EST", tier: "T2", dealPts: 60, projPts: 5, deals: 9, projects: 0, pd: 0, y: 0, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Reese Dale", tz: "CST", tier: "T1", dealPts: 45, projPts: 15, deals: 8, projects: 3, pd: 1, y: 1, r: 0, velocity: 3, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Charlie King", tz: "PST", tier: "T4", dealPts: 85, projPts: 40, deals: 13, projects: 4, pd: 2, y: 2, r: 0, velocity: 7, med: true, lg: true, onRotation: false, reason: "High Velocity" },
  { name: "Emerson True", tz: "EST", tier: "T3", dealPts: 100, projPts: 10, deals: 14, projects: 1, pd: 0, y: 3, r: 1, velocity: 3, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Sutton Wood", tz: "CST", tier: "T2", dealPts: 65, projPts: 5, deals: 9, projects: 1, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Blake Vale", tz: "PST", tier: "T1", dealPts: 55, projPts: 10, deals: 8, projects: 2, pd: 0, y: 0, r: 0, velocity: 4, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Parker Jade", tz: "CST", tier: "T3", dealPts: 75, projPts: 15, deals: 10, projects: 2, pd: 0, y: 1, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Avery Sky", tz: "PST", tier: "T2", dealPts: 60, projPts: 10, deals: 9, projects: 1, pd: 1, y: 1, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Logan Moss", tz: "EST", tier: "T4", dealPts: 80, projPts: 5, deals: 11, projects: 1, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Kendall Bell", tz: "CST", tier: "T5", dealPts: 55, projPts: 20, deals: 8, projects: 4, pd: 0, y: 0, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Robin Kite", tz: "PST", tier: "T1", dealPts: 50, projPts: 5, deals: 9, projects: 1, pd: 0, y: 1, r: 0, velocity: 2, med: true, lg: false, onRotation: true, reason: "" },
  { name: "Stevie Lynn", tz: "EST", tier: "T2", dealPts: 65, projPts: 12, deals: 10, projects: 3, pd: 1, y: 1, r: 1, velocity: 3, med: true, lg: false, onRotation: true, reason: "" },
  { name: "River Pond", tz: "CST", tier: "T3", dealPts: 95, projPts: 15, deals: 12, projects: 2, pd: 2, y: 2, r: 1, velocity: 5, med: true, lg: true, onRotation: true, reason: "" },
  { name: "Phoenix Day", tz: "PST", tier: "T4", dealPts: 85, projPts: 15, deals: 11, projects: 2, pd: 1, y: 1, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" }
];

let dealQueue = [{ id: 901, name: "Mountain View USD", size: "Large", sis: "Infinite Campus", tz: "PST", adj: [] }];

function switchSubTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + tab).style.display = 'block';
    document.getElementById('tab-' + tab).classList.add('active');
    renderContent();
}

function updateBadge() {
    const alerts = teamData.filter(im => !im.onRotation).length;
    const total = dealQueue.length + alerts;
    const badge = document.getElementById('assignment-badge');
    badge.innerText = total;
    badge.style.display = total > 0 ? 'inline-block' : 'none';
}

function setTZFilter(tz, btn) {
    currentTZ = tz;
    document.querySelectorAll('.filter-tz').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateMetrics(); renderContent();
}

function triggerManualRemoval() {
    const name = document.getElementById('manual-im-select').value;
    const reason = prompt(`Enter removal reason for ${name}:`);
    if (reason) {
        const im = teamData.find(i => i.name === name);
        im.onRotation = false; im.reason = reason;
        updateBadge(); renderContent();
    }
}

function resumeIM(name) {
    const im = teamData.find(i => i.name === name);
    im.onRotation = true; im.reason = "";
    updateBadge(); renderContent();
}

function toggleEligSort() {
    eligSortDir = eligSortDir === 'desc' ? 'asc' : 'desc';
    renderAssignment();
}

function renderAssignment() {
    const filtered = currentTZ === 'all' ? teamData : teamData.filter(im => im.tz === currentTZ);
    
    // New Deal Queue
    const qContainer = document.getElementById('deal-queue-container');
    qContainer.innerHTML = dealQueue.map(deal => {
        const base = (SIZE_PTS[deal.size] || 0) + (SIS_PTS[deal.sis] || 0);
        const total = base + deal.adj.length;
        return `<div class="review-card"><div style="display:flex; justify-content:space-between;">
            <div><h4>${deal.name} (${deal.tz})</h4><p style="font-size:11px; color:var(--psq-muted);">Base: ${deal.size} (${SIZE_PTS[deal.size]}) + ${deal.sis} (${SIS_PTS[deal.sis]})</p>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px;">
                ${ADJ_OPTIONS.map(opt => `<label style="font-size:10px;"><input type="checkbox" onchange="updateQAdj(${deal.id},'${opt}')" ${deal.adj.includes(opt)?'checked':''}> ${opt} (+1)</label>`).join('')}
            </div></div>
            <div style="text-align:right;"><div style="font-size:16px; font-weight:700; color:var(--ps-dark-green);">Projected: [${total}]</div>
            <select style="margin:10px 0; padding:4px; font-size:11px; width: 100%;">${filtered.map(im => `<option>${formatIMName(im)}</option>`).join('')}</select>
            <button class="btn-action active" style="width:100%;">Confirm</button></div>
        </div></div>`;
    }).join('');

    // Rotation Removal Alerts
    const aContainer = document.getElementById('alerts-container');
    const flagged = filtered.filter(im => !im.onRotation);
    aContainer.innerHTML = flagged.map(im => `
        <div class="alert-card"><div style="display:flex; justify-content:space-between; align-items:center;">
        <div><b>${formatIMName(im)} (${im.tz})</b> - Reason: ${im.reason}</div>
        <div style="display:flex; gap:10px;"><button class="btn-action" onclick="resumeIM('${im.name}')">Resume</button><input type="date" style="font-size:10px;"></div>
        </div></div>`).join('');

    // Manual Selector
    document.getElementById('manual-im-select').innerHTML = teamData.filter(im => im.onRotation).map(im => `<option value="${im.name}">${formatIMName(im)} (${im.tz})</option>`).join('');

    // Eligibility (Static Tier with Header Sort)
    const eContainer = document.getElementById('eligibility-container');
    const eligSorted = [...filtered].sort((a,b) => {
        const vA = parseInt(a.tier.slice(1)), vB = parseInt(b.tier.slice(1));
        return eligSortDir === 'desc' ? vB - vA : vA - vB;
    });
    eContainer.innerHTML = `<table><thead><tr><th>Name</th><th class="sortable-th" onclick="toggleEligSort()">Tier ↑↓</th><th>Med</th><th>Lg/Ent</th></tr></thead>
        <tbody>${eligSorted.map(im => `<tr><td><b>${formatIMName(im)}</b></td><td>${im.tier}</td>
        <td><input type="checkbox" ${im.med?'checked':''}></td>
        <td><input type="checkbox" ${im.lg?'checked':''}></td></tr>`).join('')}</tbody></table>`;
}

function updateQAdj(id, opt) { const d = dealQueue.find(x => x.id === id); const i = d.adj.indexOf(opt); i > -1 ? d.adj.splice(i,1) : d.adj.push(opt); renderAssignment(); }

function updateMetrics() {
    let tdP=0, tpP=0, tM=0, spC=0, pdC=0, yR=0, rR=0, dC=0;
    const filtered = currentTZ === 'all' ? teamData : teamData.filter(im => im.tz === currentTZ);
    filtered.forEach(im => { tdP+=im.dealPts; tpP+=im.projPts; tM+=MPC_VALUES[im.tier]; spC+=im.projects; pdC+=im.pd; yR+=im.y; rR+=im.r; dC+=im.deals; });
    const tot = tdP + tpP, cap = Math.round((tot/tM)*100);
    document.getElementById('t-im-count').innerText = filtered.length;
    document.getElementById('t-deal-count').innerText = dC;
    document.getElementById('t-strat-proj').innerText = spC;
    document.getElementById('t-total-pts').innerText = tot;
    document.getElementById('t-max-pts').innerText = tM;
    document.getElementById('t-deal-pts').innerText = tdP;
    document.getElementById('t-proj-pts').innerText = tpP;
    const capEl = document.getElementById('t-cap-pct');
    capEl.innerText = cap + '%';
    capEl.className = 'main-val ' + leadCapacityPctClass(cap);
    document.getElementById('t-fill-deals').style.width = (tdP/tM*100)+'%';
    document.getElementById('t-fill-projects').style.width = (tpP/tM*100)+'%';
    document.getElementById('t-risk-total').innerText = `${yR+rR} At-Risk Deals`;
    document.getElementById('t-risk-breakdown').innerHTML = formatRiskBreakdown(yR, rR, 'Health Breakdown');
    document.getElementById('t-past-due-proj').innerHTML = formatPastDueProjects(pdC);
}

function renderRoster() {
    const display = document.getElementById('team-display'); display.innerHTML = '';
    const filtered = currentTZ === 'all' ? teamData : teamData.filter(im => im.tz === currentTZ);
    const sorted = [...filtered].sort((a,b) => {
        let vA = currentSort === 'tier' ? parseInt(a.tier.slice(1)) : (a.dealPts + a.projPts)/MPC_VALUES[a.tier];
        let vB = currentSort === 'tier' ? parseInt(b.tier.slice(1)) : (b.dealPts + b.projPts)/MPC_VALUES[b.tier];
        return sortDir === 'desc' ? vB - vA : vA - vB;
    });
    let groups = {};
    sorted.forEach(im => {
        const pct = Math.round(((im.dealPts + im.projPts) / MPC_VALUES[im.tier]) * 100);
        const key = currentSort === 'tier' ? `Tier ${im.tier.slice(1)}` : (pct >= 90 ? "Critical (90%+)" : (pct >= 80 ? "High (80-89%)" : "Stable (Under 80%)"));
        if (!groups[key]) groups[key] = []; groups[key].push(im);
    });

    Object.keys(groups).forEach(key => {
        const h = document.createElement('div');
        h.className = groupHeaderClassForKey(key);
        h.innerText = key;
        display.appendChild(h);
        if (currentLayout === 'list') {
            const t = document.createElement('table');
            t.innerHTML = `<thead><tr><th>TZ</th><th>IM Name</th><th>Deals (Pts)</th><th>Projs (Pts)</th><th>Total / Cap</th><th>% Cap</th><th>Risks (Y/R|P)</th><th>Notes</th></tr></thead><tbody id="b-${key.replace(/\s/g,'')}"></tbody>`;
            display.appendChild(t); const b = t.querySelector('tbody');
            groups[key].forEach(im => {
                const m = MPC_VALUES[im.tier], tot = im.dealPts + im.projPts, pct = Math.round((tot/m)*100);
                const capClass = leadCapacityPctClass(pct);
                const n = localStorage.getItem('note_mgr_'+im.name) || '';
                b.innerHTML += `<tr><td><strong>${im.tz}</strong></td><td><strong>${formatIMName(im)}</strong></td><td>${im.deals} (${im.dealPts})</td><td>${im.projects} (${im.projPts})</td><td><strong>${tot}</strong> / ${m}</td><td><span class="${capClass}" style="font-weight:700;">${pct}%</span></td><td>${formatIMRisksCell(im.y, im.r, im.pd)}</td><td>${n.substring(0,12)}${n.length>12?'...':''} <span class="edit-btn" onclick="openNoteModal('${im.name.replace(/'/g, "\\'")}')">✎</span></td></tr>`;
            });
        } else {
            const grid = document.createElement('div'); grid.className = 'im-grid'; display.appendChild(grid);
            groups[key].forEach(im => {
                const m = MPC_VALUES[im.tier], tot = im.dealPts + im.projPts, pct = Math.round((tot/m)*100);
                const capClass = leadCapacityPctClass(pct);
                const n = localStorage.getItem('note_mgr_'+im.name) || 'None';
                grid.innerHTML += `<div class="${imCardClassList(im)}">
                    <div style="display:flex; justify-content:space-between;"><h3>${formatIMName(im)}</h3><span class="${capClass}" style="font-weight:700; font-size:12px;">${pct}%</span></div>
                    <div class="sub-info">${im.tz}</div>
                    <div class="stats">Pts: <b>${tot}</b>/${m} | Deals: ${im.deals} | Projs: ${im.projects}<br>Risks: ${formatIMRisksInline(im.y, im.r, im.pd)}</div>
                    <div class="summary-cap-bar" style="height:6px;"><div style="width:${(im.dealPts/m)*100}%; background:var(--ps-green);"></div><div style="width:${(im.projPts/m)*100}%; background:var(--ps-blue);"></div></div>
                    <div style="font-size:10px; color:#999; border-top:1px solid #eee; padding-top:5px; height:30px; overflow:hidden;">"${n}" <span class="edit-btn" onclick="openNoteModal('${im.name.replace(/'/g, "\\'")}')">✎</span></div>
                </div>`;
            });
        }
    });
}

function openNoteModal(name) {
    editingIM = name;
    document.getElementById('modal-im-name').innerText = `Notes for ${name}`;
    document.getElementById('note-text').value = localStorage.getItem('note_mgr_'+name) || '';
    document.getElementById('note-modal').style.display = 'flex';
}

function closeNoteModal() {
    document.getElementById('note-modal').style.display = 'none';
}

function saveNote() {
    localStorage.setItem('note_mgr_'+editingIM, document.getElementById('note-text').value);
    closeNoteModal();
    renderContent();
}

function renderContent() { renderRoster(); renderAssignment(); }
function setSort(t) { if (currentSort === t) sortDir = sortDir === 'desc' ? 'asc' : 'desc'; else { currentSort = t; sortDir = 'desc'; } document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active-sort')); document.getElementById('sort-'+t).classList.add('active-sort'); renderContent(); }
function switchLayout(l) { currentLayout = l; document.getElementById('btn-list').classList.toggle('active', l==='list'); document.getElementById('btn-card').classList.toggle('active', l==='card'); renderContent(); }

updateMetrics(); renderContent(); updateBadge();
