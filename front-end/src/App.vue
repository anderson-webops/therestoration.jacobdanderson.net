<script lang="ts" setup>
import { getPageMetadata, siteDescription, siteUrl } from "./site";

const route = useRoute();
const metadata = computed(() => getPageMetadata(route.path));

useHead(() => ({
	title: metadata.value.title,
	htmlAttrs: { lang: "en" },
	meta: [
		{ name: "description", content: metadata.value.description },
		{ property: "og:title", content: metadata.value.title },
		{ property: "og:description", content: metadata.value.description },
		{ property: "og:type", content: "website" },
		...(metadata.value.canonical ? [{ property: "og:url", content: metadata.value.canonical }] : []),
		{ name: "twitter:card", content: "summary" },
		{ name: "twitter:title", content: metadata.value.title },
		{ name: "twitter:description", content: metadata.value.description },
		{ name: "robots", content: metadata.value.robots }
	],
	link: metadata.value.canonical ? [{ rel: "canonical", href: metadata.value.canonical }] : [],
	script: [
		...(import.meta.env.PROD
			? [
					{
						key: "site-analytics",
						defer: true,
						src: "https://analytics.jacobdanderson.net/script.js",
						"data-website-id": "0c8d7bfe-1d94-4d8e-833e-abb2b4ef1e58"
					}
				]
			: []),
		{
			key: "website-schema",
			type: "application/ld+json",
			innerHTML: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "WebSite",
				name: "The Restoration",
				description: siteDescription,
				url: siteUrl
			})
		}
	]
}));
</script>

<template>
	<RouterView />
</template>
