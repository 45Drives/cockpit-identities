<template>
	<div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8 py-8 overflow-visible">
		<div class="card divide-y divide-y-gray-100 overflow-visible">
			<div class="card-header flex flex-row space-x-2">
				<h3>New User</h3>
				<LoadingSpinner class="w-5 h-5" v-if="processing" />
			</div>
			<UserEditor :user="user" createNew :hooks="editorHooks" @applyChanges="createUser" />
		</div>
	</div>
	<UserPassword modalOnly :user="user.user" ref="userPasswordRef" />
</template>

<script>
import { ref, watch, computed, reactive, inject } from "vue";
import { useSpawn, errorString } from "../hooks/useSpawn";
import shellObj from "../hooks/shellObj";
import UserEditor from "../components/UserEditor.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import UserPassword from "../components/UserPassword.vue";

export default {
	setup() {
		const userPasswordRef = ref();
		const shells = inject('shells');
		const user = reactive({
			user: "",
			name: "",
			home: "",
			shell: shells.value.find(shell => /bash/.test(shell)) ?? shellObj('/bin/bash'),
			groups: [],
		});
		let existingUsers = [];
		const processing = inject('processing');

		const editorHooks = reactive({
			onInput: (newUser, oldUser) => {
				if (newUser.user !== oldUser.user) {
					if (!newUser.user && /^\/home\//.test(newUser.home))
						newUser.home = "";
					else if (!newUser.home || /^\/home\//.test(newUser.home))
						newUser.home = `/home/${newUser.user}`;
					const primaryGroupInd = newUser.groups.indexOf(oldUser.user);
					if (primaryGroupInd !== -1)
						newUser.groups[primaryGroupInd] = newUser.user;
					else
						newUser.groups = [newUser.user, ...newUser.groups];
				}
			},
			validateInputs: (user) => {
				let errors = false;
				const feedback = {};
				if (existingUsers.includes(user.user)) {
					feedback.user = `User exists. <a href='#/users/${user.user}'>Go to user editor for ${user.user}</a>`;
					errors = true;
				}
				return {
					errors: errors,
					...feedback,
				};
			}
		});

		const getExistingUsers = async () => {
			try {
				const passwdDB = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout;
				existingUsers = passwdDB.split('\n')
					.map(record => {
						if (/^\s*$/.test(record))
							return null;
						return record.split(':')[0];
					})
					.filter(user => user !== null);
			} catch (state) {
				alert("Failed to get exiting users: " + errorString(state));
			}
		}
		getExistingUsers();

		const createUser = async (newUser, oldUser) => {
			processing.value++;
			const procs = [];
			let errors = false;

			const argv = ['useradd', '-m'];

			if (newUser.home)
				argv.push('-d', newUser.home);

			if (newUser.groups?.length)
				argv.push('-G', newUser.groups.join(','));

			console.log(argv);
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
					alert("Error creating user:\n" + state.argv.join(' ') + ":\n" + errorString(state));
					errors = true;
				}
			}
			if (errors) {

			} else {
				Object.assign(user, newUser);
				await userPasswordRef.value.setPassword();
			}
			processing.value--;
		}

		return {
			userPasswordRef,
			user,
			processing,
			editorHooks,
			createUser,
		}
	},
	components: {
		UserEditor,
		LoadingSpinner,
		UserPassword
	}
}
</script>
