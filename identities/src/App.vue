<template>
	<div class="h-full flex flex-col text-default bg-well">
		<FfdHeader
			moduleName="Identities"
			centerName
			:showSpinner="processing"
			:infoNudgeScrollbar="infoNudgeScrollbar"
			sourceURL="https://github.com/45Drives/cockpit-identities"
			issuesURL="https://github.com/45Drives/cockpit-identities/issues"
		/>
		<div class="grow overflow-y-auto">
			<router-view class="h-full" @refreshGroups="getGroups" />
		</div>
	</div>
	<Notifications :notificationFIFO="notificationFIFO" ref="notifications" />
</template>

<script setup>
import FfdHeader from './components/FfdHeader.vue';
import { ref, provide } from 'vue';
import shellObj from './hooks/shellObj';
import { useSpawn, errorString, FIFO } from '@45drives/cockpit-helpers';
import Notifications from './components/Notifications.vue';
import { notificationsInjectionKey, darkModeInjectionKey, shellsInjectionKey, groupsInjectionKey, infoNudgeScrollbarInjectionKey } from './keys';
import { useRoute } from 'vue-router';

const props = defineProps({ notificationFIFO: FIFO });

const notifications = ref();
provide(notificationsInjectionKey, notifications);

const darkMode = ref(false);
provide(darkModeInjectionKey, darkMode);

const infoNudgeScrollbar = ref(false);
provide(infoNudgeScrollbarInjectionKey, infoNudgeScrollbar);

const processing = ref(0);

const shells = ref([]);
const getShells = async () => {
	processing.value++;
	try {
		try {
			shells.value = (await cockpit.file("/etc/shells", { superuser: 'try' }).read())
				.split('\n')
				.filter(line => !/^\s*(?:#.*)?$/.test(line))
				.map(path => (shellObj(path)));
		} catch (error) {
			alert("Failed to get shells: " + error.message);
			return;
		}

		shells.value.push(shellObj("/bin/nologin"));

		shells.value.sort((a, b) => {
			if (a.name === b.name)
				return a.path.localeCompare(b.path);
			return a.name.localeCompare(b.name);
		});
	} finally {
		processing.value--;
	}
}
provide(shellsInjectionKey, shells);

const groups = ref([]);
const getGroups = async () => {
	processing.value++;
	try {
		const primaryGroups = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout
			.split('\n')
			.filter(l => !/^\s*$/.test(l))
			.map(record => {
				const [user, pass, uid, gid, ...etc] = record.split(':');
				return { gid: parseInt(gid), user };
			});
		const groupDB = (await useSpawn(['getent', 'group'], { superuser: 'try' }).promise()).stdout;
		groups.value = groupDB
			.split('\n')
			.filter(record => !/^\s*$/.test(record)) // remove empty lines
			.map(record => {
				const fields = record.split(':');
				const obj = {
					group: fields[0], // group name is 1st field
					gid: parseInt(fields[2]),
					members: fields[3]?.split(',').filter(m => m), // comma-delim list of members is 4th field
					isPrimary: false,
				}
				let primaryGroup = primaryGroups.find(g => g.gid === obj.gid);
				if (primaryGroup) {
					obj.isPrimary = true;
					obj.primaryMember = primaryGroup.user;
					obj.members = [...new Set([...obj.members, primaryGroup.user])];
				}
				return obj;
			});
	} catch (state) {
		alert("Failed to get groups: " + errorString(state));
	} finally {
		processing.value--;
	}
}
provide(groupsInjectionKey, groups);

const init = async () => {
	await getShells();
	await getGroups();
}

init();

</script>
