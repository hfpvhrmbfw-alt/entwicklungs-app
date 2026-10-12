/* Entwicklungs-App · reine Frontend-PWA, Daten nur lokal (IndexedDB, Fallback localStorage)
   Start, Aktionen und Ereignisse. Verbindet Oberfläche, Logik und Speicher. */

import { COLLECTIONS, PHOTO_MAX_PX, sanitizeData, sanitizeSettings, sanitizeChild, sanitizeMilestone, sanitizeDiary, sanitizeMeasurement, sanitizeIdea, sanitizePhoto, sanitizeIdeaState, ideaStateId, buildBackup, parseBackup, photoFile, emptyData } from './model.js';
import { toggleIdeaState, dataOfChild, orphanPhotos, fitSize, makeDemo } from './logic.js';
import { MILESTONE_CATALOG, IDEA_CATALOG } from './catalog.js';
import { Store } from './storage.js';
import { createZip, readZip } from './zip.js';
import { buildBook, bookFileName } from './book.js';
import { IMPORT_ERROR } from './texts.js';
import {
  $, state, child, byId, todayNum, todayStr, render, renderPanel, showTab, applyTheme, THEME_NEXT,
  dialogHtml, renderDialogPhotos, rememberThumb, dropThumb, MS_TITLE, MS_AREA,
} from './ui.js';

const CATALOG_IDEA_IDS = new Set(IDEA_CATALOG.map(i => i.id));
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

// ---------- Hilfen ----------
function busy(text) { const b = $('busy'); b.textContent = text || ''; b.hidden = !text; }

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const blobToDataUrl = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => rej(f.error); f.readAsDataURL(b); });

async function saveSettings(patch) {
  state.settings = sanitizeSettings({ ...state.settings, ...patch });
  await Store.setMeta('settings', state.settings);
  applyTheme();
}

/** Ersetzt oder ergänzt Datensätze im Zustand und im Speicher */
async function upsert(collection, rec) {
  const list = state.data[collection];
  const i = list.findIndex(r => r.id === rec.id);
  if (i >= 0) list[i] = rec; else list.push(rec);
  await Store.put(collection, rec);
}
async function removeRecords(collection, ids) {
  if (!ids.length) return;
  const set = new Set(ids);
  state.data[collection] = state.data[collection].filter(r => !set.has(r.id));
  await Store.remove(collection, ids);
}
async function removePhotos(ids) {
  if (!ids.length) return;
  await removeRecords('photos', ids);
  await Store.remove('blobs', ids);
  ids.forEach(dropThumb);
}

// ---------- Fotos ----------
/** Verkleinert ein Bild auf PHOTO_MAX_PX (längste Seite) und speichert es als JPEG */
async function resizePhoto(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitSize(bmp.width, bmp.height, PHOTO_MAX_PX);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(bmp, 0, 0, width, height);
  bmp.close && bmp.close();
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) throw new Error('encode');
  return { blob, width, height };
}

// ---------- Dialog ----------
const dlg = { type: null, rec: null, photoIds: [], pending: new Map() };

function openDialog(type, rec, opts = {}) {
  dlg.type = type; dlg.rec = rec || null;
  dlg.photoIds = rec && rec.photoIds ? rec.photoIds.slice() : [];
  dlg.pending = new Map();
  $('dlgForm').innerHTML = dialogHtml(type, rec, opts);
  renderDialogPhotos(dlg.photoIds);
  $('dlg').showModal();
  const first = $('dlgForm').querySelector('input:not([type=file]), textarea, select');
  if (first && !rec) first.focus();
}

function closeDialog(discard) {
  if (discard) dlg.pending.forEach((_, id) => dropThumb(id));
  dlg.pending = new Map();
  $('dlg').close();
}

const val = name => { const el = $('dlgForm').elements[name]; return el ? el.value : ''; };

function fail(msg) { alert(msg); return false; }

