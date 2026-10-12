// Tests für Modell, Logik, Katalog, ZIP und Buch. Laufen ohne Browser: npm test
// Die Fixtures in tests/fixtures/ sind sprachneutral (Eingabe + erwartetes Ergebnis)
// und lassen sich später für die Swift-Tests wiederverwenden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../src/model.js';
import * as L from '../src/logic.js';
import { MILESTONE_CATALOG, IDEA_CATALOG, MATERIALS } from '../src/catalog.js';
import { createZip, readZip, crc32 } from '../src/zip.js';
import { buildBook, bookFileName } from '../src/book.js';
import { rangeText, ageText, kg, cm } from '../src/format.js';

const load = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const CAT_IDEAS = new Set(IDEA_CATALOG.map(i => i.id));

test('Alter ist kalendergenau (Fixture alter.json)', () => {
  for (const c of load('alter.json')) assert.deepEqual(L.ageAt(c.birthDate, M.toNum(c.date)), c.expected, `${c.birthDate} → ${c.date}`);
});

test('Korrigiertes Alter bei Frühgeborenen (Fixture korrigiertes-alter.json)', () => {
  for (const c of load('korrigiertes-alter.json')) assert.deepEqual(L.effectiveAge(c.child, M.toNum(c.date)), c.expected, `${c.child.birthDate} → ${c.date}`);
  // geboren 1.6., Termin 10.8.: am 12.10. korrigiert 2 Monate, tatsächlich 4
  const a = L.effectiveAge({ birthDate: '2026-06-01', dueDate: '2026-08-10' }, M.toNum('2026-10-12'));
  assert.equal(a.months, 2); assert.equal(a.chrono.totalMonths, 4); assert.equal(a.weeksEarly, 10);
});

test('Szenario Beispielkind (Fixture szenario-beispielkind.json)', () => {
  const fx = load('szenario-beispielkind.json');
  const { data, milestoneCatalog, ideaCatalog } = fx.input, today = M.toNum(fx.input.today), e = fx.expected;
  const child = data.children[0], months = L.effectiveAge(child, today).months;
  const ideas = [...ideaCatalog, ...data.ideas], byId = new Map(ideas.map(i => [i.id, i]));
  const ach = data.milestones.filter(m => m.childId === child.id);
  const favorites = new Set(data.ideaStates.map(s => s.ideaId)), home = new Set(fx.input.home);
  const ctx = { favorites, lastDone: L.lastDoneMap(data.activities, child.id), home };
  const base = { ideas, milestoneCatalog, achieved: ach, activities: data.activities, childId: child.id, favorites, home, months, today };
  assert.equal(months, e.months);
  assert.deepEqual(L.milestoneOverview(milestoneCatalog, ach, months), e.milestoneOverview);
  assert.deepEqual(L.upcomingMilestones(milestoneCatalog, ach, months), e.upcomingMilestones);
  assert.deepEqual(L.ideasFor(ideas, ctx, months).map(r => ({ id: r.idea.id, favorite: r.favorite, lastDone: r.lastDone, fits: r.fits })), e.ideasDefault);
  assert.deepEqual(L.ideasFor(ideas, ctx, months, { place: 'draussen', maxMinutes: 20, onlyHome: true }).map(r => r.idea.id), e.ideasDraussenKurzZuhause);
  assert.deepEqual(L.suggestIdeas(base), e.suggestions);
  assert.deepEqual(L.suggestIdeas({ ...base, filter: { place: 'drinnen' } }), e.suggestionsDrinnen);
  assert.deepEqual(L.recentByArea(data.activities, byId, child.id, today), e.recentByArea);
  assert.deepEqual(L.planWeek({ ...base, days: L.weekDays(today), plan: data.plan }), e.planWeek);
  assert.deepEqual(L.timeline(data, child.id), e.timeline);
  assert.deepEqual(L.groupByLifeYear(L.timeline(data, child.id), child.birthDate).map(g => ({ year: g.year, count: g.items.length })), e.lifeYears);
  assert.deepEqual(L.growthSeries(data.measurements, child.id, child.birthDate), e.growth);
  assert.deepEqual(L.childStats(data, child.id), e.stats);
});

