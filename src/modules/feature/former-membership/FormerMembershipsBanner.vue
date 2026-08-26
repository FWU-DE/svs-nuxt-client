<template>
	<div v-if="!dismissed" data-testid="former-memberships-banner">
		<!--
			FormerMembershipsList must always mount here (it's the one that fetches on mount) -
			it hides itself internally when the list is empty. The dismiss row below is gated on
			the same "isEmpty" so it never appears next to nothing to dismiss.
		-->
		<FormerMembershipsList />
		<div v-if="!isEmpty" class="d-flex justify-end mt-n4 mb-6">
			<VBtn
				variant="text"
				size="small"
				data-testid="former-memberships-banner-dismiss"
				:text="t('pages.formerMemberships.dashboardBanner.dismiss')"
				@click="onDismiss"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import FormerMembershipsList from "./FormerMembershipsList.vue";
import { useStorage } from "@/composables/locale-storage.composable";
import { useFormerMembershipStore } from "@data-app";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

// Frontend-only dismissal: hides the banner on the dashboard until the next logout (the app
// clears localStorage on logout, so this intentionally resets then). It never touches the
// underlying formerMemberships data - the Verwaltung page keeps showing the full list regardless.
const DISMISSED_STORAGE_KEY = "former-memberships-banner-dismissed";

const { t } = useI18n();
const storage = useStorage();

const { isEmpty } = storeToRefs(useFormerMembershipStore());

const dismissed = ref(storage.get(DISMISSED_STORAGE_KEY) === "true");

const onDismiss = () => {
	dismissed.value = true;
	storage.set(DISMISSED_STORAGE_KEY, "true");
};
</script>
