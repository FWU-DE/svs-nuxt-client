<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="account-teams-title">{{ t("pages.accountTeams.title") }}</h1>
		</template>

		<VCard variant="outlined" data-testid="account-teams-card">
			<VCardItem>
				<template #prepend>
					<VIcon :icon="mdiAccountGroupOutline" />
				</template>
				<VCardTitle>{{ t("pages.accountTeams.visibilityTitle") }}</VCardTitle>
			</VCardItem>
			<VCardText>
				<p>{{ t("pages.accountTeams.visibilityText") }}</p>
				<VAlert type="info" variant="tonal" data-testid="account-teams-native-note">
					{{ t("pages.accountTeams.nativeNote") }}
				</VAlert>
			</VCardText>
			<VCardActions>
				<VBtn variant="outlined" to="/account" data-testid="account-teams-back">
					{{ t("common.labels.backToOverview") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { mdiAccountGroupOutline } from "@icons/material";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
useTitle(buildPageTitle(t("pages.accountTeams.title")));
</script>
