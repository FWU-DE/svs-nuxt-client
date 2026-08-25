<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="legacy-view-migration-title">{{ t("pages.legacyViewMigration.title") }}</h1>
		</template>

		<VCard variant="outlined" data-testid="legacy-view-migration-card">
			<VCardText>
				<p class="text-body-1 mb-4">
					{{ t("pages.legacyViewMigration.description") }}
				</p>

				<VList density="compact" lines="two">
					<VListItem :title="t('pages.legacyViewMigration.requestedPath')" :subtitle="requestedPath" />
					<VListItem
						v-if="legacyEntry"
						:title="t('pages.legacyViewMigration.legacyView')"
						:subtitle="legacyEntry.view"
					/>
					<VListItem
						v-if="legacyEntry"
						:title="t('pages.legacyViewMigration.legacyController')"
						:subtitle="`${legacyEntry.controller}:${legacyEntry.controllerLine}`"
					/>
				</VList>

				<VAlert class="mt-4" type="info" variant="tonal" data-testid="legacy-view-migration-note">
					{{ t("pages.legacyViewMigration.note") }}
				</VAlert>
			</VCardText>

			<VCardActions>
				<VBtn color="primary" variant="flat" to="/dashboard" data-testid="legacy-view-migration-dashboard">
					{{ t("pages.legacyViewMigration.toDashboard") }}
				</VBtn>
				<VBtn variant="text" to="/help/articles" data-testid="legacy-view-migration-help">
					{{ t("pages.legacyViewMigration.toHelp") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { findLegacyViewMigrationEntry } from "@/router/legacy-view-migration";
import { buildPageTitle } from "@/utils/pageTitle";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t } = useI18n();
const route = useRoute();

useTitle(buildPageTitle(t("pages.legacyViewMigration.title")));

const requestedPath = computed(() => (Array.isArray(route.query.path) ? route.query.path[0] : route.query.path) ?? "");
const legacyEntry = computed(() => findLegacyViewMigrationEntry(requestedPath.value));
</script>
