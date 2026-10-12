/* Formatierung für die Anzeige (Datum, Alter, Zahlen, HTML-Escaping). Kein DOM, gehört zur Oberfläche;
   von ui.js und book.js gemeinsam genutzt. */

import { DAY_MS, toNum } from './model.js';
import { ageAt } from './logic.js';

export const fmt = (n, opts) => new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', ...opts }).format(new Date(n * DAY_MS));
export const fmtDate = s => fmt(toNum(s), { day: 'numeric', month: 'long', year: 'numeric' });
export const fmtShort = s => fmt(toNum(s), { day: '2-digit', month: '2-digit', year: 'numeric' });
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const dec = (v, digits) => v.toFixed(digits).replace('.', ',');
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Alter als Text, z. B. "1 Jahr, 3 Monate" oder "5 Wochen" */
export function ageText(birthDate, dateStr) {
  const a = ageAt(birthDate, toNum(dateStr));
  if (!a) return 'vor der Geburt';
  if (a.totalMonths === 0) {
    const w = Math.floor(a.totalDays / 7);
    return a.totalDays < 14 ? plural(a.totalDays, 'Tag', 'Tage') : plural(w, 'Woche', 'Wochen');
  }
  if (a.years === 0) return plural(a.months, 'Monat', 'Monate');
  return plural(a.years, 'Jahr', 'Jahre') + (a.months ? ', ' + plural(a.months, 'Monat', 'Monate') : '');
}

/** Altersspanne in Monaten als Text, z. B. "6–9 Monate" oder "2½–4 Jahre" */
export function rangeText(from, to) {
  const y = m => { const v = m / 12; const w = Math.floor(v); const half = v - w >= 0.5 ? '½' : ''; return (w || !half ? String(w) : '') + half; };
  if (to <= 36) return `${from}–${to} Monate`;
  if (from < 24) return `${from} Monate – ${y(to)} Jahre`;
  return `${y(from)}–${y(to)} Jahre`;
}

export const cm = v => `${dec(v, 1).replace(',0', '')} cm`;
export const kg = v => `${dec(v, 2).replace(/,?0+$/, '')} kg`;
