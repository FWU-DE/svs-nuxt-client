<template>
	<VCard variant="outlined" class="nostr-card h-100" :data-testid="`nostr-result-${result.id}`">
		<div class="nostr-card__body">
			<component
				:is="externalUrl ? 'a' : 'div'"
				v-if="isResource"
				:href="externalUrl"
				target="_blank"
				rel="noopener noreferrer"
				class="nostr-card__thumb"
				:class="{ 'nostr-card__thumb--empty': !imageUrl }"
				tabindex="-1"
				aria-hidden="true"
			>
				<VImg v-if="imageUrl" :src="imageUrl" cover height="100%" :alt="''" />
				<VIcon v-else :icon="mdiSchoolOutline" size="28" class="text-medium-emphasis" />
			</component>

			<VAvatar v-else size="44" class="nostr-card__avatar" :color="avatarUrl ? undefined : 'surface-light'">
				<VImg v-if="avatarUrl" :src="avatarUrl" :alt="authorName" />
				<VIcon v-else :icon="mdiAccountCircleOutline" />
			</VAvatar>

			<div class="nostr-card__main">
				<div class="d-flex align-center ga-2 flex-wrap mb-1">
					<VChip size="x-small" variant="tonal" class="nostr-card__kind" data-testid="nostr-result-kind">
						{{ kindLabel }}
					</VChip>
					<span v-if="resource?.isFree" class="nostr-card__badge" data-testid="nostr-result-free">
						{{ t("pages.nostrSearch.result.free") }}
					</span>
					<span class="text-caption text-medium-emphasis" :title="absoluteDate">{{ relativeDate }}</span>
				</div>

				<component
					:is="externalUrl ? 'a' : 'h3'"
					:href="externalUrl"
					:target="externalUrl ? '_blank' : undefined"
					:rel="externalUrl ? 'noopener noreferrer' : undefined"
					class="nostr-card__title"
					data-testid="nostr-result-title"
				>
					{{ headline }}
				</component>

				<p v-if="result.content" class="nostr-card__text" data-testid="nostr-result-content">
					{{ result.content }}
				</p>

				<div v-if="chips.length > 0" class="d-flex flex-wrap ga-1 mt-2">
					<span
						v-for="chip in chips"
						:key="`${chip.tone}-${chip.label}`"
						class="nostr-tag"
						:class="`nostr-tag--${chip.tone}`"
						data-testid="nostr-result-tag"
					>
						{{ chip.label }}
					</span>
				</div>

				<p v-if="credits" class="nostr-card__meta" data-testid="nostr-result-credits">{{ credits }}</p>
			</div>
		</div>

		<VDivider />

		<div class="nostr-card__footer">
			<div class="d-flex align-center ga-1 flex-wrap">
				<span v-if="resource?.licenseLabel" class="nostr-tag nostr-tag--license" data-testid="nostr-result-license">
					{{ resource.licenseLabel }}
				</span>
				<span v-for="relay in result.relays" :key="relay" class="nostr-card__relay" data-testid="nostr-result-relay">
					{{ relayLabel(relay) }}
				</span>
			</div>

			<div class="d-flex align-center ga-1">
				<VBtn
					variant="text"
					size="small"
					:icon="copied ? mdiCheck : mdiContentCopy"
					:aria-label="t('pages.nostrSearch.result.copy')"
					:title="t('pages.nostrSearch.result.copy')"
					data-testid="nostr-result-copy"
					@click="copyReference"
				/>
				<VBtn
					variant="text"
					size="small"
					:prepend-icon="mdiViewDashboardOutline"
					data-testid="nostr-result-add-to-board"
					@click="emit('add-to-board', result)"
				>
					{{ t("pages.nostrSearch.result.addToBoard") }}
				</VBtn>
				<VBtn
					v-if="externalUrl"
					variant="tonal"
					size="small"
					color="primary"
					:append-icon="mdiOpenInNew"
					:href="externalUrl"
					target="_blank"
					rel="noopener noreferrer"
					data-testid="nostr-result-open"
				>
					{{ t("pages.nostrSearch.result.open") }}
				</VBtn>
			</div>
		</div>
	</VCard>
</template>

<script setup lang="ts">
import { AMB_KIND } from "./amb";
import { shortenBech32 } from "./nip19";
import { NOSTR_KIND_PROFILE, NostrSearchResult } from "./types";
import { sanitizeUrl } from "@braintree/sanitize-url";
import {
	mdiAccountCircleOutline,
	mdiCheck,
	mdiContentCopy,
	mdiOpenInNew,
	mdiSchoolOutline,
	mdiViewDashboardOutline,
} from "@icons/material";
import { useClipboard } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ result: NostrSearchResult }>();
const emit = defineEmits<{ "add-to-board": [result: NostrSearchResult] }>();

const { t, locale } = useI18n();

const resource = computed(() => props.result.resource);
const isResource = computed(() => props.result.kind === AMB_KIND);
const profile = computed(() => props.result.author.profile);

/**
 * Nostr identities are optional and self-declared: a note may carry no profile at all. The public
 * key is the only thing always present, so it is the fallback name — shortened, because a 64
 * character key is not a name.
 */
const authorName = computed(() => {
	const named = profile.value?.displayName ?? profile.value?.name;
	if (named) return named;

	const npub = props.result.author.npub;

	return npub ? shortenBech32(npub) : props.result.author.pubkey.slice(0, 12);
});

const headline = computed(() => props.result.title ?? authorName.value);

const kindLabel = computed(() => {
	if (isResource.value) return resource.value?.resourceTypes[0] ?? t("pages.nostrSearch.mode.resources");
	if (props.result.kind === NOSTR_KIND_PROFILE) return t("pages.nostrSearch.result.profile");

	return t("pages.nostrSearch.result.note");
});

