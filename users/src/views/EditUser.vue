<template>
	<div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8 py-8 overflow-visible">
		<div class="card divide-y divide-gray-100 dark:divide-gray-700 overflow-visible">
			<div class="card-header flex flex-row space-x-2">
				<h3>
					{{ user.name === "" ? user.user : user.name }}
					<span class="text-gray-500 font-mono text-sm">
						<span v-if="user.name">(login={{ user.user }},</span>
						<span v-else>(</span>
						<span>uid={{ user.uid }},</span>
						<span>gid={{ user.gid }})</span>
					</span>
				</h3>
				<LoadingSpinner class="w-6 h-6" v-if="processing" />
			</div>
			<UserEditor :user="user" @applyChanges="applyChanges" />
		</div>
		<div class="card divide-y divide-gray-100 dark:divide-gray-700 overflow-visible">
			<div class="card-header flex flex-row space-x-2">
				<h3>Credentials</h3>
				<LoadingSpinner class="w-6 h-6" v-if="processing" />
			</div>
			<div class="card-body space-y-5">
				<SambaPassword :user="user" />
				<SSHKeys :user="user" />
			</div>
		</div>
		<div class="card divide-y divide-gray-100 dark:divide-gray-700 overflow-visible">
			<div class="card-header flex flex-row space-x-2">
				<h3>Activity</h3>
				<LoadingSpinner class="w-6 h-6" v-if="processing" />
			</div>
			<div class="card-body space-y-5">
				<UserActivity :user="user" />
			</div>
		</div>
	</div>
</template>

<script>
import { useRoute } from "vue-router";
import { ref, watch, computed, reactive, inject, onUnmounted } from "vue";
import { useSpawn, errorString } from "../hooks/useSpawn";
import UserEditor from "../components/UserEditor.vue";
import SambaPassword from "../components/SambaPassword.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import SSHKeys from "../components/SSHKeys.vue";
import UserActivity from "../components/UserActivity.vue";

export default {
	setup() {
		const route = useRoute();
		const user = reactive({ groups: [] });
		const processing = inject('processing');
		const shells = inject('shells');

		const getUserInfo = async (newUserLogin = null) => {
			processing.value++;
			if (newUserLogin !== null)
				user.user = newUserLogin;
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
			Object.assign(user, tmpUser);
			processing.value--;
		}

		const applyChanges = async (newUser) => {
			processing.value++;
			const procs = [];
			let errors = false;
			if (newUser.name !== user.name)
				procs.push(useSpawn(['chfn', '-f', newUser.name, newUser.user], { superuser: 'try' }).promise());
			if (newUser.home !== user.home)
				procs.push(useSpawn(['usermod', '-m', '-d', newUser.home, newUser.user], { superuser: 'try' }).promise());
			if (newUser.shell.path !== user.shell.path)
				procs.push(useSpawn(['chsh', '-s', newUser.shell.path, newUser.user], { superuser: 'try' }).promise());

			const groupsToAdd = newUser.groups.filter(group => !user.groups.includes(group));
			const groupsToRemove = user.groups.filter(group => !newUser.groups.includes(group));

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
			if (errors) {
				// reset values (could be partially changed, that's why no simple rollback to user)
				await getUserInfo();
			} else {
				// all good, update user object reflecting changes
				// this also triggers a watch in UserEditor to synchronize it's internal tmpUser with user
				Object.assign(user, newUser);
			}
			processing.value--;
		}

		watch(() => route.path, async () => {
			if (!/^\/users\/.*$/.test(route.path)) {
				// watch is triggered when navigating away from page,
				// this check prevents getUserInfo to be called when the URL
				// is no longer a user editor
				return;
			}
			await getUserInfo(route.params.username);
		}, { immediate: true });

		return {
			user,
			processing,
			applyChanges,
		}
	},
	components: {
		UserEditor,
		SambaPassword,
		LoadingSpinner,
		SSHKeys,
		UserActivity,
	}
}
</script>