async function saveDialog() {
  const c = child(), rec = dlg.rec, id = rec ? rec.id : newId();
  if (dlg.type === 'child') {
    const ch = sanitizeChild({ id, name: val('name'), birthDate: val('birthDate') });
    if (!ch) return fail('Bitte Name und Geburtsdatum angeben.');
    await upsert('children', ch);
    if (!rec) await saveSettings({ activeChildId: ch.id });
    return true;
  }
  if (dlg.type === 'idea') {
    const idea = sanitizeIdea({ id: rec ? rec.id : 'eigen-' + newId(), title: val('title'), kind: val('kind'), area: val('area'), fromMonth: val('fromMonth'), toMonth: val('toMonth'), material: val('material'), text: val('text') });
    if (!idea) return fail('Bitte einen Titel angeben.');
    await upsert('ideas', idea);
    return true;
  }
  if (dlg.type === 'measurement') {
    const m = sanitizeMeasurement({ id, childId: c.id, date: val('date'), heightCm: val('heightCm'), weightKg: val('weightKg') });
    if (!m) return fail('Bitte ein Datum und mindestens einen Wert angeben (Größe 30–200 cm, Gewicht 1–80 kg).');
    await upsert('measurements', m);
    return true;
  }
  // Tagebuch und Meilenstein haben Fotos
  const date = val('date');
  const rec2 = dlg.type === 'diary'
    ? sanitizeDiary({ id, childId: c.id, date, text: val('text'), photoIds: dlg.photoIds })
    : sanitizeMilestone({ id, childId: c.id, catalogId: val('catalogId') || null, title: val('title'), date, note: val('note'), photoIds: dlg.photoIds });
  if (!rec2) return fail(dlg.type === 'diary' ? 'Bitte ein Datum und Text oder ein Foto angeben.' : 'Bitte einen Meilenstein wählen oder einen eigenen Titel eingeben, und ein Datum.');
  if (rec2.catalogId) {
    const dup = state.data.milestones.find(m => m.childId === c.id && m.catalogId === rec2.catalogId && m.id !== rec2.id);
    if (dup) return fail('Dieser Meilenstein ist schon eingetragen. Du kannst ihn unter „Meilensteine“ ändern.');
  }
  for (const pid of rec2.photoIds) {
    const p = dlg.pending.get(pid);
    if (p) { await Store.putBlob(pid, p.blob); await upsert('photos', sanitizePhoto({ id: pid, childId: c.id, date, mime: 'image/jpeg', width: p.width, height: p.height })); }
    else { const meta = byId('photos', pid); if (meta && meta.date !== date) await upsert('photos', { ...meta, date }); }
  }
  dlg.pending.forEach((_, pid) => { if (!rec2.photoIds.includes(pid)) dropThumb(pid); });
  await upsert(dlg.type === 'diary' ? 'diary' : 'milestones', rec2);
  await removePhotos(orphanPhotos(state.data));
  return true;
}

async function deleteDialog() {
  const rec = dlg.rec;
  if (!rec) return;
  if (dlg.type === 'child') {
    if (!confirm(`${rec.name} mit allen Einträgen und Fotos löschen? Das lässt sich nicht rückgängig machen.`)) return;
    const own = dataOfChild(state.data, rec.id);
    for (const c of ['milestones', 'diary', 'measurements', 'ideaStates']) await removeRecords(c, own[c].map(r => r.id));
    await removePhotos(own.photos.map(p => p.id));
    await removeRecords('children', [rec.id]);
    if (state.settings.activeChildId === rec.id) await saveSettings({ activeChildId: state.data.children[0] ? state.data.children[0].id : null });
  } else {
    if (!confirm('Diesen Eintrag löschen?')) return;
    const coll = { diary: 'diary', milestone: 'milestones', measurement: 'measurements', idea: 'ideas' }[dlg.type];
    await removeRecords(coll, [rec.id]);
    if (dlg.type === 'idea') await removeRecords('ideaStates', state.data.ideaStates.filter(s => s.ideaId === rec.id).map(s => s.id));
    await removePhotos(orphanPhotos(state.data));
  }
  closeDialog(true);
  render();
}

// ---------- Export ----------
async function exportZip() {
  busy('Backup wird erstellt …');
  try {
    const today = todayStr(), now = new Date().toISOString(), enc = new TextEncoder();
    const files = [];
    for (const p of state.data.photos) {
      const blob = await Store.getBlob(p.id);
      if (blob) files.push({ name: photoFile(p), data: new Uint8Array(await blob.arrayBuffer()) });
    }
    for (const c of state.data.children) {
      const html = buildBook({ child: c, data: state.data, milestoneTitles: MS_TITLE, milestoneAreas: MS_AREA, photoSrc: photoFile, today });
      files.unshift({ name: bookFileName(c, today), data: enc.encode(html) });
    }
    files.push({ name: 'daten.json', data: enc.encode(JSON.stringify(buildBackup(state.data, state.settings, now), null, 1)) });
    files.push({ name: 'LIESMICH.txt', data: enc.encode(`Backup der Entwicklungs-App vom ${today}\n\n`
      + '- Entwicklungsbuch-…html: das Buch pro Kind. Im Browser öffnen, zum Drucken oder als PDF: Drucken im Browser.\n'
      + '- fotos/: alle Fotos als Bilddateien.\n'
      + '- daten.json: alle Daten für die Wiederherstellung in der App (Daten → Backup laden, die ZIP-Datei auswählen).\n') });
    download(new Blob([createZip(files, now)], { type: 'application/zip' }), `entwicklung-backup-${today}.zip`);
    await Store.setMeta('lastExport', today);
  } catch (e) {
    alert('Das Backup konnte nicht erstellt werden.');
  } finally { busy(''); }
}

