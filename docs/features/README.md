# Feature-Notizen

Kurze Erklärungen der neuen Funktionen rund um Räume und Bereiche — für Kolleg:innen, Support und
alle, die wissen wollen, was eine Funktion tut, ohne in den Code zu schauen.

| Notiz | Worum es geht |
| --- | --- |
| [Raum-Vorlagen](raum-vorlagen.md) | sieben fertige Raumstrukturen mit Parametern statt leerem Raum |
| [Raum mit KI erstellen](raum-mit-ki.md) | Raum in eigenen Worten beschreiben, Struktur vorschlagen lassen |
| [Karten mit KI ergänzen](board-ki-karten.md) | Differenzieren, Übungen, einfache Sprache, Selbstcheck — und OER-Material aus AMB und OERSI |

Die technische Sicht auf dieselben Funktionen steht in
[`schulcloud-server/docs/room-ai-and-mcp-architecture.md`](../../../schulcloud-server/docs/room-ai-and-mcp-architecture.md).

## Screenshots erneuern

Die Bilder in `images/` entstehen skriptgesteuert gegen den lokalen Stack — kein Bild von Hand:

```bash
node scripts/capture-docs-screenshots.mjs                 # alle
node scripts/capture-docs-screenshots.mjs board-ai-dialog # einzelne
```

Das Skript meldet sich über die API an, setzt das Session-Cookie in ein headless gestartetes
Chrome, öffnet die Seite, klickt die gezeigte Situation zusammen und speichert den PNG. Der Server
auf :3030 und der Client dieses Worktrees auf :4001 müssen laufen; ein anderes Board wählt man mit
`DOCS_BOARD_ID=<id>`.
