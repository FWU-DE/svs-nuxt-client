export type LegacyViewMigrationEntry = {
	basePath: string;
	view: string;
	controller: string;
	controllerLine: number;
	category: string;
};

export const legacyViewMigrationEntries: LegacyViewMigrationEntry[] = [
	{
		basePath: "/administration",
		view: "administration/classes-edit",
		controller: "controllers/administration.js",
		controllerLine: 1103,
		category: "administration",
	},
	{
		basePath: "/administration",
		view: "administration/classes-manage",
		controller: "controllers/administration.js",
		controllerLine: 1324,
		category: "administration",
	},
	{
		basePath: "/administration",
		view: "administration/import",
		controller: "controllers/administration.js",
		controllerLine: 632,
		category: "administration",
	},
	{
		basePath: "/administration",
		view: "administration/ldap-schoolyear-start",
		controller: "controllers/administration.js",
		controllerLine: 1876,
		category: "administration",
	},
	{
		basePath: "/administration",
		view: "administration/teams",
		controller: "controllers/administration.js",
		controllerLine: 1743,
		category: "administration",
	},
	{
		basePath: "/administration",
		view: "administration/users_edit",
		controller: "controllers/administration.js",
		controllerLine: 690,
		category: "administration",
	},
	{
		basePath: "/administration",
		view: "administration/users_registrationcomplete",
		controller: "controllers/administration.js",
		controllerLine: 504,
		category: "administration",
	},
	{
		basePath: "/administration",
		view: "administration/users_skipregistration",
		controller: "controllers/administration.js",
		controllerLine: 821,
		category: "administration",
	},
	{
		basePath: "/coursegroups",
		view: "courses/courseGroup",
		controller: "controllers/coursegroups.js",
		controllerLine: 157,
		category: "courses",
	},
	{
		basePath: "/coursegroups",
		view: "courses/edit-courseGroup",
		controller: "controllers/coursegroups.js",
		controllerLine: 53,
		category: "courses",
	},
	{
		basePath: "/courses",
		view: "courses/course",
		controller: "controllers/courses.js",
		controllerLine: 669,
		category: "courses",
	},
	{
		basePath: "/courses",
		view: "courses/create-course",
		controller: "controllers/courses.js",
		controllerLine: 365,
		category: "courses",
	},
	{
		basePath: "/courses",
		view: "courses/edit-course",
		controller: "controllers/courses.js",
		controllerLine: 348,
		category: "courses",
	},
	{
		basePath: "/files",
		view: "files/files",
		controller: "controllers/files.js",
		controllerLine: 527,
		category: "files",
	},
	{
		basePath: "/files",
		view: "files/search",
		controller: "controllers/files.js",
		controllerLine: 905,
		category: "files",
	},
	{
		basePath: "/firstLogin",
		view: "firstLogin/consentError",
		controller: "controllers/firstLogin.js",
		controllerLine: 272,
		category: "firstLogin",
	},
	{
		basePath: "/firstLogin",
		view: "firstLogin/firstLogin",
		controller: "controllers/firstLogin.js",
		controllerLine: 259,
		category: "firstLogin",
	},
	{
		basePath: "/firstLogin",
		view: "firstLogin/firstLoginExistingUser",
		controller: "controllers/firstLogin.js",
		controllerLine: 263,
		category: "firstLogin",
	},
	{
		basePath: "/firstLogin",
		view: "firstLogin/firstLoginShortened",
		controller: "controllers/firstLogin.js",
		controllerLine: 109,
		category: "firstLogin",
	},
	{
		basePath: "/forcePasswordChange",
		view: "firstLogin/forcePasswordChange",
		controller: "controllers/forcePasswordChange.js",
		controllerLine: 17,
		category: "firstLogin",
	},
	{
		basePath: "/homework",
		view: "homework/edit",
		controller: "controllers/homework.js",
		controllerLine: 367,
		category: "homework",
	},
	{
		basePath: "/login",
		view: "authentication/home",
		controller: "controllers/login.js",
		controllerLine: 316,
		category: "authentication",
	},
	{
		basePath: "/login",
		view: "authentication/login",
		controller: "controllers/login.js",
		controllerLine: 349,
		category: "authentication",
	},
	{
		basePath: "/oauth2",
		view: "oauth2/consent",
		controller: "controllers/oauth2.js",
		controllerLine: 96,
		category: "oauth2",
	},
	{
		basePath: "/oauth2",
		view: "oauth2/username",
		controller: "controllers/oauth2.js",
		controllerLine: 133,
		category: "oauth2",
	},
	{
		basePath: "/pwrecovery",
		view: "pwRecovery/pwRecoveryFailed",
		controller: "controllers/pwrecovery.js",
		controllerLine: 11,
		category: "pwRecovery",
	},
	{
		basePath: "/pwrecovery",
		view: "pwRecovery/pwRecoveryResponse",
		controller: "controllers/pwrecovery.js",
		controllerLine: 7,
		category: "pwRecovery",
	},
	{
		basePath: "/pwrecovery",
		view: "pwRecovery/pwrecovery",
		controller: "controllers/pwrecovery.js",
		controllerLine: 30,
		category: "pwRecovery",
	},
	{
		basePath: "/registration",
		view: "registration/registration",
		controller: "controllers/registration.js",
		controllerLine: 427,
		category: "registration",
	},
	{
		basePath: "/registration",
		view: "registration/registration-employee",
		controller: "controllers/registration.js",
		controllerLine: 388,
		category: "registration",
	},
	{
		basePath: "/registration",
		view: "registration/registration-parent",
		controller: "controllers/registration.js",
		controllerLine: 242,
		category: "registration",
	},
	{
		basePath: "/registration",
		view: "registration/registration-student",
		controller: "controllers/registration.js",
		controllerLine: 309,
		category: "registration",
	},
	{
		basePath: "/teams",
		view: "teams/edit-course",
		controller: "controllers/teams.js",
		controllerLine: 240,
		category: "teams",
	},
	{
		basePath: "/teams",
		view: "teams/edit-team",
		controller: "controllers/teams.js",
		controllerLine: 155,
		category: "teams",
	},
	{
		basePath: "/teams",
		view: "teams/members",
		controller: "controllers/teams.js",
		controllerLine: 1059,
		category: "teams",
	},
	{
		basePath: "/teams",
		view: "teams/overview",
		controller: "controllers/teams.js",
		controllerLine: 313,
		category: "teams",
	},
	{
		basePath: "/teams",
		view: "teams/overview-empty",
		controller: "controllers/teams.js",
		controllerLine: 325,
		category: "teams",
	},
	{
		basePath: "/teams",
		view: "teams/team",
		controller: "controllers/teams.js",
		controllerLine: 579,
		category: "teams",
	},
	{
		basePath: "/teams",
		view: "teams/topics",
		controller: "controllers/teams.js",
		controllerLine: 1278,
		category: "teams",
	},
	{
		basePath: "/topic",
		view: "topic/edit-topic",
		controller: "controllers/topics.js",
		controllerLine: 46,
		category: "topic",
	},
	{
		basePath: "/topic",
		view: "topic/topic",
		controller: "controllers/topics.js",
		controllerLine: 276,
		category: "topic",
	},
	{
		basePath: "/welcome",
		view: "firstLogin/welcome",
		controller: "controllers/welcome.js",
		controllerLine: 10,
		category: "firstLogin",
	},
];

export const legacyViewMigrationBasePaths = Array.from(
	new Set(legacyViewMigrationEntries.map((entry) => entry.basePath))
).sort();

export const isKnownLegacyViewPath = (path: string): boolean =>
	legacyViewMigrationBasePaths.some((basePath) => path === basePath || path.startsWith(`${basePath}/`));

export const findLegacyViewMigrationEntry = (path: string): LegacyViewMigrationEntry | undefined => {
	const normalizedPath = path.replace(/\/$/, "") || "/";
	const basePath = legacyViewMigrationBasePaths
		.filter((candidate) => normalizedPath === candidate || normalizedPath.startsWith(`${candidate}/`))
		.sort((a, b) => b.length - a.length)[0];

	return legacyViewMigrationEntries.find((entry) => entry.basePath === basePath);
};