async function singleBook() {
  const c = child(), today = todayStr();
  const urls = new Map();
  for (const p of state.data.photos.filter(x => x.childId === c.id)) {
    const blob = await Store.getBlob(p.id);
    if (blob) urls.set(p.id, await blobToDataUrl(blob));
  }
  const html = buildBook({ child: c, data: state.data, milestoneTitles: MS_TITLE, milestoneAreas: MS_AREA, photoSrc: p => urls.get(p.id) || '', today });
  return { html, name: bookFileName(c, today) };
}

async function exportBook() {
  busy('Buch wird erstellt …');
  try { const { html, name } = await singleBook(); download(new Blob([html], { type: 'text/html' }), name); } finally { busy(''); }
}

async function viewBook() {
  const win = window.open('', '_blank'); // vor dem Warten öffnen, sonst blockiert der Browser
  busy('Buch wird erstellt …');
  try {
    const { html } = await singleBook();
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    if (win) win.location.href = url; else location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } finally { busy(''); }
}

// ---------- Import ----------
async function importFile(file) {
  busy('Backup wird gelesen …');
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let json, zip = null;
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      try { zip = await readZip(bytes); } catch (e) { return alert(IMPORT_ERROR[e.message] || IMPORT_ERROR.not_zip); }
      const raw = zip.get('daten.json') || [...zip.entries()].find(([n]) => n.endsWith('/daten.json'))?.[1];
      if (!raw) return alert(IMPORT_ERROR.not_zip);
      try { json = JSON.parse(new TextDecoder().decode(raw)); } catch { return alert(IMPORT_ERROR.invalid_json); }
    } else {
      try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { return alert(IMPORT_ERROR.not_zip); }
    }
    const res = parseBackup(json, CATALOG_IDEA_IDS);
    if (!res.ok) return alert(IMPORT_ERROR[res.error]);
    // Fotos ohne Bilddatei (z. B. nur daten.json geladen) fallen weg
    const blobs = new Map();
    if (zip) for (const p of res.data.photos) { const b = zip.get(res.photoFiles[p.id] || photoFile(p)); if (b) blobs.set(p.id, new Blob([b], { type: p.mime })); }
    const data = sanitizeData({ ...res.data, photos: res.data.photos.filter(p => blobs.has(p.id)) }, CATALOG_IDEA_IDS);
    const lost = res.data.photos.length - data.photos.length;
    busy('');
    const counts = `${data.children.length} ${data.children.length === 1 ? 'Kind' : 'Kinder'}, ${data.milestones.length + data.diary.length + data.measurements.length} Einträge, ${data.photos.length} Fotos`;
    if (!confirm(`Backup laden (${counts})?${lost ? ` ${lost} Fotos fehlen in der Datei und werden ausgelassen.` : ''}\n\nAlle Daten auf diesem Gerät werden ersetzt.`)) return;
    busy('Backup wird geladen …');
    await Store.clearAll();
    for (const c of COLLECTIONS) await Store.putMany(c, data[c]);
    for (const [id, b] of blobs) if (data.photos.some(p => p.id === id)) await Store.putBlob(id, b);
    state.data.photos.forEach(p => dropThumb(p.id));
    state.data = data;
    const active = res.settings && data.children.some(c => c.id === res.settings.activeChildId) ? res.settings.activeChildId : data.children[0].id;
    await saveSettings({ activeChildId: active });
    render();
  } finally { busy(''); }
}

// ---------- Aktionen ----------
const ACTIONS = {
  'add-diary': () => openDialog('diary'),
  'add-milestone': el => openDialog('milestone', null, { catalogId: el.dataset.cat }),
  'add-measurement': () => openDialog('measurement'),
  'edit-entry': el => openDialog(el.dataset.type, byId({ milestone: 'milestones', diary: 'diary', measurement: 'measurements' }[el.dataset.type], el.dataset.id)),
  'add-child': () => openDialog('child'),
  'edit-child': el => openDialog('child', byId('children', el.dataset.id)),
  'add-idea': () => openDialog('idea'),
  'edit-idea': el => openDialog('idea', byId('ideas', el.dataset.id)),
  'idea-fav': el => toggleIdea(el.dataset.id, 'favorite'),
  'idea-done': el => toggleIdea(el.dataset.id, 'done'),
  'export-zip': exportZip,
  'export-book': exportBook,
  'view-book': viewBook,
  'import': () => $('importFile').click(),
  'demo': loadDemo,
  'wipe': wipe,
  'dlg-cancel': () => closeDialog(true),
  'dlg-delete': deleteDialog,
  'dlg-photo-remove': el => { dlg.photoIds = dlg.photoIds.filter(id => id !== el.dataset.id); renderDialogPhotos(dlg.photoIds); },
};

