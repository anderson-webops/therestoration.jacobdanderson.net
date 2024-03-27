<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "~/store";

export default defineComponent({
  name: "KeyEvents",
  setup() {
    const mainStore = useStore();
    const events = computed(() => mainStore.events);

    return {events};
  },
});
</script>

<template>
  <div class="page">
    <div class="item">
      <h1>{{ events.header.title }}</h1>
    </div>

    <div v-for="(item, index) in events.body" :key="index" class="item">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>

<style scoped>
h1 {
  text-align: center;
  color: #2a6496;
  font-size: 2.5em;
}
</style>
