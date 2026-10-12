/* Logik: reine Funktionen. Daten rein, Daten raus.
   Kein DOM, kein Speicher, keine aktuelle Zeit, kein Zufall: "heute" kommt als Tagnummer herein. */

import { toNum, toStr, AREAS, CORRECT_UNTIL_MONTHS } from './model.js';

const byDateAsc = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

// ---------- Alter ----------
/**
 * Alter an einem Tag, kalendergenau (Monate wie im Kalender, Rest in Tagen).
 * @param {string} birthDate 'YYYY-MM-DD' @param {number} n Tagnummer
 * @returns {{totalDays: number, totalMonths: number, years: number, months: number, days: number}|null} null vor dem Datum
 */
export function ageAt(birthDate, n) {
  const b = toNum(birthDate);
  if (n < b) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const d = new Date(n * 864e5);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  let months = (y - by) * 12 + (m - bm);
  if (day < bd) months -= 1;
  const anchorY = by + Math.floor((bm - 1 + months) / 12), anchorM = ((bm - 1 + months) % 12) + 1;
  const lastDay = new Date(Date.UTC(anchorY, anchorM, 0)).getUTCDate();
  const anchor = Date.UTC(anchorY, anchorM - 1, Math.min(bd, lastDay)) / 864e5;
  return { totalDays: n - b, totalMonths: months, years: Math.floor(months / 12), months: months % 12, days: n - anchor };
}

/** Ganze Lebensmonate an einem Tag (vor der Geburt 0). */
export const ageMonths = (birthDate, n) => { const a = ageAt(birthDate, n); return a ? a.totalMonths : 0; };

/**
 * Alter, mit dem die App rechnet. Bei Frühgeborenen (errechneter Termin angegeben) bis zum
 * 24. Lebensmonat das korrigierte Alter, also ab dem errechneten Termin gezählt.
 * @param {import('./model.js').Child} child @param {number} n Tagnummer
 * @returns {{months: number, chrono: ReturnType<typeof ageAt>, corrected: ReturnType<typeof ageAt>, isCorrected: boolean, weeksEarly: number}}
 */
export function effectiveAge(child, n) {
  const chrono = ageAt(child.birthDate, n);
  const weeksEarly = child.dueDate ? Math.round((toNum(child.dueDate) - toNum(child.birthDate)) / 7) : 0;
  const isCorrected = !!(child.dueDate && chrono && chrono.totalMonths < CORRECT_UNTIL_MONTHS);
  const corrected = isCorrected ? ageAt(child.dueDate, n) : null;
  const months = isCorrected ? (corrected ? corrected.totalMonths : 0) : (chrono ? chrono.totalMonths : 0);
  return { months, chrono, corrected, isCorrected, weeksEarly };
}

// ---------- Meilensteine ----------
/**
 * Meilenstein-Übersicht je Bereich. Status ohne Wertung:
 * 'done' eingetragen · 'now' im typischen Zeitfenster (oder ab nächstem Monat) · 'later' kommt später · 'open' Fenster vorbei, nicht eingetragen
 * @returns {{areas: Array<{area: string, items: Array<{id: string, fromMonth: number, toMonth: number, status: string, milestoneId: string|null, date: string|null}>}>, custom: string[]}}
 */
export function milestoneOverview(catalog, achieved, months) {
  const byCat = new Map(achieved.filter(m => m.catalogId).map(m => [m.catalogId, m]));
  const known = new Set(catalog.map(c => c.id));
  const custom = achieved.filter(m => !m.catalogId || !known.has(m.catalogId))
    .sort((a, b) => byDateAsc(a, b) || (a.id < b.id ? -1 : 1)).map(m => m.id);
  const areas = AREAS.map(area => ({
    area,
    items: catalog.filter(c => c.area === area).map(c => {
      const m = byCat.get(c.id);
      const status = m ? 'done' : months > c.toMonth ? 'open' : months + 1 >= c.fromMonth ? 'now' : 'later';
      return { id: c.id, fromMonth: c.fromMonth, toMonth: c.toMonth, status, milestoneId: m ? m.id : null, date: m ? m.date : null };
    }),
  }));
  return { areas, custom };
}

