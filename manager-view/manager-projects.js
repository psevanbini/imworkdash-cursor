/** Manager — Project Management (regional roster by IM + sponsor My Projects). */
var ManagerProjects = (function () {
  var orgProjects = [];
  var collapsedImProjectSections = {};
  var imProjectSortDir = "desc";
  var currentProjectSubTab = "roster";
  var managerSponsor = TeamData.MANAGER_SPONSOR;

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

  function regionalLabel() {
    return currentTZ === "all" ? "All Regions" : currentTZ;
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
    var im = teamData.find(function (r) { return r.name === name; });
    return im ? formatIMName(im) : name;
  }

  function imSectionDomId(imName) {
    return "mgr-im-proj-" + imName.replace(/[^a-zA-Z0-9]+/g, "-");
  }

  function imTierSortKey(im) {
    return parseInt(String(im.tier).replace(/\D/g, ""), 10) || 0;
  }

  /** T1 IMs cannot lead or contribute to strategic projects. */
  function imsEligibleForProjects(ims) {
    return ims.filter(function (im) {
      return ProjectsData.canIMBeProjectContributor(im);
    });
  }

  function projectPointPayload(p, role) {
    return {
      role: role,
      type: p.type,
      complexity: p.complexity,
      totalContributors: p.totalContributors
    };
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

  function projectsForImInView(imName) {
    var mine = ProjectsData.getOrgProjectsForIM(orgProjects, imName);
    if (currentTZ === "all") return mine;
    var regional = ProjectsData.getRegionalProjects(orgProjects, currentTZ, teamData);
    var ids = {};
    regional.forEach(function (p) {
      ids[p.id] = true;
    });
    return mine.filter(function (p) {
      return ids[p.id];
    });
  }

  function formatContributorsCell(names) {
    if (!names.length) return "—";
    return names.map(function (name) {
      return '<span class="project-roster-contributor-line">' + escapeHtml(formatPersonName(name)) + "</span>";
    }).join("");
  }

  var IM_ROSTER_TABLE_COLGROUP =
    "<colgroup>" +
    '<col class="col-project"><col class="col-role"><col class="col-type">' +
    '<col class="col-complexity"><col class="col-team-size"><col class="col-start"><col class="col-end">' +
    '<col class="col-proj-lead"><col class="col-points"></colgroup>';

  function imRosterTableHeadHtml() {
    return (
      IM_ROSTER_TABLE_COLGROUP +
      "<thead><tr>" +
      '<th class="col-project">Project</th>' +
      '<th class="col-role">Role</th>' +
      '<th class="col-type">Type</th>' +
      '<th class="col-complexity">Complexity</th>' +
      '<th class="col-team-size">Team Size</th>' +
      '<th class="col-start">Start</th>' +
      '<th class="col-end">End</th>' +
      '<th class="col-proj-lead">Project Lead</th>' +
      '<th class="col-points">Points</th>' +
      "</tr></thead>"
    );
  }

  function imProjectRowHtml(p, imName) {
    var role = ProjectsData.imRoleOnProject(p, imName);
    var pts = imProjectPointsFor(p, imName);
    var leadCell = p.lead === imName ? "—" : escapeHtml(formatPersonName(p.lead));
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
      '<td class="col-points"><strong>' + pts + "</strong></td>" +
      "</tr>"
    );
  }

  function sponsorProjectRowHtml(p) {
    var pts = ICSync.calculateProjectPoints(projectPointPayload(p, "Contributor"));
    return (
      "<tr>" +
      "<td><strong>" + escapeHtml(p.name) + "</strong></td>" +
      "<td>" + escapeHtml(formatPersonName(p.lead)) + "</td>" +
      "<td>" + escapeHtml(ICSync.formatProjectTypeLabel(p.type)) + "</td>" +
      "<td>" + escapeHtml(ICSync.formatProjectComplexityLabel(p.complexity)) + "</td>" +
      "<td>" + escapeHtml(ICSync.formatProjectTeamSizeLabel(p)) + "</td>" +
      "<td>" + escapeHtml(p.startDate) + "</td>" +
      '<td><span class="pill ' + datePillClass(p.endDate) + '">' + escapeHtml(p.endDate) + "</span></td>" +
      '<td class="project-roster-contributors">' + formatContributorsCell(p.contributors || []) + "</td>" +
      "<td><strong>" + pts + "</strong></td>" +
      "</tr>"
    );
  }

  function updateImProjectSortHint() {
    var hint = document.getElementById("mgr-im-sort-hint");
    if (hint) {
      hint.textContent = imProjectSortDir === "desc" ? "Highest tier first" : "Lowest tier first";
    }
  }

  function renderImProjectSections() {
    var container = document.getElementById("mgr-im-project-sections");
    if (!container) return;
    updateImProjectSortHint();
    var ims = imsEligibleForProjects(filterByRegionalTz(teamData));
    ims.sort(function (a, b) {
      var vA = imTierSortKey(a);
      var vB = imTierSortKey(b);
      if (vA !== vB) {
        return imProjectSortDir === "desc" ? vB - vA : vA - vB;
      }
      return a.name.localeCompare(b.name);
    });
    if (!ims.length) {
      container.innerHTML =
        '<p class="lead-form-hint">No project-eligible IMs (Tier 2+) in this regional view. Tier 1 IMs are not shown — they cannot lead or contribute to projects.</p>';
      return;
    }
    container.innerHTML = ims.map(function (im) {
      var projects = projectsForImInView(im.name);
      var collapsed = Boolean(collapsedImProjectSections[im.name]);
      var chevron = collapsed ? "▶" : "▼";
      var totalPts = totalImProjectPoints(projects, im.name);
      var countLabel = projects.length === 1 ? "1 project" : projects.length + " projects";
      countLabel += " · " + totalPts + " pts";
      var tableBody = projects.length
        ? projects.map(function (p) { return imProjectRowHtml(p, im.name); }).join("")
        : '<tr><td colspan="9" style="color:var(--psq-muted);">No projects as lead or contributor in this view.</td></tr>';
      return (
        '<div id="' + imSectionDomId(im.name) + '" class="lead-im-project-block' + (collapsed ? " is-collapsed" : "") + '">' +
        '<button type="button" class="lead-im-project-header" aria-expanded="' + (!collapsed) + '" ' +
        'onclick="ManagerProjects.toggleImProjectSection(\'' + escapeAttr(im.name) + "')\">" +
        '<span><span class="lead-im-chevron">' + chevron + "</span> " + escapeHtml(formatIMName(im)) +
        ' <span class="mgr-im-tz-tag">(' + escapeHtml(im.tz) + ")</span></span>" +
        '<span class="lead-im-project-count">' + countLabel + "</span></button>" +
        '<div class="lead-im-project-body">' +
        '<table class="projects-table projects-table--im-roster">' +
        imRosterTableHeadHtml() +
        "<tbody>" + tableBody + "</tbody></table></div></div>"
      );
    }).join("");
  }

  function renderProjectRoster() {
    document.querySelectorAll(".mgr-tz-label-inline").forEach(function (el) {
      el.textContent = regionalLabel();
    });
    renderImProjectSections();
  }

  function renderMyProjects() {
    var body = document.getElementById("mgr-my-projects-body");
    if (!body) return;
    var mine = ProjectsData.getSponsorProjectsRegional(
      orgProjects,
      managerSponsor,
      currentTZ,
      teamData
    );
    if (!mine.length) {
      body.innerHTML =
        '<tr><td colspan="9" style="color:var(--psq-muted);">No sponsored projects in this regional view.</td></tr>';
      return;
    }
    body.innerHTML = mine.map(sponsorProjectRowHtml).join("");
  }

  function renderProjectPanels() {
    if (currentProjectSubTab === "roster") renderProjectRoster();
    else renderMyProjects();
  }

  function switchProjectSubTab(tab) {
    currentProjectSubTab = tab;
    document.querySelectorAll(".mgr-project-subtabs .sub-tab").forEach(function (t) {
      t.classList.remove("active");
    });
    document.getElementById("mgr-proj-tab-" + tab).classList.add("active");
    document.getElementById("mgr-proj-panel-roster").classList.toggle("active", tab === "roster");
    document.getElementById("mgr-proj-panel-mine").classList.toggle("active", tab === "mine");
    renderProjectPanels();
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

  function setImProjectSort() {
    imProjectSortDir = imProjectSortDir === "desc" ? "asc" : "desc";
    renderImProjectSections();
  }

  function render() {
    orgProjects = ProjectsData.loadOrgProjects();
    var sponsorLabel = document.getElementById("mgr-sponsor-label");
    if (sponsorLabel) sponsorLabel.textContent = managerSponsor;
    renderProjectPanels();
  }

  return {
    switchProjectSubTab: switchProjectSubTab,
    toggleImProjectSection: toggleImProjectSection,
    setImProjectSort: setImProjectSort,
    render: render
  };
})();

function renderManagerProjects() {
  if (typeof ManagerProjects !== "undefined" && ManagerProjects.render) {
    ManagerProjects.render();
  }
}
