<template>
	<InfoAlert v-if="!isEmpty" class="mt-4 mb-6" data-testid="former-memberships-section">
		{{ t("pages.formerMemberships.info") }}

		<VDataTable
			class="mt-4"
			data-testid="former-memberships-table"
			:items="formerMemberships"
			:headers="headers"
			:loading="isLoading"
			loading-text="common.loading.text"
			no-data-text="common.nodata"
		>
			<template #[`item.type`]="{ item }">
				{{ item.type === FormerMembershipType.ROOM ? t("common.labels.room") : t("common.labels.course") }}
			</template>
			<template #[`item.actions`]="{ item }">
				<VBtn
					variant="text"
					color="primary"
					:data-testid="`reclaim-button-${item.refId}`"
					:text="t('pages.formerMemberships.reclaim.action')"
					@click="onReclaim(item)"
				/>
				<VBtn
					variant="text"
					color="primary"
					:data-testid="`discard-button-${item.refId}`"
					:text="t('pages.formerMemberships.discard.action')"
					@click="onDiscard(item)"
				/>
			</template>
		</VDataTable>
	</InfoAlert>
</template>

<script setup lang="ts">
import { askConfirmation } from "@/utils/confirmation-dialog.utils";
import { FormerMembershipListItemResponse, FormerMembershipType } from "@api-server";
import { notifyInfo, notifySuccess, useFormerMembershipStore } from "@data-app";
import { InfoAlert } from "@ui-alert";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const formerMembershipStore = useFormerMembershipStore();
const { formerMemberships, isLoading, isEmpty } = storeToRefs(formerMembershipStore);
const { fetchFormerMemberships, reclaimFormerMembership, discardFormerMembership } = formerMembershipStore;

const headers = [
	{ title: t("pages.formerMemberships.table.name"), key: "name" },
	{ title: t("pages.formerMemberships.table.type"), key: "type" },
	{ key: "actions", sortable: false, align: "end" as const },
];

const onReclaim = async (item: FormerMembershipListItemResponse) => {
	const shouldReclaim = await askConfirmation({
		title: t("pages.formerMemberships.reclaim.confirmation", { itemName: item.name }),
		messageType: "info",
		confirmBtnKey: "pages.formerMemberships.reclaim.action",
	});
	if (!shouldReclaim) return;

	const reclaimed = await reclaimFormerMembership(item.type, item.refId);
	if (reclaimed) {
		notifySuccess(t("pages.formerMemberships.reclaim.success", { itemName: item.name }));
	} else {
		notifyInfo(t("pages.formerMemberships.reclaim.noLongerAvailable", { itemName: item.name }));
	}
};

const onDiscard = async (item: FormerMembershipListItemResponse) => {
	const shouldDiscard = await askConfirmation({
		title: t("pages.formerMemberships.discard.confirmation", { itemName: item.name }),
		messageType: "warning",
		confirmBtnKey: "pages.formerMemberships.discard.action",
	});
	if (!shouldDiscard) return;

	const discarded = await discardFormerMembership(item.type, item.refId);
	if (discarded) {
		notifySuccess(t("pages.formerMemberships.discard.success", { itemName: item.name }));
	}
};

onMounted(() => {
	fetchFormerMemberships();
});
</script>
