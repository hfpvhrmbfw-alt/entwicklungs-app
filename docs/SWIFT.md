# Übertragung nach Swift

Die PWA ist in Schichten aufgeteilt. Modell, Logik und Katalog werden 1:1 übertragen, Oberfläche und Speicher entstehen in Swift neu.

| Datei | Inhalt | In Swift |
|---|---|---|
| `src/model.js` | IDs der Bereiche und Arten, Datentypen, `sanitize…`, Backup-Format, Migration | 1:1 (`struct`, `enum`, `Codable`) |
| `src/logic.js` | Alter, Meilenstein-Übersicht, Ideen-Filter, Ideen des Tages, Zeitstrahl, Wachstum, Demodaten | 1:1, reine Funktionen |
| `src/catalog.js` | Meilensteine und Ideen (Inhalte) | `catalog.json` im App-Bundle |
| `tests/fixtures/*.json` | Eingaben und erwartete Ergebnisse | XCTest-Fixtures |
| `src/zip.js` | ZIP schreiben und lesen | neu: `Archive` (ZIPFoundation) oder `FileManager` + Ordner |
| `src/book.js` | Entwicklungsbuch als HTML | neu oder übernommen: HTML erzeugen und per `WKWebView`/`UIPrintPageRenderer` als PDF |
| `src/texts.js` | Beschriftungen, Meldungen | String Catalog (`Localizable.xcstrings`) |
| `src/format.js` | Datum, Alter, Zahlen als Text | `DateFormatter`, `MeasurementFormatter`, eigene Alterstexte |
| `src/storage.js` | IndexedDB, Fotos als Blobs | neu: SwiftData oder JSON + Bilddateien im App-Container |
| `src/ui.js`, `src/main.js` | Rendering, Dialoge, Aktionen | neu: SwiftUI, Fotos über `PhotosPicker` |

## Datentypen

```swift
enum Area: String, Codable, CaseIterable { case motorik, sprache, sozial, denken, alltag }
enum IdeaKind: String, Codable, CaseIterable { case spiel, basteln, uebung }

struct Child: Codable, Identifiable { var id: String; var name: String; var birthDate: String }
struct Milestone: Codable, Identifiable {
  var id: String; var childId: String
  var catalogId: String?        // gesetzt → aus dem Katalog, title leer
  var title: String             // eigener Meilenstein
  var date: String; var note: String; var photoIds: [String]
}
struct DiaryEntry: Codable, Identifiable { var id, childId, date, text: String; var photoIds: [String] }
struct Measurement: Codable, Identifiable { var id, childId, date: String; var heightCm: Double?; var weightKg: Double? }
struct PhotoMeta: Codable, Identifiable { var id, childId, date, mime: String; var width, height: Int }
struct Idea: Codable, Identifiable { var id, title: String; var kind: IdeaKind; var area: Area; var fromMonth, toMonth: Int; var material, text: String }
struct IdeaState: Codable, Identifiable { var id, childId, ideaId: String; var favorite: Bool; var doneDate: String? }
```

IDs nie umbenennen, nur ergänzen. Unbekannte Werte beim Import verwerfen (wie die `sanitize…`-Funktionen). Katalog-Ideen beginnen mit `k-`, eigene mit `eigen-`.

## Datum und Alter

Tage werden als ganze Zahl seit 1.1.1970 gerechnet (`toNum`/`toStr`), immer in UTC. In Swift: `Calendar` mit `TimeZone(identifier: "UTC")`. "Heute" bestimmt nur die Oberfläche aus dem lokalen Datum und übergibt es als Zahl.

`ageAt` rechnet kalendergenau: volle Monate wie im Kalender; ist der Geburtstag im Zielmonat nicht vorhanden (31. Januar → Februar), zählt der Monatsletzte. Die Fälle stehen in `tests/fixtures/alter.json`.

## Fotos

Fotos werden beim Hinzufügen auf 1600 px (längste Seite) verkleinert und als JPEG (Qualität 0,85) gespeichert. Die Metadaten liegen getrennt von den Bilddaten. Fotos ohne Verweis aus einem Eintrag werden gelöscht.

## Austauschformat (Backup)

ZIP-Datei, identisch in PWA und Swift-App:

```
Entwicklungsbuch-<Name>-<Datum>.html   ein Buch pro Kind, Fotos relativ verlinkt
fotos/<id>.jpg                         Bilddaten
daten.json                             alle Daten
LIESMICH.txt
```

`daten.json`:

```json
{ "app": "entwicklungs-app", "version": 1, "exportedAt": "2026-10-12T08:00:00.000Z",
  "settings": { "activeChildId": "…", "theme": "auto" },
  "children": [], "milestones": [], "diary": [], "measurements": [],
  "photos": [ { "id": "…", "childId": "…", "date": "2026-10-01", "mime": "image/jpeg", "width": 1600, "height": 1067, "file": "fotos/….jpg" } ],
  "ideas": [], "ideaStates": [] }
```

Backups mit höherer `version` als die App kennt werden abgelehnt. Bei einer neuen Schema-Version kommt eine Migration in `migrate` (model.js) und in Swift.

## Inhalte

Die Altersspannen im Katalog sind grobe Orientierung. Die App bewertet nicht, ob ein Kind „spät dran“ ist; der Status „Nicht eingetragen“ ist bewusst neutral. Das gilt auch für die Swift-Fassung und die Store-Beschreibung (keine medizinischen Aussagen).
