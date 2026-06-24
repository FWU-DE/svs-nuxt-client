<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="files-overview-title">{{ t("global.sidebar.item.files-old") }}</h1>
		</template>

		<VRow data-testid="files-overview-cards">
			<VCol v-for="entry in fileEntries" :key="entry.href" cols="12" md="6">
				<VCard class="h-100" variant="outlined" :href="entry.href" :data-testid="entry.testId">
					<VCardText class="d-flex align-start ga-4">
						<VIcon :icon="entry.icon" size="large" class="mt-1" />
						<div>
							<h2 class="text-h6 mb-2">{{ entry.title }}</h2>
							<p class="text-medium-emphasis mb-0">{{ entry.description }}</p>
						</div>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>

		<VAlert class="mt-6" type="info" variant="tonal" data-testid="files-overview-note">
			{{ t("pages.files.overview.nativeNote") }}
		</VAlert>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { mdiAccountOutline, mdiFolderOpenOutline, mdiSchoolOutline, mdiShareVariantOutline } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

useTitle(buildPageTitle(t("global.sidebar.item.files-old")));

const fileEntries = computed(() => [
	{
		title: t("pages.files.overview.personalFiles"),
		description: t("pages.files.overview.personalFiles.description"),
		href: "/files/my/",
		icon: mdiAccountOutline,
		testId: "files-overview-personal",
	},
	{
		title: t("pages.files.overview.courseFiles"),
		description: t("pages.files.overview.courseFiles.description"),
		href: "/files/courses/",
		icon: mdiSchoolOutline,
		testId: "files-overview-courses",
	},
	{
		title: t("pages.files.overview.sharedFiles"),
		description: t("pages.files.overview.sharedFiles.description"),
		href: "/files/shared/",
		icon: mdiShareVariantOutline,
		testId: "files-overview-shared",
	},
	{
		title: t("pages.files.overview.favorites"),
		description: t("pages.files.overview.favorites.description"),
		href: "/files/search/",
		icon: mdiFolderOpenOutline,
		testId: "files-overview-search",
	},
]);
</script>
