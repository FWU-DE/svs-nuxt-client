import {
	decodeCsvFile,
	generateConsentPassword,
	ImportReport,
	importReportMessage,
	useLegacyUserImportApi,
} from "./legacy-user-import.api";
import * as utils from "@/utils/api";

vi.mock("@/utils/api", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/utils/api")>()),
	$axios: { post: vi.fn() },
}));

const report = (overrides: Partial<ImportReport> = {}): ImportReport => ({
	success: true,
	errors: [],
	classes: { successful: 2, failed: 0, created: 1, updated: 1 },
	users: { successful: 2, created: 2, updated: 0, failed: 0 },
	invitations: { successful: 0, failed: 0 },
	...overrides,
});

const t = (key: string, named?: Record<string, unknown>) => `${key}${named ? JSON.stringify(named) : ""}`;

describe("legacy-user-import.api", () => {
	describe("importReportMessage", () => {
		it("counts like the legacy import handler", () => {
			expect(importReportMessage(report(), t)).toBe(
				'legacy.administration.controller.text.successfullyImportedUsers{"amountImported":2,"amountTotal":2,"amountCreated":2,"amountUpdated":0}'
			);
			const one = report({ users: { successful: 1, created: 0, updated: 1, failed: 0 } });
			expect(importReportMessage(one, t)).toContain("successfullyImportedUser{");
		});

		it("lists the shown error types with entity and message", () => {
			const failed = report({
				success: false,
				users: { successful: 1, created: 1, updated: 0, failed: 1 },
				errors: [
					{ type: "user", entity: "A,B,a@b.de", message: "Bitte gib eine valide E-Mail Adresse an!" },
					{},
					{ type: "file", entity: "Eingabedatei fehlerhaft", message: "Syntaxfehler in Zeile 0" },
				],
			});
			expect(importReportMessage(failed, t)).toContain(
				'errorImportingUsers{"errorMessage":"A,B,a@b.de (Bitte gib eine valide E-Mail Adresse an!), Eingabedatei fehlerhaft (Syntaxfehler in Zeile 0)"}'
			);
		});

		it("falls back to the unknown error", () => {
			const failed = report({ success: false, errors: [{}] });
			expect(importReportMessage(failed, t)).toContain(
				'"errorMessage":"legacy.administration.controller.text.anUnknownErrorOccurred"'
			);
		});
	});

	describe("decodeCsvFile", () => {
		it("reads UTF-8, UTF-16 and Windows-1252", () => {
			const utf8 = new TextEncoder().encode("Jörg;Müller");
			expect(decodeCsvFile(utf8.buffer)).toBe("Jörg;Müller");
			const latin = new Uint8Array([0x4a, 0xf6, 0x72, 0x67]);
			expect(decodeCsvFile(latin.buffer)).toBe("Jörg");
			const utf16 = new Uint8Array([0xff, 0xfe, 0x4a, 0x00, 0xf6, 0x00]);
			expect(decodeCsvFile(utf16.buffer)).toBe("Jö");
		});
	});

	describe("generateConsentPassword", () => {
		it("has eight characters with lower and upper case and a digit", () => {
			for (let i = 0; i < 50; i++) {
				const password = generateConsentPassword();
				expect(password).toMatch(/^[a-zA-Z0-9]{8}$/);
				expect(password).toMatch(/[a-z]/);
				expect(password).toMatch(/[A-Z]/);
				expect(password).toMatch(/[0-9]/);
			}
		});
	});

	describe("importCsv", () => {
		it("posts the file to /v1/sync with the legacy query", async () => {
			vi.mocked(utils.$axios.post).mockResolvedValue({ data: [report()] });
			const result = await useLegacyUserImportApi().importCsv({
				schoolId: "school-1",
				role: "teacher",
				schoolYear: "year-1",
				sendEmails: true,
				data: "a,b",
			});
			expect(result.users.created).toBe(2);
			expect(utils.$axios.post).toHaveBeenCalledWith(
				"/v1/sync",
				{ data: "a,b" },
				{ params: { target: "csv", school: "school-1", role: "teacher", sendEmails: "true", schoolYear: "year-1" } }
			);
		});
	});
});
