<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from '~/store'

import MapComponent from '@/components/MapComponent.vue'

const store = useStore()
const map = computed(() => store.map)
</script>

<template>
  <div class="page">
    <div class="item">
      <h1>{{ map.header.title }}</h1>
      <p>{{ map.header.description }}</p>
    </div>
    <MapComponent class="item" />
  </div>
</template>

<style scoped>

</style>
