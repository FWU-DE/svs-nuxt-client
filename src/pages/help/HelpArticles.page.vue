<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="help-articles-title">{{ t("pages.helpArticles.title") }}</h1>
		</template>

		<VTextField
			v-model="search"
			class="mb-6"
			:label="t('common.labels.search')"
			:prepend-inner-icon="mdiMagnify"
			clearable
			data-testid="help-search"
		/>

		<VRow class="mb-6" data-testid="help-quick-links">
			<VCol v-for="link in quickLinks" :key="link.href" cols="12" sm="6" md="4">
				<VCard
					class="h-100"
					variant="outlined"
					:href="link.href"
					:target="link.external ? '_blank' : undefined"
					rel="noopener"
				>
					<VCardText class="d-flex align-center ga-3">
						<VIcon :icon="link.icon" />
						<span>{{ link.title }}</span>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>

		<VExpansionPanels multiple :model-value="openTopicIds" data-testid="help-topic-list">
			<VExpansionPanel v-for="topic in filteredTopics" :key="topic.id" :value="topic.id">
				<VExpansionPanelTitle>
					<div class="d-flex align-center ga-3">
						<VIcon :icon="getTopicIcon(topic.icon)" />
						<span>{{ topic.title }}</span>
					</div>
				</VExpansionPanelTitle>
				<VExpansionPanelText>
					<VList density="comfortable">
						<template v-for="category in topic.categories" :key="category.id">
							<VListSubheader>{{ category.title }}</VListSubheader>
							<VListItem
								v-if="!category.articles?.length"
								:href="`/help/confluence/${category.id}`"
								:title="category.title"
								:prepend-icon="mdiFileQuestionOutline"
							/>
							<VListItem
								v-for="article in category.articles"
								:key="article.id"
								:href="`/help/confluence/${article.id}`"
								:title="article.title"
								:prepend-icon="mdiFileDocumentOutline"
							/>
						</template>
					</VList>
				</VExpansionPanelText>
			</VExpansionPanel>
		</VExpansionPanels>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { helpTopics } from "./help-topics";
import { buildPageTitle } from "@/utils/pageTitle";
import {
	mdiFileDocumentOutline,
	mdiFilePdfBox,
	mdiFileQuestionOutline,
	mdiFileTreeOutline,
	mdiFileVideoOutline,
	mdiFolderOpenOutline,
	mdiHelpCircleOutline,
	mdiHumanMaleBoard,
	mdiListBoxOutline,
	mdiMagnify,
	mdiSchoolOutline,
} from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const search = ref("");

useTitle(buildPageTitle(t("pages.helpArticles.title")));

const quickLinks = computed(() => [
	{
		title: t("pages.helpArticles.training"),
		href: "https://lernen.dbildungscloud.de",
		icon: mdiFileVideoOutline,
		external: true,
	},
	{
		title: t("pages.helpArticles.liveFormats"),
		href: "https://docs.dbildungscloud.de/x/BosXBg",
		icon: mdiHumanMaleBoard,
		external: true,
	},
	{
		title: t("pages.helpArticles.quickstartPdf"),
		href: "https://s3.hidrive.strato.com/cloud-instances/global/Dokumente/Schnellstarter_LuL.pdf",
		icon: mdiFilePdfBox,
		external: true,
	},
	{
		title: t("pages.helpArticles.documents"),
		href: "/help/faq/documents",
		icon: mdiFolderOpenOutline,
	},
	{
		title: t("pages.releaseNotes.title"),
		href: "/system/releases",
		icon: mdiListBoxOutline,
	},
]);

const filteredTopics = computed(() => {
	const query = search.value.trim().toLowerCase();
	if (!query) return helpTopics;

	return helpTopics
		.map((topic) => {
			const topicMatches = topic.title.toLowerCase().includes(query);

			return {
				...topic,
				categories: topic.categories
					.map((category) => {
						const categoryMatches = category.title.toLowerCase().includes(query);
						return {
							...category,
							articles:
								topicMatches || categoryMatches
									? category.articles
									: category.articles?.filter((article) => article.title.toLowerCase().includes(query)),
						};
					})
					.filter(
						(category) =>
							topicMatches || category.title.toLowerCase().includes(query) || (category.articles?.length ?? 0) > 0
					),
			};
		})
		.filter((topic) => topic.title.toLowerCase().includes(query) || topic.categories.length > 0);
});

const openTopicIds = computed(() => filteredTopics.value.map((topic) => topic.id));

const getTopicIcon = (legacyIcon: string) => {
	if (legacyIcon.includes("graduation")) return mdiSchoolOutline;
	if (legacyIcon.includes("sitemap")) return mdiFileTreeOutline;
	return mdiHelpCircleOutline;
};
</script>
