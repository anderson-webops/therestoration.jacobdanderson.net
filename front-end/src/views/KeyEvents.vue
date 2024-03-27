<template>
  <div class="page">
    <div class="item">
      <h1>{{ events.header.title }}</h1>
    </div>

    <div v-for="(item, index) in events.body" :key="index" class="item">
      <h3>{{ item.name }}</h3>
      <img :src="item.image" :alt="item.imgAlt">
      <p>{{ item.description }}</p>
      <i>{{ item.quote }} - {{ item.quoteSource }}</i>
      <br>
      <br>

      <i v-for="(source, index) in item.sources" :key="index">
        {{ source }}
      </i>
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

</style>