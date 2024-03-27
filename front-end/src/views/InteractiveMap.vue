<template>
  <div class="page">
    <div class="item">
      <h1>{{ map.header.title }}</h1>
      <p>{{ map.header.description }}</p>
    </div>
  </div>
  <MapComponent class="item"/>
</template>

<script lang="ts">
import {computed} from "vue";
import {useStore} from "vuex";

import MapComponent from "@/components/MapComponent.vue"; // Adjust the path based on your project structure

export default {
  name: "InteractiveMap",
  components: {
    MapComponent
  },
  setup() {
    const store = useStore();
    const map = computed(() => store.state.map);

    return {map};
  }
};
</script>

<style scoped>

</style>
