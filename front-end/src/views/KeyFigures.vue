<template>
  <div class="page">
    <div class="item">
      <h1>{{ figures.header.title }}</h1>
    </div>

    <div class="items-container">
      <div v-for="(item, index) in figures.body" :key="index" class="item">
        <h3>{{ item.name }}</h3>
        <img :src="item.image" :alt="item.imgAlt">
        <p>{{ item.description }}</p>
        <br>
        <i>{{ item.quote }} <br>- {{ item.quoteSource }}</i>
        <br><br>
        <i v-for="(source, index) in item.sources" :key="index">{{ source }}</i>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "vuex";

export default defineComponent({
	name: "KeyFigures",
	components: {},
	setup() {
		const store = useStore();
		const figures = computed(() => store.state.figures);

		return {figures};
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
</style>