/** Subjects, level and audience read as one row of tags; the tone separates what they mean. */
const chips = computed(() => {
	if (isResource.value) {
		return [
			...(resource.value?.subjects ?? []).map((label) => ({ label, tone: "alpha" })),
			...(resource.value?.educationalLevels ?? []).map((label) => ({ label, tone: "beta" })),
			...(resource.value?.audiences ?? []).map((label) => ({ label, tone: "beta" })),
		].slice(0, 6);
	}

	return props.result.hashtags.map((label) => ({ label: `#${label}`, tone: "alpha" }));
});

const credits = computed(() => {
	if (!isResource.value) return profile.value?.nip05;

	return [...(resource.value?.creators ?? []), resource.value?.publisher].filter(Boolean).join(" · ");
});

// Pictures and links come from an untrusted relay — only http(s) may reach the page.
const httpOnly = (value: string | undefined): string | undefined => {
	if (!value) return undefined;
	const sanitized = sanitizeUrl(value);

	return sanitized.startsWith("http") ? sanitized : undefined;
};

const avatarUrl = computed(() => httpOnly(profile.value?.picture));
const imageUrl = computed(() => httpOnly(resource.value?.imageUrl));
const externalUrl = computed(() => httpOnly(props.result.externalUrl));

const absoluteDate = computed(() =>
	new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(props.result.createdAt)
);

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600],
	["month", 30 * 24 * 3600],
	["day", 24 * 3600],
	["hour", 3600],
	["minute", 60],
];

/** "vor 3 Tagen" carries more at a glance than a date does; the exact date stays in the tooltip. */
const relativeDate = computed(() => {
	const seconds = Math.round((props.result.createdAt.getTime() - Date.now()) / 1000);
	const formatter = new Intl.RelativeTimeFormat(locale.value, { numeric: "auto" });

	for (const [unit, unitSeconds] of RELATIVE_UNITS) {
		if (Math.abs(seconds) >= unitSeconds) return formatter.format(Math.round(seconds / unitSeconds), unit);
	}

	return formatter.format(0, "minute");
});

const relayLabel = (relay: string): string => relay.replace(/^wss:\/\//, "");

const reference = computed(() => {
	if (isResource.value) return props.result.externalUrl ?? props.result.id;

	return props.result.kind === NOSTR_KIND_PROFILE
		? (props.result.author.npub ?? props.result.author.pubkey)
		: (props.result.noteRef ?? props.result.id);
});

const { copy, copied } = useClipboard({ legacy: true });

const copyReference = () => copy(reference.value);
</script>

<style scoped>
.nostr-card {
	border-radius: var(--ais-radius-xl, 16px);
	transition:
		box-shadow 150ms ease,
		border-color 150ms ease,
		transform 150ms ease;
}

.nostr-card:hover {
	border-color: rgba(var(--v-theme-primary), 0.5);
	box-shadow: var(--ais-shadow-sm);
	transform: translateY(-2px);
}

.nostr-card__body {
	display: flex;
	gap: 16px;
	padding: 16px;
}

.nostr-card__thumb {
	flex: 0 0 auto;
	width: 104px;
	height: 78px;
	overflow: hidden;
	border-radius: var(--ais-radius-md, 8px);
	background-color: var(--ais-base-muted, rgb(var(--v-theme-surface-light)));
	display: flex;
	align-items: center;
	justify-content: center;
}

.nostr-card__avatar {
	flex: 0 0 auto;
}

.nostr-card__main {
	min-width: 0;
	flex: 1 1 auto;
}

.nostr-card__title {
	display: block;
	font-size: 1.0625rem;
	font-weight: 600;
	line-height: 1.35;
	color: rgb(var(--v-theme-on-surface));
	text-decoration: none;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

a.nostr-card__title:hover {
	color: rgb(var(--v-theme-primary));
	text-decoration: underline;
}

.nostr-card__text {
	margin: 6px 0 0;
	font-size: 0.875rem;
	line-height: 1.5;
	color: var(--ais-base-muted-foreground, rgba(var(--v-theme-on-surface), 0.7));
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.nostr-card__meta {
	margin: 8px 0 0;
	font-size: 0.75rem;
	color: var(--ais-base-muted-foreground, rgba(var(--v-theme-on-surface), 0.7));
}

.nostr-card__footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	flex-wrap: wrap;
	padding: 8px 12px 8px 16px;
}

.nostr-card__relay {
	font-size: 0.6875rem;
	color: var(--ais-base-muted-foreground, rgba(var(--v-theme-on-surface), 0.7));
}

.nostr-card__relay::before {
	content: "•";
	margin-right: 4px;
	color: rgb(var(--v-theme-primary));
}

.nostr-card__badge {
	font-size: 0.6875rem;
	font-weight: 600;
	color: var(--ais-tag-beta-foreground, #00745f);
}

.nostr-tag {
	display: inline-flex;
	align-items: center;
	padding: 2px 8px;
	border-radius: var(--ais-radius-full, 9999px);
	font-size: 0.6875rem;
	line-height: 1.5;
	white-space: nowrap;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.nostr-tag--alpha {
	background-color: var(--ais-tag-alpha-background, #e5e1fe);
	color: var(--ais-tag-alpha-foreground, #5042b1);
}

.nostr-tag--beta {
	background-color: var(--ais-tag-beta-background, #e3fffa);
	color: var(--ais-tag-beta-foreground, #00745f);
}

.nostr-tag--license {
	border: 1px solid var(--ais-base-border, #e5e5e5);
	color: var(--ais-base-muted-foreground, rgba(var(--v-theme-on-surface), 0.7));
}
</style>
