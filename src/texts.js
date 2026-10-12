/* Texte der Oberfläche: Beschriftungen zu den IDs aus model.js und Meldungen.
   Später in Swift: String Catalog (Localizable.xcstrings). */

export const AREA_LABEL = { grobmotorik: 'Grobmotorik', feinmotorik: 'Feinmotorik', sprache: 'Sprache', kognition: 'Denken', sozial: 'Gefühle & Miteinander', selbststaendigkeit: 'Selbstständigkeit' };
export const KIND_LABEL = { spiel: 'Spiel', bewegung: 'Bewegung', basteln: 'Basteln', sprache: 'Sprache & Vorlesen', sinne: 'Sinne', ausflug: 'Draußen & Ausflug', alltag: 'Alltag' };
export const PLACE_LABEL = { drinnen: 'Drinnen', draussen: 'Draußen', beides: 'Drinnen oder draußen' };
export const GROUP_LABEL = { eins: 'Mit dir allein', geschwister: 'Mit Geschwistern', gruppe: 'In der Gruppe' };
export const PREP_LABEL = ['Ohne Vorbereitung', 'Wenig Vorbereitung', 'Etwas Vorbereitung'];
export const THEME_LABEL = { auto: 'System', light: 'Hell', dark: 'Dunkel' };
export const ENTRY_LABEL = { milestone: 'Meilenstein', diary: 'Tagebuch', measurement: 'Messung', activity: 'Gemacht' };
export const STATUS_LABEL = { done: 'Eingetragen', now: 'Gerade typisch', later: 'Später', open: 'Nicht eingetragen' };
export const WEEKDAY = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export const IMPORT_ERROR = {
  not_zip: 'Die Datei ist kein gültiges Backup (ZIP oder daten.json).',
  invalid_json: 'daten.json ist beschädigt.',
  not_backup: 'Die Datei ist kein Backup dieser App.',
  newer_version: 'Das Backup stammt aus einer neueren Version der App. Bitte zuerst die App aktualisieren.',
  no_children: 'Im Backup wurde kein Kind gefunden.',
  unsupported_zip: 'Die ZIP-Datei nutzt ein Format, das die App nicht lesen kann.',
};

export const NOTE_ORIENTATION = 'Die Zeitfenster sind grobe Orientierung. Jedes Kind entwickelt sich in seinem eigenen Tempo. Bei Fragen zur Entwicklung ist die Kinderarztpraxis die richtige Adresse.';
export const NOTE_CORRECTED = 'Bei Frühgeborenen rechnet die App bis zum 2. Geburtstag mit dem korrigierten Alter, also ab dem errechneten Termin. So wird es auch in der Kinderheilkunde üblicherweise gehandhabt.';
export const NOTE_DISCLAIMER = 'Die App begleitet und gibt Anregungen. Sie stellt keine Diagnosen und ersetzt keine ärztliche oder therapeutische Beratung. Wenn dir etwas Sorgen macht, sprich es bei der Kinderärztin oder dem Kinderarzt an, zum Beispiel bei der nächsten U-Untersuchung.';
