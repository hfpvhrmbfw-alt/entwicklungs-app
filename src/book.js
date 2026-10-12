/* Entwicklungsbuch: eine eigenständige HTML-Seite pro Kind, lesbar ohne App, druckbar als PDF.
   Gehört zur Oberfläche (baut Text und HTML), braucht aber kein DOM: liefert einen String. */

import { timeline, growthSeries, groupByLifeYear, childStats, effectiveAge } from './logic.js';
import { toNum } from './model.js';
import { esc, fmtDate, fmtShort, ageText, plural, cm, kg, dec } from './format.js';
import { AREA_LABEL } from './texts.js';

const CSS = `
:root{--bg:#F2E8C9;--surface:#FBF6E6;--sunken:#E8DCB5;--line:#D9CB9E;--ink:#1E1A2E;--muted:#544C68;--faint:#958C9F;--accent:#6B3FD4;--accent-text:#5630B0;--accent-ink:#FFFFFF;--label-no:#F2E8C9;
--serif:"Bricolage Grotesque",system-ui,sans-serif;--sans:"Nunito",system-ui,sans-serif;--mono:"Space Mono",ui-monospace,monospace;--maxw:880px;--gutter:clamp(16px,4vw,40px);color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#1A1726;--surface:#242036;--sunken:#2F2A45;--line:#433C5E;--ink:#F1EBDA;--muted:#B9B0CC;--faint:#7D7592;--accent-text:#C3B0FF;color-scheme:dark}}
*{box-sizing:border-box}html,body{background:var(--bg)}body{margin:0;color:var(--ink);font:16px/1.55 var(--sans);-webkit-font-smoothing:antialiased}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 var(--gutter)}
.cap{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.runhead{border-bottom:2px solid var(--accent)}.runhead .wrap{display:flex;justify-content:space-between;gap:16px;min-height:48px;align-items:center;flex-wrap:wrap}
.hero{padding:48px 0 0}.hero h1{font:700 clamp(40px,8vw,72px)/1 var(--serif);letter-spacing:-.02em;margin:0;border-left:10px solid var(--accent);padding-left:18px}
.hero .subtitle{margin:12px 0 0 28px}.hero .subtitle .sep{color:var(--faint);padding:0 .6em}
.rule-heavy{border:0;border-top:4px solid var(--ink);margin:32px 0 32px}
.kpis{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:48px}
.kpi{border-top:1px solid var(--line);padding-top:8px}.kpi .cap{color:var(--muted)}.kpi .v{font:700 36px/1.1 var(--serif)}.kpi .v.acc{color:var(--accent)}.kpi .sub{color:var(--muted);font-size:14px}
.section{border-bottom:2px solid var(--ink);padding-bottom:16px;margin:0 0 48px}
.label{display:inline-block;background:var(--accent);color:var(--accent-ink);font:600 16px/1.2 var(--mono);letter-spacing:.04em;padding:9px 14px;margin:0 0 12px}.label .no{color:var(--label-no)}.label{border-radius:6px}.hero h1{font-weight:800}
.part{border-top:4px solid var(--ink);margin:40px 0 16px;padding-top:8px;color:var(--muted)}
.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--surface)}
th{text-align:left;font:600 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;border-bottom:2px solid var(--ink);padding:12px 14px}
td{border-bottom:1px solid var(--line);padding:12px 14px;vertical-align:top}td.num{text-align:right;font-family:var(--mono);white-space:nowrap}td.date{font-family:var(--mono);font-size:14px;white-space:nowrap}
.tag{font:500 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--ink);padding:4px 6px;white-space:nowrap;display:inline-block}.tag.acc{border-color:var(--accent-text);color:var(--accent-text)}
.entry{border-bottom:1px solid var(--line);padding:16px 0;break-inside:avoid}.entry:last-child{border-bottom:0}
.entry .meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px}.entry .meta .cap{color:var(--muted)}
.entry h3{font:700 22px/1.25 var(--serif);margin:0 0 4px}.entry p{margin:0;white-space:pre-wrap}
.photos{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-top:12px}
.photos figure{margin:0}.photos img{display:block;width:100%;height:auto;border:1px solid var(--line);background:var(--sunken)}
.charts{display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin:8px 0 24px}
.chart{margin:0}.chart figcaption{font:12px/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);padding:8px 0}.chart figcaption b{color:var(--ink);margin-right:8px}
.chart svg{display:block;width:100%;height:auto;background:var(--surface);border:1px solid var(--line)}
.chart .ax{stroke:var(--ink);stroke-width:2}.chart .grid{stroke:var(--line);stroke-width:1}.chart .ln{fill:none;stroke:var(--accent);stroke-width:2.5}.chart .pt{fill:var(--accent)}
.chart text{font:11px var(--mono);fill:var(--muted)}
.note{border-left:4px solid var(--accent);background:var(--sunken);padding:14px 18px;margin:12px 0 16px;color:var(--muted)}
.empty{color:var(--muted);margin:8px 0}
footer{border-top:2px solid var(--accent);margin-top:64px;padding:18px 0 40px;color:var(--muted)}
@media print{:root{--bg:#fff;--surface:#fff;--sunken:#f3efec;--line:#ccc;--ink:#111;--muted:#444;--accent-text:#5630B0;color-scheme:light}
.hero{padding-top:0}.section{break-inside:auto}.part:not(.first){break-before:page}.entry,.chart,tr{break-inside:avoid}a{color:inherit;text-decoration:none}}
`;

