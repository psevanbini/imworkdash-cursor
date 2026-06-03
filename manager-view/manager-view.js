const MPC_VALUES = TeamData.MPC_VALUES;
const SIZE_PTS = {
  "Single": 1,
  "Small": 2,
  "Medium": 3,
  "Large": 2,
  "Enterprise": 2,
  "Strategic": 4
};
const SIS_PTS = { "PowerSchool": 3, "Infinite Campus": 2, "Aeries": 2, "Skyward SFTP": 2, "Clever": 2, "RenWeb/FACTS": 1 };
const ADJ_OPTIONS = ["Extended Launch", "Proof of Concept", "Pilots", "DSAs/DUAs/DPAs", "DOEs/RICs/BOCES", "New Hire"];

let currentLayout = 'list', currentSort = 'tier', currentTZ = 'all', sortDir = 'desc', eligSortDir = 'desc', editingIM = null, currentAssignmentSubTab = 'queue';

let teamData = [];
let dealQueue = [];
let managerDataDirty = false;

function saveManagerState() {
  TeamData.saveAll(teamData, dealQueue);
}

function isEmbedFrameActive() {
  try {
    if (window.parent === window) return true;
    const f = window.frameElement;
    return f && f.classList.contains('is-active');
  } catch (e) {
    return true;
  }
}

function initManagerData(fullInit) {
  teamData = fullInit ? TeamData.initRoster() : TeamData.refreshRoster();
  dealQueue = TeamData.loadDealQueue();
}

function reloadFromSharedStore() {
  initManagerData(false);
  normalizeAllEligibility();
  updateMetrics();
  if (isEmbedFrameActive()) {
    renderContent(true);
    managerDataDirty = false;
  } else {
    managerDataDirty = true;
  }
}

function switchSubTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.main-sub-tabs .sub-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + tab).style.display = 'block';
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'assignment') {
        switchAssignmentSubTab(currentAssignmentSubTab);
        renderContent();
    } else if (tab === 'reporting') {
        refreshReporting();
    } else {
        renderContent();
    }
}

function switchAssignmentSubTab(tab) {
    currentAssignmentSubTab = tab;
    document.querySelectorAll('.assignment-tab-panel').forEach(p => { p.style.display = 'none'; });
    document.querySelectorAll('.assignment-sub-tabs .sub-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('assignment-view-' + tab).style.display = 'block';
    document.getElementById('assignment-tab-' + tab).classList.add('active');
}

function filterByRegionalTz(items) {
    return currentTZ === 'all' ? items : items.filter(function (item) { return item.tz === currentTZ; });
}

function managerApprovalQueue() {
    return filterByRegionalTz(dealQueue).filter(dealNeedsManagerApproval);
}

function hasScheduledReturn(im) {
    return Boolean((im.returnToRotationAt || '').trim());
}

/** Auto capacity/velocity removals — must currently qualify and have no return date (tab badge). */
function autoRotationAlerts() {
    return filterByRegionalTz(teamData).filter(function (im) {
        return (
            !im.onRotation &&
            im.removalSource === 'auto' &&
            !hasScheduledReturn(im) &&
            getAutoRemovalReasons(im).length > 0
        );
    });
}

/** Off rotation: manual removals, or auto removals with a return date set. */
function removedFromRotationQueue() {
    return filterByRegionalTz(teamData).filter(function (im) {
        if (im.onRotation) return false;
        if (im.removalSource === 'manual') return true;
        return im.removalSource === 'auto' && hasScheduledReturn(im);
    });
}

function rotationAlertCardHtml(im) {
    const days = businessDaysSince(im.removedAt);
    const returnVal = im.returnToRotationAt || '';
    const futureReturn = isFutureReturnDate(returnVal);
    const scheduledText = returnVal
        ? `${futureReturn ? 'Scheduled return' : 'Return date'}: ${formatReturnDateLabel(returnVal)}`
        : '';
    const sourceTag = im.removalSource === 'manual'
        ? '<span class="rotation-source-tag rotation-source-tag--manual">Manual</span>'
        : '';
    return `<div class="alert-card">
        <div class="alert-card-row">
          <div><b>${formatIMName(im)} (${im.tz})</b> ${sourceTag} — Reason: ${formatRemovalReason(im)}</div>
          <div class="alert-card-actions">
            <span class="rotation-days-out">${formatBusinessDaysOut(days)}</span>
            <button type="button" class="btn-action" onclick="resumeIM('${escapeAttr(im.name)}')">Resume</button>
            <div class="rotation-return-field">
              <label class="rotation-return-label">Return to rotation</label>
              <input type="date" class="rotation-return-date" value="${returnVal}" onchange="updateReturnDate('${escapeAttr(im.name)}', this.value)">
              <span class="rotation-return-scheduled">${scheduledText}</span>
            </div>
          </div>
        </div>
      </div>`;
}

function setTabBadge(elementId, count) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerText = count;
    el.style.display = count > 0 ? 'inline-block' : 'none';
}

