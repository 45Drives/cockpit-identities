<template>
	<div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8 py-8 overflow-visible">
		<div class="card divide-y divide-y-gray-100 overflow-visible">
			<div class="card-header flex flex-row space-x-2">
				<h3>
					New User
				</h3>
				<LoadingSpinner class="w-6 h-6" v-if="processing" />
			</div>
			<UserEditor v-model="userProxy" createNew />
		</div>
	</div>
</template>

<script>
import { ref, watch, computed, reactive, inject } from "vue";
import useSpawn from "../hooks/useSpawn";
import UserEditor from "../components/UserEditor.vue";
import SambaPassword from "../components/SambaPassword.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

export default {
	setup() {
		const user = reactive({ groups: [] });
		const userProxy = computed({
			get() {
				return user;
			},
			set(newUser) {
				Object.assign(user, newUser);
			}
		});
		const processing = inject('processing');

		const applyChanges = async (newUser, oldUser) => {
			if (pauseUserWatch)
				return;
			processing.value++;
			const procs = [];
			let errors = false;

			// if (newUser.name !== oldUser.name)
			// 	procs.push(useSpawn(['chfn', '-f', newUser.name, newUser.user], { superuser: 'try' }).promise());
			// if (newUser.home)
			// 	procs.push(useSpawn(['usermod', '-m', '-d', newUser.home, newUser.user], { superuser: 'try' }).promise());
			// if (newUser.shell.path !== oldUser.shell.path)
			// 	procs.push(useSpawn(['chsh', '-s', newUser.shell.path, newUser.user], { superuser: 'try' }).promise());

			// const groupsToAdd = newUser.groups.filter(group => !oldUser.groups.includes(group));
			// const groupsToRemove = oldUser.groups.filter(group => !newUser.groups.includes(group));

			// if (groupsToAdd.length)
			// 	procs.push(useSpawn(['usermod', '-aG', groupsToAdd.join(','), newUser.user], { superuser: 'try' }).promise());
			// if (groupsToRemove.length)
			// 	for (const group of groupsToRemove)
			// 		procs.push(useSpawn(['gpasswd', '-d', newUser.user, group]));

			for (const proc of procs) {
				try {
					await proc;
				} catch (state) {
					alert("Error creating user:\n" + state.argv.join(' ') + ":\n" + state?.stderr ?? state.message);
					errors = true;
				}
			}
			pauseUserWatch = true; // avoid retriggering applyChanges during getUserInfo
			if (errors) {
				
			} else {
				userProxy.value = newUser;
			}
			pauseUserWatch = false;
			processing.value--;
		}

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
	}
}
</script>
