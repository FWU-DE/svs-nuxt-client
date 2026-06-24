<template>
	<VContainer class="login-container d-flex align-center justify-center">
		<VCard class="login-card pa-2" max-width="440" width="100%" data-testid="login-card">
			<VCardItem>
				<div class="d-flex justify-center mb-2">
					<VImg v-if="logo" :src="logo" max-width="220" :alt="instanceTitle" />
					<VIcon v-else :icon="mdiSchoolOutline" size="56" color="primary" />
				</div>
				<VCardTitle class="text-center text-wrap">{{ instanceTitle }}</VCardTitle>
				<VCardSubtitle class="text-center text-wrap">Bitte melden Sie sich an</VCardSubtitle>
			</VCardItem>

			<VCardText>
				<VAlert
					v-if="errorMessage"
					type="error"
					variant="tonal"
					class="mb-4"
					density="comfortable"
					data-testid="login-error"
				>
					{{ errorMessage }}
				</VAlert>

				<VForm @submit.prevent="onSubmit">
					<VTextField
						v-model="username"
						label="E-Mail-Adresse"
						type="email"
						autocomplete="username"
						variant="outlined"
						:prepend-inner-icon="mdiEmailOutline"
						:disabled="loading"
						required
						data-testid="login-username"
						class="mb-2"
					/>
					<VTextField
						v-model="password"
						label="Passwort"
						:type="showPassword ? 'text' : 'password'"
						autocomplete="current-password"
						variant="outlined"
						:prepend-inner-icon="mdiLockOutline"
						:append-inner-icon="showPassword ? mdiEyeOffOutline : mdiEyeOutline"
						:disabled="loading"
						required
						data-testid="login-password"
						@click:append-inner="showPassword = !showPassword"
					/>

					<VBtn
						type="submit"
						color="primary"
						block
						size="large"
						class="mt-2"
						:loading="loading"
						:disabled="!username || !password"
						data-testid="login-submit"
					>
						Anmelden
					</VBtn>
				</VForm>

				<VDivider class="my-5" />

				<div class="text-caption text-medium-emphasis">
					<div class="font-weight-bold mb-1">Demo-Zugänge (Passwort: <code>Schulcloud1!</code>)</div>
					<div class="d-flex flex-wrap ga-2">
						<VChip
							v-for="demo in demoAccounts"
							:key="demo.username"
							size="small"
							variant="outlined"
							:prepend-icon="mdiAccountOutline"
							:disabled="loading"
							:data-testid="`demo-${demo.role}`"
							@click="fillDemo(demo.username)"
						>
							{{ demo.role }}
						</VChip>
					</div>
				</div>
			</VCardText>
		</VCard>
	</VContainer>
</template>

<script setup lang="ts">
import { buildPageTitle } from "@/utils/pageTitle";
import { $axios } from "@/utils/api";
import { AuthenticationApiFactory } from "@api-server";
import { useEnvConfig } from "@data-env";
import { imgLogoMonoAssets } from "@/utils/image.utils";
import {
	mdiAccountOutline,
	mdiEmailOutline,
	mdiEyeOffOutline,
	mdiEyeOutline,
	mdiLockOutline,
	mdiSchoolOutline,
} from "@icons/material";
import { useTitle } from "@vueuse/core";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

useTitle(buildPageTitle("Anmelden"));

const authApi = AuthenticationApiFactory(undefined, "/v3", $axios);

const username = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref("");

const instanceTitle = computed(() => useEnvConfig().value.SC_TITLE || "Schulcloud");
const logo = computed(() => imgLogoMonoAssets[useEnvConfig().value.SC_THEME]?.logo);

const demoAccounts = [
	{ role: "Lehrkraft", username: "lehrer@schul-cloud.org" },
	{ role: "Schüler:in", username: "schueler@schul-cloud.org" },
	{ role: "Admin", username: "admin@schul-cloud.org" },
];

const fillDemo = (user: string) => {
	username.value = user;
	password.value = "Schulcloud1!";
};

/** JWT als Cookie setzen – wird beim folgenden Full-Reload von /api/v3/me genutzt. */
const setJwtCookie = (token: string) => {
	const maxAge = 2 * 60 * 60; // 2 Stunden
	document.cookie = `jwt=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
};

const onSubmit = async () => {
	errorMessage.value = "";
	loading.value = true;
	try {
		const { data } = await authApi.loginControllerLoginLocal({
			username: username.value.trim(),
			password: password.value,
		});

		setJwtCookie(data.accessToken);

		// Voll-Navigation, damit die App neu bootet und useAppStore().login() (/me) ausgeführt wird.
		const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "";
		globalThis.location.assign(safeRedirectPath(redirect));
	} catch (error: unknown) {
		errorMessage.value = "Anmeldung fehlgeschlagen. Bitte E-Mail-Adresse und Passwort prüfen.";
		loading.value = false;
	}
};

/**
 * Liefert einen sicheren internen Zielpfad (kein Open-Redirect):
 * akzeptiert relative Pfade und absolute URLs der gleichen Origin, sonst Fallback /dashboard.
 */
const safeRedirectPath = (target: string): string => {
	if (!target) return "/dashboard";
	if (target.startsWith("/") && !target.startsWith("//")) return target;
	try {
		const url = new URL(target, globalThis.location.origin);
		if (url.origin === globalThis.location.origin && url.pathname !== "/login") {
			return `${url.pathname}${url.search}`;
		}
	} catch {
		/* ungültige URL -> Fallback */
	}
	return "/dashboard";
};
</script>

<style lang="scss" scoped>
.login-container {
	min-height: 100vh;
}
.login-card {
	margin: auto;
}
</style>
