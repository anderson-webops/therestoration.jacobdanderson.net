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
			<p v-for="(paragraph, index) in about.body" :key="index">{{ paragraph }}</p>
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
</style>

<route lang="yaml">
meta:
layout: default
</route>
