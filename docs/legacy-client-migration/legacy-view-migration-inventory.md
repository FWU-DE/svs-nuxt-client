# Legacy client view migration inventory

- Legacy .hbs templates: 223
- Rendered views from controllers: 72
- Legacy controller route handlers: 205
- Nuxt page .vue files: 35
- Nuxt route whitelist entries: 67

## Rendered views by category

### account (7)
- `account/settings` from `controllers/account.js:41`
- `account/settings` from `controllers/account.js:53`
- `account/settings` from `controllers/account.js:68`
- `account/settings` from `controllers/account.js:77`
- `account/teams` from `controllers/account.js:90`
- `account/thirdPartyProviders` from `controllers/account.js:106`
- `account/settings` from `controllers/account.js:154`

### administration (10)
- `administration/users_registrationcomplete` from `controllers/administration.js:504`
- `administration/import` from `controllers/administration.js:632`
- `administration/users_edit` from `controllers/administration.js:690`
- `administration/import` from `controllers/administration.js:781`
- `administration/users_skipregistration` from `controllers/administration.js:821`
- `administration/users_edit` from `controllers/administration.js:990`
- `administration/classes-edit` from `controllers/administration.js:1103`
- `administration/classes-manage` from `controllers/administration.js:1324`
- `administration/teams` from `controllers/administration.js:1743`
- `administration/ldap-schoolyear-start` from `controllers/administration.js:1876`

### authentication (2)
- `authentication/home` from `controllers/login.js:316`
- `authentication/login` from `controllers/login.js:349`

### calendar (1)
- `calendar/calendar` from `controllers/calendar.js:21`

### courses (6)
- `courses/edit-course` from `controllers/courses.js:348`
- `courses/create-course` from `controllers/courses.js:365`
- `courses/edit-course` from `controllers/courses.js:466`
- `courses/course` from `controllers/courses.js:669`
- `courses/edit-courseGroup` from `controllers/coursegroups.js:53`
- `courses/courseGroup` from `controllers/coursegroups.js:157`

### files (10)
- `files/files` from `controllers/files.js:527`
- `files/files` from `controllers/files.js:577`
- `files/files-overview` from `controllers/files.js:596`
- `files/files` from `controllers/files.js:611`
- `files/files` from `controllers/files.js:656`
- `files/files` from `controllers/files.js:695`
- `files/files` from `controllers/files.js:742`
- `files/files` from `controllers/files.js:778`
- `files/files` from `controllers/files.js:813`
- `files/search` from `controllers/files.js:905`

### firstLogin (6)
- `firstLogin/forcePasswordChange` from `controllers/forcePasswordChange.js:17`
- `firstLogin/firstLoginShortened` from `controllers/firstLogin.js:109`
- `firstLogin/firstLogin` from `controllers/firstLogin.js:259`
- `firstLogin/firstLoginExistingUser` from `controllers/firstLogin.js:263`
- `firstLogin/consentError` from `controllers/firstLogin.js:272`
- `firstLogin/welcome` from `controllers/welcome.js:10`

### help (4)
- `help/help` from `controllers/help.js:15`
- `help/contact` from `controllers/help.js:25`
- `help/confluence` from `controllers/help.js:33`
- `help/accordion-sections` from `controllers/help.js:57`

### homework (4)
- `homework/edit` from `controllers/homework.js:367`
- `homework/edit` from `controllers/homework.js:424`
- `homework/edit` from `controllers/homework.js:439`
- `homework/assignment` from `controllers/homework.js:658`

### news (2)
- `news/overview` from `controllers/news.js:90`
- `news/article` from `controllers/news.js:109`

### oauth2 (3)
- `oauth2/consent` from `controllers/oauth2.js:96`
- `oauth2/username` from `controllers/oauth2.js:133`
- `oauth2/username` from `controllers/oauth2.js:145`

### pwRecovery (3)
- `pwRecovery/pwRecoveryResponse` from `controllers/pwrecovery.js:7`
- `pwRecovery/pwRecoveryFailed` from `controllers/pwrecovery.js:11`
- `pwRecovery/pwrecovery` from `controllers/pwrecovery.js:30`

### registration (4)
- `registration/registration-parent` from `controllers/registration.js:242`
- `registration/registration-student` from `controllers/registration.js:309`
- `registration/registration-employee` from `controllers/registration.js:388`
- `registration/registration` from `controllers/registration.js:427`

### system (1)
- `system/releases` from `controllers/system.js:26`

### teams (7)
- `teams/edit-team` from `controllers/teams.js:155`
- `teams/edit-course` from `controllers/teams.js:240`
- `teams/overview` from `controllers/teams.js:313`
- `teams/overview-empty` from `controllers/teams.js:325`
- `teams/team` from `controllers/teams.js:579`
- `teams/members` from `controllers/teams.js:1059`
- `teams/topics` from `controllers/teams.js:1278`

### topic (2)
- `topic/edit-topic` from `controllers/topics.js:46`
- `topic/topic` from `controllers/topics.js:276`