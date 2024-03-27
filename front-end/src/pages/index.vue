<script lang="ts" setup>
defineOptions({
  name: "IndexPage",
})
const user = useUserStore();
const name = ref(user.savedName);

const router = useRouter();

function go() {
  if (name.value)
    router.push(`/hi/${encodeURIComponent(name.value)}`);
}

const {t} = useI18n();
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
</route>
