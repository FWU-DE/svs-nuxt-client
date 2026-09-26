<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="shared-files-title">{{ t("pages.files.legacy.sharedTitle") }}</h1>
		</template>

		<p class="mb-4">{{ t("pages.files.legacy.filesSharedWithMeContent") }}</p>
		<LegacyFileBrowser
			v-if="userId"
			:root-id="userId"
			:root-name="t('pages.files.legacy.filesSharedWithMe')"
			:can-upload="false"
			:can-create-dir="false"
			:can-manage="false"
			:can-edit-permissions="false"
			:loader="() => legacyFileStorageApi.sharedWithMe(userId!)"
		/>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import LegacyFileBrowser from "@/components/legacy/files/LegacyFileBrowser.vue";
import { buildPageTitle } from "@/utils/pageTitle";
import { useAppStoreRefs } from "@data-app";
import { legacyFileStorageApi } from "@data-legacy-files";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { user } = useAppStoreRefs();

useTitle(buildPageTitle(t("pages.files.legacy.sharedTitle")));

const userId = computed(() => user.value?.id);
const breadcrumbs = computed(() => [{ title: t("pages.files.legacy.filesSharedWithMe"), disabled: true }]);
</script>
