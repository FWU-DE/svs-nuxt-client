<template>
	<VMenu v-if="!isOnboardingComplete" width="320">
		<template #activator="{ props: menuProps }">
			<VBadge
				:content="openSteps.length"
				:model-value="openSteps.length > 0"
				color="warning"
				offset-x="6"
				offset-y="6"
				class="mr-3"
			>
				<VBtn
					v-bind="menuProps"
					:icon="mdiLightbulbOnOutline"
					size="small"
					color="primary"
					variant="tonal"
					data-testid="onboarding-status-btn"
					:aria-label="`Deine ersten Schritte: ${openSteps.length} Bereiche offen`"
				/>
			</VBadge>
		</template>

		<VCard data-testid="onboarding-status-menu">
			<VCardItem>
				<VCardTitle class="d-flex align-center">
					<VIcon :icon="mdiLightbulbOnOutline" color="primary" class="mr-2" size="20" />
					Deine ersten Schritte
				</VCardTitle>
				<VCardSubtitle>{{ exploredCount }} von {{ wizardSteps.length }} Bereichen erkundet</VCardSubtitle>
			</VCardItem>

			<VProgressLinear
				:model-value="(exploredCount / wizardSteps.length) * 100"
				color="primary"
				height="6"
				class="mx-4"
				rounded
			/>

			<VList density="comfortable" nav>
				<VListItem
					v-for="s in wizardSteps"
					:key="s.index"
					:prepend-icon="s.icon"
					:data-testid="`onboarding-status-step-${s.index}`"
					:active="false"
					@click="open(s.index)"
				>
					<VListItemTitle>{{ s.label }}</VListItemTitle>
					<template #append>
						<VIcon
							v-if="exploredSteps.includes(s.index)"
							:icon="mdiCheckCircle"
							color="success"
							size="20"
							aria-label="erkundet"
						/>
						<VChip v-else size="x-small" color="warning" variant="tonal" label>offen</VChip>
					</template>
				</VListItem>
			</VList>

			<VCardActions>
				<VBtn
					block
					color="primary"
					variant="tonal"
					:append-icon="mdiArrowRight"
					data-testid="onboarding-status-resume"
					@click="open(firstOpenStep)"
				>
					{{ exploredCount === 0 ? "Erste Schritte starten" : "Erste Schritte fortsetzen" }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VMenu>
</template>

<script setup lang="ts">
import { useOnboardingWizard } from "@/composables/onboarding-wizard.composable";
import { mdiArrowRight, mdiCheckCircle, mdiLightbulbOnOutline } from "@icons/material";
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { wizardSteps, exploredSteps, openSteps, exploredCount, isOnboardingComplete, goToStep } = useOnboardingWizard();

const firstOpenStep = computed(() => openSteps.value[0]?.index ?? 0);

const open = (index: number) => {
	goToStep(index);
	router.push("/onboarding");
};
</script>
