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
	<div class="centered-column p-well h-full overflow-hidden">
		<div class="card h-full overflow-hidden">
			<Table stickyHeaders noShrink noShrinkHeight="h-full" class="!border-0">
			<template #header>
				<div class="flex flex-row gap-2 items-center">
					<span>Groups</span>
					<LoadingSpinner v-if="processing" class="size-icon" />
					<div class="grow"></div>
					<button @click="newGroup.showModal = true" title="Create new group">
						<PlusIcon class="size-icon icon-default" />
					</button>
				</div>
			</template>
			<template #thead>
				<tr>
					<th class="w-20">
						<div class="flex flex-row flex-nowrap gap-x-2">
							<div class="grow">Name</div>
							<SortCallbackButton v-model="sorter.callback" :compareFunc="sorter.group"
								initialFuncIsMine />
						</div>
					</th>
					<th class="w-20 text-right mr-20 overflow-x-visible !pr-7">
						<span>Group ID</span>
						<SortCallbackButton v-model="sorter.callback" :compareFunc="sorter.gid"
							class="absolute right-0 z-20" />
					</th>
					<th>Members</th>
					<th>
						<div class="!sr-only">Delete Group</div>
					</th>
				</tr>
			</template>
			<template #tbody>
				<tr v-for="group in groupsSorted" :index="group.gid">
					<td class="flex flex-row gap-x-2 items-center">
						<span class="grow">{{ group.group }}</span>
						<div v-if="group.isPrimary && (group.gid >= 1000 || group.gid === 0)"
							:title="`${group.primaryMember}'s primary group`">
							<UserIcon class="size-icon-sm icon-default" />
						</div>
					</td>
					<td class="text-right !pr-7">{{ group.gid }}</td>
					<td v-if="group.members.length">{{ group.members.join(', ') }}</td>
					<td v-else class="text-muted">No members</td>
					<td class="w-20 text-right">
						<button :disabled="!checkIfCanDelete(group)"
							:title="checkIfCanDelete(group) ? `Delete group ${group.group}` : 'Cannot delete system or primary user groups'"
							@click="deleteConfirmation.ask(group)">
							<TrashIcon class="size-icon icon-danger" />
						</button>
					</td>
				</tr>
			</template>
		</Table>
		</div>
	</div>
	<ModalPopup :showModal="newGroup.showModal" autoWidth headerText="Create New Group" applyText="Create"
		@apply="newGroup.applyCallback" @cancel="newGroup.cancelCallback" :disableContinue="!newGroup.valid">
		<label class="text-label block">Group Name</label>
		<input type="text" class="w-full input-textlike" v-model="newGroup.group" @input="newGroup.validateInputs" />
		<div class="feedback-group" v-if="newGroup.feedback.group">
			<ExclamationCircleIcon class="size-icon icon-error" />
			<span v-html="newGroup.feedback.group" class="text-feedback text-error"></span>
		</div>
	</ModalPopup>
	<ModalPopup :showModal="deleteConfirmation.showModal" @apply="deleteConfirmation.applyCallback"
		@cancel="deleteConfirmation.cancelCallback" :headerText="`Delete group ${deleteConfirmation.group?.group}?`"
		:applyText="deleteConfirmation.applyText" :disableContinue="!deleteConfirmation.confirmed" applyDangerous
		autoWidth>
		<template #icon>
			<ExclamationCircleIcon class="size-icon-xl icon-danger" />
		</template>
		<div v-if="deleteConfirmation.group?.members?.length" class="whitespace-normal mb-3">
			Group member{{ deleteConfirmation.group.members.length > 1 ? 's' : '' }}:
			{{ deleteConfirmation.group.members.join(', ') }}
		</div>
		<div class="whitespace-normal mb-3">
			This cannot be undone. Type
			<span class="font-mono text-sm bg-accent p-1">{{ deleteConfirmation.confirmationCheck() }}</span>
			below to confirm.
		</div>
		<input type="text" class="input-textlike w-full" v-model="deleteConfirmation.confirmationInput"
			@input="deleteConfirmation.checkConfirmation" />
	</ModalPopup>
</template>

<script>
import Table from "../components/Table.vue";
import { PlusIcon, TrashIcon, ExclamationCircleIcon, UserIcon } from "@heroicons/vue/solid";
import { groupsInjectionKey, notificationsInjectionKey } from "../keys";
import { inject, onBeforeMount, reactive, ref, watch } from "vue";
import ModalPopup from "../components/ModalPopup.vue";
import SortCallbackButton from "../components/SortCallbackButton.vue";
import { useSpawn, errorStringHTML } from "@45drives/cockpit-helpers";

