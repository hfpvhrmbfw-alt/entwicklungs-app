/* Modell: Stammdaten-IDs, Datentypen, Validierung, Backup-Format, Schema-Version, Migration.
   Keine Abhängigkeiten. Beschriftungen stehen in texts.js, Katalog-Inhalte in catalog.js. */

export const APP_ID = 'entwicklungs-app';
export const SCHEMA_VERSION = 2;

// ---------- Stammdaten (stabile IDs, nie umbenennen, nur ergänzen) ----------
/** Entwicklungsbereiche */
export const AREAS = ['grobmotorik', 'feinmotorik', 'sprache', 'kognition', 'sozial', 'selbststaendigkeit'];
/** Kategorien von Ideen */
export const KINDS = ['spiel', 'bewegung', 'basteln', 'sprache', 'sinne', 'ausflug', 'alltag'];
export const PLACES = ['drinnen', 'draussen', 'beides'];
export const GROUPS = ['eins', 'geschwister', 'gruppe'];
export const THEMES = ['auto', 'light', 'dark'];
/** Sammlungen im Speicher und im Backup */
export const COLLECTIONS = ['children', 'milestones', 'diary', 'measurements', 'photos', 'ideas', 'ideaStates', 'activities', 'plan'];
/** Altere IDs aus Schema-Version 1 */
const LEGACY_AREA = { motorik: 'grobmotorik', denken: 'kognition', alltag: 'selbststaendigkeit' };
const LEGACY_KIND = { uebung: 'bewegung' };

/** Bis zu diesem Alter (in Monaten, chronologisch) gilt bei Frühgeborenen das korrigierte Alter. */
export const CORRECT_UNTIL_MONTHS = 24;

export const DEFAULT_SETTINGS = {
  activeChildId: null, theme: 'auto', weekPlan: false, homeMaterials: [],
  today: { maxMinutes: 0, place: '', onlyHome: false },
};
export const TEXT_MAX = 5000;
export const TITLE_MAX = 120;
export const NAME_MAX = 60;
/** Längste Seite eines gespeicherten Fotos in Pixeln */
export const PHOTO_MAX_PX = 1600;

// ---------- Datum: ganze Tage seit 1970 als Zahl, zeitzonenfest ----------
export const DAY_MS = 864e5;
/** @param {string} s 'YYYY-MM-DD' @returns {number} Tagnummer */
export const toNum = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY_MS; };
/** @param {number} n Tagnummer @returns {string} 'YYYY-MM-DD' */
export const toStr = n => new Date(n * DAY_MS).toISOString().slice(0, 10);
/** Gültiges Datum im Format YYYY-MM-DD? */
export function isDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const n = toNum(s);
  return !isNaN(n) && toStr(n) === s; // fängt auch 2026-02-30 ab
}

// ---------- Typen ----------
/**
 * @typedef {{id: string, name: string, birthDate: string, dueDate: string|null}} Child
 *   dueDate: errechneter Geburtstermin, nur bei Frühgeburt (sonst null)
 * @typedef {{id: string, childId: string, catalogId: string|null, title: string, date: string, note: string, photoIds: string[]}} Milestone
 * @typedef {{id: string, childId: string, date: string, text: string, photoIds: string[]}} DiaryEntry
 * @typedef {{id: string, childId: string, date: string, heightCm: number|null, weightKg: number|null}} Measurement
 * @typedef {{id: string, childId: string, date: string, mime: string, width: number, height: number}} PhotoMeta
 * @typedef {{id: string, title: string, kind: string, area: string, fromMonth: number, toMonth: number,
 *   minutes: number, place: string, prep: number, materials: string[], group: string[], material: string,
 *   steps: string[], learns: string, why: string, principle: string, easier: string, harder: string, safety: string, text: string}} Idea
 *   Katalog-Ideen nutzen alle Felder; eigene Ideen mindestens Titel, Art, Bereich, Alter und text.
 * @typedef {{id: string, childId: string, ideaId: string, favorite: boolean}} IdeaState   gemerkte Ideen
 * @typedef {{id: string, childId: string, ideaId: string, date: string, note: string, photoIds: string[]}} Activity   gemachte Idee
 * @typedef {{id: string, childId: string, ideaId: string, date: string}} PlanItem   eingeplante Idee
 * @typedef {{activeChildId: string|null, theme: string, weekPlan: boolean, homeMaterials: string[],
 *   today: {maxMinutes: number, place: string, onlyHome: boolean}}} Settings
 * @typedef {{children: Child[], milestones: Milestone[], diary: DiaryEntry[], measurements: Measurement[], photos: PhotoMeta[],
 *   ideas: Idea[], ideaStates: IdeaState[], activities: Activity[], plan: PlanItem[]}} AppData
 */

