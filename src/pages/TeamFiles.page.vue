<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="team-files-title">{{ t("pages.files.legacy.teamTitle") }}</h1>
		</template>

		<template v-if="!teamId">
			<VProgressLinear v-if="loadingTeams" indeterminate />
			<p v-else-if="teams.length === 0" class="text-medium-emphasis" data-testid="team-files-empty">
				{{ t("pages.folder.emptyState") }}
			</p>
			<template v-else>
				<h2 class="text-subtitle-1 font-weight-bold py-3">{{ t("pages.files.legacy.folders") }}</h2>
				<RouterLink
					v-for="team in teams"
					:key="team._id"
					:to="`/files/teams/${team._id}`"
					class="scope-card"
					:aria-label="t('pages.files.legacy.openFolder', { name: team.name })"
					:data-testid="`team-files-team-${team._id}`"
				>
					<VIcon :icon="mdiFolder" class="mr-2" color="#f8c34f" />
					<strong>{{ team.name }}</strong>
				</RouterLink>
			</template>
		</template>

		<LegacyFileBrowser
			v-else-if="userId"
			:owner-id="teamId"
			:parent-id="folderId"
			:root-id="teamId"
			:root-name="teamName"
			@open-folder="(folder) => router.push(`/files/teams/${teamId}/${folder._id}`)"
		/>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useLegacyFolderBreadcrumbs } from "@/components/legacy/files/legacy-folder-breadcrumbs.composable";
import LegacyFileBrowser from "@/components/legacy/files/LegacyFileBrowser.vue";
import { buildPageTitle } from "@/utils/pageTitle";
import { useAppStoreRefs } from "@data-app";
import { legacyFileStorageApi, LegacyTeam } from "@data-legacy-files";
import { mdiFolder } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { user } = useAppStoreRefs();

useTitle(buildPageTitle(t("pages.files.legacy.teamTitle")));

const userId = computed(() => user.value?.id);
const teamId = computed(() => (route.params.teamId as string | undefined) || undefined);
const folderId = computed(() => (route.params.folderId as string | undefined) || undefined);

const teams = ref<LegacyTeam[]>([]);
const loadingTeams = ref(true);

onMounted(async () => {
	try {
		teams.value = await legacyFileStorageApi.myTeams();
	} catch {
		teams.value = [];
	} finally {
		loadingTeams.value = false;
	}
});

const teamName = computed(() => teams.value.find((team) => team._id === teamId.value)?.name ?? "");

const breadcrumbs = useLegacyFolderBreadcrumbs(
	folderId,
	computed(() => [
		{ title: t("pages.files.legacy.filesFromMyTeam"), to: "/files/teams" },
		...(teamId.value ? [{ title: teamName.value, to: `/files/teams/${teamId.value}` }] : []),
	]),
	(id) => `/files/teams/${teamId.value}/${id}`
);
</script>

<style lang="scss" scoped>
.scope-card {
	display: flex;
	align-items: center;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
	border-radius: 4px;
	padding: 0.75rem 1rem;
	margin-bottom: 0.75rem;
	color: inherit;
	text-decoration: none;
	background: rgb(var(--v-theme-surface));

	&:hover,
	&:focus-visible {
		background: rgba(var(--v-theme-on-surface), 0.04);
	}
}
</style>
