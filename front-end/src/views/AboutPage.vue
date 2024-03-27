<template>
  <div class="page">
    <div class="item">
      <h1>{{ about.header.title }}</h1>
      <p>{{ about.header.description }}</p>
    </div>

    <div v-for="(item, index) in about.body" :key="index" class="item body">
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "vuex";

export default defineComponent({
  name: "AboutPage",
  components: {},
  setup() {
    const store = useStore();
    const about = computed(() => store.state.about);

    return {about};
  }
});
</script>

<style scoped>
h1, h2 {
  font-weight: bold;
  text-align: center;
  padding-bottom: 5px;
  margin: 0;
  color: #2a6496;
}

h1 {
  font-size: 200%;
}

h2 {
  font-size: 150%;
}

.page {
  background-color: #f5f5f5;
}

.item {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.item p {
  margin-top: 10px;
}

.body {
  display: inline-block;
  width: 45%;
}
</style>
