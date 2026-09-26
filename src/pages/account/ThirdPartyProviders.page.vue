<template>
	<DefaultWireframe max-width="full" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="third-party-providers-title">{{ t("pages.accountThirdPartyProviders.title") }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<p v-if="sessions.length === 0" class="empty-text text-center" data-testid="third-party-providers-empty">
				{{ t("pages.accountThirdPartyProviders.empty") }}
			</p>

			<VTable v-else data-testid="third-party-providers-list">
				<thead>
					<tr>
						<th>{{ t("pages.accountThirdPartyProviders.provider") }}</th>
						<th />
					</tr>
				</thead>
				<tbody>
					<tr v-for="session in sessions" :key="session.client_id">
						<td>{{ session.client_name }}</td>
						<td class="text-right">
							<VBtn
								variant="outlined"
								color="error"
								:data-testid="`third-party-provider-revoke-${session.client_id}`"
								@click="revokeSession(session.client_id)"
							>
								{{ t("common.actions.remove") }}
							</VBtn>
						</td>
					</tr>
				</tbody>
			</VTable>

			<VBtn class="mt-4" variant="outlined" to="/account" data-testid="third-party-providers-back">
				{{ t("pages.accountThirdPartyProviders.back") }}
			</VBtn>
		</SvsLoading>
	</DefaultWireframe>
</template>

<script setup lang="ts">
import { useSafeAxiosRunner } from "@/composables/async-tasks.composable";
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { ConsentSessionResponse, Oauth2ApiFactory } from "@api-server";
import { notifyError, notifySuccess } from "@data-app";
import { SvsLoading } from "@ui-containers";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const oauth2Api = Oauth2ApiFactory(undefined, "/v3", $axios);

useTitle(buildPageTitle(t("pages.accountThirdPartyProviders.title")));

const { data, loadingState, execute } = useSafeAxiosRunner(() =>
	oauth2Api.oauthProviderControllerListConsentSessions()
);
const sessions = computed(() => data.value?.data ?? []);

const revokeSession = async (clientId: ConsentSessionResponse["client_id"]) => {
	try {
		await oauth2Api.oauthProviderControllerRevokeConsentSession(clientId);
		notifySuccess(t("pages.accountThirdPartyProviders.revoked"));
		await execute();
	} catch {
		notifyError(t("pages.accountThirdPartyProviders.revokeError"));
	}
};
</script>

<style lang="scss" scoped>
// Legacy shows the empty state as a large muted line instead of an alert.
.empty-text {
	font-size: 1.5rem;
	opacity: 0.75;
}
</style>
