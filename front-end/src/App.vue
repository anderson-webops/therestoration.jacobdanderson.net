<script lang="ts" setup>
// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg
const siteUrl = "https://therestoration.jacobdanderson.net";
const siteDescription =
	"The Restoration is a public project site with essays, resources, and context about its core ideas, sources, and public-facing work.";
const route = useRoute();
const robotsContent = computed(() =>
	/^\/api(?:\/|$)/.test(route.path)
		? "noindex,nofollow"
		: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
);
const canonicalUrl = computed(() =>
	new URL(route.path || "/", `${siteUrl}/`).toString()
);
const structuredData = computed(() => [
	{
		"@context": "https://schema.org",
		"@type": "Organization",
		description: siteDescription,
		name: "The Restoration",
		url: siteUrl
	},
	{
		"@context": "https://schema.org",
		"@type": "WebSite",
		description: siteDescription,
		name: "The Restoration",
		url: siteUrl
	}
]);

useHead(
	() =>
		({
			title: "The Restoration",
			meta: [
				{
					name: "description",
					content: siteDescription
				},
				{
					property: "og:title",
					content: "The Restoration"
				},
				{
					property: "og:description",
					content: siteDescription
				},
				{
					property: "og:type",
					content: "website"
				},
				{
					property: "og:url",
					content: canonicalUrl.value
				},
				{
					name: "twitter:card",
					content: "summary"
				},
				{
					name: "twitter:title",
					content: "The Restoration"
				},
				{
					name: "twitter:description",
					content: siteDescription
				},
				{
					name: "robots",
					content: robotsContent.value
				},
				{
					name: "theme-color",
					content: isDark.value ? "#00aba9" : "#ffffff"
				}
			],
			link: [
				{
					rel: "icon",
					type: "image/svg+xml",
					href: preferredDark.value
						? "/favicon-dark.svg"
						: "/favicon.svg"
				},
				{
					rel: "canonical",
					href: canonicalUrl.value
				}
			],
			script: [
				...(import.meta.env.PROD
					? [
							{
								defer: true,
								src: "https://analytics.jacobdanderson.net/script.js",
								"data-website-id":
									"0c8d7bfe-1d94-4d8e-833e-abb2b4ef1e58"
							}
						]
					: []),
				...structuredData.value.map((entry, index) => ({
					innerHTML: JSON.stringify(entry),
					key: `ld-json-${index}`,
					type: "application/ld+json"
				}))
			]
		}) as any
);
</script>

<template>
	<RouterView />
</template>
