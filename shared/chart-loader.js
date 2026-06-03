/** Lazy-load Chart.js for Manager Reporting (first open only). */
var ChartLoader = (function () {
  var SRC = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
  var loading = false;
  var queue = [];

  function flush() {
    var pending = queue.splice(0);
    pending.forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        console.warn("ChartLoader callback failed:", e);
      }
    });
  }

  function load(callback) {
    if (typeof callback !== "function") return;
    if (typeof Chart !== "undefined") {
      callback();
      return;
    }
    queue.push(callback);
    if (loading) return;
    loading = true;
    var existing = document.querySelector('script[data-chart-loader="1"]');
    if (existing) {
      existing.addEventListener("load", function () {
        loading = false;
        flush();
      });
      return;
    }
    var script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.dataset.chartLoader = "1";
    script.onload = function () {
      loading = false;
      flush();
    };
    script.onerror = function () {
      loading = false;
      queue.length = 0;
      console.warn("Chart.js failed to load from CDN.");
    };
    document.head.appendChild(script);
  }

  return { load: load };
})();