/** Liniendiagramm als SVG-String (Alter in Monaten auf der x-Achse). */
export function lineChart(points, unitLabel, format) {
  const W = 360, H = 230, L = 44, R = 12, T = 14, B = 42;
  if (!points.length) return '';
  const xs = points.map(p => p.months), ys = points.map(p => p.value);
  const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 1);
  const pad = (Math.max(...ys) - Math.min(...ys)) * 0.1 || 1;
  const y0 = Math.floor(Math.min(...ys) - pad), y1 = Math.ceil(Math.max(...ys) + pad);
  const sx = v => L + (v - x0) / (x1 - x0) * (W - L - R), sy = v => H - B - (v - y0) / (y1 - y0) * (H - T - B);
  const ticks = (a, b, n) => { const step = Math.max(1, Math.ceil((b - a) / n)); const out = []; for (let v = Math.ceil(a / step) * step; v <= b; v += step) out.push(v); return out; };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(unitLabel)} nach Alter">`;
  for (const v of ticks(y0, y1, 4)) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`;
  for (const v of ticks(x0, x1, 6)) s += `<text x="${sx(v)}" y="${H - B + 15}" text-anchor="middle">${v}</text>`;
  s += `<line class="ax" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
  s += `<polyline class="ln" points="${points.map(p => `${sx(p.months).toFixed(1)},${sy(p.value).toFixed(1)}`).join(' ')}"/>`;
  for (const p of points) s += `<circle class="pt" cx="${sx(p.months).toFixed(1)}" cy="${sy(p.value).toFixed(1)}" r="3.5"><title>${esc(format(p.value))} mit ${dec(p.months, 1).replace(',0', '')} Monaten</title></circle>`;
  return s + `<text x="${W - R}" y="${H - 6}" text-anchor="end">Alter in Monaten</text></svg>`;
}

/**
 * Baut das Entwicklungsbuch eines Kindes.
 * @param {{child: import('./model.js').Child, data: import('./model.js').AppData, milestoneTitles: Map<string, string>, milestoneAreas: Map<string, string>,
 *   ideaTitles: Map<string, string>, ideaAreas: Map<string, string>, photoSrc: (photo: import('./model.js').PhotoMeta) => string, today: string}} o
 *   photoSrc liefert die Bildquelle (relativer Pfad im ZIP oder data:-URL); today 'YYYY-MM-DD'
 * @returns {string} vollständiges HTML-Dokument
 */
