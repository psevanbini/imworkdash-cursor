/** Reload role views when shared team data changes (IC → Lead → Manager). */
(function () {
  var TS_KEY = "imworkdash_team_v1_ts";

  function onTeamDataUpdated(callback) {
    window.addEventListener("storage", function (e) {
      if (e.key === "imworkdash_team_v1" || e.key === TS_KEY) callback();
    });
    window.addEventListener("message", function (e) {
      if (e.data && e.data.type === "imworkdash-team-updated") callback();
    });
  }

  window.IMWorkdashViewSync = { onTeamDataUpdated: onTeamDataUpdated };
})();
