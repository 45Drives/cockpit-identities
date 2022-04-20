<template>
	<div class="flex flex-col centered-column p-well gap-well">
		<div class="card sticky top-0 z-10">
			<div class="card-header flex flex-row flex-wrap items-baseline gap-2">
				<span class="text-header">New User</span>
			</div>
		</div>
		<div class="card">
			<div class="card-header flex flex-row space-x-2">
				<h3 class="text-header">Details</h3>
				<LoadingSpinner class="size-icon" v-if="processing" />
			</div>
			<UserEditor :user="user" createNew :hooks="editorHooks" @applyChanges="createUser" />
		</div>
	</div>
	<UserPassword modalOnly newUser :user="user.user" ref="userPasswordRef" />
</template>

<script>
import { ref, watch, computed, reactive, inject } from "vue";
import { useSpawn, errorString, errorStringHTML } from "@45drives/cockpit-helpers";
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

			if (newUser.name)
				argv.push('--comment', newUser.name);

			if (newUser.home)
				argv.push('--home', newUser.home);

			argv.push('--user-group');
			const secondaryGroups = newUser.groups.filter(group => group !== newUser.user)
			if (secondaryGroups.length)
				argv.push('--groups', secondaryGroups.join(','));
			
			if (newUser.shell.path)
				argv.push('-s', newUser.shell.path);
			
			argv.push(newUser.user);

			procs.push(useSpawn(argv, { superuser: 'try' }).promise());

			for (const proc of procs) {
				try {
					await proc;
				} catch (state) {
					errors.push(state.errorStringHTML());
				}
			}
			if (errors.length) {
				notifications.constructNotification("Error creating user", `<span class="text-gray-500 font-mono text-sm whitespace-pre-wrap">${errors.join('\n')}</span>`, 'error');
			} else {
				Object.assign(user, newUser);
				notifications.constructNotification("Created user", `${newUser.name ?? newUser.user} was created successfully.`, 'success');
				await userPasswordRef.value.setPassword();
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
