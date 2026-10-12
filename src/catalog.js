/* Katalog: mitgelieferte Inhalte (Meilensteine und Ideen). Reine Daten, in Swift als catalog.json im Bundle.
   Altersspannen sind grobe Orientierung (ungefähre Zeitfenster, in denen viele Kinder so weit sind).
   Kinder entwickeln sich unterschiedlich schnell; die App bewertet nicht. IDs nie umbenennen. */

/** @type {Array<{id: string, area: string, fromMonth: number, toMonth: number, title: string}>} */
export const MILESTONE_CATALOG = [
  // Motorik
  { id: 'm-kopf-heben', area: 'motorik', fromMonth: 1, toMonth: 4, title: 'Hebt in Bauchlage den Kopf' },
  { id: 'm-greifen', area: 'motorik', fromMonth: 3, toMonth: 6, title: 'Greift gezielt nach Spielzeug' },
  { id: 'm-drehen', area: 'motorik', fromMonth: 4, toMonth: 8, title: 'Dreht sich vom Bauch auf den Rücken' },
  { id: 'm-sitzen', area: 'motorik', fromMonth: 5, toMonth: 9, title: 'Sitzt ohne Hilfe' },
  { id: 'm-krabbeln', area: 'motorik', fromMonth: 6, toMonth: 12, title: 'Krabbelt' },
  { id: 'm-hochziehen', area: 'motorik', fromMonth: 7, toMonth: 12, title: 'Zieht sich an Möbeln hoch' },
  { id: 'm-pinzettengriff', area: 'motorik', fromMonth: 8, toMonth: 12, title: 'Nimmt Kleines zwischen Daumen und Zeigefinger' },
  { id: 'm-stehen', area: 'motorik', fromMonth: 8, toMonth: 17, title: 'Steht frei' },
  { id: 'm-laufen', area: 'motorik', fromMonth: 9, toMonth: 18, title: 'Macht erste freie Schritte' },
  { id: 'm-treppe', area: 'motorik', fromMonth: 18, toMonth: 30, title: 'Steigt mit Festhalten Treppen' },
  { id: 'm-rennen', area: 'motorik', fromMonth: 18, toMonth: 30, title: 'Rennt sicher' },
  { id: 'm-huepfen', area: 'motorik', fromMonth: 24, toMonth: 36, title: 'Hüpft mit beiden Beinen' },
  { id: 'm-dreirad', area: 'motorik', fromMonth: 30, toMonth: 48, title: 'Fährt Laufrad oder Dreirad' },
  { id: 'm-schere', area: 'motorik', fromMonth: 30, toMonth: 48, title: 'Schneidet mit der Kinderschere' },
  { id: 'm-einbein', area: 'motorik', fromMonth: 36, toMonth: 60, title: 'Steht kurz auf einem Bein' },
  { id: 'm-mensch-malen', area: 'motorik', fromMonth: 42, toMonth: 66, title: 'Malt einen Menschen mit Kopf, Armen und Beinen' },
  // Sprache
  { id: 's-gurren', area: 'sprache', fromMonth: 1, toMonth: 4, title: 'Gurrt und macht Laute' },
  { id: 's-silben', area: 'sprache', fromMonth: 6, toMonth: 10, title: 'Plappert Silbenketten (ba-ba, da-da)' },
  { id: 's-erstes-wort', area: 'sprache', fromMonth: 10, toMonth: 18, title: 'Sagt das erste Wort mit Bedeutung' },
  { id: 's-zehn-woerter', area: 'sprache', fromMonth: 15, toMonth: 24, title: 'Spricht etwa zehn Wörter' },
  { id: 's-zwei-woerter', area: 'sprache', fromMonth: 18, toMonth: 30, title: 'Bildet Zwei-Wort-Sätze' },
  { id: 's-saetze', area: 'sprache', fromMonth: 30, toMonth: 42, title: 'Spricht Sätze mit drei und mehr Wörtern' },
  { id: 's-warum', area: 'sprache', fromMonth: 30, toMonth: 48, title: 'Stellt Warum-Fragen' },
  { id: 's-erzaehlen', area: 'sprache', fromMonth: 42, toMonth: 66, title: 'Erzählt kleine Geschichten' },
  // Sozial
  { id: 'o-laecheln', area: 'sozial', fromMonth: 1, toMonth: 3, title: 'Lächelt zurück' },
  { id: 'o-lachen', area: 'sozial', fromMonth: 3, toMonth: 6, title: 'Lacht laut' },
  { id: 'o-fremdeln', area: 'sozial', fromMonth: 6, toMonth: 12, title: 'Fremdelt' },
  { id: 'o-winken', area: 'sozial', fromMonth: 9, toMonth: 15, title: 'Winkt oder klatscht' },
  { id: 'o-zeigen', area: 'sozial', fromMonth: 10, toMonth: 16, title: 'Zeigt auf Dinge, die es interessieren' },
  { id: 'o-nebeneinander', area: 'sozial', fromMonth: 18, toMonth: 36, title: 'Spielt neben anderen Kindern' },
  { id: 'o-als-ob', area: 'sozial', fromMonth: 24, toMonth: 42, title: 'Spielt „so tun als ob“' },
  { id: 'o-miteinander', area: 'sozial', fromMonth: 36, toMonth: 60, title: 'Spielt mit anderen Kindern zusammen' },
  // Denken
  { id: 'd-versteckt', area: 'denken', fromMonth: 8, toMonth: 12, title: 'Sucht versteckte Gegenstände' },
  { id: 'd-nachahmen', area: 'denken', fromMonth: 9, toMonth: 15, title: 'Ahmt einfache Handlungen nach' },
  { id: 'd-formen', area: 'denken', fromMonth: 15, toMonth: 24, title: 'Steckt einfache Formen ein' },
  { id: 'd-koerperteile', area: 'denken', fromMonth: 18, toMonth: 26, title: 'Zeigt Körperteile' },
  { id: 'd-farben', area: 'denken', fromMonth: 30, toMonth: 48, title: 'Benennt erste Farben' },
  { id: 'd-zaehlen', area: 'denken', fromMonth: 30, toMonth: 48, title: 'Zählt bis drei' },
  { id: 'd-puzzle', area: 'denken', fromMonth: 30, toMonth: 48, title: 'Legt ein Puzzle mit mehreren Teilen' },
  { id: 'd-name', area: 'denken', fromMonth: 54, toMonth: 72, title: 'Schreibt den eigenen Namen' },
  // Alltag
  { id: 'a-becher', area: 'alltag', fromMonth: 12, toMonth: 24, title: 'Trinkt aus dem offenen Becher' },
  { id: 'a-loeffel', area: 'alltag', fromMonth: 12, toMonth: 24, title: 'Isst mit dem Löffel' },
  { id: 'a-ausziehen', area: 'alltag', fromMonth: 18, toMonth: 30, title: 'Zieht Kleidung selbst aus' },
  { id: 'a-trocken', area: 'alltag', fromMonth: 24, toMonth: 48, title: 'Ist tagsüber trocken' },
  { id: 'a-zaehne', area: 'alltag', fromMonth: 30, toMonth: 60, title: 'Putzt die Zähne selbst (mit Nachputzen)' },
  { id: 'a-anziehen', area: 'alltag', fromMonth: 36, toMonth: 60, title: 'Zieht sich selbst an' },
];

