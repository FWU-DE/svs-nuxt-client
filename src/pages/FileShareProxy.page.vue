<template>
	<DefaultWireframe max-width="short" main-with-bottom-padding>
		<template #header>
			<h1>{{ t("pages.files.legacy.shareLinkTitle") }}</h1>
		</template>
		<VProgressLinear v-if="!failed" indeterminate data-testid="file-share-proxy-loading" />
		<VAlert v-else type="error" variant="tonal" data-testid="file-share-proxy-error">
			{{ t("pages.files.legacy.noAccess") }}
		</VAlert>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { legacyFileStorageApi } from "@data-legacy-files";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

/**
 * Target of the product's share links (`/files/fileModel/:id/proxy?share=<token>`):
 * registers read access for the visitor with the token, then opens the file.
 */
const { t } = useI18n();
const route = useRoute();
const failed = ref(false);

useTitle(buildPageTitle(t("pages.files.legacy.shareLinkTitle")));

onMounted(async () => {
	const fileId = route.params.id as string;
	const share = route.query.share;
	try {
		const file =
			typeof share === "string" && share && share !== "undefined"
				? await legacyFileStorageApi.registerShare(fileId, share)
				: await legacyFileStorageApi.get(fileId);
		const download = route.query.download === "true";
		window.location.replace(await legacyFileStorageApi.signedUrl(file, download));
	} catch {
		failed.value = true;
	}
});
</script>
