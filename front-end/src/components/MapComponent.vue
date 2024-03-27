<template>
  <div id="map" ref="mapContainer" style="height: 400px;"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps({
	coordinates: Array,
});

const map = ref(null);
const mapContainer = ref(null);

onMounted(() => {
	// Initialize the map only when the DOM is fully ready
	map.value = L.map(mapContainer.value).setView([40.2338, -111.6585], 5);

	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
	}).addTo(map.value);

	// Dynamically add markers when coordinates prop changes
	watch(props.coordinates, (newCoordinates) => {
		newCoordinates.forEach((location) => {
			const marker = L.marker([location.latitude, location.longitude]).addTo(map.value);
			const popupContent = `
      <b>${location.name}</b><br>
      ${location.events.join(", ")}<br>
      ${location.figures.join(", ")}<br>
      <img src="${location.imageUrl}" alt="${location.name}" style="width:100%;max-width:300px;">
    `;
			marker.bindPopup(popupContent);
		});
	}, { immediate: true });

});

onBeforeUnmount(() => {
	if (map.value) {
		map.value.remove(); // Ensure map instance is cleaned up
	}
});
</script>

<style scoped>
/* Your styles here (if any) */
</style>
