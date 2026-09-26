<template>
	<VCard variant="outlined" class="login-frame pa-5" data-testid="login-card">
		<VCard elevation="2" class="pa-5">
			<h1 class="login-title mb-5">Login für registrierte Nutzer:innen</h1>

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
				<label for="login-username" class="d-block font-weight-bold mb-2">E-Mail / Nutzername</label>
				<VTextField
					id="login-username"
					v-model="username"
					placeholder="E-Mail / Nutzername"
					autocomplete="username"
					variant="outlined"
					density="comfortable"
					hide-details
					:disabled="loading"
					required
					data-testid="login-username"
					class="mb-4"
				/>
				<label for="login-password" class="d-block font-weight-bold mb-2">Passwort</label>
				<VTextField
					id="login-password"
					v-model="password"
					placeholder="Passwort"
					:type="showPassword ? 'text' : 'password'"
					autocomplete="current-password"
					variant="outlined"
					density="comfortable"
					hide-details
					:append-inner-icon="showPassword ? mdiEyeOutline : mdiEyeOffOutline"
					:disabled="loading"
					required
					data-testid="login-password"
					class="mb-5"
					@click:append-inner="showPassword = !showPassword"
				/>

				<VBtn
					type="submit"
					color="primary"
					variant="flat"
					block
					size="large"
					:loading="loading"
					data-testid="login-submit"
				>
					Login
				</VBtn>
			</VForm>

			<div class="mt-6" data-testid="login-demo-accounts">
				<div class="font-weight-bold mb-2">Demo-Zugänge (Passwort: <code>Schulcloud1!</code>)</div>
				<div class="d-flex flex-wrap ga-2">
					<VBtn
						v-for="demo in demoAccounts"
						:key="demo.username"
						variant="outlined"
						:disabled="loading"
						:data-testid="`demo-${demo.role}`"
						@click="fillDemo(demo.username)"
					>
						{{ demo.role }}
					</VBtn>
				</div>
			</div>
		</VCard>
	</VCard>
</template>

<script setup lang="ts">
import { $axios } from "@/utils/api";
import { buildPageTitle } from "@/utils/pageTitle";
import { AuthenticationApiFactory } from "@api-server";
import { mdiEyeOffOutline, mdiEyeOutline } from "@icons/material";
import { useTitle } from "@vueuse/core";
import { ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

useTitle(buildPageTitle("Login"));

const authApi = AuthenticationApiFactory(undefined, "/v3", $axios);

const username = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref("");

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
// The legacy login sits in a bordered frame the width of the page container.
.login-frame {
	width: 1110px;
	max-width: calc(100vw - 30px);
	margin: 0 auto;
}

.login-title {
	font-size: 2rem;
	font-weight: 400;
	line-height: 1.2;
}
</style>