function updateBadge() {
    const queueCount = managerApprovalQueue().length;
    const alertCount = autoRotationAlerts().length;
    setTabBadge('assignment-badge', queueCount + alertCount);
    setTabBadge('queue-badge', queueCount);
    setTabBadge('rotation-badge', alertCount);
}

function setTZFilter(tz, btn) {
    currentTZ = tz;
    document.querySelectorAll('.filter-tz').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateMetrics(); renderContent();
}

function getReportingContext() {
    return { team: teamData, tz: currentTZ };
}

function runReportingRender() {
    if (typeof ICSync !== 'undefined' && ICSync.seedRosterDeals(teamData)) {
        saveManagerState();
    }
    ManagerReporting.render(getReportingContext());
}

/** Reload roster from shared store and rebuild reporting charts (tab open or Refresh only). */
function refreshReporting() {
    if (!document.getElementById('tab-reporting').classList.contains('active')) return;
    initManagerData(false);
    normalizeAllEligibility();
    updateMetrics();
    if (typeof ChartLoader !== 'undefined') {
        ChartLoader.load(runReportingRender);
    } else {
        runReportingRender();
    }
}

function businessDaysSince(dateStr) {
    if (!dateStr) return 0;
    const start = new Date(dateStr + 'T12:00:00');
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    if (isNaN(start.getTime()) || start > end) return 0;
    let count = 0;
    const cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

function formatBusinessDaysOut(days) {
    const n = days === 1 ? 'day' : 'days';
    return days + ' business ' + n;
}

function escapeAttr(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function todayDateStr() {
    return new Date().toISOString().slice(0, 10);
}

function isFutureReturnDate(dateStr) {
    if (!dateStr) return false;
    return dateStr > todayDateStr();
}

function formatReturnDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function updateReturnDate(name, dateStr) {
    const im = teamData.find(i => i.name === name);
    if (!im) return;
    im.returnToRotationAt = dateStr || '';
    saveManagerState();
    renderContent();
}

function getAutoRemovalReasons(im) {
    const reasons = [];
    if (imCapacityPct(im, MPC_VALUES) >= 100) reasons.push('Capacity');
    if (im.velocity > 5) reasons.push('Velocity');
    return reasons;
}

function formatRemovalReason(im) {
    if (im.removalSource === 'auto') {
        const auto = getAutoRemovalReasons(im);
        return auto.length ? auto.join('; ') : (im.reason || '—');
    }
    return im.reason || '—';
}

function clearAutoRemovalState(im) {
    im.onRotation = true;
    im.removalSource = '';
    im.reason = '';
    im.removedAt = '';
    im.returnToRotationAt = '';
}

/** Remove IMs from deal-assignment rotation when at 100%+ capacity or >5 deals/week velocity. */
function syncRotationRemovals() {
    teamData.forEach(im => {
        if (im.rotationResumeOverride) return;
        const autoReasons = getAutoRemovalReasons(im);
        if (autoReasons.length === 0) {
            if (im.removalSource === 'auto' && !hasScheduledReturn(im)) {
                clearAutoRemovalState(im);
            }
            return;
        }
        if (im.onRotation) {
            im.onRotation = false;
            im.removalSource = 'auto';
            im.reason = autoReasons.join('; ');
            if (!im.removedAt) im.removedAt = todayDateStr();
        } else if (im.removalSource === 'auto') {
            im.reason = autoReasons.join('; ');
        }
    });
}

function openRotationRemovalModal() {
    const select = document.getElementById('manual-im-select');
    if (!select.value) {
        alert('Select an IM to remove from rotation.');
        return;
    }
    const im = teamData.find(i => i.name === select.value);
    document.getElementById('rotation-modal-im-label').textContent = formatIMName(im) + ' (' + im.tz + ')';
    document.querySelectorAll('input[name="rotation-reason"]').forEach(r => { r.checked = false; });
    document.getElementById('rotation-other-text').value = '';
    document.getElementById('rotation-modal-return-date').value = '';
    toggleRotationOtherNotes();
    showModal('rotation-removal-modal');
}

function closeRotationRemovalModal() {
    hideModal('rotation-removal-modal');
}

function toggleRotationOtherNotes() {
    const other = document.querySelector('input[name="rotation-reason"][value="Other"]');
    const wrap = document.getElementById('rotation-other-notes-wrap');
    wrap.style.display = other && other.checked ? 'block' : 'none';
}

function confirmRotationRemoval() {
    const selected = document.querySelector('input[name="rotation-reason"]:checked');
    if (!selected) {
        alert('Please select a reason for removal.');
        return;
    }
    const category = selected.value;
    let reason = category;
    let notes = '';
    if (category === 'Other') {
        notes = document.getElementById('rotation-other-text').value.trim();
        if (!notes) {
            alert('Notes are required when selecting Other.');
            return;
        }
        reason = 'Other: ' + notes;
    }
    const name = document.getElementById('manual-im-select').value;
    const im = teamData.find(i => i.name === name);
    im.onRotation = false;
    im.rotationResumeOverride = false;
    im.removalSource = 'manual';
    im.reasonCategory = category;
    im.reasonNotes = notes;
    im.reason = reason;
    im.removedAt = todayDateStr();
    im.returnToRotationAt = document.getElementById('rotation-modal-return-date').value || '';
    closeRotationRemovalModal();
    saveManagerState();
    renderContent();
}

function resumeIM(name) {
    const im = teamData.find(i => i.name === name);
    if (!im) return;
    im.onRotation = true;
    im.rotationResumeOverride = true;
    im.removalSource = '';
    im.reason = '';
    im.reasonCategory = '';
    im.reasonNotes = '';
    im.removedAt = '';
    im.returnToRotationAt = '';
    saveManagerState();
    renderContent();
}

function toggleEligSort() {
    eligSortDir = eligSortDir === 'desc' ? 'asc' : 'desc';
    renderAssignment();
}

function normalizeAllEligibility() {
    teamData.forEach(normalizeIMEligibility);
}

function setIMEligibility(name, field, checked) {
    const im = teamData.find(i => i.name === name);
    if (!im) return;
    if (field === 'med' && eligibilityMedDisabled(im)) return;
    if (field === 'lg' && eligibilityLgDisabled(im)) return;
    im[field] = checked;
    saveManagerState();
    renderContent();
}

function eligibilityCheckboxHtml(im, field) {
    const disabled = field === 'med' ? eligibilityMedDisabled(im) : eligibilityLgDisabled(im);
    const tierHint = field === 'med'
        ? 'Not eligible by tier (T1)'
        : 'Not eligible by tier (T1–T2)';
    const readyHint = field === 'med'
        ? 'Training complete — eligible for Medium deal rotation'
        : 'Training complete — eligible for Large, Enterprise, and Strategic deal rotation';
    if (disabled) {
        const phClass = field === 'med' ? 'eligibility-cb-placeholder--med' : 'eligibility-cb-placeholder--lg';
        return `<span class="eligibility-cb-placeholder ${phClass}" title="${tierHint}" aria-hidden="true"></span>`;
    }
    const colorClass = field === 'med' ? 'eligibility-cb--med' : 'eligibility-cb--lg';
    return `<input type="checkbox" class="eligibility-cb ${colorClass}" ${im[field] ? 'checked' : ''} title="${readyHint}" ` +
        `onchange="setIMEligibility('${escapeAttr(im.name)}', '${field}', this.checked)">`;
}

function renderAssignment() {
    const filtered = filterByRegionalTz(teamData);
    const approvalDeals = managerApprovalQueue();

    // New Deal Queue (Large / Enterprise / Strategic only — Single/Small/Medium auto-assign)
    const qContainer = document.getElementById('deal-queue-container');
    qContainer.innerHTML = approvalDeals.length === 0
        ? '<p style="font-size:12px; color:var(--psq-muted); margin:0;">No deals awaiting manager approval in this region. Single, Small, and Medium deals auto-assign on rotation.</p>'
        : approvalDeals.map(deal => {
        const base = (SIZE_PTS[deal.size] || 0) + (SIS_PTS[deal.sis] || 0);
        const total = base + deal.adj.length;
        const assignOptions = dealAssignIMOptionsHtml(filtered, MPC_VALUES, deal.size);
        const emptyLabel = dealAssignEmptyLabel(deal.size);
        return `<div class="review-card"><div style="display:flex; justify-content:space-between;">
            <div><h4>${deal.name} (${deal.tz})</h4><p style="font-size:11px; color:var(--psq-muted);">Base: ${deal.size} (${SIZE_PTS[deal.size] || 0}) + ${deal.sis} (${SIS_PTS[deal.sis]})</p>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px;">
                ${ADJ_OPTIONS.map(opt => `<label style="font-size:10px;"><input type="checkbox" onchange="updateQAdj(${deal.id},'${opt}')" ${deal.adj.includes(opt)?'checked':''}> ${opt} (+1)</label>`).join('')}
            </div></div>
            <div style="text-align:right;"><div style="font-size:16px; font-weight:700; color:var(--ps-dark-green);">Projected: [${total}]</div>
            <select style="margin:10px 0; padding:4px; font-size:11px; width: 100%;">${assignOptions || `<option disabled>${emptyLabel}</option>`}</select>
            <button class="btn-action active" style="width:100%;">Confirm</button></div>
        </div></div>`;
    }).join('');

    // Rotation Removal Alerts (auto, no return date yet — drives tab badge)
    const aContainer = document.getElementById('alerts-container');
    const flagged = autoRotationAlerts();
    aContainer.innerHTML = flagged.length === 0
        ? '<p class="rotation-empty-msg">No IMs auto-removed for capacity or velocity awaiting action in this region.</p>'
        : flagged.map(rotationAlertCardHtml).join('');

    const removedContainer = document.getElementById('removed-from-queue-container');
    const removed = removedFromRotationQueue().sort(function (a, b) {
        const da = a.returnToRotationAt || '9999-12-31';
        const db = b.returnToRotationAt || '9999-12-31';
        if (da !== db) return da.localeCompare(db);
        return a.name.localeCompare(b.name);
    });
    removedContainer.innerHTML = removed.length === 0
        ? '<p class="rotation-empty-msg">No IMs currently removed from rotation in this region.</p>'
        : removed.map(rotationAlertCardHtml).join('');

    // Manual Selector (regional filter; on rotation only)
    const onRotation = filtered.filter(im => im.onRotation);
    document.getElementById('manual-im-select').innerHTML = onRotation.length === 0
        ? '<option value="">No IMs on rotation in this region</option>'
        : onRotation.map(im => `<option value="${im.name}">${formatIMName(im)} (${im.tz})</option>`).join('');

    // Eligibility (Static Tier with Header Sort)
    const eContainer = document.getElementById('eligibility-container');
    const eligSorted = [...filtered].sort((a,b) => {
        const vA = parseInt(a.tier.slice(1)), vB = parseInt(b.tier.slice(1));
        return eligSortDir === 'desc' ? vB - vA : vA - vB;
    });
    eContainer.innerHTML = `<table><thead><tr><th>Name</th><th class="sortable-th" onclick="toggleEligSort()">Tier ↑↓</th><th>Med</th><th>Lg/Ent</th></tr></thead>
        <tbody>${eligSorted.map(im => {
            normalizeIMEligibility(im);
            return `<tr class="${eligibilityMedDisabled(im) && eligibilityLgDisabled(im) ? 'eligibility-row--tier-limited' : ''}">
        <td><b>${formatIMName(im)}</b></td><td>${im.tier}</td>
        <td class="eligibility-cb-cell">${eligibilityCheckboxHtml(im, 'med')}</td>
        <td class="eligibility-cb-cell">${eligibilityCheckboxHtml(im, 'lg')}</td></tr>`;
        }).join('')}</tbody></table>`;
}

function updateQAdj(id, opt) {
    const d = dealQueue.find(x => x.id === id);
    const i = d.adj.indexOf(opt);
    if (i > -1) d.adj.splice(i, 1);
    else d.adj.push(opt);
    saveManagerState();
    renderAssignment();
}

function updateMetrics() {
    let tdP=0, tpP=0, tM=0, pdC=0, yR=0, rR=0, dC=0;
    const filtered = currentTZ === 'all' ? teamData : teamData.filter(im => im.tz === currentTZ);
    filtered.forEach(im => { tdP+=im.dealPts; tpP+=im.projPts; tM+=MPC_VALUES[im.tier]; pdC+=im.pd; yR+=im.y; rR+=im.r; dC+=im.deals; });
    let spC = 0;
    if (typeof ProjectsData !== 'undefined' && ProjectsData.loadOrgProjects && ProjectsData.countRegionalProjects) {
        const orgProjects = ProjectsData.loadOrgProjects();
        if (currentTZ === 'all') {
            spC = orgProjects.length;
        } else {
            spC = ProjectsData.countRegionalProjects(orgProjects, currentTZ, teamData);
        }
    } else {
        filtered.forEach(im => { spC += im.projects; });
    }
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
                const n = TeamData.getNote(im.name);
                b.innerHTML += `<tr><td><strong>${im.tz}</strong></td><td><strong>${formatIMName(im)}</strong></td><td>${im.deals} (${im.dealPts})</td><td>${im.projects} (${im.projPts})</td><td><strong>${tot}</strong> / ${m}</td><td><span class="${capClass}" style="font-weight:700;">${pct}%</span></td><td>${formatIMRisksCell(im.y, im.r, im.pd)}</td><td>${n.substring(0,12)}${n.length>12?'...':''} <span class="edit-btn" onclick="openNoteModal('${im.name.replace(/'/g, "\\'")}')">✎</span></td></tr>`;
            });
        } else {
            const grid = document.createElement('div'); grid.className = 'im-grid'; display.appendChild(grid);
            groups[key].forEach(im => {
                const m = MPC_VALUES[im.tier], tot = im.dealPts + im.projPts, pct = Math.round((tot/m)*100);
                const capClass = leadCapacityPctClass(pct);
                const n = TeamData.getNote(im.name) || 'None';
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

function showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
    el.classList.add('is-open');
}

function hideModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('is-open');
}

function openNoteModal(name) {
    editingIM = name;
    document.getElementById('modal-im-name').innerText = `Notes for ${name}`;
    document.getElementById('note-text').value = TeamData.getNote(name);
    showModal('note-modal');
}

function closeNoteModal() {
    hideModal('note-modal');
}

function saveNote() {
    TeamData.setNote(editingIM, document.getElementById('note-text').value);
    closeNoteModal();
    renderContent();
}

function renderContent(skipSave) {
    normalizeAllEligibility();
    syncRotationRemovals();
    renderRoster();
    renderAssignment();
    if (!skipSave) saveManagerState();
    updateBadge();
}
function setSort(t) { if (currentSort === t) sortDir = sortDir === 'desc' ? 'asc' : 'desc'; else { currentSort = t; sortDir = 'desc'; } document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active-sort')); document.getElementById('sort-'+t).classList.add('active-sort'); renderContent(); }
function switchLayout(l) { currentLayout = l; document.getElementById('btn-list').classList.toggle('active', l==='list'); document.getElementById('btn-card').classList.toggle('active', l==='card'); renderContent(); }

initManagerData(true);
normalizeAllEligibility();
updateMetrics();
renderContent();

function bindManagerModals() {
    ['note-modal', 'rotation-removal-modal'].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el || el.dataset.backdropBound) return;
        el.dataset.backdropBound = '1';
        el.addEventListener('click', function (e) {
            if (e.target === el) hideModal(id);
        });
    });
}

ManagerReporting.init(getReportingContext, refreshReporting);
bindManagerModals();

IMWorkdashViewSync.onTeamDataUpdated(reloadFromSharedStore);