/** @returns {AppData} */
export const emptyData = () => Object.fromEntries(COLLECTIONS.map(c => [c, []]));

/** Schlüssel für den Merk-Zustand einer Idee bei einem Kind */
export const ideaStateId = (childId, ideaId) => `${childId}:${ideaId}`;

// ---------- Validierung ----------
const isId = v => typeof v === 'string' && /^[A-Za-z0-9_:-]{1,80}$/.test(v);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v, lo, hi) => { const n = Math.round(Number(v)); return isNaN(n) ? null : Math.min(hi, Math.max(lo, n)); };
function measure(v, lo, hi, digits) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
  if (!isFinite(n) || n < lo || n > hi) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
const ids = v => (Array.isArray(v) ? [...new Set(v.filter(isId))] : []);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

/**
 * Errechneter Termin nur, wenn er nach der Geburt und höchstens 20 Wochen später liegt.
 * @returns {Child|null}
 */
export function sanitizeChild(r) {
  if (!r || !isId(r.id) || !isDate(r.birthDate)) return null;
  const name = str(r.name, NAME_MAX);
  if (!name) return null;
  const gap = isDate(r.dueDate) ? toNum(r.dueDate) - toNum(r.birthDate) : 0;
  return { id: r.id, name, birthDate: r.birthDate, dueDate: gap > 0 && gap <= 140 ? r.dueDate : null };
}

/** @returns {Milestone|null} */
export function sanitizeMilestone(r) {
  if (!r || !isId(r.id) || !isId(r.childId) || !isDate(r.date)) return null;
  const catalogId = isId(r.catalogId) ? r.catalogId : null;
  const title = catalogId ? '' : str(r.title, TITLE_MAX);
  if (!catalogId && !title) return null;
  return { id: r.id, childId: r.childId, catalogId, title, date: r.date, note: text(r.note, TEXT_MAX), photoIds: ids(r.photoIds) };
}

/** @returns {DiaryEntry|null} */
export function sanitizeDiary(r) {
  if (!r || !isId(r.id) || !isId(r.childId) || !isDate(r.date)) return null;
  const t = text(r.text, TEXT_MAX), photoIds = ids(r.photoIds);
  if (!t.trim() && !photoIds.length) return null;
  return { id: r.id, childId: r.childId, date: r.date, text: t, photoIds };
}

/** Größe 30–200 cm (eine Nachkommastelle), Gewicht 0,5–80 kg (zwei Nachkommastellen). @returns {Measurement|null} */
export function sanitizeMeasurement(r) {
  if (!r || !isId(r.id) || !isId(r.childId) || !isDate(r.date)) return null;
  const heightCm = measure(r.heightCm, 30, 200, 1), weightKg = measure(r.weightKg, 0.5, 80, 2);
  if (heightCm === null && weightKg === null) return null;
  return { id: r.id, childId: r.childId, date: r.date, heightCm, weightKg };
}

/** @returns {PhotoMeta|null} */
export function sanitizePhoto(r) {
  if (!r || !isId(r.id) || !isId(r.childId) || !isDate(r.date)) return null;
  const mime = ['image/jpeg', 'image/png', 'image/webp'].includes(r.mime) ? r.mime : 'image/jpeg';
  return { id: r.id, childId: r.childId, date: r.date, mime, width: int(r.width, 0, 20000) || 0, height: int(r.height, 0, 20000) || 0 };
}

