/** Individual Contributor view — detail syncs to shared roster (Lead + Manager). */
(function () {
  var ADJ_OPTIONS = [
    "Extended Launch", "Proof of Concept", "Pilots",
    "DSAs/DUAs/DPAs", "DOEs/RICs/BOCES", "New Hire"
  ];

  var roster = [];
  var personaName = "";
  var myDeals = [];
  var myProjects = [];
  var tierMax = 250;
  var persistTimer = null;
  var PERSIST_DEBOUNCE_MS = 250;

  function persistNow() {
    ICSync.saveWorkspace(roster, personaName, myDeals, myProjects);
  }

  function persist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      persistTimer = null;
      persistNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  function reloadFromStore(useFullInit) {
    roster = useFullInit ? TeamData.initRoster() : TeamData.refreshRoster();
    personaName = TeamData.getICPersonaName();
    var ws = ICSync.loadWorkspace(roster, personaName);
    if (!ws) {
      if (ICSync.seedRosterDeals(roster)) {
        TeamData.saveRoster(roster);
      }
      ws = ICSync.loadWorkspace(roster, personaName);
    }
    if (!ws) return;
    myDeals = ws.deals || [];
    myProjects = ws.projects || [];
    tierMax = TeamData.MPC_VALUES[ws.im.tier] || 250;
    var sub = document.querySelector(".header-text p");
    if (sub) sub.textContent = personaName + " — My Workload & Assignments";
  }

  function switchICTab(which) {
    var isWorkload = which === "workload";
    document.getElementById("tab-my-workload").classList.toggle("active", isWorkload);
    document.getElementById("tab-my-projects").classList.toggle("active", !isWorkload);
    document.getElementById("tab-my-workload").setAttribute("aria-selected", isWorkload ? "true" : "false");
    document.getElementById("tab-my-projects").setAttribute("aria-selected", isWorkload ? "false" : "true");
    document.getElementById("view-my-workload").classList.toggle("active", isWorkload);
    document.getElementById("view-my-projects").classList.toggle("active", !isWorkload);
  }

  function updateMetrics() {
    var im = roster.find(function (r) { return r.name === personaName; });
    if (im) ICSync.syncAggregates(im, myDeals, myProjects);

    var dealPts = im ? im.dealPts : 0;
    var yellow = im ? im.y : 0;
    var red = im ? im.r : 0;
    var projPts = im ? im.projPts : 0;
    var pastDue = im ? im.pd : 0;
    var total = dealPts + projPts;
    var capPct = Math.round((total / tierMax) * 100);

    document.getElementById("stat-deals-count").innerText = myDeals.length;
    document.getElementById("stat-projects-count").innerText = myProjects.length;
    document.getElementById("stat-total-pts").innerText = total;
    document.getElementById("stat-tier-max").innerText = tierMax;
    document.getElementById("stat-deal-pts").innerText = dealPts;
    document.getElementById("stat-proj-pts").innerText = projPts;

    var capLabel = document.getElementById("stat-cap-pct");
    capLabel.innerText = capPct + "%";
    capLabel.className = "main-val " + leadCapacityPctClass(capPct);

    document.getElementById("fill-deals").style.width = (dealPts / tierMax * 100) + "%";
    document.getElementById("fill-projects").style.width = (projPts / tierMax * 100) + "%";

    document.getElementById("stat-risk-total").innerText = (yellow + red) + " At-Risk Deals";
    document.getElementById("stat-risk-breakdown").innerHTML = formatRiskBreakdown(yellow, red, "Breakdown");
    document.getElementById("stat-past-due-proj").innerHTML = formatPastDueProjects(pastDue);

    var capNote = document.querySelector(".card-summary-capacity .label");
    if (capNote && im) capNote.textContent = "Capacity Used (" + im.tier + ")";
  }

  function renderMyBook() {
    var body = document.getElementById("my-deals-body");
    body.innerHTML = "";
    var stages = ICSync.STAGES;
    myDeals.sort(function (a, b) { return stages.indexOf(a.stage) - stages.indexOf(b.stage); });
    var currentStage = "";
    var SIZE_PTS = ICSync.SIZE_PTS;
    var SIS_PTS = ICSync.SIS_PTS;
    var HEALTH_PTS = ICSync.HEALTH_PTS;

    myDeals.forEach(function (deal) {
      if (deal.stage !== currentStage) {
        body.innerHTML += '<tr><td colspan="7" class="stage-group-header">' + deal.stage + "</td></tr>";
        currentStage = deal.stage;
      }
      var pts =
        (SIZE_PTS[deal.size] || 0) +
        (SIS_PTS[deal.sis] || 0) +
        (HEALTH_PTS[deal.health] || 0) +
        (deal.adj ? deal.adj.length : 0);
      body.innerHTML +=
        "<tr><td>" + deal.stage + "</td><td><strong>" + deal.name + "</strong></td>" +
        "<td>" + deal.size + " (" + (SIZE_PTS[deal.size] || 0) + ")</td>" +
        "<td>" + deal.sis + " (" + (SIS_PTS[deal.sis] || 0) + ")</td>" +
        '<td><span class="pill ' + deal.health + '">' + deal.health + " (" + (HEALTH_PTS[deal.health] || 0) + ")</span></td>" +
        '<td><div class="adj-wrapper"><div class="adj-btn" onclick="ICView.toggleAdj(' + deal.id + ')">Manage ▼</div>' +
        '<div class="adj-dropdown" id="adj-menu-' + deal.id + '">' +
        ADJ_OPTIONS.map(function (opt) {
          return '<label style="display:block; margin-bottom:5px;"><input type="checkbox" ' +
            (deal.adj.indexOf(opt) > -1 ? "checked" : "") +
            " onchange=\"ICView.updateAdj(" + deal.id + ",'" + opt.replace(/'/g, "\\'") + "')\"> " + opt + " (+1)</label>";
        }).join("") +
        '</div><div class="adj-display">' +
        deal.adj.map(function (a) { return "<span>" + a + " (+1)</span>"; }).join("") +
        "</div></div></td><td><strong>" + pts + "</strong></td></tr>";
    });
  }

  function renderProjects() {
    var body = document.getElementById("my-projects-body");
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var twoWeeks = new Date();
    twoWeeks.setDate(today.getDate() + 14);
    body.innerHTML = myProjects.map(function (p) {
      var parts = p.endDate.split("/");
      var end = new Date(parts[2], parts[0] - 1, parts[1]);
      var dateClass = "green";
      if (end < today) dateClass = "red";
      else if (end <= twoWeeks) dateClass = "yellow";
      var pts = ICSync.calculateProjectPoints(p);
      return (
        "<tr><td><strong>" + p.name + "</strong></td>" +
        "<td>" + ICSync.formatProjectRoleLabel(p.role) + "</td>" +
        "<td>" + ICSync.formatProjectTypeLabel(p.type) + "</td>" +
        "<td>" + ICSync.formatProjectComplexityLabel(p.complexity) + "</td>" +
        "<td>" + ICSync.formatProjectTeamSizeLabel(p) + "</td>" +
        "<td>" + (p.startDate || "—") + "</td>" +
        '<td><span class="pill ' + dateClass + '">' + p.endDate + "</span></td>" +
        "<td><strong>" + pts + "</strong></td></tr>"
      );
    }).join("");
  }

  function toggleAdj(id) {
    document.querySelectorAll(".adj-dropdown").forEach(function (d) {
      if (d.id !== "adj-menu-" + id) d.classList.remove("active");
    });
    document.getElementById("adj-menu-" + id).classList.toggle("active");
  }

  function updateAdj(id, opt) {
    var d = myDeals.find(function (x) { return x.id === id; });
    var idx = d.adj.indexOf(opt);
    if (idx > -1) d.adj.splice(idx, 1);
    else d.adj.push(opt);
    persist();
    renderMyBook();
    updateMetrics();
  }

  function refresh() {
    reloadFromStore();
    updateMetrics();
    renderMyBook();
    renderProjects();
  }

  window.ICView = {
    switchICTab: switchICTab,
    toggleAdj: toggleAdj,
    updateAdj: updateAdj,
    refresh: refresh
  };

  window.onclick = function (e) {
    if (!e.target.closest(".adj-wrapper")) {
      document.querySelectorAll(".adj-dropdown").forEach(function (d) {
        d.classList.remove("active");
      });
    }
  };

  window.addEventListener("beforeunload", function () {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
      persistNow();
    }
    if (typeof TeamData !== "undefined" && TeamData.flushNotify) {
      TeamData.flushNotify();
    }
  });

  reloadFromStore(true);
  updateMetrics();
  renderMyBook();
  renderProjects();
  IMWorkdashViewSync.onTeamDataUpdated(refresh);
})();
