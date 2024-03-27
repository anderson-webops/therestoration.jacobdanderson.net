<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "~/store";

export default defineComponent({
  name: "KeyFigures",
  setup() {
    const mainStore = useStore();
    const figures = computed(() => mainStore.figures);

    return {figures};
  },
});
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
