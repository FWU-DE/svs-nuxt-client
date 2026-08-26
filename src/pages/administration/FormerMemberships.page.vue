<template>
	<DefaultWireframe max-width="full">
		<template #header>
			<h1>{{ t("pages.formerMemberships.title") }}</h1>
		</template>
		<FormerMembershipsList />
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { FormerMembershipsList } from "@feature-former-membership";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

useTitle(buildPageTitle(t("pages.formerMemberships.title")));
</script>
