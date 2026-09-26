<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding :breadcrumbs="breadcrumbs">
		<template #header>
			<h1 data-testid="help-documents-title">{{ t("pages.helpDocuments.title") }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="sections.length === 0" type="info" variant="tonal" data-testid="help-documents-empty">
				{{ t("pages.helpDocuments.empty") }}
			</VAlert>

			<LegacyAccordion v-else :items="accordionItems" test-id="help-documents-list">
				<template #default="{ item }">
					<RenderHTML :html="item.content" data-testid="help-documents-content" />
				</template>
			</LegacyAccordion>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import LegacyAccordion from "@/components/legacy/LegacyAccordion.vue";
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
const accordionItems = computed(() =>
	sections.value.map((section, index) => ({
		key: `${index}-${section.title}`,
		title: section.title,
		content: section.content,
	}))
);

// Legacy puts the help area as breadcrumb above this page.
const breadcrumbs = computed(() => [{ title: t("pages.helpArticles.title"), href: "/help/articles" }]);
</script>
