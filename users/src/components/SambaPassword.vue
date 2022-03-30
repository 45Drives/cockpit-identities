<template>
	<div>
		<label class="block text-sm font-medium">Samba Credentials</label>
		<div class="flex flex-row space-x-3 mt-1">
			<button
				class="btn btn-primary"
				@click="showModal('set')"
			>{{ smbpasswd.isSet ? 'Change' : 'Set' }} Samba Password</button>
			<button
				class="btn btn-primary"
				@click="showModal('remove')"
				v-if="smbpasswd.isSet"
			>Remove Samba Password</button>
		</div>
	</div>
	<TransitionRoot as="template" :show="smbpasswd.showModal">
		<Dialog as="div" class="fixed z-10 inset-0 overflow-y-auto">
			<div
				class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
			>
				<TransitionChild
					as="template"
					enter="ease-out duration-300"
					enter-from="opacity-0"
					enter-to="opacity-100"
					leave="ease-in duration-200"
					leave-from="opacity-100"
					leave-to="opacity-0"
				>
					<DialogOverlay class="fixed inset-0 bg-neutral-500/75 dark:bg-black/50 transition-opacity" />
				</TransitionChild>

				<!-- This element is to trick the browser into centering the modal contents. -->
				<span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
				<TransitionChild
					as="template"
					enter="ease-out duration-300"
					enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
					enter-to="opacity-100 translate-y-0 sm:scale-100"
					leave="ease-in duration-200"
					leave-from="opacity-100 translate-y-0 sm:scale-100"
					leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
				>
					<div
						class="relative inline-block align-bottom bg-white dark:bg-neutral-900 px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
					>
						<div class="sm:flex sm:items-start mb-2">
							<div v-if="state === 'set'" class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
								<DialogTitle
									as="h3"
									class="text-lg leading-6 font-medium"
								>{{ smbpasswd.isSet ? "Change" : "Set" }} Samba Password for {{ user.name === "" ? user.user : user.name }}</DialogTitle>
								<div class="my-2 space-y-4">
									<input
										type="password"
										autocomplete="new-password"
										class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
										placeholder="Type Password"
										v-model="smbpasswd.pass1"
									/>
									<input
										type="password"
										autocomplete="new-password"
										class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
										placeholder="Repeat Password"
										v-model="smbpasswd.pass2"
									/>
									<div
										class="mt-2 text-sm text-red-600 flex flex-row justify-start items-center space-x-1"
										v-if="feedback.smbpasswd"
									>
										<ExclamationCircleIcon class="w-5 h-5 inline" />
										<span>{{ feedback.smbpasswd }}</span>
									</div>
								</div>
							</div>
							<div v-else-if="state === 'remove'" class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
								<DialogTitle
									as="h3"
									class="text-lg leading-6 font-medium"
								>Remove Samba Password for {{ user.name === "" ? user.user : user.name }}?</DialogTitle>
								<div class="my-2 space-y-4">This cannot be undone.</div>
							</div>
						</div>
						<div class="flex flex-row space-x-3 justify-end">
							<button
								type="button"
								class="btn btn-secondary"
								@click="smbpasswd.showModal = false"
								ref="cancelButtonRef"
							>Cancel</button>
							<button
								type="button"
								:class="['btn', 'btn-primary']"
								@click="state === 'set' ? setSmbpasswd() : removeSmbpasswd()"
								:disabled="state === 'set' ? feedback.smbpasswd : false"
							>{{ state === 'set' ? 'Apply' : 'Yes' }}</button>
						</div>
					</div>
				</TransitionChild>
			</div>
		</Dialog>
	</TransitionRoot>
</template>

<script>
import { Dialog, DialogOverlay, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ExclamationCircleIcon } from '@heroicons/vue/solid';
import { reactive, watch, inject, ref } from 'vue';
import { useSpawn, errorString } from "../hooks/useSpawn";
export default {
	props: {
		user: Object,
	},
	setup(props) {
		const smbpasswd = reactive({ pass1: "", pass2: "", showModal: false, isSet: false });
		const feedback = reactive({});
		const processing = inject('processing');
		const state = ref("set"); // set or remove

		const checkIfSmbpasswdSet = async () => {
			processing.value++;
			try {
				await useSpawn(['pdbedit', '-L', '-u', props.user.user]).promise();
				smbpasswd.isSet = true;
			} catch (state) {
				smbpasswd.isSet = false;
			}
			processing.value--;
		};

		const setSmbpasswd = async () => {
			processing.value++;
			try {
				const state = useSpawn(['smbpasswd', '-a', '-s', props.user.user], { superuser: 'try' });
				state.proc.input(`${smbpasswd.pass1}\n${smbpasswd.pass2}\n`);
				await state.promise();
				setTimeout(() => Object.assign(smbpasswd, { isSet: true, pass1: "", pass2: "" }), 500); // to avoid seeing changes before modal hides
			} catch (state) {
				alert("Failed to set smbpasswd: " + errorString(state));
				checkIfSmbpasswdSet();
			}
			smbpasswd.showModal = false;
			processing.value--;
		};

		const removeSmbpasswd = async () => {
			processing.value++;
			try {
				await useSpawn(['smbpasswd', '-x', props.user.user], { superuser: 'try' }).promise();
				smbpasswd.isSet = false;
			} catch (state) {
				alert("Failed to set smbpasswd: " + errorString(state));
				checkIfSmbpasswdSet();
			}
			smbpasswd.showModal = false;
			processing.value--;
		};

		const showModal = (newState) => {
			state.value = newState;
			smbpasswd.showModal = true;
		};

		watch(smbpasswd, () => {
			if (!smbpasswd.pass1 || !smbpasswd.pass2)
				feedback.smbpasswd = "Password required.";
			else if (smbpasswd.pass1 !== smbpasswd.pass2)
				feedback.smbpasswd = "Passwords do not match.";
			else
				delete feedback.smbpasswd;
		})

		watch(props.user, () => {
			checkIfSmbpasswdSet();
		}, { immediate: true });

		return {
			smbpasswd,
			feedback,
			state,
			checkIfSmbpasswdSet,
			setSmbpasswd,
			removeSmbpasswd,
			showModal,
		}
	},
	components: {
		Dialog,
		DialogOverlay,
		DialogTitle,
		TransitionChild,
		TransitionRoot,
		ExclamationCircleIcon,
	}
}
</script>
