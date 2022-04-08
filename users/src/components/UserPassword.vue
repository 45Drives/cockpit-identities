<template>
	<div v-if="!modalOnly">
		<label class="block text-sm font-medium">User Login</label>
		<div class="flex flex-row flex-wrap gap-3 mt-1 items-center">
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
	<PasswordModal
		v-if="userPassword.showModal"
		:user="user"
		:headerText="`${userPassword.isSet ? 'Change' : 'Set'} password for ${user}`"
		:warnCancel="!userPassword.isSet"
		@apply="userPassword.applyCallback"
		@cancel="userPassword.cancelCallback"
		requireDifferentFromUser
	/>
</template>

<script>
import ModalPopup from "./ModalPopup.vue";
import PasswordModal from "./PasswordModal.vue";
import { ExclamationCircleIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/vue/solid';
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
			showModal: false,
			applyCallback: () => userPassword.showModal = false,
			cancelCallback: () => userPassword.showModal = false,
			isSet: false,
			isLocked: false,
			expires: 'never',
			isExpired: false,
		});
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
			const waitForPassword = () => new Promise(
				(resolve, reject) => {
					userPassword.applyCallback = (password) => resolve(password);
					userPassword.cancelCallback = () => resolve(null);
					userPassword.showModal = true;
				}
			);
			let password = null;
			if (password = await waitForPassword()) {
				processing.value++;
				try {
					const state = useSpawn(['passwd', props.user], { superuser: 'try' });
					state.proc.input(`${password}\n${password}\n`);
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
			} else if (!userPassword.isSet) {
				notifications.constructNotification(`${props.user} has no password`, "Set the password in the user editor to be able to log in.", 'warning');
			}
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

		watch(() => props.user, async () => {
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
		PasswordModal,
		ExclamationCircleIcon,
		LockClosedIcon,
		LockOpenIcon,
	},
}
</script>