/** Meilensteine, die gerade im Zeitfenster liegen oder bald beginnen, noch nicht eingetragen (früheste zuerst). */
export function upcomingMilestones(catalog, achieved, months, limit = 4, ahead = 1) {
  const done = new Set(achieved.map(m => m.catalogId).filter(Boolean));
  return catalog.filter(c => !done.has(c.id) && c.toMonth >= months && c.fromMonth <= months + ahead)
    .sort((a, b) => a.fromMonth - b.fromMonth || a.toMonth - b.toMonth)
    .slice(0, limit).map(c => c.id);
}

// ---------- Ideen ----------
/**
 * Passt eine Idee zu den Filtern?
 * @param {{kind?: string, area?: string, place?: string, maxMinutes?: number, onlyHome?: boolean}} f
 * @param {Set<string>} home Material, das zu Hause ist
 */
export function ideaMatches(idea, f, home) {
  if (f.kind && idea.kind !== f.kind) return false;
  if (f.area && idea.area !== f.area) return false;
  if (f.place && idea.place !== 'beides' && idea.place !== f.place) return false;
  if (f.maxMinutes && idea.minutes && idea.minutes > f.maxMinutes) return false;
  if (f.onlyHome && !idea.materials.every(m => home.has(m))) return false;
  return true;
}

/** Letztes Datum, an dem jede Idee gemacht wurde (für ein Kind). @returns {Map<string, string>} */
export function lastDoneMap(activities, childId) {
  const m = new Map();
  for (const a of activities) if (a.childId === childId && (!m.has(a.ideaId) || a.date > m.get(a.ideaId))) m.set(a.ideaId, a.date);
  return m;
}

/**
 * Ideen für ein Kind filtern und sortieren: Favoriten zuerst, dann noch nie gemacht, dann nach Altersbeginn und Titel.
 * @param {{favorites: Set<string>, lastDone: Map<string, string>, home: Set<string>}} ctx
 * @param {{kind?: string, area?: string, place?: string, maxMinutes?: number, onlyHome?: boolean, favoritesOnly?: boolean, hideDone?: boolean, allAges?: boolean}} f
 */
export function ideasFor(ideas, ctx, months, f = {}) {
  return ideas.map(idea => ({ idea, favorite: ctx.favorites.has(idea.id), lastDone: ctx.lastDone.get(idea.id) || null, fits: months >= idea.fromMonth && months <= idea.toMonth }))
    .filter(r => (f.allAges || r.fits) && ideaMatches(r.idea, f, ctx.home) && (!f.favoritesOnly || r.favorite) && (!f.hideDone || !r.lastDone))
    .sort((a, b) => (b.favorite - a.favorite) || (!!a.lastDone - !!b.lastDone) || (a.idea.fromMonth - b.idea.fromMonth)
      || (a.idea.title < b.idea.title ? -1 : a.idea.title > b.idea.title ? 1 : 0));
}

/** Gemachte Ideen je Bereich in den letzten `days` Tagen bis einschließlich heute. @returns {Object<string, number>} */
export function recentByArea(activities, ideasById, childId, today, days = 28) {
  const out = Object.fromEntries(AREAS.map(a => [a, 0]));
  for (const a of activities) {
    if (a.childId !== childId) continue;
    const n = toNum(a.date), idea = ideasById.get(a.ideaId);
    if (idea && n <= today && n > today - days) out[idea.area]++;
  }
  return out;
}

