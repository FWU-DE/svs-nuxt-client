<template>
	<VContainer class="logout-container d-flex align-center justify-center">
		<VCard class="pa-4 text-center" max-width="420" width="100%" data-testid="logout-card">
			<VCardItem>
				<div class="d-flex justify-center mb-2">
					<VAvatar color="success" size="64"><VIcon :icon="mdiCheckCircleOutline" size="40" /></VAvatar>
				</div>
				<VCardTitle>Erfolgreich abgemeldet</VCardTitle>
				<VCardSubtitle class="text-wrap">
					Sie wurden sicher von {{ instanceTitle }} abgemeldet.
				</VCardSubtitle>
			</VCardItem>
			<VCardText>
				<VBtn color="primary" size="large" block :prepend-icon="mdiLogin" href="/login" data-testid="logout-to-login">
					Erneut anmelden
				</VBtn>
				<VBtn variant="text" class="mt-2" href="/" data-testid="logout-to-home">Zur Startseite</VBtn>
			</VCardText>
		</VCard>
	</VContainer>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { useEnvConfig } from "@data-env";
import { mdiCheckCircleOutline, mdiLogin } from "@icons/material";
import { useTitle } from "@vueuse/core";
import { computed, onMounted } from "vue";

useTitle(buildPageTitle("Abgemeldet"));

const instanceTitle = computed(() => useEnvConfig().value.SC_TITLE || "Schulcloud");

/** Session restlos beenden: jwt-Cookie entfernen und lokalen Speicher leeren. */
const clearSession = () => {
	document.cookie = "jwt=; Path=/; Max-Age=0; SameSite=Lax";
	try {
		localStorage.clear();
	} catch {
		/* ignore */
	}
};

onMounted(clearSession);
</script>

<style lang="scss" scoped>
.logout-container {
	min-height: 100vh;
}
</style>
