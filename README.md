# Entwicklung

PWA, um die Entwicklung von Kindern festzuhalten und altersgerechte Ideen zu finden. Reine Frontend-App ohne Backend und ohne Build-Schritt. Alle Daten und Fotos liegen nur im Browser (IndexedDB, Fallback localStorage).

## Funktionen
- **Mehrere Kinder**, Umschalten in der Kopfzeile.
- **Meilensteine** aus einer Liste nach Bereichen (Motorik, Sprache, Miteinander, Denken, Alltag) mit typischen Zeitfenstern als Orientierung, dazu eigene Meilensteine. Mit Datum, Notiz und Fotos.
- **Tagebuch** mit Text und Fotos.
- **Wachstum**: Größe und Gewicht mit Verlaufsdiagramm.
- **Ideen**: Spiele, Bastel- und Bewegungsideen nach Alter, filterbar; merken, als gemacht markieren, eigene Ideen ergänzen. Auf der Übersicht täglich wechselnde Vorschläge.
- **Export**: ZIP mit einem gestalteten Entwicklungsbuch pro Kind (HTML, ohne App lesbar, als PDF druckbar), allen Fotos als JPG und `daten.json` zur Wiederherstellung. Das Buch gibt es auch einzeln als eine Datei mit eingebetteten Fotos.
- **Import** eines Backups (ZIP oder `daten.json`), Hell/Dunkel, Beispieldaten.

Die Zeitfenster sind grobe Orientierung, keine Bewertung und kein medizinischer Rat.

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
| `src/catalog.js` | Katalog: Meilensteine und Ideen (Inhalte) |
| `src/logic.js` | Logik: reine Funktionen (Alter, Übersichten, Ideen, Zeitstrahl, Wachstum) |
| `src/zip.js` | ZIP schreiben und lesen, ohne Abhängigkeiten |
| `src/storage.js` | Speicher: IndexedDB mit localStorage-Fallback |
| `src/texts.js` | Beschriftungen und Meldungen |
| `src/format.js` | Datum, Alter und Zahlen als Text |
| `src/book.js` | Entwicklungsbuch (HTML) |
| `src/ui.js` | Oberfläche: Rendering, Dialog-Formulare, Theme |
| `src/main.js` | Start, Aktionen, Ereignisse, Fotos verkleinern, Export, Import |

Weitere Dateien: `index.html` · `styles.css` (Hausstil Web v1.2) · `sw.js` · `manifest.webmanifest` · `icons/` · `docs/SWIFT.md` (Übertragung nach Swift)

## Tests
Logik, Modell, ZIP und Buch laufen ohne Browser und werden mit Node getestet (keine Abhängigkeiten):

```
npm test
```

Die Testfälle liegen als JSON in `tests/fixtures/` und sind für spätere Swift-Tests wiederverwendbar.

## Nach Änderungen
`VERSION` in `sw.js` hochzählen und neue Dateien in die `SHELL`-Liste eintragen, damit installierte Apps das Update laden.