/** Kleiner, reproduzierbarer Wert in [0, 1) aus Text und Tag (statt Zufall). */
function jitter(s, day) {
  let h = 2166136261 ^ day;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Vorschläge zur Förderung, mit Begründung.
 * Bewertet passende Ideen nach: unterstützt einen Meilenstein, der gerade ansteht (Zone der nächsten Entwicklung) ·
 * Bereich kam in den letzten 4 Wochen wenig vor (Ausgewogenheit) · gemerkt · noch nie gemacht.
 * In den letzten 14 Tagen gemachte Ideen werden ausgelassen. Bereiche wechseln sich ab.
 * @param {{ideas: object[], milestoneCatalog: object[], achieved: object[], activities: object[], childId: string,
 *   favorites: Set<string>, home: Set<string>, months: number, today: number, filter?: object, count?: number, exclude?: Set<string>, seed?: number,
 *   usedAreas?: Map<string, number>}} o  usedAreas: Bereiche, die schon vorkommen (bremst Wiederholung)
 * @returns {Array<{id: string, reason: {type: 'milestone', milestoneId: string} | {type: 'balance', area: string} | {type: 'favorite'} | {type: 'age'}}>}
 */
export function suggestIdeas(o) {
  const count = o.count || 3, f = o.filter || {}, exclude = o.exclude || new Set(), seed = o.seed ?? o.today;
  const ideasById = new Map(o.ideas.map(i => [i.id, i]));
  const lastDone = lastDoneMap(o.activities, o.childId);
  const upcoming = upcomingMilestones(o.milestoneCatalog, o.achieved, o.months, 99, 2);
  const supports = new Map(); // Idee → erster passender Meilenstein
  for (const mid of upcoming) for (const iid of (o.milestoneCatalog.find(m => m.id === mid).ideas || [])) if (!supports.has(iid)) supports.set(iid, mid);
  const recent = recentByArea(o.activities, ideasById, o.childId, o.today);
  const minRecent = Math.min(...AREAS.map(a => recent[a]));
  const cands = o.ideas.filter(i => o.months >= i.fromMonth && o.months <= i.toMonth && ideaMatches(i, f, o.home) && !exclude.has(i.id)
    && !(lastDone.has(i.id) && toNum(lastDone.get(i.id)) > o.today - 14));
  const scored = cands.map(i => {
    let score = jitter(i.id, seed), reason = { type: 'age' };
    if (recent[i.area] === minRecent) { score += 2; reason = { type: 'balance', area: i.area }; } else score += 1 / (1 + recent[i.area]);
    if (o.favorites.has(i.id)) { score += 3; reason = { type: 'favorite' }; }
    if (supports.has(i.id)) { score += 3.5; reason = { type: 'milestone', milestoneId: supports.get(i.id) }; }
    if (!lastDone.has(i.id)) score += 0.5;
    return { id: i.id, area: i.area, score, reason };
  });
  const out = [], usedAreas = new Map(o.usedAreas || []);
  while (out.length < count && scored.length) {
    let best = -1, bestScore = -Infinity;
    scored.forEach((s, k) => { const v = s.score - 4 * (usedAreas.get(s.area) || 0); if (v > bestScore) { bestScore = v; best = k; } });
    const [s] = scored.splice(best, 1);
    usedAreas.set(s.area, (usedAreas.get(s.area) || 0) + 1);
    out.push({ id: s.id, reason: s.reason });
  }
  return out;
}

// ---------- Wochenplan ----------
/** Montag der Woche, in der der Tag liegt (Tagnummer). */
export const weekStart = n => n - ((new Date(n * 864e5).getUTCDay() + 6) % 7);
/** Die sieben Tage (Mo–So) der Woche als 'YYYY-MM-DD'. */
export const weekDays = n => { const s = weekStart(n); return Array.from({ length: 7 }, (_, i) => toStr(s + i)); };

/**
 * Füllt freie Tage ab heute mit je einer Idee (abwechslungsreich, ohne Wiederholung in der Woche).
 * @param {object} o wie suggestIdeas, dazu days: string[] (Tage der Woche) und plan: PlanItem[] dieses Kindes
 * @returns {Array<{date: string, ideaId: string}>}
 */
export function planWeek(o) {
  const planned = new Set(o.plan.map(p => p.date));
  const exclude = new Set(o.plan.map(p => p.ideaId));
  const ideasById = new Map(o.ideas.map(i => [i.id, i]));
  const usedAreas = new Map();
  for (const p of o.plan) { const i = ideasById.get(p.ideaId); if (i) usedAreas.set(i.area, (usedAreas.get(i.area) || 0) + 1); }
  const out = [];
  for (const date of o.days) {
    if (toNum(date) < o.today || planned.has(date)) continue;
    const [s] = suggestIdeas({ ...o, count: 1, exclude, seed: toNum(date), usedAreas });
    if (!s) continue;
    exclude.add(s.id);
    const a = ideasById.get(s.id).area; usedAreas.set(a, (usedAreas.get(a) || 0) + 1);
    out.push({ date, ideaId: s.id });
  }
  return out;
}

/** Fortschritt je Bereich, ressourcenorientiert: was gemacht und erreicht wurde, nicht was fehlt. */
export function areaProgress(milestoneCatalog, achieved, activities, ideasById, childId, months, today) {
  const recent = recentByArea(activities, ideasById, childId, today);
  const done = new Set(achieved.map(m => m.catalogId).filter(Boolean));
  return AREAS.map(area => ({
    area, recent: recent[area],
    milestonesDone: milestoneCatalog.filter(c => c.area === area && done.has(c.id)).length,
    milestonesNow: milestoneCatalog.filter(c => c.area === area && !done.has(c.id) && c.toMonth >= months && c.fromMonth <= months + 1).length,
  }));
}

/** Neuer Merk-Zustand nach Umschalten. null = nicht mehr gemerkt. */
export function toggleFavorite(current, childId, ideaId) {
  return current ? null : { id: `${childId}:${ideaId}`, childId, ideaId, favorite: true };
}

// ---------- Zeitstrahl und Wachstum ----------
/**
 * Alle Einträge eines Kindes, neueste zuerst.
 * @returns {Array<{type: 'milestone'|'diary'|'measurement'|'activity', id: string, date: string}>}
 */
export function timeline(data, childId) {
  const items = [
    ...data.milestones.filter(m => m.childId === childId).map(m => ({ type: 'milestone', id: m.id, date: m.date })),
    ...data.activities.filter(a => a.childId === childId).map(a => ({ type: 'activity', id: a.id, date: a.date })),
    ...data.diary.filter(d => d.childId === childId).map(d => ({ type: 'diary', id: d.id, date: d.date })),
    ...data.measurements.filter(m => m.childId === childId).map(m => ({ type: 'measurement', id: m.id, date: m.date })),
  ];
  const rank = { milestone: 0, activity: 1, diary: 2, measurement: 3 };
  return items.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : rank[a.type] - rank[b.type] || (a.id < b.id ? -1 : 1)));
}

