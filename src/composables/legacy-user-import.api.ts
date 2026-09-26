import { $axios } from "@/utils/api";

/**
 * The administration's CSV import of students and teachers (`POST /v1/sync?target=csv`)
 * and "Einverständnis auf Papier erhalten" (`POST /v1/users/:id/skipregistration`),
 * as the legacy pages (views/administration/import.hbs, users_skipregistration.hbs) call them.
 */

export type ImportReportError = { type?: string; entity?: string; message?: string };

export type ImportReport = {
	success: boolean;
	errors: ImportReportError[];
	classes: { successful: number; failed: number; created: number; updated: number };
	users: { successful: number; created: number; updated: number; failed: number };
	invitations: { successful: number; failed: number };
};

export type SkipRegistrationData = {
	password: string;
	birthday?: string;
	privacyConsent?: boolean;
	termsOfUseConsent?: boolean;
	parent_privacyConsent?: boolean;
	parent_termsOfUseConsent?: boolean;
};

type Translate = (key: string, named?: Record<string, unknown>) => string;

/** `buildMessage` and `buildErrorMessage` of the legacy import handler. */
export const importReportMessage = (report: ImportReport, t: Translate): string => {
	const total = report.users.successful + report.users.failed;
	let message = t(
		total > 1
			? "legacy.administration.controller.text.successfullyImportedUsers"
			: "legacy.administration.controller.text.successfullyImportedUser",
		{
			amountImported: report.users.successful,
			amountTotal: total,
			amountCreated: report.users.created,
			amountUpdated: report.users.updated,
		}
	);
	if (!report.success) {
		const shown = ["file", "user", "invitation", "class"];
		const errorMessage =
			report.errors
				.filter((error) => shown.includes(error.type ?? ""))
				.map((error) => `${error.entity} (${error.message})`)
				.join(", ") || t("legacy.administration.controller.text.anUnknownErrorOccurred");
		message += ` ${t("legacy.administration.controller.text.errorImportingUsers", { errorMessage })}`;
	}
	return message;
};

/**
 * The file as text. The legacy client converted every upload to UTF-8 from whatever it
 * detected; spreadsheet exports come as UTF-8 (with or without BOM), UTF-16 or Windows-1252.
 */
export const decodeCsvFile = (buffer: ArrayBuffer): string => {
	const bytes = new Uint8Array(buffer);
	if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
	if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder("windows-1252").decode(bytes);
	}
};

const PASSWORD_LENGTH = 8;
const PASSWORD_POOLS = ["abcdefghijklmnopqrstuvwxyz", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789"];

const randomInt = (max: number) => {
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	return array[0] % max;
};

/**
 * `generateConsentPassword` of the legacy client: `MINIMAL_PASSWORD_LENGTH` characters from
 * lower case, upper case and digits, at least one of each.
 */
export const generateConsentPassword = (): string => {
	const all = PASSWORD_POOLS.join("");
	const chars = PASSWORD_POOLS.map((pool) => pool[randomInt(pool.length)]);
	while (chars.length < PASSWORD_LENGTH) chars.push(all[randomInt(all.length)]);
	for (let i = chars.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[chars[i], chars[j]] = [chars[j], chars[i]];
	}
	return chars.join("");
};

export const useLegacyUserImportApi = () => {
	const importCsv = async (params: {
		schoolId: string;
		role: "student" | "teacher";
		schoolYear?: string;
		sendEmails: boolean;
		data: string;
	}): Promise<ImportReport> => {
		const { data } = await $axios.post<ImportReport[]>(
			"/v1/sync",
			{ data: params.data },
			{
				params: {
					target: "csv",
					school: params.schoolId,
					role: params.role,
					sendEmails: String(params.sendEmails),
					schoolYear: params.schoolYear,
				},
			}
		);
		return data[0];
	};

	const skipRegistration = async (userId: string, body: SkipRegistrationData): Promise<void> => {
		await $axios.post(`/v1/users/${userId}/skipregistration`, body);
	};

	return { importCsv, skipRegistration };
};
