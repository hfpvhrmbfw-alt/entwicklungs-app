/* Logik: reine Funktionen. Daten rein, Daten raus.
   Kein DOM, kein Speicher, keine aktuelle Zeit, kein Zufall: "heute" kommt als Tagnummer herein. */

import { toNum, AREAS, ideaStateId } from './model.js';

// ---------- Alter ----------
/**
 * Alter an einem Tag, kalendergenau (Monate wie im Kalender, Rest in Tagen).
 * @param {string} birthDate 'YYYY-MM-DD' @param {number} n Tagnummer
 * @returns {{totalDays: number, totalMonths: number, years: number, months: number, days: number}|null} null vor der Geburt
 */
export function ageAt(birthDate, n) {
  const b = toNum(birthDate);
  if (n < b) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const d = new Date(n * 864e5);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  let months = (y - by) * 12 + (m - bm);
  if (day < bd) months -= 1;
  // Tage seit dem letzten "Monatstag"; bei kürzeren Monaten zählt der Monatsletzte
  const anchorY = by + Math.floor((bm - 1 + months) / 12), anchorM = ((bm - 1 + months) % 12) + 1;
  const lastDay = new Date(Date.UTC(anchorY, anchorM, 0)).getUTCDate();
  const anchor = Date.UTC(anchorY, anchorM - 1, Math.min(bd, lastDay)) / 864e5;
  return { totalDays: n - b, totalMonths: months, years: Math.floor(months / 12), months: months % 12, days: n - anchor };
}

/** Ganze Lebensmonate an einem Tag (vor der Geburt 0). */
export const ageMonths = (birthDate, n) => { const a = ageAt(birthDate, n); return a ? a.totalMonths : 0; };

// ---------- Meilensteine ----------
/**
 * Meilenstein-Übersicht je Bereich. Status ohne Wertung:
 * 'done' eingetragen · 'now' liegt im typischen Zeitfenster (oder beginnt im nächsten Monat) ·
 * 'later' kommt später · 'open' Zeitfenster vorbei, noch nicht eingetragen
 * @param {Array<{id: string, area: string, fromMonth: number, toMonth: number}>} catalog
 * @param {import('./model.js').Milestone[]} achieved Meilensteine dieses Kindes
 * @param {number} months Alter in ganzen Monaten
 * @returns {{areas: Array<{area: string, items: Array<{id: string, fromMonth: number, toMonth: number, status: string, milestoneId: string|null, date: string|null}>}>, custom: string[]}}
 *   custom: IDs der eigenen Meilensteine (ohne Katalog-Eintrag), älteste zuerst
 */
export function milestoneOverview(catalog, achieved, months) {
  const byCat = new Map(achieved.filter(m => m.catalogId).map(m => [m.catalogId, m]));
  const known = new Set(catalog.map(c => c.id));
  const custom = achieved.filter(m => !m.catalogId || !known.has(m.catalogId))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1)).map(m => m.id);
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

/** Meilensteine, die gerade im Zeitfenster liegen und noch nicht eingetragen sind (früheste zuerst). */
export function upcomingMilestones(catalog, achieved, months, limit = 4) {
  const done = new Set(achieved.map(m => m.catalogId).filter(Boolean));
  return catalog.filter(c => !done.has(c.id) && c.toMonth >= months && c.fromMonth <= months + 1)
    .sort((a, b) => a.fromMonth - b.fromMonth || a.toMonth - b.toMonth)
    .slice(0, limit).map(c => c.id);
}

// ---------- Ideen ----------
/**
 * Ideen für ein Kind filtern und sortieren.
 * Sortierung: Favoriten zuerst, dann noch nicht gemacht, dann nach Altersbeginn und Titel.
 * @param {import('./model.js').Idea[]} ideas Katalog und eigene Ideen
 * @param {import('./model.js').IdeaState[]} states Zustände dieses Kindes
 * @param {number} months Alter in Monaten
 * @param {{kind?: string, area?: string, favoritesOnly?: boolean, hideDone?: boolean, allAges?: boolean}} filter
 * @returns {Array<{idea: import('./model.js').Idea, favorite: boolean, doneDate: string|null, fits: boolean}>}
 */
