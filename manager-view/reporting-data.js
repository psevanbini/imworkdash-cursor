/**
 * Reporting metrics — roster & deal-detail from shared store (Team Overview,
 * Assignment, IC sync); HubSpot-style ARR/CSAT/TTV use stable per-IM seeds scaled by date range.
 */
var ReportingData = (function () {
  var SEGMENTS = ["Single", "Small", "Medium", "Large", "Enterprise", "Strategic"];
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
    return Math.min(1, Math.max(0.35, days / 90));
  }

  function businessDaysSince(dateStr) {
    if (!dateStr) return 0;
    var start = new Date(dateStr + "T12:00:00");
    var end = new Date();
    end.setHours(12, 0, 0, 0);
    if (isNaN(start.getTime()) || start > end) return 0;
    var count = 0;
    var cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
      var day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function mpcFor(im) {
    return (typeof TeamData !== "undefined" && TeamData.MPC_VALUES)
      ? (TeamData.MPC_VALUES[im.tier] || 0)
      : 0;
  }

  function totalPoints(im) {
    return (im.dealPts || 0) + (im.projPts || 0);
  }

  function capacityPct(im) {
    var mpc = mpcFor(im);
    return mpc > 0 ? Math.round((totalPoints(im) / mpc) * 100) : 0;
  }

  /** Ensure icDeals exist on roster (same source as Team Overview aggregates). */
  function prepareRoster(team) {
    if (!team || !team.length) return;
    if (typeof ICSync !== "undefined" && ICSync.seedRosterDeals) {
      ICSync.seedRosterDeals(team);
    }
  }

  function segmentCountsForIM(im, scale) {
    var counts = {};
    SEGMENTS.forEach(function (seg) { counts[seg] = 0; });
    if (im.icDeals && im.icDeals.length) {
      im.icDeals.forEach(function (d) {
        if (counts[d.size] != null) counts[d.size]++;
        else counts[d.size] = 1;
      });
    } else {
      var totalW = 0;
      var weights = {};
      SEGMENTS.forEach(function (seg) {
        weights[seg] = seeded(im.name, "w-" + seg, 1, 12);
        totalW += weights[seg];
      });
      var dealTotal = Math.max(0, Math.round((im.deals || 0) * scale));
      var allocated = 0;
      SEGMENTS.forEach(function (seg, idx) {
        if (idx === SEGMENTS.length - 1) {
          counts[seg] = Math.max(0, dealTotal - allocated);
        } else {
          var n = totalW ? Math.round(dealTotal * weights[seg] / totalW) : 0;
          counts[seg] = n;
          allocated += n;
        }
      });
    }
    if (scale < 1 && im.icDeals && im.icDeals.length) {
      SEGMENTS.forEach(function (seg) {
        counts[seg] = Math.round(counts[seg] * scale);
      });
    }
    return counts;
  }

  function countAdjustmentsByType(im, scale) {
    var counts = {};
    ADJ_TYPES.forEach(function (type) { counts[type] = 0; });
    var fromDeals = false;
    (im.icDeals || []).forEach(function (d) {
      (d.adj || []).forEach(function (label) {
        if (counts[label] != null) {
          counts[label]++;
          fromDeals = true;
        }
      });
    });
    if (!fromDeals) {
      ADJ_TYPES.forEach(function (type) {
        counts[type] = Math.round(
          seeded(im.name, "adj-" + type, 0, 4) * scale * Math.max(1, (im.deals || 0) / 10)
        );
      });
    }
    return counts;
  }

  function removalReasonCounts(im) {
    var counts = {};
    REMOVAL_REASONS.forEach(function (r) { counts[r] = 0; });
    if (im.onRotation !== false) return counts;
    var text = (im.reason || "").toLowerCase();
    if (!text) return counts;
    var matched = false;
    REMOVAL_REASONS.forEach(function (reason) {
      if (reason === "Other") return;
      if (text.indexOf(reason.toLowerCase()) >= 0) {
        counts[reason] = 1;
        matched = true;
      }
    });
    if (text.indexOf("other") >= 0) {
      counts.Other = 1;
      matched = true;
    }
    if (!matched) counts.Other = 1;
    return counts;
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
        totalPts += totalPoints(im);
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
        pts += totalPoints(im);
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
    prepareRoster(fullTeam || ims);
    ims = sortByTierAsc(ims);
    var scale = rangeScale(range.start, range.end);
    var labels = imLabels(ims);

    var dealsBySegment = {};
    SEGMENTS.forEach(function (seg) {
      dealsBySegment[seg] = ims.map(function (im) {
        return segmentCountsForIM(im, scale)[seg] || 0;
      });
    });

    var dealPts = ims.map(function (im) { return im.dealPts || 0; });
    var projPts = ims.map(function (im) { return im.projPts || 0; });

    var arr = ims.map(function (im) {
      var base = seeded(im.name, "arr" + range.start, 120, 980) * scale;
      var dealFactor = Math.max(0.5, (im.deals || 0) / 12);
      return Math.round(base * dealFactor) * 1000;
    });

    var overCapPts = ims.map(function (im) {
      var mpc = mpcFor(im);
      var over = Math.max(0, totalPoints(im) - mpc);
      if (over > 0) return over;
      return Math.round(seeded(im.name, "ocpts" + range.start, 0, 12) * scale * (capacityPct(im) / 100));
    });

    var overCapDays = ims.map(function (im, i) {
      if (overCapPts[i] > 0) {
        var fromRotation = im.onRotation === false && (im.reason || "").toLowerCase().indexOf("capacity") >= 0;
        if (fromRotation && im.removedAt) return businessDaysSince(im.removedAt);
        return Math.min(28, Math.round(seeded(im.name, "ocdays" + range.start, 3, 28) * scale));
      }
      return 0;
    });

    var reAdds = ims.map(function (im) {
      var base = Math.round(seeded(im.name, "readd" + range.start, 0, 4) * scale);
      if (im.rotationResumeOverride) return Math.max(base, 1);
      if (im.onRotation && im.returnToRotationAt) return Math.max(base, 1);
      return base;
    });

    var removalsByReason = {};
    REMOVAL_REASONS.forEach(function (reason) {
      removalsByReason[reason] = ims.map(function (im) {
        var real = removalReasonCounts(im)[reason] || 0;
        if (real) return real;
        return Math.round(
          seeded(im.name, "rm-" + reason + range.start, 0, reason === "Capacity" || reason === "Velocity" ? 2 : 1) * scale
        );
      });
    });

    var ttv = ims.map(function (im) {
      return Math.round(seeded(im.name, "ttv" + range.start, 45, 210) * (0.85 + scale * 0.15));
    });

    var csat = ims.map(function (im) {
      return Math.round(seeded(im.name, "csat" + range.start, 30, 50)) / 10;
    });

    var velocity = ims.map(function (im) {
      var v = im.velocity != null ? im.velocity : seeded(im.name, "vel" + range.start, 1, 7);
      return Math.round(v * (0.85 + scale * 0.15) * 10) / 10;
    });

    var rotationDaysOff = ims.map(function (im) {
      if (im.onRotation === false) {
        var days = businessDaysSince(im.removedAt);
        if (days > 0) return days;
        return Math.round(seeded(im.name, "roff" + range.start, 5, 35) * scale);
      }
      return Math.round(seeded(im.name, "roff-idle" + range.start, 0, 3) * scale);
    });

    var atRiskYellow = ims.map(function (im) { return im.y != null ? im.y : 0; });
    var atRiskRed = ims.map(function (im) { return im.r != null ? im.r : 0; });

    var pastDueProjects = ims.map(function (im) { return im.pd != null ? im.pd : 0; });

    var adjustmentsByType = {};
    ADJ_TYPES.forEach(function (type) {
      adjustmentsByType[type] = ims.map(function (im) {
        return countAdjustmentsByType(im, scale)[type] || 0;
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
      var fromRoster = (im.y || 0) + (im.r || 0);
      var sim = Math.round(seeded(im.name, "esc" + range.start, 0, 5) * scale);
      return Math.max(fromRoster, sim);
    });

    var burnoutRemovals = removalsByReason["IM Request/Burnout"];

    var burnoutRisk = ims.map(function (im, i) {
      var capFactor = Math.min(1, overCapDays[i] / 28);
      var velFactor = Math.min(1, velocity[i] / 7);
      var riskFactor = Math.min(1, (atRiskYellow[i] + atRiskRed[i] * 2) / 6);
      var burnFactor = Math.min(1, (burnoutRemovals[i] || 0) / 3);
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
        var current = totalPoints(im);
        var points = [];
        var base = seeded(
          im.name,
          "tier" + tierNumVal + range.start,
          Math.max(15, Math.round(current * 0.55)),
          Math.max(25, Math.round(current * 0.88))
        );
        for (var w = 0; w < weeks; w++) {
          var drift = seeded(im.name, "tw" + w + range.start, -12, 18);
          var progress = weeks <= 1 ? 1 : w / (weeks - 1);
          var trend = base + (current - base) * progress;
          var wobble = drift * (0.85 - progress * 0.35);
          points.push(Math.max(0, Math.round((trend + wobble) * (0.92 + scale * 0.08))));
        }
        if (weeks > 0) points[weeks - 1] = current;
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
    prepareRoster: prepareRoster,
    filterTeam: filterTeam,
    buildMetrics: buildMetrics
  };
})();
