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
