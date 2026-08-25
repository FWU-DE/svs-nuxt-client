# Karten mit KI ergänzen

**Wo:** in einem Bereich, im Menü einer Karte oder einer Spalte · **Voraussetzung:**
`FEATURE_BOARD_AI_CARDS_ENABLED` und ein hinterlegter Modellzugang

Ein Bereich ist angelegt, die erste Karte steht — und jetzt fehlt die zweite Fassung für die
Gruppe, die mehr Zeit braucht. Genau dafür ist „Mit KI ergänzen" da.

![Das Kartenmenü mit dem neuen Eintrag](images/board-card-menu.png)

## Die fünf Presets

| Preset | Was entsteht |
| --- | --- |
| **Differenzieren** | zwei Fassungen derselben Aufgabe: eine mit Teilschritten, Beispiel und Wortspeicher, eine mit Transfer und Begründung |
| **Übungsaufgaben** | Aufgaben mit steigender Schwierigkeit, dazu eine Karte mit Lösungshinweisen |
| **Sprache vereinfachen** | derselbe Inhalt in kurzen Sätzen, Fachbegriffe erklärt — für DaZ und inklusiven Unterricht |
| **Selbstcheck** | „Das kann ich jetzt …"-Aussagen zum Selbstprüfen plus kurze Antworten |
| **Freie Eingabe** | was du beschreibst, z. B. „drei Exit-Ticket-Fragen zum Inhalt" |

![Der Dialog mit den Presets](images/board-ai-dialog.png)

Grundlage ist das, worauf du zeigst: Im **Kartenmenü** liest die KI genau diese Karte, im
**Spaltenmenü** alle Karten der Spalte. Der Vorschlag wächst beim Schreiben mit.

![Ergebnis von „Differenzieren": zwei Niveaustufen derselben Aufgabe](images/board-ai-suggestion.png)

## Material finden

Das sechste Preset fragt kein Modell, sondern einen Katalog: die **offenen Bildungsmaterialien aus
AMB, OERSI und SODIX**. Der Suchbegriff ist mit dem Kartentitel vorbelegt und lässt sich ändern.

![Materialsuche mit Treffern aus AMB, OERSI und SODIX](images/board-material-search.png)

Jeder Treffer zeigt, was man zur Beurteilung braucht: **Art des Materials, Bildungsstufe, Lizenz und
Anbieter** — so weit die Quelle das angibt; fehlende Angaben bleiben einfach weg. Übernommene Treffer
werden Karten mit Beschreibung, Lizenzangabe und Link auf die Quelle.

Ein ganzer Satz im Suchfeld ist kein Problem mehr: Gesucht wird nach dem **Thema** darin, sortiert
wird gegen die ganze Eingabe. „Zellteilung Mitose Arbeitsblatt" sucht also „Zellteilung" und stellt
die Treffer nach vorn, in denen auch Mitose und Arbeitsblatt vorkommen. Unter der Trefferliste steht,
wonach tatsächlich gesucht wurde.

Gesucht wird in **drei Katalogen zugleich**, und sie decken Unterschiedliches ab:

| Katalog | Stärke |
| --- | --- |
| **SODIX** | Schulmaterial mit Bildungsstufe und Fach — Landesmedienzentren, Siemens Stiftung, Verlage |
| **OERSI** | schulfachliche Begriffe wie „Fotosynthese" oder „Bruchrechnen", oft Videos und Skripte |
| **AMB** | allgemeine und hochschulnahe Themen; bei Schulbegriffen häufig ohne Treffer |

Die Trefferliste nimmt abwechselnd aus allen dreien, damit kein Katalog die anderen verdrängt.

### Woher die Treffer kommen

Die drei Kataloge sind keine Suchmaschinen, die wir anfragen, sondern **offene Metadaten-Netze auf
Basis von Nostr**. Anbieter veröffentlichen dort die Beschreibung ihres Materials — Titel, Lizenz,
Fach, Bildungsstufe, Link — und wer will, liest mit. Die Schulcloud liest bei jeder Suche einmal je
Katalog mit.

Drei Dinge folgen daraus, die im Alltag zählen:

- **Wir speichern nichts davon.** Die Materialien bleiben bei ihren Anbietern; die eingefügte Karte
  enthält Beschreibung, Lizenz und einen Link auf die Originalquelle, keine Kopie.
- **Kein Konto, kein Vertrag.** Die Netze sind offen; es gibt nichts freizuschalten und keine
  Zugangsdaten zu pflegen.
- **Ein weiterer Katalog ist eine Zeile Konfiguration.** SODIX kam genau so dazu — ohne
  Codeänderung, ohne neue Oberfläche.

## Nichts passiert ohne Zustimmung

- Der Vorschlag steht im Dialog, das Board bleibt unverändert.
- **Jede Karte hat ein Häkchen** — was nicht passt, wird abgewählt.
- Erst „n Karten einfügen" legt die ausgewählten Karten am Ende der Spalte an.
- Bestehende Karten werden nie überschrieben, auch nicht bei „Sprache vereinfachen": Die einfachere
  Fassung entsteht als zusätzliche Karte.

## Gut zu wissen

- Der Eintrag erscheint nur, wenn du in diesem Bereich Karten anlegen darfst.
- Höchstens sechs Karten pro Vorschlag, drei Inhalte pro Karte.
- Vorgeschlagene Links werden vor dem Anzeigen geprüft; tote Adressen fallen weg.

Verwandt: [Raum-Vorlagen](raum-vorlagen.md) · [Raum mit KI erstellen](raum-mit-ki.md)