export default {
	setup(props, { emit }) {
		const notifications = inject(notificationsInjectionKey);
		const processing = ref(0);
		const groups = inject(groupsInjectionKey);
		const groupsSorted = ref([...groups.value]);
		let groupNames = groups.value.map(group => group.group);
		let gids = groups.value.map(group => group.gid);
		const newGroup = reactive({
			showModal: false,
			group: "",
			feedback: {},
			valid: false,
			validateInputs: () => {
				let result = true;
				newGroup.feedback.group = "";
				if (!newGroup.group) {
					newGroup.feedback.group = "Group name required.";
					result = false;
				} else if (!/^[a-z_][a-z0-9_-]*[\$a-z0-9_-]?$/.test(newGroup.group)) {
					const invalidCharacters = [...(newGroup.group.match(/(?:^[^a-z_]|(?<=.+)[^a-z0-9_-](?=.+)|[^\$a-z0-9_-]$)/g) ?? [])];
					newGroup.feedback.group =
						`Invalid character${invalidCharacters.length > 1 ? 's' : ''}: `
						+ invalidCharacters.filter((c, i, a) => a.indexOf(c) === i).map(char => `'${char}'`).join(', ');
					result = false;
				} else if (groupNames.includes(newGroup.group)) {
					newGroup.feedback.group = "Group already exists.";
					result = false;
				}
				if (newGroup.group.length > 32) {
					newGroup.feedback.group = (newGroup.feedback.group ?? "") + "\nGroup name too long.";
					result = false;
				}
				newGroup.valid = result;
			},
			applyCallback: async () => {
				processing.value++;
				try {
					await useSpawn(['groupadd', newGroup.group], { superuser: 'try' }).promise();
					notifications.value.constructNotification("Created group", `Successfully created group ${newGroup.group}`, 'success');
					emit('refreshGroups');
				} catch (state) {
					notifications.value.constructNotification("Failed to create group", errorStringHTML(state), 'error');
				} finally {
					newGroup.showModal = false;
					setTimeout(() => {
						newGroup.group = "";
						newGroup.validateInputs();
					}, 300);
					processing.value--;
				}
			},
			cancelCallback: () => {
				newGroup.showModal = false;
			},
		});
		newGroup.validateInputs(); // initial state
		const deleteConfirmation = reactive({
			showModal: false,
			group: null,
			applyText: "Confirm",
			confirmationCheck: () => `delete-${deleteConfirmation.group.group}`,
			confirmationInput: "",
			confirmed: false,
			ask: (group) => {
				deleteConfirmation.confirmed = false;
				deleteConfirmation.group = group;
				deleteConfirmation.confirmationInput = "";
				deleteConfirmation.showModal = true;
			},
			checkConfirmation: () => {
				deleteConfirmation.confirmed = deleteConfirmation.confirmationCheck() === deleteConfirmation.confirmationInput;
			},
			applyCallback: async () => {
				if (deleteConfirmation.confirmed) {
					processing.value++;
					try {
						await useSpawn(['groupdel', deleteConfirmation.group.group], { superuser: 'try' }).promise();
						notifications.value.constructNotification("Deleted group", `Successfully deleted group ${deleteConfirmation.group.group}`, 'success');
						emit('refreshGroups');
					} catch (state) {
						notifications.value.constructNotification("Failed to delete group", errorStringHTML(state), 'error');
					} finally {
						deleteConfirmation.reset();
						processing.value--;
					}
				}
				deleteConfirmation.reset();
			},
			cancelCallback: () => {
				deleteConfirmation.reset();
			},
			reset: () => {
				deleteConfirmation.showModal = false;
				setTimeout(() => {
					deleteConfirmation.confirmationInput = "";
					deleteConfirmation.group = null;
				}, 300);
			},
		});

		const sorter = reactive({
			callback: () => 0,
			group: (a, b) => a.group.localeCompare(b.group),
			gid: (a, b) => a.gid - b.gid,
		});

		const checkIfCanDelete = (group) => group.gid >= 1000 && group.gid !== 65534 && !group.isPrimary;

		watch(groups, () => {
			groupsSorted.value = [...groups.value].sort(sorter.callback);
			gids = groups.value.map(group => group.gid);
			groupNames = groups.value.map(group => group.group);
		}, { immediate: true });

		watch(() => sorter.callback, () => {
			groupsSorted.value.sort(sorter.callback);
		});

		return {
			processing,
			groups,
			groupsSorted,
			newGroup,
			deleteConfirmation,
			sorter,
			checkIfCanDelete,
		};
	},
	components: {
		Table,
		PlusIcon,
		ModalPopup,
		SortCallbackButton,
		TrashIcon,
		ExclamationCircleIcon,
		UserIcon,
	},
	emits: [
		'refreshGroups',
	],
}
</script>
