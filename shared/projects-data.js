/** Org-wide strategic projects — sync to IM icProjects for IC / Lead views. */
var ProjectsData = (function () {
  var STORAGE_KEY = TeamData.STORAGE_KEY;
  var nextId = 100;
  /** Max IM contributors per project (lead is separate). */
  var MAX_PROJECT_CONTRIBUTORS = 6;
  /** Bump to reseed demo projects (cross-TZ leads / contributors). */
  var ORG_PROJECTS_SCHEMA = 4;

  var PROJECT_SPONSORS = [
    "Dr. Riley Hampton — Director of Implementation",
    "Morgan Tate — Implementation Manager",
    "Samira Okonkwo — Implementation Manager",
    "Harper Lane — Team Lead (EST)",
    "Riley West — Team Lead (CST)",
    "Taylor Brooks — Team Lead (PST)"
  ];

  var DEFAULT_ORG_PROJECTS = [
    {
      id: 1,
      name: "Resource Library Audit",
      lead: "Alex Rivers",
      contributors: ["Jordan Miller", "Casey Smith", "Riley West", "Taylor Brooks"],
      type: "Internal",
      complexity: "Medium",
      sponsor: "Morgan Tate — Implementation Manager",
      startDate: "01/01/2026",
      endDate: "03/10/2026"
    },
    {
      id: 2,
      name: "EST Parent Portal Rollout",
      lead: "Jordan Miller",
      contributors: [
        "Emerson True", "Stevie Lynn", "Jamie Frost",
        "Quinn Jones", "Parker Jade", "River Pond"
      ],
      type: "Cross-Collaboration",
      complexity: "Hard",
      sponsor: "Harper Lane — Team Lead (EST)",
      startDate: "02/01/2026",
      endDate: "08/15/2026"
    },
    {
      id: 3,
      name: "District Onboarding Playbook",
      lead: "Jordan Miller",
      contributors: ["Casey Smith"],
      type: "Internal",
      complexity: "Easy",
      sponsor: "Dr. Riley Hampton — Director of Implementation",
      startDate: "03/15/2026",
      endDate: "09/30/2026"
    },
    {
      id: 4,
      name: "National SIS Integration Hub",
      lead: "Riley West",
      contributors: ["Emerson True", "Logan Moss", "Stevie Lynn"],
      type: "Cross-Collaboration",
      complexity: "Hard",
      sponsor: "Samira Okonkwo — Implementation Manager",
      startDate: "01/10/2026",
      endDate: "06/30/2026"
    },
    {
      id: 5,
      name: "Cross-Regional Data Standards",
      lead: "Taylor Brooks",
      contributors: [
        "Jordan Miller", "Emerson True", "Skyler Page",
        "Riley West", "Parker Jade", "Dakota Hayes"
      ],
      type: "Internal",
      complexity: "Medium",
      sponsor: "Dr. Riley Hampton — Director of Implementation",
      startDate: "02/15/2026",
      endDate: "11/01/2026"
    },
    {
      id: 6,
      name: "Support API Sync",
      lead: "Emerson True",
      contributors: ["Logan Moss"],
      type: "Cross-Collaboration",
      complexity: "Hard",
      sponsor: "Samira Okonkwo — Implementation Manager",
      startDate: "01/15/2026",
      endDate: "04/05/2026"
    },
    {
      id: 7,
      name: "Implementation Playbook Refresh",
      lead: "River Pond",
      contributors: [
        "Alex Rivers", "Jordan Miller", "Casey Smith",
        "Peyton Gray", "Riley West", "Sutton Wood"
      ],
      type: "Internal",
      complexity: "Medium",
      sponsor: "Morgan Tate — Implementation Manager",
      startDate: "03/01/2026",
      endDate: "12/15/2026"
    }
  ];

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_ORG_PROJECTS));
  }

  function tierNumFromIM(im) {
    if (!im) return 0;
    return parseInt(String(im.tier).replace(/\D/g, ""), 10) || 0;
  }

  /** Project lead: Tier 3+ only (T1/T2 cannot lead). */
  function canIMBeProjectLead(im) {
    return tierNumFromIM(im) >= 3;
  }

  /** Project contributor: Tier 2+ (T2–T5); T1 cannot contribute. */
  function canIMBeProjectContributor(im) {
    return tierNumFromIM(im) >= 2;
  }

  function sanitizeContributors(contributors, lead, roster) {
    var byName = rosterByName(roster || []);
    var seen = {};
    var list = [];
    (contributors || []).forEach(function (name) {
      if (!name || name === lead || seen[name]) return;
      var im = byName[name];
      if (!im || !canIMBeProjectContributor(im)) return;
      seen[name] = true;
      list.push(name);
    });
    return list.slice(0, MAX_PROJECT_CONTRIBUTORS);
  }

  function resolveValidProjectLead(leadName, roster, project) {
    var byName = rosterByName(roster);
    var im = byName[leadName];
    if (im && canIMBeProjectLead(im)) return leadName;
    var i;
    var contribs = project.contributors || [];
    for (i = 0; i < contribs.length; i++) {
      var c = byName[contribs[i]];
      if (c && canIMBeProjectLead(c)) return c.name;
    }
    var fallback = roster.find(function (r) { return canIMBeProjectLead(r); });
    return fallback ? fallback.name : leadName;
  }

  function loadSnapshot() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function loadOrgProjects() {
    var snap = loadSnapshot();
    var projects;
    if (
      snap &&
      snap.orgProjectsSchema === ORG_PROJECTS_SCHEMA &&
      Array.isArray(snap.orgProjects) &&
      snap.orgProjects.length
    ) {
      projects = snap.orgProjects;
      projects.forEach(function (p) {
        if (p.id >= nextId) nextId = p.id + 1;
      });
      if (normalizeOrgProjects(projects, TeamData.loadRoster())) {
        saveOrgProjects(projects, TeamData.loadRoster());
      }
      return projects;
    }
    projects = cloneDefaults();
    saveOrgProjects(projects, TeamData.loadRoster());
    return projects;
  }

  function normalizeOrgProjects(projects, roster) {
    var r = roster || TeamData.loadRoster();
    var byName = rosterByName(r);
    var changed = false;
    projects.forEach(function (p) {
      var leadIm = byName[p.lead];
      if (!leadIm || !canIMBeProjectLead(leadIm)) {
        var newLead = resolveValidProjectLead(p.lead, r, p);
        if (newLead !== p.lead) {
          p.lead = newLead;
          changed = true;
        }
      }
      var clean = sanitizeContributors(p.contributors, p.lead, r);
      var prev = p.contributors || [];
      if (clean.length !== prev.length || clean.some(function (n, i) { return n !== prev[i]; })) {
        p.contributors = clean;
        changed = true;
      }
    });
    return changed;
  }

  function saveOrgProjects(projects, roster) {
    var r = roster || TeamData.loadRoster();
    var queue = TeamData.loadDealQueue();
    var snap = loadSnapshot();
    try {
      var data = {
        roster: r,
        dealQueue: queue,
        orgProjects: projects,
        orgProjectsSchema: ORG_PROJECTS_SCHEMA
      };
      if (snap && snap.notes) data.notes = snap.notes;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* quota */ }
    TeamData.notifyUpdated();
  }

  function parseMDY(dateStr) {
    if (!dateStr) return null;
    var parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    var d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    d.setHours(12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function todayAtNoon() {
    var t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  }

  function mdyFromInput(yyyyMmDd) {
    if (!yyyyMmDd) return "";
    var p = yyyyMmDd.split("-");
    if (p.length !== 3) return yyyyMmDd;
    return p[1] + "/" + p[2] + "/" + p[0];
  }

  function inputFromMdy(mdy) {
    var d = parseMDY(mdy);
    if (!d) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function rosterByName(roster) {
    var map = {};
    roster.forEach(function (im) {
      map[im.name] = im;
    });
    return map;
  }

  function imCapacityPct(im) {
    var max = TeamData.MPC_VALUES[im.tier];
    if (!max) return 0;
    return Math.round(((im.dealPts + im.projPts) / max) * 100);
  }

  function formatIMSelectLabel(im) {
    return formatIMName(im) + " — " + imCapacityPct(im) + "%";
  }

  function projectTouchesTerritory(project, territoryTz, byName) {
    return leadInTerritory(project, territoryTz, byName) ||
      territoryContributorNames(project, territoryTz, byName).length > 0;
  }

  function leadInTerritory(project, territoryTz, byName) {
    var lead = byName[project.lead];
    return Boolean(lead && lead.tz === territoryTz);
  }

  function territoryContributorNames(project, territoryTz, byName) {
    return (project.contributors || []).filter(function (name) {
      var im = byName[name];
      return im && im.tz === territoryTz;
    });
  }

  function getTerritoryLeadProjects(projects, territoryTz, roster) {
    var byName = rosterByName(roster);
    return projects.filter(function (p) {
      return leadInTerritory(p, territoryTz, byName);
    });
  }

  function getTerritoryContributorProjects(projects, territoryTz, roster) {
    var byName = rosterByName(roster);
    return projects.filter(function (p) {
      return territoryContributorNames(p, territoryTz, byName).length > 0;
    });
  }

  function isVisibleToIM(project, imName, today) {
    var start = parseMDY(project.startDate);
    if (start && start > today) return false;
    if (project.lead === imName) return true;
    return (project.contributors || []).indexOf(imName) >= 0;
  }

  function toICProject(project, imName) {
    return {
      name: project.name,
      role: project.lead === imName ? "Lead" : "Contributor",
      type: project.type,
      complexity: project.complexity,
      startDate: project.startDate,
      endDate: project.endDate,
      orgProjectId: project.id
    };
  }

  function calculateProjectPoints(p) {
    if (typeof ICSync !== "undefined" && ICSync.calculateProjectPoints) {
      return ICSync.calculateProjectPoints(p);
    }
    var ROLE_PTS = { Lead: 3, Contributor: 1 };
    var TYPE_PTS = { Internal: 1, "Cross-Collaboration": 2 };
    var COMP_PTS = { Easy: 1, Medium: 2, Hard: 3 };
    return ROLE_PTS[p.role] + TYPE_PTS[p.type] + COMP_PTS[p.complexity];
  }

  function applyToRoster(roster, projects) {
    var today = todayAtNoon();
    var list = projects || loadOrgProjects();
    roster.forEach(function (im) {
      var assigned = [];
      list.forEach(function (project) {
        if (isVisibleToIM(project, im.name, today)) {
          assigned.push(toICProject(project, im.name));
        }
      });
      if (typeof ICSync !== "undefined" && ICSync.syncProjectAggregates) {
        ICSync.syncProjectAggregates(im, assigned);
      } else {
        im.icProjects = assigned;
        im.projects = assigned.length;
      }
    });
    return roster;
  }

  function getTerritoryProjects(projects, territoryTz, roster) {
    var byName = rosterByName(roster);
    return projects.filter(function (p) {
      return projectTouchesTerritory(p, territoryTz, byName);
    });
  }

  /** Regional filter for manager roster: all regions or lead/contributor in territory. */
  function getRegionalProjects(projects, tz, roster) {
    if (!tz || tz === "all") return projects.slice();
    return getTerritoryProjects(projects, tz, roster);
  }

  /** Unique org projects on the regional project roster (lead or contributor in territory). */
  function countRegionalProjects(projects, tz, roster) {
    return getRegionalProjects(projects, tz, roster).length;
  }

  function getProjectsForSponsor(projects, sponsor) {
    if (!sponsor) return [];
    return projects.filter(function (p) {
      return p.sponsor === sponsor;
    });
  }

  function getSponsorProjectsRegional(projects, sponsor, tz, roster) {
    var mine = getProjectsForSponsor(projects, sponsor);
    if (!tz || tz === "all") return mine;
    var byName = rosterByName(roster);
    return mine.filter(function (p) {
      return projectTouchesTerritory(p, tz, byName);
    });
  }

  function getProjectsForIM(projects, imName) {
    var today = todayAtNoon();
    return projects
      .filter(function (p) {
        return isVisibleToIM(p, imName, today);
      })
      .map(function (p) {
        return toICProject(p, imName);
      });
  }

  function imRoleOnProject(project, imName) {
    if (project.lead === imName) return "Lead";
    if ((project.contributors || []).indexOf(imName) >= 0) return "Contributor";
    return null;
  }

  function getOrgProjectsForIM(projects, imName) {
    return projects.filter(function (p) {
      return imRoleOnProject(p, imName) != null;
    });
  }

  function getProjectById(projects, projectId) {
    var id = Number(projectId);
    return projects.find(function (p) {
      return p.id === id || p.id === projectId;
    }) || null;
  }

  function addProject(roster, fields) {
    var projects = loadOrgProjects();
    var leadIm = rosterByName(roster)[fields.lead];
    if (!leadIm || !canIMBeProjectLead(leadIm)) {
      return null;
    }
    var contributors = sanitizeContributors(fields.contributors, fields.lead, roster);
    var project = {
      id: nextId++,
      name: fields.name.trim(),
      lead: fields.lead,
      contributors: contributors,
      type: fields.type,
      complexity: fields.complexity,
      sponsor: fields.sponsor || "",
      startDate: fields.startDate,
      endDate: fields.endDate
    };
    projects.push(project);
    applyToRoster(roster, projects);
    saveOrgProjects(projects, roster);
    TeamData.saveRoster(roster);
    return project;
  }

  function updateProject(roster, projectId, fields) {
    var projects = loadOrgProjects();
    var project = getProjectById(projects, projectId);
    if (!project) return null;
    var leadIm = rosterByName(roster)[fields.lead];
    if (!leadIm || !canIMBeProjectLead(leadIm)) {
      return null;
    }
    project.name = fields.name.trim();
    project.lead = fields.lead;
    project.contributors = sanitizeContributors(fields.contributors, fields.lead, roster);
    project.type = fields.type;
    project.complexity = fields.complexity;
    project.sponsor = fields.sponsor || "";
    project.startDate = fields.startDate;
    project.endDate = fields.endDate;
    applyToRoster(roster, projects);
    saveOrgProjects(projects, roster);
    TeamData.saveRoster(roster);
    return project;
  }

  function initAndApply(roster) {
    var projects = loadOrgProjects();
    applyToRoster(roster, projects);
    return projects;
  }

  return {
    MAX_PROJECT_CONTRIBUTORS: MAX_PROJECT_CONTRIBUTORS,
    canIMBeProjectLead: canIMBeProjectLead,
    canIMBeProjectContributor: canIMBeProjectContributor,
    sanitizeContributors: sanitizeContributors,
    PROJECT_SPONSORS: PROJECT_SPONSORS,
    loadOrgProjects: loadOrgProjects,
    saveOrgProjects: saveOrgProjects,
    applyToRoster: applyToRoster,
    getTerritoryProjects: getTerritoryProjects,
    getRegionalProjects: getRegionalProjects,
    countRegionalProjects: countRegionalProjects,
    getProjectsForSponsor: getProjectsForSponsor,
    getSponsorProjectsRegional: getSponsorProjectsRegional,
    getProjectsForIM: getProjectsForIM,
    getOrgProjectsForIM: getOrgProjectsForIM,
    imRoleOnProject: imRoleOnProject,
    getProjectById: getProjectById,
    addProject: addProject,
    updateProject: updateProject,
    initAndApply: initAndApply,
    parseMDY: parseMDY,
    mdyFromInput: mdyFromInput,
    inputFromMdy: inputFromMdy,
    projectTouchesTerritory: projectTouchesTerritory,
    leadInTerritory: leadInTerritory,
    territoryContributorNames: territoryContributorNames,
    getTerritoryLeadProjects: getTerritoryLeadProjects,
    getTerritoryContributorProjects: getTerritoryContributorProjects,
    formatIMSelectLabel: formatIMSelectLabel,
    imCapacityPct: imCapacityPct,
    calculateProjectPoints: calculateProjectPoints,
    toICProject: toICProject
  };
})();
