<template>
	<div v-if="!modalOnly && allowed">
		<label class="block text-label">User Login</label>
		<div class="button-group-row-wrap">
			<button
				class="btn btn-primary"
				@click="setPassword"
			>{{ userPassword.isSet ? 'Change' : 'Set' }} Account Password</button>
			<button class="btn btn-primary" @click="togglePasswordLock()" v-if="userPassword.isSet">
				<div class="flex flex-row items-center">
					<span class="mr-2">{{ userPassword.isLocked ? 'Unlock' : 'Lock' }} Account Password</span>
					<LockClosedIcon v-if="userPassword.isLocked" class="size-icon" />
					<LockOpenIcon v-else class="size-icon" />
				</div>
			</button>
			<button
				class="btn btn-primary"
				@click="showPasswordExpiryModal = true"
				v-if="userPassword.isSet"
			>Edit Password Expiry</button>
		</div>
		<div v-if="userPassword.isSet" class="feedback-group">
			<InformationCircleIcon class="size-icon icon-default" />
			<div class="text-feedback text-muted">{{ userPassword.expires }}</div>
		</div>
		<ModalPopup
			:showModal="showPasswordExpiryModal"
			@apply="() => showPasswordExpiryModal = false"
			:headerText="`Password expiry settings for ${user}`"
			applyText="Done"
			noCancel
		>
			<div class="flex flex-col gap-4 items-start">
				<div class="flex gap-1 items-baseline flex-wrap justify-start">
					<span>Expire password every</span>
					<input
						:value="(userPassword.expireDays == -1 || userPassword.expireDays == 99999) ? '' : userPassword.expireDays"
						@change="updateExpiry($event.target.value)"
						type="number"
						placeholder="∞"
						min="0"
						max="9999"
						class="w-24 grow-0 input-textlike"
					/>
					<span>days</span>
				</div>
				<button
					class="btn btn-primary"
					@click="showExpirePasswordModal = true"
					v-if="userPassword.isSet"
					:disabled="userPassword.isExpired"
					:title="userPassword.isExpired ? 'Password already expired.' : 'Force user to change password on next login.'"
				>Force Expire Account Password</button>
				<div class="feedback-group">
					<InformationCircleIcon class="size-icon icon-default" />
					<div class="text-feedback text-muted">{{ userPassword.expires }}</div>
				</div>
			</div>
		</ModalPopup>
		<ModalPopup
			:showModal="showExpirePasswordModal"
			@apply="expirePassword"
			@cancel="() => showExpirePasswordModal = false"
			:headerText="`Expire password for ${user}?`"
			applyDangerous
			applyText="Yes"
			cancelText="No"
		>
			<template #icon><ExclamationCircleIcon class="size-icon-xl icon-error" /></template>
			They will need to set a new password at next login.
		</ModalPopup>
	</div>
	<PasswordModal
		:showModal="userPassword.showModal"
		:user="user"
		:headerText="`${userPassword.isSet ? 'Change' : 'Set'} login password for ${user}`"
		:cancelText="userPassword.isSet ? 'Cancel' : 'No Password'"
		:warnCancel="!userPassword.isSet"
		@apply="userPassword.applyCallback"
		@cancel="userPassword.cancelCallback"
		requireDifferentFromUser
	/>
</template>