/** @type {import('./model.js').Idea[]} */
export const IDEA_CATALOG = [
  // 0–6 Monate
  { id: 'k-kontrastkarten', title: 'Kontrastkarten anschauen', kind: 'spiel', area: 'denken', fromMonth: 0, toMonth: 4, material: 'Karten mit kräftigem Schwarz-Weiß-Muster', text: 'Die Karte etwa 25 cm vor das Gesicht halten und langsam zur Seite bewegen. Das Baby folgt mit den Augen.' },
  { id: 'k-bauchlage-spiegel', title: 'Bauchlage mit Spiegel', kind: 'uebung', area: 'motorik', fromMonth: 1, toMonth: 6, material: 'Kleiner, bruchsicherer Spiegel', text: 'Im wachen Zustand kurz auf den Bauch legen und den Spiegel davorstellen. Das stärkt Nacken und Rücken. Immer dabeibleiben.' },
  { id: 'k-grimassen', title: 'Grimassen nachmachen', kind: 'spiel', area: 'sozial', fromMonth: 1, toMonth: 8, material: '', text: 'Nah vor dem Gesicht langsam den Mund öffnen oder die Zunge zeigen, dann warten. Viele Babys antworten mit derselben Bewegung.' },
  { id: 'k-lieder-bewegung', title: 'Lieder mit Bewegungen', kind: 'spiel', area: 'sprache', fromMonth: 0, toMonth: 24, material: '', text: 'Beim Singen sanft Hände oder Füße im Takt bewegen. Wiederholung ist gewollt: Das Kind erkennt Lieder bald wieder.' },
  { id: 'k-rassel', title: 'Der Rassel folgen', kind: 'spiel', area: 'motorik', fromMonth: 2, toMonth: 7, material: 'Rassel', text: 'Seitlich leise rasseln, damit das Kind den Kopf dreht. Später die Rassel so halten, dass es danach greifen kann.' },
  { id: 'k-stoffe', title: 'Stoffe erfühlen', kind: 'spiel', area: 'denken', fromMonth: 3, toMonth: 12, material: 'Verschiedene Stoffreste (glatt, rau, weich)', text: 'Nacheinander Stoffe zum Greifen und Fühlen anbieten und benennen: weich, rau, glatt.' },
  // 6–12 Monate
  { id: 'k-kuckuck', title: 'Kuckuck-Spiel', kind: 'spiel', area: 'denken', fromMonth: 6, toMonth: 15, material: 'Ein Tuch', text: 'Das eigene Gesicht oder ein Spielzeug unter dem Tuch verstecken und wieder auftauchen lassen. Später zieht das Kind das Tuch selbst weg.' },
  { id: 'k-bilderbuch', title: 'Erste Bilderbücher', kind: 'spiel', area: 'sprache', fromMonth: 6, toMonth: 24, material: 'Pappbilderbuch', text: 'Gemeinsam anschauen, auf Bilder zeigen und sie benennen. Das Kind bestimmt das Tempo.' },
  { id: 'k-ausraeumkiste', title: 'Ausräumkiste', kind: 'spiel', area: 'motorik', fromMonth: 7, toMonth: 18, material: 'Kiste mit sicheren Alltagsdingen (keine Kleinteile)', text: 'Holzlöffel, Becher, Tücher, ein Schneebesen: Ausräumen und Einräumen ist für Kinder in diesem Alter ein großes Spiel.' },
  { id: 'k-kissenparcours', title: 'Kissen-Parcours', kind: 'uebung', area: 'motorik', fromMonth: 7, toMonth: 15, material: 'Sofakissen, Decken', text: 'Kissen auf dem Boden verteilen, sodass das Kind darüber krabbeln oder sich daran hochziehen kann.' },
  { id: 'k-topfmusik', title: 'Topfmusik', kind: 'spiel', area: 'denken', fromMonth: 8, toMonth: 24, material: 'Töpfe, Deckel, Holzlöffel', text: 'Verschiedene Töpfe klingen unterschiedlich. Laut und leise ausprobieren, gemeinsam einen Takt klopfen.' },
  { id: 'k-becher-stapeln', title: 'Becher stapeln und umwerfen', kind: 'spiel', area: 'motorik', fromMonth: 8, toMonth: 24, material: 'Stapelbecher', text: 'Erst bauen Erwachsene, das Kind wirft um. Nach und nach stapelt es selbst.' },
  { id: 'k-schiebekarton', title: 'Karton schieben', kind: 'uebung', area: 'motorik', fromMonth: 9, toMonth: 18, material: 'Schwerer Karton, z. B. mit Büchern beschwert', text: 'Ein beschwerter Karton ist ein standfester Schiebewagen für die ersten Schritte.' },
  { id: 'k-ball-rollen', title: 'Ball hin und her rollen', kind: 'spiel', area: 'sozial', fromMonth: 10, toMonth: 24, material: 'Weicher Ball', text: 'Gegenüber sitzen und den Ball zurollen. Das übt Abwechseln: Du bist dran, ich bin dran.' },
  // 12–24 Monate
  { id: 'k-wasser-schuetten', title: 'Wasser umschütten', kind: 'spiel', area: 'motorik', fromMonth: 12, toMonth: 36, material: 'Becher, Schüssel, Handtuch', text: 'In der Badewanne oder draußen Wasser von Becher zu Becher gießen. Nur mit Aufsicht.' },
  { id: 'k-formen-sortieren', title: 'Formen einstecken', kind: 'spiel', area: 'denken', fromMonth: 12, toMonth: 30, material: 'Steckbox oder Karton mit ausgeschnittenen Löchern', text: 'Bausteine durch passende Löcher stecken. Mit einer Form beginnen, dann mehr anbieten.' },
  { id: 'k-kritzeln', title: 'Erstes Kritzeln', kind: 'basteln', area: 'motorik', fromMonth: 12, toMonth: 30, material: 'Dicke Wachsmalblöcke, großes Papier', text: 'Das Papier auf dem Tisch festkleben, damit es nicht wegrutscht. Es geht ums Ausprobieren, nicht um ein Bild.' },
  { id: 'k-tiergeraeusche', title: 'Tiergeräusche raten', kind: 'spiel', area: 'sprache', fromMonth: 12, toMonth: 30, material: 'Tierbilder oder Spielfiguren', text: 'Ein Tier zeigen und das Geräusch machen. Später macht das Kind das Geräusch und du rätst.' },
  { id: 'k-aufraeumlied', title: 'Aufräumen mit Lied', kind: 'uebung', area: 'alltag', fromMonth: 15, toMonth: 36, material: '', text: 'Immer dasselbe kurze Lied zum Aufräumen singen. Das macht den Übergang leichter.' },
  // 24–36 Monate
  { id: 'k-knete', title: 'Knete selbst machen', kind: 'basteln', area: 'motorik', fromMonth: 24, toMonth: 60, material: 'Mehl, Salz, Wasser, etwas Öl, Lebensmittelfarbe', text: 'Zwei Tassen Mehl, eine Tasse Salz, etwa eine Tasse Wasser und ein Löffel Öl verkneten. Gemeinsam färben und formen.' },
  { id: 'k-reissbild', title: 'Reißbild kleben', kind: 'basteln', area: 'motorik', fromMonth: 24, toMonth: 48, material: 'Buntpapier, Klebestift, Papier', text: 'Papier in Stücke reißen und auf eine vorgezeichnete Form kleben. Reißen trainiert die Finger.' },
  { id: 'k-farben-sortieren', title: 'Farben sortieren', kind: 'spiel', area: 'denken', fromMonth: 24, toMonth: 42, material: 'Bausteine, Schalen in passenden Farben', text: 'Bausteine nach Farben in Schalen sortieren und dabei die Farben benennen.' },
  { id: 'k-seil-balancieren', title: 'Auf dem Seil balancieren', kind: 'uebung', area: 'motorik', fromMonth: 24, toMonth: 48, material: 'Seil oder Klebeband am Boden', text: 'Ein Seil auf den Boden legen und darauf entlanggehen, vorwärts, später rückwärts.' },
  { id: 'k-wimmelbuch', title: 'Was passiert auf dem Bild?', kind: 'spiel', area: 'sprache', fromMonth: 24, toMonth: 48, material: 'Wimmelbuch', text: 'Fragen stellen: Wer ist da? Was macht der? Was passiert gleich? Das Kind erzählt, du hörst zu.' },
  { id: 'k-tisch-decken', title: 'Tisch mit decken', kind: 'uebung', area: 'alltag', fromMonth: 24, toMonth: 60, material: 'Bruchsicheres Geschirr', text: 'Teller, Löffel und Becher für alle verteilen. Das übt Zählen und Zuordnen nebenbei.' },
  { id: 'k-selbst-anziehen', title: 'Selbst anziehen üben', kind: 'uebung', area: 'alltag', fromMonth: 24, toMonth: 48, material: 'Weite Kleidung, Hosen mit Gummizug', text: 'Kleidung in der richtigen Reihenfolge hinlegen. Viel Zeit einplanen, nur bei Bedarf helfen.' },
  { id: 'k-kaufladen', title: 'Kaufladen spielen', kind: 'spiel', area: 'sozial', fromMonth: 30, toMonth: 72, material: 'Leere Verpackungen, Korb, Spielgeld', text: 'Abwechselnd Verkäufer und Kunde sein. Rollen tauschen übt, sich in andere hineinzuversetzen.' },
  // 36–48 Monate
  { id: 'k-schneiden', title: 'Schneiden üben', kind: 'basteln', area: 'motorik', fromMonth: 30, toMonth: 60, material: 'Kinderschere, Papierstreifen', text: 'Mit schmalen Streifen beginnen, die mit einem Schnitt durch sind. Später an Linien entlang schneiden.' },
  { id: 'k-backen', title: 'Zusammen backen', kind: 'uebung', area: 'alltag', fromMonth: 30, toMonth: 72, material: 'Einfaches Rezept, z. B. Kekse', text: 'Abwiegen, rühren, ausstechen: Das Kind darf alles machen, was ohne Ofen und Messer geht.' },
  { id: 'k-memory', title: 'Memory', kind: 'spiel', area: 'denken', fromMonth: 36, toMonth: 72, material: 'Memory, anfangs mit wenigen Paaren', text: 'Mit sechs bis acht Paaren beginnen und mehr dazunehmen, wenn es leicht fällt.' },
  { id: 'k-was-fehlt', title: 'Was fehlt?', kind: 'spiel', area: 'denken', fromMonth: 36, toMonth: 72, material: 'Fünf Alltagsgegenstände, Tuch', text: 'Gegenstände anschauen, zudecken, einen heimlich wegnehmen. Welcher fehlt?' },
  { id: 'k-reime', title: 'Reime finden', kind: 'spiel', area: 'sprache', fromMonth: 36, toMonth: 72, material: '', text: 'Ein Wort sagen, das Kind sucht ein Wort, das sich reimt: Haus, Maus, raus. Quatschwörter zählen auch.' },
  { id: 'k-blaetter-durchreiben', title: 'Blätter durchreiben', kind: 'basteln', area: 'denken', fromMonth: 36, toMonth: 72, material: 'Blätter, dünnes Papier, Wachsmalstifte', text: 'Blätter unter das Papier legen und mit der Seite des Stifts darüberreiben. Die Adern erscheinen.' },
  { id: 'k-kresse', title: 'Kresse säen', kind: 'basteln', area: 'denken', fromMonth: 36, toMonth: 72, material: 'Kressesamen, Watte, flache Schale', text: 'Samen auf feuchte Watte streuen, jeden Tag schauen und gießen. Nach ein paar Tagen wird geerntet.' },
  { id: 'k-gefuehle', title: 'Gefühle-Gesichter', kind: 'spiel', area: 'sozial', fromMonth: 36, toMonth: 72, material: 'Bilder von Gesichtern oder selbst gemalte Karten', text: 'Gesichter nachmachen und benennen: fröhlich, traurig, wütend, überrascht. Wann hast du dich so gefühlt?' },
  { id: 'k-parcours-draussen', title: 'Hindernisparcours draußen', kind: 'uebung', area: 'motorik', fromMonth: 36, toMonth: 72, material: 'Seil, Eimer, Kissen, Kreide', text: 'Drüber steigen, drunter krabbeln, auf Kreidepunkte springen. Das Kind darf den Parcours mitgestalten.' },
  { id: 'k-ball-fangen', title: 'Ball fangen', kind: 'uebung', area: 'motorik', fromMonth: 36, toMonth: 72, material: 'Großer, leichter Ball', text: 'Aus kurzer Entfernung zuwerfen, Abstand langsam vergrößern.' },
  // 48–72 Monate
  { id: 'k-storch', title: 'Storch-Spiel', kind: 'uebung', area: 'motorik', fromMonth: 42, toMonth: 72, material: '', text: 'Wer kann am längsten wie ein Storch auf einem Bein stehen? Beide Beine ausprobieren.' },
  { id: 'k-brettspiel', title: 'Erstes Brettspiel', kind: 'spiel', area: 'sozial', fromMonth: 42, toMonth: 72, material: 'Einfaches Würfelspiel', text: 'Würfeln, zählen, warten und auch mal verlieren: Das alles übt ein einfaches Brettspiel.' },
  { id: 'k-zahlen-suchen', title: 'Zahlen unterwegs suchen', kind: 'spiel', area: 'denken', fromMonth: 48, toMonth: 72, material: '', text: 'Auf Hausnummern, Schildern und Kennzeichen nach Zahlen suchen. Wer findet die Drei?' },
  { id: 'k-geschichte', title: 'Geschichte weitererzählen', kind: 'spiel', area: 'sprache', fromMonth: 48, toMonth: 72, material: '', text: 'Einen Satz anfangen, das Kind erzählt weiter, dann wieder du. So entsteht eine gemeinsame Geschichte.' },
  { id: 'k-name-spuren', title: 'Namen nachspuren', kind: 'uebung', area: 'denken', fromMonth: 48, toMonth: 72, material: 'Papier, Stifte', text: 'Den Namen groß vorschreiben, das Kind fährt die Buchstaben nach. Mit dem ersten Buchstaben beginnen.' },
  { id: 'k-schatzsuche', title: 'Schatzsuche mit Karte', kind: 'spiel', area: 'denken', fromMonth: 48, toMonth: 72, material: 'Papier, Stift, ein kleiner Schatz', text: 'Eine einfache Karte der Wohnung zeichnen und das Versteck mit einem Kreuz markieren.' },
  { id: 'k-falten', title: 'Papier falten', kind: 'basteln', area: 'motorik', fromMonth: 54, toMonth: 72, material: 'Quadratisches Papier', text: 'Mit einfachen Faltungen beginnen: Hut, Becher oder Schiff. Kanten gemeinsam scharf streichen.' },
];
