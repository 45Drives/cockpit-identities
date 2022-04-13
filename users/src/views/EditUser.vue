<template>
	<div class="centered-column p-well space-y-well">
		<div class="card sticky top-0 z-10">
			<div class="card-header flex flex-row items-baseline space-x-2">
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
			<div class="card-header flex flex-row items-baseline space-x-2">
				<div class="text-header">Details</div>
				<LoadingSpinner class="size-icon" v-if="processing" />
			</div>
			<UserEditor :user="user" @applyChanges="applyChanges">
				<button class="btn btn-danger" @click="deleteConfirmationModal.show = true">
					<div class="flex flex-row items-center">
						<span class="mr-2">Delete User</span>
						<TrashIcon class="size-icon" />
					</div>
				</button>
			</UserEditor>
		</div>
		<div class="card">
			<div class="card-header flex flex-row space-x-2">
				<div class="text-header">Credentials</div>
				<LoadingSpinner class="size-icon" v-if="processing" />
			</div>
			<div class="card-body space-y-content">
				<UserPassword :user="user.user" />
				<SambaPassword :user="user.user" />
				<SSHKeys :user="user" />
			</div>
		</div>
		<div class="card">
			<div class="card-header flex flex-row space-x-2">
				<div class="text-header">Activity</div>
				<LoadingSpinner class="size-icon" v-if="processing" />
			</div>
			<div class="card-body space-y-content">
				<UserActivity :user="user" v-if="user.user !== undefined" />
			</div>
		</div>
	</div>
	<ModalPopup
		:showModal="deleteConfirmationModal.show"
		@apply="deleteConfirmationModal.applyCallback"
		@cancel="deleteConfirmationModal.cancelCallback"
		:headerText="`Delete user ${user.user}?`"
		:applyText="deleteConfirmationModal.applyText"
		applyDangerous
	>
		<template #icon><ExclamationCircleIcon class="size-icon-xl icon-danger" /></template>
		<div class="ml-2 flex flex-col space-y-2">
			<div>{{ deleteConfirmationModal.bodyText }}</div>
			<div class="relative flex items-start">
				<div class="flex items-center h-5">
					<input
						type="checkbox"
						class="focus:ring-offset-0 dark:bg-neutral-800 dark:border-neutral-700 dark:checked:bg-red-600 focus:ring-0 focus:outline-none h-4 w-4 text-red-600 border-neutral-300 rounded"
						v-model="deleteConfirmationModal.removeFiles"
					/>
				</div>
				<div class="ml-3 text-sm">
					<label class="font-medium">Remove {{ user.user }}'s files</label>
				</div>
			</div>
		</div>
	</ModalPopup>
</template>

<script>
import { useRoute } from "vue-router";
import { ref, watch, computed, reactive, inject, onUnmounted } from "vue";
import { useSpawn, errorString, errorStringHTML } from "../hooks/useSpawn";
import UserEditor from "../components/UserEditor.vue";
import SambaPassword from "../components/SambaPassword.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import SSHKeys from "../components/SSHKeys.vue";
import UserActivity from "../components/UserActivity.vue";
import { shellsInjectionKey, processingInjectionKey, notificationsInjectionKey } from "../keys";
import shellObj from "../hooks/shellObj";
import { TrashIcon, ExclamationCircleIcon } from "@heroicons/vue/solid";
import ModalPopup from "../components/ModalPopup.vue";
import UserPassword from "../components/UserPassword.vue";

export default {
	setup() {
		const route = useRoute();
		const user = reactive({ groups: [] });
		const processing = inject(processingInjectionKey);
		const shells = inject(shellsInjectionKey);
		const notifications = inject(notificationsInjectionKey).value;
		const defaultShowDeleteConfirmationModalApplyCallback = () => {
			deleteConfirmationModal.bodyText = "Are you really sure?";
			deleteConfirmationModal.applyText = "Yes I am really sure";
			deleteConfirmationModal.applyCallback = () => {
				deleteUser();
				deleteConfirmationModal.applyCallback = defaultShowDeleteConfirmationModalApplyCallback;
			};
		};
		const deleteConfirmationModal = reactive({
			show: false,
			bodyText: "This cannot be undone. Are you sure?",
			applyText: "Yes",
			removeFiles: false,
			applyCallback: defaultShowDeleteConfirmationModalApplyCallback,
			cancelCallback: () => {
				deleteConfirmationModal.show = false;
				deleteConfirmationModal.bodyText = "This cannot be undone. Are you sure?";
				deleteConfirmationModal.applyText = "Yes";
				deleteConfirmationModal.applyCallback = defaultShowDeleteConfirmationModalApplyCallback;
			}
		});

		const getUserInfo = async (newUserLogin = null) => {
			processing.value++;
			if (newUserLogin !== null)
				user.user = newUserLogin;
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
					notifications.constructNotification(
						`${fields[6]} not in /etc/shells`,
						"If you modify this user's shell, you will need to use 'Custom Shell' in the dropdown to set it back.",
						'info'
					);
					tmpUser.shell = shellObj(fields[6]);
				}
				tmpUser.groups = (await useSpawn(['groups', user.user]).promise()).stdout
					.replace(/^[^:]+:\s*/, '') // remove "user: " prefix present in some distributions
					.split(/\s+/g)
					.filter(line => !/^\s*$/.test(line)) // remove empty lines
					.sort();
			} catch (state) {
				let message;
				if (state?.status === 2)
					message = `User '${user.user}' not found.`;
				else
					message = errorStringHTML(state);
				notifications.constructNotification(
					"Failed to query user",
					message,
					'error'
				)
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
					procs.push(useSpawn(['gpasswd', '-d', newUser.user, group]).promise());

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

		const deleteUser = async () => {
			const argv = ['userdel'];
			if (deleteConfirmationModal.removeFiles)
				argv.push('--remove');
			argv.push(user.user);
			try {
				await useSpawn(argv, { superuser: 'try' }).promise();
				notifications.constructNotification("Deleted user", `${user.user} was deleted successfully.`, 'success');
				cockpit.location.go("/users");
			} catch (state) {
				notifications.constructNotification("Error deleting user", errorStringHTML(state), 'error');
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
			user,
			processing,
			deleteConfirmationModal,
			applyChanges,
			deleteUser
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
	}
}
</script>