export function buildBook({ child, data, milestoneTitles, milestoneAreas, ideaTitles = new Map(), ideaAreas = new Map(), photoSrc, today }) {
  const photos = new Map(data.photos.map(p => [p.id, p]));
  const ms = new Map(data.milestones.map(m => [m.id, m]));
  const dy = new Map(data.diary.map(d => [d.id, d]));
  const ac = new Map(data.activities.map(a => [a.id, a]));
  const eff = effectiveAge(child, toNum(today));
  const corrected = eff.isCorrected && eff.corrected ? ageText(child.dueDate, today) : '';
  const stats = childStats(data, child.id);
  const age = ageText(child.birthDate, today);
  const titleOf = m => (m.catalogId ? milestoneTitles.get(m.catalogId) || 'Meilenstein' : m.title);
  const photoGrid = ids => {
    const list = ids.map(id => photos.get(id)).filter(Boolean);
    return list.length ? `<div class="photos">${list.map(p => `<figure><img src="${esc(photoSrc(p))}" alt="Foto vom ${esc(fmtDate(p.date))}" loading="lazy"${p.width ? ` width="${p.width}" height="${p.height}"` : ''}></figure>`).join('')}</div>` : '';
  };
  let no = 0;
  const label = t => `<h2 class="label"><span class="no">№ ${String(++no).padStart(2, '0')}</span> — ${t}</h2>`;

  // Meilensteine, älteste zuerst
  const mList = data.milestones.filter(m => m.childId === child.id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const mTable = mList.length
    ? `<div class="table-scroll"><table><thead><tr><th>Datum</th><th>Alter</th><th>Meilenstein</th><th>Bereich</th></tr></thead><tbody>${mList.map(m =>
      `<tr><td class="date">${esc(fmtShort(m.date))}</td><td>${esc(ageText(child.birthDate, m.date))}</td><td>${esc(titleOf(m))}</td><td>${m.catalogId && milestoneAreas.get(m.catalogId) ? esc(AREA_LABEL[milestoneAreas.get(m.catalogId)]) : 'Eigener'}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="empty">Noch keine Meilensteine eingetragen.</p>';

  // Wachstum
  const g = growthSeries(data.measurements, child.id, child.birthDate);
  const meas = data.measurements.filter(m => m.childId === child.id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let growth = '<p class="empty">Noch keine Messungen eingetragen.</p>';
  if (meas.length) {
    const fig = (pts, name, f) => (pts.length >= 2 ? `<figure class="chart">${lineChart(pts, name, f)}<figcaption><b>Abb.</b>${esc(name)}</figcaption></figure>` : '');
    growth = `<div class="charts">${fig(g.height, 'Größe in cm', cm)}${fig(g.weight, 'Gewicht in kg', kg)}</div>`
      + `<div class="table-scroll"><table><thead><tr><th>Datum</th><th>Alter</th><th style="text-align:right">Größe</th><th style="text-align:right">Gewicht</th></tr></thead><tbody>${meas.map(m =>
        `<tr><td class="date">${esc(fmtShort(m.date))}</td><td>${esc(ageText(child.birthDate, m.date))}</td><td class="num">${m.heightCm !== null ? cm(m.heightCm) : '–'}</td><td class="num">${m.weightKg !== null ? kg(m.weightKg) : '–'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // Zeitstrahl: Meilensteine, Gemachtes und Tagebuch, nach Lebensjahr, innerhalb chronologisch
  const items = timeline(data, child.id).filter(i => i.type !== 'measurement');
  const years = groupByLifeYear(items, child.birthDate).reverse();
  const story = years.length ? years.map(({ year, items: list }, idx) => {
    const head = year < 0 ? 'Vor der Geburt' : `${year + 1}. Lebensjahr`;
    return `<div class="part cap${idx === 0 ? ' first' : ''}">${head}</div>` + list.slice().reverse().map(it => {
      const meta = `<div class="meta"><span class="cap">${esc(fmtDate(it.date))} · ${esc(ageText(child.birthDate, it.date))}</span>`;
      if (it.type === 'milestone') {
        const m = ms.get(it.id);
        return `<article class="entry">${meta}<span class="tag acc">Meilenstein</span></div><h3>${esc(titleOf(m))}</h3>${m.note.trim() ? `<p>${esc(m.note)}</p>` : ''}${photoGrid(m.photoIds)}</article>`;
      }
      if (it.type === 'activity') {
        const a = ac.get(it.id), area = ideaAreas.get(a.ideaId);
        return `<article class="entry">${meta}<span class="tag">Gemacht</span>${area ? `<span class="tag">${esc(AREA_LABEL[area])}</span>` : ''}</div><h3>${esc(ideaTitles.get(a.ideaId) || 'Idee')}</h3>${a.note.trim() ? `<p>${esc(a.note)}</p>` : ''}${photoGrid(a.photoIds)}</article>`;
      }
      const d = dy.get(it.id);
      return `<article class="entry">${meta}<span class="tag">Tagebuch</span></div>${d.text.trim() ? `<p>${esc(d.text)}</p>` : ''}${photoGrid(d.photoIds)}</article>`;
    }).join('');
  }).join('') : '<p class="empty">Noch keine Einträge.</p>';

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Entwicklungsbuch · ${esc(child.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Nunito:wght@400;700&family=Space+Mono:wght@400;700&display=swap">
<style>${CSS}</style></head><body>
<header class="runhead"><div class="wrap cap"><span>Entwicklungsbuch · ${esc(child.name)}</span><span>Stand ${esc(fmtDate(today))}</span></div></header>
<main class="wrap">
<section class="hero"><h1>${esc(child.name)}</h1><div class="subtitle cap">Geboren am ${esc(fmtDate(child.birthDate))}<span class="sep">·</span>${esc(age)}${child.dueDate ? `<span class="sep">·</span>Errechneter Termin ${esc(fmtDate(child.dueDate))}` : ''}${corrected ? `<span class="sep">·</span>Korrigiert ${esc(corrected)}` : ''}</div></section>
<hr class="rule-heavy">
<div class="kpis">
<div class="kpi"><div class="cap">Alter</div><div class="v acc">${esc(age.split(',')[0])}</div><div class="sub">${esc(age.includes(',') ? age.split(', ')[1] : '')}</div></div>
<div class="kpi"><div class="cap">Gemacht</div><div class="v">${stats.activities}</div><div class="sub">${plural(stats.activities, 'Idee', 'Ideen')}</div></div>
<div class="kpi"><div class="cap">Meilensteine</div><div class="v">${stats.milestones}</div></div>
<div class="kpi"><div class="cap">Tagebuch</div><div class="v">${stats.diary}</div><div class="sub">${plural(stats.diary, 'Eintrag', 'Einträge')}</div></div>
</div>
<section class="section">${label('Meilensteine')}${mTable}</section>
<section class="section">${label('Wachstum')}${growth}</section>
<section class="section">${label('Zeitstrahl')}${story}</section>
</main>
<footer><div class="wrap cap"><span>Erstellt mit der Entwicklungs-App</span><span>${esc(fmtShort(today))}</span></div></footer>
</body></html>`;
}

export const bookFileName = (child, today) => `Entwicklungsbuch-${child.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'Kind'}-${today}.html`;
