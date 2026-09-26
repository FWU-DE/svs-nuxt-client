import { Layouts } from "@/layouts/types";
import { checkFolderFeature, checkRegisterExternalPersonsFeature, validateQueryParameters } from "@/router/guards";
import { boardCardLinkRedirect } from "@/router/guards/board-card-link-redirect";
import { createPermissionGuard } from "@/router/guards/permission.guard";
import { HttpStatusCode } from "@/types/enum/http-status-code.enum";
import { isEnum, isMongoId, isOfficialSchoolNumber, REGEX_ID } from "@/utils/validation";
import { H5PContentParentType } from "@api-h5p";
import { Permission, ToolContextType } from "@api-server";
import { useAppStore } from "@data-app";
import { useEnvConfig } from "@data-env";
import { isDefined } from "@vueuse/core";
import { RouteLocationNormalized, RouteRecordRaw } from "vue-router";

export const routes: Readonly<RouteRecordRaw>[] = [
	{
		path: "/account",
		component: () => import("@/pages/AccountSettings.page.vue"),
		name: "account-settings",
	},
	{
		path: "/account/teams",
		component: () => import("@/pages/account/AccountTeams.page.vue"),
		name: "account-teams",
	},
	{
		path: "/account/thirdPartyProviders",
		component: () => import("@/pages/account/ThirdPartyProviders.page.vue"),
		name: "account-third-party-providers",
	},
	{
		path: "/administration/ldap/activate",
		component: () => import("@/pages/administration/LDAPActivate.page.vue"),
		name: "administration-ldap-activate",
		beforeEnter: createPermissionGuard([Permission.ADMIN_VIEW, Permission.SCHOOL_EDIT]),
	},
	{
		path: "/administration/ldap/config",
		component: () => import("@/pages/administration/LDAPConfig.page.vue"),
		name: "administration-ldap-config",
		beforeEnter: createPermissionGuard([Permission.ADMIN_VIEW, Permission.SCHOOL_EDIT]),
	},
	{
		path: "/administration/migration",
		component: () => import("@/pages/administration/Migration.page.vue"),
		name: "administration-migration",
	},
	{
		path: "/administration/school-settings",
		component: () => import("@/pages/administration/SchoolSettings.page.vue"),
		name: "administration-school-settings",
		beforeEnter: createPermissionGuard([Permission.SCHOOL_EDIT]),
	},
	{
		path: "/administration/school-settings/tool-configuration",
		component: () => import("@/pages/administration/school-external-tool/SchoolExternalToolConfigurator.page.vue"),
		name: "administration-tool-config-overview",
		beforeEnter: createPermissionGuard([Permission.SCHOOL_TOOL_ADMIN]),
		children: [
			{
				path: ":configId",
				name: "administration-tool-config-edit",
				component: () => import("@/pages/administration/school-external-tool/SchoolExternalToolConfigurator.page.vue"),
			},
		],
		props: (to: RouteLocationNormalized) => ({
			configId: to.params.configId,
		}),
	},
	{
		path: "/administration/school-settings/provisioning-options",
		component: () => import("@/pages/administration/ProvisioningOptionsPage.vue"),
		name: "provivisioning-options-page",
		beforeEnter: createPermissionGuard([Permission.SCHOOL_SYSTEM_VIEW, Permission.SCHOOL_SYSTEM_EDIT]),
		props: (to: RouteLocationNormalized) => ({
			systemId: to.query.systemId,
		}),
	},
	{
		path: "/administration/students",
		component: () => import("@/pages/administration/StudentOverview.page.vue"),
		name: "administration-students",
		beforeEnter: createPermissionGuard([Permission.STUDENT_LIST]),
	},
	{
		path: "/administration/students/consent",
		component: () => import("@/pages/administration/StudentConsent.page.vue"),
		name: "administration-students-consent",
		beforeEnter: createPermissionGuard([Permission.STUDENT_EDIT, Permission.STUDENT_LIST]),
	},
	{
		path: "/administration/students/import",
		component: () => import("@/pages/administration/UserImport.page.vue"),
		name: "administration-students-import",
		beforeEnter: createPermissionGuard([Permission.STUDENT_CREATE]),
		props: { kind: "students" },
	},
	{
		path: `/administration/students/:id(${REGEX_ID})/skipregistration`,
		component: () => import("@/pages/administration/SkipRegistration.page.vue"),
		name: "administration-students-skipregistration",
		beforeEnter: createPermissionGuard([Permission.STUDENT_SKIP_REGISTRATION]),
	},
	{
		path: "/administration/students/new",
		component: () => import("@/pages/administration/StudentCreate.page.vue"),
		name: "administration-students-new",
		beforeEnter: createPermissionGuard([Permission.STUDENT_CREATE]),
	},
	{
		path: `/administration/students/:id(${REGEX_ID})/edit`,
		component: () => import("@/pages/administration/UserEdit.page.vue"),
		name: "administration-students-edit",
		beforeEnter: createPermissionGuard([Permission.STUDENT_EDIT]),
		props: { kind: "students" },
	},
	{
		path: "/administration/teachers",
		component: () => import("@/pages/administration/TeacherOverview.page.vue"),
		name: "administration-teachers",
		beforeEnter: createPermissionGuard([Permission.TEACHER_LIST]),
	},
	{
		path: "/administration/teachers/import",
		component: () => import("@/pages/administration/UserImport.page.vue"),
		name: "administration-teachers-import",
		beforeEnter: createPermissionGuard([Permission.TEACHER_CREATE]),
		props: { kind: "teachers" },
	},
	{
		path: "/administration/teachers/new",
		component: () => import("@/pages/administration/TeacherCreate.page.vue"),
		name: "administration-teachers-new",
		beforeEnter: createPermissionGuard([Permission.TEACHER_CREATE]),
	},
	{
		path: `/administration/teachers/:id(${REGEX_ID})/edit`,
		component: () => import("@/pages/administration/UserEdit.page.vue"),
		name: "administration-teachers-edit",
		beforeEnter: createPermissionGuard([Permission.TEACHER_EDIT]),
		props: { kind: "teachers" },
	},
	{
		path: "/administration/classes/create",
		component: () => import("@/pages/administration/ClassEdit.page.vue"),
		name: "administration-classes-create",
		beforeEnter: createPermissionGuard([Permission.CLASS_CREATE]),
		props: { mode: "create" },
	},
	{
		path: `/administration/classes/:id(${REGEX_ID})/edit`,
		component: () => import("@/pages/administration/ClassEdit.page.vue"),
		name: "administration-classes-edit",
		beforeEnter: createPermissionGuard([Permission.CLASS_EDIT]),
		props: { mode: "edit" },
	},
	{
		path: `/administration/classes/:id(${REGEX_ID})/createSuccessor`,
		component: () => import("@/pages/administration/ClassEdit.page.vue"),
		name: "administration-classes-successor",
		beforeEnter: createPermissionGuard([Permission.CLASS_CREATE]),
		props: { mode: "upgrade" },
	},
	{
		path: `/administration/classes/:id(${REGEX_ID})/manage`,
		component: () => import("@/pages/administration/ClassManage.page.vue"),
		name: "administration-classes-manage",
		beforeEnter: createPermissionGuard([Permission.CLASS_EDIT]),
	},
	{
		path: `/administration/rooms/manage`,
		component: async () => (await import("@page-room")).AdministrationRoomsPage,
		name: "administration-rooms-manage",
		beforeEnter: createPermissionGuard([Permission.SCHOOL_ADMINISTRATE_ROOMS]),
	},
	{
		path: `/administration/rooms/manage/:roomId(${REGEX_ID})`,
		component: async () => (await import("@page-room")).AdministrationRoomMembersPage,
		name: "administration-rooms-manage-members",
		beforeEnter: createPermissionGuard([Permission.SCHOOL_ADMINISTRATE_ROOMS]),
	},
	{
		path: "/administration/rooms/new",
		component: () => import("@/pages/administration/CoursesAdminOverview.page.vue"),
		name: "administration-rooms-new",
		beforeEnter: createPermissionGuard([Permission.COURSE_ADMINISTRATION]),
		props: (route: RouteLocationNormalized) => ({
			tab: route.query.tab,
		}),
	},
	{
		path: "/administration/groups/classes",
		component: () => import("@/pages/administration/ClassOverview.page.vue"),
		name: "administration-groups-classes",
		beforeEnter: createPermissionGuard([Permission.CLASS_LIST, Permission.GROUP_LIST]),
		props: (route: RouteLocationNormalized) => ({
			tab: route.query.tab,
		}),
	},
	{
		path: `/administration/groups/classes/:groupId(${REGEX_ID})`,
		name: "administration-groups-classes-members",
		component: async () => (await import("@page-class-members")).ClassMembersPage,
		beforeEnter: createPermissionGuard([Permission.GROUP_VIEW]),
		props: (to: RouteLocationNormalized) => ({
			groupId: to.params.groupId,
		}),
	},
	{
		path: "/courses/add",
		component: () => import("@/pages/course-rooms/CourseEdit.page.vue"),
		name: "course-add",
		beforeEnter: createPermissionGuard([Permission.COURSE_CREATE]),
	},
	{
		path: `/courses/:id(${REGEX_ID})/edit`,
		component: () => import("@/pages/course-rooms/CourseEdit.page.vue"),
		name: "course-edit",
	},
	{
		// The legacy course page: its tabs live in the course room now.
		path: `/courses/:id(${REGEX_ID})`,
		redirect: (to) => ({
			path: `/rooms/${String(to.params.id)}`,
			query: { tab: typeof to.query.activeTab === "string" ? to.query.activeTab : "learn-content" },
		}),
	},
	{
		path: `/courses/:courseId(${REGEX_ID})/groups/add`,
		component: () => import("@/pages/course-groups/CourseGroupEdit.page.vue"),
		name: "course-group-add",
		beforeEnter: createPermissionGuard([Permission.COURSEGROUP_CREATE]),
	},
	{
		path: `/courses/:courseId(${REGEX_ID})/groups/:groupId(${REGEX_ID})/edit`,
		component: () => import("@/pages/course-groups/CourseGroupEdit.page.vue"),
		name: "course-group-edit",
		beforeEnter: createPermissionGuard([Permission.COURSEGROUP_EDIT]),
	},
	{
		path: `/courses/:courseId(${REGEX_ID})/groups/:groupId(${REGEX_ID})`,
		component: () => import("@/pages/course-groups/CourseGroupDetail.page.vue"),
		name: "course-group",
	},
	{
		path: `/courses/:courseId(${REGEX_ID})/topics/add`,
		component: () => import("@/pages/topics/TopicEdit.page.vue"),
		name: "topic-add",
	},
	{
		path: `/courses/:courseId(${REGEX_ID})/topics/:topicId(${REGEX_ID})/edit`,
		component: () => import("@/pages/topics/TopicEdit.page.vue"),
		name: "topic-edit",
	},
	{
		path: `/courses/:courseId(${REGEX_ID})/topics/:topicId(${REGEX_ID})`,
		component: () => import("@/pages/topics/TopicDetail.page.vue"),
		name: "topic",
	},
	{
		path: "/dashboard",
		component: () => import("@/pages/Dashboard.page.vue"),
		name: "dashboard",
	},
	{
		path: "/onboarding",
		component: () => import("@/pages/Onboarding.page.vue"),
		name: "onboarding",
		meta: {
			layout: Layouts.LOGGED_IN,
		},
	},
	{
		path: "/login",
		component: () => import("@/pages/Login.page.vue"),
		name: "login",
		meta: {
			isPublic: true,
			layout: Layouts.LOGGED_OUT,
		},
	},
	{
		path: `/boards/:id(${REGEX_ID})`,
		component: async () => (await import("@page-board")).ColumnBoardPage,
		name: "boards-id",
		props: (route: RouteLocationNormalized) => ({
			boardId: route.params.id,
		}),
	},
	{
		path: `/boards/:boardId(${REGEX_ID})/cards/:cardId(${REGEX_ID})`,
		component: async () => (await import("@page-board")).ColumnBoardPage,
		name: "boards-card-detail",
		props: (route: RouteLocationNormalized) => ({
			boardId: route.params.boardId,
		}),
	},
	{
		// Redirects URLs where '#' was percent-encoded as '%23' to the correct hash-fragment URL.
		path: `/boards/:cardLink(${REGEX_ID}%23card[^/]+)`,
		redirect: boardCardLinkRedirect,
		name: "board-card-link",
	},
	{
		path: "/calendar",
		component: () => import("@/pages/Calendar.page.vue"),
		name: "calendar",
	},
	{
		path: `/collabora/:id(${REGEX_ID})`,
		component: async () => (await import("@page-collabora")).CollaboraPage,
		name: "collabora",
		props: (route: RouteLocationNormalized) => ({
			fileRecordId: route.params.id,
			edit: route.query.edit,
		}),
		meta: {
			layout: Layouts.BORDERLESS,
		},
	},
	{
		path: "/error",
		component: () => import("@/pages/Error.page.vue"),
		name: "error",
		meta: {
			isPublic: true,
		},
	},
	{
		path: "/files",
		component: () => import("@/pages/FilesOverview.page.vue"),
		name: "files-overview",
	},
	{
		path: `/files/my/:folderId(${REGEX_ID})?`,
		component: () => import("@/pages/PersonalFiles.page.vue"),
		name: "personal-files",
	},
	{
		path: `/files/courses/:courseId(${REGEX_ID})?/:folderId(${REGEX_ID})?`,
		component: () => import("@/pages/CourseFiles.page.vue"),
		name: "course-files",
	},
	{
		path: `/files/teams/:teamId(${REGEX_ID})?/:folderId(${REGEX_ID})?`,
		component: () => import("@/pages/TeamFiles.page.vue"),
		name: "team-files",
	},
	{
		path: "/files/shared",
		component: () => import("@/pages/SharedFiles.page.vue"),
		name: "shared-files",
	},
	{
		path: `/files/fileModel/:id(${REGEX_ID})/proxy`,
		component: () => import("@/pages/FileShareProxy.page.vue"),
		name: "file-share-proxy",
	},
	{
		path: `/folder/:id(${REGEX_ID})`,
		component: async () => (await import("@page-folder")).FolderPage,
		beforeEnter: [checkFolderFeature],
		name: "folder-id",
		props: (route: RouteLocationNormalized) => ({
			folderId: route.params.id,
		}),
	},
	{
		path: `/folder/:id(${REGEX_ID})/trash`,
		component: async () => (await import("@page-folder")).FolderTrashPage,
		beforeEnter: [checkFolderFeature],
		name: "folder-trash",
		props: (route: RouteLocationNormalized) => ({
			folderId: route.params.id,
		}),
	},
	{
		path: `/h5p/player/:contentId(${REGEX_ID})`,
		component: () => import("@/pages/h5p/H5PPlayer.page.vue"),
		name: "h5pPlayer",
		beforeEnter: validateQueryParameters({
			parentType: isEnum(H5PContentParentType),
		}),
		props: (to: RouteLocationNormalized) => ({
			parentType: to.query.parentType,
			contentId: to.params.contentId,
		}),
		meta: {
			layout: Layouts.BORDERLESS,
		},
	},
	{
		path: `/h5p/editor/:contentId(${REGEX_ID})?`,
		component: () => import("@/pages/h5p/H5PEditor.page.vue"),
		name: "h5pEditor",
		beforeEnter: validateQueryParameters({
			parentType: isEnum(H5PContentParentType),
			parentId: isMongoId,
		}),
		props: (to: RouteLocationNormalized) => ({
			parentId: to.query.parentId,
			parentType: to.query.parentType,
			contentId: to.params.contentId || undefined,
		}),
		meta: {
			layout: Layouts.BORDERLESS,
		},
	},
	{
		path: "/help",
		redirect: { name: "help-articles" },
	},
	{
		path: "/help/articles",
		component: () => import("@/pages/help/HelpArticles.page.vue"),
		name: "help-articles",
	},
	{
		path: "/help/contact",
		component: () => import("@/pages/help/HelpContact.page.vue"),
		name: "help-contact",
	},
	{
		path: "/help/confluence/:id(\\d+)",
		component: () => import("@/pages/help/HelpConfluence.page.vue"),
		name: "help-confluence",
	},
	{
		path: "/help/faq/documents",
		component: () => import("@/pages/help/HelpDocuments.page.vue"),
		name: "help-documents",
	},
	{
		path: "/imprint",
		component: () => import("@/pages/Imprint.page.vue"),
		name: "imprint",
		meta: {
			isPublic: true,
		},
	},
	{
		path: "/migration",
		component: () => import("@/pages/user-login-migration/UserLoginMigrationConsent.page.vue"),
		name: "user-login-migration-consent",
		meta: {
			layout: Layouts.LOGGED_OUT,
		},
	},
	{
		path: "/migration/error",
		component: () => import("@/pages/user-login-migration/UserLoginMigrationError.page.vue"),
		name: "user-login-migration-error",
		beforeEnter: validateQueryParameters({
			sourceSchoolNumber: (value: unknown) => !isDefined(value) || isOfficialSchoolNumber(value),
			targetSchoolNumber: (value: unknown) => !isDefined(value) || isOfficialSchoolNumber(value),
		}),
		props: (to: RouteLocationNormalized) => ({
			sourceSchoolNumber: to.query.sourceSchoolNumber,
			targetSchoolNumber: to.query.targetSchoolNumber,
			multipleUsersFound: to.query.multipleUsersFound,
		}),
		meta: {
			isPublic: true,
			layout: Layouts.LOGGED_OUT,
		},
	},
	{
		path: "/licenses",
		component: async () => await import("@/pages/LicenseList.page.vue"),
		name: "licenses",
		meta: {
			isPublic: true,
		},
	},
	{
		path: "/legacy-view-migration",
		component: () => import("@/pages/LegacyViewMigration.page.vue"),
		name: "legacy-view-migration",
	},
	{
		path: `/media-shelf`,
		component: async () => (await import("@page-media-shelf")).MediaShelfPage,
		name: "media-shelf",
	},
	{
		path: `/media-shelf/fwu-media`,
		component: async () => (await import("@page-fwu-media")).FwuMedia,
		name: "fwu-media",
		beforeEnter() {
			if (useEnvConfig().value.FEATURE_FWU_CONTENT_ENABLED) {
				return true;
			}
			useAppStore().handleApplicationError(HttpStatusCode.NotFound);
			return false;
		},
	},
	{
		path: "/migration/success",
		component: () => import("@/pages/user-login-migration/UserLoginMigrationSuccess.page.vue"),
		name: "user-login-migration-success",
		beforeEnter: validateQueryParameters({
			targetSystem: isMongoId,
		}),
		props: (to: RouteLocationNormalized) => ({
			targetSystemId: to.query.targetSystem,
		}),
		meta: {
			isPublic: true,
			layout: Layouts.LOGGED_OUT,
		},
	},
	{
		path: "/news",
		component: async () => (await import("@page-news")).NewsOverviewPage,
		name: "news-overview",
	},
	{
		path: "/news/new",
		component: async () => (await import("@page-news")).NewsCreatePage,
		name: "news-new",
		beforeEnter: createPermissionGuard([Permission.NEWS_CREATE]),
	},
	{
		path: `/news/:id(${REGEX_ID})`,
		component: async () => (await import("@page-news")).NewsDetailsPage,
		name: "news-details",
	},
	{
		path: `/news/:id(${REGEX_ID})/edit`,
		component: async () => (await import("@page-news")).NewsEditPage,
		name: "news-id-edit",
		beforeEnter: createPermissionGuard([Permission.NEWS_EDIT]),
	},
	{
		path: "/registration-external-members",
		component: () => import("@/pages/registration-external-members/RegistrationExternalMembers.page.vue"),
		name: "registration-external-members",
		beforeEnter: checkRegisterExternalPersonsFeature,
		meta: {
			isPublic: true,
			layout: Layouts.REGISTRATION,
		},
	},
	{
		path: `/rooms`,
		component: async () => (await import("@page-room")).RoomsPage,
		name: "rooms",
	},
	{
		path: `/rooms/new`,
		component: async () => (await import("@page-room")).RoomCreatePage,
		beforeEnter: [createPermissionGuard([Permission.SCHOOL_CREATE_ROOM])],
		name: "rooms-new",
	},
	{
		path: `/rooms/:id(${REGEX_ID})`,
		component: async () => (await import("@page-room")).RoomDetailsSwitchPage,
		name: "room-details",
	},
	{
		path: `/rooms/:id(${REGEX_ID})/edit`,
		component: async () => (await import("@page-room")).RoomEditPage,
		name: "room-edit",
	},
	{
		path: `/rooms/:id(${REGEX_ID})/members`,
		component: async () => (await import("@page-room")).RoomMembersPage,
		name: "room-members",
		props: (route: RouteLocationNormalized) => ({
			tab: route.query.tab,
		}),
	},
	{
		path: "/rooms/courses-list",
		component: () => import("@/pages/course-rooms/CourseRoomList.page.vue"),
		name: "course-room-list",
	},
	{
		path: "/rooms-overview",
		redirect: { name: "course-room-overview" },
		name: "rooms-overview",
	},
	{
		path: "/rooms/courses-overview",
		component: () => import("@/pages/course-rooms/CourseRoomOverview.page.vue"),
		name: "course-room-overview",
	},
	{
		path: `/rooms/:id(${REGEX_ID})/board`,
		redirect: { name: "boards-id" },
		name: "rooms-board",
	},
	{
		path: `/rooms/invitation-link/:id(${REGEX_ID})`,
		component: async () => (await import("@page-room")).RoomInvitationLinkStatusPage,
		name: "rooms-invitation-link-id",
		props: (route: RouteLocationNormalized) => ({
			invitationLinkId: route.params.id,
		}),
	},
	{
		path: "/system/releases",
		component: () => import("@/pages/ReleaseNotes.page.vue"),
		name: "system-releases",
	},
	{
		path: "/system/security",
		component: () => import("@/pages/Security.page.vue"),
		meta: {
			isPublic: true,
		},
	},
	{
		path: "/tasks",
		component: () => import("@/pages/tasks/TaskOverview.page.vue"),
		name: "tasks",
	},
	{
		path: "/homework/new",
		component: () => import("@/pages/tasks/TaskEdit.page.vue"),
		name: "task-new",
	},
	{
		path: `/homework/:id(${REGEX_ID})/edit`,
		component: () => import("@/pages/tasks/TaskEdit.page.vue"),
		name: "task-edit",
	},
	{
		path: `/homework/:id(${REGEX_ID})`,
		component: () => import("@/pages/tasks/TaskDetail.page.vue"),
		name: "task-detail",
	},
	{
		path: `/tools/context/tool-configuration`,
		component: () => import("@/pages/context-external-tool/CourseContextExternalToolConfigurator.page.vue"),
		name: "context-external-tool-configuration",
		beforeEnter: [
			createPermissionGuard([Permission.CONTEXT_TOOL_ADMIN]),
			validateQueryParameters({
				contextId: isMongoId,
				contextType: isEnum(ToolContextType),
			}),
		],
		children: [
			{
				path: ":configId",
				name: "context-external-tool-configuration-edit",
				component: () => import("@/pages/context-external-tool/CourseContextExternalToolConfigurator.page.vue"),
			},
		],
		props: (to: RouteLocationNormalized) => ({
			contextId: to.query.contextId,
			contextType: to.query.contextType,
			configId: to.params.configId,
		}),
	},
	{
		path: "/",
		component: () => import("@/pages/Home.page.vue"),
		name: "home",
		meta: {
			isPublic: true,
			layout: Layouts.BORDERLESS,
		},
	},
	{
		path: "/logout",
		component: () => import("@/pages/Logout.page.vue"),
		name: "logout",
		meta: {
			isPublic: true,
			layout: Layouts.BORDERLESS,
		},
	},
	{
		path: "/:pathMatch(.*)*",
		name: "not-found",
		component: () => import("@/pages/Error.page.vue"),
		beforeEnter: () => {
			useAppStore().handleApplicationError(HttpStatusCode.NotFound);
			return true;
		},
	},
];
