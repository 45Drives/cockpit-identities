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
	<div class="centered-column p-well space-y-well">
		<div class="card sticky top-0 z-10">
			<div class="card-header flex flex-row flex-wrap items-baseline gap-2">
				<span class="text-header">{{ user.name === "" ? user.user : user.name }}</span>
				<span class="text-muted font-mono text-sm">
					<span v-if="user.name">(login={{ user.user }},</span>
					<span v-else>(</span>
					<span>uid={{ user.uid }},</span>
					<span>gid={{ user.gid }})</span>
				</span>
			</div>
		</div>
		<div class="card">
			<div class="card-header flex flex-row space-x-2 items-center">
				<div class="text-header">Details</div>
				<LoadingSpinner class="size-icon" v-if="processing" />
			</div>
			<UserEditor :user="user" @applyChanges="applyChanges">
				<button
					class="btn btn-danger"
					@click="deleteConfirmation.showModal = true"
					:disabled="user.uid === '0' || user.isCurrentLoggedIn"
					:title="user.uid === '0' ? 'Cannot delete root.' : user.isCurrentLoggedIn ? 'Cannot delete self.' : ''"
				>
					<div class="flex flex-row items-center">
						<span class="mr-2">Delete User</span>
						<TrashIcon class="size-icon" />
					</div>
				</button>
				<button
					class="btn btn-danger"
					@click="terminateConfirmation.showModal = true"
					:disabled="user.uid === '0'"
					:title="user.uid === '0' ? 'Cannot terminate root session.' : `Send HUP to all processes owned by ${user.user}`"
				>
					<div class="flex flex-row items-center">
						<span class="mr-2">Terminate Session</span>
						<LogoutIcon class="size-icon" />
					</div>
				</button>
			</UserEditor>
		</div>
		<div class="card">
			<div class="card-header flex flex-row space-x-2 items-center">
				<div class="text-header">Credentials</div>
				<LoadingSpinner class="size-icon" v-if="processingCredentials" />
			</div>
			<div class="card-body space-y-content">
				<UserPassword
					:user="user.user"
					@startProcessing="processingCredentials++"
					@stopProcessing="processingCredentials--"
				/>
				<SambaPassword
					:user="user.user"
					@startProcessing="processingCredentials++"
					@stopProcessing="processingCredentials--"
				/>
				<SSHKeys
					:user="user"
					@startProcessing="processingCredentials++"
					@stopProcessing="processingCredentials--"
				/>
			</div>
		</div>
		<div class="card overflow-hidden">
			<UserActivity :user="user" v-if="user.user !== undefined" class="!border-0" />
		</div>
	</div>
	<ModalPopup
		:showModal="deleteConfirmation.showModal"
		@apply="deleteConfirmation.applyCallback"
		@cancel="deleteConfirmation.cancelCallback"
		:headerText="`Delete user ${user.user}?`"
		:applyText="deleteConfirmation.applyText"
		:disableContinue="!deleteConfirmation.confirmed"
		applyDangerous
		autoWidth
	>
		<template #icon>
			<ExclamationCircleIcon class="size-icon-xl icon-danger" />
		</template>
		<div class="flex items-center gap-2 mb-3">
			<input
				type="checkbox"
				class="focus:ring-offset-0 dark:bg-neutral-800 dark:border-neutral-700 dark:checked:bg-red-600 focus:ring-0 focus:outline-none h-4 w-4 text-red-600 border-neutral-300 rounded"
				v-model="deleteConfirmation.removeFiles"
			/>
			<label class="font-medium">Remove {{ user.user }}'s files</label>
		</div>
		<div class="whitespace-normal mb-3">
			This cannot be undone. Type
			<span
				class="font-mono text-sm bg-accent p-1"
			>{{ deleteConfirmation.confirmationCheck }}</span>
			below to confirm.
		</div>
		<input
			type="text"
			class="input-textlike w-full"
			v-model="deleteConfirmation.confirmationInput"
			@input="deleteConfirmation.checkConfirmation"
		/>
	</ModalPopup>
	<ModalPopup
		:showModal="terminateConfirmation.showModal"
		@apply="terminateConfirmation.applyCallback"
		@cancel="terminateConfirmation.cancelCallback"
		:headerText="`Terminate session for ${user.user}?`"
		:applyText="terminateConfirmation.applyText"
		applyDangerous
	>
		This will attempt to kill all processes owned by {{user.user}} with the SIGHUP signal, simulating a logout.
	</ModalPopup>
</template>

<script>
import { useRoute } from "vue-router";
import { ref, watch, computed, reactive, inject, onMounted, onBeforeUnmount } from "vue";
import { useSpawn, errorString, errorStringHTML } from "@45drives/cockpit-helpers";
import UserEditor from "../components/UserEditor.vue";
import SambaPassword from "../components/SambaPassword.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import SSHKeys from "../components/SSHKeys.vue";
import UserActivity from "../components/UserActivity.vue";
import { shellsInjectionKey, notificationsInjectionKey, infoNudgeScrollbarInjectionKey } from "../keys";
import shellObj from "../hooks/shellObj";
import { TrashIcon, ExclamationCircleIcon, LogoutIcon } from "@heroicons/vue/solid";
import ModalPopup from "../components/ModalPopup.vue";
import UserPassword from "../components/UserPassword.vue";
import FixedMenu from "../components/FixedMenu.vue";

export default {
	setup(props, { emit }) {
		const testOutput = ref("");
		const route = useRoute();
		const user = reactive({ groups: [], isCurrentLoggedIn: false });
		const processing = ref(0);
		const processingCredentials = ref(0);
		const shells = inject(shellsInjectionKey);
		const notifications = inject(notificationsInjectionKey);
		const infoNudgeScrollbar = inject(infoNudgeScrollbarInjectionKey);
		onMounted(() => infoNudgeScrollbar.value = true);
		onBeforeUnmount(() => infoNudgeScrollbar.value = false);
		const deleteConfirmation = reactive({
			showModal: false,
			applyText: "Confirm",
			removeFiles: false,
			confirmationCheck: `delete-${user.user}`,
			confirmationInput: "",
			confirmed: false,
			ask: () => {
				deleteConfirmation.confirmed = false;
				deleteConfirmation.confirmationCheck = `delete-${user.user}`;
				deleteConfirmation.confirmationInput = "";
				deleteConfirmation.showModal = true;
			},
			checkConfirmation: () => {
				deleteConfirmation.confirmed = deleteConfirmation.confirmationCheck === deleteConfirmation.confirmationInput;
			},
			applyCallback: async () => {
				if (deleteConfirmation.confirmed)
					await deleteUser();
				deleteConfirmation.reset();
			},
			cancelCallback: () => {
				deleteConfirmation.reset();
			},
			reset: () => {
				deleteConfirmation.showModal = false;
				setTimeout(() => {
					deleteConfirmation.confirmationInput = "";
					deleteConfirmation.removeFiles = false;
				}, 300);
			},
		});
		const terminateConfirmation = reactive({
			showModal: false,
			applyText: "Confirm",
			applyCallback: async () => {
				try {
					await useSpawn(['killall', '-HUP', '-u', user.user], { superuser: 'try' }).promise();
				} catch (state) { /* exits non-zero if no procs killed */}
				terminateConfirmation.showModal = false;
			},
			cancelCallback: () => {
				terminateConfirmation.showModal = false;
			},
		});

		const getUserInfo = async (newUserLogin = null) => {
			processing.value++;
			try {
				if (newUserLogin !== null)
					user.user = newUserLogin;
				deleteConfirmation.confirmationCheck = `delete-${user.user}`;
				user.isCurrentLoggedIn = user.user === (await cockpit.user()).name;
				let tmpUser = {};
				try {
					const fields = (await useSpawn(['getent', 'passwd', user.user], { superuser: 'try' }).promise()).stdout
						.trim()
						.split(':');
					tmpUser.uid = fields[2];
					tmpUser.gid = fields[3];
					tmpUser.name = fields[4];
					tmpUser.home = fields[5];
					tmpUser.shell = shells.value.find(shell => shell.path === fields[6]);
					if (!tmpUser.shell) {
						notifications.value.constructNotification(
							`${fields[6]} not in /etc/shells`,
							"If you modify this user's shell, you will need to use 'Custom Shell' in the dropdown to set it back.",
							'info'
						);
						tmpUser.shell = shellObj(fields[6]);
					}
					tmpUser.groups = (await useSpawn(['groups', user.user], { superuser: 'try' }).promise()).stdout
						.replace(/^[^:]+:\s*/, '') // remove "user: " prefix present in some distributions
						.split(/\s+/g)
						.filter(line => !/^\s*$/.test(line)) // remove empty lines
						.sort();
					tmpUser.primaryGroup = (await useSpawn(['id', '-ng', user.user], { superuser: 'try' }).promise()).stdout.trim();
				} catch (state) {
					let message;
					if (state?.status === 2)
						message = `User '${user.user}' not found.`;
					else
						message = errorStringHTML(state);
					notifications.value.constructNotification(
						"Failed to query user",
						message,
						'error'
					)
					cockpit.location.go("/users");
					return;
				}
				Object.assign(user, tmpUser);
			} finally {
				processing.value--;
			}
		}

		const applyChanges = async (newUser) => {
			processing.value++;
			let changedGroups = false;
			try {
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
				changedGroups = Boolean(groupsToAdd.length) || Boolean(groupsToRemove.length);

				if (groupsToAdd.length)
					procs.push(useSpawn(['usermod', '-aG', groupsToAdd.join(','), newUser.user], { superuser: 'try' }).promise());
				if (groupsToRemove.length)
					for (const group of groupsToRemove)
						procs.push(useSpawn(['gpasswd', '-d', newUser.user, group], { superuser: 'try' }).promise());

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
			} finally {
				if (changedGroups)
					emit('refreshGroups');
				processing.value--;
			}
		}

		const deleteUser = async () => {
			const argv = ['userdel'];
			if (deleteConfirmation.removeFiles)
				argv.push('--remove');
			argv.push(user.user);
			try {
				await useSpawn(argv, { superuser: 'try' }).promise();
				notifications.value.constructNotification("Deleted user", `${user.user} was deleted successfully.`, 'success');
				emit('refreshGroups');
				cockpit.location.go("/users");
			} catch (state) {
				notifications.value.constructNotification("Error deleting user", errorStringHTML(state), 'error');
			}
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
			testOutput,
			user,
			processing,
			processingCredentials,
			deleteConfirmation,
			terminateConfirmation,
			applyChanges,
			deleteUser,
		}
	},
	components: {
		UserEditor,
		SambaPassword,
		LoadingSpinner,
		SSHKeys,
		UserActivity,
		TrashIcon,
		ExclamationCircleIcon,
		ModalPopup,
		UserPassword,
		FixedMenu,
		LogoutIcon,
	},
	emits: [
		'refreshGroups'
	]
}
</script>
