<script lang="ts" setup>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
</script>

<template>
	<footer>
		<h2>Contact</h2>
		<nav>
			<ul>
				<li>
					<a
						href="https://www.facebook.com/jacoba1100254352"
						target="_blank"
					>
						<FontAwesomeIcon
							:icon="['fab', 'facebook']"
							size="2x"
						/>
					</a>
				</li>
				<li>
					<a
						href="https://www.github.com/Jacoba1100254352"
						target="_blank"
					>
						<FontAwesomeIcon :icon="['fab', 'github']" size="2x" />
					</a>
				</li>
				<li>
					<a
						href="https://www.instagram.com/jacoba1100254352"
						target="_blank"
					>
						<FontAwesomeIcon
							:icon="['fab', 'instagram']"
							size="2x"
						/>
					</a>
				</li>
			</ul>
		</nav>
	</footer>
</template>

<style scoped>
footer {
	margin-bottom: 20px;
	padding: 20px;
	background-color: #fff;
	border: 1px solid #ccc;
	border-radius: 5px;
	box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
}

footer ul {
	display: flex;
	justify-content: space-around;
	list-style: none;
	padding: 20px 0 0;
}

a {
	text-decoration: none;
	color: black;
}
</style>

<!-- <script lang="ts" setup>
import { availableLocales, loadLanguageAsync } from '~/modules/i18n'

const { t, locale } = useI18n()

async function toggleLocales() {
  // change to some real logic
  const locales = availableLocales
  const newLocale = locales[(locales.indexOf(locale.value) + 1) % locales.length]
  await loadLanguageAsync(newLocale)
  locale.value = newLocale
}
</script>

<template>
  <nav flex="~ gap-4" mt-6 justify-center text-xl>
    <RouterLink :title="t('button.home')" icon-btn to="/">
      <div i-carbon-campsite />
    </RouterLink>

    <button :title="t('button.toggle_dark')" icon-btn @click="toggleDark()">
      <div i="carbon-sun dark:carbon-moon" />
    </button>

    <a :title="t('button.toggle_langs')" icon-btn @click="toggleLocales()">
      <div i-carbon-language />
    </a>

    <RouterLink :title="t('button.about')" data-test-id="about" icon-btn to="/about">
      <div i-carbon-dicom-overlay />
    </RouterLink>

    <a href="https://github.com/antfu/vitesse" icon-btn rel="noreferrer" target="_blank" title="GitHub">
      <div i-carbon-logo-github />
    </a>
  </nav>
</template> -->
