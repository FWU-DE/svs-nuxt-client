# Datei-Bereich: API- und Migrationsplan

## Ziel

Den Legacy-Datei-Bereich aus `schulcloud-client` vollständig durch native Nuxt-Views ersetzen, ohne alte `/files/*` Routen blind weiterzuleiten.

Aktueller Stand:

- `/files` ist als native Hub-Seite umgesetzt.
- `/files/my/` ist als native read-only Liste umgesetzt.
- Vollständige Parität fehlt noch für Upload, Ordner, verschachtelte Pfade, Suche, geteilte Dateien und Archivdownloads.

## Relevante Legacy-Quellen

- Controller: `schulcloud-client/controllers/files.js`
- Hauptviews:
  - `views/files/files-overview.hbs` → `/files` Hub, bereits nativ migriert.
  - `views/files/files.hbs` → konkrete Datei-/Ordnerlisten, noch offen.
  - `views/files/search.hbs` → Suche/Filter, noch offen.
  - `views/files/file-upload.hbs` → Upload, noch offen.
  - `views/files/file-viewer.hbs` / `views/files/files-grid.hbs` → Listen-/Grid-Darstellung, noch offen.
- Legacy-Routen mit Datei-Parität:
  - `/files/my/{:folderId}{/:subFolderId}`
  - `/files/shared/`
  - `/files/courses/`
  - `/files/courses/:courseId{/:folderId}`
  - `/files/search/`
  - diverse Mutation-Endpoints unter `/files/file`, `/files/directory`, `/files/file/:id/move`, `/files/newFile`

## Aktuelle native Implementierung

### `/files`

- Native Seite: `nuxt-client/src/pages/FilesOverview.page.vue`
- Test: `nuxt-client/src/pages/FilesOverview.page.unit.ts`
- Route: `files-overview`
- Status: erledigt
- Hinweis: Team-Dateien nicht priorisieren, da Teams abgeschafft wird.

### `/files/my/`

- Native Seite: `nuxt-client/src/pages/PersonalFiles.page.vue`
- Test: `nuxt-client/src/pages/PersonalFiles.page.unit.ts`
- Route: `personal-files`
- Status: read-only MVP erledigt
- Aktueller API-Aufruf:
  - `FileApiFactory(...).list(schoolId, StorageLocation.SCHOOL, userId, FileRecordParentType.USERS, 0, 100)`
- Bekannte Lücke:
  - Es ist noch nicht endgültig validiert, ob `parentId=userId` + `parentType=USERS` der dauerhafte Contract für persönliche Root-Dateien ist.

## Fehlende API-/Contract-Bausteine

### 1. Persönliche Dateien Root-Contract

Problem:

Legacy nutzt den aktuellen User als Storage-Context. Native File-Storage nutzt `storageLocationId`, `StorageLocation`, `parentId`, `parentType`.

Benötigt:

- Klarer Contract für persönliche Root-Dateien:
  - `storageLocationId`: vermutlich `schoolId`
  - `storageLocation`: `SCHOOL`
  - `parentId`: vermutlich `userId`
  - `parentType`: `USERS`
- Backend-Test, der diesen Contract absichert.
- Frontend-Test, der `/files/my/` gegen diesen Contract nutzt.

Akzeptanz:

- `GET /file-records` bzw. generierter `fileApi.list(...)` liefert persönliche Root-Dateien für den eingeloggten User.
- Keine fremden User-Dateien werden sichtbar.
- Fehler bei fehlendem Kontext oder fehlender Berechtigung sind eindeutig.

### 2. Ordner anlegen/umbenennen/löschen

Legacy-Funktionen:

- `POST /files/directory`
- `DELETE /files/directory`
- Ordner umbenennen über Legacy-Form/JS

Benötigt in moderner API:

- Create folder:
  - Name
  - Parent ID
  - Parent type
  - Storage location
- Rename folder:
  - Folder/FileRecord ID
  - Neuer Name
- Delete folder / move to trash:
  - Folder/FileRecord ID
  - rekursives Verhalten klar definieren
- Fehlerfälle:
  - doppelter Name
  - ungültige Zeichen
  - fehlende Rechte
  - nicht leerer Ordner, falls relevant

Akzeptanz:

- Frontend kann Ordner in `/files/my/` erstellen, umbenennen und löschen.
- Server prüft Ownership/Berechtigungen.
- API gibt validierbare Fehlercodes zurück, keine Legacy-Session-Notifications.

