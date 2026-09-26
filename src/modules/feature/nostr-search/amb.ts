import { NostrEvent, NostrResource } from "./types";

/**
 * Reads an AMB learning resource (kind 30142) out of a Nostr event.
 *
 * AMB — "Allgemeines Metadatenprofil für Bildungsressourcen" — is the German metadata standard
 * behind OERSI. The edufeed relays publish one event per resource and mirror the whole record
 * into tags (`name`, `description`, `about:prefLabel:de`, `license:id`, …), which is what makes
 * the relay's full-text search work. We read the tags rather than the JSON body for the same
 * reason: they are the part the relay indexes, and they are present even when the body is empty.
 *
 * Vocabulary terms carry one label per language (`about:prefLabel:de`, `:en`, `:uk`, …), so the
 * labels follow the interface language and fall back to German, then English.
 */

export const AMB_KIND = 30142;

const LABEL_FALLBACK_LOCALES = ["de", "en"];
const MAX_CHIPS = 6;

const tagValues = (event: NostrEvent, key: string): string[] =>
	event.tags.filter((tag) => tag[0] === key && typeof tag[1] === "string").map((tag) => tag[1].trim());

const firstTag = (event: NostrEvent, key: string): string | undefined =>
	tagValues(event, key).find((value) => value.length > 0);

const unique = (values: string[]): string[] => [...new Set(values.filter((value) => value.length > 0))];

/** Labels of a vocabulary field in the best available language. */
const labelsOf = (event: NostrEvent, field: string, locale: string): string[] => {
	for (const language of [locale, ...LABEL_FALLBACK_LOCALES]) {
		const labels = unique(tagValues(event, `${field}:prefLabel:${language}`));
		if (labels.length > 0) return labels.slice(0, MAX_CHIPS);
	}

	return [];
};

const isHttpUrl = (value: string | undefined): value is string => value !== undefined && /^https?:\/\//i.test(value);

const CREATIVE_COMMONS = /creativecommons\.org\/(licenses|publicdomain)\/([a-z-]+)(?:\/([0-9.]+))?/i;

/** Turns a licence URL into the short form people recognise, or leaves it alone. */
export const licenseLabel = (url: string | undefined): string | undefined => {
	if (!url) return undefined;

	const match = CREATIVE_COMMONS.exec(url);
	if (!match) return undefined;

	const [, kind, code, version] = match;
	if (kind === "publicdomain") return code === "zero" ? "CC0" : "Public Domain";

	return `CC ${code.toUpperCase()}${version ? ` ${version}` : ""}`;
};

/**
 * The best web address for a resource.
 *
 * Feeds differ: the OERSI records use `d` for the resource URL, while the SODIX ones put a
 * `urn:sodix:…` identifier there and list the actual files under `r`. The preview image is often
 * one of those `r` entries too, so it is excluded — linking a board card to a thumbnail instead of
 * the material is the failure this ordering exists to prevent.
 */
const resourceUrl = (
	event: NostrEvent,
	identifier: string | undefined,
	image: string | undefined
): string | undefined =>
	[
		identifier,
		firstTag(event, "mainEntityOfPage:id"),
		firstTag(event, "ext:de.sodix:originalUrl"),
		...tagValues(event, "r"),
		firstTag(event, "encoding:contentUrl"),
	]
		.filter(isHttpUrl)
		.find((candidate) => candidate !== image);

export const parseResource = (event: NostrEvent, locale = "de"): NostrResource => {
	const identifier = firstTag(event, "d");
	const licenseUrl = firstTag(event, "license:id") ?? firstTag(event, "license");
	const image = firstTag(event, "image");

	return {
		title: firstTag(event, "name") ?? identifier ?? "",
		description: firstTag(event, "description") ?? (event.content.trim() || undefined),
		url: resourceUrl(event, identifier, image),
		imageUrl: isHttpUrl(image) ? image : undefined,
		licenseUrl: isHttpUrl(licenseUrl) ? licenseUrl : undefined,
		licenseLabel: licenseLabel(licenseUrl),
		subjects: labelsOf(event, "about", locale),
		resourceTypes: labelsOf(event, "learningResourceType", locale),
		educationalLevels: labelsOf(event, "educationalLevel", locale),
		audiences: labelsOf(event, "audience", locale),
		creators: unique(tagValues(event, "creator:name")).slice(0, MAX_CHIPS),
		publisher: firstTag(event, "publisher:name"),
		languages: unique(tagValues(event, "inLanguage")),
		keywords: unique(tagValues(event, "t")).slice(0, MAX_CHIPS),
		isFree: firstTag(event, "isAccessibleForFree") === "true",
	};
};

/** The text a resource is matched against when a relay ignored the search term. */
export const resourceSearchText = (resource: NostrResource): string =>
	[
		resource.title,
		resource.description,
		...resource.subjects,
		...resource.keywords,
		...resource.creators,
		resource.publisher,
	]
		.filter(Boolean)
		.join(" ");
