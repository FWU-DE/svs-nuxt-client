<template>
	<VExpansionPanels variant="accordion" data-testid="nostr-relay-panel">
		<VExpansionPanel>
			<VExpansionPanelTitle>
				<div class="d-flex align-center ga-2 flex-wrap">
					<VIcon :icon="mdiTune" size="small" />
					<span>{{ t("pages.nostrSearch.relays.title") }}</span>
					<span class="text-medium-emphasis text-body-2">
						{{ t("pages.nostrSearch.relays.summary", { active: activeCount, total: relays.length }) }}
					</span>
				</div>
			</VExpansionPanelTitle>

			<VExpansionPanelText>
				<p class="text-body-2 text-medium-emphasis">{{ t("pages.nostrSearch.relays.description") }}</p>

				<VList density="compact" data-testid="nostr-relay-list">
					<VListItem v-for="relay in relays" :key="relay.url" data-testid="nostr-relay-item">
						<template #prepend>
							<VSwitch
								:model-value="relay.enabled"
								color="primary"
								density="compact"
								hide-details
								class="mr-3"
								:aria-label="t('pages.nostrSearch.relays.toggle', { relay: relay.url })"
								@update:model-value="toggleRelay(relay.url, $event === true)"
							/>
						</template>

						<VListItemTitle>{{ relay.url }}</VListItemTitle>
						<VListItemSubtitle v-if="stateFor(relay.url)" data-testid="nostr-relay-state">
							{{ stateLabel(stateFor(relay.url)!) }}
						</VListItemSubtitle>

						<template #append>
							<VBtn
								variant="text"
								size="small"
								:icon="mdiClose"
								:aria-label="t('pages.nostrSearch.relays.remove', { relay: relay.url })"
								data-testid="nostr-relay-remove"
								@click="removeRelay(relay.url)"
							/>
						</template>
					</VListItem>
				</VList>

				<div class="d-flex align-start ga-2 flex-wrap mt-2">
					<VTextField
						v-model="newRelay"
						:label="t('pages.nostrSearch.relays.addLabel')"
						:error-messages="addError ? t('pages.nostrSearch.relays.invalid') : undefined"
						placeholder="wss://relay.example.org"
						density="compact"
						variant="outlined"
						class="flex-grow-1"
						data-testid="nostr-relay-input"
						@keyup.enter="submitRelay"
					/>
					<VBtn variant="outlined" data-testid="nostr-relay-add" @click="submitRelay">
						{{ t("pages.nostrSearch.relays.add") }}
					</VBtn>
					<VBtn variant="text" data-testid="nostr-relay-reset" @click="resetRelays">
						{{ t("pages.nostrSearch.relays.reset") }}
					</VBtn>
				</div>
			</VExpansionPanelText>
		</VExpansionPanel>
	</VExpansionPanels>
</template>

<script setup lang="ts">
import { useNostrRelaySettings } from "./relays";
import { NostrRelayState } from "./types";
import { mdiClose, mdiTune } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ relayStates: NostrRelayState[] }>();

const { t } = useI18n();
const { relays, toggleRelay, addRelay, removeRelay, resetRelays } = useNostrRelaySettings();

const newRelay = ref("");
const addError = ref(false);

const activeCount = computed(() => relays.value.filter((relay) => relay.enabled).length);

const stateFor = (url: string): NostrRelayState | undefined => props.relayStates.find((state) => state.url === url);

const stateLabel = (state: NostrRelayState): string => {
	if (state.phase === "searching") return t("pages.nostrSearch.relay.state.searching");
	if (state.phase === "failed") return t(state.errorKey ?? "pages.nostrSearch.relay.error.unreachable");
	if (state.phase === "no-search-support") return t("pages.nostrSearch.relay.state.noSearchSupport");

	return t("pages.nostrSearch.relay.state.matches", { count: state.matches });
};

const submitRelay = () => {
	addError.value = !addRelay(newRelay.value);
	if (!addError.value) newRelay.value = "";
};
</script>
