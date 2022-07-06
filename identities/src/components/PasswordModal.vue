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
	<ModalPopup
		:showModal="showModal"
		:headerText="headerText"
		:applyText="applyText"
		:cancelText="cancelText"
		:disableContinue="!passwordValid"
		@apply="applyCallback"
		@cancel="cancelCallback"
	>
		<div class="my-2 space-y-content">
			<div class="relative">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<LockClosedIcon class="size-icon icon-default" aria-hidden="true" />
				</div>
				<input
					:type="hidden ? 'password' : 'text'"
					autocomplete="new-password"
					class="block w-full px-10 input-textlike"
					placeholder="Type Password"
					v-model="password1"
				/>
				<div @click="hidden = !hidden" class="absolute inset-y-0 right-0 pr-3 flex items-center">
					<EyeOffIcon v-if="hidden" class="size-icon icon-default" aria-hidden="true" />
					<EyeIcon v-else class="size-icon icon-default" aria-hidden="true" />
				</div>
			</div>
			<div class="relative">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<LockClosedIcon class="size-icon icon-default" aria-hidden="true" />
				</div>
				<input
					:type="hidden ? 'password' : 'text'"
					autocomplete="new-password"
					class="block w-full px-10 input-textlike"
					placeholder="Repeat Password"
					v-model="password2"
				/>
				<div @click="hidden = !hidden" class="absolute inset-y-0 right-0 pr-3 flex items-center">
					<EyeOffIcon v-if="hidden" class="size-icon icon-default" aria-hidden="true" />
					<EyeIcon v-else class="size-icon icon-default" aria-hidden="true" />
				</div>
			</div>
			<div v-if="allRequirements.length" class="flex flex-col items-start">
				<div>The password should satisfy the following requirements:</div>
				<div class="inline-flex flex-col items-stretch">
					<div v-for="requirement in allRequirements" class="flex flex-row text-sm items-center">
						<span class="grow">{{ requirement.title }}</span>
						<CheckIcon v-if="requirement.satisfied" class="size-icon-sm ml-2 icon-success" />
						<XIcon v-else class="size-icon-sm ml-2 icon-error" />
					</div>
				</div>
			</div>
			<div class="feedback-group" v-if="warning">
				<ExclamationCircleIcon class="size-icon icon-warning shrink-0" />
				<span class="text-feedback text-warning">{{ warning }}</span>
			</div>
			<div class="feedback-group" v-if="feedback">
				<ExclamationCircleIcon class="size-icon icon-error shrink-0" />
				<span class="text-feedback text-error">{{ feedback }}</span>
			</div>
		</div>
	</ModalPopup>
</template>

<script>
import ModalPopup from "./ModalPopup.vue";
import { ExclamationCircleIcon, CheckIcon, XIcon, EyeIcon, EyeOffIcon, LockClosedIcon } from '@heroicons/vue/solid';
import { ref, watch } from 'vue';

export default {
	props: {
		requirements: {
			type: Array,
			required: false,
			default: [
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
			],
		},
		extraRequirements: {
			type: Array,
			required: false,
			default: [],
		},
		requireDifferentFromUser: Boolean,
		warnCancel: {
			type: Boolean,
			required: false,
			default: false,
		},
		allowEmpty: {
			type: Boolean,
			required: false,
			default: false,
		},
		headerText: {
			type: String,
			required: false,
			default: "Set password",
		},
		applyText: {
			type: String,
			required: false,
			default: "Apply",
		},
		cancelText: {
			type: String,
			required: false,
			default: "Cancel",
		},
		user: {
			type: String,
			required: false,
			default: null,
		},
		showModal: Boolean,
	},
	setup(props, { emit }) {
		const password1 = ref("");
		const password2 = ref("");
		const allRequirements = ref([...props.requirements, ...props.extraRequirements].map(req => { req.satisfied = false; return req; }));
		const allRequirementsSatisfied = ref(false);
		const passwordValid = ref(false);
		const feedback = ref("");
		const warning = ref("");
		const hidden = ref(true);

		const defaultApplyCallback = () => {
			if (allRequirementsSatisfied.value) {
				emit('apply', password1.value);
			} else {
				feedback.value = "Password does not satisfy all strength requirements. Click apply again to proceed anyway.";
				applyCallback.value = () => {
					emit('apply', password1.value);
					setTimeout(reset, 300);
				};
			}
		};

		const applyCallback = ref(defaultApplyCallback);

		const defaultCancelCallback = () => {
			if (props.warnCancel) {
				feedback.value = `Warning: ${props.user ?? 'user'} will have no password. Click "${props.cancelText}" again to proceed anyway.`;
				cancelCallback.value = () => {
					emit('cancel');
					setTimeout(reset, 300);
				};
			} else {
				emit('cancel');
			}
		};

		const cancelCallback = ref(defaultCancelCallback);

		const reset = () => {
			applyCallback.value = defaultApplyCallback;
			cancelCallback.value = defaultCancelCallback;
			feedback.value = "";
		}

		if (props.requireDifferentFromUser && props.user) {
			const userPasswordRequirementNotSameAsUser = {
				title: 'different from user name',
				satisfied: false,
				check: new RegExp(`^(?!${props.user}$).*$`),
			};
			allRequirements.value.push(userPasswordRequirementNotSameAsUser);
			watch(() => props.user, () => {
				userPasswordRequirementNotSameAsUser.check = new RegExp(`^(?!${props.user}$).*$`);
			});
		}

		watch([() => password1.value, () => password2.value], () => {
			passwordValid.value = false;
			if (password1.value !== password2.value)
				feedback.value = "Passwords do not match.";
			else if (!props.allowEmpty && (!password1.value || !password2.value))
				feedback.value = "Password required.";
			else {
				feedback.value = "";
				passwordValid.value = true;
			}
			allRequirementsSatisfied.value = !allRequirements.value.map(req => req.satisfied = req.check.test(password1.value)).includes(false);
			warning.value = "";
			if (props.allowEmpty && (!password1.value || !password2.value)) {
				warning.value = "Password is empty.";
				allRequirementsSatisfied.value = false;
			}
			applyCallback.value = defaultApplyCallback;
			cancelCallback.value = defaultCancelCallback;
		}, { immediate: true });

		watch(() => props.showModal, () => {
			if (props.showModal)
				password1.value = password2.value = "";
		});

		return {
			password1,
			password2,
			allRequirements,
			allRequirementsSatisfied,
			passwordValid,
			feedback,
			warning,
			hidden,
			applyCallback,
			cancelCallback,
		}
	},
	components: {
		ModalPopup,
		ExclamationCircleIcon,
		CheckIcon,
		XIcon,
		EyeIcon,
		EyeOffIcon,
		LockClosedIcon,
	},
	emits: [
		'apply',
		'cancel',
	]
}
</script>
