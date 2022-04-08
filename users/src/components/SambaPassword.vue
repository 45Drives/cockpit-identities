<template>
	<div>
		<label class="block text-sm font-medium">Samba</label>
		<div class="flex flex-row space-x-3 mt-1">
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
		v-if="sambaPassword.showModal"
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
		:onApply="removeSambaPassword"
		:onCancel="() => sambaPassword.showRemoveModal = false"
		applyText="Yes"
		cancelText="No"
	>
		<div class="flex flex-row">
			<ExclamationCircleIcon class="w-5 h-5 mr-2 text-red-600" />
			<span>They will no longer be able to access Samba shares.</span>
		</div>
	</ModalPopup>
</template>

<script>
import { ExclamationCircleIcon } from '@heroicons/vue/solid';
import { reactive, watch, inject, ref } from 'vue';
import { useSpawn, errorStringHTML } from "../hooks/useSpawn";
import { notificationsInjectionKey, processingInjectionKey } from '../keys';
import ModalPopup from './ModalPopup.vue';
import PasswordModal from './PasswordModal.vue';

export default {
	props: {
		user: String,
	},
	setup(props) {
		const sambaPassword = reactive({ showModal: false, showRemoveModal: false, isSet: false });
		const processing = inject(processingInjectionKey);
		const notifications = inject(notificationsInjectionKey).value;

		const checkIfSmbpasswdSet = async () => {
			processing.value++;
			try {
				await useSpawn(['pdbedit', '-L', '-u', props.user]).promise();
				sambaPassword.isSet = true;
			} catch (state) {
				sambaPassword.isSet = false;
			}
			processing.value--;
		};

		const setSambaPassword = async (password) => {
			processing.value++;
			try {
				const state = useSpawn(['smbpasswd', '-a', '-s', props.user], { superuser: 'try' });
				state.proc.input(`${password}\n${password}\n`);
				await state.promise();
				sambaPassword.isSet = true;
				notifications.constructNotification("Set Samba password", `Samba password for ${props.user} was set successfully.`, 'success');
			} catch (state) {
				notifications.constructNotification(`Failed to set Samba password for ${props.user}`, errorStringHTML(state), 'error');
				checkIfSmbpasswdSet();
			}
			sambaPassword.showModal = false;
			processing.value--;
		};

		const removeSambaPassword = async () => {
			processing.value++;
			try {
				await useSpawn(['smbpasswd', '-x', props.user], { superuser: 'try' }).promise();
				sambaPassword.isSet = false;
				notifications.constructNotification("Removed Samba password", `Samba password for ${props.user} was removed successfully.`, 'success');
			} catch (state) {
				notifications.constructNotification(`Failed to remove Samba password for ${props.user}`, errorStringHTML(state), 'error');
				checkIfSmbpasswdSet();
			}
			sambaPassword.showRemoveModal = false;
			processing.value--;
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
	}
}
</script>
