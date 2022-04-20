<template>
	<div v-if="valid">
		<label class="block text-label">SSH</label>
		<div class="space-y-content">
			<div class="button-group-row-wrap">
				<button v-if="publicID.hasPublicID" class="btn btn-primary" @click="publicID.copyID">
					<div class="flex flex-row space-x-2 items-center">
						<span>Copy SSH Public ID</span>
						<ClipboardCopyIcon class="size-icon" />
					</div>
				</button>
				<button v-else class="btn btn-primary" @click="publicID.generateID">Generate SSH Public ID</button>
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
	<PasswordModal
		allowEmpty
		requireDifferentFromUser
		:user="user.user"
		headerText="Set passphrase for ID (empty for no passphrase)"
		:showModal="publicID.showPassphraseModal"
		@apply="publicID.applyPasswordCallback"
		@cancel="publicID.cancelPasswordCallback"
	/>
</template>

<script>
import { ref, reactive, watch, inject, onMounted, onUnmounted } from 'vue';
import { errorStringHTML, errorString, useSpawn, BetterCockpitFile } from '@45drives/cockpit-helpers';
import { MinusIcon, PlusIcon, ClipboardCopyIcon, ExclamationCircleIcon } from '@heroicons/vue/solid';
import Table from './Table.vue';
import { SSHAuthorizedKeysSyntax } from '@45drives/cockpit-syntaxes';
import ModalPopup from './ModalPopup.vue';
import PasswordModal from './PasswordModal.vue';
import { notificationsInjectionKey } from '../keys';

const authorizedKeysFileOpts = {
	superuser: 'try',
	syntax: SSHAuthorizedKeysSyntax,
	dne: 'fail',
	persistStat: true
};

const test = async (check, path) => {
	try {
		await useSpawn(['test', check, path], { superuser: 'try' }).promise();
		return true;
	} catch (state) {
		if (state.status === 1)
			return false;
		throw new Error("Failed to check path: " + path + ": " + errorString(state));
	}
}

const checkIfExists = async (path) => {
	return test('-e', path);
}

const checkIfAllowed = async (path) => {
	if (await test('-d', path)) {
		// directory
		return (
			await test('-r', path) &&
			await test('-w', path) &&
			await test('-x', path)
		)
	} else if (await test('-f', path)) {
		// file
		return (
			await test('-r', path) &&
			await test('-w', path)
		)
	} else {
		throw new Error("Path does not exist: " + path);
	}
}