### 3. Verschachtelte Pfade und Breadcrumbs

Legacy-Routen:

- `/files/my/:folderId`
- `/files/my/:folderId/:subFolderId`
- `/files/courses/:courseId/:folderId`

Benötigt:

- API für Ordner-Kinder:
  - `listChildren(folderId)` oder vorhandenes `list(... parentId=folderId ...)` eindeutig dokumentieren.
- API für Breadcrumbs:
  - `GET folder path ancestors`
  - oder `GET file/folder by id` mit `parentId`, sodass Frontend rekursiv auflösen kann.
- Native Routen:
  - `/files/my/:folderId`
  - optional `/files/my/:folderId/:subFolderId` nur als Kompatibilitäts-Redirect auf kanonische Route.

Akzeptanz:

- Deep Link auf verschachtelten Ordner zeigt korrekten Inhalt.
- Breadcrumbs führen zurück zu `/files` und `/files/my/`.
- Ungültige/unerlaubte Folder-IDs zeigen 404/403 statt Legacy-Fallback.

### 4. Upload persönlicher Dateien

Moderne API existiert grundsätzlich:

- `fileApi.upload(storageLocationId, storageLocation, parentId, parentType, file)`

Benötigt:

- Contract-Sicherung für persönliche Dateien:
  - Upload nach Root `USERS/userId`
  - Upload in Unterordner
- Upload-Fehler:
  - Quota
  - Dateigröße
  - Virenscan-/Security-Status
  - ungültiger Dateiname
- Frontend UX:
  - Dropzone oder Button
  - Fortschritt
  - neue Datei direkt in Liste

Akzeptanz:

- Datei kann in `/files/my/` hochgeladen werden.
- Nach Upload erscheint sie ohne Full-Page-Reload.
- Security-/Scan-Status wird angezeigt oder klar zurückgestellt.

### 5. Geteilte Dateien

Legacy:

- `/files/shared/`
- queryt alte `/files` Collection mit Permissions und Creator-Filter.

Benötigt:

- Moderner Endpoint, z. B.:
  - `GET /file-records/shared-with-me`
  - oder `fileApi.listSharedWithMe(...)`
- Response muss enthalten:
  - Datei/Folders
  - Owner/Creator
  - read/write/delete/create Permissions
  - optional Share-Quelle

Akzeptanz:

- `/files/shared/` kann nativ als read-only Liste gerendert werden.
- Dateien mit Schreibrecht werden korrekt markiert oder später editierbar.
- Keine eigenen Dateien erscheinen fälschlich in „geteilt mit mir“.

### 6. Suche und Filter

Legacy:

- `/files/search/`
- Filtergruppen:
  - Bilder
  - Videos
  - PDFs
  - MS Office
  - Suchtext

Benötigt:

- Moderner Search Endpoint:
  - query text
  - MIME type filter groups
  - scope: personal, course, shared, all available
  - pagination
  - sorting

Akzeptanz:

- `/files/search/` ist native Suchseite.
- Filtergruppen liefern gleiche oder bewusst dokumentierte bessere Ergebnisse.
- Suchergebnisse öffnen Datei/Ordner nativ oder per sicherem Download-Link.

### 7. Kursdateien

Legacy:

- `/files/courses/`
- `/files/courses/:courseId{/:folderId}`

Benötigt:

- Contract für Kurs-Root-Dateien:
  - `parentId=courseId`
  - `parentType=COURSES`
  - storageLocationId = schoolId
- Liste eigener Kurse/Kursräume für den Einstieg.
- Breadcrumbs und Deep Links.

Akzeptanz:

- `/files/courses/` zeigt Kurse/Kursräume mit Datei-Zugriff.
- `/files/courses/:courseId` zeigt Datei-Liste.
- Rechte folgen Kursmitgliedschaft.

### 8. Archivdownload

Legacy:

- Download aller Dateien für persönliche Dateien und teilweise Team/Kurs-Kontexte.

Benötigt:

- Moderne API für Archivdownload:
  - by parent
  - optional by selected records
  - optional by search scope
- Asynchrones Verhalten definieren:
  - Direktdownload oder Job + Polling.

Akzeptanz:

- „Alle herunterladen“ funktioniert ohne Legacy-Endpunkt.
- Große Archive blockieren UI nicht.
- Fehler sind sichtbar und lokalisiert.

## Vorgeschlagene Umsetzungsschritte

