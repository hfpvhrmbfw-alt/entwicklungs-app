/* Oberfläche: Zustand der Ansicht und Rendering. Ruft Logik und Speicher auf, nie umgekehrt.
   Aktionen (Speichern, Export, Import) stehen in main.js; Schaltflächen tragen dafür data-act. */

import { toNum, toStr, DAY_MS, emptyData, DEFAULT_SETTINGS, KINDS, AREAS } from './model.js';
import {
  effectiveAge, timeline, groupByLifeYear, growthSeries, milestoneOverview, upcomingMilestones, ideasFor, suggestIdeas,
  lastDoneMap, areaProgress, activitiesSince, weekDays,
} from './logic.js';
import { MILESTONE_CATALOG, IDEA_CATALOG, MATERIALS, SOURCES } from './catalog.js';
import { Store } from './storage.js';
import {
  AREA_LABEL, KIND_LABEL, PLACE_LABEL, GROUP_LABEL, PREP_LABEL, THEME_LABEL, STATUS_LABEL, WEEKDAY,
  NOTE_ORIENTATION, NOTE_CORRECTED, NOTE_DISCLAIMER,
} from './texts.js';
import { esc, fmtDate, fmtShort, ageText, rangeText, plural, cm, kg } from './format.js';
import { lineChart } from './book.js';

// ---------- Zeit ----------
/** Heute als Tagnummer in lokaler Zeit. Einzige Stelle, die die Uhr liest. */
export const todayNum = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS; };
export const todayStr = () => toStr(todayNum());

export const $ = id => document.getElementById(id);

// ---------- Zustand der Ansicht ----------
export const state = {
  data: emptyData(), settings: structuredClone(DEFAULT_SETTINGS), tab: 'home', shuffle: 0, weekOffset: 0, reasons: new Map(),
  ideaFilter: { kind: '', area: '', place: '', maxMinutes: 0, onlyHome: false, favoritesOnly: false, hideDone: false, allAges: false },
};
export const MS = new Map(MILESTONE_CATALOG.map(c => [c.id, c]));
export const MS_TITLE = new Map(MILESTONE_CATALOG.map(c => [c.id, c.title]));
export const MS_AREA = new Map(MILESTONE_CATALOG.map(c => [c.id, c.area]));
export const allIdeas = () => [...IDEA_CATALOG, ...state.data.ideas];
export const ideaById = id => allIdeas().find(i => i.id === id);
export const child = () => state.data.children.find(c => c.id === state.settings.activeChildId) || state.data.children[0] || null;
export const byId = (collection, id) => state.data[collection].find(r => r.id === id);
export const milestoneTitle = m => (m.catalogId ? MS_TITLE.get(m.catalogId) || 'Meilenstein' : m.title);
export const age = () => effectiveAge(child(), todayNum());
const ofChild = c => state.data[c].filter(r => r.childId === child().id);
export const favorites = () => new Set(ofChild('ideaStates').map(s => s.ideaId));
const ctx = () => ({ favorites: favorites(), lastDone: lastDoneMap(state.data.activities, child().id), home: new Set(state.settings.homeMaterials) });

/** Vorschläge für heute (oder einen anderen Tag) mit den Filtern von "Was passt heute?" */
export function suggestions(count = 3, extra = {}) {
  const c = child(), t = state.settings.today;
  return suggestIdeas({
    ideas: allIdeas(), milestoneCatalog: MILESTONE_CATALOG, achieved: ofChild('milestones'), activities: state.data.activities,
    childId: c.id, favorites: favorites(), home: new Set(state.settings.homeMaterials), months: age().months, today: todayNum(),
    filter: { maxMinutes: t.maxMinutes, place: t.place, onlyHome: t.onlyHome }, count, seed: todayNum() + state.shuffle * 101, ...extra,
  });
}