export default {
	props: {
		user: Object,
	},
	setup(props) {
		const notifications = inject(notificationsInjectionKey).value;
		const keys = ref([]);
		const valid = ref(false);
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
		const publicID = reactive({
			hasPublicID: false,
			checkPublicID: async () => {
				publicID.hasPublicID = await checkIfExists(`${props.user.home}/.ssh/id_rsa.pub`);
			},
			copyID: async () => {
				try {
					navigator.clipboard.writeText(
						await cockpit.file(`${props.user.home}/.ssh/id_rsa.pub`, { superuser: 'try' }).read()
					);
					notifications.constructNotification("Copied public ID to clipboard", '', 'success');
				} catch (error) {
					notifications.constructNotification("Error reading public ID", errorStringHTML(error), 'error');
				}
			},
			generateID: async () => {
				publicID.showPassphraseModal = true;
				try {
					const state = useSpawn(['sudo', '-u', props.user.user, 'ssh-keygen'], { superuser: 'try' })
					state.proc.input(`${props.user.home}/.ssh/id_rsa\n`, true);
					let pass;
					try {
						pass = await new Promise((resolve, reject) => {
							publicID.applyPasswordCallback = resolve;
							publicID.cancelPasswordCallback = reject;
						})
					} catch {
						notifications.constructNotification("SSH key generation canceled");
						publicID.showPassphraseModal = false;
						return;
					}
					state.proc.input(`${pass}\n${pass}`);
					await state.promise();
					notifications.constructNotification("Successfully generated SSH key pair", "It can now be copied and used.", 'success');
				} catch (error) {
					notifications.constructNotification("Error generating public ID", errorStringHTML(error), 'error');
				}
				publicID.showPassphraseModal = false;
				publicID.checkPublicID();
			},
			showPassphraseModal: false,
			applyPasswordCallback: () => { },
			cancelPasswordCallback: () => { },
		});

		let authorizedKeysFile = null;

		const getKeys = async (promise) => {
			if (!props.user?.home)
				return;
			try {
				keys.value = await promise ?? [];
				console.log(keys.value);
			} catch (error) {
				notifications.constructNotification("Error getting authorized SSH keys", errorStringHTML(error), 'error');
			}
		};

		const createSshDir = async (path) => {
			const authorizedKeysPathArr = path.split(/(?<!\\)\//);
			const sshDir = authorizedKeysPathArr.slice(0, authorizedKeysPathArr.length - 1).join('/');
			try {
				if (! await checkIfExists(sshDir)) {
					await useSpawn(['mkdir', '-p', sshDir], { superuser: 'try' }).promise();
					await useSpawn(['chmod', '700', sshDir], { superuser: 'try' }).promise();
					await useSpawn(['chown', `${props.user.user}:${props.user.user}`, sshDir], { superuser: 'try' }).promise();
				}
				await useSpawn(['touch', path], { superuser: 'try' }).promise();
				await useSpawn(['chmod', '600', path], { superuser: 'try' }).promise();
				await useSpawn(['chown', `${props.user.user}:${props.user.user}`, path], { superuser: 'try' }).promise();
				notifications.constructNotification("Fixed missing SSH directory/files", '', 'success');
			} catch (state) {
				notifications.constructNotification("Failed to create SSH directory / authorized_keys", errorStringHTML(state), 'error');
			}
			initSshManagement();
		}

		const validateAuthorizedKeysPath = async (path) => {
			const authorizedKeysPathArr = path.split(/(?<!\\)\//);
			const sshDir = authorizedKeysPathArr.slice(0, authorizedKeysPathArr.length - 1).join('/');
			if (! await checkIfAllowed(props.user.home)) {
				// permission denied
				notifications.constructNotification("Permission denied for SSH", "You cannot manage SSH for this user.", 'warning');
				return false;
			}
			if (! await checkIfExists(sshDir)) {
				// allow to create dir and file
				notifications.constructNotification("SSH directory doesn't exist", `${sshDir} does not exist, but you can create it now.`, 'warning', 0)
					.addAction("Fix", () => createSshDir(path));
				return false;
			}
			if (! await checkIfAllowed(sshDir)) {
				// permission denied
				notifications.constructNotification("Permission denied for SSH", "You cannot manage SSH for this user.", 'warning');
				return false;
			}
			if (! await checkIfExists(path)) {
				// allow to create (dir and) file
				notifications.constructNotification("authorized_keys file doesn't exist", `${path} does not exist, but you can create it now.`, 'warning', 0)
					.addAction("Fix", () => createSshDir(path));
				return false;
			}
			if (! await checkIfAllowed(path)) {
				// permission denied
				notifications.constructNotification("Permission denied for SSH", "You cannot manage SSH for this user.", 'warning');
				return false;
			}
			return true;
		}

		let watchHandle = null;

		const initSshManagement = async () => {
			if (!props.user.home)
				return;
			if (watchHandle)
				watchHandle.remove();
			const authorizedKeysFilePath = `${props.user.home}/.ssh/authorized_keys`;
			try {
				valid.value = await validateAuthorizedKeysPath(authorizedKeysFilePath);
			} catch (error) {
				notifications.constructNotification("Error checking path: ${}", errorStringHTML(error), 'error');
				return;
			}
			authorizedKeysFile = new BetterCockpitFile(
				authorizedKeysFilePath,
				authorizedKeysFileOpts
			);
			watchHandle = authorizedKeysFile.watch(getKeys);
			publicID.checkPublicID();
		}

		watch(props.user, () => {
			initSshManagement();
		}, { immediate: true });

		onUnmounted(() => {
			if (watchHandle)
				watchHandle.remove();
		})

		return {
			keys,
			valid,
			confirmRemoveKey,
			addKey,
			publicID,
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
		PasswordModal,
	}
}
</script>
