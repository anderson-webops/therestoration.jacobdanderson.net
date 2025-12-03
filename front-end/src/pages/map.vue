<script lang="ts" setup>
import { computed } from "vue";
import MapComponent from "~/components/MapComponent.vue";

import { useMainStore } from "~/stores";

const store = useMainStore();
const map = computed(() => store.map);
</script>

<template>
	<div class="page">
		<div class="item">
			<h1>{{ map.header.title }}</h1>
			<p>{{ map.header.description }}</p>
		</div>
		<MapComponent :coordinates="map.body.coordinates" class="item" />
	</div>
</template>

<style scoped></style>

<route lang="yaml">
meta:
layout: default
</route>
