<!--
Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>

This file is part of Cockpit Identities.

Cockpit Identities is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version.

Cockpit Identities is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Cockpit Identities.
If not, see <https://www.gnu.org/licenses/>. 
-->

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
import { ref, reactive, inject, onMounted, onBeforeUnmount } from "vue";
import shellObj from "../hooks/shellObj";
import UserEditor from "../components/UserEditor.vue";
import UserPassword from "../components/UserPassword.vue";
import { shellsInjectionKey, infoNudgeScrollbarInjectionKey } from "../keys";
import { LoadingSpinner, pushNotification, Notification } from "@45drives/houston-common-ui";
import { legacy, addUser, getUsers } from '@45drives/houston-common-lib';
const { errorString, errorStringHTML } = legacy;

export default {
	setup(props, { emit }) {
		const userPasswordRef = ref();
		const shells = inject(shellsInjectionKey);
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
				existingUsers = await getUsers();
			} catch (state) {
				pushNotification(new Notification(
					"Failed to get exiting users",
					`${errorStringHTML(state)}\nBe careful not to create an existing user.`,
					'warning', 5000
				));
			} finally {
				processing.value--;
			}
		}
		getExistingUsers();

		const createUser = async (newUser, oldUser) => {
			processing.value++;
			try {
				// Merge the new user details into the `user` object
				Object.assign(user, newUser);

				// Call the addUser function and await its result
				const result = await addUser(user, existingUsers);

				// Check if the user creation was successful
				if (result.success) {
					pushNotification(new Notification("Created user", `${user.user} was created successfully.`, 'success', 5000));
					emit('refreshGroups');
					await userPasswordRef.value.setPassword();

					cockpit.location.go(`/users/${user.user}`);
					pushNotification(new Notification("Redirected", "You were taken to the user editor after creation.", 'info', 5000))
						.addAction('Back to users list', () => cockpit.location.go('/users'));
				} else {
					pushNotification(new Notification("Failed to create user", errorString(result.error), 'error', 5000));
					return;
				}
			} catch (error) {
				pushNotification(new Notification("Failed to create user", errorStringHTML(error), 'error', 5000));
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