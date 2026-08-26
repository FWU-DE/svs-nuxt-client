import { useSafeAxiosTask } from "@/composables/async-tasks.composable";
import { useI18nGlobal } from "@/plugins/i18n";
import { $axios } from "@/utils/api";
import { FormerMembershipApiFactory, FormerMembershipListItemResponse, FormerMembershipType } from "@api-server";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

// Self-service list of course/room memberships a user lost when they changed Dienststelle
// (school), and the action to reclaim one of them back. See SVSDEV-45.
export const useFormerMembershipStore = defineStore("former-membership-store", () => {
	const { t } = useI18nGlobal();
	const formerMembershipApi = FormerMembershipApiFactory(undefined, "/v3", $axios);

	const formerMemberships = ref<FormerMembershipListItemResponse[]>([]);
	const isEmpty = computed(() => formerMemberships.value.length === 0);

	const { execute, isRunning: isLoading } = useSafeAxiosTask();

	const fetchFormerMemberships = async () => {
		const { result } = await execute(
			() => formerMembershipApi.formerMembershipControllerList(),
			t("common.notifications.errors.notLoaded", { type: t("pages.formerMemberships.title") })
		);
		if (result) {
			formerMemberships.value = result.data;
		}
	};

	const reclaimFormerMembership = async (type: FormerMembershipType, refId: string) => {
		const { result, success } = await execute(
			() => formerMembershipApi.formerMembershipControllerReclaim(type, refId),
			t("pages.formerMemberships.reclaim.error")
		);

		if (success) {
			formerMemberships.value = formerMemberships.value.filter(
				(entry) => !(entry.type === type && entry.refId === refId)
			);
		}

		return result?.data.reclaimed ?? false;
	};

	const discardFormerMembership = async (type: FormerMembershipType, refId: string) => {
		const { success } = await execute(
			() => formerMembershipApi.formerMembershipControllerDiscard(type, refId),
			t("pages.formerMemberships.discard.error")
		);

		if (success) {
			formerMemberships.value = formerMemberships.value.filter(
				(entry) => !(entry.type === type && entry.refId === refId)
			);
		}

		return success;
	};

	return {
		formerMemberships,
		isLoading,
		isEmpty,
		fetchFormerMemberships,
		reclaimFormerMembership,
		discardFormerMembership,
	};
});
