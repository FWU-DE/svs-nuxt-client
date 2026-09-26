import {
	findLegacyViewMigrationEntry,
	isKnownLegacyViewPath,
	legacyViewMigrationEntries,
} from "./legacy-view-migration";

describe("legacy-view-migration", () => {
	it("contains the rendered legacy view inventory", () => {
		expect(legacyViewMigrationEntries.length).toBeGreaterThan(40);
		expect(legacyViewMigrationEntries.some((entry) => entry.view === "teams/overview")).toBe(true);
		expect(legacyViewMigrationEntries.some((entry) => entry.view === "calendar/calendar")).toBe(false);
		expect(legacyViewMigrationEntries.some((entry) => entry.view === "help/accordion-sections")).toBe(false);
		expect(legacyViewMigrationEntries.some((entry) => entry.view === "homework/assignment")).toBe(false);
		expect(legacyViewMigrationEntries.some((entry) => entry.category === "news")).toBe(false);
		expect(legacyViewMigrationEntries.some((entry) => entry.view === "files/files-overview")).toBe(false);
		expect(legacyViewMigrationEntries.some((entry) => entry.view === "files/files")).toBe(false);
	});

	it("recognizes known legacy base paths", () => {
		expect(isKnownLegacyViewPath("/teams")).toBe(true);
		expect(isKnownLegacyViewPath("/teams/123")).toBe(true);
		expect(isKnownLegacyViewPath("/calendar")).toBe(false);
		expect(isKnownLegacyViewPath("/account")).toBe(false);
		expect(isKnownLegacyViewPath("/help/faq/documents")).toBe(false);
		expect(isKnownLegacyViewPath("/news")).toBe(false);
		expect(isKnownLegacyViewPath("/not-in-inventory")).toBe(false);
	});

	it("finds the best matching legacy entry", () => {
		expect(findLegacyViewMigrationEntry("/teams/abc")?.category).toBe("teams");
	});
});
