<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<div class="d-flex align-center justify-space-between flex-wrap ga-4">
				<h1 data-testid="news-overview-title">{{ t("pages.news.title") }}</h1>
				<VBtn
					v-if="canCreateNews"
					color="primary"
					:prepend-icon="mdiPlus"
					href="/news/new"
					data-testid="news-create-button"
				>
					{{ t("pages.news.index.new") }}
				</VBtn>
			</div>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="news.length === 0" type="info" variant="tonal" data-testid="news-empty">
				{{ t("pages.dashboard.empty.news") }}
			</VAlert>

			<VRow v-else data-testid="news-list">
				<VCol v-for="item in news" :key="item.id" cols="12" md="6" lg="4">
					<VCard class="h-100" :href="`/news/${item.id}`" variant="outlined" :data-testid="`news-card-${item.id}`">
						<VCardTitle class="text-wrap d-flex align-start ga-2">
							<VIcon :icon="mdiNewspaperVariantOutline" class="mt-1" />
							<span>{{ item.title }}</span>
						</VCardTitle>
						<VCardSubtitle>
							<VIcon :icon="mdiClockOutline" size="small" class="mr-1" />
							{{ formatUtc(item.displayAt, "dateTimeYY") }}
						</VCardSubtitle>
						<VCardText>
							<p class="text-medium-emphasis mb-0" data-testid="news-preview">{{ toPlainText(item.content) }}</p>
						</VCardText>
					</VCard>
				</VCol>
			</VRow>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { formatUtc } from "@/utils/date-time.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { NewsApiFactory, Permission } from "@api-server";
import { useAppStoreRefs } from "@data-app";
import { mdiClockOutline, mdiNewspaperVariantOutline, mdiPlus } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
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

const toPlainText = (html: string) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
</script>
