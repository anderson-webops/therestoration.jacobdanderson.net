<script lang="ts" setup>
import { computed } from "vue";
import { useMainStore } from "~/stores"; // Ensure this points to your configured Pinia store
// const { t } = useI18n()

const store = useMainStore();
const home = computed(() => store.home);
</script>

<template>
	<div class="page">
		<div class="item">
			<h1>{{ home.header.title }}</h1>
		</div>

		<nav class="featured-links">
			<!--      <RouterLink icon-btn to="/map" :title="t('button.map')" data-test-id="map">Interactive Map</RouterLink> -->
			<RouterLink to="/map"> Interactive Map </RouterLink>
			|
			<RouterLink to="/events"> Key Events </RouterLink>
			|
			<RouterLink to="/figures"> Key Figures </RouterLink>
		</nav>

		<div class="item">
			<h2>{{ home.testimony.title }}</h2>
			<p>{{ home.testimony.description }}</p>
		</div>

		<div class="items-container">
			<div v-for="(item, index) in home.body" :key="index" class="item">
				<h3>{{ item.title }}</h3>
				<br />
				<h4>{{ item.description }}</h4>
				<br />
				<img :alt="item.imgAlt" :src="item.image" />
			</div>
		</div>
	</div>
</template>

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

<route lang="yaml">
meta:
layout: home
</route>

<!-- <script lang="ts" setup>
defineOptions({
  name: 'IndexPage',
})
const user = useUserStore()
const name = ref(user.savedName)

const router = useRouter()

function go() {
  if (name.value)
    router.push(`/hi/${encodeURIComponent(name.value)}`)
}

const {t} = useI18n()
</script>

<template>
  <div>
    <div text-4xl>
      <div i-carbon-campsite inline-block/>
    </div>
    <p>
      <a href="https://github.com/antfu/vitesse" rel="noreferrer" target="_blank">
        Vitesse
      </a>
    </p>
    <p>
      <em opacity-75 text-sm>{{ t("intro.desc") }}</em>
    </p>

    <div py-4/>

    <TheInput
      v-model="name"
      :placeholder="t('intro.whats-your-name')"
      autocomplete="false"
      @keydown.enter="go"
    />
    <label class="hidden" for="input">{{ t("intro.whats-your-name") }}</label>

    <div>
      <button
        :disabled="!name"
        btn m-3 text-sm
        @click="go"
      >
        {{ t("button.go") }}
      </button>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
layout: home
</route> -->
