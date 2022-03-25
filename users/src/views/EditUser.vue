<template>
	<UserEditor v-if="loaded" :shells="shells" v-model="userProxy" />
</template>

<script>
import { useRoute } from "vue-router";
import { ref, watch, computed, reactive } from "vue";
import useSpawn from "../hooks/useSpawn";
import UserEditor from "../components/UserEditor.vue";

function shellObj(path) {
	if (!path || /^\s*$/.test(path))
		return null;
	let name = path
		.replace(/^(?:\/[^\/]*)*\//, '') // remove path leaving only executable name
		.replace(/-/g, ' ') // kebab case to spaces
		.replace(/\b\w/g, c => c.toUpperCase()) // capitalize first letters
		.replace(/Nologin/, "No Login"); // special case of nologin
	return { path, name };
}

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
		const shells = ref([]);
		const loaded = ref(false);
		let pauseUserWatch = false;

		const getShells = async () => {
			try {
				shells.value = (await cockpit.file("/etc/shells", { superuser: 'try' }).read())
					.split('\n')
					.filter(line => !/^\s*(?:#.*)?$/.test(line))
					.map(path => (shellObj(path)));
			} catch (error) {
				alert("Failed to get shells: " + error.message);
				cockpit.location.go("/users");
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
		}

		const getUserInfo = async () => {
			let tmpUser = {};
			try {
				const fields = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout
					.split('\n')
					.find(record => record.substring(0, user.user?.length) === user.user)
					?.split(':');
				if (!fields) {
					alert("User not found: " + tmpUser.user);
					cockpit.location.go("/users");
					return;
				}
				tmpUser.uid = fields[2];
				tmpUser.gid = fields[3];
				tmpUser.name = fields[4];
				tmpUser.home = fields[5];
				tmpUser.shell = shells.value.find(shell => shell.path === fields[6]);
				if (!tmpUser.shell)
					throw new Error("Invalid shell: " + fields[6]);
				tmpUser.groups = (await useSpawn(['groups', user.user]).promise()).stdout
					.replace(/^[^:]+:\s*/, '') // remove "user: " prefix present in some distributions
					.split('\n')
					.filter(line => !/^\s*$/.test(line)) // remove empty lines
					.sort();
			} catch (state) {
				alert("Failed to query user: " + state?.stderr ?? state.message);
				cockpit.location.go("/users");
				return;
			}
			userProxy.value = tmpUser;
		}

		const applyChanges = async (newUser, oldUser) => {
			if (pauseUserWatch)
				return;
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
		}

		watch(route, async () => {
			if (!/^\/users\/.*$/.test(route.path)) {
				return;
			}
			loaded.value = false;
			user.user = route.params.username;

			await getShells();

			await getUserInfo();

			watch(() => ({ ...user }), applyChanges, { deep: true });

			loaded.value = true;

		}, { immediate: true });

		return {
			user,
			userProxy,
			shells,
			loaded,
		}
	},
	components: {
		UserEditor,
	}
}
</script>
