<template>
	<div
		class="h-full flex flex-col text-gray-900 dark:text-gray-100 bg-neutral-100 dark:bg-neutral-900"
	>
		<FfdHeader moduleName="Users and Groups" centerName />
		<div v-if="gotInitialData" class="h-full overflow-y-auto">
			<router-view class="grow h-full" />
		</div>
	</div>
	<Notifications :notificationFIFO="notificationFIFO" ref="notifications" />
</template>

<script setup>
import FfdHeader from './components/FfdHeader.vue';
import { ref, provide, watch } from 'vue';
import shellObj from './hooks/shellObj';
import { useSpawn, errorString } from './hooks/useSpawn';
import Notifications from './components/Notifications.vue';
import FIFO from './classes/FIFO';
import { notificationsInjectionKey, darkModeInjectionKey, processingInjectionKey, shellsInjectionKey, groupsInjectionKey } from './keys';

const props = defineProps({notificationFIFO: FIFO});

const gotInitialData = ref(false);

const notifications = ref();
provide(notificationsInjectionKey, notifications);

const darkMode = ref(false);
provide(darkModeInjectionKey, darkMode);

const processing = ref(0);
provide(processingInjectionKey, processing);
watch(processing, () => console.log("processing:", processing.value));

const shells = ref([]);
const getShells = async () => {
	processing.value++;
	try {
		shells.value = (await cockpit.file("/etc/shells", { superuser: 'try' }).read())
			.split('\n')
			.filter(line => !/^\s*(?:#.*)?$/.test(line))
			.map(path => (shellObj(path)));
	} catch (error) {
		alert("Failed to get shells: " + error.message);
		processing.value--;
		return;
	}

	shells.value.push(shellObj("/bin/nologin"));

	shells.value.sort((a, b) => {
		if (a.name === b.name)
			return a.path.localeCompare(b.path);
		return a.name.localeCompare(b.name);
	});
	
	processing.value--;
}
provide(shellsInjectionKey, shells);

const groups = ref([]);
const getGroups = async () => {
	processing.value++;
	try {
		const groupDB = (await useSpawn(['getent', 'group'], { superuser: 'try' }).promise()).stdout;
		groups.value = groupDB
			.split('\n')
			.filter(record => !/^\s*$/.test(record)) // remove empty lines
			.map(record => (
				{
					group: record.split(':')[0], // group name is 1st field
					members: record.split(':')[3]?.split(',') // comma-delim list of members is 4th field
				}
			));
	} catch (state) {
		alert("Failed to get groups: " + errorString(state));
	}
	processing.value--;
}
provide(groupsInjectionKey, groups);

const init = async () => {
	await getShells();
	await getGroups();
	gotInitialData.value = true;
}

init();

</script>
