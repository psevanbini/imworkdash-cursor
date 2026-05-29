/** IC deal/project detail → roster aggregates (feeds Lead + Manager views). */
var ICSync = (function () {
  var DEAL_MIN = 30;
  var DEAL_MAX = 50;
  /** Bump to force reseed when deal-count rules change. */
  var DEAL_COUNT_SCHEMA = 10;
  var LOWER_DEAL_MIN = 30;
  var UPPER_DEAL_MIN = 40;
  var UPPER_DEAL_MAX = 50;
  var SIZE_PTS = {
    Single: 1,
    Small: 2,
    Medium: 3,
    Large: 2,
    Enterprise: 2,
    Strategic: 4
  };
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
  var ACTIVE_STAGES = [
    "Inbound", "Kickoff", "Setup", "Feature Enablement", "Platform Ready",
    "Monitor", "End of Implementation"
  ];
  var ROLE_PTS = { Lead: 3, Contributor: 1 };
  var TYPE_PTS = { Internal: 1, "Cross-Collaboration": 2 };
  var COMP_PTS = { Easy: 1, Medium: 2, Hard: 3 };
  var DISTRICT_STEMS = [
    "Oak Lane", "Pinecrest", "Brookfield", "Harborview", "Summit Valley", "Westgate",
    "Northfield", "Eastbrook", "Ridgefield", "Lakeview", "Metro Arts", "Cedar Hills",
    "Willow Creek", "Maple Grove", "Silver Lake", "Redwood", "Bayshore", "Highland Park",
    "Riverdale", "Sunset", "Greenwood", "Fairview", "Springdale", "Meadowlark", "Stonebridge",
    "Clearwater", "Bridgeway", "Fox Run", "Lakeside", "Parkview"
  ];
  var DISTRICT_TYPES = [
    "Charter", "Academy", "USD", "ISD", "CSD", "SD", "Prep", "Regional", "Unified SD",
    "County Schools", "Parish Schools", "Magnet", "K-8", "High School District"
  ];

  function calculateProjectPoints(p) {
    return ROLE_PTS[p.role] + TYPE_PTS[p.type] + COMP_PTS[p.complexity];
  }

  function nameHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function tierBand(tier) {
    var t = parseInt(String(tier).slice(1), 10);
    if (t === 5) return "t5";
    if (t === 3 || t === 4) return "upper";
    return "lower";
  }

  /**
   * Unique deal counts per IM (stable sort by name):
   * T5 → ~10, T1/T2 → 30–39, T3/T4 → 40–50.
   */
  function buildDealCountMap(roster) {
    var lower = [];
    var upper = [];
    var t5 = [];
    roster.forEach(function (im, index) {
      var entry = { name: im.name, index: index, tier: im.tier, h: nameHash(im.name) };
      var band = tierBand(im.tier);
      if (band === "t5") t5.push(entry);
      else if (band === "upper") upper.push(entry);
      else lower.push(entry);
    });
    function sortEntries(list) {
      list.sort(function (a, b) {
        return a.h !== b.h ? a.h - b.h : a.name.localeCompare(b.name);
      });
    }
    sortEntries(lower);
    sortEntries(upper);
    sortEntries(t5);
    var map = {};
    lower.forEach(function (entry, n) {
      map[entry.name] = LOWER_DEAL_MIN + n;
    });
    upper.forEach(function (entry, n) {
      map[entry.name] = Math.min(UPPER_DEAL_MAX, UPPER_DEAL_MIN + n);
    });
    t5.forEach(function (entry, n) {
      map[entry.name] = 9 + n;
    });
    return map;
  }

  function dealCountForIM(im, imIndex, roster) {
    if (!roster._dealCountByName) roster._dealCountByName = buildDealCountMap(roster);
    if (roster._dealCountByName[im.name] != null) return roster._dealCountByName[im.name];
    var band = tierBand(im.tier);
    if (band === "t5") return 10;
    if (band === "upper") return 45;
    return 35;
  }

  /** 1–2 red-health deals per IM, spread across the portfolio. */
  function pickSparseIndices(imName, count, salt, maxPick) {
    var seed = nameHash(imName + salt);
    var num = Math.min(count, maxPick != null ? maxPick : 1 + (seed % 2));
    var picked = [];
    var step = Math.max(1, Math.floor(count / (num + 1)));
    for (var n = 0; n < num; n++) {
      var idx = (seed + n * 7919) % count;
      var guard = 0;
      while (picked.indexOf(idx) >= 0 && guard < count) {
        idx = (idx + step) % count;
        guard++;
      }
      picked.push(idx);
    }
    return picked;
  }

  function pickRedDealIndices(imName, count) {
    var map = {};
    pickSparseIndices(imName, count, "|red").forEach(function (i) { map[i] = true; });
    return map;
  }

  /** 3–6 yellow-health deals per IM, excluding reds. */
  function pickYellowDealIndices(imName, count, redIndices) {
    var seed = nameHash(imName + "|yellow");
    var numYellow = Math.min(count, 3 + (seed % 4));
    var picked = [];
    var step = Math.max(1, Math.floor(count / (numYellow + 1)));
    for (var n = 0; n < numYellow; n++) {
      var idx = (seed + n * 5417) % count;
      var guard = 0;
      while ((picked.indexOf(idx) >= 0 || redIndices[idx]) && guard < count) {
        idx = (idx + step) % count;
        guard++;
      }
      if (!redIndices[idx] && picked.indexOf(idx) < 0) picked.push(idx);
    }
    var map = {};
    picked.forEach(function (i) { map[i] = true; });
    return map;
  }

  /** 1–2 On Hold / Stalled deals per IM (On Hold + Stalled combined). */
  function pickHoldStalledStages(imName, count) {
    var seed = nameHash(imName + "|hold");
    var indices = pickSparseIndices(imName, count, "|hold");
    var map = {};
    indices.forEach(function (idx, n) {
      if (indices.length === 1) {
        map[idx] = seed % 2 === 0 ? "On Hold" : "Stalled";
      } else {
        map[idx] = n === 0 ? "On Hold" : "Stalled";
      }
    });
    return map;
  }

  var IC_STAGE_ORDER = [
    "Inbound", "Kickoff", "Setup", "Feature Enablement", "Platform Ready",
    "Monitor", "On Hold", "Stalled"
  ];

  function isICPersona(imName) {
    return imName === TeamData.getICPersonaName();
  }

  /** IC sample: no End of Implementation; fixed Inbound/Kickoff/Stalled/Monitor counts. */
  function buildICPersonaStagePlan(count) {
    var buckets = [];
    function add(stage, n) {
      for (var i = 0; i < n; i++) buckets.push(stage);
    }
    add("Inbound", 3);
    add("Kickoff", 1);
    add("Stalled", 2);
    add("Monitor", 10);
    add("On Hold", 2);
    var remaining = Math.max(0, count - buckets.length);
    var flexStages = ["Setup", "Feature Enablement", "Platform Ready"];
    if (remaining > 0) {
      var base = Math.floor(remaining / flexStages.length);
      var rem = remaining % flexStages.length;
      var flexCounts = flexStages.map(function (_, idx) {
        return base + (idx < rem ? 1 : 0);
      });
      if (remaining >= flexStages.length) {
        flexCounts[0] += 1;
        flexCounts[2] -= 1;
      }
      flexStages.forEach(function (stage, idx) {
        add(stage, flexCounts[idx]);
      });
    }
    var tally = {};
    buckets.forEach(function (stage) {
      tally[stage] = (tally[stage] || 0) + 1;
    });
    var plan = [];
    IC_STAGE_ORDER.forEach(function (stage) {
      var n = tally[stage] || 0;
      for (var j = 0; j < n; j++) plan.push(stage);
    });
    while (plan.length < count) plan.push("Setup");
    return plan.slice(0, count);
  }

  function stageForDeal(imName, i, count, holdStalledStages, activeStageIdxRef) {
    if (isICPersona(imName)) return buildICPersonaStagePlan(count)[i];
    if (holdStalledStages[i]) return holdStalledStages[i];
    var stage = ACTIVE_STAGES[activeStageIdxRef.i % ACTIVE_STAGES.length];
    activeStageIdxRef.i += 1;
    return stage;
  }

  function buildDealsForIM(imName, imIndex, dealCount) {
    var sizes = ["Single", "Small", "Medium", "Large", "Enterprise", "Strategic"];
    var sisList = ["PowerSchool", "Infinite Campus", "Aeries", "Skyward SFTP", "Clever", "RenWeb/FACTS"];
    var seed = nameHash(imName) + imIndex * 997;
    var baseId = (imIndex + 1) * 10000;
    var count = dealCount || DEAL_MIN;
    var icSample = isICPersona(imName);
    var stagePlan = icSample ? buildICPersonaStagePlan(count) : null;
    var redIndices = pickRedDealIndices(imName, count);
    var yellowIndices = pickYellowDealIndices(imName, count, redIndices);
    var holdStalledStages = icSample ? {} : pickHoldStalledStages(imName, count);
    var activeStageIdxRef = { i: 0 };
    var deals = [];
    for (var i = 0; i < count; i++) {
      var stem = DISTRICT_STEMS[(seed + i) % DISTRICT_STEMS.length];
      var type = DISTRICT_TYPES[(seed + i * 3) % DISTRICT_TYPES.length];
      var dup = Math.floor(i / DISTRICT_STEMS.length);
      var label = dup > 0 ? stem + " " + type + " (" + (dup + 1) + ")" : stem + " " + type;
      var health = redIndices[i] ? "red" : (yellowIndices[i] ? "yellow" : "green");
      var stage = stagePlan ? stagePlan[i] : stageForDeal(imName, i, count, holdStalledStages, activeStageIdxRef);
      var adj = [];
      if (i % 11 === 0) adj.push("Pilots");
      else if (i % 13 === 0) adj.push("Extended Launch");
      deals.push({
        id: baseId + i,
        stage: stage,
        name: label,
        size: sizes[i % sizes.length],
        sis: sisList[(seed + i) % sisList.length],
        health: health,
        adj: adj
      });
    }
    return deals;
  }

  function needsDealReseed(im, roster, imIndex) {
    var expected = dealCountForIM(im, imIndex, roster);
    return (
      !im.icDeals ||
      !im.icDeals.length ||
      im.icDeals.length !== expected ||
      im.icDealCountSchema !== DEAL_COUNT_SCHEMA
    );
  }

  function defaultDeals(imName, imIndex, roster) {
    if (imName != null && imIndex != null && roster) {
      var im = roster.find(function (r) { return r.name === imName; });
      var count = im ? dealCountForIM(im, imIndex, roster) : 46;
      return buildDealsForIM(imName, imIndex, count);
    }
    return buildDealsForIM("Jordan Miller", 1, 46);
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
      },
      {
        name: "Q3 Parent Engagement Rollout",
        role: "Lead",
        type: "Cross-Collaboration",
        complexity: "Easy",
        endDate: "08/15/2026"
      }
    ];
  }

  function ensureICProjects(im) {
    var defaults = defaultProjects();
    var projects = im.icProjects && im.icProjects.length
      ? JSON.parse(JSON.stringify(im.icProjects))
      : [];
    defaults.forEach(function (def) {
      var exists = projects.some(function (p) { return p.name === def.name; });
      if (!exists) projects.push(JSON.parse(JSON.stringify(def)));
    });
    return projects.length ? projects : defaults.slice();
  }

  function icProjectsNeedMerge(im) {
    var current = im.icProjects || [];
    return defaultProjects().some(function (def) {
      return !current.some(function (p) { return p.name === def.name; });
    });
  }

  function syncDealAggregates(im, deals) {
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
    im.deals = deals.length;
    im.dealPts = dealPts;
    im.y = y;
    im.r = r;
    im.icDeals = deals;
    im.icDealCountSchema = DEAL_COUNT_SCHEMA;
  }

  function syncProjectAggregates(im, projects) {
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
    im.projects = projects.length;
    im.projPts = projPts;
    im.pd = pd;
    im.icProjects = projects;
  }

  function syncAggregates(im, deals, projects) {
    syncDealAggregates(im, deals);
    syncProjectAggregates(im, projects);
  }

  /** Ensure every IM has tier-based deal count (30–50); IC persona gets full project list. */
  function seedRosterDeals(roster) {
    roster._dealCountByName = buildDealCountMap(roster);
    var icPersona = TeamData.getICPersonaName();
    var changed = false;
    roster.forEach(function (im, index) {
      var dealsReseed = needsDealReseed(im, roster, index);
      var count = dealCountForIM(im, index, roster);
      if (im.name === icPersona) {
        var deals = dealsReseed
          ? buildDealsForIM(im.name, index, count)
          : JSON.parse(JSON.stringify(im.icDeals));
        var projects = ensureICProjects(im);
        if (dealsReseed || icProjectsNeedMerge(im)) {
          syncAggregates(im, deals, projects);
          changed = true;
        }
      } else if (dealsReseed) {
        syncDealAggregates(im, buildDealsForIM(im.name, index, count));
        changed = true;
      }
    });
    return changed;
  }

  function loadWorkspace(roster, personaName) {
    roster._dealCountByName = buildDealCountMap(roster);
    var imIndex = roster.findIndex(function (r) { return r.name === personaName; });
    if (imIndex < 0) return null;
    var im = roster[imIndex];
    var count = dealCountForIM(im, imIndex, roster);
    var deals = needsDealReseed(im, roster, imIndex)
      ? buildDealsForIM(personaName, imIndex, count)
      : JSON.parse(JSON.stringify(im.icDeals));
    var projects = ensureICProjects(im);
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
    DEAL_MIN: DEAL_MIN,
    DEAL_MAX: DEAL_MAX,
    DEAL_COUNT_SCHEMA: DEAL_COUNT_SCHEMA,
    SIZE_PTS: SIZE_PTS,
    SIS_PTS: SIS_PTS,
    HEALTH_PTS: HEALTH_PTS,
    STAGES: STAGES,
    ROLE_PTS: ROLE_PTS,
    TYPE_PTS: TYPE_PTS,
    COMP_PTS: COMP_PTS,
    calculateProjectPoints: calculateProjectPoints,
    buildDealsForIM: buildDealsForIM,
    buildDealCountMap: buildDealCountMap,
    dealCountForIM: dealCountForIM,
    defaultDeals: defaultDeals,
    defaultProjects: defaultProjects,
    syncAggregates: syncAggregates,
    syncDealAggregates: syncDealAggregates,
    seedRosterDeals: seedRosterDeals,
    loadWorkspace: loadWorkspace,
    saveWorkspace: saveWorkspace
  };
})();