/** @returns {Idea|null} */
export function sanitizeIdea(r) {
  if (!r || !isId(r.id)) return null;
  const title = str(r.title, TITLE_MAX);
  if (!title) return null;
  let from = int(r.fromMonth, 0, 216), to = int(r.toMonth, 0, 216);
  if (from === null) from = 0;
  if (to === null || to < from) to = Math.max(from, 72);
  const lines = v => (Array.isArray(v) ? v.map(s => str(s, 600)).filter(Boolean).slice(0, 12) : []);
  return {
    id: r.id, title,
    kind: oneOf(LEGACY_KIND[r.kind] || r.kind, KINDS, 'spiel'),
    area: oneOf(LEGACY_AREA[r.area] || r.area, AREAS, 'kognition'),
    fromMonth: from, toMonth: to,
    minutes: int(r.minutes, 0, 240) || 0,
    place: oneOf(r.place, PLACES, 'beides'),
    prep: int(r.prep, 0, 2) || 0,
    materials: Array.isArray(r.materials) ? [...new Set(r.materials.filter(m => typeof m === 'string' && /^[a-z]{1,30}$/.test(m)))] : [],
    group: Array.isArray(r.group) ? GROUPS.filter(g => r.group.includes(g)) : [],
    material: str(r.material, 300), steps: lines(r.steps),
    learns: str(r.learns, 600), why: str(r.why, 600), principle: str(r.principle, 300),
    easier: str(r.easier, 600), harder: str(r.harder, 600), safety: str(r.safety, 600),
    text: text(r.text, TEXT_MAX),
  };
}

/** @returns {IdeaState|null} Nur gemerkte Ideen werden gespeichert. */
export function sanitizeIdeaState(r) {
  if (!r || !isId(r.childId) || !isId(r.ideaId) || r.favorite !== true) return null;
  return { id: ideaStateId(r.childId, r.ideaId), childId: r.childId, ideaId: r.ideaId, favorite: true };
}

/** @returns {Activity|null} */
export function sanitizeActivity(r) {
  if (!r || !isId(r.id) || !isId(r.childId) || !isId(r.ideaId) || !isDate(r.date)) return null;
  return { id: r.id, childId: r.childId, ideaId: r.ideaId, date: r.date, note: text(r.note, TEXT_MAX), photoIds: ids(r.photoIds) };
}

/** @returns {PlanItem|null} */
export function sanitizePlan(r) {
  if (!r || !isId(r.id) || !isId(r.childId) || !isId(r.ideaId) || !isDate(r.date)) return null;
  return { id: r.id, childId: r.childId, ideaId: r.ideaId, date: r.date };
}

/** @returns {Settings} */
export function sanitizeSettings(s) {
  s = s || {};
  const t = s.today || {};
  return {
    activeChildId: isId(s.activeChildId) ? s.activeChildId : null,
    theme: oneOf(s.theme, THEMES, 'auto'),
    weekPlan: s.weekPlan === true,
    homeMaterials: Array.isArray(s.homeMaterials) ? [...new Set(s.homeMaterials.filter(m => typeof m === 'string' && /^[a-z]{1,30}$/.test(m)))] : [],
    today: { maxMinutes: [0, 10, 20].includes(t.maxMinutes) ? t.maxMinutes : 0, place: oneOf(t.place, ['', 'drinnen', 'draussen'], ''), onlyHome: t.onlyHome === true },
  };
}

export const SANITIZE = {
  children: sanitizeChild, milestones: sanitizeMilestone, diary: sanitizeDiary, measurements: sanitizeMeasurement,
  photos: sanitizePhoto, ideas: sanitizeIdea, ideaStates: sanitizeIdeaState, activities: sanitizeActivity, plan: sanitizePlan,
};

/**
 * Bringt Rohdaten aus Version 1 auf Version 2 (auch für Daten, die schon im Gerät liegen):
 * Gemachte Ideen wandern aus ideaStates (doneDate) in activities. Läuft mehrfach ohne Schaden.
 */
