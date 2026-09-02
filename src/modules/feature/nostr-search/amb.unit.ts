import { licenseLabel, parseResource, resourceSearchText } from "./amb";
import { NostrEvent } from "./types";

const ambEvent = (tags: string[][], content = ""): NostrEvent => ({
	id: "1".repeat(64),
	pubkey: "b".repeat(64),
	created_at: 1700000000,
	kind: 30142,
	tags,
	content,
	sig: "c".repeat(128),
});

describe("amb", () => {
	describe("parseResource", () => {
		// Shaped after a real record from wss://amb-relay.edufeed.org.
		const event = ambEvent([
			["d", "https://www.e-teaching.org/praxis/mathematik"],
			["type", "LearningResource"],
			["name", "Medienkompetenz im Fach Mathematik"],
			["description", "Ein Modul für angehende Lehrkräfte."],
			["image", "https://www.e-teaching.org/cover.jpg"],
			["t", "Aus der Praxis"],
			["inLanguage", "de"],
			["creator:name", "Marvin Titz"],
			["creator:type", "Person"],
			["publisher:name", "e-teaching.org"],
			["license:id", "http://creativecommons.org/licenses/by-sa/4.0/legalcode.de"],
			["isAccessibleForFree", "true"],
			["about:prefLabel:de", "Mathematik"],
			["about:prefLabel:en", "Mathematics"],
			["educationalLevel:prefLabel:de", "Hochschule"],
			["learningResourceType:prefLabel:de", "Erfahrungsbericht"],
		]);

		it("reads the fields the card shows", () => {
			const resource = parseResource(event);

			expect(resource).toMatchObject({
				title: "Medienkompetenz im Fach Mathematik",
				description: "Ein Modul für angehende Lehrkräfte.",
				url: "https://www.e-teaching.org/praxis/mathematik",
				imageUrl: "https://www.e-teaching.org/cover.jpg",
				licenseLabel: "CC BY-SA 4.0",
				subjects: ["Mathematik"],
				educationalLevels: ["Hochschule"],
				resourceTypes: ["Erfahrungsbericht"],
				creators: ["Marvin Titz"],
				publisher: "e-teaching.org",
				languages: ["de"],
				keywords: ["Aus der Praxis"],
				isFree: true,
			});
		});

		it("labels vocabulary terms in the interface language", () => {
			expect(parseResource(event, "en").subjects).toEqual(["Mathematics"]);
		});

		it("falls back to German when the interface language has no label", () => {
			expect(parseResource(event, "uk").subjects).toEqual(["Mathematik"]);
		});

		it("falls back to the event body when there is no description tag", () => {
			const resource = parseResource(ambEvent([["name", "Ohne Beschreibung"]], "Text aus dem Event."));

			expect(resource.description).toBe("Text aus dem Event.");
		});

		it("ignores an identifier that is not a web address", () => {
			const resource = parseResource(
				ambEvent([
					["d", "urn:uuid:1234"],
					["name", "Ohne Link"],
				])
			);

			expect(resource.url).toBeUndefined();
		});

		it("skips the preview image when picking the link", () => {
			// Shaped after a SODIX record: urn identifier, media and thumbnail both under `r`.
			const resource = parseResource(
				ambEvent([
					["d", "urn:sodix:SODIX-0001051041"],
					["name", "Mathe - QA 2017"],
					["image", "https://images.sodix.de/thumb.jpg"],
					["r", "https://images.sodix.de/thumb.jpg"],
					["r", "https://download.sodix.de/data/SODIX-0001051041.mp4"],
				])
			);

			expect(resource.url).toBe("https://download.sodix.de/data/SODIX-0001051041.mp4");
		});

		it("prefers the r tag when the identifier is not linkable", () => {
			const resource = parseResource(
				ambEvent([
					["d", "urn:uuid:1234"],
					["r", "https://oer.example/material"],
				])
			);

			expect(resource.url).toBe("https://oer.example/material");
		});
	});

	describe("licenseLabel", () => {
		it.each([
			["https://creativecommons.org/licenses/by/4.0/", "CC BY 4.0"],
			["http://creativecommons.org/licenses/by-nc-sa/3.0/de/", "CC BY-NC-SA 3.0"],
			["https://creativecommons.org/publicdomain/zero/1.0/", "CC0"],
		])("shortens %s", (url, expected) => {
			expect(licenseLabel(url)).toBe(expected);
		});

		it("leaves an unknown licence alone", () => {
			expect(licenseLabel("https://example.org/my-licence")).toBeUndefined();
			expect(licenseLabel(undefined)).toBeUndefined();
		});
	});

	describe("resourceSearchText", () => {
		it("collects everything a client-side match may look at", () => {
			const text = resourceSearchText(
				parseResource(
					ambEvent([
						["name", "Titel"],
						["t", "Stichwort"],
					])
				)
			);

			expect(text).toContain("Titel");
			expect(text).toContain("Stichwort");
		});
	});
});
