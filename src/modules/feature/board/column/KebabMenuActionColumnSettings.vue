<template>
	<KebabMenuAction :icon="mdiCogOutline" data-testid="column-menu-action-settings">
		{{ $t("components.boardColumn.settings.title") }}
	</KebabMenuAction>
</template>

<script setup lang="ts">
import { mdiCogOutline } from "@icons/material";
import { KebabMenuAction } from "@ui-kebab-menu";
</script>