test('Katalog: stimmig, vollständig, je Altersband mindestens 20 Ideen', () => {
  const ids = [...MILESTONE_CATALOG, ...IDEA_CATALOG].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length, 'IDs eindeutig');
  for (const m of MILESTONE_CATALOG) {
    assert.ok(M.AREAS.includes(m.area), m.id); assert.ok(m.fromMonth <= m.toMonth, m.id); assert.ok(m.tip, m.id);
    for (const i of m.ideas) assert.ok(CAT_IDEAS.has(i), `${m.id} verweist auf ${i}`);
  }
  for (const i of IDEA_CATALOG) {
    assert.deepEqual(M.sanitizeIdea(i), i, i.id);
    assert.ok(i.id.startsWith('k-'), i.id);
    assert.ok(i.steps.length >= 2 && i.learns && i.why && i.principle && i.minutes, `${i.id}: Anleitung, Lernziel, Begründung, Prinzip, Dauer`);
    for (const m of i.materials) assert.ok(MATERIALS[m], `${i.id}: Material ${m}`);
  }
  for (const [a, b] of [[0, 6], [6, 12], [12, 24], [24, 36], [36, 48], [48, 72]]) {
    const n = IDEA_CATALOG.filter(i => i.fromMonth < b && i.toMonth >= a).length;
    assert.ok(n >= 20, `${a}–${b} Monate: ${n} Ideen`);
  }
  // Alle IDs aus Version 1 gibt es weiterhin (gemerkte und gemachte Ideen bleiben gültig)
  for (const id of ['k-kontrastkarten', 'k-stoffe', 'k-kuckuck', 'k-schiebekarton', 'k-aufraeumlied', 'k-kaufladen', 'k-falten', 'k-schatzsuche']) assert.ok(CAT_IDEAS.has(id), id);
  for (const id of ['m-greifen', 'm-pinzettengriff', 'm-schere', 'a-trocken', 'd-name', 'o-als-ob']) assert.ok(MILESTONE_CATALOG.some(m => m.id === id), id);
});

test('Vorschläge: fördern Anstehendes, wechseln Bereiche, lassen kürzlich Gemachtes aus', () => {
  const base = { ideas: IDEA_CATALOG, milestoneCatalog: MILESTONE_CATALOG, achieved: [], activities: [], childId: 'a', favorites: new Set(), home: new Set(), months: 2, today: 20000 };
  const s = L.suggestIdeas(base);
  assert.equal(s.length, 3);
  assert.ok(s.every(x => x.reason.type === 'milestone'), 'bei 2 Monaten passt alles zu anstehenden Meilensteinen');
  const areas = s.map(x => IDEA_CATALOG.find(i => i.id === x.id).area);
  assert.equal(new Set(areas).size, 3, 'drei verschiedene Bereiche');
  const done = { id: 'x', childId: 'a', ideaId: s[0].id, date: M.toStr(19995), note: '', photoIds: [] };
  assert.ok(!L.suggestIdeas({ ...base, activities: [done] }).some(x => x.id === s[0].id), 'vor 5 Tagen gemacht → nicht vorgeschlagen');
  assert.deepEqual(L.suggestIdeas(base), s, 'reproduzierbar');
});

test('Filter: Ort, Dauer, Material zu Hause', () => {
  const idea = IDEA_CATALOG.find(i => i.id === 'k-knete');
  assert.ok(L.ideaMatches(idea, { place: 'drinnen' }, new Set()));
  assert.ok(!L.ideaMatches(idea, { maxMinutes: 10 }, new Set()));
  assert.ok(!L.ideaMatches(idea, { onlyHome: true }, new Set(['kueche'])));
  assert.ok(L.ideaMatches(idea, { onlyHome: true }, new Set(['kueche', 'knete'])));
  assert.ok(L.ideaMatches(IDEA_CATALOG.find(i => i.id === 'k-reime'), { onlyHome: true }, new Set()), 'ohne Material immer möglich');
});

test('Wochenplan: Montag bis Sonntag, keine doppelten Ideen, nur ab heute', () => {
  const days = L.weekDays(M.toNum('2026-10-14')); // Mittwoch
  assert.deepEqual([days[0], days[6]], ['2026-10-12', '2026-10-18']);
  const plan = L.planWeek({ ideas: IDEA_CATALOG, milestoneCatalog: MILESTONE_CATALOG, achieved: [], activities: [], childId: 'a', favorites: new Set(), home: new Set(), months: 30, today: M.toNum('2026-10-14'), days, plan: [] });
  assert.deepEqual(plan.map(p => p.date), days.slice(2));
  assert.equal(new Set(plan.map(p => p.ideaId)).size, plan.length);
});

