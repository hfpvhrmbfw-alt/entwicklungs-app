/* Oberfläche: Zustand der Ansicht und Rendering. Ruft Logik und Speicher auf, nie umgekehrt.
   Aktionen (Speichern, Export, Import) stehen in main.js; Schaltflächen tragen dafür data-act. */

import { toStr, DAY_MS, emptyData, DEFAULT_SETTINGS, KINDS, AREAS } from './model.js';
import { ageAt, ageMonths, timeline, groupByLifeYear, growthSeries, childStats, milestoneOverview, upcomingMilestones, ideasFor, ideasOfTheDay } from './logic.js';
import { MILESTONE_CATALOG, IDEA_CATALOG } from './catalog.js';
import { Store } from './storage.js';
import { AREA_LABEL, KIND_LABEL, THEME_LABEL, STATUS_LABEL, NOTE_ORIENTATION } from './texts.js';
import { esc, fmtDate, fmtShort, ageText, rangeText, plural, cm, kg } from './format.js';
import { lineChart } from './book.js';

// ---------- Zeit ----------
/** Heute als Tagnummer in lokaler Zeit. Einzige Stelle, die die Uhr liest. */
export const todayNum = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS; };
export const todayStr = () => toStr(todayNum());

export const $ = id => document.getElementById(id);

// ---------- Zustand der Ansicht ----------
export const state = {
  data: emptyData(), settings: { ...DEFAULT_SETTINGS }, tab: 'home',
  ideaFilter: { kind: '', area: '', favoritesOnly: false, hideDone: false, allAges: false },
};
export const MS_TITLE = new Map(MILESTONE_CATALOG.map(c => [c.id, c.title]));
export const MS_AREA = new Map(MILESTONE_CATALOG.map(c => [c.id, c.area]));
export const allIdeas = () => [...IDEA_CATALOG, ...state.data.ideas];
export const child = () => state.data.children.find(c => c.id === state.settings.activeChildId) || state.data.children[0] || null;
export const byId = (collection, id) => state.data[collection].find(r => r.id === id);
export const milestoneTitle = m => (m.catalogId ? MS_TITLE.get(m.catalogId) || 'Meilenstein' : m.title);
const months = () => { const c = child(); return c ? ageMonths(c.birthDate, todayNum()) : 0; };

