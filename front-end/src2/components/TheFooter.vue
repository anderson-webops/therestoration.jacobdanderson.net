<script lang="ts" setup>
import {availableLocales, loadLanguageAsync} from "~/modules/i18n";

const {t, locale} = useI18n();

async function toggleLocales() {
  // change to some real logic
  const locales = availableLocales;
  const newLocale = locales[(locales.indexOf(locale.value) + 1) % locales.length];
  await loadLanguageAsync(newLocale);
  locale.value = newLocale;
}
</script>

<template>
  <nav flex="~ gap-4" justify-center mt-6 text-xl>
    <RouterLink :title="t('button.home')" icon-btn to="/">
      <div i-carbon-campsite/>
    </RouterLink>

    <button :title="t('button.toggle_dark')" icon-btn @click="toggleDark()">
      <div i="carbon-sun dark:carbon-moon"/>
    </button>

    <a :title="t('button.toggle_langs')" icon-btn @click="toggleLocales()">
      <div i-carbon-language/>
    </a>

    <RouterLink :title="t('button.about')" data-test-id="about" icon-btn to="/about">
      <div i-carbon-dicom-overlay/>
    </RouterLink>

    <a href="https://github.com/antfu/vitesse" icon-btn rel="noreferrer" target="_blank" title="GitHub">
      <div i-carbon-logo-github/>
    </a>
  </nav>
</template>
