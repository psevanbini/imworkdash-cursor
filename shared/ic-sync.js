/** IC deal/project detail → roster aggregates (feeds Lead + Manager views). */
var ICSync = (function () {
  var SIZE_PTS = { Strategic: 4, Large: 2, Medium: 3, Small: 1 };
  var SIS_PTS = {
    PowerSchool: 3,
    "Infinite Campus": 2,
    Aeries: 2,
    "Skyward SFTP": 2,
    Clever: 2,
    "RenWeb/FACTS": 1
  };
  var HEALTH_PTS = { green: 0, yellow: 1, red: 2 };
  var STAGES = [
    "Inbound", "Kickoff", "Setup", "Feature Enablement", "Platform Ready",
    "Monitor", "End of Implementation", "On Hold", "Stalled"
  ];
  var ROLE_PTS = { Lead: 3, Contributor: 1 };
  var TYPE_PTS = { Internal: 1, "Cross-Collaboration": 2 };
  var COMP_PTS = { Easy: 1, Medium: 2, Hard: 3 };

  function calculateProjectPoints(p) {
    return ROLE_PTS[p.role] + TYPE_PTS[p.type] + COMP_PTS[p.complexity];
  }

  function defaultDeals() {
    return Array.from({ length: 11 }, function (_, i) {
      return {
        id: i,
        stage: STAGES[i % STAGES.length],
        name: "Customer " + String.fromCharCode(65 + i),
        size: i % 3 === 0 ? "Strategic" : i % 3 === 1 ? "Medium" : "Large",
        sis: i % 2 === 0 ? "PowerSchool" : "Infinite Campus",
        health: i % 4 === 0 ? "yellow" : i === 11 ? "red" : "green",
        adj: []
      };
    });
  }

  function defaultProjects() {
    return [
      {
        name: "Resource Library Audit",
        role: "Lead",
        type: "Internal",
        complexity: "Medium",
        endDate: "03/10/2026"
      },
      {
        name: "Support API Sync Project",
        role: "Contributor",
        type: "Cross-Collaboration",
        complexity: "Hard",
        endDate: "04/05/2026"
      }
    ];
  }

  function syncAggregates(im, deals, projects) {
    var dealPts = 0;
    var y = 0;
    var r = 0;
    deals.forEach(function (d) {
      dealPts +=
        (SIZE_PTS[d.size] || 0) +
        (SIS_PTS[d.sis] || 0) +
        (HEALTH_PTS[d.health] || 0) +
        (d.adj ? d.adj.length : 0);
      if (d.health === "yellow") y++;
      if (d.health === "red") r++;
    });

    var projPts = 0;
    var pd = 0;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    projects.forEach(function (p) {
      projPts += calculateProjectPoints(p);
      var parts = p.endDate.split("/");
      var end = new Date(parts[2], parts[0] - 1, parts[1]);
      if (end < today) pd++;
    });

    im.deals = deals.length;
    im.dealPts = dealPts;
    im.y = y;
    im.r = r;
    im.projects = projects.length;
    im.projPts = projPts;
    im.pd = pd;
    im.icDeals = deals;
    im.icProjects = projects;
  }

  function loadWorkspace(roster, personaName) {
    var im = roster.find(function (r) { return r.name === personaName; });
    if (!im) return null;
    var deals = im.icDeals && im.icDeals.length ? JSON.parse(JSON.stringify(im.icDeals)) : defaultDeals();
    var projects =
      im.icProjects && im.icProjects.length
        ? JSON.parse(JSON.stringify(im.icProjects))
        : defaultProjects();
    syncAggregates(im, deals, projects);
    return { im: im, deals: deals, projects: projects };
  }

  function saveWorkspace(roster, personaName, deals, projects) {
    var im = roster.find(function (r) { return r.name === personaName; });
    if (!im) return;
    syncAggregates(im, deals, projects);
    TeamData.saveRoster(roster);
  }

  return {
    SIZE_PTS: SIZE_PTS,
    SIS_PTS: SIS_PTS,
    HEALTH_PTS: HEALTH_PTS,
    STAGES: STAGES,
    ROLE_PTS: ROLE_PTS,
    TYPE_PTS: TYPE_PTS,
    COMP_PTS: COMP_PTS,
    calculateProjectPoints: calculateProjectPoints,
    defaultDeals: defaultDeals,
    defaultProjects: defaultProjects,
    syncAggregates: syncAggregates,
    loadWorkspace: loadWorkspace,
    saveWorkspace: saveWorkspace
  };
})();
