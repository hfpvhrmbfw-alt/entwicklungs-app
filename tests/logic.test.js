// Tests für Modell, Logik, ZIP und Buch. Laufen ohne Browser: npm test
// Die Fixtures in tests/fixtures/ sind sprachneutral (Eingabe + erwartetes Ergebnis)
// und lassen sich später für die Swift-Tests wiederverwenden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../src/model.js';
import * as L from '../src/logic.js';
import { MILESTONE_CATALOG, IDEA_CATALOG } from '../src/catalog.js';
import { createZip, readZip, crc32 } from '../src/zip.js';
import { buildBook, bookFileName } from '../src/book.js';
import { rangeText, ageText, kg, cm } from '../src/format.js';

const load = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const CAT_IDEAS = new Set(IDEA_CATALOG.map(i => i.id));

test('Alter ist kalendergenau (Fixture alter.json)', () => {
  for (const c of load('alter.json')) assert.deepEqual(L.ageAt(c.birthDate, M.toNum(c.date)), c.expected, `${c.birthDate} → ${c.date}`);
});

test('Szenario Beispielkind (Fixture szenario-beispielkind.json)', () => {
  const fx = load('szenario-beispielkind.json');
  const { data, milestoneCatalog, ideaCatalog } = fx.input, today = M.toNum(fx.input.today), e = fx.expected;
  const child = data.children[0], months = L.ageMonths(child.birthDate, today);
  const ideas = [...ideaCatalog, ...data.ideas], ach = data.milestones.filter(m => m.childId === child.id);
  assert.equal(months, e.months);
  assert.deepEqual(L.milestoneOverview(milestoneCatalog, ach, months), e.milestoneOverview);
  assert.deepEqual(L.upcomingMilestones(milestoneCatalog, ach, months), e.upcomingMilestones);
  assert.deepEqual(L.ideasFor(ideas, data.ideaStates, months).map(r => ({ id: r.idea.id, favorite: r.favorite, doneDate: r.doneDate, fits: r.fits })), e.ideasDefault);
  assert.deepEqual(L.ideasFor(ideas, data.ideaStates, months, { area: 'motorik', hideDone: true }).map(r => r.idea.id), e.ideasMotorikOhneGemachte);
  assert.deepEqual(L.ideasOfTheDay(ideas, data.ideaStates, months, today), e.ideasOfTheDay);
  assert.deepEqual(L.timeline(data, child.id), e.timeline);
  assert.deepEqual(L.groupByLifeYear(L.timeline(data, child.id), child.birthDate).map(g => ({ year: g.year, count: g.items.length })), e.lifeYears);
  assert.deepEqual(L.growthSeries(data.measurements, child.id, child.birthDate), e.growth);
  assert.deepEqual(L.childStats(data, child.id), e.stats);
});

test('Katalog ist stimmig', () => {
  const ids = [...MILESTONE_CATALOG, ...IDEA_CATALOG].map(x => x.id);
  assert.equal(new Set(ids).size, ids.length, 'IDs eindeutig');
  for (const m of MILESTONE_CATALOG) { assert.ok(M.AREAS.includes(m.area), m.id); assert.ok(m.fromMonth <= m.toMonth, m.id); }
  for (const i of IDEA_CATALOG) { assert.deepEqual(M.sanitizeIdea(i), i, i.id); assert.ok(i.id.startsWith('k-'), i.id); }
});

test('Ideen des Tages: Favoriten zuerst, Gemachte nie, jeden Tag gleich', () => {
  const states = [{ id: 'a:k-knete', childId: 'a', ideaId: 'k-knete', favorite: true, doneDate: null }, { id: 'a:k-reime', childId: 'a', ideaId: 'k-reime', favorite: false, doneDate: '2026-01-01' }];
  const a = L.ideasOfTheDay(IDEA_CATALOG, states, 40, 20000), b = L.ideasOfTheDay(IDEA_CATALOG, states, 40, 20000);
  assert.deepEqual(a, b);
  assert.equal(a[0], 'k-knete');
  assert.ok(!a.includes('k-reime'));
  assert.equal(new Set(a).size, 3);
});

test('Idee umschalten', () => {
  const s1 = L.toggleIdeaState(undefined, 'a', 'k-knete', 'favorite', '2026-10-12');
  assert.deepEqual(s1, { id: 'a:k-knete', childId: 'a', ideaId: 'k-knete', favorite: true, doneDate: null });
  const s2 = L.toggleIdeaState(s1, 'a', 'k-knete', 'done', '2026-10-12');
  assert.equal(s2.doneDate, '2026-10-12');
  assert.equal(L.toggleIdeaState({ ...s1 }, 'a', 'k-knete', 'favorite', '2026-10-12'), null, 'leerer Zustand wird gelöscht');
});