// ---------- Bausteine ----------
let sectionNo = 0;
const label = t => `<h2 class="label"><span class="no">№ ${String(++sectionNo).padStart(2, '0')}</span> — ${t}</h2>`;
const kpi = (cap, v, sub = '', cls = '') => `<div class="kpi"><div class="cap">${cap}</div><div class="v ${cls}">${v}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const btn = (act, text, attrs = '', cls = 'btn sm') => `<button type="button" class="${cls}" data-act="${act}" ${attrs}>${text}</button>`;
const minutesText = m => (m ? `${m} Min.` : '');

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

/** Begründung eines Vorschlags als Text */
export function reasonText(r) {
  if (!r) return '';
  if (r.type === 'milestone') return `Passt zu „${MS_TITLE.get(r.milestoneId)}“, gerade typisch`;
  if (r.type === 'balance') return `${AREA_LABEL[r.area]} kam in den letzten 4 Wochen kurz`;
  if (r.type === 'favorite') return 'Von dir gemerkt';
  return 'Passt zum Alter';
}

// ---------- Ideen ----------
function ideaCard(idea, opts = {}) {
  const fav = favorites().has(idea.id), last = lastDoneMap(state.data.activities, child().id).get(idea.id);
  const own = !idea.id.startsWith('k-');
  return `<article class="card idea${opts.reason ? ' suggested' : ''}">
    ${opts.reason ? `<div class="reason cap">${esc(reasonText(opts.reason))}</div>` : ''}
    <div class="tags"><span class="tag inv">${esc(KIND_LABEL[idea.kind])}</span><span class="tag">${esc(AREA_LABEL[idea.area])}</span>${idea.minutes ? `<span class="tag muted">${minutesText(idea.minutes)}</span>` : ''}${idea.place === 'draussen' ? '<span class="tag muted">Draußen</span>' : ''}${own ? '<span class="tag acc">Eigene</span>' : ''}</div>
    <h3><button type="button" class="linkish" data-act="view-idea" data-id="${esc(idea.id)}">${esc(idea.title)}</button></h3>
    ${idea.learns ? `<p><b class="cap">Das lernt dein Kind</b> ${esc(idea.learns)}</p>` : idea.text ? `<p>${esc(idea.text.slice(0, 160))}</p>` : ''}
    ${last ? `<div class="cap muted">Zuletzt gemacht am ${esc(fmtShort(last))}</div>` : ''}
    <div class="actions">
      ${btn('view-idea', 'So geht’s', `data-id="${esc(idea.id)}"`, 'btn sm primary')}
      ${btn('idea-fav', fav ? 'Gemerkt' : 'Merken', `data-id="${esc(idea.id)}" aria-pressed="${fav}"`)}
      ${btn('idea-done', 'Gemacht', `data-id="${esc(idea.id)}"`)}
      ${state.settings.weekPlan ? btn('idea-plan', 'Einplanen', `data-id="${esc(idea.id)}"`) : ''}
    </div>
  </article>`;
}

/** Ausführliche Ansicht einer Idee (im Dialog) */
export function ideaDetailHtml(idea, reason) {
  const fav = favorites().has(idea.id), last = lastDoneMap(state.data.activities, child().id).get(idea.id);
  const own = !idea.id.startsWith('k-');
  const facts = [
    idea.minutes ? ['Dauer', `etwa ${idea.minutes} Minuten`] : null,
    ['Ort', PLACE_LABEL[idea.place]],
    ['Vorbereitung', PREP_LABEL[idea.prep]],
    idea.group.length ? ['Für', idea.group.map(g => GROUP_LABEL[g]).join(', ')] : null,
    ['Alter', rangeText(idea.fromMonth, idea.toMonth)],
  ].filter(Boolean);
  return `<div class="tags"><span class="tag inv">${esc(KIND_LABEL[idea.kind])}</span><span class="tag">${esc(AREA_LABEL[idea.area])}</span>${own ? '<span class="tag acc">Eigene</span>' : ''}</div>
    <h2 id="dlgTitle">${esc(idea.title)}</h2>
    ${reason ? `<div class="reason cap">${esc(reasonText(reason))}</div>` : ''}
    <dl class="facts">${facts.map(([k, v]) => `<div><dt class="cap">${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${idea.material ? `<div class="detail"><h3 class="cap">Material</h3><p>${esc(idea.material)}</p></div>` : ''}
    ${idea.steps.length ? `<div class="detail"><h3 class="cap">So geht’s</h3><ol class="steps">${idea.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
    ${idea.text ? `<div class="detail"><h3 class="cap">Beschreibung</h3><p class="pre">${esc(idea.text)}</p></div>` : ''}
    ${idea.learns ? `<div class="detail"><h3 class="cap">Das lernt dein Kind dabei</h3><p>${esc(idea.learns)}</p></div>` : ''}
    ${idea.why ? `<div class="detail"><h3 class="cap">Warum das die Entwicklung fördert</h3><p>${esc(idea.why)}</p>${idea.principle ? `<p class="principle">${esc(idea.principle)}</p>` : ''}</div>` : ''}
    ${idea.easier || idea.harder ? `<div class="detail vary">${idea.easier ? `<div><h3 class="cap">Leichter</h3><p>${esc(idea.easier)}</p></div>` : ''}${idea.harder ? `<div><h3 class="cap">Schwerer</h3><p>${esc(idea.harder)}</p></div>` : ''}</div>` : ''}
    ${idea.safety ? `<div class="note warn"><span class="cap">Sicherheit</span>${esc(idea.safety)}</div>` : ''}
    ${last ? `<p class="cap muted">Zuletzt gemacht am ${esc(fmtShort(last))}</p>` : ''}
    <div class="foot"><div class="right left">
      ${btn('idea-done', 'Gemacht', `data-id="${esc(idea.id)}"`, 'btn primary')}
      ${btn('idea-fav', fav ? 'Gemerkt' : 'Merken', `data-id="${esc(idea.id)}" aria-pressed="${fav}"`, 'btn')}
      ${state.settings.weekPlan ? btn('idea-plan', 'Einplanen', `data-id="${esc(idea.id)}"`, 'btn') : ''}
      ${own ? btn('edit-idea', 'Bearbeiten', `data-id="${esc(idea.id)}"`, 'btn') : ''}
      ${btn('dlg-cancel', 'Schließen', '', 'btn')}
    </div></div>`;
}

// ---------- Einträge ----------
function entryHtml(it, c, withActions = true) {
  const meta = `<div class="meta"><span class="cap">${esc(fmtDate(it.date))} · ${esc(ageText(c.birthDate, it.date))}</span>`;
  const act = (type, id) => (withActions ? `<div class="actions">${btn('edit-entry', 'Bearbeiten', `data-type="${type}" data-id="${esc(id)}"`)}</div>` : '');
  if (it.type === 'milestone') {
    const m = byId('milestones', it.id);
    return `<article class="entry">${meta}<span class="tag acc">Meilenstein</span></div><h3>${esc(milestoneTitle(m))}</h3>${m.note.trim() ? `<p>${esc(m.note)}</p>` : ''}${thumbs(m.photoIds)}${act('milestone', m.id)}</article>`;
  }
  if (it.type === 'activity') {
    const a = byId('activities', it.id), idea = ideaById(a.ideaId);
    return `<article class="entry">${meta}<span class="tag">Gemacht</span>${idea ? `<span class="tag">${esc(AREA_LABEL[idea.area])}</span>` : ''}</div><h3><button type="button" class="linkish" data-act="view-idea" data-id="${esc(a.ideaId)}">${esc(idea ? idea.title : 'Idee')}</button></h3>${a.note.trim() ? `<p>${esc(a.note)}</p>` : ''}${thumbs(a.photoIds)}${act('activity', a.id)}</article>`;
  }
  if (it.type === 'diary') {
    const d = byId('diary', it.id);
    return `<article class="entry">${meta}<span class="tag">Tagebuch</span></div>${d.text.trim() ? `<p>${esc(d.text)}</p>` : ''}${thumbs(d.photoIds)}${act('diary', d.id)}</article>`;
  }
  const m = byId('measurements', it.id);
  const parts = [m.heightCm !== null ? cm(m.heightCm) : '', m.weightKg !== null ? kg(m.weightKg) : ''].filter(Boolean).join(' · ');
  return `<article class="entry">${meta}<span class="tag">Messung</span></div><p>${esc(parts)}</p>${act('measurement', m.id)}</article>`;
}

const addButtons = () => `<div class="actions">${btn('add-diary', 'Tagebuch', '', 'btn primary')}${btn('add-milestone', 'Meilenstein', '', 'btn')}${btn('add-measurement', 'Messung', '', 'btn')}</div>`;

/** Kommende Meilensteine mit Fördertipp und passenden Ideen */
function upcomingHtml(ids) {
  const c = child();
  return ids.map(id => {
    const m = MS.get(id);
    const ideas = m.ideas.map(ideaById).filter(i => i && age().months >= i.fromMonth - 3 && age().months <= i.toMonth);
    return `<div class="ms next"><div class="t"><b>${esc(m.title)}</b><span class="cap">${esc(AREA_LABEL[m.area])} · meist mit ${esc(rangeText(m.fromMonth, m.toMonth))}</span>
      <p class="tip"><b class="cap">So kannst du unterstützen</b> ${esc(m.tip)}</p>
      ${ideas.length ? `<div class="chiplinks">${ideas.map(i => btn('view-idea', esc(i.title), `data-id="${esc(i.id)}"`, 'btn sm')).join('')}</div>` : ''}</div>
      ${btn('add-milestone', 'Kann es schon', `data-cat="${id}"`, 'btn sm ghost')}</div>`;
  }).join('') || `<p class="empty">Gerade steht kein Meilenstein aus der Liste an. ${c ? 'Unter „Entwicklung“ siehst du alle Bereiche.' : ''}</p>`;
}

// ---------- Panels ----------
function renderHome() {
  const c = child(), t = todayNum(), a = age(), f = state.settings.today;
  sectionNo = 0;
  const sug = suggestions(3);
  state.reasons = new Map(sug.map(s => [s.id, s.reason]));
  const up = upcomingMilestones(MILESTONE_CATALOG, ofChild('milestones'), a.months, 3);
  const prog = areaProgress(MILESTONE_CATALOG, ofChild('milestones'), state.data.activities, new Map(allIdeas().map(i => [i.id, i])), c.id, a.months, t);
  const maxRecent = Math.max(1, ...prog.map(p => p.recent));
  const recent = timeline(state.data, c.id).slice(0, 3);
  const ageTxt = ageText(c.birthDate, todayStr());
  const radio = (name, value, text, on) => `<label class="chip"><input type="radio" name="${name}" value="${value}" data-today="${name}"${on ? ' checked' : ''}><span>${esc(text)}</span></label>`;
  const today = todayStr();
  const planToday = state.settings.weekPlan ? ofChild('plan').filter(p => p.date >= today).sort((x, y) => (x.date < y.date ? -1 : 1)).slice(0, 3) : [];
  $('p-home').innerHTML = `
    <div class="grid kpis">
      ${kpi(a.isCorrected ? 'Korrigiertes Alter' : 'Alter', esc(a.isCorrected ? (a.corrected ? ageText(c.dueDate, today) : 'vor dem Termin') : ageTxt.split(', ')[0]), esc(a.isCorrected ? `tatsächlich ${ageTxt}` : (ageTxt.split(', ')[1] || '')), 'acc')}
      ${kpi('Diese Woche', activitiesSince(state.data.activities, c.id, t, 7), 'Ideen gemacht')}
      ${kpi('Insgesamt', ofChild('activities').length, 'Ideen gemacht')}
      ${kpi('Meilensteine', ofChild('milestones').length, 'eingetragen')}
    </div>
    <section class="section" style="margin-top:var(--s6)">${label('Was passt heute?')}
      <div class="filters">
        <div class="chips" role="radiogroup" aria-label="Zeit">${radio('maxMinutes', 0, 'Zeit egal', !f.maxMinutes)}${radio('maxMinutes', 10, 'Bis 10 Min.', f.maxMinutes === 10)}${radio('maxMinutes', 20, 'Bis 20 Min.', f.maxMinutes === 20)}</div>
        <div class="chips" role="radiogroup" aria-label="Ort">${radio('place', '', 'Ort egal', !f.place)}${radio('place', 'drinnen', 'Drinnen', f.place === 'drinnen')}${radio('place', 'draussen', 'Draußen', f.place === 'draussen')}</div>
        <div class="chips"><label class="chip"><input type="checkbox" data-today="onlyHome"${f.onlyHome ? ' checked' : ''}><span>Nur mit Material von zu Hause</span></label>${btn('edit-materials', `Material zu Hause (${state.settings.homeMaterials.length})`, '', 'btn sm')}</div>
      </div>
    </section>
    <section class="section">${label('Ideen für heute')}
      ${sug.length ? `<div class="grid ideas">${sug.map(s => ideaCard(ideaById(s.id), { reason: s.reason })).join('')}</div>
        <div class="actions">${btn('reshuffle', 'Andere Vorschläge', '', 'btn')}${btn('goto-ideas', 'Alle Ideen', '', 'btn')}</div>`
        : `<p class="empty">Keine Idee passt zu dieser Auswahl. Lockere die Filter oben${f.onlyHome ? ' oder trag mehr Material ein' : ''}.</p>`}
    </section>
    ${state.settings.weekPlan ? `<section class="section">${label('Eingeplant')}
      ${planToday.length ? planToday.map(p => { const i = ideaById(p.ideaId); return `<div class="row${p.date === today ? ' prio' : ''}"><span><b>${p.date === today ? 'Heute' : esc(WEEKDAY[(new Date(toNum(p.date) * DAY_MS).getUTCDay() + 6) % 7])}</b> · <button type="button" class="linkish" data-act="view-idea" data-id="${esc(p.ideaId)}">${esc(i ? i.title : 'Idee')}</button></span></div>`; }).join('') : '<p class="empty">Für die nächsten Tage ist nichts eingeplant.</p>'}
      <div class="actions">${btn('goto-week', 'Zum Wochenplan', '', 'btn')}</div></section>` : ''}
    <section class="section">${label('Als Nächstes in der Entwicklung')}
      ${a.isCorrected ? `<div class="note info"><span class="cap">Frühchen</span>${esc(NOTE_CORRECTED)}</div>` : ''}
      ${upcomingHtml(up)}
      <div class="note info"><span class="cap">Orientierung</span>${esc(NOTE_ORIENTATION)}</div>
    </section>
    <section class="section">${label('Gefördert in den letzten 4 Wochen')}
      <div class="bars-h">${prog.map(p => `<div class="bh"><span class="bh-l">${esc(AREA_LABEL[p.area])}</span><span class="bh-bar" aria-hidden="true"><i style="width:${Math.round(p.recent / maxRecent * 100)}%"></i></span><span class="bh-v">${plural(p.recent, 'Idee', 'Ideen')}</span>${btn('ideas-area', 'Ideen', `data-area="${p.area}" aria-label="Ideen für ${esc(AREA_LABEL[p.area])}"`)}</div>`).join('')}</div>
      <p class="muted small">Jeder Bereich zählt, keiner muss gleich oft vorkommen. Die Vorschläge achten von selbst auf Abwechslung.</p>
    </section>
    <section class="section">${label('Zuletzt')}
      ${recent.length ? recent.map(it => entryHtml(it, c)).join('') : '<p class="empty">Noch keine Einträge. Wenn du eine Idee gemacht hast, tippe auf „Gemacht“.</p>'}
      ${addButtons()}
    </section>`;
  hydrateThumbs($('p-home'));
}

function renderIdeas() {
  const c = child(), f = state.ideaFilter;
  sectionNo = 0;
  const list = ideasFor(allIdeas(), ctx(), age().months, f);
  const chip = (name, value, text, checked) => `<label class="chip"><input type="radio" name="f-${name}" value="${value}" data-filter="${name}"${checked ? ' checked' : ''}><span>${esc(text)}</span></label>`;
  const box = (name, text) => `<label class="chip"><input type="checkbox" data-filter="${name}"${f[name] ? ' checked' : ''}><span>${esc(text)}</span></label>`;
  $('p-ideas').innerHTML = `
    <div class="filters" role="group" aria-label="Ideen filtern">
      <div class="chips" role="radiogroup" aria-label="Bereich">${chip('area', '', 'Alle Bereiche', !f.area)}${AREAS.map(a => chip('area', a, AREA_LABEL[a], f.area === a)).join('')}</div>
      <div class="chips" role="radiogroup" aria-label="Art">${chip('kind', '', 'Alle Arten', !f.kind)}${KINDS.map(k => chip('kind', k, KIND_LABEL[k], f.kind === k)).join('')}</div>
      <div class="chips">${chip('place', '', 'Ort egal', !f.place)}${chip('place', 'drinnen', 'Drinnen', f.place === 'drinnen')}${chip('place', 'draussen', 'Draußen', f.place === 'draussen')}
        ${chip('maxMinutes', 0, 'Zeit egal', !f.maxMinutes)}${chip('maxMinutes', 10, 'Bis 10 Min.', f.maxMinutes === 10)}${chip('maxMinutes', 20, 'Bis 20 Min.', f.maxMinutes === 20)}</div>
      <div class="chips">${box('favoritesOnly', 'Nur gemerkte')}${box('hideDone', 'Noch nie gemacht')}${box('onlyHome', 'Material von zu Hause')}${box('allAges', 'Alle Altersstufen')}${btn('edit-materials', `Material zu Hause (${state.settings.homeMaterials.length})`, '', 'btn sm')}</div>
    </div>
    <p class="count cap">${plural(list.length, 'Idee', 'Ideen')}${f.allAges ? '' : ` für ${esc(ageText(age().isCorrected && age().corrected ? c.dueDate : c.birthDate, todayStr()))}${age().isCorrected ? ' (korrigiert)' : ''}`}</p>
    ${list.length ? `<div class="grid ideas">${list.map(r => ideaCard(r.idea)).join('')}</div>` : '<p class="empty">Keine Idee passt zu diesem Filter.</p>'}
    <div class="actions" style="margin-top:var(--s5)">${btn('add-idea', 'Eigene Idee hinzufügen', '', 'btn')}</div>`;
}

function renderWeek() {
  const c = child(), t = todayNum();
  sectionNo = 0;
  const days = weekDays(t + state.weekOffset * 7);
  const plan = ofChild('plan');
  const acts = ofChild('activities');
  const range = `${fmtShort(days[0])} – ${fmtShort(days[6])}`;
  $('p-week').innerHTML = `
    <div class="calhead">${btn('week-prev', '‹ Vorige', 'aria-label="Vorige Woche"', 'btn sm')}<h3>${state.weekOffset === 0 ? 'Diese Woche' : esc(range)}</h3>${btn('week-next', 'Nächste ›', 'aria-label="Nächste Woche"', 'btn sm')}</div>
    <p class="cap muted center">${esc(range)}</p>
    <div class="actions">${btn('week-fill', 'Woche füllen', 'aria-label="Freie Tage mit Vorschlägen füllen"', 'btn primary')}</div>
    ${days.map((d, i) => {
      const items = plan.filter(p => p.date === d);
      const past = toNum(d) < t;
      return `<section class="day-block${toNum(d) === t ? ' is-today' : ''}"><div class="part cap">${WEEKDAY[i]} · ${esc(fmtShort(d))}${toNum(d) === t ? ' · heute' : ''}</div>
        ${items.map(p => {
          const idea = ideaById(p.ideaId), done = acts.some(a => a.ideaId === p.ideaId && a.date === d);
          return `<div class="ms${done ? ' done' : ''}"><div class="t"><button type="button" class="linkish" data-act="view-idea" data-id="${esc(p.ideaId)}"><b>${esc(idea ? idea.title : 'Idee')}</b></button><span class="cap">${idea ? `${esc(AREA_LABEL[idea.area])}${idea.minutes ? ' · ' + minutesText(idea.minutes) : ''}` : ''}</span></div>
            ${done ? '<span class="tag inv">Gemacht</span>' : btn('plan-done', 'Gemacht', `data-id="${esc(p.id)}"`)}${btn('plan-remove', 'Entfernen', `data-id="${esc(p.id)}"`, 'btn sm ghost')}</div>`;
        }).join('') || `<p class="empty">${past ? 'Nichts eingeplant.' : 'Noch frei.'}</p>`}
        ${past ? '' : `<div class="actions">${btn('plan-suggest', items.length ? 'Noch eine Idee' : 'Vorschlag für diesen Tag', `data-date="${d}"`, 'btn sm')}</div>`}
      </section>`;
    }).join('')}`;
}

function renderDev() {
  const c = child(), a = age();
  sectionNo = 0;
  const achieved = ofChild('milestones');
  const ov = milestoneOverview(MILESTONE_CATALOG, achieved, a.months);
  const up = upcomingMilestones(MILESTONE_CATALOG, achieved, a.months, 6, 2);
  const tagCls = { done: 'tag inv', now: 'tag acc', later: 'tag muted', open: 'tag muted' };
  $('p-dev').innerHTML = `
    <div class="note info"><span class="cap">Orientierung</span>${esc(NOTE_ORIENTATION)}</div>
    ${a.isCorrected ? `<div class="note info"><span class="cap">Frühchen</span>${esc(NOTE_CORRECTED)} Korrigiert ${esc(a.corrected ? ageText(c.dueDate, todayStr()) : 'noch vor dem Termin')}.</div>` : ''}
    <section class="section">${label('Als Nächstes')}${upcomingHtml(up)}</section>
    <section class="section">${label('Alle Bereiche')}
    ${ov.areas.map(ar => {
      const done = ar.items.filter(i => i.status === 'done').length, now = ar.items.filter(i => i.status === 'now').length;
      return `<details class="msarea"${now ? ' open' : ''}><summary>${AREA_LABEL[ar.area]}<span class="cnt">${done} von ${ar.items.length}${now ? ` · ${now} gerade typisch` : ''}</span></summary><div>
      ${ar.items.map(it => `<div class="ms${it.status === 'done' ? ' done' : ''}"><div class="t"><b>${esc(MS_TITLE.get(it.id))}</b><span class="cap">${it.date ? `Am ${esc(fmtShort(it.date))} · mit ${esc(ageText(c.birthDate, it.date))}` : `Meist mit ${esc(rangeText(it.fromMonth, it.toMonth))}${MS.get(it.id).source === 'who' ? ' · WHO' : ''}`}</span>
        ${it.status === 'now' ? `<p class="tip">${esc(MS.get(it.id).tip)}</p>` : ''}</div>
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

function renderLog() {
  const c = child();
  sectionNo = 0;
  const items = timeline(state.data, c.id);
  const g = growthSeries(state.data.measurements, c.id, c.birthDate);
  const meas = ofChild('measurements').sort((a, b) => (a.date > b.date ? -1 : 1));
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
        </tbody></table></div>` : '<p class="empty">Noch keine Messungen. Größe und Gewicht kannst du über „Messung“ eintragen, zum Beispiel nach der U-Untersuchung.</p>'}
    </section>`;
  hydrateThumbs($('p-log'));
}

async function renderData() {
  sectionNo = 0;
  const d = state.data;
  let persisted = '';
  if (navigator.storage && navigator.storage.persisted) { try { persisted = (await navigator.storage.persisted()) ? ' · dauerhaft geschützt' : ' · Browser darf bei Speichermangel aufräumen'; } catch { /* egal */ } }
  $('p-data').innerHTML = `
    <section class="section">${label('Kinder')}
      ${d.children.map(c => `<div class="ms"><div class="t"><b>${esc(c.name)}</b><span class="cap">Geboren am ${esc(fmtDate(c.birthDate))} · ${esc(ageText(c.birthDate, todayStr()))}${c.dueDate ? ` · Termin war ${esc(fmtShort(c.dueDate))}` : ''}</span></div>${btn('edit-child', 'Ändern', `data-id="${esc(c.id)}"`)}</div>`).join('')}
      <div class="actions">${btn('add-child', 'Weiteres Kind anlegen', '', 'btn')}</div>
    </section>
    <section class="section">${label('Export')}
      <p>Das <b>Backup</b> ist eine ZIP-Datei mit einem Entwicklungsbuch pro Kind (HTML, öffnet in jedem Browser und lässt sich als PDF drucken, z. B. für die U-Untersuchung), allen Fotos als JPG und den Daten für die Wiederherstellung.</p>
      <div class="actions">${btn('export-zip', 'Backup herunterladen (ZIP)', '', 'btn primary')}${btn('export-book', `Buch von ${esc(child().name)} als eine Datei`, '', 'btn')}${btn('view-book', 'Buch ansehen', '', 'btn')}</div>
    </section>
    <section class="section">${label('Import')}
      <p>Stellt ein Backup wieder her. <b>Ersetzt alle Daten auf diesem Gerät.</b></p>
      <div class="actions">${btn('import', 'Backup laden', '', 'btn')}</div>
    </section>
    <section class="section">${label('Einstellungen')}
      <div class="settings">
        <div class="field"><label class="cap" for="setTheme">Farbschema</label><select id="setTheme" data-setting="theme">${['auto', 'light', 'dark'].map(t => `<option value="${t}"${state.settings.theme === t ? ' selected' : ''}>${THEME_LABEL[t]}</option>`).join('')}</select></div>
        <div class="field"><span class="cap">Wochenplan</span><label class="chip"><input type="checkbox" data-setting="weekPlan"${state.settings.weekPlan ? ' checked' : ''}><span>Wochenplan anzeigen</span></label></div>
      </div>
      <div class="actions">${btn('edit-materials', `Material zu Hause (${state.settings.homeMaterials.length})`, '', 'btn')}</div>
      <p class="cap muted">${plural(d.children.length, 'Kind', 'Kinder')} · ${plural(d.photos.length, 'Foto', 'Fotos')} · ${Store.ls ? 'localStorage' : 'IndexedDB'}${persisted}</p>
      <div class="actions">${btn('demo', 'Beispieldaten laden', '', 'btn')}${btn('wipe', 'Alles löschen', '', 'btn danger')}</div>
    </section>
    <section class="section">${label('Hinweise und Quellen')}
      <div class="note warn"><span class="cap">Hinweis</span>${esc(NOTE_DISCLAIMER)}</div>
      <p>${esc(NOTE_ORIENTATION)} ${esc(NOTE_CORRECTED)}</p>
      <p>Jede Idee nennt, was sie fördert und welches entwicklungspsychologische Prinzip dahintersteht. Die Zeitfenster für Sitzen, Krabbeln, Stehen und Gehen stammen aus der WHO Motor Development Study, die übrigen sind gerundete Orientierungswerte, angelehnt an die folgenden Übersichten.</p>
      <ul class="sources">${SOURCES.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    </section>`;
}

// ---------- Kopf und Gesamtansicht ----------
function renderHead() {
  const c = child();
  const sel = $('childSel');
  sel.hidden = state.data.children.length < 2;
  sel.innerHTML = state.data.children.map(k => `<option value="${esc(k.id)}"${c && k.id === c.id ? ' selected' : ''}>${esc(k.name)}</option>`).join('');
  $('tab-week').hidden = !state.settings.weekPlan;
  const sep = '<span class="sep">·</span>';
  if (!c) {
    $('heroTitle').textContent = 'Entwicklung';
    $('heroSub').innerHTML = `Fördern${sep}Begleiten${sep}Festhalten`;
    $('heroLede').textContent = 'Altersgerechte Ideen, die die Entwicklung deines Kindes gezielt unterstützen: Spiele, Bewegung, Basteln, Sprache und Alltag, jeweils mit Anleitung und Begründung.';
    $('heroLede').hidden = false;
    return;
  }
  const a = age();
  $('heroTitle').textContent = c.name;
  $('heroSub').innerHTML = `${esc(ageText(c.birthDate, todayStr()))}${a.isCorrected ? `${sep}korrigiert ${esc(a.corrected ? ageText(c.dueDate, todayStr()) : 'vor dem Termin')}` : ''}${sep}Geboren am ${esc(fmtShort(c.birthDate))}`;
  $('heroLede').hidden = true;
}

export function render() {
  const has = state.data.children.length > 0;
  $('onboard').hidden = has;
  $('app').hidden = !has;
  renderHead();
  $('footInfo').textContent = fmtDate(todayStr());
  if (!has) return;
  if (state.tab === 'week' && !state.settings.weekPlan) state.tab = 'home';
  showTab(state.tab);
}

export function renderPanel(name) {
  if (name === 'home') renderHome();
  if (name === 'ideas') renderIdeas();
  if (name === 'week') renderWeek();
  if (name === 'dev') renderDev();
  if (name === 'log') renderLog();
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
const field = (id, labelText, input, hint = '') => `<div class="field"><label class="cap" for="${id}">${labelText}</label>${input}${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
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
  const dateField = (v, label = 'Datum') => field('fDate', label, `<input id="fDate" name="date" type="date" required value="${esc(v || today)}" max="${today}">`);
  if (type === 'diary') {
    return `<h2 id="dlgTitle">${rec ? 'Tagebucheintrag' : 'Neuer Tagebucheintrag'}</h2>${dateField(d.date)}
      ${field('fText', 'Was ist passiert?', `<textarea id="fText" name="text" rows="5" maxlength="5000">${esc(d.text || '')}</textarea>`)}
      ${photoField()}${foot(!!rec)}`;
  }
  if (type === 'activity') {
    const idea = ideaById(d.ideaId || opts.ideaId);
    return `<h2 id="dlgTitle">Gemacht: ${esc(idea ? idea.title : 'Idee')}</h2>${dateField(d.date || (opts.date && opts.date <= today ? opts.date : today))}
      ${field('fNote', 'Wie war’s?', `<textarea id="fNote" name="note" rows="3" maxlength="5000" placeholder="Was hat gut geklappt, was war schwer, was hat Spaß gemacht?">${esc(d.note || '')}</textarea>`, 'Optional. Landet mit Datum im Tagebuch.')}
      ${photoField()}${foot(!!rec, rec ? 'Speichern' : 'Eintragen')}`;
  }
  if (type === 'plan') {
    const idea = ideaById(opts.ideaId), t = todayNum();
    const days = Array.from({ length: 14 }, (_, i) => toStr(t + i));
    return `<h2 id="dlgTitle">Einplanen: ${esc(idea ? idea.title : 'Idee')}</h2>
      ${field('fPlanDate', 'An welchem Tag?', `<select id="fPlanDate" name="date">${days.map((x, i) => `<option value="${x}">${i === 0 ? 'Heute' : i === 1 ? 'Morgen' : WEEKDAY[(new Date(toNum(x) * DAY_MS).getUTCDay() + 6) % 7]}, ${esc(fmtShort(x))}</option>`).join('')}</select>`)}
      ${foot(false, 'Einplanen')}`;
  }
  if (type === 'materials') {
    const have = new Set(state.settings.homeMaterials);
    return `<h2 id="dlgTitle">Material zu Hause</h2>
      <p class="hint">Was hast du meistens da? Mit „Nur mit Material von zu Hause“ zeigt die App dann nur Ideen, für die alles vorhanden ist.</p>
      <div class="chips">${Object.entries(MATERIALS).map(([id, l]) => `<label class="chip"><input type="checkbox" name="mat" value="${id}"${have.has(id) ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
      ${foot(false)}`;
  }
  if (type === 'milestone') {
    const cat = d.catalogId || (opts.catalogId && opts.catalogId !== '__own' ? opts.catalogId : '');
    const own = opts.catalogId === '__own' || (rec && !rec.catalogId);
    const options = AREAS.map(a => `<optgroup label="${AREA_LABEL[a]}">${MILESTONE_CATALOG.filter(c => c.area === a).map(c => `<option value="${c.id}"${c.id === cat ? ' selected' : ''}>${esc(c.title)}</option>`).join('')}</optgroup>`).join('');
    return `<h2 id="dlgTitle">${rec ? 'Meilenstein' : 'Neuer Meilenstein'}</h2>
      ${field('fCat', 'Meilenstein', `<select id="fCat" name="catalogId"><option value="">Eigener Meilenstein …</option>${options}</select>`)}
      <div id="ownWrap"${own || !cat ? '' : ' hidden'}>${field('fTitle', 'Eigener Titel', `<input id="fTitle" name="title" maxlength="120" value="${esc(d.title || '')}" placeholder="z. B. Erstes Mal im Schnee">`)}</div>
      ${dateField(d.date)}
      ${field('fNote', 'Notiz', `<textarea id="fNote" name="note" rows="3" maxlength="5000">${esc(d.note || '')}</textarea>`)}
      ${photoField()}${foot(!!rec)}`;
  }
  if (type === 'measurement') {
    return `<h2 id="dlgTitle">${rec ? 'Messung' : 'Neue Messung'}</h2>${dateField(d.date)}
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
      ${field('fDue', 'Errechneter Termin (nur bei Frühgeburt)', `<input id="fDue" name="dueDate" type="date" value="${esc(d.dueDate || '')}">`, 'Dann rechnet die App bis zum 2. Geburtstag mit dem korrigierten Alter.')}
      ${rec ? '<p class="hint">Löschen entfernt das Kind mit allen Einträgen und Fotos.</p>' : ''}${foot(!!rec)}`;
  }
  if (type === 'idea') {
    const m = age().months;
    return `<h2 id="dlgTitle">${rec ? 'Eigene Idee' : 'Neue eigene Idee'}</h2>
      ${field('fTitle', 'Titel', `<input id="fTitle" name="title" required maxlength="120" value="${esc(d.title || '')}">`)}
      <div class="row2">
        ${field('fKind', 'Art', `<select id="fKind" name="kind">${KINDS.map(k => `<option value="${k}"${d.kind === k ? ' selected' : ''}>${KIND_LABEL[k]}</option>`).join('')}</select>`)}
        ${field('fArea', 'Bereich', `<select id="fArea" name="area">${AREAS.map(a => `<option value="${a}"${d.area === a ? ' selected' : ''}>${AREA_LABEL[a]}</option>`).join('')}</select>`)}
      </div>
      <div class="row2">
        ${field('fFrom', 'Ab Monat', `<input id="fFrom" name="fromMonth" type="number" min="0" max="216" value="${d.fromMonth ?? Math.max(0, m - 3)}">`)}
        ${field('fTo', 'Bis Monat', `<input id="fTo" name="toMonth" type="number" min="0" max="216" value="${d.toMonth ?? m + 12}">`)}
        ${field('fMin', 'Dauer in Minuten', `<input id="fMin" name="minutes" type="number" min="0" max="240" value="${d.minutes || ''}">`)}
        ${field('fPlace', 'Ort', `<select id="fPlace" name="place">${['beides', 'drinnen', 'draussen'].map(p => `<option value="${p}"${(d.place || 'beides') === p ? ' selected' : ''}>${PLACE_LABEL[p]}</option>`).join('')}</select>`)}
      </div>
      ${field('fMaterial', 'Material', `<input id="fMaterial" name="material" maxlength="300" value="${esc(d.material || '')}">`)}
      ${field('fIdeaText', 'Beschreibung', `<textarea id="fIdeaText" name="text" rows="4" maxlength="5000">${esc(d.text || '')}</textarea>`)}
      ${field('fLearns', 'Das lernt dein Kind dabei', `<input id="fLearns" name="learns" maxlength="600" value="${esc(d.learns || '')}">`)}
      ${foot(!!rec)}`;
  }
  return '';
}