// ---------- Bausteine ----------
let sectionNo = 0;
const label = t => `<h2 class="label"><span class="no">№ ${String(++sectionNo).padStart(2, '0')}</span> — ${t}</h2>`;
const kpi = (cap, v, sub = '', cls = '') => `<div class="kpi"><div class="cap">${cap}</div><div class="v ${cls}">${v}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const btn = (act, text, attrs = '', cls = 'btn sm') => `<button type="button" class="${cls}" data-act="${act}" ${attrs}>${text}</button>`;

/** Vorschaubilder: Quelle wird nachgeladen (hydrateThumbs) */
export const thumbs = ids => (ids.length ? `<div class="thumbs">${ids.map(id => { const p = byId('photos', id); return p ? `<div class="th"><img data-photo="${esc(id)}" alt="Foto vom ${esc(fmtDate(p.date))}" loading="lazy"></div>` : ''; }).join('')}</div>` : '');

const urlCache = new Map();
/** Lädt Bilddaten für alle img[data-photo] im Container als Object-URL */
export async function hydrateThumbs(root) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const id = img.dataset.photo;
    if (!urlCache.has(id)) {
      const blob = await Store.getBlob(id);
      if (!blob) continue;
      urlCache.set(id, URL.createObjectURL(blob));
    }
    img.src = urlCache.get(id);
  }
}
export function dropThumb(id) { if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); } }
export function rememberThumb(id, blob) { dropThumb(id); urlCache.set(id, URL.createObjectURL(blob)); }

// ---------- Einträge ----------
function entryHtml(it, c, withActions = true) {
  const meta = `<div class="meta"><span class="cap">${esc(fmtDate(it.date))} · ${esc(ageText(c.birthDate, it.date))}</span>`;
  const act = withActions ? `<div class="actions">${btn('edit-entry', 'Bearbeiten', `data-type="${it.type}" data-id="${esc(it.id)}"`)}</div>` : '';
  if (it.type === 'milestone') {
    const m = byId('milestones', it.id);
    return `<article class="entry">${meta}<span class="tag acc">Meilenstein</span></div><h3>${esc(milestoneTitle(m))}</h3>${m.note.trim() ? `<p>${esc(m.note)}</p>` : ''}${thumbs(m.photoIds)}${act}</article>`;
  }
  if (it.type === 'diary') {
    const d = byId('diary', it.id);
    return `<article class="entry">${meta}<span class="tag">Tagebuch</span></div>${d.text.trim() ? `<p>${esc(d.text)}</p>` : ''}${thumbs(d.photoIds)}${act}</article>`;
  }
  const m = byId('measurements', it.id);
  const parts = [m.heightCm !== null ? cm(m.heightCm) : '', m.weightKg !== null ? kg(m.weightKg) : ''].filter(Boolean).join(' · ');
  return `<article class="entry">${meta}<span class="tag">Messung</span></div><p>${esc(parts)}</p>${act}</article>`;
}

const addButtons = () => `<div class="actions">${btn('add-diary', 'Tagebuch', '', 'btn primary')}${btn('add-milestone', 'Meilenstein', '', 'btn')}${btn('add-measurement', 'Messung', '', 'btn')}</div>`;

// ---------- Ideen ----------
function ideaCard(r) {
  const i = r.idea, own = !i.id.startsWith('k-');
  return `<article class="card${r.doneDate ? ' done' : ''}">
    <div class="tags"><span class="tag inv">${KIND_LABEL[i.kind]}</span><span class="tag">${AREA_LABEL[i.area]}</span><span class="tag muted">${esc(rangeText(i.fromMonth, i.toMonth))}</span>${own ? '<span class="tag acc">Eigene</span>' : ''}</div>
    <h3>${esc(i.title)}</h3>
    ${i.text ? `<p>${esc(i.text)}</p>` : ''}
    ${i.material ? `<div class="material"><b>Material</b>${esc(i.material)}</div>` : ''}
    ${r.doneDate ? `<div class="cap muted">Gemacht am ${esc(fmtShort(r.doneDate))}</div>` : ''}
    <div class="actions">
      ${btn('idea-fav', r.favorite ? 'Favorit' : 'Merken', `data-id="${esc(i.id)}" aria-pressed="${r.favorite}"`)}
      ${btn('idea-done', r.doneDate ? 'Gemacht' : 'Als gemacht markieren', `data-id="${esc(i.id)}" aria-pressed="${!!r.doneDate}"`)}
      ${own ? btn('edit-idea', 'Bearbeiten', `data-id="${esc(i.id)}"`) : ''}
    </div>
  </article>`;
}

// ---------- Panels ----------
function renderHome() {
  const c = child(), t = todayNum(), mo = months(), st = childStats(state.data, c.id);
  const a = ageAt(c.birthDate, t);
  sectionNo = 0;
  const up = upcomingMilestones(MILESTONE_CATALOG, state.data.milestones.filter(m => m.childId === c.id), mo);
  const states = state.data.ideaStates.filter(s => s.childId === c.id);
  const today = ideasOfTheDay(allIdeas(), states, mo, t).map(id => ideasFor(allIdeas(), states, mo, { allAges: true }).find(r => r.idea.id === id));
  const recent = timeline(state.data, c.id).slice(0, 3);
  const age = ageText(c.birthDate, todayStr());
  $('p-home').innerHTML = `
    <div class="grid kpis">
      ${kpi('Alter', esc(age.split(', ')[0]), esc(age.split(', ')[1] || (a ? plural(a.totalDays, 'Tag', 'Tage') + ' alt' : '')), 'acc')}
      ${kpi('Meilensteine', st.milestones)}
      ${kpi('Tagebuch', st.diary, plural(st.diary, 'Eintrag', 'Einträge'))}
      ${kpi('Fotos', st.photos)}
    </div>
    <section class="section" style="margin-top:var(--s6)">${label('Eintragen')}${addButtons()}</section>
    <section class="section">${label('Gerade typisch')}
      ${up.length ? up.map(id => `<div class="ms"><div class="t"><b>${esc(MS_TITLE.get(id))}</b><span class="cap">${esc(AREA_LABEL[MS_AREA.get(id)])} · meist mit ${esc(rangeText(...rangeOf(id)))}</span></div>${btn('add-milestone', 'Eintragen', `data-cat="${id}"`)}</div>`).join('')
        : '<p class="empty">Im Moment liegt kein Meilenstein aus der Liste im typischen Zeitfenster.</p>'}
      <div class="note info"><span class="cap">Orientierung</span>${esc(NOTE_ORIENTATION)}</div>
    </section>
    <section class="section">${label('Ideen für heute')}
      ${today.length ? `<div class="grid">${today.map(ideaCard).join('')}</div>` : '<p class="empty">Alle passenden Ideen sind gemacht. Unter „Ideen“ findest du mehr.</p>'}
    </section>
    <section class="section">${label('Zuletzt')}
      ${recent.length ? recent.map(it => entryHtml(it, c)).join('') : '<p class="empty">Noch keine Einträge. Fang mit einem Tagebucheintrag oder Meilenstein an.</p>'}
    </section>`;
  hydrateThumbs($('p-home'));
}
const rangeOf = id => { const m = MILESTONE_CATALOG.find(x => x.id === id); return [m.fromMonth, m.toMonth]; };

function renderLog() {
  const c = child();
  sectionNo = 0;
  const items = timeline(state.data, c.id);
  const g = growthSeries(state.data.measurements, c.id, c.birthDate);
  const meas = state.data.measurements.filter(m => m.childId === c.id).sort((a, b) => (a.date > b.date ? -1 : 1));
  const fig = (pts, name, f) => (pts.length >= 2 ? `<figure class="chart">${lineChart(pts, name, f)}<figcaption><b>Abb.</b>${esc(name)}</figcaption></figure>` : '');
  const groups = groupByLifeYear(items, c.birthDate);
  $('p-log').innerHTML = `
    ${addButtons()}
    <section class="section" style="margin-top:var(--s5)">${label('Zeitstrahl')}
      ${groups.length ? groups.map(gr => `<div class="part cap">${gr.year < 0 ? 'Vor der Geburt' : `${gr.year + 1}. Lebensjahr`} · ${plural(gr.items.length, 'Eintrag', 'Einträge')}</div>${gr.items.map(it => entryHtml(it, c)).join('')}`).join('')
        : '<p class="empty">Noch keine Einträge.</p>'}
    </section>
    <section class="section">${label('Wachstum')}
      ${meas.length ? `<div class="charts">${fig(g.height, 'Größe in cm', cm)}${fig(g.weight, 'Gewicht in kg', kg)}</div>
        <div class="table-scroll"><table class="data"><thead><tr><th>Datum</th><th>Alter</th><th class="num">Größe</th><th class="num">Gewicht</th><th></th></tr></thead><tbody>
        ${meas.map(m => `<tr><td>${esc(fmtShort(m.date))}</td><td>${esc(ageText(c.birthDate, m.date))}</td><td class="num">${m.heightCm !== null ? cm(m.heightCm) : '–'}</td><td class="num">${m.weightKg !== null ? kg(m.weightKg) : '–'}</td><td>${btn('edit-entry', 'Ändern', `data-type="measurement" data-id="${esc(m.id)}"`)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="empty">Noch keine Messungen. Größe und Gewicht kannst du über „Messung“ eintragen, zum Beispiel nach der Vorsorgeuntersuchung.</p>'}
    </section>`;
  hydrateThumbs($('p-log'));
}

function renderMilestones() {
  const c = child();
  sectionNo = 0;
  const achieved = state.data.milestones.filter(m => m.childId === c.id);
  const ov = milestoneOverview(MILESTONE_CATALOG, achieved, months());
  const tagCls = { done: 'tag inv', now: 'tag acc', later: 'tag muted', open: 'tag muted' };
  $('p-ms').innerHTML = `
    <div class="note info"><span class="cap">Orientierung</span>${esc(NOTE_ORIENTATION)}</div>
    <section class="section">${label('Aus der Liste')}
    ${ov.areas.map(a => {
      const done = a.items.filter(i => i.status === 'done').length, now = a.items.filter(i => i.status === 'now').length;
      return `<details class="msarea"${now ? ' open' : ''}><summary>${AREA_LABEL[a.area]}<span class="cnt">${done} von ${a.items.length} eingetragen${now ? ` · ${now} gerade typisch` : ''}</span></summary><div>
      ${a.items.map(it => `<div class="ms${it.status === 'done' ? ' done' : ''}"><div class="t"><b>${esc(MS_TITLE.get(it.id))}</b><span class="cap">${it.date ? `Am ${esc(fmtShort(it.date))} · mit ${esc(ageText(c.birthDate, it.date))}` : `Meist mit ${esc(rangeText(it.fromMonth, it.toMonth))}`}</span></div>
        ${it.status === 'done' ? '' : `<span class="${tagCls[it.status]}">${STATUS_LABEL[it.status]}</span>`}
        ${it.milestoneId ? btn('edit-entry', 'Ändern', `data-type="milestone" data-id="${esc(it.milestoneId)}"`) : btn('add-milestone', 'Eintragen', `data-cat="${it.id}"`)}</div>`).join('')}
      </div></details>`;
    }).join('')}
    </section>
    <section class="section">${label('Eigene Meilensteine')}
      ${ov.custom.map(id => { const m = byId('milestones', id); return `<div class="ms done"><div class="t"><b>${esc(m.title)}</b><span class="cap">Am ${esc(fmtShort(m.date))} · mit ${esc(ageText(c.birthDate, m.date))}</span></div>${btn('edit-entry', 'Ändern', `data-type="milestone" data-id="${esc(id)}"`)}</div>`; }).join('') || '<p class="empty">Hier landet alles, was nicht in der Liste steht: der erste Zoo-Besuch, das erste Mal Fahrrad.</p>'}
      <div class="actions">${btn('add-milestone', 'Eigenen Meilenstein eintragen', 'data-cat="__own"', 'btn')}</div>
    </section>`;
}

function renderIdeas() {
  const c = child(), f = state.ideaFilter;
  sectionNo = 0;
  const states = state.data.ideaStates.filter(s => s.childId === c.id);
  const list = ideasFor(allIdeas(), states, months(), f);
  const chip = (name, value, text, checked) => `<label class="chip"><input type="radio" name="${name}" value="${value}" data-filter="${name}"${checked ? ' checked' : ''}><span>${esc(text)}</span></label>`;
  const box = (name, text) => `<label class="chip"><input type="checkbox" data-filter="${name}"${f[name] ? ' checked' : ''}><span>${esc(text)}</span></label>`;
  $('p-ideas').innerHTML = `
    <div class="filters" role="group" aria-label="Ideen filtern">
      <div class="chips" role="radiogroup" aria-label="Art">${chip('kind', '', 'Alle Arten', !f.kind)}${KINDS.map(k => chip('kind', k, KIND_LABEL[k], f.kind === k)).join('')}</div>
      <div class="chips" role="radiogroup" aria-label="Bereich">${chip('area', '', 'Alle Bereiche', !f.area)}${AREAS.map(a => chip('area', a, AREA_LABEL[a], f.area === a)).join('')}</div>
      <div class="chips">${box('favoritesOnly', 'Nur Favoriten')}${box('hideDone', 'Gemachte ausblenden')}${box('allAges', 'Alle Altersstufen')}</div>
    </div>
    <p class="count cap">${plural(list.length, 'Idee', 'Ideen')}${f.allAges ? '' : ` für ${esc(ageText(c.birthDate, todayStr()))}`}</p>
    ${list.length ? `<div class="grid">${list.map(ideaCard).join('')}</div>` : '<p class="empty">Keine Idee passt zu diesem Filter.</p>'}
    <div class="actions" style="margin-top:var(--s5)">${btn('add-idea', 'Eigene Idee hinzufügen', '', 'btn')}</div>`;
}

async function renderData() {
  sectionNo = 0;
  const d = state.data;
  let persisted = '';
  if (navigator.storage && navigator.storage.persisted) { try { persisted = (await navigator.storage.persisted()) ? ' · dauerhaft geschützt' : ' · Browser darf bei Speichermangel aufräumen'; } catch { /* egal */ } }
  $('p-data').innerHTML = `
    <section class="section">${label('Kinder')}
      ${d.children.map(c => `<div class="ms"><div class="t"><b>${esc(c.name)}</b><span class="cap">Geboren am ${esc(fmtDate(c.birthDate))} · ${esc(ageText(c.birthDate, todayStr()))}</span></div>${btn('edit-child', 'Ändern', `data-id="${esc(c.id)}"`)}</div>`).join('')}
      <div class="actions">${btn('add-child', 'Weiteres Kind anlegen', '', 'btn')}</div>
    </section>
    <section class="section">${label('Export')}
      <p>Das <b>Backup</b> ist eine ZIP-Datei mit einem Entwicklungsbuch pro Kind (HTML, öffnet in jedem Browser und lässt sich als PDF drucken), allen Fotos als JPG und den Daten für die Wiederherstellung.</p>
      <div class="actions">${btn('export-zip', 'Backup herunterladen (ZIP)', '', 'btn primary')}${btn('export-book', `Buch von ${esc(child().name)} als eine Datei`, '', 'btn')}${btn('view-book', 'Buch ansehen', '', 'btn')}</div>
    </section>
    <section class="section">${label('Import')}
      <p>Stellt ein Backup wieder her. <b>Ersetzt alle Daten auf diesem Gerät.</b></p>
      <div class="actions">${btn('import', 'Backup laden', '', 'btn')}</div>
    </section>
    <section class="section">${label('Einstellungen')}
      <div class="settings"><div class="field"><label class="cap" for="setTheme">Farbschema</label><select id="setTheme" data-setting="theme">${['auto', 'light', 'dark'].map(t => `<option value="${t}"${state.settings.theme === t ? ' selected' : ''}>${THEME_LABEL[t]}</option>`).join('')}</select></div></div>
      <p class="cap muted">${plural(d.children.length, 'Kind', 'Kinder')} · ${plural(d.photos.length, 'Foto', 'Fotos')} · ${Store.ls ? 'localStorage' : 'IndexedDB'}${persisted}</p>
      <div class="actions">${btn('demo', 'Beispieldaten laden', '', 'btn')}${btn('wipe', 'Alles löschen', '', 'btn danger')}</div>
    </section>`;
}

// ---------- Kopf und Gesamtansicht ----------
function renderHead() {
  const c = child();
  const sel = $('childSel');
  sel.hidden = state.data.children.length < 2;
  sel.innerHTML = state.data.children.map(k => `<option value="${esc(k.id)}"${c && k.id === c.id ? ' selected' : ''}>${esc(k.name)}</option>`).join('');
  const sep = '<span class="sep">·</span>';
  if (!c) {
    $('heroTitle').textContent = 'Entwicklung';
    $('heroSub').innerHTML = `Meilensteine${sep}Tagebuch${sep}Ideen`;
    $('heroLede').textContent = 'Halte fest, was dein Kind Neues kann, und finde Spiele, Bastel- und Bewegungsideen, die zum Alter passen.';
    return;
  }
  $('heroTitle').textContent = c.name;
  $('heroSub').innerHTML = `${esc(ageText(c.birthDate, todayStr()))}${sep}Geboren am ${esc(fmtShort(c.birthDate))}`;
  $('heroLede').textContent = '';
  $('heroLede').hidden = true;
}

export function render() {
  const has = state.data.children.length > 0;
  $('onboard').hidden = has;
  $('app').hidden = !has;
  renderHead();
  $('footInfo').textContent = fmtDate(todayStr());
  if (!has) { $('heroLede').hidden = false; return; }
  renderPanel(state.tab);
}

export function renderPanel(name) {
  if (name === 'home') renderHome();
  if (name === 'log') renderLog();
  if (name === 'ms') renderMilestones();
  if (name === 'ideas') renderIdeas();
  if (name === 'data') renderData();
}

export function showTab(name, focus) {
  document.querySelectorAll('[role=tab]').forEach(tab => {
    const on = tab.id === 'tab-' + name;
    tab.setAttribute('aria-selected', on); tab.tabIndex = on ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) tab.focus();
  });
  state.tab = name;
  try { localStorage.setItem('entwicklung-tab', name); } catch { /* egal */ }
  renderPanel(name);
}

// ---------- Theme ----------
export const THEME_NEXT = { auto: 'dark', dark: 'light', light: 'auto' };
export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('entwicklung-theme', t); } catch { /* egal */ }
  const forced = { light: '#E3DAD3', dark: '#1D1916' }[t];
  $('tcLight').content = forced || '#E3DAD3';
  $('tcDark').content = forced || '#1D1916';
  $('themeBtn').textContent = 'Farbe: ' + THEME_LABEL[t];
  $('themeBtn').setAttribute('aria-label', `Farbschema: ${THEME_LABEL[t]}. Wechseln zu ${THEME_LABEL[THEME_NEXT[t]]}`);
}

// ---------- Dialog-Formulare ----------
const field = (id, labelText, input) => `<div class="field"><label class="cap" for="${id}">${labelText}</label>${input}</div>`;
const foot = (canDelete, saveText = 'Speichern') => `<div class="foot">${canDelete ? btn('dlg-delete', 'Löschen', '', 'btn danger') : '<span></span>'}<div class="right">${btn('dlg-cancel', 'Abbrechen', '', 'btn')}<button type="submit" class="btn primary">${saveText}</button></div></div>`;
const photoField = () => `<div class="field"><span class="cap">Fotos</span><div id="dlgPhotos"></div><div class="actions"><label class="btn filebtn">Fotos hinzufügen<input type="file" id="dlgFile" accept="image/*" multiple></label></div><p class="hint">Fotos werden verkleinert und nur auf diesem Gerät gespeichert.</p></div>`;

/** Fotos im Dialog (gespeicherte und neu ausgewählte) */
export function renderDialogPhotos(ids) {
  const box = $('dlgPhotos');
  if (!box) return;
  box.innerHTML = ids.length ? `<div class="thumbs">${ids.map(id => `<div class="th"><img data-photo="${esc(id)}" alt="Foto"><button type="button" data-act="dlg-photo-remove" data-id="${esc(id)}" aria-label="Foto entfernen">✕</button></div>`).join('')}</div>` : '';
  hydrateThumbs(box);
}

/**
 * Formular für einen Dialog. rec = bestehender Datensatz oder null (neu).
 * @returns {string} HTML
 */
export function dialogHtml(type, rec, opts = {}) {
  const d = rec || {};
  const today = todayStr();
  if (type === 'diary') {
    return `<h2 id="dlgTitle">${rec ? 'Tagebucheintrag' : 'Neuer Tagebucheintrag'}</h2>
      ${field('fDate', 'Datum', `<input id="fDate" name="date" type="date" required value="${esc(d.date || today)}" max="${today}">`)}
      ${field('fText', 'Was ist passiert?', `<textarea id="fText" name="text" rows="5" maxlength="5000">${esc(d.text || '')}</textarea>`)}
      ${photoField()}${foot(!!rec)}`;
  }
  if (type === 'milestone') {
    const cat = d.catalogId || (opts.catalogId && opts.catalogId !== '__own' ? opts.catalogId : '');
    const own = opts.catalogId === '__own' || (rec && !rec.catalogId);
    const options = AREAS.map(a => `<optgroup label="${AREA_LABEL[a]}">${MILESTONE_CATALOG.filter(c => c.area === a).map(c => `<option value="${c.id}"${c.id === cat ? ' selected' : ''}>${esc(c.title)}</option>`).join('')}</optgroup>`).join('');
    return `<h2 id="dlgTitle">${rec ? 'Meilenstein' : 'Neuer Meilenstein'}</h2>
      ${field('fCat', 'Meilenstein', `<select id="fCat" name="catalogId"><option value="">Eigener Meilenstein …</option>${options}</select>`)}
      <div id="ownWrap"${own || !cat ? '' : ' hidden'}>${field('fTitle', 'Eigener Titel', `<input id="fTitle" name="title" maxlength="120" value="${esc(d.title || '')}" placeholder="z. B. Erstes Mal im Schnee">`)}</div>
      ${field('fDate', 'Datum', `<input id="fDate" name="date" type="date" required value="${esc(d.date || today)}" max="${today}">`)}
      ${field('fNote', 'Notiz', `<textarea id="fNote" name="note" rows="3" maxlength="5000">${esc(d.note || '')}</textarea>`)}
      ${photoField()}${foot(!!rec)}`;
  }
  if (type === 'measurement') {
    return `<h2 id="dlgTitle">${rec ? 'Messung' : 'Neue Messung'}</h2>
      ${field('fDate', 'Datum', `<input id="fDate" name="date" type="date" required value="${esc(d.date || today)}" max="${today}">`)}
      <div class="row2">
        ${field('fHeight', 'Größe in cm', `<input id="fHeight" name="heightCm" inputmode="decimal" value="${d.heightCm != null ? String(d.heightCm).replace('.', ',') : ''}" placeholder="z. B. 74,5">`)}
        ${field('fWeight', 'Gewicht in kg', `<input id="fWeight" name="weightKg" inputmode="decimal" value="${d.weightKg != null ? String(d.weightKg).replace('.', ',') : ''}" placeholder="z. B. 9,2">`)}
      </div>
      <p class="hint">Mindestens einen Wert eintragen.</p>${foot(!!rec)}`;
  }
  if (type === 'child') {
    return `<h2 id="dlgTitle">${rec ? 'Kind ändern' : 'Kind anlegen'}</h2>
      ${field('fName', 'Name', `<input id="fName" name="name" required maxlength="60" value="${esc(d.name || '')}" autocomplete="off">`)}
      ${field('fBirth', 'Geburtsdatum', `<input id="fBirth" name="birthDate" type="date" required value="${esc(d.birthDate || '')}" max="${today}">`)}
      ${rec ? '<p class="hint">Löschen entfernt das Kind mit allen Einträgen und Fotos.</p>' : ''}${foot(!!rec)}`;
  }
  if (type === 'idea') {
    return `<h2 id="dlgTitle">${rec ? 'Eigene Idee' : 'Neue eigene Idee'}</h2>
      ${field('fTitle', 'Titel', `<input id="fTitle" name="title" required maxlength="120" value="${esc(d.title || '')}">`)}
      <div class="row2">
        ${field('fKind', 'Art', `<select id="fKind" name="kind">${KINDS.map(k => `<option value="${k}"${d.kind === k ? ' selected' : ''}>${KIND_LABEL[k]}</option>`).join('')}</select>`)}
        ${field('fArea', 'Bereich', `<select id="fArea" name="area">${AREAS.map(a => `<option value="${a}"${d.area === a ? ' selected' : ''}>${AREA_LABEL[a]}</option>`).join('')}</select>`)}
      </div>
      <div class="row2">
        ${field('fFrom', 'Ab Monat', `<input id="fFrom" name="fromMonth" type="number" min="0" max="216" value="${d.fromMonth ?? Math.max(0, months() - 3)}">`)}
        ${field('fTo', 'Bis Monat', `<input id="fTo" name="toMonth" type="number" min="0" max="216" value="${d.toMonth ?? months() + 12}">`)}
      </div>
      ${field('fMaterial', 'Material', `<input id="fMaterial" name="material" maxlength="300" value="${esc(d.material || '')}">`)}
      ${field('fIdeaText', 'Beschreibung', `<textarea id="fIdeaText" name="text" rows="4" maxlength="5000">${esc(d.text || '')}</textarea>`)}
      ${foot(!!rec)}`;
  }
  return '';
}