### Phase 1: Contract-Spike File Storage

Ziel: vorhandene File-Storage-API gegen reale Server-Implementierung validieren.

Aufgaben:

1. Server-Code für File-Storage-Module lesen:
   - Generated API: `nuxt-client/src/generated/fileStorageApi/v3/api/file-api.ts`
   - Server-Module im `schulcloud-server`
2. Klären:
   - Wie persönliche Root-Dateien eindeutig adressiert werden.
   - Ob Ordner als `FileRecord` modelliert sind oder separates Entity-Modell haben.
   - Welche API-Methoden bereits für Folder-Mutation existieren.
3. Ergebnis als kleine Contract-Notiz ergänzen:
   - `.hermes/plans/file-area-api-contract-notes.md`

Akzeptanz:

- Kein UI-Patch ohne geklärten Contract für Root/Folder.

### Phase 2: Persönliche Dateien vollständig machen

Aufgaben:

1. `/files/my/` von read-only Liste zu produktiver Liste erweitern:
   - Upload
   - Sortierung
   - Empty State
   - Fehlerstatus
2. Falls API fehlt: Server-Endpunkte minimal ergänzen.
3. Tests:
   - API/composable Tests
   - Page Tests
   - Permission/ownership Tests serverseitig

Akzeptanz:

- User kann persönliche Root-Dateien sehen und hochladen.

### Phase 3: Nested Personal Folders

Aufgaben:

1. API für Folder children/path absichern.
2. Native Route `/files/my/:folderId` ergänzen.
3. Breadcrumbs und Ordnernavigation bauen.
4. Ordner-Mutation ergänzen.

Akzeptanz:

- Deep links und Breadcrumbs funktionieren.

### Phase 4: Shared Files

Aufgaben:

1. `shared-with-me` API ergänzen oder vorhandene API nutzen.
2. Native `/files/shared/` Seite bauen.
3. Tests für fremde/eigene/permissionbasierte Dateien.

Akzeptanz:

- Geteilte Dateien sind nativ sichtbar.

### Phase 5: Search

Aufgaben:

1. Search API definieren/implementieren.
2. Native `/files/search/` Seite bauen.
3. MIME-Gruppen und Textsuche testen.

Akzeptanz:

- Legacy-Suche ist nativ ersetzt.

### Phase 6: Course Files

Aufgaben:

1. Kursdateien-Contract absichern.
2. Native `/files/courses/` und `/files/courses/:courseId` bauen.
3. Optional Redirects auf moderne Room-/Folder-Struktur prüfen.

Akzeptanz:

- Kursdateien sind ohne Legacy erreichbar.

## Nicht priorisiert

- Team-Dateien (`/files/teams/...`), da Teams abgeschafft wird.
- Vollständige Legacy-JS-Parität, wenn moderne UX bessere zentrale Folder-Komponenten nutzt.

## Risiken

- Der alte `/fileStorage` und neue `fileStorageApi/v3` Contract könnten unterschiedliche Datenmodelle haben.
- Persönliche Dateien könnten serverseitig noch nicht vollständig auf `FileRecordParentType.USERS` modelliert sein.
- Ordner könnten in der modernen API nicht als normale FileRecords existieren.
- Archivdownload kann lange Laufzeiten/Jobs benötigen.

## Verifikation je Slice

Frontend:

```bash
cd /Users/janrenz/code/svs/nuxt-client
npm run test:unit -- <focused tests> legacy-view-migration.unit.ts legacy-route-compatibility.guard.unit.ts
npx eslint <touched files>
npx vue-tsc --noEmit --pretty false
```

Bekannter Typecheck-Altfehler:

```text
tests/test-utils/mockStatusAlerts.ts(1,29): error TS2307: Cannot find module '@/store/types/status-alert' or its corresponding type declarations.
```

Server:

```bash
cd /Users/janrenz/code/svs/schulcloud-server
# konkrete Testkommandos nach Modulprüfung ergänzen
```

## Done-Kriterium für Datei-Bereich

Der Legacy-Datei-Bereich gilt als migriert, wenn folgende Routen nativ oder bewusst deaktiviert/redirected sind:

- `/files`
- `/files/my/`
- `/files/my/:folderId`
- `/files/shared/`
- `/files/courses/`
- `/files/courses/:courseId`
- `/files/search/`

Und folgende Legacy-Registry-Einträge entfernt sind:

- `files/files-overview` ✅
- `files/files`
- `files/search`
