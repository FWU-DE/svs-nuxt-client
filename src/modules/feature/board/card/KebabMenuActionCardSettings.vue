<template>
	<KebabMenuAction :icon="mdiCogOutline" data-testid="card-menu-action-settings">
		{{ $t("components.boardCard.settings.title") }}
	</KebabMenuAction>
</template>

<script setup lang="ts">
import { mdiCogOutline } from "@icons/material";
import { KebabMenuAction } from "@ui-kebab-menu";
</script>