export function ideasFor(ideas, states, months, filter = {}) {
  const st = new Map(states.map(s => [s.ideaId, s]));
  return ideas.map(idea => {
    const s = st.get(idea.id);
    return { idea, favorite: !!(s && s.favorite), doneDate: s ? s.doneDate : null, fits: months >= idea.fromMonth && months <= idea.toMonth };
  }).filter(r => (filter.allAges || r.fits)
    && (!filter.kind || r.idea.kind === filter.kind)
    && (!filter.area || r.idea.area === filter.area)
    && (!filter.favoritesOnly || r.favorite)
    && (!filter.hideDone || !r.doneDate))
    .sort((a, b) => (b.favorite - a.favorite) || (!!a.doneDate - !!b.doneDate) || (a.idea.fromMonth - b.idea.fromMonth)
      || (a.idea.title < b.idea.title ? -1 : a.idea.title > b.idea.title ? 1 : 0));
}

/**
 * Ideen des Tages: zuerst gemerkte (Favoriten), dann passende, noch nicht gemachte Ideen,
 * täglich wechselnd und reproduzierbar.
 * @param {number} day Tagnummer (heute) @returns {string[]} Ideen-IDs
 */
export function ideasOfTheDay(ideas, states, months, day, count = 3) {
  const open = ideasFor(ideas, states, months, { hideDone: true });
  const fav = open.filter(r => r.favorite).map(r => r.idea.id).slice(0, count);
  const pool = open.filter(r => !r.favorite).map(r => r.idea.id).sort();
  const need = count - fav.length;
  if (pool.length <= need) return [...fav, ...pool];
  const out = [];
  let i = (day * 7919) % pool.length;
  while (out.length < need) {
    while (out.includes(pool[i])) i = (i + 1) % pool.length;
    out.push(pool[i]);
    i = (i + 5) % pool.length;
  }
  return [...fav, ...out];
}

/** Neuer Zustand einer Idee nach Umschalten von Favorit oder erledigt. null = Zustand löschen. */
export function toggleIdeaState(current, childId, ideaId, change, today) {
  const s = current || { id: ideaStateId(childId, ideaId), childId, ideaId, favorite: false, doneDate: null };
  const next = { ...s };
  if (change === 'favorite') next.favorite = !s.favorite;
  if (change === 'done') next.doneDate = s.doneDate ? null : today;
  return next.favorite || next.doneDate ? next : null;
}

// ---------- Zeitstrahl und Wachstum ----------
/**
 * Alle Einträge eines Kindes, neueste zuerst.
 * @param {import('./model.js').AppData} data @param {string} childId
 * @returns {Array<{type: 'milestone'|'diary'|'measurement', id: string, date: string}>}
 */
