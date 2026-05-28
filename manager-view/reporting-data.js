/**
 * Mock reporting metrics — seeded per IM, scaled by date range & region filter.
 * HubSpot TTV, CSAT, and historical rotation events are simulated for the mockup.
 */
var ReportingData = (function () {
  var SEGMENTS = ["Small", "Medium", "Large", "Enterprise", "Strategic"];
  var ADJ_TYPES = [
    "Extended Launch",
    "Proof of Concept",
    "Pilots",
    "DSAs/DUAs/DPAs",
    "DOEs/RICs/BOCES",
    "New Hire"
  ];
  var REMOVAL_REASONS = [
    "Illness",
    "Vacation",
    "Bereavement",
    "Capacity",
    "Velocity",
    "IM Request/Burnout",
    "Other"
  ];
  var REGIONS = ["EST", "CST", "PST"];

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function seeded(name, salt, min, max) {
    var h = hashStr(name + "|" + salt);
    return min + (h % (max - min + 1));
  }

  function rangeScale(start, end) {
    var days = FiscalCalendar.daysInRange(start, end);
    return Math.min(1, days / 90);
  }

  function filterTeam(team, tz) {
    if (!tz || tz === "all") return team.slice();
    return team.filter(function (im) { return im.tz === tz; });
  }

  function sortByTierAsc(ims) {
    return ims.slice().sort(function (a, b) {
      var tA = parseInt(a.tier.slice(1), 10);
      var tB = parseInt(b.tier.slice(1), 10);
      if (tA !== tB) return tA - tB;
      return a.name.localeCompare(b.name);
    });
  }

  function imLabels(ims) {
    return ims.map(function (im) {
      return formatIMShortLabel(im);
    });
  }

  function tierNum(im) {
    return parseInt(im.tier.slice(1), 10);
  }

  function buildRegionRollup(fullTeam, range) {
    var scale = rangeScale(range.start, range.end);
    return REGIONS.map(function (tz) {
      var regionIms = fullTeam.filter(function (im) { return im.tz === tz; });
      if (!regionIms.length) {
        return { tz: tz, avgPoints: 0, avgCsat: 0, avgTtv: 0, imCount: 0 };
      }
      var totalPts = 0;
      var totalCsat = 0;
      var totalTtv = 0;
      regionIms.forEach(function (im) {
        totalPts += (im.dealPts || 0) + (im.projPts || 0);
        totalCsat += Math.round(seeded(im.name, "csat" + range.start, 30, 50)) / 10;
        totalTtv += Math.round(seeded(im.name, "ttv" + range.start, 45, 210) * (0.85 + scale * 0.15));
      });
      var n = regionIms.length;
      return {
        tz: tz,
        avgPoints: Math.round(totalPts / n),
        avgCsat: Math.round((totalCsat / n) * 10) / 10,
        avgTtv: Math.round(totalTtv / n),
        imCount: n
      };
    });
  }

  function buildTierBenchmark(ims, range) {
    var scale = rangeScale(range.start, range.end);
    var tiers = [1, 2, 3, 4, 5];
    return tiers.map(function (n) {
      var tierIms = ims.filter(function (im) { return tierNum(im) === n; });
      if (!tierIms.length) {
        return { tier: "T" + n, avgPoints: 0, avgTtv: 0, avgCsat: 0, count: 0 };
      }
      var pts = 0;
      var ttv = 0;
      var csat = 0;
      tierIms.forEach(function (im) {
        pts += (im.dealPts || 0) + (im.projPts || 0);
        ttv += Math.round(seeded(im.name, "ttv" + range.start, 45, 210) * (0.85 + scale * 0.15));
        csat += Math.round(seeded(im.name, "csat" + range.start, 30, 50)) / 10;
      });
      var c = tierIms.length;
      return {
        tier: "T" + n,
        avgPoints: Math.round(pts / c),
        avgTtv: Math.round(ttv / c),
        avgCsat: Math.round((csat / c) * 10) / 10,
        count: c
      };
    });
  }

  function buildMetrics(ims, range, fullTeam) {
    ims = sortByTierAsc(ims);
    var scale = rangeScale(range.start, range.end);
    var labels = imLabels(ims);

    var dealsBySegment = {};
    SEGMENTS.forEach(function (seg) {
      dealsBySegment[seg] = ims.map(function (im) {
        return Math.round(seeded(im.name, "seg-" + seg + range.start, 0, seg === "Strategic" ? 3 : 8) * scale);
      });
    });

    var dealPts = ims.map(function (im) {
      return Math.round(seeded(im.name, "dealpts" + range.start, 20, 110) * scale);
    });
    var projPts = ims.map(function (im) {
      return Math.round(seeded(im.name, "projpts" + range.start, 5, 45) * scale);
    });

    var arr = ims.map(function (im) {
      return Math.round(seeded(im.name, "arr" + range.start, 120, 980) * scale) * 1000;
    });

    var overCapDays = ims.map(function (im) {
      return Math.round(seeded(im.name, "ocdays" + range.start, 0, 28) * scale);
    });
    var overCapPts = ims.map(function (im) {
      return Math.round(seeded(im.name, "ocpts" + range.start, 0, 35) * scale);
    });
    var reAdds = ims.map(function (im) {
      return Math.round(seeded(im.name, "readd" + range.start, 0, 6) * scale);
    });

    var removalsByReason = {};
    REMOVAL_REASONS.forEach(function (reason) {
      removalsByReason[reason] = ims.map(function (im) {
        var base = reason === "Capacity" || reason === "Velocity" ? 3 : 2;
        return Math.round(seeded(im.name, "rm-" + reason + range.start, 0, base) * scale);
      });
    });

    var ttv = ims.map(function (im) {
      return Math.round(seeded(im.name, "ttv" + range.start, 45, 210) * (0.85 + scale * 0.15));
    });

    var csat = ims.map(function (im) {
      return Math.round(seeded(im.name, "csat" + range.start, 30, 50)) / 10;
    });

    var velocity = ims.map(function (im) {
      var base = im.velocity != null ? im.velocity : seeded(im.name, "vel" + range.start, 1, 7);
      return Math.round(base * (0.7 + scale * 0.3) * 10) / 10;
    });

    var rotationDaysOff = ims.map(function (im) {
      if (im.onRotation === false) {
        return Math.round(seeded(im.name, "roff" + range.start, 5, 35) * scale);
      }
      return Math.round(seeded(im.name, "roff" + range.start, 0, 8) * scale);
    });

    var atRiskYellow = ims.map(function (im) {
      return im.y != null ? im.y : seeded(im.name, "y" + range.start, 0, 3);
    });
    var atRiskRed = ims.map(function (im) {
      return im.r != null ? im.r : seeded(im.name, "r" + range.start, 0, 2);
    });

    var pastDueProjects = ims.map(function (im) {
      return im.pd != null ? im.pd : seeded(im.name, "pd" + range.start, 0, 3);
    });

    var adjustmentsByType = {};
    ADJ_TYPES.forEach(function (type) {
      adjustmentsByType[type] = ims.map(function (im) {
        return Math.round(seeded(im.name, "adj-" + type + range.start, 0, 4) * scale);
      });
    });

    var scatterPoints = ims.map(function (im, i) {
      return { label: labels[i], ttv: ttv[i], csat: csat[i] };
    });

    var arrPerPoint = ims.map(function (im, i) {
      var total = dealPts[i] + projPts[i];
      return total > 0 ? Math.round(arr[i] / total) : 0;
    });

    var escalations = ims.map(function (im) {
      return Math.round(seeded(im.name, "esc" + range.start, 0, 5) * scale);
    });

    var burnoutRemovals = removalsByReason["IM Request/Burnout"];

    var burnoutRisk = ims.map(function (im, i) {
      var capFactor = Math.min(1, overCapDays[i] / 28);
      var velFactor = Math.min(1, velocity[i] / 7);
      var riskFactor = Math.min(1, (atRiskYellow[i] + atRiskRed[i] * 2) / 6);
      var burnFactor = Math.min(1, burnoutRemovals[i] / 3);
      var raw = capFactor * 30 + velFactor * 25 + riskFactor * 25 + burnFactor * 20;
      return Math.min(100, Math.round(raw));
    });

    var tierSeries = {};
    [1, 2, 3, 4].forEach(function (tierNumVal) {
      var tierIms = ims.filter(function (im) {
        return tierNum(im) === tierNumVal;
      });
      var weeks = Math.max(4, Math.min(12, Math.round(FiscalCalendar.daysInRange(range.start, range.end) / 7)));
      var series = tierIms.map(function (im) {
        var points = [];
        var base = seeded(im.name, "tier" + tierNumVal + range.start, 40, 95);
        for (var w = 0; w < weeks; w++) {
          var drift = seeded(im.name, "tw" + w + range.start, -12, 18);
          points.push(Math.max(0, Math.round((base + drift * (w / weeks)) * scale)));
        }
        return { name: formatIMShortLabel(im), data: points };
      });
      tierSeries["T" + tierNumVal] = {
        labels: Array.from({ length: weeks }, function (_, i) { return "Wk " + (i + 1); }),
        series: series
      };
    });

    return {
      labels: labels,
      dealsBySegment: dealsBySegment,
      dealPts: dealPts,
      projPts: projPts,
      arr: arr,
      overCapDays: overCapDays,
      overCapPts: overCapPts,
      reAdds: reAdds,
      removalsByReason: removalsByReason,
      ttv: ttv,
      csat: csat,
      velocity: velocity,
      rotationDaysOff: rotationDaysOff,
      atRiskYellow: atRiskYellow,
      atRiskRed: atRiskRed,
      pastDueProjects: pastDueProjects,
      adjustmentsByType: adjustmentsByType,
      scatterPoints: scatterPoints,
      arrPerPoint: arrPerPoint,
      escalations: escalations,
      burnoutRisk: burnoutRisk,
      tierBenchmark: buildTierBenchmark(ims, range),
      regionRollup: buildRegionRollup(fullTeam || ims, range),
      tierSeries: tierSeries,
      regionLabel: range.tz === "all" ? "All Regions" : range.tz,
      rangeLabel: range.label || (range.start + " – " + range.end)
    };
  }

  return {
    SEGMENTS: SEGMENTS,
    ADJ_TYPES: ADJ_TYPES,
    REMOVAL_REASONS: REMOVAL_REASONS,
    REGIONS: REGIONS,
    filterTeam: filterTeam,
    buildMetrics: buildMetrics
  };
})();
