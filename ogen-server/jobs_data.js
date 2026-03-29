// ═══════════════════════════════════════════════════════════
//  jobs_data.js — טעינת משרות + מנוע חיפוש חכם
// ═══════════════════════════════════════════════════════════

var fs = require("fs");
var path = require("path");

// ── טעינת הקובץ ──────────────────────────────────────────
var JOBS = [];
try {
  var raw = fs.readFileSync(path.join(__dirname, "jobs.js"), "utf-8");
  var code = raw.replace("const JOBS_DATA =", "JOBS =");
  eval(code);
  // נקה ערכים ריקים
  JOBS = JOBS.filter(function (j) {
    return j != null && typeof j === "object" && j.title;
  });
  console.log("✅ נטענו " + JOBS.length + " משרות מ-jobs.js");
} catch (err) {
  console.error("❌ שגיאה בטעינת jobs.js:", err.message);
  JOBS = [];
}

// ── אינדקס קטגוריות ──────────────────────────────────────
function buildIndex() {
  var types = {};
  var locations = {};
  for (var i = 0; i < JOBS.length; i++) {
    var j = JOBS[i];
    if (!j) continue;
    var t = j.type || "אחר";
    var l = j.location || "לא צוין";
    types[t] = (types[t] || 0) + 1;
    locations[l] = (locations[l] || 0) + 1;
  }
  return { types: types, locations: locations, total: JOBS.length };
}

// ── חיפוש חכם ────────────────────────────────────────────
function searchJobs(opts) {
  opts = opts || {};
  var type = opts.type || null;
  var location = opts.location || null;
  var keyword = opts.keyword || null;
  var limit = opts.limit || 10;

  var results = [];
  for (var i = 0; i < JOBS.length; i++) {
    if (JOBS[i] && JOBS[i].title) results.push(JOBS[i]);
  }

  if (type) {
    var t = type.trim();
    results = results.filter(function (j) {
      return (
        (j.type || "").indexOf(t) !== -1 ||
        (j.title || "").indexOf(t) !== -1 ||
        t.indexOf(j.type || "___") !== -1
      );
    });
  }

  if (location) {
    var loc = location.trim().toLowerCase();
    var aliases = {
      "תל אביב": ["תל אביב", "תל-אביב", "תל אביב יפו", "גוש דן", "רמת גן", "בני ברק", "גבעתיים"],
      "מרכז": ["פתח תקווה", "ראש העין", "ראשון לציון", "חולון", "בת ים", "לוד", "רמלה", "שוהם", "מודיעין"],
      "שרון": ["נתניה", "כפר סבא", "רעננה", "הרצליה", "הוד השרון"],
      "ירושלים": ["ירושלים", "בית שמש", "מעלה אדומים"],
      "צפון": ["חיפה", "קריות", "עכו", "נהריה", "כרמיאל", "עפולה", "טבריה", "מעלות"],
      "דרום": ["באר שבע", "אשדוד", "אשקלון", "שדרות", "אופקים", "דימונה", "ערד"]
    };

    var expandedLocs = [loc];
    var regionKeys = Object.keys(aliases);
    for (var r = 0; r < regionKeys.length; r++) {
      var region = regionKeys[r];
      var cities = aliases[region];
      if (loc.indexOf(region) !== -1 || region.indexOf(loc) !== -1) {
        expandedLocs = expandedLocs.concat(cities);
      }
      for (var c = 0; c < cities.length; c++) {
        if (loc.indexOf(cities[c]) !== -1) {
          expandedLocs = expandedLocs.concat(cities);
          expandedLocs.push(region);
          break;
        }
      }
    }

    results = results.filter(function (j) {
      var jLoc = (j.location || "").toLowerCase();
      for (var k = 0; k < expandedLocs.length; k++) {
        var el = expandedLocs[k].toLowerCase();
        if (jLoc.indexOf(el) !== -1 || el.indexOf(jLoc) !== -1) return true;
      }
      return false;
    });
  }

  if (keyword) {
    var kw = keyword.trim().toLowerCase();
    results = results.filter(function (j) {
      if ((j.title || "").toLowerCase().indexOf(kw) !== -1) return true;
      if ((j.description || "").toLowerCase().indexOf(kw) !== -1) return true;
      var reqs = j.requirements || [];
      if (typeof reqs === "string") reqs = [reqs];
      for (var q = 0; q < reqs.length; q++) {
        if ((reqs[q] || "").toLowerCase().indexOf(kw) !== -1) return true;
      }
      return false;
    });
  }

  return results.slice(0, limit);
}