test('Validierung: Pflichtfelder, Grenzen, Datum', () => {
  assert.equal(M.isDate('2026-02-30'), false);
  assert.equal(M.sanitizeChild({ id: 'a', name: '  ', birthDate: '2025-01-01' }), null);
  assert.deepEqual(M.sanitizeMeasurement({ id: 'm', childId: 'a', date: '2026-01-01', heightCm: '74,56', weightKg: 'x' }), { id: 'm', childId: 'a', date: '2026-01-01', heightCm: 74.6, weightKg: null });
  assert.equal(M.sanitizeMeasurement({ id: 'm', childId: 'a', date: '2026-01-01', heightCm: 500 }), null);
  assert.equal(M.sanitizeMilestone({ id: 'x', childId: 'a', catalogId: null, title: '', date: '2026-01-01' }), null);
  assert.equal(M.sanitizeMilestone({ id: 'x', childId: 'a', catalogId: 'm-sitzen', title: 'egal', date: '2026-01-01' }).title, '');
  assert.equal(M.sanitizeDiary({ id: 'd', childId: 'a', date: '2026-01-01', text: ' ', photoIds: [] }), null);
  assert.equal(M.sanitizeIdeaState({ childId: 'a', ideaId: 'k', favorite: false, doneDate: null }), null);
});

test('sanitizeData entfernt Verweise ins Leere', () => {
  const raw = {
    children: [{ id: 'a', name: 'Mila', birthDate: '2025-03-10' }],
    diary: [{ id: 'd1', childId: 'a', date: '2026-01-01', text: '', photoIds: ['p1', 'p2'] }, { id: 'd2', childId: 'zz', date: '2026-01-01', text: 'fremd' }],
    photos: [{ id: 'p1', childId: 'a', date: '2026-01-01', mime: 'image/jpeg' }],
    ideaStates: [{ childId: 'a', ideaId: 'k-knete', favorite: true }, { childId: 'a', ideaId: 'gibts-nicht', favorite: true }],
  };
  const d = M.sanitizeData(raw, CAT_IDEAS);
  assert.deepEqual(d.diary.map(x => [x.id, x.photoIds]), [['d1', ['p1']]]);
  assert.deepEqual(d.ideaStates.map(s => s.ideaId), ['k-knete']);
});

test('Backup: hin und zurück, Versionen, Fehler', () => {
  const fx = load('szenario-beispielkind.json');
  const data = M.sanitizeData(fx.input.data, CAT_IDEAS);
  const backup = JSON.parse(JSON.stringify(M.buildBackup(data, { activeChildId: 'demo-0', theme: 'dark' }, '2026-10-12T08:00:00.000Z')));
  const back = M.parseBackup(backup, CAT_IDEAS);
  assert.ok(back.ok);
  for (const c of M.COLLECTIONS) assert.deepEqual(new Set(back.data[c].map(r => r.id)), new Set(data[c].map(r => r.id)), c);
  assert.deepEqual(back.settings, { activeChildId: 'demo-0', theme: 'dark' });
  assert.deepEqual(M.parseBackup({ ...backup, version: 2 }, CAT_IDEAS), { ok: false, error: 'newer_version' });
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

test('Entwicklungsbuch: Inhalt und Escaping', () => {
  const fx = load('szenario-beispielkind.json');
  const data = M.sanitizeData(fx.input.data, CAT_IDEAS);
  data.diary[0].text = '<script>alert(1)</script>';
  const html = buildBook({ child: data.children[0], data, milestoneTitles: new Map(MILESTONE_CATALOG.map(c => [c.id, c.title])), milestoneAreas: new Map(MILESTONE_CATALOG.map(c => [c.id, c.area])), photoSrc: p => `fotos/${p.id}.jpg`, today: '2026-10-12' });
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('Beispielkind'));
  assert.ok(html.includes('Lächelt zurück'));
  assert.ok(!html.includes('<script>alert'));
  assert.equal(bookFileName({ name: 'Mila Marie' }, '2026-10-12'), 'Entwicklungsbuch-Mila-Marie-2026-10-12.html');
});

test('Formatierung', () => {
  assert.equal(rangeText(6, 9), '6–9 Monate');
  assert.equal(rangeText(18, 30), '18–30 Monate');
  assert.equal(rangeText(30, 48), '2½–4 Jahre');
  assert.equal(rangeText(12, 48), '12 Monate – 4 Jahre');
  assert.equal(ageText('2025-03-10', '2026-10-12'), '1 Jahr, 7 Monate');
  assert.equal(ageText('2026-10-01', '2026-10-12'), '11 Tage');
  assert.equal(kg(10.5), '10,5 kg'); assert.equal(kg(9), '9 kg'); assert.equal(cm(74.5), '74,5 cm'); assert.equal(cm(51), '51 cm');
});

test('Fotogröße', () => {
  assert.deepEqual(L.fitSize(3000, 2000, 1600), { width: 1600, height: 1067 });
  assert.deepEqual(L.fitSize(800, 600, 1600), { width: 800, height: 600 });
});
