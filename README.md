# Entwicklung

PWA, die Eltern hilft, die Entwicklung ihres Kindes altersgerecht zu fördern. Im Mittelpunkt stehen Ideen mit Anleitung und Begründung; Meilensteine dienen zur Orientierung. Reine Frontend-App ohne Backend und ohne Build-Schritt. Alle Daten und Fotos liegen nur im Browser (IndexedDB, Fallback localStorage).

## Funktionen
- **Was passt heute?** Vorschläge nach Zeit, drinnen oder draußen und vorhandenem Material. Jeder Vorschlag sagt, warum er passt: Er unterstützt einen Meilenstein, der gerade ansteht, oder einen Bereich, der zuletzt zu kurz kam. Bereiche wechseln sich ab, kürzlich Gemachtes pausiert.
- **Ideen**: rund 100 für 0–6 Jahre (mindestens 20 je Altersband), in sechs Bereichen (Grobmotorik, Feinmotorik, Sprache, Denken, Gefühle & Miteinander, Selbstständigkeit). Jede mit Schritten, „Das lernt dein Kind dabei“, Begründung, zugrunde liegendem Prinzip, leichter/schwerer und Sicherheitshinweis. Filter, merken, eigene Ideen.
- **Gemacht** mit Datum, Notiz und Fotos; erscheint im Tagebuch. „Gefördert in den letzten 4 Wochen“ zeigt je Bereich, was gemacht wurde, ohne Wertung.
- **Frühchen**: Mit dem errechneten Termin rechnet die App bis zum 2. Geburtstag mit dem korrigierten Alter.
- **Entwicklung**: Meilensteine mit Zeitfenstern als Orientierung (Sitzen, Krabbeln, Stehen, Gehen nach WHO), was als Nächstes ansteht, mit Fördertipp und passenden Ideen.
- **Wochenplan** (in den Einstellungen einschaltbar): Ideen auf Tage legen, freie Tage automatisch füllen.
- **Tagebuch** mit Fotos, **Wachstum** mit Verlaufsdiagramm, **mehrere Kinder**.
- **Export**: ZIP mit einem gestalteten Entwicklungsbuch pro Kind (HTML, ohne App lesbar, als PDF druckbar), allen Fotos und `daten.json`. **Import** mit Versionsprüfung.
- **Hinweise und Quellen** unter „Daten“.

Die App stellt keine Diagnosen und ersetzt keine ärztliche Beratung.

## Starten
Die App nutzt ES-Module und braucht deshalb einen kleinen Server (`https://` oder `localhost`, nicht `file://`):

```
npx serve .        # oder: python3 -m http.server 8000
```

Zum Installieren auf dem Handy den Ordner auf einen HTTPS-Host legen (z. B. GitHub Pages), Seite öffnen und „Zum Home-Bildschirm“ wählen. Danach läuft die App offline.

## Aufbau
Abhängigkeiten nur in eine Richtung (Oberfläche → Logik → Modell, Oberfläche → Speicher → Modell):

| Datei | Schicht |
|---|---|
| `src/model.js` | Modell: IDs, Datentypen, Validierung, Backup-Format, Schema-Version |
| `src/catalog.js` | Katalog: Ideen mit Anleitung, Meilensteine mit Fördertipps, Material, Quellen |
| `src/logic.js` | Logik: reine Funktionen (Alter und korrigiertes Alter, Vorschläge, Wochenplan, Übersichten, Zeitstrahl, Wachstum) |
| `src/zip.js` | ZIP schreiben und lesen, ohne Abhängigkeiten |
| `src/storage.js` | Speicher: IndexedDB mit localStorage-Fallback |
| `src/texts.js` | Beschriftungen und Meldungen |
| `src/format.js` | Datum, Alter und Zahlen als Text |
| `src/book.js` | Entwicklungsbuch (HTML) |
| `src/ui.js` | Oberfläche: Rendering, Dialog-Formulare, Theme |
| `src/main.js` | Start, Aktionen, Ereignisse, Fotos verkleinern, Export, Import |

Weitere Dateien: `index.html` · `styles.css` (Stil Brause aus dem Castra-Designsystem) · `sw.js` · `manifest.webmanifest` · `icons/` · `docs/SWIFT.md` (Übertragung nach Swift)

## Tests
Logik, Modell, ZIP und Buch laufen ohne Browser und werden mit Node getestet (keine Abhängigkeiten):

```
npm test
```

Die Testfälle liegen als JSON in `tests/fixtures/` und sind für spätere Swift-Tests wiederverwendbar.

## Nach Änderungen
`VERSION` in `sw.js` hochzählen und neue Dateien in die `SHELL`-Liste eintragen, damit installierte Apps das Update laden.
