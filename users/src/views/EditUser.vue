<template>
	<UserEditor v-if="loaded" v-model="userProxy" />
</template>

<script>
import { useRoute } from "vue-router";
import { ref, watch, computed, reactive, inject } from "vue";
import useSpawn from "../hooks/useSpawn";
import UserEditor from "../components/UserEditor.vue";

export default {
	setup() {
		const route = useRoute();
		const user = reactive({groups: []});
		const userProxy = computed({
			get() {
				return user;
			},
			set(newUser) {
				Object.assign(user, newUser);
			}
		});
		const loaded = ref(false);
		let pauseUserWatch = false;
		const processing = inject('processing');
		const shells = inject('shells');

		const getUserInfo = async () => {
			processing.value = true;
			let tmpUser = {};
			try {
				const fields = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout
					.split('\n')
					.find(record => record.substring(0, user.user?.length) === user.user)
					?.split(':');
				if (!fields) {
					alert("User not found: " + user.user);
					cockpit.location.go("/users");
					return;
				}
				tmpUser.uid = fields[2];
				tmpUser.gid = fields[3];
				tmpUser.name = fields[4];
				tmpUser.home = fields[5];
				tmpUser.shell = shells.value.find(shell => shell.path === fields[6]);
				if (!tmpUser.shell)
					throw new Error("Invalid shell: " + fields[6] + "(not in /etc/shells)");
				tmpUser.groups = (await useSpawn(['groups', user.user]).promise()).stdout
					.replace(/^[^:]+:\s*/, '') // remove "user: " prefix present in some distributions
					.split(/\s+/g)
					.filter(line => !/^\s*$/.test(line)) // remove empty lines
					.sort();
			} catch (state) {
				alert("Failed to query user: " + state?.stderr ?? state.message);
				cockpit.location.go("/users");
				return;
			}
			userProxy.value = tmpUser;
			processing.value = false;
		}

		const applyChanges = async (newUser, oldUser) => {
			if (pauseUserWatch)
				return;
			processing.value = true;
			const procs = [];
			let errors = false;
			if (newUser.name !== oldUser.name)
				procs.push(useSpawn(['chfn', '-f', newUser.name, newUser.user], { superuser: 'try' }).promise());
			if (newUser.home !== oldUser.home)
				procs.push(useSpawn(['usermod', '-m', '-d', newUser.home, newUser.user], { superuser: 'try' }).promise());
			if (newUser.shell.path !== oldUser.shell.path)
				procs.push(useSpawn(['chsh', '-s', newUser.shell, newUser.user], { superuser: 'try' }).promise());
			for (const proc of procs) {
				try {
					await proc;
				} catch (state) {
					alert("Error applying changes:\n" + state.argv.join(' ') + ":\n" + state?.stderr ?? state.message);
					errors = true;
				}
			}
			if (errors) {
				pauseUserWatch = true; // avoid retriggering applyChanges during getUserInfo
				await getUserInfo(); // reset values
				pauseUserWatch = false;
			}
			await new Promise((resolve, reject) => setTimeout(resolve, 1000));
			processing.value = false;
		}

		watch(route, async () => {
			if (!/^\/users\/.*$/.test(route.path)) {
				return;
			}
			loaded.value = false;
			user.user = route.params.username;

			await getUserInfo();

			watch(() => ({ ...user }), applyChanges, { deep: true });

			loaded.value = true;

		}, { immediate: true });

		return {
			user,
			userProxy,
			loaded,
			processing,
		}
	},
	components: {
		UserEditor,
	}
}
</script>
