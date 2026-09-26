<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="files-overview-title">{{ t("global.sidebar.item.files-old") }}</h1>
		</template>

		<VRow data-testid="files-overview-cards">
			<VCol v-for="entry in fileEntries" :key="entry.href" cols="12" sm="6">
				<LegacyScCard
					:title="entry.title"
					:icon="entry.icon"
					:href="entry.href"
					:background="entry.background"
					:link-text="t('pages.files.overview.open')"
					:test-id="entry.testId"
				>
					{{ entry.description }}
				</LegacyScCard>
			</VCol>
		</VRow>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import LegacyScCard from "@/components/legacy/LegacyScCard.vue";
import { buildPageTitle } from "@/utils/pageTitle";
import { useEnvConfig } from "@data-env";
import { mdiAccountGroupOutline, mdiAccountOutline, mdiSchoolOutline, mdiShareVariantOutline } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

useTitle(buildPageTitle(t("global.sidebar.item.files-old")));

// Cards, colours and order of the legacy files overview (views/files/files-overview.hbs).
const fileEntries = computed(() => [
	{
		title: t("pages.files.overview.personalFiles"),
		description: t("pages.files.overview.personalFiles.description"),
		href: "/files/my/",
		icon: mdiAccountOutline,
		background: "#283E56",
		testId: "files-overview-personal",
	},
	{
		title: t("pages.files.overview.courseFiles"),
		description: t("pages.files.overview.courseFiles.description"),
		href: "/files/courses/",
		icon: mdiSchoolOutline,
		background: "#1989AC",
		testId: "files-overview-courses",
	},
	...(useEnvConfig().value.FEATURE_TEAMS_ENABLED
		? [
				{
					title: t("pages.files.overview.teamFiles"),
					description: t("pages.files.overview.teamFiles.description"),
					href: "/files/teams/",
					icon: mdiAccountGroupOutline,
					background: "#1989AC",
					testId: "files-overview-teams",
				},
			]
		: []),
	{
		title: t("pages.files.overview.sharedFiles"),
		description: t("pages.files.overview.sharedFiles.description"),
		href: "/files/shared/",
		icon: mdiShareVariantOutline,
		background: "#00B8A9",
		testId: "files-overview-shared",
	},
]);
</script>