// ── פורמט משרות לשליחה ל-Claude ──────────────────────────
function formatJobsForPrompt(jobs) {
  if (!jobs || jobs.length === 0) return "לא נמצאו משרות מתאימות";
  var lines = [];
  for (var i = 0; i < jobs.length; i++) {
    var j = jobs[i];
    if (!j) continue;
    var salary = "";
    var time = "";
    var chips = j.chips || [];
    for (var c = 0; c < chips.length; c++) {
      if (chips[c] && chips[c].class === "chip-salary") salary = chips[c].text || "";
      if (chips[c] && chips[c].class === "chip-time") time = chips[c].text || "";
    }
    var badge = (j.badge && j.badge.text) ? j.badge.text : "";
    var reqs = j.requirements || [];
    if (typeof reqs === "string") reqs = [reqs];
    lines.push(
      (i + 1) + ". " + (j.emoji || "") + " " + j.title + " " + badge +
      "\n   📍 " + (j.location || "") + " | " + salary + " | " + time +
      "\n   דרישות: " + reqs.join(", ") +
      "\n   " + (j.description || "")
    );
  }
  return lines.join("\n\n");
}

// ── סיכום קטגוריות ───────────────────────────────────────
function getCategorySummary() {
  try {
    var idx = buildIndex();
    var typeEntries = Object.keys(idx.types).map(function (k) {
      return [k, idx.types[k]];
    });
    typeEntries.sort(function (a, b) { return b[1] - a[1]; });
    var topTypes = typeEntries.slice(0, 20).map(function (e) {
      return e[0] + " (" + e[1] + ")";
    }).join(", ");

    var locEntries = Object.keys(idx.locations).map(function (k) {
      return [k, idx.locations[k]];
    });
    locEntries.sort(function (a, b) { return b[1] - a[1]; });
    var topLocs = locEntries.slice(0, 15).map(function (e) {
      return e[0] + " (" + e[1] + ")";
    }).join(", ");

    return { topTypes: topTypes, topLocs: topLocs, total: idx.total };
  } catch (err) {
    console.error("getCategorySummary error:", err.message);
    return { topTypes: "לא זמין", topLocs: "לא זמין", total: JOBS.length };
  }
}

// ── זיהוי העדפות מהודעה ─────────────────────────────────
function extractPreferences(text) {
  var prefs = { type: null, location: null, keyword: null };
  if (!text) return prefs;

  var typeKeywords = {
    "נהג": ["נהג", "נהיגה", "נוהג", "משאית", "רכב", "חלוקה", "הובלה"],
    "מחסן": ["מחסן", "מחסנאי", "ליקוט", "אריזה"],
    "מכירות": ["מכירות", "נציג", "מכירה", "סיילס"],
    "הנדסה": ["הנדסה", "מהנדס", "הנדסאי"],
    "ניהול": ["ניהול", "מנהל", "מנהלת", "ראש צוות"],
    "שירות לקוחות": ["שירות לקוחות", "שירות", "מוקד"],
    "אחזקה": ["אחזקה", "תחזוקה", "איש אחזקה"],
    "ייצור ותעשייה": ["ייצור", "תעשייה", "מפעל", "מכונה"],
    "חשמל": ["חשמל", "חשמלאי"],
    "לוגיסטיקה": ["לוגיסטיקה", "שילוח"],
    "כספים וכלכלה": ["כספים", "חשבונאות", "הנהלת חשבונות"],
    "משרד": ["משרד", "אדמיניסטרציה", "מזכירה"],
    "רכש": ["רכש", "קניינות"]
  };

  var typeKeys = Object.keys(typeKeywords);
  for (var i = 0; i < typeKeys.length; i++) {
    var keywords = typeKeywords[typeKeys[i]];
    for (var k = 0; k < keywords.length; k++) {
      if (text.indexOf(keywords[k]) !== -1) {
        prefs.type = typeKeys[i];
        break;
      }
    }
    if (prefs.type) break;
  }

  var cities = [
    "תל אביב", "פתח תקווה", "ירושלים", "ראשון לציון", "נתניה",
    "חיפה", "באר שבע", "אשדוד", "אשקלון", "רמת גן", "בני ברק",
    "חולון", "הרצליה", "כפר סבא", "רעננה", "מודיעין", "שוהם",
    "ראש העין", "לוד", "רמלה", "עפולה", "טבריה", "נהריה",
    "מרכז", "צפון", "דרום", "שרון", "שפלה", "גוש דן"
  ];
  for (var c = 0; c < cities.length; c++) {
    if (text.indexOf(cities[c]) !== -1) {
      prefs.location = cities[c];
      break;
    }
  }

  return prefs;
}

module.exports = {
  JOBS: JOBS,
  searchJobs: searchJobs,
  formatJobsForPrompt: formatJobsForPrompt,
  getCategorySummary: getCategorySummary,
  extractPreferences: extractPreferences,
  buildIndex: buildIndex
};