test('Merken umschalten', () => {
  const s1 = L.toggleFavorite(undefined, 'a', 'k-knete');
  assert.deepEqual(s1, { id: 'a:k-knete', childId: 'a', ideaId: 'k-knete', favorite: true });
  assert.equal(L.toggleFavorite(s1, 'a', 'k-knete'), null);
});

test('Validierung: Pflichtfelder, Grenzen, Datum, Termin', () => {
  assert.equal(M.isDate('2026-02-30'), false);
  assert.equal(M.sanitizeChild({ id: 'a', name: '  ', birthDate: '2025-01-01' }), null);
  assert.equal(M.sanitizeChild({ id: 'a', name: 'A', birthDate: '2026-06-01', dueDate: '2026-05-01' }).dueDate, null, 'Termin vor Geburt');
  assert.equal(M.sanitizeChild({ id: 'a', name: 'A', birthDate: '2026-06-01', dueDate: '2026-12-01' }).dueDate, null, 'mehr als 20 Wochen');
  assert.equal(M.sanitizeChild({ id: 'a', name: 'A', birthDate: '2026-06-01', dueDate: '2026-08-10' }).dueDate, '2026-08-10');
  assert.deepEqual(M.sanitizeMeasurement({ id: 'm', childId: 'a', date: '2026-01-01', heightCm: '74,56', weightKg: 'x' }), { id: 'm', childId: 'a', date: '2026-01-01', heightCm: 74.6, weightKg: null });
  assert.equal(M.sanitizeMilestone({ id: 'x', childId: 'a', catalogId: null, title: '', date: '2026-01-01' }), null);
  assert.equal(M.sanitizeActivity({ id: 'x', childId: 'a', ideaId: 'k-knete', date: 'gestern' }), null);
  assert.deepEqual(M.sanitizeSettings({ weekPlan: true, today: { maxMinutes: 15, place: 'mond' } }).today, { maxMinutes: 0, place: '', onlyHome: false });
});

test('Übernahme aus Version 1: gemacht wird Aktivität, alte Bereiche werden umbenannt', () => {
  const v1 = {
    children: [{ id: 'a', name: 'Mila', birthDate: '2025-03-10' }],
    ideaStates: [{ childId: 'a', ideaId: 'k-knete', favorite: false, doneDate: '2026-09-01' }, { childId: 'a', ideaId: 'k-memory', favorite: true, doneDate: '2026-09-02' }],
    ideas: [{ id: 'eigen-1', title: 'X', kind: 'uebung', area: 'motorik', fromMonth: 0, toMonth: 12 }],
  };
  const d = M.sanitizeData(v1, CAT_IDEAS);
  assert.deepEqual(d.activities.map(a => [a.ideaId, a.date]).sort(), [['k-knete', '2026-09-01'], ['k-memory', '2026-09-02']]);
  assert.deepEqual(d.ideaStates.map(s => s.ideaId), ['k-memory']);
  assert.equal(d.ideas[0].kind, 'bewegung'); assert.equal(d.ideas[0].area, 'grobmotorik');
  assert.deepEqual(M.sanitizeData(d, CAT_IDEAS).activities.length, 2, 'zweimal laufen lassen ändert nichts');
  const res = M.parseBackup({ app: 'entwicklungs-app', version: 1, ...v1 }, CAT_IDEAS);
  assert.ok(res.ok); assert.equal(res.data.activities.length, 2);
});

test('sanitizeData entfernt Verweise ins Leere', () => {
  const raw = {
    children: [{ id: 'a', name: 'Mila', birthDate: '2025-03-10' }],
    diary: [{ id: 'd1', childId: 'a', date: '2026-01-01', text: '', photoIds: ['p1', 'p2'] }, { id: 'd2', childId: 'zz', date: '2026-01-01', text: 'fremd' }],
    photos: [{ id: 'p1', childId: 'a', date: '2026-01-01', mime: 'image/jpeg' }],
    plan: [{ id: 'x', childId: 'a', ideaId: 'gibts-nicht', date: '2026-01-01' }],
  };
  const d = M.sanitizeData(raw, CAT_IDEAS);
  assert.deepEqual(d.diary.map(x => [x.id, x.photoIds]), [['d1', ['p1']]]);
  assert.equal(d.plan.length, 0);
});

