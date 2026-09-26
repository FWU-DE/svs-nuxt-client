<template>
	<section class="icon-card" :data-testid="testId">
		<div class="icon-card__content">
			<span v-if="icon" class="icon-card__icon" aria-hidden="true"><VIcon :icon="icon" size="44" /></span>
			<h2 class="icon-card__title">{{ title }}</h2>
			<div class="icon-card__body"><slot /></div>
		</div>
	</section>
</template>

<script setup lang="ts">
// The `icon-card` of the legacy help area (views/help/icon-card.hbs): dark icon tile on the
// top edge, centred title underlined across the card, then the content.
defineProps<{
	title: string;
	icon?: string;
	testId?: string;
}>();
</script>

<style lang="scss" scoped>
.icon-card {
	margin-top: 3rem;
	margin-bottom: 1rem;
}

.icon-card__content {
	position: relative;
	padding: 2rem 16px 16px;
}

.icon-card__icon {
	position: absolute;
	top: 0;
	left: 50%;
	transform: translate(-50%, -50%);
	display: inline-flex;
	padding: 12px;
	border-radius: 8px;
	background: #333;
	color: #fff;
	box-shadow:
		0 1px 3px rgba(0, 0, 0, 0.12),
		0 1px 2px rgba(0, 0, 0, 0.24);
}

.icon-card__title {
	position: relative;
	padding: 15px 5px 5px;
	margin-top: 2rem;
	margin-bottom: 0.75rem;
	text-align: center;
	font-size: 1.9rem;
	font-weight: 400;
	border-bottom: 1px solid #333;
}
</style>