/** Einträge nach Lebensjahr gruppiert (0 = erstes Lebensjahr), neuestes Jahr zuerst. */
export function groupByLifeYear(items, birthDate) {
  const groups = new Map();
  for (const it of items) {
    const a = ageAt(birthDate, toNum(it.date));
    const y = a ? a.years : -1;
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y).push(it);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([year, list]) => ({ year, items: list }));
}

/** Messreihen eines Kindes, älteste zuerst, mit Alter in Monaten (eine Nachkommastelle). */
export function growthSeries(measurements, childId, birthDate) {
  const list = measurements.filter(m => m.childId === childId).sort(byDateAsc);
  const months = d => Math.round((toNum(d) - toNum(birthDate)) / 30.4375 * 10) / 10;
  return {
    height: list.filter(m => m.heightCm !== null).map(m => ({ date: m.date, months: months(m.date), value: m.heightCm })),
    weight: list.filter(m => m.weightKg !== null).map(m => ({ date: m.date, months: months(m.date), value: m.weightKg })),
  };
}

/** Kennzahlen eines Kindes */
export function childStats(data, childId) {
  const of = c => data[c].filter(r => r.childId === childId).length;
  return { milestones: of('milestones'), diary: of('diary'), measurements: of('measurements'), photos: of('photos'), activities: of('activities') };
}

/** Gemachte Ideen in den letzten `days` Tagen */
export const activitiesSince = (activities, childId, today, days) => activities.filter(a => a.childId === childId && toNum(a.date) <= today && toNum(a.date) > today - days).length;

/** Alle Daten eines Kindes (für Löschen oder Export eines einzelnen Kindes). */
export function dataOfChild(data, childId) {
  const out = { children: data.children.filter(c => c.id === childId), ideas: data.ideas.slice() };
  for (const c of ['milestones', 'diary', 'measurements', 'photos', 'ideaStates', 'activities', 'plan']) out[c] = data[c].filter(r => r.childId === childId);
  return out;
}

/** Fotos, auf die kein Eintrag mehr verweist. */
export function orphanPhotos(data) {
  const used = new Set([...data.milestones, ...data.diary, ...data.activities].flatMap(r => r.photoIds));
  return data.photos.filter(p => !used.has(p.id)).map(p => p.id);
}

/** Zielgröße beim Verkleinern eines Fotos (Seitenverhältnis bleibt, nie vergrößern). */
export function fitSize(width, height, max) {
  if (width <= max && height <= max) return { width, height };
  const f = max / Math.max(width, height);
  return { width: Math.round(width * f), height: Math.round(height * f) };
}

