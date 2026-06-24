# Legacy view migration status

## Native Nuxt views completed

- `/system/releases` → `src/pages/ReleaseNotes.page.vue`
  - Legacy source: `schulcloud-client/controllers/system.js` + `views/system/releases.hbs`
  - Nuxt route: `system-releases`
  - Tests: `src/pages/ReleaseNotes.page.unit.ts`


- `/calendar` → `src/pages/Calendar.page.vue`
  - Legacy source: `schulcloud-client/controllers/calendar.js` + `views/calendar/calendar.hbs`
  - Nuxt route: `calendar`
  - Tests: `src/pages/Calendar.page.unit.ts`
  - Note: native list/detail-oriented event overview replaces FullCalendar modal UI; create/edit flows remain a future slice.


- `/account` → `src/pages/AccountSettings.page.vue`
  - Legacy source: `schulcloud-client/controllers/account.js` + `views/account/settings.hbs`
  - Nuxt route: `account-settings`
  - Tests: `src/pages/AccountSettings.page.unit.ts`
  - Note: native profile/password update uses v3 account API; legacy email field is omitted because current `MeResponse` does not expose email.


- `/account/thirdPartyProviders` → `src/pages/account/ThirdPartyProviders.page.vue`
  - Legacy source: `schulcloud-client/controllers/account.js` + `views/account/thirdPartyProviders.hbs`
  - Nuxt route: `account-third-party-providers`
  - Tests: `src/pages/account/ThirdPartyProviders.page.unit.ts`

- `/account/teams` → `src/pages/account/AccountTeams.page.vue`
  - Legacy source: `schulcloud-client/controllers/account.js` + `views/account/teams.hbs`
  - Nuxt route: `account-teams`
  - Tests: `src/pages/account/AccountTeams.page.unit.ts`
  - Note: migrated as a native informational shell; the concrete discoverability toggle needs a follow-up backend/config slice.


- `/help/articles` → `src/pages/help/HelpArticles.page.vue`
  - Legacy source: `schulcloud-client/controllers/help.js` + `views/help/help.hbs` + `helpers/content/tutorials.json`
  - Nuxt route: `help-articles`
  - Tests: `src/pages/help/HelpArticles.page.unit.ts`
  - Note: native help landing uses the legacy tutorial inventory as static typed data and keeps article/detail routes (`/help/confluence/:id`, `/help/contact`, `/help/faq/documents`) as follow-up slices.


- `/help/contact` → `src/pages/help/HelpContact.page.vue`
  - Legacy source: `schulcloud-client/controllers/help.js` + `views/help/contact.hbs` + `views/help/contact-card.hbs`
  - Nuxt route: `help-contact`
  - Tests: `src/pages/help/HelpContact.page.unit.ts`
  - Note: native form uses v3 Helpdesk API for problem/wish submissions; file attachments remain a follow-up slice.


- `/help/confluence/:id` → `src/pages/help/HelpConfluence.page.vue`
  - Legacy source: `schulcloud-client/controllers/help.js` + `views/help/confluence.hbs`
  - Nuxt route: `help-confluence`
  - Tests: `src/pages/help/HelpConfluence.page.unit.ts`
  - Note: native route keeps the embedded Confluence article frame and external-open fallback.


- `/help/faq/documents` → `src/pages/help/HelpDocuments.page.vue`
  - Legacy source: `schulcloud-client/controllers/help.js` + `views/help/accordion-sections.hbs` + server `/help/documents` service
  - Nuxt route: `help-documents`
  - Tests: `src/pages/help/HelpDocuments.page.unit.ts`
  - Note: native view fetches themed help document sections from `/help/documents` and renders sanitized rich HTML.


- `/homework/:id` → `src/pages/tasks/TaskDetail.page.vue`
  - Legacy source: `schulcloud-client/controllers/homework.js` + `views/homework/homework.hbs` / `homework/assignment` render
  - Nuxt route: `task-detail`
  - Tests: `src/pages/tasks/TaskDetail.page.unit.ts`
  - Note: native detail view uses the generated v3 task list API and filters by id because no generated single-task GET is available. A read-only submission-status section now uses `SubmissionApiFactory().submissionControllerFindStatusesByTask`; create/edit/full submission workflows remain follow-up slices.


- `/news` → `src/modules/page/news/NewsOverview.page.vue`
  - Legacy source: `schulcloud-client/controllers/news.js` + `views/news/overview.hbs`
  - Nuxt route: `news-overview`
  - Tests: `src/modules/page/news/NewsOverview.page.unit.ts`
  - Note: news detail/create/edit were already native; legacy `news/article` and `news/overview` are removed from the migration registry.


- `/files` → `src/pages/FilesOverview.page.vue`
  - Legacy source: `schulcloud-client/controllers/files.js` + `views/files/files-overview.hbs`
  - Nuxt route: `files-overview`
  - Tests: `src/pages/FilesOverview.page.unit.ts`
  - Note: native file-area hub links to personal, course, shared and search views; concrete file lists (`files/files`) and search results remain follow-up slices. Team files are intentionally not prioritized because Teams is being phased out.


- `/files/my/` → `src/pages/PersonalFiles.page.vue`
  - Legacy source: `schulcloud-client/controllers/files.js` + `views/files/files.hbs` (`/files/my/{:folderId}{/:subFolderId}` branch)
  - Nuxt route: `personal-files`
  - Tests: `src/pages/PersonalFiles.page.unit.ts`
  - Note: native read-only personal file list uses the generated file-storage API with `FileRecordParentType.USERS`; upload/folder mutation and nested legacy folder paths remain follow-up slices.

## Migration scaffold

- All rendered legacy views are inventoried in `legacy-view-migration-inventory.md` / `legacy-view-inventory.json`.
- Known not-yet-native legacy view paths route to `/legacy-view-migration?path=...` instead of silently forwarding to the legacy client.
- Unknown legacy paths still forward to legacy for safety.