export function upgradeRaw(raw) {
  const out = { ...raw };
  const acts = Array.isArray(raw && raw.activities) ? raw.activities.slice() : [];
  const have = new Set(acts.map(a => `${a.childId}|${a.ideaId}|${a.date}`));
  for (const s of (Array.isArray(raw && raw.ideaStates) ? raw.ideaStates : [])) {
    if (s && isDate(s.doneDate) && !have.has(`${s.childId}|${s.ideaId}|${s.doneDate}`)) {
      acts.push({ id: `act-${s.childId}-${s.ideaId}-${s.doneDate}`.slice(0, 80), childId: s.childId, ideaId: s.ideaId, date: s.doneDate, note: '', photoIds: [] });
    }
  }
  out.activities = acts;
  return out;
}

/**
 * Prüft alle Sammlungen und entfernt Verweise ins Leere.
 * @param {object} raw @param {Set<string>} catalogIdeaIds IDs der Katalog-Ideen
 * @returns {AppData}
 */
export function sanitizeData(raw, catalogIdeaIds) {
  raw = upgradeRaw(raw || {});
  const d = emptyData();
  for (const c of COLLECTIONS) {
    const seen = new Set();
    for (const r of (Array.isArray(raw[c]) ? raw[c] : [])) {
      const v = SANITIZE[c](r);
      if (v && !seen.has(v.id)) { seen.add(v.id); d[c].push(v); }
    }
  }
  const kids = new Set(d.children.map(c => c.id));
  for (const c of ['milestones', 'diary', 'measurements', 'photos', 'ideaStates', 'activities', 'plan']) d[c] = d[c].filter(r => kids.has(r.childId));
  const pics = new Set(d.photos.map(p => p.id));
  for (const c of ['milestones', 'diary', 'activities']) d[c].forEach(r => { r.photoIds = r.photoIds.filter(id => pics.has(id)); });
  d.diary = d.diary.filter(r => r.text.trim() || r.photoIds.length);
  const ideaIds = new Set([...catalogIdeaIds, ...d.ideas.map(i => i.id)]);
  for (const c of ['ideaStates', 'activities', 'plan']) d[c] = d[c].filter(s => ideaIds.has(s.ideaId));
  return d;
}

// ---------- Backup ----------
/** Dateiname eines Fotos im Backup */
export const photoFile = p => `fotos/${p.id}.${p.mime === 'image/png' ? 'png' : p.mime === 'image/webp' ? 'webp' : 'jpg'}`;

/**
 * Baut den Inhalt von daten.json. Fotos erscheinen als Metadaten mit Dateiverweis.
 * @param {AppData} data @param {Settings} settings @param {string} exportedAt ISO-Zeitstempel (wird übergeben)
 */
export function buildBackup(data, settings, exportedAt) {
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const out = { app: APP_ID, version: SCHEMA_VERSION, exportedAt, settings };
  for (const c of COLLECTIONS) out[c] = data[c].slice();
  for (const c of ['milestones', 'diary', 'measurements', 'activities', 'plan']) out[c].sort(byDate);
  out.photos = data.photos.slice().sort(byDate).map(p => ({ ...p, file: photoFile(p) }));
  return out;
}

/**
 * Liest daten.json (bereits geparst). Ältere Versionen werden migriert.
 * @param {Set<string>} catalogIdeaIds
 * @returns {{ok: true, data: AppData, settings: Settings|null, photoFiles: Object<string, string>} | {ok: false, error: 'not_backup'|'newer_version'|'no_children'}}
 */
export function parseBackup(raw, catalogIdeaIds) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.app !== APP_ID) return { ok: false, error: 'not_backup' };
  if (Number(raw.version) > SCHEMA_VERSION) return { ok: false, error: 'newer_version' };
  const m = migrate(raw);
  const data = sanitizeData(m, catalogIdeaIds);
  if (!data.children.length) return { ok: false, error: 'no_children' };
  const photoFiles = {};
  for (const p of (Array.isArray(m.photos) ? m.photos : [])) {
    if (p && typeof p.id === 'string' && typeof p.file === 'string') photoFiles[p.id] = p.file;
  }
  return { ok: true, data, settings: m.settings ? sanitizeSettings(m.settings) : null, photoFiles };
}

/** Hebt ältere Backups auf die aktuelle Schema-Version. v1 → v2: siehe upgradeRaw (läuft in sanitizeData). */
export function migrate(raw) {
  return { ...raw, version: SCHEMA_VERSION };
}
