<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="account-teams-title">{{ t("pages.accountTeams.title") }}</h1>
		</template>

		<p data-testid="account-teams-visibility">{{ t("pages.accountTeams.visibilityDisabled") }}</p>

		<VBtn variant="outlined" to="/account" data-testid="account-teams-back">
			{{ t("pages.accountThirdPartyProviders.back") }}
		</VBtn>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
useTitle(buildPageTitle(t("pages.accountTeams.title")));
</script>