test('Backup: hin und zurück, Versionen, Fehler', () => {
  const fx = load('szenario-beispielkind.json');
  const data = M.sanitizeData(fx.input.data, CAT_IDEAS);
  const settings = M.sanitizeSettings({ activeChildId: 'demo-0', theme: 'dark', weekPlan: true, homeMaterials: ['papier'] });
  const backup = JSON.parse(JSON.stringify(M.buildBackup(data, settings, '2026-10-12T08:00:00.000Z')));
  assert.equal(backup.version, 2);
  const back = M.parseBackup(backup, CAT_IDEAS);
  assert.ok(back.ok);
  for (const c of M.COLLECTIONS) assert.deepEqual(new Set(back.data[c].map(r => r.id)), new Set(data[c].map(r => r.id)), c);
  assert.deepEqual(back.settings, settings);
  assert.deepEqual(M.parseBackup({ ...backup, version: 3 }, CAT_IDEAS), { ok: false, error: 'newer_version' });
  assert.deepEqual(M.parseBackup({ app: 'zyklus-tracker', version: 1 }, CAT_IDEAS), { ok: false, error: 'not_backup' });
  assert.deepEqual(M.parseBackup({ ...backup, children: [] }, CAT_IDEAS), { ok: false, error: 'no_children' });
});

test('ZIP: Prüfsumme und hin und zurück', async () => {
  const enc = new TextEncoder();
  assert.equal(crc32(enc.encode('123456789')), 0xCBF43926);
  const files = [{ name: 'daten.json', data: enc.encode('{"a":1}') }, { name: 'fotos/ä.jpg', data: new Uint8Array([1, 2, 3, 255]) }];
  const back = await readZip(createZip(files, '2026-10-12T08:00:00.000Z'));
  assert.deepEqual([...back.keys()], ['daten.json', 'fotos/ä.jpg']);
  assert.deepEqual(back.get('fotos/ä.jpg'), files[1].data);
  await assert.rejects(readZip(enc.encode('kein zip')));
});

test('Entwicklungsbuch: Inhalt, Gemachtes, korrigiertes Alter, Escaping', () => {
  const fx = load('szenario-beispielkind.json');
  const data = M.sanitizeData(fx.input.data, CAT_IDEAS);
  data.diary[0].text = '<script>alert(1)</script>';
  const args = { milestoneTitles: new Map(MILESTONE_CATALOG.map(c => [c.id, c.title])), milestoneAreas: new Map(MILESTONE_CATALOG.map(c => [c.id, c.area])), ideaTitles: new Map(IDEA_CATALOG.map(i => [i.id, i.title])), ideaAreas: new Map(IDEA_CATALOG.map(i => [i.id, i.area])), photoSrc: p => `fotos/${p.id}.jpg` };
  const html = buildBook({ child: data.children[0], data, ...args, today: '2026-10-12' });
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('Lächelt zurück'));
  assert.ok(html.includes('Kuscheltier versorgen'), 'gemachte Idee im Zeitstrahl');
  assert.ok(!html.includes('<script>alert'));
  const pre = { id: 'p', name: 'Ella', birthDate: '2026-06-01', dueDate: '2026-08-10' };
  const html2 = buildBook({ child: pre, data: { ...M.emptyData(), children: [pre] }, ...args, today: '2026-10-12' });
  assert.ok(html2.includes('Korrigiert 2 Monate'));
  assert.equal(bookFileName({ name: 'Mila Marie' }, '2026-10-12'), 'Entwicklungsbuch-Mila-Marie-2026-10-12.html');
});

test('Formatierung', () => {
  assert.equal(rangeText(6, 9), '6–9 Monate');
  assert.equal(rangeText(30, 48), '2½–4 Jahre');
  assert.equal(rangeText(12, 48), '12 Monate – 4 Jahre');
  assert.equal(ageText('2025-03-10', '2026-10-12'), '1 Jahr, 7 Monate');
  assert.equal(kg(10.5), '10,5 kg'); assert.equal(cm(51), '51 cm');
});
