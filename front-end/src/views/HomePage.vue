<template>
  <div class="page">
    <div class="item">
      <h1>{{ home.header.title }}</h1>
    </div>

    <nav class="featured-links">
      <router-link to="/map">Interactive Map</router-link>
      |
      <router-link to="/events">Key Events</router-link>
      |
      <router-link to="/figures">Key Figures</router-link>
    </nav>

    <div class="item">
      <h2>{{ home.testimony.title }}</h2>
      <p>{{ home.testimony.description }}</p>
    </div>

    <div v-for="(item, index) in home.body" :key="index" class="item">
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
      <img :src="item.image" :alt="item.imgAlt">
    </div>

    <div class="video-container">
      <video width="100%" height="240" controls>
        <source src="../../public/assets/video/presentation.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>
    <br>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "vuex";

export default defineComponent({
	name: "HomePage",
	components: {},
	setup() {
		const store = useStore();
		const home = computed(() => store.state.home);

		return {home};
	}
});
</script>

<style scoped>
.video-container {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

video {
  height: auto;
}

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
