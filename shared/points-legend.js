/** Collapsible point key — shared across IC, Team Lead, and Manager dashboards. */
var PointsLegend = (function () {
  var ADJ_OPTIONS = [
    "Extended Launch",
    "Proof of Concept",
    "Pilots",
    "DSAs/DUAs/DPAs",
    "DOEs/RICs/BOCES",
    "New Hire"
  ];

  var HEALTH_LABELS = {
    green: "Green (on track)",
    yellow: "Yellow (at risk)",
    red: "Red (critical)"
  };

  /** Documented in legend (scoring may use ICSync when wired). */
  var CONTRIBUTOR_SCOPE_BANDS = [
    { label: "0–2 contributors (all teams)", pts: 1 },
    { label: "3–5 contributors (all teams)", pts: 2 },
    { label: "6+ contributors (all teams)", pts: 3 }
  ];

  /** Full SIS list for legend display. */
  var LEGEND_SIS_PTS = {
    "Aequitas (Q)": 2,
    Aeries: 2,
    Alma: 1,
    "Ascender (TxEIS)": 1,
    "Aspen/Follet": 1,
    Aspire: 2,
    BigSIS: 1,
    Clever: 2,
    "Edupoint Synergy": 1,
    eSchoolData: 2,
    eSchoolPlus: 2,
    Focus: 1,
    "Generic SFTP": 1,
    Genesis: 1,
    Harmony: 1,
    "Illuminate API": 2,
    "Infinite Campus": 2,
    Lumen: 2,
    OnCourse: 2,
    "One Roster SFTP": 3,
    PowerSchool: 3,
    ProgressBook: 1,
    "Real-Time": 1,
    Rediker: 2,
    "RenWeb/FACTS": 1,
    "Sam Spectra": 2,
    "School Pathways": 2,
    SchoolTool: 1,
    "Self-Manage": 1,
    "Skyward Q API": 1,
    "Skyward SFTP": 2,
    Sylogist: 1
  };

  function sisPointsForLegend() {
    var fromSync = typeof ICSync !== "undefined" && ICSync.SIS_PTS;
    if (fromSync && Object.keys(fromSync).length > 10) {
      return fromSync;
    }
    return LEGEND_SIS_PTS;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ptsLabel(n) {
    return n === 1 ? "1 pt" : n + " pts";
  }

  function tableRows(map, labelFn, sortKeys) {
    var keys = Object.keys(map);
    if (sortKeys) keys.sort(function (a, b) { return a.localeCompare(b); });
    return keys.map(function (key) {
      var label = labelFn ? labelFn(key) : key;
      return (
        "<tr><td>" + escapeHtml(label) + "</td><td>" + ptsLabel(map[key]) + "</td></tr>"
      );
    }).join("");
  }

  function buildPanelHtml() {
    var size = ICSync.SIZE_PTS;
    var sis = sisPointsForLegend();
    var health = ICSync.HEALTH_PTS;
    var role = ICSync.ROLE_PTS;
    var type = ICSync.TYPE_PTS;
    var comp = ICSync.COMP_PTS;
    var mpc = TeamData.MPC_VALUES;
    var tierRows = ["T1", "T2", "T3", "T4", "T5"].map(function (t) {
      return "<tr><td>" + t + "</td><td>" + mpc[t] + " pts max</td></tr>";
    }).join("");
    var healthRows = Object.keys(health).map(function (k) {
      return (
        "<tr><td>" + escapeHtml(HEALTH_LABELS[k] || k) + "</td><td>" + ptsLabel(health[k]) + "</td></tr>"
      );
    }).join("");
    var adjRows = ADJ_OPTIONS.map(function (opt) {
      return "<tr><td>" + escapeHtml(opt) + "</td><td>+1 pt each</td></tr>";
    }).join("");

    return (
      '<p class="points-legend-intro">Point totals on every dashboard use the same rules below. ' +
      "Deal points and project points are added for workload; capacity % compares that total to your tier max (MPC).</p>" +
      '<section class="points-legend-section">' +
      "<h4>Implementation deals</h4>" +
      '<p class="points-legend-formula">Deal total = Size + SIS + Health + Adjustments (each checked item +1)</p>' +
      '<table class="points-legend-table"><thead><tr><th>Size</th><th>Points</th></tr></thead><tbody>' +
      tableRows(size) +
      "</tbody></table>" +
      '<table class="points-legend-table" style="margin-top:12px;"><thead><tr><th>SIS</th><th>Points</th></tr></thead><tbody>' +
      tableRows(sis, null, true) +
      "</tbody></table>" +
      '<table class="points-legend-table" style="margin-top:12px;"><thead><tr><th>Health</th><th>Points</th></tr></thead><tbody>' +
      healthRows +
      "</tbody></table>" +
      '<table class="points-legend-table" style="margin-top:12px;"><thead><tr><th>Adjustment (deal queue)</th><th>Points</th></tr></thead><tbody>' +
      adjRows +
      "</tbody></table></section>" +
      '<section class="points-legend-section">' +
      "<h4>Strategic projects</h4>" +
      '<p class="points-legend-formula">Each IM\'s project total = Role + Type + Complexity + Contributor scope</p>' +
      '<p class="points-legend-note">Type and Complexity are set once per project by the project lead from proposal factors before the project is entered in the dashboard. Contributor scope uses the <strong>total contributor count (all teams)</strong> set by the lead when creating or editing the project. Only Role differs (Lead vs Contributor).</p>' +
      '<table class="points-legend-table"><thead><tr><th>Role</th><th>Points</th></tr></thead><tbody>' +
      tableRows(role) +
      "</tbody></table>" +
      '<table class="points-legend-table" style="margin-top:12px;"><thead><tr><th>Type (per project)</th><th>Points</th></tr></thead><tbody>' +
      tableRows(type) +
      "</tbody></table>" +
      '<table class="points-legend-table" style="margin-top:12px;"><thead><tr><th>Complexity (per project)</th><th>Points</th></tr></thead><tbody>' +
      tableRows(comp) +
      "</tbody></table>" +
      '<table class="points-legend-table" style="margin-top:12px;"><thead><tr><th>Total contributors (all teams)</th><th>Points</th></tr></thead><tbody>' +
      CONTRIBUTOR_SCOPE_BANDS.map(function (b) {
        return "<tr><td>" + escapeHtml(b.label) + "</td><td>" + ptsLabel(b.pts) + "</td></tr>";
      }).join("") +
      "</tbody></table></section>" +
      '<section class="points-legend-section">' +
      "<h4>Max point capacity (MPC) by tier</h4>" +
      '<p class="points-legend-formula">Capacity % = (Deal points + Project points) ÷ MPC for your tier</p>' +
      '<table class="points-legend-table"><thead><tr><th>Tier</th><th>MPC</th></tr></thead><tbody>' +
      tierRows +
      "</tbody></table></section>"
    );
  }

  function mount() {
    try {
      if (typeof ICSync === "undefined" || typeof TeamData === "undefined") return;
      var container = document.querySelector(".container");
      var footer = container && container.querySelector("footer");
      if (!container || !footer || document.getElementById("points-legend-wrap")) return;

      var wrap = document.createElement("div");
      wrap.id = "points-legend-wrap";
      wrap.className = "points-legend-wrap";
      wrap.innerHTML =
        '<button type="button" id="points-legend-toggle" class="points-legend-toggle btn-action" ' +
        'aria-expanded="false" aria-controls="points-legend-panel">How are points calculated?</button>' +
        '<div id="points-legend-panel" class="points-legend-panel" role="region" aria-labelledby="points-legend-toggle"></div>';

      footer.parentNode.insertBefore(wrap, footer);

      var toggle = document.getElementById("points-legend-toggle");
      var panel = document.getElementById("points-legend-panel");
      var panelBuilt = false;

      toggle.addEventListener("click", function () {
        if (!panelBuilt) {
          panel.innerHTML = buildPanelHtml();
          panelBuilt = true;
        }
        var open = wrap.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    } catch (e) {
      console.warn("Points legend could not mount:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  return { mount: mount };
})();
