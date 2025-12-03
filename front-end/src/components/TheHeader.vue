<script lang="ts" setup>
import { ref } from "vue";

const isExpanded = ref(false);
const activeLink = ref("Home");

const links = ref([
	{ name: "Home", path: "/" },
	{ name: "Map", path: "/map" },
	{ name: "Events", path: "/events" },
	{ name: "Figures", path: "/figures" },
	{ name: "About", path: "/about" },
	{ name: "Contact", path: "/contact" }
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
		<nav class="flex-container">
			<div class="logo-container">
				<RouterLink to="/">
					<img
						alt=""
						class="logo"
						src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Mormon-book.jpg/440px-Mormon-book.jpg"
					/>
				</RouterLink>
				<span class="site-name">The Restoration</span>
			</div>
			<div class="hamburger" @click="toggleMenu">
				<div :class="{ open: isExpanded }" class="bar" />
				<div :class="{ open: isExpanded }" class="bar" />
				<div :class="{ open: isExpanded }" class="bar" />
			</div>
			<ul :class="{ expanded: isExpanded }" class="nav-links">
				<li
					v-for="link in links"
					:key="link.path"
					:class="{ active: activeLink === link.name }"
					@click="setActiveLink(link.name)"
				>
					<RouterLink :to="link.path" class="nav-link">
						{{ link.name }}
					</RouterLink>
				</li>
			</ul>
		</nav>
	</header>
</template>

<style scoped>
.flex-container {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 20px;
	background-color: #fff;
	border-bottom: 1px solid #ccc;
	position: relative;
}

.logo-container {
	display: flex;
	align-items: center;
}

.logo {
	width: 50px;
	height: auto;
	margin-right: 10px;
}

.site-name {
	font-size: 1.5em;
	font-weight: bold;
	color: #333;
}

.nav-links {
	display: flex;
	gap: 30px;
	list-style: none;
	margin: 10px;
	padding: 0;
}

.nav-link {
	text-decoration: none;
	color: #333;
	font-size: 1em;
	padding: 0 10px;
}

.nav-link:hover {
	color: #007bff;
}

.hamburger {
	display: none;
	flex-direction: column;
	cursor: pointer;
}

.bar {
	width: 25px;
	height: 3px;
	background-color: #333;
	margin: 4px 0;
	transition: 0.4s;
}

.bar.open:nth-child(1) {
	transform: rotate(-45deg) translate(-5px, 6px);
}

.bar.open:nth-child(2) {
	opacity: 0;
}

.bar.open:nth-child(3) {
	transform: rotate(45deg) translate(-5px, -6px);
}

@media (max-width: 768px) {
	.hamburger {
		display: flex;
	}

	.nav-links {
		display: none;
		flex-direction: column;
		width: 100%;
		background-color: #fff;
		position: absolute;
		top: 60px;
		left: 0;
		padding: 20px;
		border-top: 1px solid #ccc;
		border-bottom: 1px solid #ccc;
	}

	.nav-links.expanded {
		display: flex;
	}

	.nav-links li {
		margin: 10px 0;
		text-align: center;
	}
}
</style>
