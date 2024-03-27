<template>
  <div class="page">
    <div class="item">
      <h1>{{ map.header.title }}</h1>
      <p>{{ map.header.description }}</p>
    </div>
    <MapComponent class="item" :coordinates="map.body.coordinates"/>
  </div>
</template>

<script lang="ts">
import {computed} from "vue";
import {useStore} from "vuex"; // or "pinia" if you've migrated
import MapComponent from "@/components/MapComponent.vue";

export default {
	name: "InteractiveMap",
	components: {
		MapComponent,
	},
	setup() {
		const store = useStore();
		const map = computed(() => store.state.map);

		return { map };
	},
};
</script>


<style scoped>

</style>
