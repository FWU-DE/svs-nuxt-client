<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<div class="d-flex align-center justify-space-between flex-wrap ga-4">
				<h1 data-testid="help-confluence-title">{{ t("pages.helpConfluence.title") }}</h1>
				<VBtn
					variant="outlined"
					:href="articleUrl"
					target="_blank"
					rel="noopener noreferrer"
					data-testid="help-confluence-open"
				>
					{{ t("pages.helpConfluence.openExternal") }}
				</VBtn>
			</div>
		</template>

		<VAlert class="mb-4" type="info" variant="tonal" data-testid="help-confluence-hint">
			{{ t("pages.helpConfluence.hint") }}
		</VAlert>

		<iframe
			class="help-frame"
			:src="frameUrl"
			:title="t('pages.helpConfluence.title')"
			data-testid="help-confluence-frame"
		/>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const articleId = computed(() => String(route.params.id ?? ""));
const articleUrl = computed(() => `https://docs.dbildungscloud.de/pages/viewpage.action?pageId=${articleId.value}`);
const frameUrl = computed(() => `${articleUrl.value}&frameable=true`);

useTitle(buildPageTitle(t("pages.helpConfluence.title")));
</script>

<style scoped>
.help-frame {
	width: 100%;
	min-height: 800px;
	border: 0;
}
</style>
