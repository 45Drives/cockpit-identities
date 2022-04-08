<template>
	<ModalPopup
		:showModal="true"
		:headerText="headerText"
		:disableContinue="!passwordValid"
		:onApply="applyCallback"
		:onCancel="cancelCallback"
	>
		<div class="my-2 space-y-4">
			<input
				type="text"
				autocomplete="new-password"
				class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
				placeholder="Type Password"
				v-model="password1"
			/>
			<input
				type="text"
				autocomplete="new-password"
				class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
				placeholder="Repeat Password"
				v-model="password2"
			/>
			<div v-if="allRequirements.length">
				The password should satisfy the following requirements:
				<div class="inline-flex flex-col items-stretch">
					<div
						v-for="requirement in allRequirements"
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
				v-if="feedback"
			>
				<ExclamationCircleIcon class="w-5 h-5 inline" />
				<span>{{ feedback }}</span>
			</div>
		</div>
	</ModalPopup>
</template>

<script>
import ModalPopup from "./ModalPopup.vue";
import { ExclamationCircleIcon, CheckIcon, XIcon } from '@heroicons/vue/solid';
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
		headerText: {
			type: String,
			required: false,
			default: "Set password",
		},
		user: {
			type: String,
			required: false,
			default: null,
		}
	},
	setup(props, { emit }) {
		const password1 = ref("");
		const password2 = ref("");
		const allRequirements = ref([...props.requirements, ...props.extraRequirements].map(req => { req.satisfied = false; return req; }));
		const allRequirementsSatisfied = ref(false);
		const passwordValid = ref(false);
		const feedback = ref("");

		const defaultApplyCallback = () => {
			if (allRequirementsSatisfied.value) {
				emit('apply', password1.value);
			} else {
				feedback.value = "Password does not satisfy all strength requirements. Click apply again to proceed anyway.";
				applyCallback.value = () => emit('apply', password1.value);
			}
		};

		const applyCallback = ref(defaultApplyCallback);

		const defaultCancelCallback = () => {
			if (props.warnCancel) {
				feedback.value = `Warning: ${props.user ?? 'user'} will have no password. Click cancel again to proceed anyway.`;
				cancelCallback.value = () => emit('cancel');
			} else {
				emit('cancel');
			}
		};

		const cancelCallback = ref(defaultCancelCallback);

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
			else if (!password1.value || !password2.value)
				feedback.value = "Password required.";
			else {
				feedback.value = "";
				passwordValid.value = true;
			}
			allRequirementsSatisfied.value = !allRequirements.value.map(req => req.satisfied = req.check.test(password1.value)).includes(false);
			applyCallback.value = defaultApplyCallback;
			cancelCallback.value = defaultCancelCallback;
		});

		return {
			password1,
			password2,
			allRequirements,
			allRequirementsSatisfied,
			passwordValid,
			feedback,
			applyCallback,
			cancelCallback,
		}
	},
	components: {
		ModalPopup,
		ExclamationCircleIcon,
		CheckIcon,
		XIcon,
	},
	emits: [
		'apply',
		'cancel',
	]
}
</script>
