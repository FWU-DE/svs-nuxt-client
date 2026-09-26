<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="release-notes-title">{{ t("pages.releaseNotes.title") }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="releases.length === 0" type="info" variant="tonal" data-testid="release-notes-empty">
				{{ t("pages.releaseNotes.empty") }}
			</VAlert>

			<LegacyAccordion v-else :items="accordionItems" test-id="release-notes-list">
				<template #default="{ item, index }">
					<RenderHTML
						class="release-body"
						:html="renderReleaseBody(item.release.body)"
						:data-testid="`release-notes-body-${index}`"
					/>
					<VBtn
						v-if="item.release.url"
						class="mt-4"
						variant="outlined"
						:href="item.release.url"
						target="_blank"
						rel="noopener noreferrer"
						data-testid="release-notes-source"
					>
						{{ t("pages.releaseNotes.openSource") }}
					</VBtn>
				</template>
			</LegacyAccordion>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import LegacyAccordion from "@/components/legacy/LegacyAccordion.vue";
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { ReleaseApiFactory, ReleaseItemResponse } from "@api-server";
import { RenderHTML } from "@feature-render-html";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();
const releaseApi = ReleaseApiFactory(undefined, "/v3", $axios);

useTitle(buildPageTitle(t("pages.releaseNotes.title")));

const { data: releasesResponse, loadingState } = useSafeAxiosRunner(() =>
	releaseApi.releaseControllerGetReleases(0, 50)
);

const releases = computed(() =>
	[...(releasesResponse.value?.data.data ?? [])].sort(
		(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
	)
);

// Legacy shows `moment(publishedAt).format("ddd, ll")`, e.g. "Sa., 1. Aug. 2026".
const formatReleaseDate = (publishedAt: string) => {
	const date = new Date(publishedAt);
	if (Number.isNaN(date.getTime())) return publishedAt;
	const weekday = new Intl.DateTimeFormat(locale.value, { weekday: "short" }).format(date);
	const day = new Intl.DateTimeFormat(locale.value, { day: "numeric", month: "short", year: "numeric" }).format(date);
	return `${weekday}, ${day}`;
};

const accordionItems = computed(() =>
	releases.value.map((release) => ({
		key: release.id,
		title: release.name,
		aside: formatReleaseDate(release.publishedAt),
		release,
	}))
);

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");

const renderInlineMarkdown = (value: string) =>
	escapeHtml(value)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

const renderReleaseBody = (body: ReleaseItemResponse["body"]) => {
	const lines = body.split(/\r?\n/);
	let isInList = false;
	const html: string[] = [];

	const closeList = () => {
		if (isInList) {
			html.push("</ul>");
			isInList = false;
		}
	};

	for (const line of lines) {
		if (line.startsWith("### ")) {
			closeList();
			html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
		} else if (line.startsWith("## ")) {
			closeList();
			html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
		} else if (line.startsWith("# ")) {
			closeList();
			html.push(`<h2>${renderInlineMarkdown(line.slice(2))}</h2>`);
		} else if (/^[-*] /.test(line)) {
			if (!isInList) {
				html.push("<ul>");
				isInList = true;
			}
			html.push(`<li>${renderInlineMarkdown(line.slice(2))}</li>`);
		} else if (line.trim() === "") {
			closeList();
		} else {
			closeList();
			html.push(`<p>${renderInlineMarkdown(line)}</p>`);
		}
	}

	closeList();
	return html.join("");
};
</script>

<style scoped>
.release-body :deep(ul) {
	padding-left: 1.5rem;
}

.release-body :deep(p),
.release-body :deep(ul) {
	margin-bottom: 1rem;
}
</style>
