<template>
	<VContainer class="home-hero d-flex align-center justify-center">
		<div class="text-center" style="max-width: 640px">
			<VImg v-if="logo" :src="logo" max-width="280" class="mx-auto mb-6" :alt="instanceTitle" />
			<VIcon v-else :icon="mdiSchoolOutline" size="72" color="primary" class="mb-4" />

			<h1 class="text-h3 font-weight-bold mb-3">{{ instanceTitle }}</h1>
			<p class="text-h6 font-weight-regular text-medium-emphasis mb-8">
				Die sichere Lern- und Arbeitsplattform für Ihre Schule – Kurse, Aufgaben, Zusammenarbeit und mehr an einem Ort.
			</p>

			<div class="d-flex flex-wrap justify-center ga-3 mb-10">
				<VBtn color="primary" size="x-large" :prepend-icon="mdiLogin" href="/login" data-testid="home-login">
					Anmelden
				</VBtn>
				<VBtn
					variant="tonal"
					size="x-large"
					:prepend-icon="mdiLightbulbOnOutline"
					href="/onboarding"
					data-testid="home-onboarding"
				>
					Onboarding-Assistent
				</VBtn>
			</div>

			<VRow class="text-start">
				<VCol v-for="f in highlights" :key="f.title" cols="12" sm="4">
					<div class="d-flex flex-column align-center text-center">
						<VAvatar color="surface-variant" size="48" class="mb-2"><VIcon :icon="f.icon" /></VAvatar>
						<div class="font-weight-bold">{{ f.title }}</div>
						<div class="text-body-2 text-medium-emphasis">{{ f.text }}</div>
					</div>
				</VCol>
			</VRow>
		</div>
	</VContainer>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { imgCloudLogoAssets } from "@/utils/image.utils";
import { useAppStoreRefs } from "@data-app";
import { useEnvConfig } from "@data-env";
import {
	mdiAccountGroupOutline,
	mdiLightbulbOnOutline,
	mdiLogin,
	mdiPlaylistCheck,
	mdiSchoolOutline,
	mdiViewDashboardOutline,
} from "@icons/material";
import { useTitle } from "@vueuse/core";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { isLoggedIn } = useAppStoreRefs();

useTitle(buildPageTitle("Willkommen"));

const instanceTitle = computed(() => useEnvConfig().value.SC_TITLE || "Schulcloud");
const logo = computed(() => imgCloudLogoAssets[useEnvConfig().value.SC_THEME]?.logo);

const highlights = [
	{ icon: mdiViewDashboardOutline, title: "Kurse & Räume", text: "Unterricht digital organisieren." },
	{ icon: mdiPlaylistCheck, title: "Aufgaben", text: "Verteilen, einsammeln, Feedback geben." },
	{ icon: mdiAccountGroupOutline, title: "Zusammenarbeit", text: "Gemeinsam an Inhalten arbeiten." },
];

// Angemeldete Nutzer:innen direkt aufs Dashboard leiten.
onMounted(() => {
	if (isLoggedIn.value) {
		router.replace("/dashboard");
	}
});
</script>

<style lang="scss" scoped>
.home-hero {
	min-height: 100vh;
}
</style>