<script>
import ModalPopup from "./ModalPopup.vue";
import PasswordModal from "./PasswordModal.vue";
import { ExclamationCircleIcon, LockClosedIcon, LockOpenIcon, InformationCircleIcon } from '@heroicons/vue/solid';
import { ref, reactive, watch, inject } from 'vue';
import { useSpawn, errorString, errorStringHTML } from '@45drives/cockpit-helpers';
import { notificationsInjectionKey } from "../keys";

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
	setup(props, { emit }) {
		const userPassword = reactive({
			showModal: false,
			applyCallback: () => userPassword.showModal = false,
			cancelCallback: () => userPassword.showModal = false,
			isSet: false,
			isLocked: false,
			expires: 'never',
			isExpired: false,
			expireDays: null,
		});
		const allowed = ref(true);
		const showExpirePasswordModal = ref(false);
		const showPasswordExpiryModal = ref(false);
		const notifications = inject(notificationsInjectionKey);

		const checkPasswdStatus = async () => {
			emit('startProcessing');
			try {
				const passwdStatusFields = (await useSpawn(['passwd', '--status', props.user], { superuser: 'try' }).promise()).stdout
					.trim().split(' ');
				switch (passwdStatusFields[1]) {
					case 'P':
					case 'PS':
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
						throw new Error(`Unknown field in passwd -S: ${passwdStatusFields[1]}. Should be NP, P, PS, or L.`);
				}
				userPassword.expireDays = parseInt(passwdStatusFields[4]);
				const chageLines = (await useSpawn(['chage', '-l', props.user], { superuser: 'try' }).promise()).stdout
					.split('\n'); // split lines
				const chageExpires = chageLines.find(line => /^Password expires/.test(line))
					.split(':')[1]
					.trim();
				userPassword.isExpired = chageExpires === "password must be changed";
				userPassword.expires = chageExpires.replace(/^(?!password must be changed)(?!never)(.*)$/, "Password expires on $1.")
					.replace("password must be changed", "Password is expired.")
					.replace("never", "Password never expires.");
			} catch (state) {
				notifications.value.constructNotification(
					"Failed to check password status",
					errorStringHTML(state),
					'error'
				);
				allowed.value = false;
				userPassword.isSet = false;
			} finally {
				emit('stopProcessing');
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
				emit('startProcessing');
				try {
					const state = useSpawn(['passwd', props.user], { superuser: 'try' });
					state.proc.input(`${password}\n${password}\n`);
					await state.promise();
					notifications.value.constructNotification(`Set password for ${props.user}`, "Password was set successfully.", 'success');
					await checkPasswdStatus();
				} catch (state) {
					notifications.value.constructNotification(
						"Error setting password",
						errorStringHTML(state),
						'error'
					);
				} finally {
					emit('stopProcessing');
				}
			} else if (!userPassword.isSet) {
				notifications.value.constructNotification(`${props.user} has no password`, "Set the password in the user editor to be able to log in.", 'warning');
			}
			userPassword.showModal = false;
		};

		const expirePassword = async () => {
			emit('startProcessing');
			try {
				await useSpawn(['passwd', '-e', props.user], { superuser: 'try' }).promise();
				await checkPasswdStatus();
			} catch (state) {
				notifications.value.constructNotification(
					`Failed to expire password`,
					errorStringHTML(state),
					'error'
				);
			} finally {
				showExpirePasswordModal.value = false;
				emit('stopProcessing');
			}
		};

		const togglePasswordLock = async () => {
			const argv = ['passwd'];
			if (userPassword.isLocked) {
				argv.push('-u');
			} else {
				argv.push('-l');
			}
			argv.push(props.user);
			emit('startProcessing');
			try {
				await useSpawn(argv, { superuser: 'try' }).promise();
				await checkPasswdStatus();
			} catch (state) {
				notifications.value.constructNotification(
					`Failed to ${userPassword.isLocked ? 'un' : ''}lock password`,
					errorStringHTML(state),
					'error'
				);
			} finally {
				emit('stopProcessing');
			}
		};

		const updateExpiry = async (daysStr) => {
			emit('startProcessing');
			console.log(daysStr);
			try {
				const days = daysStr ? parseInt(daysStr) : -1;
				await useSpawn(['passwd', '-x', `${days}`, props.user], { superuser: 'try' }).promise();
			} catch (state) {
				notifications.value.constructNotification(
					`Failed to set password expiry`,
					errorStringHTML(state),
					'error'
				);
			} finally {
				emit('stopProcessing');
				await checkPasswdStatus();
			}
		}

		watch(() => props.user, async () => {
			await checkPasswdStatus();
		}, { immediate: !props.newUser });

		return {
			userPassword,
			allowed,
			showExpirePasswordModal,
			showPasswordExpiryModal,
			setPassword,
			expirePassword,
			togglePasswordLock,
			updateExpiry,
		}
	},
	components: {
		ModalPopup,
		PasswordModal,
		ExclamationCircleIcon,
		LockClosedIcon,
		LockOpenIcon,
		InformationCircleIcon,
	},
	emits: [
		'startProcessing',
		'stopProcessing',
	],
}
</script>
