<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="personal-files-title">{{ t("pages.files.legacy.personalTitle") }}</h1>
		</template>

		<LegacyFileBrowser
			v-if="userId"
			:parent-id="folderId"
			:root-id="userId"
			:root-name="t('pages.files.legacy.myPersonalData')"
			@open-folder="(folder) => router.push(`/files/my/${folder._id}`)"
		/>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useLegacyFolderBreadcrumbs } from "@/components/legacy/files/legacy-folder-breadcrumbs.composable";
import LegacyFileBrowser from "@/components/legacy/files/LegacyFileBrowser.vue";
import { buildPageTitle } from "@/utils/pageTitle";
import { useAppStoreRefs } from "@data-app";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { user } = useAppStoreRefs();

useTitle(buildPageTitle(t("pages.files.legacy.personalTitle")));

const userId = computed(() => user.value?.id);
const folderId = computed(() => (route.params.folderId as string | undefined) || undefined);

// As in the product: "Meine persönlichen Dateien", then the folder chain.
const breadcrumbs = useLegacyFolderBreadcrumbs(
	folderId,
	computed(() => [{ title: t("pages.files.legacy.myPersonalData"), to: "/files/my" }]),
	(id) => `/files/my/${id}`
);
</script>
