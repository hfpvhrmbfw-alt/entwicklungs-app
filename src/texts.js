/* Texte der Oberfläche: Beschriftungen zu den IDs aus model.js und Meldungen.
   Später in Swift: String Catalog (Localizable.xcstrings). */

export const AREA_LABEL = { motorik: 'Motorik', sprache: 'Sprache', sozial: 'Miteinander', denken: 'Denken', alltag: 'Alltag' };
export const KIND_LABEL = { spiel: 'Spiel', basteln: 'Basteln', uebung: 'Übung' };
export const THEME_LABEL = { auto: 'System', light: 'Hell', dark: 'Dunkel' };
export const ENTRY_LABEL = { milestone: 'Meilenstein', diary: 'Tagebuch', measurement: 'Messung' };
export const STATUS_LABEL = { done: 'Eingetragen', now: 'Gerade typisch', later: 'Später', open: 'Nicht eingetragen' };

export const IMPORT_ERROR = {
  not_zip: 'Die Datei ist kein gültiges Backup (ZIP oder daten.json).',
  invalid_json: 'daten.json ist beschädigt.',
  not_backup: 'Die Datei ist kein Backup dieser App.',
  newer_version: 'Das Backup stammt aus einer neueren Version der App. Bitte zuerst die App aktualisieren.',
  no_children: 'Im Backup wurde kein Kind gefunden.',
  unsupported_zip: 'Die ZIP-Datei nutzt ein Format, das die App nicht lesen kann.',
};

export const NOTE_ORIENTATION = 'Die Zeitfenster sind grobe Orientierung. Jedes Kind entwickelt sich in seinem eigenen Tempo. Bei Fragen zur Entwicklung ist die Kinderarztpraxis die richtige Adresse.';
