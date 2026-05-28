/**
 * ParentSquare fiscal calendar: Q1 Sep–Nov, Q2 Dec–Feb, Q3 Mar–May, Q4 Jun–Aug.
 * Fiscal year label matches the year in which the fiscal year ends (August).
 */
var FiscalCalendar = (function () {
  var MONTHS_Q1 = [8, 9, 10];
  var MONTHS_Q2 = [11, 0, 1];
  var MONTHS_Q3 = [2, 3, 4];
  var MONTHS_Q4 = [5, 6, 7];

  function fiscalYearForDate(d) {
    var m = d.getMonth();
    var y = d.getFullYear();
    return m >= 8 ? y + 1 : y;
  }

  function fiscalQuarterForDate(d) {
    var m = d.getMonth();
    if (MONTHS_Q1.indexOf(m) >= 0) return 1;
    if (MONTHS_Q2.indexOf(m) >= 0) return 2;
    if (MONTHS_Q3.indexOf(m) >= 0) return 3;
    return 4;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toDateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** @returns {{ start: string, end: string, fy: number, q: number }} */
  function getQuarterBounds(fy, q) {
    var startMonth;
    var startYear;
    if (q === 1) {
      startMonth = 8;
      startYear = fy - 1;
    } else if (q === 2) {
      startMonth = 11;
      startYear = fy - 1;
    } else if (q === 3) {
      startMonth = 2;
      startYear = fy;
    } else {
      startMonth = 5;
      startYear = fy;
    }
    var endMonth = q === 1 ? 10 : q === 2 ? 1 : q === 3 ? 4 : 7;
    var endYear = q === 2 && endMonth === 1 ? fy : startYear;
    if (q === 2 && startMonth === 11) {
      endYear = fy;
    }
    if (q === 1) endYear = fy - 1;
    if (q === 3 || q === 4) endYear = fy;

    var start = new Date(startYear, startMonth, 1);
    var end = new Date(endYear, endMonth + 1, 0);
    return { start: toDateStr(start), end: toDateStr(end), fy: fy, q: q };
  }

  function getFiscalYearBounds(fy) {
    return {
      start: toDateStr(new Date(fy - 1, 8, 1)),
      end: toDateStr(new Date(fy, 7, 31)),
      fy: fy
    };
  }

  function quarterLabel(fy, q) {
    var startYY = String(fy - 1).slice(-2);
    var endYY = String(fy).slice(-2);
    return "Q" + q + " FY " + startYY + "/" + endYY;
  }

  function fiscalYearLabel(fy) {
    var startYY = String(fy - 1).slice(-2);
    var endYY = String(fy).slice(-2);
    return "FY " + startYY + "/" + endYY;
  }

  function listQuartersFromEarliest() {
    var list = [];
    var now = new Date();
    var curFy = fiscalYearForDate(now);
    var curQ = fiscalQuarterForDate(now);
    var fy = 2023;
    var q = 1;
    while (fy < curFy || (fy === curFy && q <= curQ)) {
      var bounds = getQuarterBounds(fy, q);
      list.push({
        id: "fy" + fy + "-q" + q,
        fy: fy,
        q: q,
        label: quarterLabel(fy, q),
        start: bounds.start,
        end: bounds.end
      });
      q++;
      if (q > 4) {
        q = 1;
        fy++;
      }
    }
    return list;
  }

  function listFiscalYearsFromEarliest() {
    var years = [];
    var now = new Date();
    var curFy = fiscalYearForDate(now);
    for (var fy = 2023; fy <= curFy; fy++) {
      var bounds = getFiscalYearBounds(fy);
      years.push({
        id: "fy" + fy,
        fy: fy,
        label: fiscalYearLabel(fy),
        start: bounds.start,
        end: bounds.end
      });
    }
    return years;
  }

  function getCurrentQuarterOption() {
    var now = new Date();
    var fy = fiscalYearForDate(now);
    var q = fiscalQuarterForDate(now);
    var bounds = getQuarterBounds(fy, q);
    return {
      id: "fy" + fy + "-q" + q,
      fy: fy,
      q: q,
      label: quarterLabel(fy, q),
      start: bounds.start,
      end: bounds.end
    };
  }

  function daysInRange(startStr, endStr) {
    var s = new Date(startStr + "T12:00:00");
    var e = new Date(endStr + "T12:00:00");
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  }

  return {
    fiscalYearForDate: fiscalYearForDate,
    fiscalQuarterForDate: fiscalQuarterForDate,
    getQuarterBounds: getQuarterBounds,
    getFiscalYearBounds: getFiscalYearBounds,
    quarterLabel: quarterLabel,
    fiscalYearLabel: fiscalYearLabel,
    listQuartersFromEarliest: listQuartersFromEarliest,
    listFiscalYearsFromEarliest: listFiscalYearsFromEarliest,
    getCurrentQuarterOption: getCurrentQuarterOption,
    daysInRange: daysInRange,
    toDateStr: toDateStr
  };
})();
