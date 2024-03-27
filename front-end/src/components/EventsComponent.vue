<script setup>
import { useStore } from '~/store'

const eventsStore = useStore()
const events = computed(() => eventsStore.events)
</script>

<template>
  <div>
    <h2>Key Events</h2>
    <ul>
      <li v-for="event in events" :key="event.id">
        {{ event.name }} - {{ event.description }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
h2 {
  text-align: left;
  padding-left: 30px;
  font-size: 2.5em;
}
</style>
