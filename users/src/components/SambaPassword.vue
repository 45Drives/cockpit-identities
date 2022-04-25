<template>
	<div>
		<label class="block text-label">Samba</label>
		<div class="button-group-row-wrap">
			<button
				class="btn btn-primary"
				@click="sambaPassword.showModal = true"
			>{{ sambaPassword.isSet ? 'Change' : 'Set' }} Samba Password</button>
			<button
				class="btn btn-primary"
				@click="sambaPassword.showRemoveModal = true"
				v-if="sambaPassword.isSet"
			>Remove Samba Password</button>
		</div>
	</div>
	<PasswordModal
		:showModal="sambaPassword.showModal"
		:user="user"
		:headerText="`${sambaPassword.isSet ? 'Change' : 'Set'} Samba password for ${user}`"
		@apply="setSambaPassword"
		@cancel="sambaPassword.showModal = false"
		requireDifferentFromUser
		allowEmpty
	/>
	<ModalPopup
		:showModal="sambaPassword.showRemoveModal"
		:headerText="`Remove Samba password for ${user}?`"
		@apply="removeSambaPassword"
		@cancel="() => sambaPassword.showRemoveModal = false"
		applyText="Yes"
		cancelText="No"
	>
			<template #icon><ExclamationCircleIcon class="size-icon-xl icon-error" /></template>
			They will no longer be able to access Samba shares.
	</ModalPopup>
</template>

<script>
import { ExclamationCircleIcon } from '@heroicons/vue/solid';
import { reactive, watch, inject, ref } from 'vue';
import { useSpawn, errorStringHTML } from "@45drives/cockpit-helpers";
import { notificationsInjectionKey } from '../keys';
import ModalPopup from './ModalPopup.vue';
import PasswordModal from './PasswordModal.vue';

export default {
	props: {
		user: String,
	},
	setup(props, { emit }) {
		const sambaPassword = reactive({ showModal: false, showRemoveModal: false, isSet: false });
		const notifications = inject(notificationsInjectionKey).value;

		const checkIfSmbpasswdSet = async () => {
			emit('startProcessing');
			try {
				await useSpawn(['pdbedit', '-L', '-u', props.user], { superuser: 'try' }).promise();
				sambaPassword.isSet = true;
			} catch (state) {
				sambaPassword.isSet = false;
			} finally {
				emit('stopProcessing');
			}
		};

		const setSambaPassword = async (password) => {
			emit('startProcessing');
			try {
				const state = useSpawn(['smbpasswd', '-a', '-s', props.user], { superuser: 'try' });
				state.proc.input(`${password}\n${password}\n`);
				await state.promise();
				sambaPassword.isSet = true;
				notifications.constructNotification("Set Samba password", `Samba password for ${props.user} was set successfully.`, 'success');
			} catch (state) {
				notifications.constructNotification(`Failed to set Samba password for ${props.user}`, errorStringHTML(state), 'error');
				checkIfSmbpasswdSet();
			} finally {
				sambaPassword.showModal = false;
				emit('stopProcessing');
			}
		};

		const removeSambaPassword = async () => {
			emit('startProcessing');
			try {
				await useSpawn(['smbpasswd', '-x', props.user], { superuser: 'try' }).promise();
				sambaPassword.isSet = false;
				notifications.constructNotification("Removed Samba password", `Samba password for ${props.user} was removed successfully.`, 'success');
			} catch (state) {
				notifications.constructNotification(`Failed to remove Samba password for ${props.user}`, errorStringHTML(state), 'error');
				checkIfSmbpasswdSet();
			} finally {
				sambaPassword.showRemoveModal = false;
				emit('stopProcessing');
			}
		};

		watch(props.user, () => {
			checkIfSmbpasswdSet();
		}, { immediate: true });

		return {
			sambaPassword,
			checkIfSmbpasswdSet,
			setSambaPassword,
			removeSambaPassword,
		}
	},
	components: {
		ModalPopup,
		PasswordModal,
		ExclamationCircleIcon,
	},
	emits: [
		'startProcessing',
		'stopProcessing',
	]
}
</script>
