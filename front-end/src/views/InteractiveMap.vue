<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "~/store";

import MapComponent from "@/components/MapComponent.vue";

export default defineComponent({
  name: "InteractiveMap",
  components: {
    MapComponent,
  },
  setup() {
    const store = useStore();
    const map = computed(() => store.map);

    return {map};
  },
});
</script>

<template>
  <div class="page">
    <div class="item">
      <h1>{{ map.header.title }}</h1>
      <p>{{ map.header.description }}</p>
    </div>
  </div>
  <MapComponent class="item"/>
</template>

<style scoped>

</style>
