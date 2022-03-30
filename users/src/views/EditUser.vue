<template>
	<div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8 py-8 overflow-visible">
		<div class="card divide-y divide-y-gray-100 overflow-visible">
			<div class="card-header flex flex-row space-x-2">
				<h3>
					{{ user.name === "" ? user.user : user.name }}
					<span class="text-gray-500 font-mono text-sm">
						<span v-if="user.name">(login={{ user.user }}, </span>
						<span v-else>(</span>
						<span>uid={{ user.uid }}, </span>
						<span>gid={{ user.gid }})</span>
					</span>
				</h3>
				<LoadingSpinner class="w-6 h-6" v-if="processing" />
			</div>
			<UserEditor v-model="userProxy">
				<SambaPassword :user="user" />
				<SSHKeys :user="user" />
			</UserEditor>
		</div>
	</div>
</template>

<script>
import { useRoute } from "vue-router";
import { ref, watch, computed, reactive, inject } from "vue";
import { useSpawn, errorString } from "../hooks/useSpawn";
import UserEditor from "../components/UserEditor.vue";
import SambaPassword from "../components/SambaPassword.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import SSHKeys from "../components/SSHKeys.vue";

export default {
	setup() {
		const route = useRoute();
		const user = reactive({ groups: [] });
		const userProxy = computed({
			get() {
				return user;
			},
			set(newUser) {
				Object.assign(user, newUser);
			}
		});
		let pauseUserWatch = false;
		const processing = inject('processing');
		const shells = inject('shells');

		const getUserInfo = async () => {
			processing.value++;
			let tmpUser = {};
			try {
				const fields = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout
					.split('\n')
					.find(record => record.substring(0, user.user?.length) === user.user)
					?.split(':');
				if (!fields) {
					alert("User not found: " + user.user);
					processing.value--;
					cockpit.location.go("/users");
					return;
				}
				tmpUser.uid = fields[2];
				tmpUser.gid = fields[3];
				tmpUser.name = fields[4];
				tmpUser.home = fields[5];
				tmpUser.shell = shells.value.find(shell => shell.path === fields[6]);
				if (!tmpUser.shell)
					throw new Error("Invalid shell: " + fields[6] + " (not in /etc/shells)");
				tmpUser.groups = (await useSpawn(['groups', user.user]).promise()).stdout
					.replace(/^[^:]+:\s*/, '') // remove "user: " prefix present in some distributions
					.split(/\s+/g)
					.filter(line => !/^\s*$/.test(line)) // remove empty lines
					.sort();
			} catch (state) {
				alert("Failed to query user: " + errorString(state));
				processing.value--;
				cockpit.location.go("/users");
				return;
			}
			userProxy.value = tmpUser;
			processing.value--;
		}

		const applyChanges = async (newUser, oldUser) => {
			if (pauseUserWatch)
				return;
			processing.value++;
			const procs = [];
			let errors = false;
			if (newUser.name !== oldUser.name)
				procs.push(useSpawn(['chfn', '-f', newUser.name, newUser.user], { superuser: 'try' }).promise());
			if (newUser.home !== oldUser.home)
				procs.push(useSpawn(['usermod', '-m', '-d', newUser.home, newUser.user], { superuser: 'try' }).promise());
			if (newUser.shell.path !== oldUser.shell.path)
				procs.push(useSpawn(['chsh', '-s', newUser.shell.path, newUser.user], { superuser: 'try' }).promise());

			const groupsToAdd = newUser.groups.filter(group => !oldUser.groups.includes(group));
			const groupsToRemove = oldUser.groups.filter(group => !newUser.groups.includes(group));

			if (groupsToAdd.length)
				procs.push(useSpawn(['usermod', '-aG', groupsToAdd.join(','), newUser.user], { superuser: 'try' }).promise());
			if (groupsToRemove.length)
				for (const group of groupsToRemove)
					procs.push(useSpawn(['gpasswd', '-d', newUser.user, group]));

			for (const proc of procs) {
				try {
					await proc;
				} catch (state) {
					alert("Error applying changes:\n" + state.argv.join(' ') + ":\n" + errorString(state));
					errors = true;
				}
			}
			pauseUserWatch = true; // avoid retriggering applyChanges during getUserInfo
			if (errors) {
				await getUserInfo(); // reset values
			} else {
				userProxy.value = newUser;
			}
			pauseUserWatch = false;
			processing.value--;
		}

		watch(route, async () => {
			if (!/^\/users\/.*$/.test(route.path)) {
				return;
			}
			user.user = route.params.username;

			pauseUserWatch = true;
			await getUserInfo();
			pauseUserWatch = false;

		}, { immediate: true });

		watch(() => ({ ...user }), applyChanges, { deep: true });

		return {
			user,
			userProxy,
			processing,
		}
	},
	components: {
    UserEditor,
    SambaPassword,
    LoadingSpinner,
    SSHKeys
}
}
</script>