async function toggleIdea(ideaId, change) {
  const c = child();
  const cur = state.data.ideaStates.find(s => s.id === ideaStateId(c.id, ideaId));
  const next = toggleIdeaState(cur, c.id, ideaId, change, todayStr());
  if (next) await upsert('ideaStates', sanitizeIdeaState(next));
  else await removeRecords('ideaStates', [ideaStateId(c.id, ideaId)]);
  renderPanel(state.tab);
}

async function loadDemo() {
  const demo = makeDemo(todayNum(), MILESTONE_CATALOG, i => 'demo-' + i);
  if (state.data.children.some(c => c.id === demo.children[0].id)) { await saveSettings({ activeChildId: demo.children[0].id }); return render(); }
  for (const c of COLLECTIONS) for (const r of demo[c]) await upsert(c, r);
  await saveSettings({ activeChildId: demo.children[0].id });
  showTab('home');
  render();
}

async function wipe() {
  if (!confirm('Wirklich alle Kinder, Einträge und Fotos auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen. Vorher am besten ein Backup herunterladen.')) return;
  await Store.clearAll();
  state.data.photos.forEach(p => dropThumb(p.id));
  state.data = emptyData();
  await saveSettings({ activeChildId: null });
  render();
}

// ---------- Ereignisse ----------
function bind() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el && ACTIONS[el.dataset.act]) { e.preventDefault(); ACTIONS[el.dataset.act](el); }
  });

  $('dlgForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (await saveDialog()) { closeDialog(false); render(); }
  });
  $('dlg').addEventListener('cancel', () => { dlg.pending.forEach((_, id) => dropThumb(id)); dlg.pending = new Map(); });
  $('dlgForm').addEventListener('change', async e => {
    if (e.target.id === 'fCat') { const own = $('ownWrap'); own.hidden = !!e.target.value; if (!e.target.value) $('fTitle').focus(); }
    if (e.target.id === 'dlgFile') {
      const files = [...e.target.files]; e.target.value = '';
      busy('Fotos werden vorbereitet …');
      let failed = 0;
      for (const f of files) {
        try {
          const p = await resizePhoto(f), id = newId();
          dlg.pending.set(id, p); rememberThumb(id, p.blob); dlg.photoIds.push(id);
        } catch { failed++; }
      }
      busy('');
      renderDialogPhotos(dlg.photoIds);
      if (failed) alert(`${failed} ${failed === 1 ? 'Bild konnte' : 'Bilder konnten'} nicht gelesen werden.`);
    }
  });

  $('onboardForm').addEventListener('submit', async e => {
    e.preventDefault();
    const ch = sanitizeChild({ id: newId(), name: $('obName').value, birthDate: $('obBirth').value });
    if (!ch) return alert('Bitte Name und Geburtsdatum angeben.');
    await upsert('children', ch);
    await saveSettings({ activeChildId: ch.id });
    showTab('home');
    render();
  });
  $('obDemo').onclick = loadDemo;
  $('obImport').onclick = () => $('importFile').click();
  $('importFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); };

  $('childSel').onchange = async e => { await saveSettings({ activeChildId: e.target.value }); render(); };
  $('themeBtn').onclick = () => saveSettings({ theme: THEME_NEXT[state.settings.theme] });

  // Filter und Einstellungen in den Panels
  document.addEventListener('change', e => {
    const f = e.target.dataset.filter;
    if (f) {
      state.ideaFilter[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      renderPanel('ideas');
      const again = document.querySelector(`[data-filter="${f}"]${e.target.type === 'radio' ? `[value="${e.target.value}"]` : ''}`);
      if (again) again.focus();
    }
    if (e.target.dataset.setting === 'theme') saveSettings({ theme: e.target.value });
  });

  const tabs = [...document.querySelectorAll('[role=tab]')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => showTab(tab.id.slice(4)));
    tab.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      showTab(tabs[(i + d + tabs.length) % tabs.length].id.slice(4), true);
    });
  });

  // Rückkehr in die App: Alter und "heute" neu berechnen
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('dlg').open) render(); });
}

// ---------- Start ----------
(async function init() {
  await Store.open();
  const raw = {};
  for (const c of COLLECTIONS) raw[c] = await Store.all(c);
  state.data = sanitizeData(raw, CATALOG_IDEA_IDS);
  state.settings = sanitizeSettings(await Store.getMeta('settings'));
  if (!state.data.children.some(c => c.id === state.settings.activeChildId)) state.settings.activeChildId = state.data.children[0] ? state.data.children[0].id : null;
  applyTheme();
  bind();
  let tab = 'home';
  try { tab = localStorage.getItem('entwicklung-tab') || 'home'; } catch { /* egal */ }
  render();
  if (state.data.children.length) showTab(['home', 'log', 'ms', 'ideas', 'data'].includes(tab) ? tab : 'home');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
