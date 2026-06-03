/** Reload role views when shared team data changes (IC → Lead → Manager). */
(function () {
  var TS_KEY = "imworkdash_team_v1_ts";

  function isEmbedFrameActive() {
    try {
      if (window.parent === window) return true;
      var frame = window.frameElement;
      return frame && frame.classList.contains("is-active");
    } catch (e) {
      return true;
    }
  }

  function onTeamDataUpdated(callback) {
    function run() {
      callback();
    }

    function schedule() {
      if (isEmbedFrameActive()) {
        window.__imworkdashPendingSync = false;
        run();
      } else {
        window.__imworkdashPendingSync = true;
      }
    }

    window.addEventListener("storage", function (e) {
      if (e.key === "imworkdash_team_v1" || e.key === TS_KEY) schedule();
    });
    window.addEventListener("message", function (e) {
      if (e.data && e.data.type === "imworkdash-team-updated") schedule();
    });
  }

  window.IMWorkdashViewSync = {
    onTeamDataUpdated: onTeamDataUpdated,
    isEmbedFrameActive: isEmbedFrameActive
  };
})();
