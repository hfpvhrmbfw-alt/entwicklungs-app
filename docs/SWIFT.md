# Übertragung nach Swift

Die PWA ist in Schichten aufgeteilt. Modell, Logik und Katalog werden 1:1 übertragen, Oberfläche und Speicher entstehen in Swift neu.

| Datei | Inhalt | In Swift |
|---|---|---|
| `src/model.js` | IDs der Bereiche, Arten, Orte; Datentypen, `sanitize…`, Backup-Format, Migration v1 → v2 | 1:1 (`struct`, `enum`, `Codable`) |
| `src/logic.js` | Alter, korrigiertes Alter, Meilenstein-Übersicht, Ideen-Filter, Vorschläge mit Begründung, Wochenplan, Zeitstrahl, Wachstum, Demodaten | 1:1, reine Funktionen |
| `src/catalog.js` | Ideen mit Anleitung, Meilensteine mit Fördertipps, Material, Quellen | `catalog.json` im App-Bundle |
| `tests/fixtures/*.json` | Eingaben und erwartete Ergebnisse | XCTest-Fixtures |
| `src/zip.js` | ZIP schreiben und lesen | neu: `Archive` (ZIPFoundation) oder `FileManager` + Ordner |
| `src/book.js` | Entwicklungsbuch als HTML | neu oder übernommen: HTML erzeugen und per `WKWebView`/`UIPrintPageRenderer` als PDF |
| `src/texts.js` | Beschriftungen, Meldungen | String Catalog (`Localizable.xcstrings`) |
| `src/format.js` | Datum, Alter, Zahlen als Text | `DateFormatter`, `MeasurementFormatter`, eigene Alterstexte |
| `src/storage.js` | IndexedDB, Fotos als Blobs | neu: SwiftData oder JSON + Bilddateien im App-Container |
| `src/ui.js`, `src/main.js` | Rendering, Dialoge, Aktionen | neu: SwiftUI, Fotos über `PhotosPicker` |

## Datentypen

```swift
enum Area: String, Codable, CaseIterable { case grobmotorik, feinmotorik, sprache, kognition, sozial, selbststaendigkeit }
enum IdeaKind: String, Codable, CaseIterable { case spiel, bewegung, basteln, sprache, sinne, ausflug, alltag }
enum Place: String, Codable { case drinnen, draussen, beides }

struct Child: Codable, Identifiable { var id, name, birthDate: String; var dueDate: String? }   // dueDate nur bei Frühgeburt
struct Milestone: Codable, Identifiable {
  var id, childId: String
  var catalogId: String?        // gesetzt → aus dem Katalog, title leer
  var title, date, note: String; var photoIds: [String]
}
struct DiaryEntry: Codable, Identifiable { var id, childId, date, text: String; var photoIds: [String] }
struct Measurement: Codable, Identifiable { var id, childId, date: String; var heightCm: Double?; var weightKg: Double? }
struct PhotoMeta: Codable, Identifiable { var id, childId, date, mime: String; var width, height: Int }
struct Idea: Codable, Identifiable {
  var id, title: String; var kind: IdeaKind; var area: Area; var fromMonth, toMonth, minutes, prep: Int
  var place: Place; var materials: [String]; var group: [String]; var material: String
  var steps: [String]; var learns, why, principle, easier, harder, safety, text: String
}
struct IdeaState: Codable, Identifiable { var id, childId, ideaId: String; var favorite: Bool }   // gemerkt
struct Activity: Codable, Identifiable { var id, childId, ideaId, date, note: String; var photoIds: [String] }   // gemacht
struct PlanItem: Codable, Identifiable { var id, childId, ideaId, date: String }   // eingeplant
```

IDs nie umbenennen, nur ergänzen. Unbekannte Werte beim Import verwerfen (wie die `sanitize…`-Funktionen). Katalog-Ideen beginnen mit `k-`, eigene mit `eigen-`.

## Datum und Alter

Tage werden als ganze Zahl seit 1.1.1970 gerechnet (`toNum`/`toStr`), immer in UTC. In Swift: `Calendar` mit `TimeZone(identifier: "UTC")`. "Heute" bestimmt nur die Oberfläche aus dem lokalen Datum und übergibt es als Zahl.

`ageAt` rechnet kalendergenau: volle Monate wie im Kalender; ist der Geburtstag im Zielmonat nicht vorhanden (31. Januar → Februar), zählt der Monatsletzte. Die Fälle stehen in `tests/fixtures/alter.json`.

## Korrigiertes Alter

Ist ein errechneter Termin angegeben (nach der Geburt, höchstens 20 Wochen später), rechnet `effectiveAge` bis zum 24. Lebensmonat (chronologisch) mit dem Alter ab dem Termin. Vorschläge und Meilensteine nutzen dieses Alter; angezeigt werden beide. Fälle: `tests/fixtures/korrigiertes-alter.json`.

## Vorschläge

`suggestIdeas` bewertet passende Ideen (Alter, Filter, nicht in den letzten 14 Tagen gemacht): +3,5 wenn die Idee einen Meilenstein unterstützt, der ansteht; +2 wenn ihr Bereich in den letzten 28 Tagen am seltensten vorkam (sonst 1/(1+Anzahl)); +3 gemerkt; +0,5 noch nie gemacht; dazu ein reproduzierbarer Wert aus Ideen-ID und Tag statt Zufall. Bei der Auswahl kostet jeder schon gewählte gleiche Bereich 4 Punkte. Die Begründung (`milestone`, `balance`, `favorite`, `age`) wird mitgeliefert. In Swift dieselbe Rechnung, geprüft gegen `tests/fixtures/szenario-beispielkind.json` (der Ersatzzufall nutzt FNV-1a, siehe `jitter`).

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
{ "app": "entwicklungs-app", "version": 2, "exportedAt": "2026-10-12T08:00:00.000Z",
  "settings": { "activeChildId": "…", "theme": "auto", "weekPlan": false, "homeMaterials": [], "today": { "maxMinutes": 0, "place": "", "onlyHome": false } },
  "children": [], "milestones": [], "diary": [], "measurements": [], "activities": [], "plan": [],
  "photos": [ { "id": "…", "childId": "…", "date": "2026-10-01", "mime": "image/jpeg", "width": 1600, "height": 1067, "file": "fotos/….jpg" } ],
  "ideas": [], "ideaStates": [] }
```

Backups mit höherer `version` als die App kennt werden abgelehnt. Version 1 wird übernommen: `ideaStates.doneDate` wird zu `activities`, alte Bereiche (`motorik`, `denken`, `alltag`) und die Art `uebung` werden umbenannt (`upgradeRaw`, `sanitizeIdea`). Bei einer neuen Schema-Version kommt eine Migration in `migrate` (model.js) und in Swift.

## Inhalte

Die Altersspannen im Katalog sind grobe Orientierung. Die App bewertet nicht, ob ein Kind „spät dran“ ist; der Status „Nicht eingetragen“ ist bewusst neutral. Das gilt auch für die Swift-Fassung und die Store-Beschreibung (keine medizinischen Aussagen).
