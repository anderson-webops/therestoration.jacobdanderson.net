<script lang="ts" setup>
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

defineOptions({ ssr: false });

const props = defineProps({
	coordinates: {
		type: Array as () => Location[],
		default: () => []
	}
});

interface Location {
	latitude: number;
	longitude: number;
	name: string;
	events: string[];
	figures: string[];
	imageUrl: string;
}

const map = ref<any>(null);
const mapContainer = ref<HTMLElement | null>(null);

onMounted(async () => {
	// Import Leaflet only on client
	const L = await import("leaflet");
	await import("leaflet/dist/leaflet.css");

	// Ensure marker icons resolve correctly in production builds
	L.Icon.Default.mergeOptions({
		iconRetinaUrl: markerIcon2x,
		iconUrl: markerIcon,
		shadowUrl: markerShadow
	});

	await nextTick();

	if (!mapContainer.value) return;

	map.value = L.map(mapContainer.value).setView([40.2338, -111.6585], 5);

	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		attribution:
			'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map.value);

	// Watch markers
	watch(
		() => props.coordinates,
		(newCoordinates: Location[]) => {
			newCoordinates.forEach((location: Location) => {
				const marker = L.marker([
					location.latitude,
					location.longitude
				]).addTo(map.value);

				const popupContent = `
                    <b>${location.name}</b><br>
                    ${location.events.join(", ")}<br>
                    ${location.figures.join(", ")}<br>
                    <img src="${location.imageUrl}" alt="${location.name}" style="width:100%;max-width:300px;">
                `;
				marker.bindPopup(popupContent);
			});
		},
		{ immediate: true }
	);
});

onBeforeUnmount(() => {
	if (map.value && map.value.remove) {
		map.value.remove();
	}
});
</script>

<template>
	<div id="map" ref="mapContainer"></div>
</template>

<style scoped>
#map {
	height: 54vh;
	width: 100%;
}
</style>
