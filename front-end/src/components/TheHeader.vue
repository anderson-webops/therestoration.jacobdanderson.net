<script lang="ts" setup>
import { ref } from "vue";

const isExpanded = ref(false);
const activeLink = ref("Home");

const links = ref([
	{ name: "Map", path: "/map" },
	{ name: "Events", path: "/events" },
	{ name: "Figures", path: "/figures" },
	{ name: "About", path: "/about" },
	{ name: "Contact", path: "/contact" },
]);

function toggleMenu() {
	isExpanded.value = !isExpanded.value;
}

function setActiveLink(linkName: string) {
	activeLink.value = linkName;
	isExpanded.value = false; // Optionally close the menu upon selection
}
</script>

<template>
	<header>
		<nav class="local">
			<ul class="flexbox_container">
				<li :class="{ expanded: isExpanded }" @click="toggleMenu">
					<router-link class="nav-link" to="/" @click.prevent="setActiveLink('HomePage')">
						Home
					</router-link>
				</li>
				<li
					v-for="link in links" :key="link.path"
					:class="{ expanded: isExpanded, active: activeLink === link.name }" @click="toggleMenu"
				>
					<router-link :to="link.path" class="nav-link" @click.prevent="setActiveLink(link.name)">
						{{ link.name }}
					</router-link>
				</li>
			</ul>
		</nav>
	</header>
</template>

<style scoped>

</style>
