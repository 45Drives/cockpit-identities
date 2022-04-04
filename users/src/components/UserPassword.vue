<template>
	<div v-if="!modalOnly">
		<label class="block text-sm font-medium">User Login</label>
		<div class="flex flex-row space-x-3 mt-1">
			<button
				class="btn btn-primary"
				@click="userPassword.showModal = true"
			>{{ userPassword.isSet ? 'Change' : 'Set' }} Account Password</button>
			<button
				class="btn btn-primary"
				@click="showModal('remove')"
				v-if="userPassword.isSet"
			>Remove Account Password</button>
		</div>
		<ModalPopup
			:showModal="showRemovePasswordModal"
			:onApply="removePassword"
			:onCancel="showRemovePasswordModal = false"
			applyText="Yes"
			cancelText="No"
		>
			<div class="flex flex-row">
				<ExclamationCircleIcon class="w-5 h-5 mr-2 text-red-600" />
				<span>Remove password for {{ user }}? This cannot be undone.</span>
			</div>
		</ModalPopup>
	</div>
	<ModalPopup
		:showModal="userPassword.showModal"
		:disableContinue="!userPassword.valid"
		:onApply="userPassword.applyCallback"
		noCancel
	>
		<div class="my-2 space-y-4">
			<h3 class="text-lg font-semibold">Set Password for {{user}}</h3>
			<input
				type="text"
				autocomplete="new-password"
				class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
				placeholder="Type Password"
				v-model="userPassword.pass1"
			/>
			<input
				type="text"
				autocomplete="new-password"
				class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
				placeholder="Repeat Password"
				v-model="userPassword.pass2"
			/>
			<div>
				The password should satisfy the following requirements:
				<div class="inline-flex flex-col items-stretch">
					<div
						v-for="requirement in userPassword.requirements"
						class="flex flex-row text-sm items-center"
					>
						<span class="grow">{{ requirement.title }}</span>
						<CheckIcon v-if="requirement.satisfied" class="w-4 h-4 ml-2 text-green-600" />
						<XIcon v-else class="w-4 h-4 ml-2 text-red-600" />
					</div>
				</div>
			</div>
			<div
				class="mt-2 text-sm text-red-600 flex flex-row justify-start items-center space-x-1"
				v-if="userPassword.feedback"
			>
				<ExclamationCircleIcon class="w-5 h-5 inline" />
				<span>{{ userPassword.feedback }}</span>
			</div>
		</div>
	</ModalPopup>
</template>

<script>
import ModalPopup from "./ModalPopup.vue";
import { ExclamationCircleIcon, CheckIcon, XIcon } from '@heroicons/vue/solid';
import { ref, reactive, watch, inject } from 'vue';
import { useSpawn, errorString } from '../hooks/useSpawn';

export default {
	props: {
		user: String, // just the username
		modalOnly: {
			type: Boolean,
			required: false,
			default: false,
		},
	},
	setup(props) {
		const userPassword = reactive({
			pass1: "",
			pass2: "",
			feedback: "",
			showModal: false,
			applyCallback: () => userPassword.showModal = false,
			cancelCallback: () => userPassword.showModal = false,
			isSet: false,
			allRequirementsSatisfied: false,
			requirements: [
				{
					title: 'one lowercase letter',
					satisfied: false,
					check: /[a-z]/,
				},
				{
					title: 'one uppercase letter',
					satisfied: false,
					check: /[A-Z]/,
				},
				{
					title: 'one number',
					satisfied: false,
					check: /[0-9]/,
				},
				{
					title: 'one special character',
					satisfied: false,
					check: /\W/,
				},
				{
					title: '8 characters long',
					satisfied: false,
					check: /^.{8,}$/,
				},
				
			]
		});
		const userPasswordRequirementNotSameAsUser = {
			title: 'different from user name',
			satisfied: false,
			check: new RegExp(`^(?!${props.user}$).*$`),
		};
		console.log(userPasswordRequirementNotSameAsUser);
		userPassword.requirements.push(userPasswordRequirementNotSameAsUser);
		const showRemovePasswordModal = ref(false);
		const processing = inject('processing');

		const setPassword = async () => {
			if (await new Promise((resolve, reject) => {
				userPassword.applyCallback = () => {
					if (userPassword.allRequirementsSatisfied) {
						resolve(true);
					} else {
						userPassword.feedback = "Password does not satisfy all strength requirements. Click apply again to apply anyway.";
						userPassword.applyCallback = () => resolve(true);
					}
				};
				userPassword.showModal = true;
			})) {
				processing.value++;
				try {
					const state = useSpawn(['passwd', props.user], { superuser: 'try' });
					state.proc.input(`${userPassword.pass1}\n${userPassword.pass2}\n`);
					await proc.promise();
				} catch (state) {
					throw new Error("Error setting password: " + errorString(state));
				}
				processing.value--;
			}
			userPassword.showModal = false;
		};

		const removePassword = async () => {
			console.log("remove password");
		};

		const checkIfSet = async () => {
			try {
				const passwdStatus = (await useSpawn(['passwd', '--status', props.user], { superuser: 'try' }).promise()).stdout.trim();
				userPassword.isSet = (passwdStatus.split(' ')[1] === 'P');
			} catch (state) {
				throw new Error("Error checking if password is set: " + errorString(state));
			}
		}

		watch([() => userPassword.pass1, () => userPassword.pass2], () => {
			userPassword.valid = false;
			if (userPassword.pass1 !== userPassword.pass2)
				userPassword.feedback = "Passwords do not match.";
			else if (!userPassword.pass1 || !userPassword.pass2)
				userPassword.feedback = "Password required.";
			else {
				userPassword.feedback = "";
				userPassword.valid = true;
			}
			userPassword.allRequirementsSatisfied = !userPassword.requirements.map(req => req.satisfied = req.check.test(userPassword.pass1)).includes(false);
		});

		if (!props.modalOnly) {
			checkIfSet();
			watch(() => props.user, checkIfSet);
		}

		watch(() => props.user, () => userPasswordRequirementNotSameAsUser.check = new RegExp(`^(?!${props.user}$).*$`));

		return {
			userPassword,
			showRemovePasswordModal,
			setPassword,
			removePassword,
		}
	},
	components: {
		ModalPopup,
		ExclamationCircleIcon,
		CheckIcon,
		XIcon,
	},
}
</script>
