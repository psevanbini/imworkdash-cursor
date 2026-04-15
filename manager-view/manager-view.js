const MPC_VALUES = { "T1": 70, "T2": 90, "T3": 120, "T4": 120, "T5": 90 };
const SIZE_PTS = { "Strategic": 4, "Large": 2, "Medium": 3, "Small": 1 };
const SIS_PTS = { "PowerSchool": 3, "Infinite Campus": 2, "Aeries": 2, "Skyward SFTP": 2, "Clever": 2, "RenWeb/FACTS": 1 };
const ADJ_OPTIONS = ["Extended Launch", "Proof of Concept", "Pilots", "DSAs/DUAs/DPAs", "DOEs", "New Hire"];

let currentLayout = 'list', currentSort = 'tier', currentTZ = 'all', sortDir = 'desc', eligSortDir = 'desc';

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
            <div><h4>${deal.name} (${deal.tz})</h4><p style="font-size:11px; color:#666;">Base: ${deal.size} (${SIZE_PTS[deal.size]}) + ${deal.sis} (${SIS_PTS[deal.sis]})</p>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px;">
                ${ADJ_OPTIONS.map(opt => `<label style="font-size:10px;"><input type="checkbox" onchange="updateQAdj(${deal.id},'${opt}')" ${deal.adj.includes(opt)?'checked':''}> ${opt} (+1)</label>`).join('')}
            </div></div>
            <div style="text-align:right;"><div style="font-size:16px; font-weight:700; color:var(--ps-dark-green);">Projected: [${total}]</div>
            <select style="margin:10px 0; padding:4px; font-size:11px; width: 100%;">${filtered.map(im => `<option>${im.name}</option>`).join('')}</select>
            <button class="btn-action active" style="width:100%;">Confirm</button></div>
        </div></div>`;
    }).join('');

    // Rotation Removal Alerts
    const aContainer = document.getElementById('alerts-container');
    const flagged = filtered.filter(im => !im.onRotation);
    aContainer.innerHTML = flagged.map(im => `
        <div class="alert-card"><div style="display:flex; justify-content:space-between; align-items:center;">
        <div><b>${im.name} (${im.tz})</b> - Reason: ${im.reason}</div>
        <div style="display:flex; gap:10px;"><button class="btn-action" onclick="resumeIM('${im.name}')">Resume</button><input type="date" style="font-size:10px;"></div>
        </div></div>`).join('');

    // Manual Selector
    document.getElementById('manual-im-select').innerHTML = teamData.filter(im => im.onRotation).map(im => `<option value="${im.name}">${im.name} (${im.tz})</option>`).join('');

    // Eligibility (Static Tier with Header Sort)
    const eContainer = document.getElementById('eligibility-container');
    const eligSorted = [...filtered].sort((a,b) => {
        const vA = parseInt(a.tier.slice(1)), vB = parseInt(b.tier.slice(1));
        return eligSortDir === 'desc' ? vB - vA : vA - vB;
    });
    eContainer.innerHTML = `<table><thead><tr><th>Name</th><th class="sortable-th" onclick="toggleEligSort()">Tier ↑↓</th><th>Med</th><th>Lg/Ent</th></tr></thead>
        <tbody>${eligSorted.map(im => `<tr><td><b>${im.name}</b></td><td>${im.tier}</td>
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
    document.getElementById('t-cap-pct').innerText = cap + '%';
    document.getElementById('t-fill-deals').style.width = (tdP/tM*100)+'%';
    document.getElementById('t-fill-projects').style.width = (tpP/tM*100)+'%';
    document.getElementById('t-risk-total').innerText = `${yR+rR} At-Risk Deals`;
    document.getElementById('t-risk-breakdown').innerText = `${yR}Y / ${rR}R Health Breakdown`;
    document.getElementById('t-past-due-proj').innerText = `${pdC} Past Due Projects`;
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
        const h = document.createElement('div'); h.className = 'group-header'; h.innerText = key; display.appendChild(h);
        if (currentLayout === 'list') {
            const t = document.createElement('table'); t.innerHTML = `<thead><tr><th>TZ</th><th>Name</th><th>Deals (Pts)</th><th>Projs (Pts)</th><th>% Cap</th><th>Risks (Y/R|P)</th></tr></thead><tbody></tbody>`;
            display.appendChild(t); const b = t.querySelector('tbody');
            groups[key].forEach(im => {
                const pct = Math.round(((im.dealPts+im.projPts)/MPC_VALUES[im.tier])*100), c = pct >= 90 ? 'var(--ps-red)' : (pct >= 80 ? 'var(--ps-gold)' : 'var(--ps-green)');
                b.innerHTML += `<tr><td><b>${im.tz}</b></td><td><b>${im.name}</b></td><td>${im.deals} (${im.dealPts})</td><td>${im.projects} (${im.projPts})</td><td><span style="color:${c}; font-weight:700;">${pct}%</span></td><td>${im.y}Y/${im.r}R|<b style="${im.pd>0?'color:var(--ps-red)':''}">${im.pd}P</b></td></tr>`;
            });
        } else {
            const grid = document.createElement('div'); grid.className = 'im-grid'; display.appendChild(grid);
            groups[key].forEach(im => {
                const m = MPC_VALUES[im.tier], pct = Math.round(((im.dealPts+im.projPts)/m)*100), c = pct >= 90 ? 'var(--ps-red)' : (pct >= 80 ? 'var(--ps-gold)' : 'var(--ps-green)');
                grid.innerHTML += `<div class="im-card" style="border-top-color:${c}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div><h3>${im.name}</h3><span class="sub-info">${im.tz} • Tier ${im.tier.slice(1)}</span></div>
                        <span style="font-weight:700; color:${c}; font-size:12px;">${pct}%</span>
                    </div>
                    <div class="stats">Pts: <b>${im.dealPts+im.projPts}</b>/${m} | Deals: ${im.deals}<br>Projects past due: <b style="${im.pd > 0 ? 'color:var(--ps-red);' : ''}">${im.pd}</b></div>
                    <div class="summary-cap-bar" style="height:6px;"><div style="width:${(im.dealPts/m)*100}%; background:var(--ps-green);"></div><div style="width:${(im.projPts/m)*100}%; background:var(--ps-blue);"></div></div>
                </div>`;
            });
        }
    });
}

function renderContent() { renderRoster(); renderAssignment(); }
function setSort(t) { if (currentSort === t) sortDir = sortDir === 'desc' ? 'asc' : 'desc'; else { currentSort = t; sortDir = 'desc'; } document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active-sort')); document.getElementById('sort-'+t).classList.add('active-sort'); renderContent(); }
function switchLayout(l) { currentLayout = l; document.getElementById('btn-list').classList.toggle('active', l==='list'); document.getElementById('btn-card').classList.toggle('active', l==='card'); renderContent(); }

updateMetrics(); renderContent(); updateBadge();
