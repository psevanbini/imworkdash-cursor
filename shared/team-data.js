/**
 * Shared team roster — IC detail rolls up to Lead (territory) and Manager (org).
 * Persisted in localStorage so all role views stay in sync.
 */
var TeamData = (function () {
  var STORAGE_KEY = "imworkdash_team_v1";
  var IC_PERSONA = "Jordan Miller";
  var LEAD_TERRITORY_TZ = "EST";

  var MPC_VALUES = { T1: 70, T2: 90, T3: 120, T4: 120, T5: 90 };

  var DEFAULT_ROSTER = [
    { name: "Alex Rivers", tz: "EST", tier: "T4", dealPts: 65, projPts: 15, deals: 10, projects: 2, pd: 0, y: 1, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Jordan Miller", tz: "EST", tier: "T3", dealPts: 75, projPts: 10, deals: 11, projects: 1, pd: 0, y: 0, r: 0, velocity: 3, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Casey Smith", tz: "EST", tier: "T2", dealPts: 55, projPts: 5, deals: 8, projects: 2, pd: 1, y: 1, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
    { name: "Morgan Lane", tz: "CST", tier: "T1", dealPts: 45, projPts: 10, deals: 9, projects: 2, pd: 0, y: 0, r: 1, velocity: 6, med: false, lg: false, onRotation: false, removalSource: "auto", reason: "Velocity", removedAt: "2026-05-14" },
    { name: "Riley West", tz: "CST", tier: "T4", dealPts: 95, projPts: 25, deals: 15, projects: 3, pd: 0, y: 2, r: 1, velocity: 4, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Taylor Brooks", tz: "PST", tier: "T3", dealPts: 85, projPts: 10, deals: 12, projects: 1, pd: 1, y: 1, r: 0, velocity: 3, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Quinn Jones", tz: "PST", tier: "T2", dealPts: 50, projPts: 10, deals: 7, projects: 1, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: false, onRotation: true, reason: "" },
    { name: "Skyler Page", tz: "EST", tier: "T5", dealPts: 55, projPts: 10, deals: 8, projects: 2, pd: 0, y: 0, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
    { name: "Dakota Hayes", tz: "CST", tier: "T4", dealPts: 115, projPts: 10, deals: 16, projects: 1, pd: 1, y: 1, r: 2, velocity: 4, med: true, lg: true, onRotation: false, removalSource: "auto", reason: "Capacity", removedAt: "2026-05-22" },
    { name: "Jamie Frost", tz: "PST", tier: "T3", dealPts: 65, projPts: 20, deals: 10, projects: 2, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Peyton Gray", tz: "EST", tier: "T2", dealPts: 60, projPts: 5, deals: 9, projects: 0, pd: 0, y: 0, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
    { name: "Reese Dale", tz: "CST", tier: "T1", dealPts: 45, projPts: 15, deals: 8, projects: 3, pd: 1, y: 1, r: 0, velocity: 3, med: false, lg: false, onRotation: true, reason: "" },
    { name: "Charlie King", tz: "PST", tier: "T4", dealPts: 85, projPts: 40, deals: 13, projects: 4, pd: 2, y: 2, r: 0, velocity: 7, med: true, lg: true, onRotation: false, removalSource: "auto", reason: "Capacity; Velocity", removedAt: "2026-05-12", returnToRotationAt: "2026-06-15" },
    { name: "Emerson True", tz: "EST", tier: "T3", dealPts: 100, projPts: 10, deals: 14, projects: 1, pd: 0, y: 3, r: 1, velocity: 3, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Sutton Wood", tz: "CST", tier: "T2", dealPts: 65, projPts: 5, deals: 9, projects: 1, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: false, onRotation: true, reason: "" },
    { name: "Blake Vale", tz: "PST", tier: "T1", dealPts: 55, projPts: 10, deals: 8, projects: 2, pd: 0, y: 0, r: 0, velocity: 4, med: false, lg: false, onRotation: true, reason: "" },
    { name: "Parker Jade", tz: "CST", tier: "T3", dealPts: 75, projPts: 15, deals: 10, projects: 2, pd: 0, y: 1, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Avery Sky", tz: "PST", tier: "T2", dealPts: 60, projPts: 10, deals: 9, projects: 1, pd: 1, y: 1, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
    { name: "Logan Moss", tz: "EST", tier: "T4", dealPts: 80, projPts: 5, deals: 11, projects: 1, pd: 0, y: 0, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Kendall Bell", tz: "CST", tier: "T5", dealPts: 55, projPts: 20, deals: 8, projects: 4, pd: 0, y: 0, r: 0, velocity: 1, med: true, lg: false, onRotation: true, reason: "" },
    { name: "Robin Kite", tz: "PST", tier: "T1", dealPts: 50, projPts: 5, deals: 9, projects: 1, pd: 0, y: 1, r: 0, velocity: 2, med: false, lg: false, onRotation: true, reason: "" },
    { name: "Stevie Lynn", tz: "EST", tier: "T2", dealPts: 65, projPts: 12, deals: 10, projects: 3, pd: 1, y: 1, r: 1, velocity: 3, med: true, lg: false, onRotation: true, reason: "" },
    { name: "River Pond", tz: "CST", tier: "T3", dealPts: 95, projPts: 15, deals: 12, projects: 2, pd: 2, y: 2, r: 1, velocity: 5, med: true, lg: true, onRotation: true, reason: "" },
    { name: "Phoenix Day", tz: "PST", tier: "T4", dealPts: 85, projPts: 15, deals: 11, projects: 2, pd: 1, y: 1, r: 0, velocity: 2, med: true, lg: true, onRotation: true, reason: "" }
  ];

  var DEFAULT_DEAL_QUEUE = [
    { id: 901, name: "Mountain View USD", size: "Large", sis: "Infinite Campus", tz: "PST", adj: [] }
  ];

  function cloneRoster() {
    return JSON.parse(JSON.stringify(DEFAULT_ROSTER));
  }

  function cloneDealQueue() {
    return JSON.parse(JSON.stringify(DEFAULT_DEAL_QUEUE));
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

  /** One-time import from older manager-only storage key. */
  function migrateLegacyManagerStorage() {
    if (loadSnapshot()) return;
    try {
      var raw = localStorage.getItem("imworkdash_manager_v1");
      if (!raw) return;
      var legacy = JSON.parse(raw);
      var roster = cloneRoster();
      if (Array.isArray(legacy.team)) {
        legacy.team.forEach(function (saved) {
          var im = roster.find(function (r) { return r.name === saved.name; });
          if (!im) return;
          Object.keys(saved).forEach(function (key) {
            if (saved[key] !== undefined) im[key] = saved[key];
          });
        });
      }
      var queue = cloneDealQueue();
      if (Array.isArray(legacy.dealQueue)) {
        legacy.dealQueue.forEach(function (saved) {
          var deal = queue.find(function (d) { return d.id === saved.id; });
          if (deal && Array.isArray(saved.adj)) deal.adj = saved.adj.slice();
        });
      }
      saveAll(roster, queue);
    } catch (e) { /* ignore */ }
  }

  function loadRoster() {
    var roster = cloneRoster();
    var snap = loadSnapshot();
    if (snap && Array.isArray(snap.roster)) {
      snap.roster.forEach(function (saved) {
        var im = roster.find(function (r) { return r.name === saved.name; });
        if (!im) return;
        Object.keys(saved).forEach(function (key) {
          if (saved[key] !== undefined) im[key] = saved[key];
        });
      });
    }
    return roster;
  }

  function loadDealQueue() {
    var queue = cloneDealQueue();
    var snap = loadSnapshot();
    if (snap && Array.isArray(snap.dealQueue)) {
      snap.dealQueue.forEach(function (saved) {
        var deal = queue.find(function (d) { return d.id === saved.id; });
        if (deal && saved.adj) deal.adj = saved.adj.slice();
        else if (deal && Array.isArray(saved.adj)) deal.adj = saved.adj.slice();
      });
    }
    return queue;
  }

  function saveAll(roster, dealQueue) {
    try {
      var payload = JSON.stringify({
        roster: roster,
        dealQueue: dealQueue || cloneDealQueue()
      });
      if (localStorage.getItem(STORAGE_KEY) === payload) return;
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (e) { /* quota */ }
    notifyUpdated();
  }

  function saveRoster(roster) {
    saveAll(roster, loadDealQueue());
  }

  function notifyUpdated() {
    try {
      localStorage.setItem(STORAGE_KEY + "_ts", String(Date.now()));
    } catch (e) { /* ignore */ }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "imworkdash-team-updated" }, "*");
    }
  }

  function getLeadRoster(roster, tz) {
    tz = tz || LEAD_TERRITORY_TZ;
    return roster.filter(function (im) { return im.tz === tz; });
  }

  function getICPersonaName() {
    return IC_PERSONA;
  }

  function getLeadTerritoryTz() {
    return LEAD_TERRITORY_TZ;
  }

  function getNoteKey(name) {
    return "note_" + name.replace(/\s/g, "_");
  }

  function getNote(name) {
    return localStorage.getItem(getNoteKey(name)) || "";
  }

  function setNote(name, text) {
    localStorage.setItem(getNoteKey(name), text);
    notifyUpdated();
  }

  /** Migrate legacy note_mgr_* / note_t_* keys */
  function migrateNotes(roster) {
    roster.forEach(function (im) {
      if (getNote(im.name)) return;
      var legacy =
        localStorage.getItem("note_mgr_" + im.name) ||
        localStorage.getItem("note_t_" + im.name);
      if (legacy) localStorage.setItem(getNoteKey(im.name), legacy);
    });
  }

  function initRoster() {
    migrateLegacyManagerStorage();
    var roster = loadRoster();
    migrateNotes(roster);
    return roster;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    MPC_VALUES: MPC_VALUES,
    IC_PERSONA: IC_PERSONA,
    LEAD_TERRITORY_TZ: LEAD_TERRITORY_TZ,
    cloneRoster: cloneRoster,
    cloneDealQueue: cloneDealQueue,
    loadRoster: loadRoster,
    loadDealQueue: loadDealQueue,
    saveAll: saveAll,
    saveRoster: saveRoster,
    notifyUpdated: notifyUpdated,
    getLeadRoster: getLeadRoster,
    getICPersonaName: getICPersonaName,
    getLeadTerritoryTz: getLeadTerritoryTz,
    getNote: getNote,
    setNote: setNote,
    migrateNotes: migrateNotes,
    migrateLegacyManagerStorage: migrateLegacyManagerStorage,
    initRoster: initRoster
  };
})();
