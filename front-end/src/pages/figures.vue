<script lang="ts" setup>
import { computed } from "vue";
import { useMainStore } from "~/stores";

const store = useMainStore();
const figures = computed(() => store.figures);
</script>

<template>
	<div class="page">
		<div class="item">
			<h1>{{ figures.header.title }}</h1>
		</div>

		<div class="items-container">
			<div
				v-for="(item, index) in figures.body"
				:key="index"
				class="item"
			>
				<h3>{{ item.name }}</h3>
				<img :alt="item.imgAlt" :src="item.image" />
				<p>{{ item.description }}</p>
				<br />
				<i>{{ item.quote }} <br />- {{ item.quoteSource }}</i>
				<br /><br />
				<i v-for="(source, index2) in item.sources" :key="index2">{{
					source
				}}</i>
			</div>
		</div>
	</div>
</template>

<style scoped>
.page {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.item:first-child {
	width: 100%;
}

.items-container {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-around; /* This will help with spacing and centering the last item */
	gap: 20px; /* Adjust the gap between items */
	width: 100%;
	max-width: 1200px; /* Adjust based on your preference */
}

.item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex-basis: calc(50% - 20px); /* Adjust basis and subtract gap */
	box-sizing: border-box;
	margin-bottom: 20px;
	padding: 20px;
	background-color: #fff;
	border: 1px solid #ccc;
	border-radius: 5px;
	box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
	text-align: center;
}

@media (max-width: 768px) {
	.item {
		flex-basis: 100%;
	}
}
</style>

<route lang="yaml">
meta:
layout: default
</route>
