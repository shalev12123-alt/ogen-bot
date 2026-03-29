// ═══════════════════════════════════════════════════════════
//  jobs_data.js — טעינת משרות + מנוע חיפוש חכם
// ═══════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

// ── טעינת הקובץ ──────────────────────────────────────────
let JOBS = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, "jobs.js"), "utf-8");
  // הקובץ מתחיל ב const JOBS_DATA = [...];  — נבצע eval בטוח
  const code = raw.replace("const JOBS_DATA =", "JOBS =");
  eval(code);
  console.log(`✅ נטענו ${JOBS.length} משרות מ-jobs.js`);
} catch (err) {
  console.error("❌ שגיאה בטעינת jobs.js:", err.message);
}

// ── אינדקס קטגוריות ──────────────────────────────────────
function buildIndex() {
  const types = {};
  const locations = {};
  for (const j of JOBS) {
    if (!j) continue;
    const t = j.type || "אחר";
    const l = j.location || "לא צוין";
    types[t] = (types[t] || 0) + 1;
    locations[l] = (locations[l] || 0) + 1;
  }
  return { types, locations, total: JOBS.length };
}

// ── חיפוש חכם ────────────────────────────────────────────
function searchJobs({ type, location, keyword, limit = 10 } = {}) {
  let results = JOBS.filter((j) => j && j.title);

  // סינון לפי type (fuzzy)
  if (type) {
    const t = type.trim();
    results = results.filter(
      (j) =>
        (j.type || "").includes(t) ||
        (j.title || "").includes(t) ||
        t.includes(j.type || "___")
    );
  }

  // סינון לפי מיקום (fuzzy)
  if (location) {
    const loc = location.trim();
    // מילון קיצורים
    const aliases = {
      "תל אביב": ["תל אביב", "ת\"א", "תא", "תל-אביב", "תל אביב יפו", "גוש דן", "רמת גן", "בני ברק", "גבעתיים"],
      "מרכז": ["פתח תקווה", "ראש העין", "ראשון לציון", "חולון", "בת ים", "לוד", "רמלה", "שוהם", "מודיעין"],
      "שרון": ["נתניה", "כפר סבא", "רעננה", "הרצליה", "הוד השרון"],
      "ירושלים": ["ירושלים", "בית שמש", "מעלה אדומים"],
      "צפון": ["חיפה", "קריות", "עכו", "נהריה", "כרמיאל", "עפולה", "טבריה", "מעלות"],
      "דרום": ["באר שבע", "אשדוד", "אשקלון", "שדרות", "אופקים", "דימונה", "ערד"],
    };

    // מצא alias
    let expandedLocs = [loc];
    for (const [region, cities] of Object.entries(aliases)) {
      if (loc.includes(region) || region.includes(loc)) {
        expandedLocs = [...expandedLocs, ...cities];
      }
      for (const city of cities) {
        if (loc.includes(city)) {
          expandedLocs = [...expandedLocs, ...cities, region];
        }
      }
    }

    results = results.filter((j) => {
      const jLoc = (j.location || "").toLowerCase();
      return expandedLocs.some(
        (l) => jLoc.includes(l.toLowerCase()) || l.toLowerCase().includes(jLoc)
      );
    });
  }

  // סינון לפי מילת מפתח
  if (keyword) {
    const kw = keyword.trim().toLowerCase();
    results = results.filter(
      (j) =>
        (j.title || "").toLowerCase().includes(kw) ||
        (j.description || "").toLowerCase().includes(kw) ||
        (j.requirements || []).some((r) => r.toLowerCase().includes(kw))
    );
  }

  return results.slice(0, limit);
}

// ── פורמט משרות לשליחה ל-Claude ──────────────────────────
function formatJobsForPrompt(jobs) {
  if (jobs.length === 0) return "לא נמצאו משרות מתאימות";
  return jobs
    .map((j, i) => {
      const salary = (j.chips || []).find((c) => c.class === "chip-salary");
      const time = (j.chips || []).find((c) => c.class === "chip-time");
      const badge = j.badge ? j.badge.text : "";
      return `${i + 1}. ${j.emoji || ""} ${j.title} ${badge}\n   📍 ${j.location} | ${salary ? salary.text : ""} | ${time ? time.text : ""}\n   דרישות: ${(j.requirements || []).join(", ")}\n   ${j.description || ""}`;
    })
    .join("\n\n");
}

// ── סיכום קטגוריות לסיסטם פרומפט ────────────────────────
function getCategorySummary() {
  const idx = buildIndex();
  const topTypes = Object.entries(idx.types)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([t, c]) => `${t} (${c})`)
    .join(", ");
  const topLocs = Object.entries(idx.locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([l, c]) => `${l} (${c})`)
    .join(", ");
  return { topTypes, topLocs, total: idx.total };
}

// ── זיהוי אוטומטי של העדפות מהודעה ──────────────────────
function extractPreferences(text) {
  const prefs = { type: null, location: null, keyword: null };

  // זיהוי תחומים
  const typeKeywords = {
    "נהג": ["נהג", "נהיגה", "נוהג", "משאית", "רכב", "חלוקה", "הובלה"],
    "מחסן": ["מחסן", "מחסנאי", "ליקוט", "אריזה"],
    "מכירות": ["מכירות", "נציג", "מכירה", "סיילס"],
    "הנדסה": ["הנדסה", "מהנדס", "הנדסאי"],
    "ניהול": ["ניהול", "מנהל", "מנהלת", "ראש צוות"],
    "שירות לקוחות": ["שירות לקוחות", "שירות", "מוקד", "call center"],
    "בניין, בינוי ותשתיות": ["בנייה", "בניין", "שלד", "טפסנות", "ברזלן"],
    "אחזקה": ["אחזקה", "תחזוקה", "איש אחזקה"],
    "ייצור ותעשייה": ["ייצור", "תעשייה", "מפעל", "מכונה", "קו ייצור"],
    "חשמל": ["חשמל", "חשמלאי"],
    "לוגיסטיקה": ["לוגיסטיקה", "שילוח", "סחר חוץ"],
    "כספים וכלכלה": ["כספים", "חשבונאות", "חשב", "הנהלת חשבונות", "כלכלה"],
    "משרד": ["משרד", "אדמיניסטרציה", "קלדנית", "מזכירה"],
    "רכש": ["רכש", "קניינות"],
  };

  for (const [type, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      prefs.type = type;
      break;
    }
  }

  // זיהוי מיקומים
  const cities = [
    "תל אביב", "פתח תקווה", "ירושלים", "ראשון לציון", "נתניה",
    "חיפה", "באר שבע", "אשדוד", "אשקלון", "רמת גן", "בני ברק",
    "חולון", "הרצליה", "כפר סבא", "רעננה", "מודיעין", "שוהם",
    "ראש העין", "לוד", "רמלה", "עפולה", "טבריה", "נהריה",
    "מרכז", "צפון", "דרום", "שרון", "שפלה", "גוש דן",
  ];
  for (const city of cities) {
    if (text.includes(city)) {
      prefs.location = city;
      break;
    }
  }

  return prefs;
}

module.exports = {
  JOBS,
  searchJobs,
  formatJobsForPrompt,
  getCategorySummary,
  extractPreferences,
  buildIndex,
};
