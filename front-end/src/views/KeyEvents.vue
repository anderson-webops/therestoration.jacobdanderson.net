<template>
  <div class="page">
    <div class="item">
      <h1>{{ events.header.title }}</h1>
    </div>

    <div v-for="(item, index) in events.body" :key="index" class="item">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent} from "vue";
import {useStore} from "vuex";

export default defineComponent({
  name: "KeyEvents",
  components: {},
  setup() {
    const store = useStore();
    const events = computed(() => store.state.events);

    return {events};
  }
});
</script>

<style scoped>
h1 {
  text-align: center;
  color: #2a6496;
  font-size: 2.5em;
}
</style>
