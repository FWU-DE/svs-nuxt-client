<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="release-notes-title">{{ t("pages.releaseNotes.title") }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="releases.length === 0" type="info" variant="tonal" data-testid="release-notes-empty">
				{{ t("pages.releaseNotes.empty") }}
			</VAlert>

			<VExpansionPanels v-else multiple data-testid="release-notes-list">
				<VExpansionPanel v-for="(release, index) in releases" :key="release.id" :value="release.id">
					<VExpansionPanelTitle>
						<div class="d-flex align-center justify-space-between w-100 ga-4 flex-wrap">
							<span class="text-h3">{{ release.name }}</span>
							<span class="text-body-2 text-medium-emphasis">{{ formatReleaseDate(release.publishedAt) }}</span>
						</div>
					</VExpansionPanelTitle>
					<VExpansionPanelText>
						<RenderHTML
							class="release-body"
							:html="renderReleaseBody(release.body)"
							:data-testid="`release-notes-body-${index}`"
						/>
						<VBtn
							v-if="release.url"
							class="mt-4"
							variant="outlined"
							:href="release.url"
							target="_blank"
							rel="noopener noreferrer"
							data-testid="release-notes-source"
						>
							{{ t("pages.releaseNotes.openSource") }}
						</VBtn>
					</VExpansionPanelText>
				</VExpansionPanel>
			</VExpansionPanels>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { formatUtc } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { ReleaseApiFactory, ReleaseItemResponse } from "@api-server";
import { RenderHTML } from "@feature-render-html";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
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

const formatReleaseDate = (publishedAt: string) => formatUtc(publishedAt, "date") ?? publishedAt;

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
