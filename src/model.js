/* Modell: Stammdaten-IDs, Datentypen, Validierung, Backup-Format, Schema-Version.
   Keine Abhängigkeiten. Beschriftungen stehen in texts.js, Katalog-Inhalte in catalog.js. */

export const APP_ID = 'entwicklungs-app';
export const SCHEMA_VERSION = 1;

// ---------- Stammdaten (stabile IDs, nie umbenennen, nur ergänzen) ----------
/** Entwicklungsbereiche */
export const AREAS = ['motorik', 'sprache', 'sozial', 'denken', 'alltag'];
/** Arten von Ideen */
export const KINDS = ['spiel', 'basteln', 'uebung'];
export const THEMES = ['auto', 'light', 'dark'];
/** Sammlungen im Speicher und im Backup */
export const COLLECTIONS = ['children', 'milestones', 'diary', 'measurements', 'photos', 'ideas', 'ideaStates'];

export const DEFAULT_SETTINGS = { activeChildId: null, theme: 'auto' };
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
 * @typedef {{id: string, name: string, birthDate: string}} Child
 * @typedef {{id: string, childId: string, catalogId: string|null, title: string, date: string, note: string, photoIds: string[]}} Milestone
 *   catalogId gesetzt → Meilenstein aus dem Katalog, title leer; sonst eigener Meilenstein mit title
 * @typedef {{id: string, childId: string, date: string, text: string, photoIds: string[]}} DiaryEntry
 * @typedef {{id: string, childId: string, date: string, heightCm: number|null, weightKg: number|null}} Measurement
 * @typedef {{id: string, childId: string, date: string, mime: string, width: number, height: number}} PhotoMeta
 *   Die Bilddaten selbst liegen im Speicher bzw. im Backup als Datei fotos/<id>.jpg
 * @typedef {{id: string, title: string, kind: string, area: string, fromMonth: number, toMonth: number, material: string, text: string}} Idea
 * @typedef {{id: string, childId: string, ideaId: string, favorite: boolean, doneDate: string|null}} IdeaState
 * @typedef {{activeChildId: string|null, theme: string}} Settings
 * @typedef {{children: Child[], milestones: Milestone[], diary: DiaryEntry[], measurements: Measurement[], photos: PhotoMeta[], ideas: Idea[], ideaStates: IdeaState[]}} AppData
 */

/** @returns {AppData} */
export const emptyData = () => ({ children: [], milestones: [], diary: [], measurements: [], photos: [], ideas: [], ideaStates: [] });

/** Schlüssel für den Zustand einer Idee bei einem Kind */
export const ideaStateId = (childId, ideaId) => `${childId}:${ideaId}`;

// ---------- Validierung ----------
const isId = v => typeof v === 'string' && /^[A-Za-z0-9_:-]{1,80}$/.test(v);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v, lo, hi) => { const n = Math.round(Number(v)); return isNaN(n) ? null : Math.min(hi, Math.max(lo, n)); };
/** Zahl im Bereich mit fester Anzahl Nachkommastellen, sonst null */
function measure(v, lo, hi, digits) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
  if (!isFinite(n) || n < lo || n > hi) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
const ids = v => (Array.isArray(v) ? [...new Set(v.filter(isId))] : []);

/** @returns {Child|null} */
export function sanitizeChild(r) {
  if (!r || !isId(r.id) || !isDate(r.birthDate)) return null;
  const name = str(r.name, NAME_MAX);
  return name ? { id: r.id, name, birthDate: r.birthDate } : null;
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

/** Größe 30–200 cm (eine Nachkommastelle), Gewicht 1–80 kg (zwei Nachkommastellen). @returns {Measurement|null} */
export function sanitizeMeasurement(r) {
  if (!r || !isId(r.id) || !isId(r.childId) || !isDate(r.date)) return null;
  const heightCm = measure(r.heightCm, 30, 200, 1), weightKg = measure(r.weightKg, 1, 80, 2);
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
  return {
    id: r.id, title,
    kind: KINDS.includes(r.kind) ? r.kind : 'spiel',
    area: AREAS.includes(r.area) ? r.area : 'denken',
    fromMonth: from, toMonth: to,
    material: str(r.material, 300), text: text(r.text, TEXT_MAX),
  };
}

/** @returns {IdeaState|null} */
export function sanitizeIdeaState(r) {
  if (!r || !isId(r.childId) || !isId(r.ideaId)) return null;
  const doneDate = isDate(r.doneDate) ? r.doneDate : null;
  const favorite = r.favorite === true;
  if (!favorite && !doneDate) return null; // leerer Zustand wird nicht gespeichert
  return { id: ideaStateId(r.childId, r.ideaId), childId: r.childId, ideaId: r.ideaId, favorite, doneDate };
}

/** @returns {Settings} */
export function sanitizeSettings(s) {
  s = s || {};
  return { activeChildId: isId(s.activeChildId) ? s.activeChildId : null, theme: THEMES.includes(s.theme) ? s.theme : 'auto' };
}

export const SANITIZE = {
  children: sanitizeChild, milestones: sanitizeMilestone, diary: sanitizeDiary,
  measurements: sanitizeMeasurement, photos: sanitizePhoto, ideas: sanitizeIdea, ideaStates: sanitizeIdeaState,
};

/**
 * Prüft alle Sammlungen und entfernt Verweise ins Leere
 * (Einträge ohne bekanntes Kind, Foto-IDs ohne Foto, Ideen-Zustände ohne Idee).
 * @param {object} raw @param {Set<string>} catalogIdeaIds IDs der Katalog-Ideen
 * @returns {AppData}
 */
export function sanitizeData(raw, catalogIdeaIds) {
  const d = emptyData();
  for (const c of COLLECTIONS) {
    const seen = new Set();
    for (const r of (raw && Array.isArray(raw[c]) ? raw[c] : [])) {
      const v = SANITIZE[c](r);
      if (v && !seen.has(v.id)) { seen.add(v.id); d[c].push(v); }
    }
  }
  const kids = new Set(d.children.map(c => c.id));
  for (const c of ['milestones', 'diary', 'measurements', 'photos', 'ideaStates']) d[c] = d[c].filter(r => kids.has(r.childId));
  const pics = new Set(d.photos.map(p => p.id));
  for (const c of ['milestones', 'diary']) d[c].forEach(r => { r.photoIds = r.photoIds.filter(id => pics.has(id)); });
  d.diary = d.diary.filter(r => r.text.trim() || r.photoIds.length);
  const ideaIds = new Set([...catalogIdeaIds, ...d.ideas.map(i => i.id)]);
  d.ideaStates = d.ideaStates.filter(s => ideaIds.has(s.ideaId));
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
  return {
    app: APP_ID, version: SCHEMA_VERSION, exportedAt, settings,
    children: data.children.slice(),
    milestones: data.milestones.slice().sort(byDate),
    diary: data.diary.slice().sort(byDate),
    measurements: data.measurements.slice().sort(byDate),
    photos: data.photos.slice().sort(byDate).map(p => ({ ...p, file: photoFile(p) })),
    ideas: data.ideas.slice(),
    ideaStates: data.ideaStates.slice(),
  };
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

/** Hebt ältere Backups auf die aktuelle Schema-Version. Bisher gibt es nur Version 1. */
export function migrate(raw) {
  return raw;
}
