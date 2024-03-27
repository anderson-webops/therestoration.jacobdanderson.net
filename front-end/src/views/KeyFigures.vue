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

</style>
