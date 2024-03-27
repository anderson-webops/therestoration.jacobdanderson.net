<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from '~/store' // Ensure this points to your configured Pinia store

const mainStore = useStore()
const figures = computed(() => mainStore.figures)
</script>

<template>
  <div class="page">
    <div class="item">
      <h1>{{ figures.header.title }}</h1>
    </div>
    <div v-for="(item, index) in figures.body" :key="index" class="item">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>

<style scoped>

</style>
