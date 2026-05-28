/** Shared at-risk / past-due metric HTML for dashboard views */
function formatRiskBreakdown(yellow, red, label) {
  const suffix = label || "Breakdown";
  return (
    '<span class="metric-orange-7">' + yellow + "Y</span> / " +
    '<span class="metric-red">' + red + "R</span> " + suffix
  );
}

function formatPastDueProjects(count) {
  const noun = count === 1 ? "Past Due Project" : "Past Due Projects";
  return '<span class="metric-psq-purple">' + count + " " + noun + "</span>";
}

function tierNumberFromGroupKey(key) {
  var m = /^Tier (\d)$/.exec(key);
  return m ? parseInt(m[1], 10) : null;
}

function tierNumberFromIM(im) {
  return parseInt(im.tier.replace(/\D/g, ""), 10);
}

function formatIMName(im) {
  var tier = im.tier || "";
  return tier ? im.name + " (" + tier + ")" : im.name;
}

/** First name, last initial, tier — e.g. Jordan M. (T3) */
function formatIMShortLabel(im) {
  if (typeof im === "string") return im;
  var parts = im.name.trim().split(/\s+/);
  var first = parts[0] || im.name;
  var lastInitial = parts.length > 1 ? parts[parts.length - 1].charAt(0) + "." : "";
  var tier = im.tier || "";
  var label = lastInitial ? first + " " + lastInitial : first;
  return tier ? label + " (" + tier + ")" : label;
}

function groupHeaderClassForKey(key, baseClass) {
  baseClass = baseClass || "group-header";
  var tier = tierNumberFromGroupKey(key);
  return tier ? baseClass + " tier-header-" + tier : baseClass;
}

function imCardTierClass(im) {
  var tier = tierNumberFromIM(im);
  return tier >= 1 && tier <= 5 ? " im-card-tier-" + tier : "";
}

function imCardCapacityBorderClass(pct) {
  if (pct >= 90) return " im-card-cap-critical";
  if (pct >= 80) return " im-card-cap-warn";
  return " im-card-cap-ok";
}

function imCardClassList(im) {
  return "im-card" + imCardTierClass(im);
}

/** Team Lead / roster: capacity % and risk column colors aligned with at-risk card */
function leadCapacityPctClass(pct) {
  if (pct >= 90) return "lead-cap-critical";
  if (pct >= 80) return "lead-cap-warn";
  return "lead-cap-ok";
}

function formatIMRisksCell(yellow, red, pastDue) {
  var html =
    '<span class="metric-orange-7">' + yellow + "Y</span> / " +
    '<span class="metric-red">' + red + "R</span> | ";
  if (pastDue > 0) {
    html += '<span class="metric-psq-purple" style="font-weight:700;">' + pastDue + "P</span>";
  } else {
    html += pastDue + "P";
  }
  return html;
}

function formatIMRisksInline(yellow, red, pastDue) {
  var pastDueHtml =
    pastDue > 0
      ? '<b class="metric-psq-purple">' + pastDue + "</b>"
      : "<b>" + pastDue + "</b>";
  return (
    '<span class="metric-orange-7">' + yellow + "Y</span>/" +
    '<span class="metric-red">' + red + "R</span> | Projects past due: " +
    pastDueHtml
  );
}

function imCapacityPct(im, mpcValues) {
  var max = mpcValues[im.tier];
  if (!max) return 0;
  return Math.round(((im.dealPts + im.projPts) / max) * 100);
}

function leadCapacityPctColor(pct) {
  if (pct >= 90) return "#a94442";
  if (pct >= 80) return "#d49923";
  return "#56bc3a";
}

function formatDealAssignIMOption(im, mpcValues) {
  var pct = imCapacityPct(im, mpcValues);
  var color = leadCapacityPctColor(pct);
  return (
    '<option style="color:' + color + '; font-weight:700;">' +
    formatIMName(im) + " (" + pct + "%)</option>"
  );
}

function imTierNumber(im) {
  return parseInt(im.tier.replace(/\D/g, ""), 10);
}

/** T1: Med and Lg/Ent not available by tier. */
function eligibilityMedDisabled(im) {
  return imTierNumber(im) <= 1;
}

/** T1–T2: Lg/Ent not available by tier. */
function eligibilityLgDisabled(im) {
  return imTierNumber(im) <= 2;
}

function normalizeIMEligibility(im) {
  if (eligibilityMedDisabled(im)) im.med = false;
  if (eligibilityLgDisabled(im)) im.lg = false;
}

/** On rotation + segment training for deal size (Med / Lg/Ent). */
function imEligibleForDealSize(im, dealSize) {
  if (!im.onRotation) return false;
  var tier = imTierNumber(im);
  if (dealSize === "Small") return true;
  if (dealSize === "Medium") return tier >= 2 && im.med;
  if (dealSize === "Strategic" || dealSize === "Large" || dealSize === "Enterprise") {
    return tier >= 3 && im.lg;
  }
  return false;
}

function dealAssignEmptyLabel(dealSize) {
  if (dealSize === "Small") return "No eligible IMs (on rotation)";
  if (dealSize === "Medium") return "No eligible IMs (on rotation + Med training)";
  if (
    dealSize === "Large" ||
    dealSize === "Enterprise" ||
    dealSize === "Strategic"
  ) {
    return "No eligible IMs (on rotation + Lg/Ent training)";
  }
  return "No eligible IMs for this deal size";
}

function dealAssignIMOptionsHtml(ims, mpcValues, dealSize) {
  return ims
    .filter(function (im) {
      return imEligibleForDealSize(im, dealSize);
    })
    .sort(function (a, b) {
      return imCapacityPct(a, mpcValues) - imCapacityPct(b, mpcValues);
    })
    .map(function (im) {
      return formatDealAssignIMOption(im, mpcValues);
    })
    .join("");
}
