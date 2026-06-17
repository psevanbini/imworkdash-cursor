/** Team Lead view — territory roster + project management. */
(function () {
  var MPC_VALUES = TeamData.MPC_VALUES;
  var territoryTz = TeamData.getLeadTerritoryTz();
  var leadPersona = TeamData.LEAD_PERSONA;
  var roster = [];
  var orgProjects = [];
  var territoryIMs = [];
  var currentLayout = "list";
  var currentSort = "tier";
  var sortDir = "desc";
  var editingIM = null;
  var currentMainTab = "roster";
  var currentProjectSubTab = "roster";
  var collapsedImProjectSections = {};
  var imProjectSortDir = "desc";
  var newProjectContributors = [];
  var editProjectContributors = [];
  var editingProjectId = null;

  var CONTRIBUTOR_PICKER = {
    new: {
      list: function () { return newProjectContributors; },
      setList: function (arr) { newProjectContributors = arr; },
      leadId: "np-lead",
      selectId: "np-contributors",
      listId: "np-contributors-list",
      hintId: "np-contrib-hint",
      addId: "np-contrib-add"
    },
    edit: {
      list: function () { return editProjectContributors; },
      setList: function (arr) { editProjectContributors = arr; },
      leadId: "ep-lead",
      selectId: "ep-contributors",
      listId: "ep-contributors-list",
      hintId: "ep-contrib-hint",
      addId: "ep-contrib-add"
    }
  };

  function escapeAttr(str) {
    return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function reloadData(fullInit) {
    roster = fullInit ? TeamData.initRoster() : TeamData.refreshRoster();
    orgProjects = ProjectsData.loadOrgProjects();
    territoryIMs = TeamData.getLeadRoster(roster, territoryTz);
  }

  function updateTerritoryMetrics() {
    var tdPts = 0;
    var tpPts = 0;
    var tMax = 0;
    var yR = 0;
    var rR = 0;
    var pdCount = 0;
    var spCount = ProjectsData.countRegionalProjects(orgProjects, territoryTz, roster);
    territoryIMs.forEach(function (im) {
      tdPts += im.dealPts;
      tpPts += im.projPts;
      tMax += MPC_VALUES[im.tier];
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

  function renderRoster() {
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

  function datePillClass(mdy) {
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    var twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    var end = ProjectsData.parseMDY(mdy);
    if (!end) return "green";
    if (end < today) return "red";
    if (end <= twoWeeks) return "yellow";
    return "green";
  }

  function formatPersonName(name) {
    var im = roster.find(function (r) { return r.name === name; });
    return im ? formatIMName(im) : name;
  }

  function isInTerritory(name, byName) {
    var im = byName[name];
    return Boolean(im && im.tz === territoryTz);
  }

  function formatContributorsCell(names, byName, boldTerritory) {
    if (!names.length) return "—";
    return names.map(function (name) {
      var label = escapeHtml(formatPersonName(name));
      var inTz = isInTerritory(name, byName);
      if (boldTerritory && inTz) {
        return '<span class="project-roster-contributor-line"><strong>' + label + "</strong></span>";
      }
      return '<span class="project-roster-contributor-line">' + label + "</span>";
    }).join("");
  }

  function imSectionDomId(imName) {
    return "lead-im-proj-" + imName.replace(/[^a-zA-Z0-9]+/g, "-");
  }

  function projectPointPayload(p, role) {
    return {
      role: role,
      type: p.type,
      complexity: p.complexity,
      totalContributors: p.totalContributors
    };
  }

  var IM_ROSTER_TABLE_COLGROUP =
    "<colgroup>" +
    '<col class="col-project"><col class="col-role"><col class="col-type">' +
    '<col class="col-complexity"><col class="col-team-size"><col class="col-start"><col class="col-end">' +
    '<col class="col-proj-lead"><col class="col-points"></colgroup>';

  function imRosterTableHeadHtml(roleLabel, pointsLabel) {
    return (
      IM_ROSTER_TABLE_COLGROUP +
      "<thead><tr>" +
      '<th class="col-project">Project</th>' +
      '<th class="col-role">' + roleLabel + "</th>" +
      '<th class="col-type">Type</th>' +
      '<th class="col-complexity">Complexity</th>' +
      '<th class="col-team-size">Team Size</th>' +
      '<th class="col-start">Start</th>' +
      '<th class="col-end">End</th>' +
      '<th class="col-proj-lead">Project Lead</th>' +
      '<th class="col-points">' + pointsLabel + "</th>" +
      "</tr></thead>"
    );
  }

  function projectRowHtml(p, byName, showEdit) {
    var roleLabel = ICSync.formatProjectRoleLabel("Lead");
    var pts = ICSync.calculateProjectPoints(projectPointPayload(p, "Lead"));
    var contrib = formatContributorsCell(p.contributors || [], byName, false);
    var editCell = showEdit
      ? '<td class="col-edit"><span class="edit-btn" title="Edit project" ' +
        'onclick="LeadView.openEditProject(' + Number(p.id) + ')">✎</span></td>'
      : "";
    return (
      "<tr>" +
      '<td class="col-project"><strong>' + escapeHtml(p.name) + "</strong></td>" +
      '<td class="col-lead">' + escapeHtml(formatPersonName(p.lead)) + "</td>" +
      '<td class="col-role">' + escapeHtml(roleLabel) + "</td>" +
      '<td class="col-type">' + escapeHtml(ICSync.formatProjectTypeLabel(p.type)) + "</td>" +
      '<td class="col-complexity">' + escapeHtml(ICSync.formatProjectComplexityLabel(p.complexity)) + "</td>" +
      '<td class="col-team-size">' + escapeHtml(ICSync.formatProjectTeamSizeLabel(p)) + "</td>" +
      '<td class="col-start">' + escapeHtml(p.startDate) + "</td>" +
      '<td class="col-end"><span class="pill ' + datePillClass(p.endDate) + '">' + escapeHtml(p.endDate) + "</span></td>" +
      '<td class="col-contributors project-roster-contributors">' + contrib + "</td>" +
      '<td class="col-sponsor">' + escapeHtml(p.sponsor || "—") + "</td>" +
      '<td class="col-points"><strong>' + pts + "</strong></td>" +
      editCell +
      "</tr>"
    );
  }

  function imProjectPointsFor(p, imName) {
    var role = ProjectsData.imRoleOnProject(p, imName);
    if (!role) return 0;
    return ICSync.calculateProjectPoints(projectPointPayload(p, role));
  }

  function totalImProjectPoints(projects, imName) {
    var total = 0;
    projects.forEach(function (p) {
      total += imProjectPointsFor(p, imName);
    });
    return total;
  }

  function imProjectRowHtml(p, imName, byName) {
    var role = ProjectsData.imRoleOnProject(p, imName);
    var myPts = imProjectPointsFor(p, imName);
    var leadCell = p.lead === imName
      ? "—"
      : escapeHtml(formatPersonName(p.lead));
    return (
      "<tr>" +
      '<td class="col-project"><strong>' + escapeHtml(p.name) + "</strong></td>" +
      '<td class="col-role">' + escapeHtml(ICSync.formatProjectRoleLabel(role)) + "</td>" +
      '<td class="col-type">' + escapeHtml(ICSync.formatProjectTypeLabel(p.type)) + "</td>" +
      '<td class="col-complexity">' + escapeHtml(ICSync.formatProjectComplexityLabel(p.complexity)) + "</td>" +
      '<td class="col-team-size">' + escapeHtml(ICSync.formatProjectTeamSizeLabel(p)) + "</td>" +
      '<td class="col-start">' + escapeHtml(p.startDate) + "</td>" +
      '<td class="col-end"><span class="pill ' + datePillClass(p.endDate) + '">' + escapeHtml(p.endDate) + "</span></td>" +
      '<td class="col-proj-lead">' + leadCell + "</td>" +
      '<td class="col-points"><strong>' + myPts + "</strong></td>" +
      "</tr>"
    );
  }

  function renderProjectRosterSection(bodyId, list, emptyMsg, byName, colSpan, showEdit) {
    var body = document.getElementById(bodyId);
    if (!body) return;
    var cols = colSpan || 11;
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="' + cols + '" style="color:var(--psq-muted);">' + emptyMsg + "</td></tr>";
      return;
    }
    body.innerHTML = list.map(function (p) {
      return projectRowHtml(p, byName, showEdit);
    }).join("");
  }

  function toggleImProjectSection(imName) {
    collapsedImProjectSections[imName] = !collapsedImProjectSections[imName];
    var block = document.getElementById(imSectionDomId(imName));
    if (!block) return;
    var collapsed = Boolean(collapsedImProjectSections[imName]);
    block.classList.toggle("is-collapsed", collapsed);
    var btn = block.querySelector(".lead-im-project-header");
    if (btn) {
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      var chevron = btn.querySelector(".lead-im-chevron");
      if (chevron) chevron.textContent = collapsed ? "▶" : "▼";
    }
  }

  function imTierSortKey(im) {
    return parseInt(String(im.tier).replace(/\D/g, ""), 10) || 0;
  }

  function updateImProjectSortHint() {
    var hint = document.getElementById("lead-im-sort-hint");
    if (hint) {
      hint.textContent = imProjectSortDir === "desc" ? "Highest tier first" : "Lowest tier first";
    }
  }

  function setImProjectSort() {
    imProjectSortDir = imProjectSortDir === "desc" ? "asc" : "desc";
    updateImProjectSortHint();
    var byName = {};
    roster.forEach(function (im) { byName[im.name] = im; });
    renderImProjectSections(byName);
  }

  function renderImProjectSections(byName) {
    var container = document.getElementById("lead-im-project-sections");
    if (!container) return;
    updateImProjectSortHint();
    var tzIms = roster.filter(function (im) { return im.tz === territoryTz; });
    tzIms.sort(function (a, b) {
      var vA = imTierSortKey(a);
      var vB = imTierSortKey(b);
      if (vA !== vB) {
        return imProjectSortDir === "desc" ? vB - vA : vA - vB;
      }
      return a.name.localeCompare(b.name);
    });
    if (!tzIms.length) {
      container.innerHTML = '<p class="lead-form-hint">No IMs in this territory.</p>';
      return;
    }
    container.innerHTML = tzIms.map(function (im) {
      var projects = ProjectsData.getOrgProjectsForIM(orgProjects, im.name);
      var collapsed = Boolean(collapsedImProjectSections[im.name]);
      var chevron = collapsed ? "▶" : "▼";
      var totalPts = totalImProjectPoints(projects, im.name);
      var countLabel = projects.length === 1 ? "1 project" : projects.length + " projects";
      countLabel += " · " + totalPts + " pts";
      var tableBody = projects.length
        ? projects.map(function (p) { return imProjectRowHtml(p, im.name, byName); }).join("")
        : '<tr><td colspan="9" style="color:var(--psq-muted);">No projects as lead or contributor.</td></tr>';
      return (
        '<div id="' + imSectionDomId(im.name) + '" class="lead-im-project-block' + (collapsed ? " is-collapsed" : "") + '">' +
        '<button type="button" class="lead-im-project-header" aria-expanded="' + (!collapsed) + '" ' +
        'onclick="LeadView.toggleImProjectSection(\'' + escapeAttr(im.name) + "')\">" +
        '<span><span class="lead-im-chevron">' + chevron + "</span> " + escapeHtml(formatIMName(im)) + "</span>" +
        '<span class="lead-im-project-count">' + countLabel + "</span></button>" +
        '<div class="lead-im-project-body">' +
        '<table class="projects-table projects-table--im-roster">' +
        imRosterTableHeadHtml("My Role", "My Points") +
        "<tbody>" + tableBody + "</tbody></table></div></div>"
      );
    }).join("");
  }

  function renderProjectRoster() {
    var byName = {};
    roster.forEach(function (im) { byName[im.name] = im; });
    document.querySelectorAll(".lead-tz-label-inline").forEach(function (el) {
      el.textContent = territoryTz;
    });
    var leadProjects = ProjectsData.getTerritoryLeadProjects(orgProjects, territoryTz, roster);
    renderProjectRosterSection(
      "lead-project-roster-leads-body",
      leadProjects,
      "No projects with a lead in " + territoryTz + ".",
      byName,
      12,
      true
    );
    renderImProjectSections(byName);
  }

  function renderMyProjects() {
    var body = document.getElementById("lead-my-projects-body");
    var mine = ProjectsData.getProjectsForIM(orgProjects, leadPersona);
    if (!mine.length) {
      body.innerHTML = '<tr><td colspan="8" style="color:var(--psq-muted);">No active projects assigned (check start dates).</td></tr>';
      return;
    }
    body.innerHTML = mine.map(function (p) {
      var pts = ICSync.calculateProjectPoints(p);
      return (
        "<tr><td><strong>" + escapeHtml(p.name) + "</strong></td>" +
        "<td>" + escapeHtml(ICSync.formatProjectRoleLabel(p.role)) + "</td>" +
        "<td>" + escapeHtml(ICSync.formatProjectTypeLabel(p.type)) + "</td>" +
        "<td>" + escapeHtml(ICSync.formatProjectComplexityLabel(p.complexity)) + "</td>" +
        "<td>" + escapeHtml(ICSync.formatProjectTeamSizeLabel(p)) + "</td>" +
        "<td>" + escapeHtml(p.startDate || "—") + "</td>" +
        '<td><span class="pill ' + datePillClass(p.endDate) + '">' + escapeHtml(p.endDate) + "</span></td>" +
        "<td><strong>" + pts + "</strong></td></tr>"
      );
    }).join("");
  }

  function populateNewProjectForm() {
    var leadSelect = document.getElementById("np-lead");
    var sponsorSelect = document.getElementById("np-sponsor");
    var tzIms = roster.filter(function (im) { return im.tz === territoryTz; }).sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    var leadEligible = tzIms.filter(function (im) { return ProjectsData.canIMBeProjectLead(im); });
    leadSelect.innerHTML = '<option value="">Select project lead…</option>' +
      leadEligible.map(function (im) {
        return '<option value="' + escapeAttr(im.name) + '">' + escapeHtml(ProjectsData.formatIMSelectLabel(im)) + "</option>";
      }).join("");
    sponsorSelect.innerHTML = '<option value="">Select sponsor…</option>' +
      ProjectsData.PROJECT_SPONSORS.map(function (s) {
        return '<option value="' + escapeAttr(s) + '">' + escapeHtml(s) + "</option>";
      }).join("");
    CONTRIBUTOR_PICKER.new.setList([]);
    var totalInput = document.getElementById("np-total-contributors");
    if (totalInput) totalInput.value = "0";
    refreshContributorDropdown("new");
    renderContributorsList("new");
    updateContributorAddButton("new");
  }

  function populateEditProjectLeadAndSponsor() {
    var leadSelect = document.getElementById("ep-lead");
    var sponsorSelect = document.getElementById("ep-sponsor");
    var tzIms = roster.filter(function (im) { return im.tz === territoryTz; }).sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    var leadEligible = tzIms.filter(function (im) { return ProjectsData.canIMBeProjectLead(im); });
    leadSelect.innerHTML = '<option value="">Select project lead…</option>' +
      leadEligible.map(function (im) {
        return '<option value="' + escapeAttr(im.name) + '">' + escapeHtml(ProjectsData.formatIMSelectLabel(im)) + "</option>";
      }).join("");
    sponsorSelect.innerHTML = '<option value="">Select sponsor…</option>' +
      ProjectsData.PROJECT_SPONSORS.map(function (s) {
        return '<option value="' + escapeAttr(s) + '">' + escapeHtml(s) + "</option>";
      }).join("");
    var tzHint = document.getElementById("ep-tz-hint");
    if (tzHint) tzHint.textContent = territoryTz;
  }

  function refreshContributorDropdown(kind) {
    var cfg = CONTRIBUTOR_PICKER[kind];
    if (!cfg) return;
    var contribSelect = document.getElementById(cfg.selectId);
    var leadEl = document.getElementById(cfg.leadId);
    if (!contribSelect || !leadEl) return;
    var lead = leadEl.value;
    var taken = {};
    cfg.list().forEach(function (n) { taken[n] = true; });
    if (lead) taken[lead] = true;
    var allIms = roster.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    var available = allIms.filter(function (im) {
      return ProjectsData.canIMBeProjectContributor(im) && !taken[im.name];
    });
    contribSelect.innerHTML = '<option value="">Select IM to add…</option>' +
      available.map(function (im) {
        return '<option value="' + escapeAttr(im.name) + '">' + escapeHtml(ProjectsData.formatIMSelectLabel(im)) + "</option>";
      }).join("");
    contribSelect.value = "";
    updateContributorAddButton(kind);
  }

  function renderContributorsList(kind) {
    var cfg = CONTRIBUTOR_PICKER[kind];
    if (!cfg) return;
    var listEl = document.getElementById(cfg.listId);
    var hintEl = document.getElementById(cfg.hintId);
    var names = cfg.list();
    var max = ProjectsData.MAX_PROJECT_CONTRIBUTORS;
    var removeFn = kind === "edit" ? "removeEditProjectContributor" : "removeProjectContributor";
    listEl.innerHTML = names.map(function (name) {
      var im = roster.find(function (r) { return r.name === name; });
      var label = im ? ProjectsData.formatIMSelectLabel(im) : name;
      return (
        '<li class="lead-contrib-chip">' +
        escapeHtml(label) +
        '<button type="button" class="lead-contrib-chip-remove" title="Remove" ' +
        'onclick="LeadView.' + removeFn + "('" + escapeAttr(name) + "')\">×</button></li>"
      );
    }).join("");
    if (hintEl) {
      hintEl.innerHTML =
        names.length + " of " + max + " — select one IM at a time (<strong>Tier 2+</strong>; T1 excluded). All regions.";
    }
    var totalEl = document.getElementById(kind === "edit" ? "ep-total-contributors" : "np-total-contributors");
    if (totalEl) {
      var cur = parseInt(totalEl.value, 10);
      if (isNaN(cur) || cur < names.length) totalEl.value = String(names.length);
    }
  }

  function updateContributorAddButton(kind) {
    var cfg = CONTRIBUTOR_PICKER[kind];
    if (!cfg) return;
    var addBtn = document.getElementById(cfg.addId);
    var select = document.getElementById(cfg.selectId);
    if (!addBtn || !select) return;
    var atMax = cfg.list().length >= ProjectsData.MAX_PROJECT_CONTRIBUTORS;
    var hasChoice = select.options.length > 1;
    addBtn.disabled = atMax || !hasChoice;
  }

  function onProjectLeadChange(kind) {
    var cfg = CONTRIBUTOR_PICKER[kind];
    if (!cfg) return;
    var lead = document.getElementById(cfg.leadId).value;
    if (lead) {
      cfg.setList(cfg.list().filter(function (n) { return n !== lead; }));
    }
    refreshContributorDropdown(kind);
    renderContributorsList(kind);
  }

  function addProjectContributorFor(kind) {
    var cfg = CONTRIBUTOR_PICKER[kind];
    if (!cfg) return;
    var select = document.getElementById(cfg.selectId);
    var name = select.value;
    if (!name) return;
    var list = cfg.list();
    if (list.indexOf(name) >= 0) return;
    var lead = document.getElementById(cfg.leadId).value;
    if (name === lead) return;
    if (list.length >= ProjectsData.MAX_PROJECT_CONTRIBUTORS) {
      alert(
        "A project can have at most " + ProjectsData.MAX_PROJECT_CONTRIBUTORS +
        " contributors (the project lead is separate)."
      );
      return;
    }
    var im = roster.find(function (r) { return r.name === name; });
    if (!im || !ProjectsData.canIMBeProjectContributor(im)) {
      alert("Contributors must be Tier 2 or higher (T1 cannot be assigned to projects).");
      return;
    }
    list.push(name);
    cfg.setList(list);
    syncTotalContributorsFromImList(kind);
    refreshContributorDropdown(kind);
    renderContributorsList(kind);
  }

  function removeProjectContributorFor(kind, name) {
    var cfg = CONTRIBUTOR_PICKER[kind];
    if (!cfg) return;
    cfg.setList(cfg.list().filter(function (n) { return n !== name; }));
    syncTotalContributorsFromImList(kind);
    refreshContributorDropdown(kind);
    renderContributorsList(kind);
  }

  function totalContributorsInputId(kind) {
    return (kind === "edit" ? "ep" : "np") + "-total-contributors";
  }

  function syncTotalContributorsFromImList(kind) {
    var cfg = CONTRIBUTOR_PICKER[kind];
    if (!cfg) return;
    var input = document.getElementById(totalContributorsInputId(kind));
    if (!input) return;
    var imCount = cfg.list().length;
    var current = parseInt(input.value, 10);
    if (isNaN(current) || current < imCount) {
      input.value = String(imCount);
    }
  }

  function onNewProjectLeadChange() {
    onProjectLeadChange("new");
  }

  function addProjectContributor() {
    addProjectContributorFor("new");
  }

  function removeProjectContributor(name) {
    removeProjectContributorFor("new", name);
  }

  function onEditProjectLeadChange() {
    onProjectLeadChange("edit");
  }

  function addEditProjectContributor() {
    addProjectContributorFor("edit");
  }

  function removeEditProjectContributor(name) {
    removeProjectContributorFor("edit", name);
  }

  function readTotalContributors(kind, contributorCount) {
    var el = document.getElementById((kind === "edit" ? "ep" : "np") + "-total-contributors");
    if (!el || el.value === "") return String(Math.max(contributorCount, 0));
    return el.value;
  }

  function collectProjectFormFields(kind) {
    var prefix = kind === "edit" ? "ep" : "np";
    var cfg = CONTRIBUTOR_PICKER[kind];
    var contributors = cfg.list().slice();
    return {
      name: document.getElementById(prefix + "-name").value.trim(),
      lead: document.getElementById(prefix + "-lead").value,
      contributors: contributors,
      totalContributors: readTotalContributors(kind, contributors.length),
      type: document.getElementById(prefix + "-type").value,
      complexity: document.getElementById(prefix + "-complexity").value,
      sponsor: document.getElementById(prefix + "-sponsor").value,
      startDate: ProjectsData.mdyFromInput(document.getElementById(prefix + "-start").value),
      endDate: ProjectsData.mdyFromInput(document.getElementById(prefix + "-end").value)
    };
  }

  function validateProjectFields(fields) {
    if (!fields.name || !fields.lead || !fields.type || !fields.complexity || !fields.sponsor ||
        !fields.startDate || !fields.endDate) {
      alert("Please complete all required fields.");
      return false;
    }
    var leadIm = roster.find(function (r) { return r.name === fields.lead; });
    if (!leadIm || !ProjectsData.canIMBeProjectLead(leadIm)) {
      alert("Project lead must be Tier 3 or higher (T1 and T2 cannot lead projects).");
      return false;
    }
    var contributors = fields.contributors.filter(function (n) { return n && n !== fields.lead; });
    var invalidContrib = contributors.filter(function (n) {
      var im = roster.find(function (r) { return r.name === n; });
      return !im || !ProjectsData.canIMBeProjectContributor(im);
    });
    if (invalidContrib.length) {
      alert("Contributors must be Tier 2 or higher (T1 cannot be assigned to projects).");
      return false;
    }
    if (contributors.length > ProjectsData.MAX_PROJECT_CONTRIBUTORS) {
      alert(
        "A project can have at most " + ProjectsData.MAX_PROJECT_CONTRIBUTORS +
        " contributors (the project lead is separate)."
      );
      return false;
    }
    fields.contributors = contributors;
    var total = parseInt(fields.totalContributors, 10);
    if (isNaN(total) || total < 0) {
      alert("Enter total contributors (all teams), zero or more.");
      return false;
    }
    if (total < contributors.length) {
      alert(
        "Total contributors cannot be less than the number of IMs listed (" +
        contributors.length + ")."
      );
      return false;
    }
    fields.totalContributors = total;
    return true;
  }

  function refreshAfterProjectChange() {
    roster = TeamData.refreshRoster();
    orgProjects = ProjectsData.loadOrgProjects();
    territoryIMs = TeamData.getLeadRoster(roster, territoryTz);
    updateTerritoryMetrics();
    renderProjectRoster();
    renderMyProjects();
    renderRoster();
  }

  function openEditProject(projectId) {
    var project = ProjectsData.getProjectById(orgProjects, projectId);
    if (!project) return;
    editingProjectId = project.id;
    populateEditProjectLeadAndSponsor();
    document.getElementById("ep-name").value = project.name;
    document.getElementById("ep-lead").value = project.lead;
    document.getElementById("ep-type").value = project.type;
    document.getElementById("ep-complexity").value = project.complexity;
    document.getElementById("ep-sponsor").value = project.sponsor || "";
    document.getElementById("ep-start").value = ProjectsData.inputFromMdy(project.startDate);
    document.getElementById("ep-end").value = ProjectsData.inputFromMdy(project.endDate);
    CONTRIBUTOR_PICKER.edit.setList((project.contributors || []).slice());
    var totalEl = document.getElementById("ep-total-contributors");
    if (totalEl) {
      totalEl.value = String(
        project.totalContributors != null
          ? project.totalContributors
          : (project.contributors || []).length
      );
    }
    refreshContributorDropdown("edit");
    renderContributorsList("edit");
    document.getElementById("project-edit-modal-title").textContent = "Edit project — " + project.name;
    showModal("project-edit-modal");
  }

  function closeEditProjectModal() {
    editingProjectId = null;
    hideModal("project-edit-modal");
  }

  function submitEditProject(e) {
    e.preventDefault();
    if (editingProjectId == null) return;
    var fields = collectProjectFormFields("edit");
    if (!validateProjectFields(fields)) return;
    var updated = ProjectsData.updateProject(roster, editingProjectId, fields);
    if (!updated) {
      alert("Could not save project. Check lead tier (T3+ required).");
      return;
    }
    roster = TeamData.loadRoster();
    closeEditProjectModal();
    refreshAfterProjectChange();
  }

  function resetNewProjectForm() {
    document.getElementById("lead-new-project-form").reset();
    document.getElementById("lead-form-success").classList.remove("visible");
    populateNewProjectForm();
  }

  function submitNewProject(e) {
    e.preventDefault();
    var fields = collectProjectFormFields("new");
    if (!validateProjectFields(fields)) return;
    var added = ProjectsData.addProject(roster, fields);
    if (!added) {
      alert("Could not create project. Check lead tier (T3+ required).");
      return;
    }
    document.getElementById("lead-form-success").classList.add("visible");
    document.getElementById("np-name").value = "";
    document.getElementById("np-start").value = "";
    document.getElementById("np-end").value = "";
    CONTRIBUTOR_PICKER.new.setList([]);
    refreshContributorDropdown("new");
    renderContributorsList("new");
    refreshAfterProjectChange();
  }

  function switchMainTab(tab) {
    currentMainTab = tab;
    document.getElementById("lead-tab-roster").classList.toggle("active", tab === "roster");
    document.getElementById("lead-tab-projects").classList.toggle("active", tab === "projects");
    document.getElementById("lead-view-roster").classList.toggle("active", tab === "roster");
    document.getElementById("lead-view-projects").classList.toggle("active", tab === "projects");
    if (tab === "projects") renderProjectPanels();
  }

  function switchProjectSubTab(tab) {
    currentProjectSubTab = tab;
    document.getElementById("lead-proj-tab-roster").classList.toggle("active", tab === "roster");
    document.getElementById("lead-proj-tab-mine").classList.toggle("active", tab === "mine");
    document.getElementById("lead-proj-tab-new").classList.toggle("active", tab === "new");
    document.getElementById("lead-proj-panel-roster").classList.toggle("active", tab === "roster");
    document.getElementById("lead-proj-panel-mine").classList.toggle("active", tab === "mine");
    document.getElementById("lead-proj-panel-new").classList.toggle("active", tab === "new");
    if (tab === "new") populateNewProjectForm();
    else renderProjectPanels();
  }

  function renderProjectPanels() {
    renderProjectRoster();
    renderMyProjects();
  }

  function refresh(fullInit) {
    reloadData(fullInit);
    document.getElementById("lead-header-sub").textContent = territoryTz + " Regional Workload";
    document.getElementById("lead-tz-label").textContent = territoryTz;
    document.getElementById("lead-tz-hint").textContent = territoryTz;
    document.getElementById("lead-persona-label").textContent = leadPersona;
    updateTerritoryMetrics();
    renderRoster();
    renderProjectPanels();
    if (currentProjectSubTab === "new") populateNewProjectForm();
  }

  function setSort(t) {
    if (currentSort === t) sortDir = sortDir === "desc" ? "asc" : "desc";
    else { currentSort = t; sortDir = "desc"; }
    document.querySelectorAll(".btn-sort").forEach(function (b) { b.classList.remove("active-sort"); });
    document.getElementById("sort-" + t).classList.add("active-sort");
    renderRoster();
  }

  function switchLayout(l) {
    currentLayout = l;
    document.getElementById("btn-list").classList.toggle("active", l === "list");
    document.getElementById("btn-card").classList.toggle("active", l === "card");
    renderRoster();
  }

  function showModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = "flex";
    el.classList.add("is-open");
  }

  function hideModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = "none";
    el.classList.remove("is-open");
  }

  function bindLeadModals() {
    ["note-modal", "project-edit-modal"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.dataset.backdropBound) return;
      el.dataset.backdropBound = "1";
      el.addEventListener("click", function (e) {
        if (e.target === el) hideModal(id);
      });
    });
  }

  function openModal(name) {
    editingIM = name;
    document.getElementById("modal-im-name").innerText = "Notes for " + name;
    document.getElementById("note-text").value = TeamData.getNote(name);
    showModal("note-modal");
  }

  function closeModal() {
    hideModal("note-modal");
  }

  function saveNote() {
    TeamData.setNote(editingIM, document.getElementById("note-text").value);
    closeModal();
    renderRoster();
  }

  window.LeadView = {
    switchMainTab: switchMainTab,
    switchProjectSubTab: switchProjectSubTab,
    toggleImProjectSection: toggleImProjectSection,
    setImProjectSort: setImProjectSort,
    setSort: setSort,
    switchLayout: switchLayout,
    openModal: openModal,
    closeModal: closeModal,
    saveNote: saveNote,
    submitNewProject: submitNewProject,
    resetNewProjectForm: resetNewProjectForm,
    onNewProjectLeadChange: onNewProjectLeadChange,
    addProjectContributor: addProjectContributor,
    removeProjectContributor: removeProjectContributor,
    openEditProject: openEditProject,
    closeEditProjectModal: closeEditProjectModal,
    submitEditProject: submitEditProject,
    onEditProjectLeadChange: onEditProjectLeadChange,
    addEditProjectContributor: addEditProjectContributor,
    removeEditProjectContributor: removeEditProjectContributor,
    refresh: refresh
  };

  bindLeadModals();
  refresh(true);
  IMWorkdashViewSync.onTeamDataUpdated(function () { refresh(); });
})();
