<template>
	<div v-if="!modalOnly">
		<label class="block text-sm font-medium">User Login</label>
		<div class="flex flex-row space-x-3 mt-1 items-baseline">
			<button
				class="btn btn-primary"
				@click="setPassword"
			>{{ userPassword.isSet ? 'Change' : 'Set' }} Account Password</button>
			<button class="btn btn-primary" @click="togglePasswordLock()" v-if="userPassword.isSet">
				<div class="flex flex-row items-center">
					<span class="mr-2">{{ userPassword.isLocked ? 'Unlock' : 'Lock' }} Account Password</span>
					<LockClosedIcon v-if="userPassword.isLocked" class="w-5 h-5" />
					<LockOpenIcon v-else class="w-5 h-5" />
				</div>
			</button>
			<button
				class="btn btn-primary"
				@click="showExpirePasswordModal = true"
				v-if="userPassword.isSet"
				:disabled="userPassword.isExpired"
			>Force Expire Account Password</button>
			<div v-if="userPassword.isSet" class="text-gray-500">{{ userPassword.expires }}</div>
		</div>
		<ModalPopup
			:showModal="showExpirePasswordModal"
			:onApply="expirePassword"
			:onCancel="() => showExpirePasswordModal = false"
			:headerText="`Expire password for ${user}?`"
			applyText="Yes"
			cancelText="No"
		>
			<div class="flex flex-row">
				<ExclamationCircleIcon class="w-5 h-5 mr-2 text-red-600" />
				<span>They will need to set a new password at next login.</span>
			</div>
		</ModalPopup>
	</div>
	<ModalPopup
		:showModal="userPassword.showModal"
		:headerText="`Set Password for ${user}`"
		:disableContinue="!userPassword.valid"
		:onApply="userPassword.applyCallback"
		:onCancel="userPassword.cancelCallback"
	>
		<div class="my-2 space-y-4">
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
import { ExclamationCircleIcon, CheckIcon, XIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/vue/solid';
// import { LockClosedIcon, LockOpenIcon } from "@heroicons/vue/outline";
import { ref, reactive, watch, inject } from 'vue';
import { useSpawn, errorString, errorStringHTML } from '../hooks/useSpawn';
import { notificationsInjectionKey, processingInjectionKey } from "../keys";

export default {
	props: {
		user: String, // just the username
		newUser: {
			type: Boolean, // whether or not to check if set immediately
			required: false,
			default: false,
		},
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
			isLocked: false,
			expires: 'never',
			isExpired: false,
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
		userPassword.requirements.push(userPasswordRequirementNotSameAsUser);
		const showExpirePasswordModal = ref(false);
		const processing = inject(processingInjectionKey);
		const notifications = inject(notificationsInjectionKey).value;

		const checkPasswdStatus = async () => {
			try {
				const passwdStatusFields = (await useSpawn(['passwd', '--status', props.user], { superuser: 'try' }).promise()).stdout
					.trim().split(' ');
				switch (passwdStatusFields[1]) {
					case 'P':
						userPassword.isSet = true;
						userPassword.isLocked = false;
						break;
					case 'NP':
						userPassword.isSet = false;
						userPassword.isLocked = false;
						break;
					case 'L':
						userPassword.isLocked = true;
						break;
					default:
						throw new Error(`Unknown field in passwd -S: ${passwdStatusFields[1]}. Should be NP, P, or L.`);
				}
				const chageLines = (await useSpawn(['chage', '-l', props.user], { superuser: 'try' }).promise()).stdout
					.split('\n'); // split lines
				console.log(chageLines);
				const chageExpires = chageLines.find(line => /^Password expires/.test(line))
					.split(':')[1]
					.trim();
				userPassword.isExpired = chageExpires === "password must be changed";
				userPassword.expires = chageExpires.replace(/^(?!password must be changed)(?!never)(.*)$/, "Password expires on $1.")
					.replace("password must be changed", "Password is expired.")
					.replace("never", "Password never expires.");
			} catch (state) {
				notifications.constructNotification(
					"Failed to check password status",
					`${errorStringHTML(state)}\nPretending it is not set.`,
					'warning'
				);
				userPassword.isSet = false;
			}
		};

		const setPassword = async () => {
			let watchStopHandle = null;
			const applyCallback = (resolve) => {
				if (userPassword.allRequirementsSatisfied) {
					resolve(true);
				} else {
					userPassword.feedback = "Password does not satisfy all strength requirements. Click apply again to proceed anyway.";
					userPassword.applyCallback = () => resolve(true);
				}
			};
			const cancelCallback = (resolve) => {
				if (userPassword.isSet) {
					resolve(false);
				} else {
					userPassword.feedback = `Warning: ${props.user} will have no password. Click cancel again to proceed anyway.`;
					userPassword.cancelCallback = () => resolve(false);
				}
			};
			const waitForPassword = () => new Promise(
				(resolve, reject) => {
					watchStopHandle = watch([() => userPassword.pass1, () => userPassword.pass2], () => {
						// reset callbacks on input
						userPassword.applyCallback = () => applyCallback(resolve);
						userPassword.cancelCallback = () => cancelCallback(resolve);
					}, { immediate: true });
					userPassword.showModal = true;
				}
			);
			if (await waitForPassword()) {
				processing.value++;
				try {
					const state = useSpawn(['passwd', props.user], { superuser: 'try' });
					state.proc.input(`${userPassword.pass1}\n${userPassword.pass2}\n`);
					await state.promise();
					notifications.constructNotification(`Set password for ${props.user}`, "Password was set successfully.", 'success');
					await checkPasswdStatus();
				} catch (state) {
					notifications.constructNotification(
						"Error setting password",
						errorStringHTML(state),
						'error'
					);
				}
				processing.value--;
			} else {
				notifications.constructNotification(`${props.user} has no password`, "Set the password in the user editor to be able to log in.", 'warning');
			}
			if (watchStopHandle)
				watchStopHandle();
			userPassword.showModal = false;
		};

		const expirePassword = async () => {
			try {
				await useSpawn(['passwd', '-e', props.user], { superuser: 'try' }).promise();
				await checkPasswdStatus();
			} catch (state) {
				notifications.constructNotification(
					`Failed to expire password`,
					errorStringHTML(state),
					'warning'
				);
			}
			showExpirePasswordModal.value = false;
		};

		const togglePasswordLock = async () => {
			const argv = ['passwd'];
			if (userPassword.isLocked) {
				argv.push('-u');
			} else {
				argv.push('-l');
			}
			argv.push(props.user);
			try {
				await useSpawn(argv, { superuser: 'try' }).promise();
				await checkPasswdStatus();
			} catch (state) {
				notifications.constructNotification(
					`Failed to ${userPassword.isLocked ? 'un' : ''}lock password`,
					errorStringHTML(state),
					'warning'
				);
			}
		};

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

		watch(() => props.user, async () => {
			userPasswordRequirementNotSameAsUser.check = new RegExp(`^(?!${props.user}$).*$`);
			await checkPasswdStatus();
		}, { immediate: !props.newUser });

		return {
			userPassword,
			showExpirePasswordModal,
			setPassword,
			expirePassword,
			togglePasswordLock,
		}
	},
	components: {
		ModalPopup,
		ExclamationCircleIcon,
		CheckIcon,
		XIcon,
		LockClosedIcon,
		LockOpenIcon,
	},
}
</script>
