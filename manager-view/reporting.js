/**
 * Manager Reporting tab — static charts by region & date range (no animation).
 */
var ManagerReporting = (function () {
  var LAYOUT_KEY = "imworkdash_reporting_layout_v1";
  var PREFS_KEY = "imworkdash_reporting_prefs_v2";

  var WIDGETS = [
    { id: "deals-by-segment", title: "Deals by Segment Size", wide: true },
    { id: "points-breakdown", title: "Point Count by IM", wide: true, toggle: true },
    { id: "velocity-by-im", title: "Velocity (Deals / Week)", wide: false },
    { id: "arr-by-im", title: "Total ARR by IM", wide: false },
    { id: "arr-per-point", title: "ARR per Point by IM", wide: false },
    { id: "csat-by-im", title: "Avg CSAT — HubSpot (out of 5)", wide: false },
    { id: "csat-vs-ttv", title: "CSAT vs Time to Value — HubSpot", wide: true },
    { id: "time-to-value", title: "Avg Time to Value — HubSpot (days)", wide: false },
    { id: "at-risk-deals", title: "At-Risk Deals by IM (Y / R)", wide: true },
    { id: "past-due-projects", title: "Past-Due Projects by IM", wide: false },
    { id: "adjustments-by-type", title: "Deal Adjustments by Type", wide: true },
    { id: "over-cap-time", title: "Time Above Max Capacity (days)", wide: false },
    { id: "over-cap-points", title: "Points Above Max Capacity", wide: false },
    { id: "burnout-risk", title: "Burnout Risk Index", wide: false },
    { id: "rotation-days-off", title: "Time Off Rotation (business days)", wide: false },
    { id: "rotation-readds", title: "Rotation Re-Adds", wide: false },
    { id: "rotation-removals", title: "Rotation Removals by Reason", wide: true, reasonFilter: true },
    { id: "escalations-by-im", title: "Escalations / Churn by IM", wide: false },
    { id: "region-rollup", title: "Regional Comparison (EST / CST / PST)", wide: true, regionMetricFilter: true },
    { id: "tier-benchmark", title: "Tier Benchmark — Points, TTV & CSAT", wide: true },
    { id: "tier-t1", title: "Tier 1 — Points Over Time", wide: true },
    { id: "tier-t2", title: "Tier 2 — Points Over Time", wide: true },
    { id: "tier-t3", title: "Tier 3 — Points Over Time", wide: true },
    { id: "tier-t4", title: "Tier 4 — Points Over Time", wide: true }
  ];

  /** ParentSquare Brand 2.0 approved palette only */
  var BRAND = {
    green: "#68e246",
    green03: "#b3f0a2",
    green05: "#81e664",
    green07: "#56bc3a",
    green08: "#43a02e",
    blue: "#10a3ff",
    blue05: "#42b5ff",
    orange: "#ffb82a",
    orange07: "#d49923",
    pink: "#fc57e5",
    pink05: "#fc73e9",
    pinkDark: "#541d4c",
    purple: "#be77ff",
    purple05: "#c789ff",
    purple07: "#9c5fd4",
    muted: "#5a7a8f",
    red: "#a94442"
  };

  var SEGMENT_COLORS = {
    Single: BRAND.green03,
    Small: BRAND.green05,
    Medium: BRAND.blue05,
    Large: BRAND.purple,
    Enterprise: BRAND.purple07,
    Strategic: BRAND.pink
  };

  var REASON_COLORS = {
    Illness: BRAND.blue,
    Vacation: BRAND.green,
    Bereavement: BRAND.purple,
    "IM Request/Burnout": BRAND.red,
    Capacity: BRAND.orange,
    Velocity: BRAND.pink,
    Other: "#999999"
  };

  var LINE_PALETTE = [
    BRAND.green, BRAND.blue, BRAND.purple, BRAND.orange, BRAND.pink, BRAND.green07
  ];

  var ADJ_COLORS = [
    BRAND.green, BRAND.blue, BRAND.orange, BRAND.purple, BRAND.pink, BRAND.green07
  ];

  var REGION_METRICS = {
    points: { label: "Avg Points", key: "avgPoints", color: BRAND.green },
    csat: { label: "Avg CSAT", key: "avgCsat", color: BRAND.blue },
    ttv: { label: "Avg TTV (days)", key: "avgTtv", color: BRAND.orange }
  };

  var chartInstances = {};
  var pointsMode = "both";
  var removalReasonFilter = "all";
  var regionMetricFilter = "points";
  var collapsedWidgets = {};
  var hiddenWidgets = {};
  var lastContext = null;
  var lastMetrics = null;

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) { /* quota */ }
  }

  function loadLayoutOrder() {
    try {
      var raw = localStorage.getItem(LAYOUT_KEY);
      if (!raw) return WIDGETS.map(function (w) { return w.id; });
      var order = JSON.parse(raw);
      var ids = WIDGETS.map(function (w) { return w.id; });
      return order.filter(function (id) { return ids.indexOf(id) >= 0; })
        .concat(ids.filter(function (id) { return order.indexOf(id) < 0; }));
    } catch (e) {
      return WIDGETS.map(function (w) { return w.id; });
    }
  }

  function saveLayoutOrder(container) {
    var visibleOrder = Array.from(container.querySelectorAll(".report-widget")).map(function (el) {
      return el.getAttribute("data-widget-id");
    });
    var prevOrder = loadLayoutOrder();
    var merged = [];
    var vi = 0;
    prevOrder.forEach(function (id) {
      if (hiddenWidgets[id]) merged.push(id);
      else if (vi < visibleOrder.length) merged.push(visibleOrder[vi++]);
    });
    while (vi < visibleOrder.length) merged.push(visibleOrder[vi++]);
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged));
    } catch (e) { /* quota */ }
  }

  function destroyCharts() {
    Object.keys(chartInstances).forEach(function (k) {
      if (chartInstances[k]) chartInstances[k].destroy();
    });
    chartInstances = {};
  }

  function chartDefaults(extra) {
    var base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      animations: {
        colors: false,
        x: false,
        y: false
      },
      transitions: {
        active: { animation: { duration: 0 } },
        resize: { animation: { duration: 0 } }
      },
      plugins: {
        legend: { labels: { font: { family: "Inter", size: 11 }, boxWidth: 12 } }
      },
      scales: {
        x: { ticks: { font: { family: "Inter", size: 10 }, maxRotation: 45, minRotation: 0 } },
        y: { beginAtZero: true, ticks: { font: { family: "Inter", size: 10 } } }
      }
    };
    if (!extra) return base;
    return Object.assign({}, base, extra, {
      plugins: Object.assign({}, base.plugins, (extra.plugins || {})),
      scales: Object.assign({}, base.scales, (extra.scales || {}))
    });
  }

  function segmentTooltipCallbacks(metrics) {
    return {
      mode: "index",
      intersect: false,
      callbacks: {
        title: function (items) {
          return items[0] && items[0].label ? items[0].label : "";
        },
        label: function () {
          return "";
        },
        afterBody: function (items) {
          if (!items.length || !metrics) return [];
          var idx = items[0].dataIndex;
          var lines = ReportingData.SEGMENTS.map(function (seg) {
            return seg + ": " + metrics.dealsBySegment[seg][idx];
          });
          var total = ReportingData.SEGMENTS.reduce(function (sum, seg) {
            return sum + metrics.dealsBySegment[seg][idx];
          }, 0);
          lines.push("Total: " + total);
          return lines;
        }
      }
    };
  }

  function pointsTooltipCallbacks(metrics) {
    return {
      mode: "index",
      intersect: false,
      callbacks: {
        title: function (items) {
          return items[0] && items[0].label ? items[0].label : "";
        },
        label: function () {
          return "";
        },
        afterBody: function (items) {
          if (!items.length || !metrics) return [];
          var idx = items[0].dataIndex;
          var d = metrics.dealPts[idx];
          var p = metrics.projPts[idx];
          return ["Deal Points: " + d, "Project Points: " + p, "Total: " + (d + p)];
        }
      }
    };
  }

  function makeBarChart(canvasId, config) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(el, {
      type: "bar",
      data: config.data,
      options: chartDefaults(config.options)
    });
  }

  function makeLineChart(canvasId, config) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(el, {
      type: "line",
      data: config.data,
      options: chartDefaults(config.options)
    });
  }

  function makeScatterChart(canvasId, config) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(el, {
      type: "scatter",
      data: config.data,
      options: chartDefaults(config.options)
    });
  }

  function isWidgetCollapsed(id) {
    return !!collapsedWidgets[id];
  }

  function isWidgetHidden(id) {
    return !!hiddenWidgets[id];
  }

  function renderCharts(metrics) {
    lastMetrics = metrics;
    var labels = metrics.labels;

    makeBarChart("chart-deals-by-segment", {
      data: {
        labels: labels,
        datasets: ReportingData.SEGMENTS.map(function (seg) {
          return {
            label: seg,
            data: metrics.dealsBySegment[seg],
            backgroundColor: SEGMENT_COLORS[seg],
            stack: "deals"
          };
        })
      },
      options: {
        plugins: { tooltip: segmentTooltipCallbacks(metrics) },
        scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: "Deals" } } }
      }
    });

    var pointDatasets = [];
    if (pointsMode === "both" || pointsMode === "deals") {
      pointDatasets.push({
        label: "Deal Points",
        data: metrics.dealPts,
        backgroundColor: BRAND.green,
        stack: "pts"
      });
    }
    if (pointsMode === "both" || pointsMode === "projects") {
      pointDatasets.push({
        label: "Project Points",
        data: metrics.projPts,
        backgroundColor: BRAND.blue,
        stack: pointsMode === "both" ? "pts" : "pts-single"
      });
    }
    makeBarChart("chart-points-breakdown", {
      data: { labels: labels, datasets: pointDatasets },
      options: {
        plugins: { tooltip: pointsTooltipCallbacks(metrics) },
        scales: {
          x: { stacked: pointsMode === "both" },
          y: { stacked: pointsMode === "both", title: { display: true, text: "Points" } }
        }
      }
    });

    makeBarChart("chart-arr-by-im", {
      data: {
        labels: labels,
        datasets: [{ label: "ARR ($)", data: metrics.arr, backgroundColor: BRAND.pink }]
      },
      options: {
        scales: {
          y: {
            ticks: {
              callback: function (v) {
                return "$" + (v / 1000) + "k";
              }
            }
          }
        }
      }
    });

    makeBarChart("chart-over-cap-time", {
      data: {
        labels: labels,
        datasets: [{ label: "Business days above capacity", data: metrics.overCapDays, backgroundColor: BRAND.purple05 }]
      }
    });

    makeBarChart("chart-over-cap-points", {
      data: {
        labels: labels,
        datasets: [{ label: "Points above max", data: metrics.overCapPts, backgroundColor: BRAND.orange }]
      }
    });

    makeBarChart("chart-rotation-readds", {
      data: {
        labels: labels,
        datasets: [{ label: "Re-adds to rotation", data: metrics.reAdds, backgroundColor: BRAND.green07 }]
      }
    });

    var removalReasons = removalReasonFilter === "all"
      ? ReportingData.REMOVAL_REASONS
      : ReportingData.REMOVAL_REASONS.filter(function (r) { return r === removalReasonFilter; });

    makeBarChart("chart-rotation-removals", {
      data: {
        labels: labels,
        datasets: removalReasons.map(function (reason) {
          return {
            label: reason,
            data: metrics.removalsByReason[reason],
            backgroundColor: REASON_COLORS[reason],
            stack: removalReasonFilter === "all" ? "removals" : "removals-single"
          };
        })
      },
      options: {
        scales: {
          x: { stacked: removalReasonFilter === "all" },
          y: {
            stacked: removalReasonFilter === "all",
            title: { display: true, text: "Removals" }
          }
        }
      }
    });

    makeBarChart("chart-time-to-value", {
      data: {
        labels: labels,
        datasets: [{ label: "Avg days to value", data: metrics.ttv, backgroundColor: BRAND.blue05 }]
      },
      options: { plugins: { legend: { display: false } } }
    });

    makeBarChart("chart-csat-by-im", {
      data: {
        labels: labels,
        datasets: [{ label: "CSAT (out of 5)", data: metrics.csat, backgroundColor: BRAND.green07 }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return "CSAT: " + ctx.parsed.y.toFixed(1) + " / 5";
              }
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 5,
            title: { display: true, text: "Score (out of 5)" },
            ticks: { stepSize: 1 }
          }
        }
      }
    });

    makeBarChart("chart-velocity-by-im", {
      data: {
        labels: labels,
        datasets: [{
          label: "Deals / week",
          data: metrics.velocity,
          backgroundColor: BRAND.blue
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed.y;
                return "Velocity: " + v + (v > 5 ? " (above threshold)" : "");
              }
            }
          }
        },
        scales: {
          y: {
            title: { display: true, text: "Deals per week" },
            suggestedMax: 8
          }
        }
      }
    });

    makeBarChart("chart-arr-per-point", {
      data: {
        labels: labels,
        datasets: [{
          label: "ARR per point ($)",
          data: metrics.arrPerPoint,
          backgroundColor: BRAND.purple05
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: function (v) {
                return "$" + v.toLocaleString();
              }
            }
          }
        }
      }
    });

    makeScatterChart("chart-csat-vs-ttv", {
      data: {
        datasets: [{
          label: "IMs",
          data: metrics.scatterPoints.map(function (p) {
            return { x: p.ttv, y: p.csat, label: p.label };
          }),
          backgroundColor: BRAND.blue,
          pointRadius: 7,
          pointHoverRadius: 9
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var pt = metrics.scatterPoints[ctx.dataIndex];
                return pt.label + " — TTV: " + pt.ttv + " days, CSAT: " + pt.csat.toFixed(1) + " / 5";
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: "Time to Value (days)" },
            beginAtZero: true
          },
          y: {
            min: 0,
            max: 5,
            title: { display: true, text: "CSAT (out of 5)" }
          }
        }
      }
    });

    makeBarChart("chart-at-risk-deals", {
      data: {
        labels: labels,
        datasets: [
          { label: "Yellow", data: metrics.atRiskYellow, backgroundColor: BRAND.orange, stack: "risk" },
          { label: "Red", data: metrics.atRiskRed, backgroundColor: BRAND.red, stack: "risk" }
        ]
      },
      options: {
        scales: {
          x: { stacked: true },
          y: { stacked: true, title: { display: true, text: "At-risk deals" } }
        }
      }
    });

    makeBarChart("chart-past-due-projects", {
      data: {
        labels: labels,
        datasets: [{
          label: "Past-due projects",
          data: metrics.pastDueProjects,
          backgroundColor: BRAND.purple
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });

    makeBarChart("chart-adjustments-by-type", {
      data: {
        labels: ReportingData.ADJ_TYPES,
        datasets: [{
          label: "Adjustments",
          data: ReportingData.ADJ_TYPES.map(function (type) {
            return metrics.adjustmentsByType[type].reduce(function (sum, n) {
              return sum + n;
            }, 0);
          }),
          backgroundColor: ReportingData.ADJ_TYPES.map(function (_, i) {
            return ADJ_COLORS[i % ADJ_COLORS.length];
          })
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { maxRotation: 45, minRotation: 25 },
            title: { display: true, text: "Adjustment type" }
          },
          y: { beginAtZero: true, title: { display: true, text: "Total adjustments" } }
        }
      }
    });

    makeBarChart("chart-burnout-risk", {
      data: {
        labels: labels,
        datasets: [{
          label: "Risk score",
          data: metrics.burnoutRisk,
          backgroundColor: metrics.burnoutRisk.map(function (v) {
            return v >= 70 ? BRAND.red : v >= 40 ? BRAND.orange : BRAND.green07;
          })
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return "Burnout risk: " + ctx.parsed.y + " / 100";
              }
            }
          }
        },
        scales: {
          y: { min: 0, max: 100, title: { display: true, text: "Risk index (0–100)" } }
        }
      }
    });

    makeBarChart("chart-rotation-days-off", {
      data: {
        labels: labels,
        datasets: [{
          label: "Business days off rotation",
          data: metrics.rotationDaysOff,
          backgroundColor: BRAND.blue05
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });

    makeBarChart("chart-escalations-by-im", {
      data: {
        labels: labels,
        datasets: [{
          label: "Escalations",
          data: metrics.escalations,
          backgroundColor: BRAND.pinkDark
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });

    var tierBench = metrics.tierBenchmark;
    var tbEl = document.getElementById("chart-tier-benchmark");
    if (tbEl && typeof Chart !== "undefined") {
      if (chartInstances["chart-tier-benchmark"]) chartInstances["chart-tier-benchmark"].destroy();
      chartInstances["chart-tier-benchmark"] = new Chart(tbEl, {
        type: "bar",
        data: {
          labels: tierBench.map(function (t) { return t.tier; }),
          datasets: [
            {
              label: "Avg Points",
              data: tierBench.map(function (t) { return t.avgPoints; }),
              backgroundColor: BRAND.green,
              yAxisID: "y"
            },
            {
              label: "Avg CSAT",
              data: tierBench.map(function (t) { return t.avgCsat; }),
              backgroundColor: BRAND.blue,
              yAxisID: "y1"
            },
            {
              type: "line",
              label: "Avg TTV (days)",
              data: tierBench.map(function (t) { return t.avgTtv; }),
              borderColor: BRAND.orange,
              backgroundColor: BRAND.orange,
              yAxisID: "y",
              tension: 0
            }
          ]
        },
        options: chartDefaults({
          scales: {
            y: {
              type: "linear",
              position: "left",
              beginAtZero: true,
              title: { display: true, text: "Points / TTV (days)" }
            },
            y1: {
              type: "linear",
              position: "right",
              min: 0,
              max: 5,
              grid: { drawOnChartArea: false },
              title: { display: true, text: "CSAT (out of 5)" }
            }
          }
        })
      });
    }

    renderRegionRollupChart(metrics);

    [1, 2, 3, 4].forEach(function (n) {
      var key = "T" + n;
      var tier = metrics.tierSeries[key];
      makeLineChart("chart-tier-t" + n, {
        data: {
          labels: tier.labels,
          datasets: tier.series.map(function (s, i) {
            var color = LINE_PALETTE[i % LINE_PALETTE.length];
            return {
              label: s.name,
              data: s.data,
              borderColor: color,
              backgroundColor: color,
              tension: 0,
              fill: false
            };
          })
        }
      });
    });
  }

  function renderRegionRollupChart(metrics) {
    var regions = metrics.regionRollup;
    var metric = REGION_METRICS[regionMetricFilter] || REGION_METRICS.points;
    var yOptions = { beginAtZero: true, title: { display: true, text: metric.label } };
    if (regionMetricFilter === "csat") {
      yOptions.min = 0;
      yOptions.max = 5;
      yOptions.ticks = { stepSize: 1 };
    }
    makeBarChart("chart-region-rollup", {
      data: {
        labels: regions.map(function (r) { return r.tz; }),
        datasets: [{
          label: metric.label,
          data: regions.map(function (r) { return r[metric.key]; }),
          backgroundColor: metric.color
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var r = regions[ctx.dataIndex];
                var val = r[metric.key];
                if (regionMetricFilter === "csat") {
                  return metric.label + ": " + val.toFixed(1) + " / 5";
                }
                return metric.label + ": " + val;
              },
              afterLabel: function (ctx) {
                return "IMs: " + regions[ctx.dataIndex].imCount;
              }
            }
          }
        },
        scales: { y: yOptions }
      }
    });
  }

  function buildReasonFilterHtml() {
    var html = '<div class="report-widget-filter report-removal-filters">';
    html += '<button type="button" class="btn-action report-reason-btn' +
      (removalReasonFilter === "all" ? " active" : "") + '" data-reason-filter="all">All</button>';
    ReportingData.REMOVAL_REASONS.forEach(function (reason) {
      html += '<button type="button" class="btn-action report-reason-btn' +
        (removalReasonFilter === reason ? " active" : "") +
        '" data-reason-filter="' + reason.replace(/"/g, "&quot;") + '">' + reason + "</button>";
    });
    html += "</div>";
    return html;
  }

  function buildRegionMetricFilterHtml() {
    var html = '<div class="report-widget-filter report-region-metric-filters">';
    Object.keys(REGION_METRICS).forEach(function (key) {
      html += '<button type="button" class="btn-action report-region-metric-btn' +
        (regionMetricFilter === key ? " active" : "") + '" data-region-metric="' + key + '">' +
        REGION_METRICS[key].label + "</button>";
    });
    html += "</div>";
    return html;
  }

  function buildWidgetHtml(widget) {
    if (isWidgetHidden(widget.id)) return "";
    var collapsed = isWidgetCollapsed(widget.id);
    var toggleHtml = widget.toggle
      ? '<div class="report-widget-toggle">' +
        '<button type="button" class="btn-action report-pts-btn' + (pointsMode === "both" ? " active" : "") + '" data-pts-mode="both">Both</button>' +
        '<button type="button" class="btn-action report-pts-btn' + (pointsMode === "deals" ? " active" : "") + '" data-pts-mode="deals">Deal Pts</button>' +
        '<button type="button" class="btn-action report-pts-btn' + (pointsMode === "projects" ? " active" : "") + '" data-pts-mode="projects">Project Pts</button>' +
        "</div>"
      : "";
    var reasonHtml = widget.reasonFilter ? buildReasonFilterHtml() : "";
    var regionMetricHtml = widget.regionMetricFilter ? buildRegionMetricFilterHtml() : "";
    return (
      '<article class="report-widget' + (widget.wide ? " report-widget--wide" : "") +
        (collapsed ? " report-widget--collapsed" : "") + '" data-widget-id="' + widget.id + '">' +
        '<div class="report-widget-head">' +
          '<button type="button" class="report-collapse-btn" data-widget-id="' + widget.id + '" ' +
            'title="' + (collapsed ? "Expand chart" : "Collapse chart") + '" aria-expanded="' + !collapsed + '">' +
            (collapsed ? "▶" : "▼") + "</button>" +
          '<h3 class="report-widget-title">' + widget.title + "</h3>" +
          toggleHtml +
        "</div>" +
        '<div class="report-widget-body">' +
          reasonHtml +
          regionMetricHtml +
          '<div class="report-chart-wrap"><canvas id="chart-' + widget.id + '"></canvas></div>' +
        "</div>" +
      "</article>"
    );
  }

  function applyCollapsedState(container) {
    container.querySelectorAll(".report-widget").forEach(function (widget) {
      var id = widget.getAttribute("data-widget-id");
      widget.classList.toggle("report-widget--collapsed", isWidgetCollapsed(id));
      var btn = widget.querySelector(".report-collapse-btn");
      if (btn) {
        var collapsed = isWidgetCollapsed(id);
        btn.textContent = collapsed ? "▶" : "▼";
        btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        btn.title = collapsed ? "Expand chart" : "Collapse chart";
      }
    });
  }

  function handleCollapseToggle(btn, container) {
    var id = btn.getAttribute("data-widget-id");
    collapsedWidgets[id] = !collapsedWidgets[id];
    var prefs = loadPrefs() || {};
    prefs.collapsedWidgets = collapsedWidgets;
    savePrefs(prefs);
    applyCollapsedState(container);
    if (!collapsedWidgets[id]) {
      var chartKey = "chart-" + id;
      if (chartInstances[chartKey]) chartInstances[chartKey].resize();
    }
  }

  function buildChartVisibilityPanel() {
    var panel = document.getElementById("report-chart-visibility-list");
    if (!panel) return;
    panel.innerHTML = WIDGETS.map(function (w) {
      var visible = !isWidgetHidden(w.id);
      return (
        '<label class="report-visibility-item">' +
          '<input type="checkbox" class="report-visibility-cb" data-widget-id="' + w.id + '" ' +
          (visible ? "checked" : "") + "> " +
          w.title +
        "</label>"
      );
    }).join("");
  }

  function bindChartVisibilityPanel(onChange) {
    var toggleBtn = document.getElementById("report-chart-visibility-toggle");
    var panel = document.getElementById("report-chart-visibility-panel");
    var list = document.getElementById("report-chart-visibility-list");
    if (toggleBtn && panel && !toggleBtn.dataset.bound) {
      toggleBtn.dataset.bound = "1";
      toggleBtn.addEventListener("click", function () {
        var open = panel.style.display !== "none";
        panel.style.display = open ? "none" : "block";
        toggleBtn.classList.toggle("active", !open);
      });
    }
    if (list && !list.dataset.bound) {
      list.dataset.bound = "1";
      list.addEventListener("change", function (e) {
        if (!e.target.classList.contains("report-visibility-cb")) return;
        var id = e.target.getAttribute("data-widget-id");
        hiddenWidgets[id] = !e.target.checked;
        var prefs = loadPrefs() || {};
        prefs.hiddenWidgets = hiddenWidgets;
        savePrefs(prefs);
        onChange();
      });
    }
    var expandAll = document.getElementById("report-expand-all");
    var collapseAll = document.getElementById("report-collapse-all");
    if (expandAll && !expandAll.dataset.bound) {
      expandAll.dataset.bound = "1";
      expandAll.addEventListener("click", function () {
        collapsedWidgets = {};
        var prefs = loadPrefs() || {};
        prefs.collapsedWidgets = {};
        savePrefs(prefs);
        onChange();
      });
    }
    if (collapseAll && !collapseAll.dataset.bound) {
      collapseAll.dataset.bound = "1";
      collapseAll.addEventListener("click", function () {
        collapsedWidgets = {};
        WIDGETS.forEach(function (w) {
          if (!isWidgetHidden(w.id)) collapsedWidgets[w.id] = true;
        });
        var prefs = loadPrefs() || {};
        prefs.collapsedWidgets = collapsedWidgets;
        savePrefs(prefs);
        onChange();
      });
    }
  }

  function bindPointerDrag(container) {
    var dragState = null;
    var SCROLL_EDGE = 80;
    var MAX_SCROLL_SPEED = 20;

    function stopScrollLoop() {
      if (dragState && dragState.scrollRaf) {
        cancelAnimationFrame(dragState.scrollRaf);
        dragState.scrollRaf = null;
      }
    }

    function scrollLoop() {
      if (!dragState) return;
      var y = dragState.clientY;
      var vh = window.innerHeight;
      if (y < SCROLL_EDGE) {
        window.scrollBy(0, -MAX_SCROLL_SPEED * (1 - y / SCROLL_EDGE));
      } else if (y > vh - SCROLL_EDGE) {
        window.scrollBy(0, MAX_SCROLL_SPEED * (1 - (vh - y) / SCROLL_EDGE));
      } else {
        dragState.scrollRaf = null;
        return;
      }
      dragState.scrollRaf = requestAnimationFrame(scrollLoop);
    }

    function maybeStartScroll(clientY) {
      if (!dragState) return;
      dragState.clientY = clientY;
      var vh = window.innerHeight;
      if (clientY < SCROLL_EDGE || clientY > vh - SCROLL_EDGE) {
        if (!dragState.scrollRaf) dragState.scrollRaf = requestAnimationFrame(scrollLoop);
      } else {
        stopScrollLoop();
      }
    }

    function movePlaceholder(clientY) {
      if (!dragState) return;
      var placeholder = dragState.placeholder;
      var siblings = Array.from(container.children).filter(function (el) {
        return el !== placeholder;
      });
      var inserted = false;
      for (var i = 0; i < siblings.length; i++) {
        var rect = siblings[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          container.insertBefore(placeholder, siblings[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) container.appendChild(placeholder);
    }

    function positionGhost(clientX, clientY) {
      if (!dragState) return;
      dragState.widget.style.left = (clientX - dragState.offsetX) + "px";
      dragState.widget.style.top = (clientY - dragState.offsetY) + "px";
    }

    function onMove(e) {
      if (!dragState) return;
      positionGhost(e.clientX, e.clientY);
      movePlaceholder(e.clientY);
      maybeStartScroll(e.clientY);
    }

    function cleanupDrag() {
      if (!dragState) return;
      stopScrollLoop();
      var widget = dragState.widget;
      var placeholder = dragState.placeholder;
      widget.classList.remove("report-widget--ghost");
      widget.style.position = "";
      widget.style.left = "";
      widget.style.top = "";
      widget.style.width = "";
      widget.style.zIndex = "";
      widget.style.pointerEvents = "";
      container.insertBefore(widget, placeholder);
      placeholder.remove();
      document.body.classList.remove("report-is-dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveLayoutOrder(container);
      dragState = null;
    }

    function onUp() {
      cleanupDrag();
    }

    container.querySelectorAll(".report-drag-handle").forEach(function (handle) {
      handle.addEventListener("mousedown", function (e) {
        if (e.button !== 0 || dragState) return;
        e.preventDefault();
        var widget = handle.closest(".report-widget");
        if (!widget || !container.contains(widget)) return;

        var rect = widget.getBoundingClientRect();
        var placeholder = document.createElement("div");
        placeholder.className = "report-widget report-widget--placeholder";
        if (widget.classList.contains("report-widget--wide")) {
          placeholder.classList.add("report-widget--wide");
        }
        placeholder.style.height = rect.height + "px";
        placeholder.setAttribute("aria-hidden", "true");

        container.insertBefore(placeholder, widget);
        document.body.appendChild(widget);

        widget.classList.add("report-widget--ghost");
        widget.style.position = "fixed";
        widget.style.width = rect.width + "px";
        widget.style.left = rect.left + "px";
        widget.style.top = rect.top + "px";
        widget.style.zIndex = "1000";
        widget.style.pointerEvents = "none";

        dragState = {
          widget: widget,
          placeholder: placeholder,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          clientY: e.clientY,
          scrollRaf: null
        };

        document.body.classList.add("report-is-dragging");
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });
  }

  function refreshRotationRemovalsChart(container) {
    if (!lastMetrics) return;
    container.querySelectorAll(".report-reason-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-reason-filter") === removalReasonFilter);
    });
    if (chartInstances["chart-rotation-removals"]) {
      chartInstances["chart-rotation-removals"].destroy();
      delete chartInstances["chart-rotation-removals"];
    }
    var removalReasons = removalReasonFilter === "all"
      ? ReportingData.REMOVAL_REASONS
      : ReportingData.REMOVAL_REASONS.filter(function (r) { return r === removalReasonFilter; });
    makeBarChart("chart-rotation-removals", {
      data: {
        labels: lastMetrics.labels,
        datasets: removalReasons.map(function (reason) {
          return {
            label: reason,
            data: lastMetrics.removalsByReason[reason],
            backgroundColor: REASON_COLORS[reason],
            stack: removalReasonFilter === "all" ? "removals" : "removals-single"
          };
        })
      },
      options: {
        scales: {
          x: { stacked: removalReasonFilter === "all" },
          y: {
            stacked: removalReasonFilter === "all",
            title: { display: true, text: "Removals" }
          }
        }
      }
    });
  }

  function bindReportingPanelDelegation(contextProvider) {
    var panel = document.getElementById("view-reporting");
    if (!panel || panel.dataset.delegationBound) return;
    panel.dataset.delegationBound = "1";
    panel.addEventListener("click", function (e) {
      var dashboard = document.getElementById("reporting-dashboard");
      var ptsBtn = e.target.closest(".report-pts-btn");
      if (ptsBtn) {
        pointsMode = ptsBtn.getAttribute("data-pts-mode");
        var prefs = loadPrefs() || {};
        prefs.pointsMode = pointsMode;
        savePrefs(prefs);
        if (lastContext) render(lastContext);
        return;
      }
      var reasonBtn = e.target.closest(".report-reason-btn");
      if (reasonBtn && dashboard) {
        removalReasonFilter = reasonBtn.getAttribute("data-reason-filter");
        var prefsR = loadPrefs() || {};
        prefsR.removalReasonFilter = removalReasonFilter;
        savePrefs(prefsR);
        refreshRotationRemovalsChart(dashboard);
        return;
      }
      var regionBtn = e.target.closest(".report-region-metric-btn");
      if (regionBtn && dashboard) {
        regionMetricFilter = regionBtn.getAttribute("data-region-metric");
        var prefsG = loadPrefs() || {};
        prefsG.regionMetricFilter = regionMetricFilter;
        savePrefs(prefsG);
        dashboard.querySelectorAll(".report-region-metric-btn").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-region-metric") === regionMetricFilter);
        });
        if (lastMetrics) renderRegionRollupChart(lastMetrics);
        return;
      }
      var collapseBtn = e.target.closest(".report-collapse-btn");
      if (collapseBtn && dashboard) {
        e.stopPropagation();
        handleCollapseToggle(collapseBtn, dashboard);
      }
    });
  }

  function getRangeFromControls() {
    var mode = document.querySelector('input[name="report-date-mode"]:checked');
    mode = mode ? mode.value : "quarter";
    var start;
    var end;
    var label;

    if (mode === "calendar") {
      start = document.getElementById("report-date-from").value;
      end = document.getElementById("report-date-to").value;
      if (!start || !end) {
        var cur = FiscalCalendar.getCurrentQuarterOption();
        start = cur.start;
        end = cur.end;
      }
      if (start > end) {
        var tmp = start;
        start = end;
        end = tmp;
      }
      label = start + " – " + end;
    } else if (mode === "fiscal-year") {
      var fySel = document.getElementById("report-fiscal-year-select");
      var fyOpt = fySel.options[fySel.selectedIndex];
      start = fyOpt.getAttribute("data-start");
      end = fyOpt.getAttribute("data-end");
      label = fyOpt.textContent;
    } else {
      var qSel = document.getElementById("report-quarter-select");
      var qOpt = qSel.options[qSel.selectedIndex];
      start = qOpt.getAttribute("data-start");
      end = qOpt.getAttribute("data-end");
      label = qOpt.textContent;
    }

    return { start: start, end: end, label: label };
  }

  function syncDateModePanels() {
    var mode = document.querySelector('input[name="report-date-mode"]:checked');
    mode = mode ? mode.value : "quarter";
    document.getElementById("report-panel-calendar").style.display = mode === "calendar" ? "flex" : "none";
    document.getElementById("report-panel-quarter").style.display = mode === "quarter" ? "flex" : "none";
    document.getElementById("report-panel-fiscal-year").style.display = mode === "fiscal-year" ? "flex" : "none";
  }

  function initDateControls() {
    var prefs = loadPrefs() || {};
    pointsMode = prefs.pointsMode || "both";
    removalReasonFilter = prefs.removalReasonFilter || "all";
    regionMetricFilter = prefs.regionMetricFilter || "points";
    collapsedWidgets = prefs.collapsedWidgets || {};
    hiddenWidgets = prefs.hiddenWidgets || {};

    var quarters = FiscalCalendar.listQuartersFromEarliest();
    var qSel = document.getElementById("report-quarter-select");
    qSel.innerHTML = quarters.map(function (q) {
      return '<option value="' + q.id + '" data-start="' + q.start + '" data-end="' + q.end + '">' + q.label + "</option>";
    }).join("");
    var curQ = FiscalCalendar.getCurrentQuarterOption();
    qSel.value = prefs.quarterId || curQ.id;

    var years = FiscalCalendar.listFiscalYearsFromEarliest();
    var fySel = document.getElementById("report-fiscal-year-select");
    fySel.innerHTML = years.map(function (y) {
      return '<option value="' + y.id + '" data-start="' + y.start + '" data-end="' + y.end + '">' + y.label + "</option>";
    }).join("");
    fySel.value = prefs.fiscalYearId || ("fy" + FiscalCalendar.fiscalYearForDate(new Date()));

    var fromEl = document.getElementById("report-date-from");
    var toEl = document.getElementById("report-date-to");
    fromEl.value = prefs.dateFrom || curQ.start;
    toEl.value = prefs.dateTo || curQ.end;

    var mode = prefs.dateMode || "quarter";
    var modeInput = document.querySelector('input[name="report-date-mode"][value="' + mode + '"]');
    if (modeInput) modeInput.checked = true;
    syncDateModePanels();
  }

  function bindDateControls(onChange) {
    document.querySelectorAll('input[name="report-date-mode"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        syncDateModePanels();
        onChange();
      });
    });
    ["report-date-from", "report-date-to", "report-quarter-select", "report-fiscal-year-select"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", onChange);
    });
    document.getElementById("report-apply-range").addEventListener("click", onChange);
  }

  function saveDatePrefs() {
    var mode = document.querySelector('input[name="report-date-mode"]:checked');
    savePrefs({
      dateMode: mode ? mode.value : "quarter",
      dateFrom: document.getElementById("report-date-from").value,
      dateTo: document.getElementById("report-date-to").value,
      quarterId: document.getElementById("report-quarter-select").value,
      fiscalYearId: document.getElementById("report-fiscal-year-select").value,
      pointsMode: pointsMode,
      removalReasonFilter: removalReasonFilter,
      regionMetricFilter: regionMetricFilter,
      collapsedWidgets: collapsedWidgets,
      hiddenWidgets: hiddenWidgets
    });
  }

  function normalizeWidgetPrefs() {
    var ids = WIDGETS.map(function (w) { return w.id; });
    var hiddenCount = ids.filter(function (id) { return hiddenWidgets[id]; }).length;
    if (hiddenCount >= ids.length - 1) {
      hiddenWidgets = {};
    }
  }

  function render(context) {
    lastContext = context;
    var root = document.getElementById("reporting-dashboard");
    if (!root) return;

    ReportingData.prepareRoster(context.team);

    var range = getRangeFromControls();
    range.tz = context.tz;
    normalizeWidgetPrefs();
    saveDatePrefs();

    var ims = ReportingData.filterTeam(context.team, context.tz);
    var metrics = ReportingData.buildMetrics(ims, range, context.team);

    destroyCharts();

    var meta = document.getElementById("reporting-meta");
    if (meta) {
      meta.innerHTML =
        '<span class="report-meta-chip">' + metrics.regionLabel + "</span>" +
        '<span class="report-meta-chip">' + metrics.rangeLabel + "</span>" +
        '<span class="report-meta-chip">' + ims.length + " IMs</span>";
    }

    buildChartVisibilityPanel();

    var order = loadLayoutOrder().filter(function (id) {
      return !isWidgetHidden(id);
    });
    var widgetMap = {};
    WIDGETS.forEach(function (w) { widgetMap[w.id] = w; });

    root.innerHTML = order.map(function (id) {
      return buildWidgetHtml(widgetMap[id]);
    }).join("");

    renderCharts(metrics);
    applyCollapsedState(root);

    if (!ims.length) {
      root.insertAdjacentHTML(
        "afterbegin",
        '<p class="reporting-empty-msg">No IMs in this regional view. Switch to All Regions or another timezone.</p>'
      );
    }
  }

  function bindRefreshDataButton(onRefreshData) {
    var btn = document.getElementById("report-refresh-data");
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", function () {
      if (typeof onRefreshData === "function") onRefreshData();
    });
  }

  function init(contextProvider, onRefreshData) {
    initDateControls();
    bindReportingPanelDelegation(contextProvider);
    bindRefreshDataButton(onRefreshData);
    bindDateControls(function () {
      render(contextProvider());
    });
    bindChartVisibilityPanel(function () {
      render(contextProvider());
    });
  }

  return {
    init: init,
    render: render,
    WIDGETS: WIDGETS
  };
})();
