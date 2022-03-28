<template>
	<div
		class="h-full flex flex-col text-gray-900 dark:text-gray-100 bg-neutral-100 dark:bg-neutral-900"
	>
		<FfdHeader moduleName="Users and Groups" centerName />
		<div class="h-full overflow-y-auto">
			<router-view class="grow h-full" />
		</div>
	</div>
</template>

<script setup>
import FfdHeader from './components/FfdHeader.vue';
import { ref, provide } from 'vue';
import shellObj from './hooks/shellObj';
import useSpawn from './hooks/useSpawn';

const processing = ref(false);
provide('processing', processing);

const shells = ref([]);
const getShells = async () => {
	processing.value = true;
	try {
		shells.value = (await cockpit.file("/etc/shells", { superuser: 'try' }).read())
			.split('\n')
			.filter(line => !/^\s*(?:#.*)?$/.test(line))
			.map(path => (shellObj(path)));
	} catch (error) {
		alert("Failed to get shells: " + error.message);
		return;
	}

	shells.value.push(
		shellObj("/usr/bin/nologin"),
		shellObj("/bin/nologin"),
	);

	shells.value.sort((a, b) => {
		if (a.name === b.name)
			return a.path.localeCompare(b.path);
		return a.name.localeCompare(b.name);
	});
	processing.value = false;
}
provide('shells', shells);

const groups = ref([]);
const getGroups = async () => {
	processing.value = true;
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
		alert("Failed to get groups: " + state?.stderr ?? state?.message ?? state);
		return;
	}
	processing.value = false;
}
provide('groups', groups);

const init = async () => {
	await getShells();
	await getGroups();
}

init();

</script>
