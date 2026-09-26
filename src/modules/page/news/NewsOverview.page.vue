<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<div class="d-flex align-start justify-space-between flex-wrap ga-4">
				<h1 data-testid="news-overview-title">{{ t("pages.news.title") }}</h1>
				<div class="d-flex flex-column align-end ga-3">
					<VTextField
						v-model="search"
						:placeholder="`${t('pages.news.overview.search')}...`"
						:append-inner-icon="mdiMagnify"
						variant="outlined"
						density="compact"
						hide-details
						class="news-search"
						data-testid="news-search"
					/>
					<VBtn
						v-if="canCreateNews"
						color="primary"
						variant="flat"
						:prepend-icon="mdiPlus"
						href="/news/new"
						data-testid="news-create-button"
					>
						{{ t("pages.news.overview.add") }}
					</VBtn>
				</div>
			</div>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="filteredNews.length === 0" type="info" variant="tonal" data-testid="news-empty">
				{{ t("pages.dashboard.empty.news") }}
			</VAlert>

			<VRow v-else data-testid="news-list">
				<VCol v-for="item in filteredNews" :key="item.id" cols="12" sm="6" lg="3">
					<LegacyScCard
						:title="item.title"
						:secondary-title="fromNowUtc(item.displayAt)"
						:href="`/news/${item.id}`"
						:link-text="t('pages.news.overview.continueReading')"
						:test-id="`news-card-${item.id}`"
					>
						<p class="mb-0 news-preview" data-testid="news-preview">{{ toPlainText(item.content) }}</p>
					</LegacyScCard>
				</VCol>
			</VRow>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import LegacyScCard from "@/components/legacy/LegacyScCard.vue";
import { fromNowUtc } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { NewsApiFactory, Permission } from "@api-server";
import { useAppStoreRefs } from "@data-app";
import { mdiMagnify, mdiPlus } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const newsApi = NewsApiFactory(undefined, "/v3", $axios);
const { userPermissions } = useAppStoreRefs();
const canCreateNews = computed(() => userPermissions.value.includes(Permission.NEWS_CREATE));

useTitle(buildPageTitle(t("pages.news.title")));

const { data, loadingState } = useSafeAxiosRunner(async () => {
	const response = await newsApi.newsControllerFindAll(undefined, undefined, undefined, 0, 30);
	return response.data.data;
});

const news = computed(() => data.value ?? []);

// The legacy overview has a search box above the cards; it filters by title and text.
const search = ref("");
const filteredNews = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return news.value;
	return news.value.filter((item) => `${item.title} ${toPlainText(item.content)}`.toLowerCase().includes(term));
});

const toPlainText = (html: string) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
</script>

<style lang="scss" scoped>
.news-search {
	width: 240px;
}

.news-preview {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>
