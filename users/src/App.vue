<template>
	<div class="h-full flex flex-col text-gray-900 dark:text-gray-100 bg-neutral-100 dark:bg-neutral-900">
		<FfdHeader moduleName="Users and Groups" centerName />
		<div class="h-full overflow-y-auto">
			<router-view class="grow h-full" />
		</div>
	</div>
</template>

<script setup>
import FfdHeader from './components/FfdHeader.vue';
</script>
