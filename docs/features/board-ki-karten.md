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
AMB und OERSI**. Der Suchbegriff ist mit dem Kartentitel vorbelegt und lässt sich ändern.

![Materialsuche mit Treffern aus AMB und OERSI](images/board-material-search.png)

Jeder Treffer zeigt, was man zur Beurteilung braucht: **Art des Materials, Bildungsstufe, Lizenz und
Anbieter**. Übernommene Treffer werden Karten mit Beschreibung, Lizenzangabe und Link auf die Quelle.

> Ein Suchwort trifft besser als ein ganzer Satz: „Fotosynthese" liefert bessere Ergebnisse als
> „Fotosynthese Sekundarstufe I", weil die Volltextsuche sonst auf „Sekundarstufe" anspringt.

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
