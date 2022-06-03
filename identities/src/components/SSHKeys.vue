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
				<button v-else class="btn btn-primary" @click="publicID.generateID">Generate SSH Key Pair</button>
				<button class="btn btn-secondary" @click="testSSH.showModal = true">Test Passwordless SSH</button>
			</div>
			<Table class="rounded-lg">
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
						<td class="text-muted">No keys. Click '+' to add one.</td>
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
	<ModalPopup
		:showModal="testSSH.showModal"
		headerText="Test passwordless SSH"
		applyText="Test"
		cancelText="Close"
		@apply="testSSH.test"
		@cancel="testSSH.close"
		autoWidth
	>
		<template #header>
			<div class="flex flex-row gap-2 items-center">
				<h3 class="text-header">Test passwordless SSH</h3>
				<LoadingSpinner class="size-icon" v-if="testSSH.running" />
			</div>
		</template>
		<label class="text-label block">SSH Target</label>
		<input
			type="text"
			class="input-textlike w-full"
			v-model="testSSH.target"
			@input="testSSH.reset"
			placeholder="user@hostname or just hostname"
		/>
		<div class="feedback-group" v-if="testSSH.result !== null">
			<CheckCircleIcon v-if="testSSH.result" class="size-icon icon-success" />
			<MinusCircleIcon v-else class="size-icon icon-error" />
			<span
				:class="[testSSH.result ? 'text-success' : 'text-error', 'text-feedback whitespace-pre-wrap']"
			>{{ testSSH.message }}</span>
		</div>
	</ModalPopup>
</template>

