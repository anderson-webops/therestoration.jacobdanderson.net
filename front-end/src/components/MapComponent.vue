<script setup>
import { onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const map = ref(null)

onMounted(() => {
  map.value = L.map('map').setView([40.2338, -111.6585], 13) // Use a default location, e.g., Provo, Utah

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map.value)

  // Example of adding a marker
  L.marker([40.2338, -111.6585]).addTo(map.value)
    .bindPopup('A significant event location')
    .openPopup()
})
</script>

<template>
  <div id="map" style="height: 400px;" />
</template>

<style scoped>

</style>
