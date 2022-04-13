<template>
	<div>
		<label class="block text-label">SSH</label>
		<div class="button-group-row-wrap">
			<button class="btn btn-primary">
				<div class="flex flex-row space-x-2 items-center">
					<span>Copy SSH Public ID</span>
					<ClipboardCopyIcon class="size-icon" />
				</div>
			</button>
		</div>
		<Table>
			<template #header>
				<div class="flex flex-row justify-between items-center">
					<div>Authorized SSH Access Keys</div>
					<!-- TODO: reword or add tooltip to clarify that these are other machines' keys -->
					<button @click="addKey.showModal = true">
						<PlusIcon class="size-icon icon-default" />
					</button>
				</div>
			</template>
			<template #thead>
				<tr>
					<th
						scope="col"
						class="sr-only"
					>{{ user.name === "" ? user.user : user.name }}'s Authorized Public SSH Keys</th>
					<th scope="col" class="sr-only">Remove</th>
				</tr>
			</template>
			<template #tbody>
				<tr v-for="(key, index) in keys">
					<td>{{ key }}</td>
					<td class="flex flex-row justify-end">
						<button @click="showModal('remove', key)">
							<MinusIcon class="size-icon icon-danger" />
						</button>
					</td>
				</tr>
				<tr v-if="keys.length === 0">
					<td class="text-muted">No keys. Click "+" to add one.</td>
				</tr>
			</template>
		</Table>
	</div>
	<ModalPopup
		:showModal="addKey.showModal"
		headerText="Add new authorized SSH key"
		applyText="Add"
		@apply="addKey.apply"
		@cancel="addKey.cancel"
	></ModalPopup>
</template>

<script>
import { ref, reactive, watch } from 'vue';
import { useSpawn } from '../hooks/useSpawn';
import { MinusIcon, PlusIcon, ClipboardCopyIcon } from '@heroicons/vue/solid';
import Table from './Table.vue';
import { SSHAuthorizedKeysSyntax } from '../hooks/syntax';
import ModalPopup from './ModalPopup.vue';

export default {
	props: {
		user: Object,
	},
	setup(props) {
		const keys = ref([]);
		const confirmRemoveKey = reactive({
			showModal: false,
		});
		const addKey = reactive({
			showModal: false,
			key: "",
			apply: async () => {
				throw new Error("test error");
				try {

				} catch (state) {

				} finally {
					addKey.key = "";
					addKey.showModal = false;
				}
			},
			cancel: () => {
				addKey.key = "";
				addKey.showModal = false;
			},
		});

		const authorizedKeysFile = cockpit.file(`${props.user.home}/.ssh/authorized_keys`, { superuser: 'try', syntax: SSHAuthorizedKeysSyntax });

		let modalConfirmCallback = () => { }

		const getKeys = async () => {
			let tmpKeys = [
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
			];
			try {

			} catch (error) {

			}
			keys.value = [...tmpKeys];
		};

		const showModal = (action, key) => {
			if (action === 'add') {
				modalConfirmCallback = () => keys.value = [...keys.value, newKey].sort();
			} else if (action === 'remove') {
				modalConfirmCallback = () => keys.value = keys.value.filter(a => a === key);
			}
		}

		watch(props.user, () => {
			getKeys();
		}, { immediate: true });

		return {
			keys,
			confirmRemoveKey,
			addKey,
		}
	},
	components: {
		PlusIcon,
		MinusIcon,
		Table,
		ClipboardCopyIcon,
		ModalPopup
	}
}
</script>
