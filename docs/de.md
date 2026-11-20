# Trenitalia

Die nächsten Züge deiner Bahnhöfe in Italien, in Gladys: Regionalzüge, Frecciarossa, Intercity…
in Echtzeit, mit Verspätungen, Gleisen und Ausfällen.

Die Daten stammen aus [Viaggiatreno](http://www.viaggiatreno.it), der Echtzeit-Anzeige von RFI und
Trenitalia: **kein Konto, kein Schlüssel**. Viaggiatreno ist eine öffentliche Website, keine
offizielle API: sie kann sich ohne Vorwarnung ändern. Diese Integration steht in keiner Verbindung
zu Trenitalia, RFI oder der Gruppe Ferrovie dello Stato Italiane.

> **Außerhalb Italiens entwickelt: Rückmeldungen willkommen.** Die Integration wurde mit dem echten
> Viaggiatreno-Dienst gebaut und getestet (Milano Centrale, Roma Termini, Firenze Santa Maria
> Novella, Torino Porta Nuova), aber noch nicht im Alltag eingesetzt.

## Was du bekommst

- **Ein Gerät pro verfolgtem Bahnhof**, optional gefiltert nach Zugkategorie (Regional, Frecce,
  Intercity) und Ziel: Minuten bis zum nächsten fahrenden Zug und bis zum übernächsten, die
  Verspätung des nächsten, seine Uhrzeit, Nummer und sein Ziel („22:50 FR 9663 → Napoli
  Centrale“), sein Gleis und die Zahl der ausgefallenen Züge auf der Anzeige.
- **Ein Dashboard-Widget**: die nächsten Abfahrten eines Bahnhofs, nach Verspätung eingefärbt, mit
  Ausfällen.
- **Drei Szenen-Auslöser**: Zeit zu gehen (1 bis 30 Minuten vor einer Abfahrt), Zug verspätet (5
  bis 60 Minuten) und Zug fällt aus, jeweils einmal pro Zug.
- **Eine Szenen-Aktion**: die nächsten Züge eines Bahnhofs lesen, mit einem Satz für eine
  Nachricht oder einen Lautsprecher.

## Voraussetzungen

- Gladys Assistant 5.3.0 oder neuer.
- Internetzugang vom Gladys-Rechner (die Integration ruft `www.viaggiatreno.it` auf).

## Installation

1. Öffne in Gladys **Integrationen → Von GitHub installieren**.
2. Füge `https://github.com/guim31/gladys-trenitalia` ein und installiere.
3. Öffne den Tab **Konfiguration** der Integration, um Bahnhöfe zu verfolgen (siehe unten).

## Konfiguration

### Einstellungen

- **Sprache der Texte**: Sprache der Funktionsnamen, der Texte der Geräte und der Sätze für deine
  Szenen (standardmäßig Französisch). Die Funktionsnamen werden beim Anlegen eines Geräts
  festgelegt.
- **Aktualisierungsintervall**: 1, 2 oder 5 Minuten. Jede Aktualisierung liest eine Anzeige pro
  verfolgtem Bahnhof.

### Einen Bahnhof verfolgen

1. **Bahnhof suchen**: gib den Anfang seines Namens ein („Milano“, „Roma T“, „Forlì“). Die Antwort
   listet die passenden Bahnhöfe mit ihrem Code auf, etwa `[S01700]`. Viaggiatreno sucht nur am
   Anfang des Namens.
2. **Bahnhof verfolgen**: gib seinen vollständigen Namen oder Code ein. Optionale Filter:
   - **Zugkategorie**: nur Regionalzüge (REG, RV), nur Frecce (Frecciarossa, Frecciargento,
     Frecciabianca) oder nur Intercity (IC, ICN, EC, EN).
   - **Ziel**: ein Teil des Zugziels — `Napoli`, `Torino`, `Lecce`…
     Ein Name, der zu mehreren Bahnhöfen passt, antwortet mit deren Liste: gib den vollständigen
     Namen oder den Code ein.
3. Öffne den Tab **Entdecken** und lege das Gerät an.

Derselbe Bahnhof kann mehrmals mit anderen Filtern verfolgt werden: jeder ist ein Gerät.

### Entfernen, Status prüfen

- **Bahnhof nicht mehr verfolgen**: gib den Namen aus **Status** ein. Sein Gerät bleibt in Gladys,
  bis du es löschst.
- **Status**: die verfolgten Bahnhöfe, ob ihr Gerät angelegt ist, die letzte Abfrage von
  Viaggiatreno und der letzte Fehler.

Ein Fehler (nichts gefunden, Viaggiatreno nicht erreichbar) erscheint rot, ein Erfolg grün.

## Geräte

Jeder verfolgte Bahnhof hat sechs Funktionen:

| Funktion                     | Wert                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| Nächster Zug                 | Minuten bis zum nächsten fahrenden Zug; 1440, wenn keiner angekündigt |
| Übernächster Zug             | Minuten bis zum folgenden; 1440, wenn keiner                          |
| Verspätung des nächsten Zugs | Minuten Verspätung (ein früher Zug gilt als pünktlich); sonst 0       |
| Nächster Zug und Ziel        | „22:50 FR 9663 → Napoli Centrale“ oder „Kein Zug angekündigt“         |
| Gleis des nächsten Zugs      | das tatsächliche Gleis, sonst das geplante; sonst „–“                 |
| Ausgefallene Züge            | die Zahl der ausgefallenen Züge auf der Anzeige des Bahnhofs          |

Die Uhrzeiten sind italienische Zeit, Verspätung eingerechnet. Ein ausgefallener Zug ist nie „der
nächste Zug“. Ein Zug, dessen Zeit vorbei ist, der aber noch nicht abgefahren ist, gilt als jetzt abfahrend, verspätet um die schon vergangenen Minuten; 15 Minuten nach seiner Zeit ohne Neuigkeit gilt er als abgefahren. Der Auslöser „Zug verspätet“ folgt nur der von Viaggiatreno gemeldeten Verspätung. Viaggiatreno gibt die Verspätung eines Zugs erst an, wenn er seinen Startbahnhof
verlassen hat: vorher gilt er als pünktlich. Zwischen zwei Abfragen laufen die Countdowns ab der
letzten Antwort weiter.

## Dashboard-Widgets

**Nächste Züge**: wähle einen verfolgten Bahnhof. Jede Zeile zeigt Uhrzeit und Ziel, dann
Wartezeit, Zug, Gleis und Verspätung: grün pünktlich, orange ab 3 Minuten Verspätung, rot ab 10
oder bei Ausfall. Einstellungen: die Zahl der angezeigten Abfahrten (3 bis 10), die Legende und die
ausgefallenen Züge, beide ausblendbar. Die Überschrift ist der Name des Geräts in Gladys.

## Szenen-Auslöser

- **Zeit zu gehen**: ein Zug fährt in der gewählten Anzahl Minuten (1 bis 30) vom gewählten
  Bahnhof ab.
- **Zug verspätet**: ein Zug ab dem gewählten Bahnhof erreicht die gewählte Verspätung (5 bis 60
  Minuten).
- **Zug fällt aus**: ein Zug ab dem gewählten Bahnhof wird als ausgefallen gemeldet.

Jeder Schwellenwert löst einmal pro Zug aus. Bei der ersten Abfrage nach einem Start löst nichts
aus: was schon auf der Anzeige stand, ist keine Neuigkeit. Variablen: Bahnhof, Ziel, Kategorie,
Zugnummer, Wartezeit, Verspätung, erwartete und planmäßige Uhrzeit, Gleis.

## Szenen-Aktionen

**Nächste Züge abrufen**: für einen verfolgten Bahnhof gibt sie `sentence` zurück („REG 2986 nach
Saronno ab Milano Centrale: in 3 Min., Gleis 8, danach REG 2387 nach Voghera in 13 Min.“), dazu
`station_name`, `destination`, `category`, `train_number`, `minutes`, `following_minutes`,
`delay`, `expected_time`, `scheduled_time`, `platform` und `cancelled` (Zahl der ausgefallenen
Züge). Ohne Zug ist `minutes` 1440 und der Satz sagt es.

## Szenen-Beispiele

- _Jeden Werktag um 7:30_ → **Nächste Züge abrufen** (Monza, Regional, → Milano) → `sentence` an
  dein Handy senden.
- **Zeit zu gehen** (Roma Termini, Frecce → Napoli, 15 Min.) → auf einem Lautsprecher ansagen.
- **Zug fällt aus** (dein Bahnhof) → eine Nachricht mit Zugnummer und Uhrzeit senden.

## Daten, Aktualisierung und Kontingente

Die Integration liest nur für angelegte Geräte die Abfahrten jedes Bahnhofs (`partenze`, die Züge
der nächsten ein bis zwei Stunden) im gewählten Intervall; die Bahnhofssuche (`cercaStazione`,
`regione`, `dettaglioStazione`) nur, wenn du einen Bahnhof suchst oder hinzufügst. Viaggiatreno
veröffentlicht weder Kontingent noch Bedingungen für diese Nutzung: bleib bei privater Nutzung.
Höchstens eine Anfrage pro Bahnhof und Minute hält die Last gering. Sein CDN lehnt Anfragen ohne
Browser-User-Agent ab (HTTP 403): die Integration sendet einen, der sie benennt. Nur
`/data/watch.json` wird geschrieben: die verfolgten Bahnhöfe und ihre Filter.

## Fehlerbehebung

- **Kein Wert auf einem neuen Gerät**: warte auf die nächste Aktualisierung (eine Minute) oder
  prüfe **Status**.
- **„Viaggiatreno kann nicht gelesen werden“**: die Website ist nicht erreichbar, lehnt die Anfrage
  ab (HTTP 403) oder antwortet mit einer Fehlerseite; die Integration versucht es bei jeder
  Aktualisierung erneut, und die Countdowns laufen weiter.
- **Ein Zug fehlt**: er ist abgefahren, fährt erst in mehr als ein bis zwei Stunden oder passt
  nicht zu den Filtern.
- **Protokolle**: setze `LOG_LEVEL=debug`, um jede Abfrage zu sehen.

## Grenzen

- Die Züge, die Viaggiatreno zeigt: Trenitalia und die regionalen Betreiber im RFI-Netz.
  Italo-Züge (NTV) sind nicht abgedeckt.
- Viaggiatreno ist inoffiziell und undokumentiert: eine Änderung dort kann die Integration bis zu
  einem Update stören.
- Teilweise ausgefallene und umgeleitete Züge werden als fahrend angezeigt.
- Höchstens 10 verfolgte Bahnhöfe. Die Funktionsnamen werden beim Anlegen des Geräts festgelegt.

## Danksagung

Daten: [Viaggiatreno](http://www.viaggiatreno.it), RFI und Trenitalia. Die Nutzung dieses Dienstes
folgt der Home-Assistant-Integration `viaggiatreno` (Apache 2.0). Logo auf dem Titelbild:
Trenitalia (Marke ihres Inhabers).
