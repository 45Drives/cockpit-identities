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
	<UserPassword modalOnly newUser :user="user.user" ref="userPasswordRef" />
</template>

<script>
import { ref, watch, computed, reactive, inject } from "vue";
import { useSpawn, errorString, errorStringHTML } from "../hooks/useSpawn";
import shellObj from "../hooks/shellObj";
import UserEditor from "../components/UserEditor.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import UserPassword from "../components/UserPassword.vue";
import { shellsInjectionKey, processingInjectionKey, notificationsInjectionKey } from "../keys";

export default {
	setup() {
		const userPasswordRef = ref();
		const shells = inject(shellsInjectionKey);
		const notifications = inject(notificationsInjectionKey).value;
		const user = reactive({
			user: "",
			name: "",
			home: "",
			shell: shells.value.find(shell => /bash/.test(shell.path)) ?? shellObj('/bin/bash'),
			groups: [],
		});
		let existingUsers = [];
		const processing = inject(processingInjectionKey);

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
				notifications.constructNotification(
					"Failed to get exiting users",
					`${errorStringHTML(state)}\nBe careful not to create an existing user.`,
					'warning'
				);
			}
		}
		getExistingUsers();

		const createUser = async (newUser, oldUser) => {
			processing.value++;
			const procs = [];
			const errors = [];

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
					errors.push(state.errorStringHTML());
				}
			}
			if (errors.length) {
				notifications.constructNotification("Error creating user", `<pre>${errors.join('\n')}</pre>`, 'error');
			} else {
				Object.assign(user, newUser);
				await userPasswordRef.value.setPassword();
				notifications.constructNotification("Created user", `${newUser.name ?? newUser.user} was created successfully.`, 'success');
				cockpit.location.go(`/users/${newUser.user}`);
				notifications
					.constructNotification("Redirected", "You were taken to the user editor after creation.", 'info')
					.addAction('Back to users list', () => cockpit.location.go('/users'));
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
