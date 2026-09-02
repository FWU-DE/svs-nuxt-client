<template>
	<KebabMenuAction :icon="mdiCreation" :data-testid="testId">
		{{ t("components.board.ai.action") }}
	</KebabMenuAction>
</template>

<script setup lang="ts">
import KebabMenuAction from "./KebabMenuAction.vue";
import { mdiCreation } from "@icons/material";
import { useAttrs } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const attrs = useAttrs();
const testId = attrs["data-testid"] ?? "kebab-menu-action-ai-cards";
</script>
