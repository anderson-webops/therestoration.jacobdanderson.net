<script lang="ts" setup>
const { modelValue } = defineModels<{
  modelValue: string
}>()
</script>

<template>
  <input
    id="input"
    v-model="modelValue"
    bg="transparent"
    border="~ rounded gray-200 dark:gray-700"
    outline="none active:none"
    p="x-4 y-2"
    text="center"
    type="text"
    v-bind="$attrs"
    w="250px"
  >
</template>
