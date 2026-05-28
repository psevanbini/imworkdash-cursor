/** Team Lead view — EST territory rollup from shared roster (fed by IC + Manager). */
(function () {
  var MPC_VALUES = TeamData.MPC_VALUES;
  var territoryIMs = [];
  var currentLayout = "list";
  var currentSort = "tier";
  var sortDir = "desc";
  var editingIM = null;

  function escapeAttr(str) {
    return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  function reloadTerritory() {
    var roster = TeamData.loadRoster();
    territoryIMs = TeamData.getLeadRoster(roster, TeamData.getLeadTerritoryTz());
  }

  function updateTerritoryMetrics() {
    var tdPts = 0;
    var tpPts = 0;
    var tMax = 0;
    var yR = 0;
    var rR = 0;
    var spCount = 0;
    var pdCount = 0;
    territoryIMs.forEach(function (im) {
      tdPts += im.dealPts;
      tpPts += im.projPts;
      tMax += MPC_VALUES[im.tier];
      spCount += im.projects;
      pdCount += im.pd;
      yR += im.y;
      rR += im.r;
    });
    var tPts = tdPts + tpPts;
    var cap = tMax ? Math.round((tPts / tMax) * 100) : 0;
    document.getElementById("t-im-count").innerText = territoryIMs.length;
    document.getElementById("t-strat-proj").innerText = spCount;
    document.getElementById("t-total-pts").innerText = tPts;
    document.getElementById("t-max-pts").innerText = tMax;
    document.getElementById("t-deal-pts").innerText = tdPts;
    document.getElementById("t-proj-pts").innerText = tpPts;
    var capEl = document.getElementById("t-cap-pct");
    capEl.innerText = cap + "%";
    capEl.className = "main-val " + leadCapacityPctClass(cap);
    document.getElementById("t-fill-deals").style.width = (tdPts / tMax * 100) + "%";
    document.getElementById("t-fill-projects").style.width = (tpPts / tMax * 100) + "%";
    document.getElementById("t-risk-total").innerText = (yR + rR) + " At-Risk Deals";
    document.getElementById("t-risk-breakdown").innerHTML = formatRiskBreakdown(yR, rR, "Health Breakdown");
    document.getElementById("t-past-due-proj").innerHTML = formatPastDueProjects(pdCount);
  }

  function renderContent() {
    var display = document.getElementById("territory-display");
    display.innerHTML = "";
    var sorted = territoryIMs.slice().sort(function (a, b) {
      var vA = currentSort === "tier" ? parseInt(a.tier.slice(1), 10) : (a.dealPts + a.projPts) / MPC_VALUES[a.tier];
      var vB = currentSort === "tier" ? parseInt(b.tier.slice(1), 10) : (b.dealPts + b.projPts) / MPC_VALUES[b.tier];
      return sortDir === "desc" ? vB - vA : vA - vB;
    });
    var groups = {};
    sorted.forEach(function (im) {
      var pct = Math.round(((im.dealPts + im.projPts) / MPC_VALUES[im.tier]) * 100);
      var key = currentSort === "tier"
        ? "Tier " + im.tier.slice(1)
        : (pct >= 90 ? "Critical (90%+)" : (pct >= 80 ? "High (80-89%)" : "Stable (Under 80%)"));
      if (!groups[key]) groups[key] = [];
      groups[key].push(im);
    });

    Object.keys(groups).forEach(function (key) {
      var h = document.createElement("div");
      h.className = groupHeaderClassForKey(key);
      h.innerText = key;
      display.appendChild(h);
      if (currentLayout === "list") {
        var t = document.createElement("table");
        t.innerHTML =
          "<thead><tr><th>IM Name</th><th>Deals (Pts)</th><th>Projs (Pts)</th><th>Total / Cap</th><th>% Cap</th><th>Risks (Y/R|P)</th><th>Notes</th></tr></thead>" +
          '<tbody id="b-' + key.replace(/\s/g, "") + '"></tbody>';
        display.appendChild(t);
        var b = t.querySelector("tbody");
        groups[key].forEach(function (im) {
          var m = MPC_VALUES[im.tier];
          var tot = im.dealPts + im.projPts;
          var pct = Math.round((tot / m) * 100);
          var capClass = leadCapacityPctClass(pct);
          var n = TeamData.getNote(im.name);
          b.innerHTML +=
            "<tr><td><strong>" + formatIMName(im) + "</strong></td>" +
            "<td>" + im.deals + " (" + im.dealPts + ")</td>" +
            "<td>" + im.projects + " (" + im.projPts + ")</td>" +
            "<td><strong>" + tot + "</strong> / " + m + "</td>" +
            '<td><span class="' + capClass + '" style="font-weight:700;">' + pct + "%</span></td>" +
            "<td>" + formatIMRisksCell(im.y, im.r, im.pd) + "</td>" +
            "<td>" + n.substring(0, 12) + (n.length > 12 ? "..." : "") +
            ' <span class="edit-btn" onclick="LeadView.openModal(\'' + escapeAttr(im.name) + "')\">✎</span></td></tr>";
        });
      } else {
        var grid = document.createElement("div");
        grid.className = "im-grid";
        display.appendChild(grid);
        groups[key].forEach(function (im) {
          var m = MPC_VALUES[im.tier];
          var tot = im.dealPts + im.projPts;
          var pct = Math.round((tot / m) * 100);
          var capClass = leadCapacityPctClass(pct);
          var n = TeamData.getNote(im.name) || "None";
          grid.innerHTML +=
            '<div class="' + imCardClassList(im) + '">' +
            '<div style="display:flex; justify-content:space-between;"><h3>' + formatIMName(im) + '</h3><span class="' + capClass + '" style="font-weight:700; font-size:12px;">' + pct + "%</span></div>" +
            '<div class="stats">Pts: <b>' + tot + "</b>/" + m + " | Deals: " + im.deals + " | Projs: " + im.projects + "<br>Risks: " +
            formatIMRisksInline(im.y, im.r, im.pd) + "</div>" +
            '<div class="summary-cap-bar" style="height:6px;"><div style="width:' + (im.dealPts / m * 100) + '%; background:var(--ps-green);"></div><div style="width:' +
            (im.projPts / m * 100) + '%; background:var(--ps-blue);"></div></div>' +
            '<div style="font-size:10px; color:#999; border-top:1px solid #eee; padding-top:5px; height:30px; overflow:hidden;">"' + n +
            '" <span class="edit-btn" onclick="LeadView.openModal(\'' + escapeAttr(im.name) + "')\">✎</span></div></div>";
        });
      }
    });
  }

  function refresh() {
    reloadTerritory();
    updateTerritoryMetrics();
    renderContent();
  }

  function setSort(t) {
    if (currentSort === t) sortDir = sortDir === "desc" ? "asc" : "desc";
    else { currentSort = t; sortDir = "desc"; }
    document.querySelectorAll(".btn-sort").forEach(function (b) { b.classList.remove("active-sort"); });
    document.getElementById("sort-" + t).classList.add("active-sort");
    renderContent();
  }

  function switchLayout(l) {
    currentLayout = l;
    document.getElementById("btn-list").classList.toggle("active", l === "list");
    document.getElementById("btn-card").classList.toggle("active", l === "card");
    renderContent();
  }

  function openModal(name) {
    editingIM = name;
    document.getElementById("modal-im-name").innerText = "Notes for " + name;
    document.getElementById("note-text").value = TeamData.getNote(name);
    document.getElementById("note-modal").style.display = "flex";
  }

  function closeModal() {
    document.getElementById("note-modal").style.display = "none";
  }

  function saveNote() {
    TeamData.setNote(editingIM, document.getElementById("note-text").value);
    closeModal();
    renderContent();
  }

  window.LeadView = {
    setSort: setSort,
    switchLayout: switchLayout,
    openModal: openModal,
    closeModal: closeModal,
    saveNote: saveNote,
    refresh: refresh
  };

  refresh();
  IMWorkdashViewSync.onTeamDataUpdated(refresh);
})();
