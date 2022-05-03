<template>
	<div class="flex flex-col centered-column p-well gap-well">
		<div class="card sticky top-0 z-10">
			<div class="card-header flex flex-row flex-wrap items-baseline gap-2">
				<span class="text-header">New User</span>
			</div>
		</div>
		<div class="card">
			<div class="card-header flex flex-row space-x-2 items-center">
				<h3 class="text-header">Details</h3>
				<LoadingSpinner class="size-icon" v-if="processing" />
			</div>
			<UserEditor :user="user" createNew :hooks="editorHooks" @applyChanges="createUser">
				<template #primaryGroup="{ primaryGroup }">
					<tr>
						<td>
							{{ primaryGroup ?? "" }}
							<span class="text-muted">(primary group)</span>
						</td>
						<td></td>
					</tr>
				</template>
			</UserEditor>
		</div>
	</div>
	<UserPassword modalOnly newUser :user="user.user" ref="userPasswordRef" />
</template>

<script>
import { ref, watch, computed, reactive, inject, onMounted, onBeforeUnmount } from "vue";
import { useSpawn, errorString, errorStringHTML } from "@45drives/cockpit-helpers";
import shellObj from "../hooks/shellObj";
import UserEditor from "../components/UserEditor.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import UserPassword from "../components/UserPassword.vue";
import { shellsInjectionKey, notificationsInjectionKey, infoNudgeScrollbarInjectionKey } from "../keys";

export default {
	setup(props, { emit }) {
		const userPasswordRef = ref();
		const shells = inject(shellsInjectionKey);
		const notifications = inject(notificationsInjectionKey);
		const user = reactive({
			user: "",
			primaryGroup: "",
			name: "",
			home: "",
			shell: shells.value.find(shell => /bash/.test(shell.path)) ?? shellObj('/bin/bash'),
			groups: [],
		});
		let existingUsers = [];
		const processing = ref(0);
		const infoNudgeScrollbar = inject(infoNudgeScrollbarInjectionKey);
		onMounted(() => infoNudgeScrollbar.value = true);
		onBeforeUnmount(() => infoNudgeScrollbar.value = false);

		const editorHooks = reactive({
			onInput: (newUser, oldUser) => {
				if (newUser.user !== oldUser.user) {
					if (!newUser.user && /^\/home\//.test(newUser.home))
						newUser.home = "";
					else if (!newUser.home || /^\/home\//.test(newUser.home))
						newUser.home = `/home/${newUser.user}`;
					newUser.primaryGroup = newUser.user;
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
			processing.value++;
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
				notifications.value.constructNotification(
					"Failed to get exiting users",
					`${errorStringHTML(state)}\nBe careful not to create an existing user.`,
					'warning'
				);
			} finally {
				processing.value--;
			}
		}
		getExistingUsers();

		const createUser = async (newUser, oldUser) => {
			processing.value++;
			try {
				const procs = [];
				const errors = [];

				const argv = ['useradd', '-m'];

				if (newUser.name)
					argv.push('--comment', newUser.name);

				if (newUser.home)
					argv.push('--home', newUser.home);

				argv.push('--user-group');

				if (newUser.groups.length)
					argv.push('--groups', newUser.groups.join(','));

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
					notifications.value.constructNotification("Error creating user", `<span class="text-gray-500 font-mono text-sm whitespace-pre-wrap">${errors.join('\n')}</span>`, 'error');
				} else {
					Object.assign(user, newUser);
					notifications.value.constructNotification("Created user", `${newUser.name ?? newUser.user} was created successfully.`, 'success');
					emit('refreshGroups');
					await userPasswordRef.value.setPassword();
					cockpit.location.go(`/users/${newUser.user}`);
					notifications.value
						.constructNotification("Redirected", "You were taken to the user editor after creation.", 'info')
						.addAction('Back to users list', () => cockpit.location.go('/users'));
				}
			} finally {
				processing.value--;
			}
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
	},
	emits: [
		'refreshGroups'
	]
}
</script>
