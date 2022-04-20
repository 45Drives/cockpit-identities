<template>
	<div>
		<label class="block text-label">SSH</label>
		<div class="space-y-content">
			<div class="button-group-row-wrap">
				<button class="btn btn-primary">
					<div class="flex flex-row space-x-2 items-center">
						<span>Copy SSH Public ID</span>
						<ClipboardCopyIcon class="size-icon" />
					</div>
				</button>
				<button class="btn btn-primary" @click="getKeys">
					<div class="flex flex-row space-x-2 items-center">
						<span>Refresh keys</span>
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
						<th scope="col" class="sr-only">comment</th>
						<th class="sr-only">fingerprint</th>
						<th scope="col" class="sr-only">Remove</th>
					</tr>
				</template>
				<template #tbody>
					<tr v-for="(key, index) in keys">
						<td>{{ key.comment }}</td>
						<td>{{ key.fingerprint }}</td>
						<td class="flex flex-row justify-end">
							<button @click="confirmRemoveKey.ask(key)">
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
	</div>
	<ModalPopup
		:showModal="addKey.showModal"
		headerText="Add new authorized SSH key"
		applyText="Add"
		@apply="addKey.apply"
		@cancel="addKey.cancel"
	>
		<textarea
			v-model="addKey.keyText"
			class="input-textlike w-full h-40 overflow-y-auto"
			style="resize: none;"
			placeholder="Begins with 'ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519', 'sk-ecdsa-sha2-nistp256@openssh.com', or 'sk-ssh-ed25519@openssh.com'"
		/>
	</ModalPopup>
	<ModalPopup
		:showModal="confirmRemoveKey.showModal"
		headerText="Remove authorized SSH key?"
		applyText="Yes"
		cancelText="No"
		applyDangerous
		@apply="confirmRemoveKey.apply"
		@cancel="confirmRemoveKey.cancel"
		autoWidth
	>
		<template #icon>
			<ExclamationCircleIcon class="size-icon-xl icon-danger" />
		</template>
		<div>This cannot be undone.</div>
		<div
			class="text-muted"
		>Fingerprint: {{ confirmRemoveKey.key?.comment ?? '' }} {{ confirmRemoveKey.key?.fingerprint ?? "no key selected" }}</div>
	</ModalPopup>
</template>

<script>
import { ref, reactive, watch, inject, onMounted } from 'vue';
import { errorStringHTML, useSpawn, BetterCockpitFile  } from '@45drives/cockpit-helpers';
import { MinusIcon, PlusIcon, ClipboardCopyIcon, ExclamationCircleIcon } from '@heroicons/vue/solid';
import Table from './Table.vue';
import { SSHAuthorizedKeysSyntax } from '@45drives/cockpit-syntaxes';
import ModalPopup from './ModalPopup.vue';
import { notificationsInjectionKey } from '../keys';

const authorizedKeysFileOpts = {
	superuser: 'try',
	syntax: SSHAuthorizedKeysSyntax,
	dne: 'fail',
	persistStat: true
};

export default {
	props: {
		user: Object,
	},
	setup(props) {
		const notifications = inject(notificationsInjectionKey).value;
		const keys = ref([]);
		const confirmRemoveKey = reactive({
			showModal: false,
			key: null,
			ask: (key) => {
				confirmRemoveKey.key = key;
				confirmRemoveKey.showModal = true;
			},
			apply: async () => {
				try {
					const tmpKeys = keys.value.filter(key => key !== confirmRemoveKey.key);
					await authorizedKeysFile.replace(tmpKeys);
					keys.value = tmpKeys;
				} catch (error) {
					notifications.constructNotification("Error removing authorized SSH key", errorStringHTML(error), 'error');
				} finally {
					confirmRemoveKey.key = null;
					confirmRemoveKey.showModal = false;
				}
			},
			cancel: () => {
				confirmRemoveKey.key = null;
				confirmRemoveKey.showModal = false;
			},
		});
		const addKey = reactive({
			showModal: false,
			keyText: "",
			apply: async () => {
				try {
					let tmpKeys = await SSHAuthorizedKeysSyntax.parse(addKey.keyText);
					console.log(tmpKeys);
					if (!tmpKeys.length) {
						notifications.constructNotification("Error adding authorized SSH key", "No keys could be parsed.", 'error');
						return;
					}
					tmpKeys = [...keys.value, ...tmpKeys];
					await authorizedKeysFile.replace(tmpKeys);
					keys.value = tmpKeys;
				} catch (state) {
					notifications.constructNotification("Error adding authorized SSH key", errorStringHTML(state), 'error');
				} finally {
					addKey.keyText = "";
					addKey.showModal = false;
				}
			},
			cancel: () => {
				addKey.keyText = "";
				addKey.showModal = false;
			},
		});


		let authorizedKeysFile = new BetterCockpitFile(
			`${props.user.home}/.ssh/authorized_keys`,
			authorizedKeysFileOpts
		);

		const getKeys = async () => {
			if (!props.user?.home)
				return;
			try {
				let tmpKeys = await authorizedKeysFile.read() ?? [];
				console.log(tmpKeys);
				keys.value = tmpKeys ?? [];
			} catch (error) {
				notifications.constructNotification("Error getting authorized SSH keys", errorStringHTML(error), 'error');
			}
		};

		watch(props.user, () => {
			authorizedKeysFile = new BetterCockpitFile(
				`${props.user.home}/.ssh/authorized_keys`,
				authorizedKeysFileOpts
			);
			getKeys();
		}, { immediate: true });

		return {
			keys,
			confirmRemoveKey,
			addKey,
			getKeys,
		}
	},
	components: {
		PlusIcon,
		MinusIcon,
		Table,
		ClipboardCopyIcon,
		ModalPopup,
		ExclamationCircleIcon,
	}
}
</script>