// ---------- Demodaten (erfunden, reproduzierbar) ----------
/**
 * Ein Beispielkind mit Meilensteinen, gemachten Ideen, Tagebuch und Messungen, ohne Fotos.
 * @param {number} today Tagnummer @param {(n: number) => string} makeId erzeugt IDs (wird übergeben)
 */
export function makeDemo(today, catalog, makeId) {
  const birth = today - 820; // gut zwei Jahre
  const id = makeId(0);
  const day = m => birth + Math.round(m * 30.4375);
  const reached = ['m-kopf-heben', 'o-laecheln', 's-gurren', 'd-folgen', 'm-greifen', 'o-lachen', 'm-drehen', 'f-hand-zu-hand', 'm-sitzen', 's-silben', 'o-fremdeln',
    'd-ursache', 'm-krabbeln', 'd-versteckt', 'm-hochziehen', 'm-pinzettengriff', 'o-winken', 's-name', 's-erstes-wort', 'm-stehen', 'm-laufen', 'o-zeigen', 'd-nachahmen',
    'a-becher', 'f-turm', 's-zehn-woerter', 'd-formen', 'a-loeffel', 'f-kritzeln', 'm-rennen', 'd-koerperteile', 's-zwei-woerter'];
  const cat = new Map(catalog.map(c => [c.id, c]));
  const milestones = reached.map((cid, i) => {
    const c = cat.get(cid);
    const at = c.fromMonth + (c.toMonth - c.fromMonth) * (0.35 + ((i * 37) % 30) / 100);
    return { id: makeId(100 + i), childId: id, catalogId: cid, title: '', date: toStr(day(at)), note: '', photoIds: [] };
  }).filter(m => toNum(m.date) <= today);
  milestones.push({ id: makeId(199), childId: id, catalogId: null, title: 'Erster Zoo-Besuch, Giraffen bestaunt', date: toStr(day(19)), note: '', photoIds: [] });
  const notes = [
    [0.1, 'Zum ersten Mal zu Hause. Alles ist ruhig, alle sind müde und glücklich.'],
    [2.5, 'Beim Wickeln wird jetzt gestrampelt und erzählt.'],
    [7, 'Brei mit Karotte: halb im Mund, halb im Gesicht.'],
    [15, 'Läuft jetzt quer durchs Wohnzimmer und findet das sehr lustig.'],
    [21, 'Lieblingswort der Woche: „Bagger“.'],
  ];
  const diary = notes.filter(([m]) => day(m) <= today).map(([m, text], i) => ({ id: makeId(200 + i), childId: id, date: toStr(day(m)), text, photoIds: [] }));
  const meas = [[0, 51, 3.4], [1, 54.5, 4.3], [2, 58, 5.4], [4, 63.5, 6.9], [6, 67, 7.8], [9, 71.5, 8.8], [12, 75.5, 9.6], [15, 79, 10.2], [18, 82, 10.9], [24, 87.5, 12.2]];
  const measurements = meas.filter(([m]) => day(m) <= today).map(([m, h, w], i) => ({ id: makeId(300 + i), childId: id, date: toStr(day(m)), heightCm: h, weightKg: w }));
  const acts = [[3, 'k-bauchlage-spiegel'], [8, 'k-kuckuck', 'Hat sich vor Lachen kaum halten können.'], [11, 'k-kissenparcours'], [14, 'k-ausraeumkiste'], [18, 'k-turm-bauen'],
    [22, 'k-wasser-schuetten'], [25, 'k-tiergeraeusche'], [26.3, 'k-pfuetzen', 'Erste große Pfütze, Matschhose bewährt.'], [26.6, 'k-puppe-versorgen']];
  const activities = acts.filter(([m]) => day(m) <= today).map(([m, ideaId, note], i) => ({ id: makeId(400 + i), childId: id, ideaId, date: toStr(day(m)), note: note || '', photoIds: [] }));
  const ideaStates = [{ id: `${id}:k-knete`, childId: id, ideaId: 'k-knete', favorite: true }];
  return { children: [{ id, name: 'Beispielkind', birthDate: toStr(birth), dueDate: null }], milestones, diary, measurements, photos: [], ideas: [], ideaStates, activities, plan: [] };
}
