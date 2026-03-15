// ═══════════════════════════════════════════
// משרות עוגן תעסוקתי - לשימוש הבוט
// ═══════════════════════════════════════════

const JOBS = [
  // נהגים
  { id: 'drv_01', title: 'נהג/ת חלוקה עד 12 טון', location: 'אזור המרכז', area: 'מרכז', type: 'נהג', salary: '9,500-11,000 ₪', requirements: 'רישיון C1, ותק שנה', hours: 'מ-05:30', description: 'חלוקת סחורה לרשתות, משאית צמודה, מענק התמדה', link: 'https://ogenemployment.co.il/#jobs', urgent: true },
  { id: 'drv_02', title: 'נהג/ת משאית מעל 15 טון', location: 'אזור הגלבוע', area: 'צפון', type: 'נהג', salary: '11,000-12,000 ₪', requirements: 'רישיון C+E, ניסיון', hours: 'מ-04:00', description: 'הובלת מוצרים קפואים ובשר לרשתות', link: 'https://ogenemployment.co.il/#jobs', urgent: true },
  { id: 'drv_03', title: 'נהג/ת חלוקת מאפים', location: 'רמלה', area: 'מרכז', type: 'נהג', salary: '12,500 ₪', requirements: 'רישיון 12 טון', hours: 'בוקר מוקדם', description: 'חלוקה לבתי מלון ועסקים, משאית צמודה', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'drv_04', title: 'נהג/ת סמיטריילר E', location: 'אריאל', area: 'מרכז', type: 'נהג', salary: '13,500+ ₪', requirements: 'רישיון E, ותק 2 שנים', hours: 'מ-06:00', description: 'נהיגה לאתרים רגישים, בונוס התמדה', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'drv_05', title: 'נהג/ת אוטובוס', location: 'מרכז הארץ', area: 'מרכז', type: 'נהג', salary: 'הסכם קיבוצי + מענק 30,000 ₪', requirements: 'רישיון אוטובוס', hours: 'גמיש', description: 'הסעות תיירות, חיילים ותלמידים', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'drv_06', title: 'נהג/ת חומ"ס (חומרים מסוכנים)', location: 'בית שאן - פתח תקווה', area: 'מרכז', type: 'נהג', salary: '8,000+ ₪ + 186 ₪ יומי', requirements: 'רישיון C + היתר חומ"ס', hours: 'קו קבוע', description: 'קו יומי קבוע, משאית צמודה', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'drv_07', title: 'נהג/ת טריילר לילה + חומ"ס', location: 'באר שבע', area: 'דרום', type: 'נהג', salary: '16,000-18,000 ₪', requirements: 'רישיון E + היתר חומ"ס', hours: 'משמרות לילה', description: 'ללא שישי, שכר גבוה במיוחד', link: 'https://ogenemployment.co.il/#jobs', urgent: true },
  // מחסן ולוגיסטיקה
  { id: 'wh_01', title: 'מלגזן/ית מחסנאי/ת', location: 'שוהם / מודיעין', area: 'מרכז', type: 'מחסן', salary: '9,500-11,000 ₪', requirements: 'רישיון מלגזה', hours: 'משמרות', description: 'הרמת משטחים, ליקוט, פריקה והעמסה, הסעות', link: 'https://ogenemployment.co.il/#jobs', urgent: true },
  { id: 'wh_02', title: 'מחסנאי/ת ממוחשב/ת', location: 'פתח תקווה', area: 'מרכז', type: 'מחסן', salary: '8,700-9,500 ₪', requirements: 'ניסיון + מחשב', hours: 'משמרות מתחלפות', description: 'קליטה, ניפוק, מלאי, ERP', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'wh_03', title: 'מחסנאי/ת טכני/ת', location: 'מודיעין', area: 'מרכז', type: 'מחסן', salary: '9,500 ₪ + בונוס', requirements: 'מחשב, סדר וארגון', hours: 'בוקר', description: 'קליטת סחורה וחלוקה לטכנאים', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'wh_04', title: 'מחסנאי/ת (קירור עמוק)', location: 'כנות', area: 'מרכז', type: 'מחסן', salary: '9,500 + 1,000 בונוס', requirements: 'נכונות לקור', hours: '06:00-16:00', description: 'עבודה בסביבת קירור -25°', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'wh_05', title: 'מפעיל/ת מערכת לוגיסטיקה', location: 'שוהם', area: 'מרכז', type: 'לוגיסטיקה', salary: '10,000-11,000 ₪', requirements: 'מחשב, יתרון SAP', hours: '3 משמרות', description: 'תכנון עבודה ומשימות למלקטים', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  // מחצבות וצמ"ה
  { id: 'equip_01', title: 'מפעיל/ת שופל', location: 'עפולה / מודיעים / זכרון יעקב', area: 'צפון / מרכז', type: 'צמ"ה', salary: '10,000-13,000 ₪', requirements: 'רישיון מכונה ניידת + ניסיון', hours: '3 משמרות', description: 'העמסה בחצבה, עבודה פיזית', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'equip_02', title: 'מכונאי/ת צמ"ה כבד', location: 'ערד / דימונה', area: 'דרום', type: 'צמ"ה', salary: '45-48 ₪ נטו לשעה', requirements: 'ניסיון מכונאות כבדה', hours: 'בוקר', description: 'תיקוני שבר וטיפול מונע לכלים כבדים', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  // מלונאות
  { id: 'hot_01', title: 'עובד/ת משק (ניקיון מלון)', location: 'ירושלים', area: 'ירושלים', type: 'מלונאות', salary: '40-42 ₪ לשעה', requirements: 'עברית בסיסית, 6 ימים', hours: 'בוקר', description: 'ניקיון חדרים ושטחים, ארוחות, פנסיה', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'hot_02', title: 'טבח/ית סלטים', location: 'ירושלים', area: 'ירושלים', type: 'מלונאות', salary: 'ייקבע בראיון', requirements: 'ניסיון כטבח/ית חלבי', hours: '05:00-14:00', description: 'מטבח מלון, ארוחות + הסעה', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'hot_03', title: 'מלצר/ית וברמן/ית', location: 'ירושלים', area: 'ירושלים', type: 'מלונאות', salary: '37 ₪ לשעה', requirements: 'ניידות, 6 ימים', hours: 'בוקר + צהריים', description: 'לובי מלון, ארוחות + הסעה בחזור', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  // שירות לקוחות ומשרד
  { id: 'cs_01', title: 'מתאם/ת לקוחות ומכירות', location: 'פתח תקווה', area: 'מרכז', type: 'שירות לקוחות', salary: '8,000 + 6,000 ₪ בונוס', requirements: 'ניסיון מוקד, אקסל', hours: 'בוקר', description: 'מענה טלפוני, הצעות מחיר, שירות', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'cs_02', title: 'אחראי/ת לקוחות ובק אופיס', location: 'ראש העין', area: 'מרכז', type: 'שירות לקוחות', salary: '10,000-11,000 ₪', requirements: 'ניסיון + אקסל', hours: 'בוקר', description: 'ניהול תיק לקוח מלא, הזמנות', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'cs_03', title: 'נציג/ת גבייה טלפונית', location: 'פתח תקווה', area: 'מרכז', type: 'כספים', salary: 'לפי ניסיון', requirements: 'ניסיון מוקד, יתרון גבייה', hours: 'בוקר', description: 'גביית חובות, שיוכים והתאמות', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  // אלקטרוניקה
  { id: 'elec_01', title: 'מפעיל/ת מכונת SMT / לכה', location: 'פתח תקווה', area: 'מרכז', type: 'אלקטרוניקה', salary: '12,000-13,000 ₪', requirements: 'ללא ניסיון נדרש', hours: 'משמרות 9-12 שעות', description: 'תפעול מכונות ייצור, שכר גבוה', link: 'https://ogenemployment.co.il/#jobs', urgent: true },
  { id: 'elec_02', title: 'מרכיב/ת אלקטרוניקה', location: 'פתח תקווה', area: 'מרכז', type: 'אלקטרוניקה', salary: 'עד 8,500 ₪', requirements: 'עברית בסיסית, ללא ניסיון', hours: 'בוקר', description: 'הרכבת רכיבים, תקני ESD, ללא ניסיון', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  { id: 'elec_03', title: 'מוביל/ת איכות QA', location: 'פתח תקווה', area: 'מרכז', type: 'אלקטרוניקה', salary: 'עד 20,000 ₪', requirements: '5 שנות ניסיון QA, אנגלית', hours: 'בוקר', description: 'בקרת איכות קווי ייצור, ISO/IPC', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
  // ניהול ותפעול
  { id: 'mgmt_01', title: 'מנהל/ת מתקן תפעולי', location: 'פתח תקווה', area: 'מרכז', type: 'ניהול', salary: '14,000-15,000 ₪', requirements: '5 שנות ניסיון ניהולי', hours: 'בוקר', description: 'ניהול צוות 8 עובדים, לוגיסטיקה ובטיחות', link: 'https://ogenemployment.co.il/#jobs', urgent: false },
];

// אזורים ותחומים לסינון
const AREAS = ['מרכז', 'צפון', 'דרום', 'ירושלים', 'שפלה', 'חיפה'];
const TYPES = ['נהג', 'מחסן', 'לוגיסטיקה', 'צמ"ה', 'מלונאות', 'שירות לקוחות', 'כספים', 'אלקטרוניקה', 'ניהול'];

module.exports = { JOBS, AREAS, TYPES };
