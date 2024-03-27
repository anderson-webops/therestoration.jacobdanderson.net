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



    <div class="items-container">
      <div v-for="(item, index) in home.body" :key="index" class="item">
        <h3>{{ item.title }}</h3>
        <br>
        <h4>{{ item.description }}</h4>
        <br>
        <img :src="item.image" :alt="item.imgAlt">
      </div>
    </div>
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
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item:first-child {
  width: 100%;
}

.items-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around; /* This will help with spacing and centering the last item */
  gap: 20px; /* Adjust the gap between items */
  width: 100%;
  max-width: 1200px; /* Adjust based on your preference */
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-basis: calc(50% - 20px); /* Adjust basis and subtract gap */
  box-sizing: border-box;
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
  text-align: center;
}

@media (max-width: 768px) {
  .item {
    flex-basis: 100%;
  }
}

.video-container {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
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
