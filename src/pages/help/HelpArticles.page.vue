<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="help-articles-title">{{ t("pages.helpArticles.title") }}</h1>
		</template>

		<VTextField
			v-model="search"
			class="help-search mx-auto mb-2"
			:placeholder="t('pages.helpArticles.search')"
			:prepend-inner-icon="mdiMagnify"
			variant="solo-filled"
			flat
			rounded="pill"
			density="comfortable"
			hide-details
			clearable
			data-testid="help-search"
		/>

		<LegacyIconCard
			v-if="!search"
			:title="t('pages.helpArticles.firstSteps')"
			:icon="mdiHumanChild"
			test-id="help-first-steps"
		>
			<VRow>
				<VCol v-for="role in firstSteps" :key="role.id" cols="6" sm="3" class="text-center">
					<a :href="`/help/confluence/${role.id}`" class="role-link" :data-testid="`help-first-steps-${role.id}`">
						<img :src="role.image" alt="" class="role-image" />
						<span class="d-block">{{ role.title }}</span>
					</a>
				</VCol>
			</VRow>
		</LegacyIconCard>

		<VRow data-testid="help-topic-list">
			<VCol v-for="topic in filteredTopics" :key="topic.id" cols="12" md="6">
				<LegacyIconCard :title="topic.title" :icon="getTopicIcon(topic.icon)" :test-id="`help-topic-${topic.id}`">
					<div v-for="category in topic.categories" :key="category.id" class="help-category">
						<a
							v-if="!category.articles?.length"
							:href="`/help/confluence/${category.id}`"
							class="help-category-title d-flex align-center"
						>
							{{ category.title }}
						</a>
						<template v-else>
							<button
								type="button"
								class="help-category-title d-flex align-center w-100"
								:aria-expanded="isOpen(category.id)"
								:data-testid="`help-category-${category.id}`"
								@click="toggle(category.id)"
							>
								<VIcon :icon="isOpen(category.id) ? mdiChevronUp : mdiChevronRight" class="mr-2" />
								{{ category.title }}
							</button>
							<ul v-show="isOpen(category.id)" class="help-articles">
								<li v-for="article in category.articles" :key="article.id">
									<a :href="`/help/confluence/${article.id}`">{{ article.title }}</a>
								</li>
							</ul>
						</template>
					</div>
				</LegacyIconCard>
			</VCol>
		</VRow>

		<LegacyIconCard
			v-if="!search"
			:title="t('pages.helpArticles.usageHelp')"
			:icon="mdiSignDirection"
			test-id="help-quick-links"
		>
			<div class="usage-links d-flex flex-wrap">
				<a
					v-for="link in quickLinks"
					:key="link.href"
					:href="link.href"
					:target="link.external ? '_blank' : undefined"
					:rel="link.external ? 'noopener' : undefined"
					class="usage-link"
				>
					<VIcon :icon="link.icon" size="32" class="mb-2" />
					<span>{{ link.title }}</span>
				</a>
			</div>
		</LegacyIconCard>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { helpTopics } from "./help-topics";
import imgAdmin from "@/assets/img/help/admin-icon.png";
import imgTeacher from "@/assets/img/help/lehrer-icon.png";
import imgStudent from "@/assets/img/help/schueler-icon.png";
import imgPrincipal from "@/assets/img/help/schulleitung-icon.png";
import LegacyIconCard from "@/components/legacy/LegacyIconCard.vue";
import { buildPageTitle } from "@/utils/pageTitle";
import {
	mdiChevronRight,
	mdiChevronUp,
	mdiClipboardText,
	mdiFilePdfBox,
	mdiFolderOpen,
	mdiHumanChild,
	mdiMagnify,
	mdiMonitor,
	mdiSchool,
	mdiSignDirection,
	mdiSitemap,
	mdiVideo,
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
		icon: mdiVideo,
		external: true,
	},
	{
		title: t("pages.helpArticles.liveFormats"),
		href: "https://docs.dbildungscloud.de/x/BosXBg",
		icon: mdiMonitor,
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
		icon: mdiFolderOpen,
	},
	{
		title: t("pages.releaseNotes.title"),
		href: "/system/releases",
		icon: mdiClipboardText,
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

const getTopicIcon = (legacyIcon: string) => (legacyIcon.includes("sitemap") ? mdiSitemap : mdiSchool);

// "Erste Schritte" of the legacy help page: one picture per role, each linking to its article.
const firstSteps = computed(() => [
	{ id: "40304731", title: t("pages.helpArticles.firstSteps.students"), image: imgStudent },
	{ id: "40304726", title: t("pages.helpArticles.firstSteps.teachers"), image: imgTeacher },
	{ id: "40304667", title: "Admin", image: imgAdmin },
	{ id: "40304728", title: t("pages.helpArticles.firstSteps.principal"), image: imgPrincipal },
]);

// Categories are collapsed like in the legacy page; a search opens all matches.
const expanded = ref(new Set<string>());
const isOpen = (id: string) => !!search.value || expanded.value.has(id);
const toggle = (id: string) => {
	const next = new Set(expanded.value);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	expanded.value = next;
};
</script>

<style lang="scss" scoped>
.help-search {
	max-width: 500px;
	font-size: 1.25rem;
}

.role-link,
.usage-link {
	color: inherit;
	text-decoration: none;
}

.role-image {
	height: 56px;
}

.role-link span {
	font-size: 1.1rem;
}

.help-category {
	border-bottom: 1px solid #333;
}

.help-category-title {
	padding: 10px 0;
	font-size: 1.25rem;
	color: inherit;
	text-decoration: none;
	text-align: left;
}

.help-articles {
	list-style: none;
	padding: 0 0 8px 2rem;

	li {
		padding: 4px 0;
	}
}

.usage-links {
	margin: 0 -8px;
}

.usage-link {
	display: flex;
	flex: 1 1 180px;
	flex-direction: column;
	align-items: center;
	margin: 8px;
	padding: 24px 8px;
	color: #fff;
	background: rgb(var(--v-theme-on-surface));
	text-align: center;
}
</style>
