<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="help-documents-title">{{ t("pages.helpDocuments.title") }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="sections.length === 0" type="info" variant="tonal" data-testid="help-documents-empty">
				{{ t("pages.helpDocuments.empty") }}
			</VAlert>

			<VExpansionPanels v-else multiple data-testid="help-documents-list">
				<VExpansionPanel v-for="section in sections" :key="section.title" :value="section.title">
					<VExpansionPanelTitle>{{ section.title }}</VExpansionPanelTitle>
					<VExpansionPanelText>
						<RenderHTML :html="section.content" data-testid="help-documents-content" />
					</VExpansionPanelText>
				</VExpansionPanel>
			</VExpansionPanels>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { useEnvConfig } from "@data-env";
import { RenderHTML } from "@feature-render-html";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

type HelpDocumentSection = {
	title: string;
	content: string;
};

const { t } = useI18n();
const envConfig = useEnvConfig();

useTitle(buildPageTitle(t("pages.helpDocuments.title")));

const { data, loadingState } = useSafeAxiosRunner(async () => {
	try {
		const response = await $axios.get<HelpDocumentSection[]>("/help/documents", {
			params: { theme: envConfig.value.SC_THEME },
		});
		return response.data;
	} catch {
		return [];
	}
});

const sections = computed(() => data.value ?? []);
</script>