<script>
import { ref, reactive, watch, inject, onMounted, onUnmounted } from 'vue';
import { errorStringHTML, errorString, useSpawn, BetterCockpitFile } from '@45drives/cockpit-helpers';
import { MinusIcon, PlusIcon, ClipboardCopyIcon, ExclamationCircleIcon, CheckCircleIcon, MinusCircleIcon } from '@heroicons/vue/solid';
import Table from './Table.vue';
import { SSHAuthorizedKeysSyntax } from '@45drives/cockpit-syntaxes';
import ModalPopup from './ModalPopup.vue';
import PasswordModal from './PasswordModal.vue';
import { notificationsInjectionKey } from '../keys';
import LoadingSpinner from './LoadingSpinner.vue';

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
	setup(props, { emit }) {
		const notifications = inject(notificationsInjectionKey);
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
				emit('startProcessing');
				try {
					const tmpKeys = keys.value.filter(key => key !== confirmRemoveKey.key);
					await authorizedKeysFile.replace(tmpKeys);
				} catch (error) {
					notifications.value.constructNotification("Error removing authorized SSH key", errorStringHTML(error), 'error');
				} finally {
					confirmRemoveKey.key = null;
					confirmRemoveKey.showModal = false;
					emit('stopProcessing');
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
				emit('startProcessing');
				try {
					let tmpKeys = await SSHAuthorizedKeysSyntax.parse(addKey.keyText);
					if (!tmpKeys.length) {
						notifications.value.constructNotification("Error adding authorized SSH key", "No keys could be parsed.", 'error');
						return;
					}
					tmpKeys = [...keys.value, ...tmpKeys];
					await authorizedKeysFile.replace(tmpKeys);
				} catch (state) {
					notifications.value.constructNotification("Error adding authorized SSH key", errorStringHTML(state), 'error');
				} finally {
					addKey.keyText = "";
					addKey.showModal = false;
					emit('stopProcessing');
				}
			},
			cancel: () => {
				addKey.keyText = "";
				addKey.showModal = false;
			},
		});
		const publicID = reactive({
			showPassphraseModal: false,
			hasPublicID: false,
			checkPublicID: async () => {
				publicID.hasPublicID = await checkIfExists(`${props.user.home}/.ssh/id_rsa.pub`);
			},
			copyID: async () => {
				emit('startProcessing');
				try {
					navigator.clipboard.writeText(
						await cockpit.file(`${props.user.home}/.ssh/id_rsa.pub`, { superuser: 'try' }).read()
					);
					notifications.value.constructNotification("Copied public ID to clipboard", '', 'success');
				} catch (error) {
					notifications.value.constructNotification("Error reading public ID", errorStringHTML(error), 'error');
				} finally {
					emit('stopProcessing');
				}
			},
			generateID: async () => {
				emit('startProcessing');
				try {
					publicID.showPassphraseModal = true;
					const state = useSpawn(['sudo', '-u', props.user.user, 'ssh-keygen'], { superuser: 'try' })
					state.proc.input(`${props.user.home}/.ssh/id_rsa\n`, true);
					let pass;
					try {
						pass = await new Promise((resolve, reject) => {
							publicID.applyPasswordCallback = resolve;
							publicID.cancelPasswordCallback = reject;
						})
					} catch {
						notifications.value.constructNotification("SSH key generation canceled");
						publicID.showPassphraseModal = false;
						return;
					}
					state.proc.input(`${pass}\n${pass}`);
					await state.promise();
					notifications.value.constructNotification("Successfully generated SSH key pair", "It can now be copied and used.", 'success');
				} catch (error) {
					notifications.value.constructNotification("Error generating public ID", errorStringHTML(error), 'error');
				} finally {
					publicID.showPassphraseModal = false;
					emit('stopProcessing');
				}
				publicID.checkPublicID();
			},
			applyPasswordCallback: () => { },
			cancelPasswordCallback: () => { },
		});
		const testSSH = reactive({
			showModal: false,
			target: "",
			result: null,
			message: "",
			running: false,
			test: async () => {
				testSSH.running = true;
				try {
					const argv = [
						"sudo",
						"-u",
						props.user.user,
						"ssh",
						"-o",
						"StrictHostKeyChecking=no",
						"-o",
						"UserKnownHostsFile=/dev/null",
						"-o",
						"PasswordAuthentication=no",
						testSSH.target,
						"whoami"
					];
					const output = (await useSpawn(argv, { superuser: 'try' }).promise()).stdout.trim();
					testSSH.message = `Successfully logged in as ${output}@${testSSH.target.replace(/^[^@]*@/, '')}`;
					testSSH.result = true;
				} catch (state) {
					const errorMessage = errorString(state)
						.split('\n')
						.filter(line => !/to the list of known hosts/.test(line))
						.join('\n');
					testSSH.message = `Failed to log in:\n${errorMessage}`;
					testSSH.result = false;
				} finally {
					testSSH.running = false;
				}
			},
			close: () => {
				testSSH.showModal = false;
			},
			reset: () => {
				testSSH.result = null;
				testSSH.message = "";
			}
		});

		let authorizedKeysFile = null;

		const getKeys = async (promise) => {
			if (!props.user?.home)
				return;
			emit('startProcessing');
			try {
				keys.value = await promise ?? [];
			} catch (error) {
				notifications.value.constructNotification("Error getting authorized SSH keys", errorStringHTML(error), 'error');
			} finally {
				emit('stopProcessing');
			}
		};

		const createSshDir = async (path) => {
			emit('startProcessing');
			try {
				const authorizedKeysPathArr = path.split(/(?<!\\)\//);
				const sshDir = authorizedKeysPathArr.slice(0, authorizedKeysPathArr.length - 1).join('/');
				if (! await checkIfExists(sshDir)) {
					await useSpawn(['mkdir', '-p', sshDir], { superuser: 'try' }).promise();
					await useSpawn(['chmod', '700', sshDir], { superuser: 'try' }).promise();
					await useSpawn(['chown', `${props.user.user}:${props.user.user}`, sshDir], { superuser: 'try' }).promise();
				}
				await useSpawn(['touch', path], { superuser: 'try' }).promise();
				await useSpawn(['chmod', '600', path], { superuser: 'try' }).promise();
				await useSpawn(['chown', `${props.user.user}:${props.user.user}`, path], { superuser: 'try' }).promise();
				notifications.value.constructNotification("Fixed missing SSH directory/files", '', 'success');
			} catch (state) {
				notifications.value.constructNotification("Failed to create SSH directory / authorized_keys", errorStringHTML(state), 'error');
			} finally {
				emit('stopProcessing');
			}
			initSshManagement();
		}

		const validateAuthorizedKeysPath = async (path) => {
			const authorizedKeysPathArr = path.split(/(?<!\\)\//);
			const sshDir = authorizedKeysPathArr.slice(0, authorizedKeysPathArr.length - 1).join('/');
			if (! await checkIfAllowed(props.user.home)) {
				// permission denied
				notifications.value.constructNotification("Permission denied for SSH", "You cannot manage SSH for this user.", 'warning');
				return false;
			}
			if (! await checkIfExists(sshDir)) {
				// allow to create dir and file
				notifications.value.constructNotification("SSH directory doesn't exist", `${sshDir} does not exist, but you can create it now.`, 'warning')
					.addAction("Fix", () => createSshDir(path));
				return false;
			}
			if (! await checkIfAllowed(sshDir)) {
				// permission denied
				notifications.value.constructNotification("Permission denied for SSH", "You cannot manage SSH for this user.", 'warning');
				return false;
			}
			if (! await checkIfExists(path)) {
				// allow to create (dir and) file
				notifications.value.constructNotification("authorized_keys file doesn't exist", `${path} does not exist, but you can create it now.`, 'warning')
					.addAction("Fix", () => createSshDir(path));
				return false;
			}
			if (! await checkIfAllowed(path)) {
				// permission denied
				notifications.value.constructNotification("Permission denied for SSH", "You cannot manage SSH for this user.", 'warning');
				return false;
			}
			return true;
		}

		let watchHandle = null;

		const initSshManagement = async () => {
			if (!props.user.home)
				return;
			emit('startProcessing');
			try {
				if (watchHandle)
					watchHandle.remove();
				const authorizedKeysFilePath = `${props.user.home}/.ssh/authorized_keys`;
				try {
					valid.value = await validateAuthorizedKeysPath(authorizedKeysFilePath);
				} catch (error) {
					notifications.value.constructNotification("Error checking path: ${}", errorStringHTML(error), 'error');
					return;
				}
				authorizedKeysFile = new BetterCockpitFile(
					authorizedKeysFilePath,
					authorizedKeysFileOpts
				);
				watchHandle = authorizedKeysFile.watch(getKeys);
				publicID.checkPublicID();
			} finally {
				emit('stopProcessing');
			}
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
			testSSH,
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
		CheckCircleIcon,
		MinusCircleIcon,
		LoadingSpinner
	},
	emits: [
		'startProcessing',
		'stopProcessing',
	],
}
</script>
