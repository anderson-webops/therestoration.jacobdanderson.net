<script>
import {useStore} from "vuex";

export default {
  name: "EventsComponent",
  computed: {
    events() {
      const store = useStore();
      return store.getters.events;
    },
  },
};
</script>

<template>
  <div>
    <h2>Key Events</h2>
    <ul>
      <li v-for="event in events" :key="event.id">
        {{ event.name }} - {{ event.description }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
h2 {
  text-align: left;
  padding-left: 30px;
  font-size: 2.5em;
}
</style>
