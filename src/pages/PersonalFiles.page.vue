<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="personal-files-title">{{ t("pages.files.overview.personalFiles") }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="!userId || !schoolId" type="warning" variant="tonal" data-testid="personal-files-missing-context">
				{{ t("pages.files.personal.missingContext") }}
			</VAlert>

			<VAlert v-else-if="files.length === 0" type="info" variant="tonal" data-testid="personal-files-empty">
				{{ t("pages.folder.emptyState") }}
			</VAlert>

			<VList v-else data-testid="personal-files-list">
				<VListItem
					v-for="file in files"
					:key="file.id"
					:href="file.url"
					target="_blank"
					rel="noopener"
					:data-testid="`personal-file-${file.id}`"
				>
					<template #prepend>
						<VIcon :icon="mdiFileDocumentOutline" />
					</template>
					<VListItemTitle>{{ file.name }}</VListItemTitle>
					<VListItemSubtitle>
						{{ formatFileSize(file.size)
						}}<span v-if="file.updatedAt"> · {{ formatUtc(file.updatedAt, "dateTimeYY") }}</span>
					</VListItemSubtitle>
					<template #append>
						<VIcon :icon="mdiOpenInNew" />
					</template>
				</VListItem>
			</VList>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { formatUtc } from "@/utils/date-time.utils";
import { formatFileSize } from "@/utils/fileHelper";
import { buildPageTitle } from "@/utils/pageTitle";
import { FileApiFactory, FileRecordParentType, StorageLocation } from "@api-file-storage";
import { useAppStoreRefs } from "@data-app";
import { mdiFileDocumentOutline, mdiOpenInNew } from "@icons/material";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { school, user } = useAppStoreRefs();
const fileApi = FileApiFactory(undefined, "/v3", $axios);

const schoolId = computed(() => school.value?.id);
const userId = computed(() => user.value?.id);

useTitle(buildPageTitle(t("pages.files.overview.personalFiles")));

const { data, loadingState } = useSafeAxiosRunner(async () => {
	if (!schoolId.value || !userId.value) return [];
	const response = await fileApi.list(
		schoolId.value,
		StorageLocation.SCHOOL,
		userId.value,
		FileRecordParentType.USERS,
		0,
		100
	);
	return response.data.data;
});

const files = computed(() => data.value ?? []);
</script>
