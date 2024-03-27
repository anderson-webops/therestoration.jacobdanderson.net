<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "~/store";

export default defineComponent({
  name: "HomePage",
  setup() {
    const store = useStore();
    const home = computed(() => store.home);

    return {home};
  },
});
</script>

<template>
  <div class="page">
    <div class="item">
      <h1>{{ home.header.title }}</h1>
    </div>

    <nav class="featured-links">
      <router-link to="/map">
        Interactive Map
      </router-link>
      |
      <router-link to="/events">
        Key Events
      </router-link>
      |
      <router-link to="/figures">
        Key Figures
      </router-link>
    </nav>

    <div class="item">
      <h2>{{ home.testimony.title }}</h2>
      <p>{{ home.testimony.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.featured-links {
  text-align: center;
  margin: 20px 0;
}

.featured-links a {
  padding: 10px;
  background-color: #e0e0e0;
  color: #333;
  text-decoration: none;
  border-radius: 5px;
}
</style>