export function timeline(data, childId) {
  const items = [
    ...data.milestones.filter(m => m.childId === childId).map(m => ({ type: 'milestone', id: m.id, date: m.date })),
    ...data.diary.filter(d => d.childId === childId).map(d => ({ type: 'diary', id: d.id, date: d.date })),
    ...data.measurements.filter(m => m.childId === childId).map(m => ({ type: 'measurement', id: m.id, date: m.date })),
  ];
  const rank = { milestone: 0, diary: 1, measurement: 2 };
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

/**
 * Messreihen eines Kindes, älteste zuerst, mit Alter in Monaten (eine Nachkommastelle).
 * @returns {{height: Array<{date: string, months: number, value: number}>, weight: Array<{date: string, months: number, value: number}>}}
 */
export function growthSeries(measurements, childId, birthDate) {
  const list = measurements.filter(m => m.childId === childId).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const months = d => Math.round((toNum(d) - toNum(birthDate)) / 30.4375 * 10) / 10;
  return {
    height: list.filter(m => m.heightCm !== null).map(m => ({ date: m.date, months: months(m.date), value: m.heightCm })),
    weight: list.filter(m => m.weightKg !== null).map(m => ({ date: m.date, months: months(m.date), value: m.weightKg })),
  };
}

/** Kennzahlen eines Kindes */
export function childStats(data, childId) {
  const of = c => data[c].filter(r => r.childId === childId).length;
  return { milestones: of('milestones'), diary: of('diary'), measurements: of('measurements'), photos: of('photos') };
}

/** Alle Daten eines Kindes (für Löschen oder Export eines einzelnen Kindes). */
export function dataOfChild(data, childId) {
  const out = { children: data.children.filter(c => c.id === childId), ideas: data.ideas.slice() };
  for (const c of ['milestones', 'diary', 'measurements', 'photos', 'ideaStates']) out[c] = data[c].filter(r => r.childId === childId);
  return out;
}

/** Fotos, auf die kein Eintrag mehr verweist (zum Aufräumen nach dem Löschen eines Eintrags). */
export function orphanPhotos(data) {
  const used = new Set([...data.milestones, ...data.diary].flatMap(r => r.photoIds));
  return data.photos.filter(p => !used.has(p.id)).map(p => p.id);
}

/**
 * Zielgröße beim Verkleinern eines Fotos (Seitenverhältnis bleibt, nie vergrößern).
 * @returns {{width: number, height: number}}
 */
export function fitSize(width, height, max) {
  if (width <= max && height <= max) return { width, height };
  const f = max / Math.max(width, height);
  return { width: Math.round(width * f), height: Math.round(height * f) };
}

// ---------- Demodaten (erfunden, reproduzierbar) ----------
/**
 * Ein Beispielkind mit Meilensteinen, Tagebuch und Messungen, ohne Fotos.
 * @param {number} today Tagnummer @param {(n: number) => string} makeId erzeugt IDs (wird übergeben)
 * @returns {import('./model.js').AppData}
 */
export function makeDemo(today, catalog, makeId) {
  const birth = today - 820; // gut zwei Jahre
  const id = makeId(0);
  const toS = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const day = m => birth + Math.round(m * 30.4375);
  const reached = ['m-kopf-heben', 'o-laecheln', 's-gurren', 'm-greifen', 'o-lachen', 'm-drehen', 'm-sitzen', 's-silben', 'o-fremdeln',
    'm-krabbeln', 'd-versteckt', 'm-hochziehen', 'o-winken', 's-erstes-wort', 'm-stehen', 'm-laufen', 'o-zeigen', 'd-nachahmen',
    'a-becher', 's-zehn-woerter', 'd-formen', 'a-loeffel', 'm-rennen', 'd-koerperteile', 's-zwei-woerter'];
  const offset = [0.2, 0.1, -0.3, 0.4, 0, 0.6, 0.8, 0.2, -0.5, 1.1, 0.3, 0.2, 0.4, 0.9, 1.2, 1.4, 0.1, 0.5, 0.2, 0.6, 0.3, 1.0, 0.4, 0.7, 0.9];
  const cat = new Map(catalog.map(c => [c.id, c]));
  const milestones = reached.map((cid, i) => {
    const c = cat.get(cid);
    return { id: makeId(100 + i), childId: id, catalogId: cid, title: '', date: toS(day((c.fromMonth + c.toMonth) / 2 + offset[i] - 0.8)), note: '', photoIds: [] };
  }).filter(m => toNum(m.date) <= today);
  milestones.push({ id: makeId(199), childId: id, catalogId: null, title: 'Erster Zoo-Besuch, Giraffen bestaunt', date: toS(day(19)), note: '', photoIds: [] });
  const notes = [
    [0.1, 'Zum ersten Mal zu Hause. Alles ist ruhig, alle sind müde und glücklich.'],
    [2.5, 'Beim Wickeln wird jetzt gestrampelt und erzählt.'],
    [7, 'Brei mit Karotte: halb im Mund, halb im Gesicht.'],
    [11.5, 'Großer Spaß mit dem Kuckuck-Spiel unter der Decke.'],
    [15, 'Läuft jetzt quer durchs Wohnzimmer und findet das sehr lustig.'],
    [21, 'Lieblingswort der Woche: „Bagger“.'],
    [26, 'Hat beim Backen geholfen und den Teig probiert, bevor er im Ofen war.'],
  ];
  const diary = notes.filter(([m]) => day(m) <= today).map(([m, text], i) => ({ id: makeId(200 + i), childId: id, date: toS(day(m)), text, photoIds: [] }));
  const meas = [[0, 51, 3.4], [1, 54.5, 4.3], [2, 58, 5.4], [4, 63.5, 6.9], [6, 67, 7.8], [9, 71.5, 8.8], [12, 75.5, 9.6], [15, 79, 10.2], [18, 82, 10.9], [24, 87.5, 12.2]];
  const measurements = meas.filter(([m]) => day(m) <= today).map(([m, h, w], i) => ({ id: makeId(300 + i), childId: id, date: toS(day(m)), heightCm: h, weightKg: w }));
  return { children: [{ id, name: 'Beispielkind', birthDate: toS(birth) }], milestones, diary, measurements, photos: [], ideas: [], ideaStates: [] };
}
