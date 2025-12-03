<script lang="ts" setup>
import { computed } from "vue";
import { useMainStore } from "~/stores"; // Ensure this points to your configured Pinia store

const store = useMainStore();
const about = computed(() => store.about);
</script>

<template>
	<div class="page">
		<div class="item">
			<h1>{{ about.header.title }}</h1>
			<p>{{ about.header.description }}</p>
		</div>

		<div class="body-container">
			<div
				v-for="(item, index) in about.body"
				:key="index"
				class="item body"
			>
				<h3>{{ item.title }}</h3>
				<p>{{ item.description }}</p>
			</div>
		</div>
	</div>
</template>

<style scoped>
.page {
	background-color: #f5f5f5;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.body-container {
	display: flex;
	flex-wrap: wrap;
	justify-content: center; /* Centers the child elements */
	gap: 20px; /* Adjust the gap between the elements */
	width: 100%;
	max-width: 1200px; /* Adjust based on your preference */
}

.item {
	margin-bottom: 20px;
	padding: 20px;
	background-color: #fff;
	border: 1px solid #ccc;
	border-radius: 5px;
	box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.item p {
	margin-top: 10px;
}

.body {
	flex: 1 1 300px; /* Adjust the basis to control the minimum width */
	height: 100%; /* Ensures equal height */
}
</style>

<route lang="yaml">
meta:
layout: default
</route>
