<template>
	<DefaultWireframe max-width="limited" main-with-bottom-padding>
		<template #header>
			<h1 data-testid="third-party-providers-title">{{ t("pages.accountThirdPartyProviders.title") }}</h1>
		</template>

		<SvsLoading :loading-state="loadingState">
			<VAlert v-if="sessions.length === 0" type="info" variant="tonal" data-testid="third-party-providers-empty">
				{{ t("pages.accountThirdPartyProviders.empty") }}
			</VAlert>

			<VList v-else lines="two" data-testid="third-party-providers-list">
				<VListItem
					v-for="session in sessions"
					:key="session.client_id"
					:title="session.client_name"
					:subtitle="session.client_id"
				>
					<template #prepend>
						<VIcon :icon="mdiApplicationBracketsOutline" />
					</template>
					<template #append>
						<VBtn
							variant="text"
							color="error"
							:prepend-icon="mdiDeleteOutline"
							:data-testid="`third-party-provider-revoke-${session.client_id}`"
							@click="revokeSession(session.client_id)"
						>
							{{ t("common.actions.remove") }}
						</VBtn>
					</template>
				</VListItem>
			</VList>

			<VBtn class="mt-6" variant="outlined" to="/account" data-testid="third-party-providers-back">
				{{ t("common.labels.backToOverview") }}
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
import { mdiApplicationBracketsOutline, mdiDeleteOutline } from "@icons/material";
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
