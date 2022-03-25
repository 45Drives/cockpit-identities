<template>
	<div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8 py-8">
		<div class="card divide-y divide-y-gray-100">
			<div class="card-header">
				<h3>
					{{ user.name === "" ? user.user : user.name }}
					<span class="text-gray-500 font-mono text-sm">
						(<span v-if="user.name">login={{ user.user }},</span>
						uid={{ user.uid }},
						gid={{ user.gid }})
					</span>
				</h3>
			</div>
			<div class="card-body space-y-5">
				<div>
					<label class="block text-sm font-medium">Full Name/Description</label>
					<div class="mt-1">
						<input
							type="text"
							class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
							placeholder="Full Name"
							v-model="user.name"
						/>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium">Home Directory</label>
					<div class="mt-1">
						<input
							type="text"
							class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
							placeholder="Path to Working Directory at login"
							v-model="user.home"
						/>
					</div>
					<div
						class="mt-2 text-sm text-red-600 flex flex-row justify-start items-center space-x-1"
						v-if="feedback.home"
					>
						<ExclamationCircleIcon class="w-5 h-5 inline" />
						<span>{{ feedback.home }}</span>
					</div>
				</div>
				<Listbox as="div" v-model="user.shell" v-if="user.shell">
					<ListboxLabel class="block text-sm font-medium">Login Shell</ListboxLabel>
					<div class="mt-1 relative">
						<ListboxButton
							class="relative w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-0 sm:text-sm"
						>
							<span class="w-full inline-flex truncate">
								<span class="truncate">{{ user.shell.name }}</span>
								<span class="ml-2 truncate text-gray-500">{{ user.shell.path }}</span>
							</span>
							<span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
								<SelectorIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
							</span>
						</ListboxButton>

						<transition
							leave-active-class="transition ease-in duration-100"
							leave-from-class="opacity-100"
							leave-to-class="opacity-0"
						>
							<ListboxOptions
								class="absolute z-10 mt-1 w-full bg-white dark:bg-neutral-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
							>
								<ListboxOption
									as="template"
									v-for="shell in shells"
									:key="shell.path"
									:value="shell"
									v-slot="{ active, selected }"
								>
									<li
										:class="[active ? 'text-white bg-red-500 dark:bg-red-600' : '', 'cursor-default select-none relative py-2 pl-3 pr-9']"
									>
										<div class="flex">
											<span :class="[selected ? 'font-semibold' : 'font-normal', 'truncate']">{{ shell.name }}</span>
											<span
												:class="[active ? 'text-red-200' : 'text-gray-500', 'ml-2 truncate']"
											>{{ shell.path }}</span>
										</div>

										<span
											v-if="selected"
											:class="[active ? 'text-white' : 'text-red-600', 'absolute inset-y-0 right-0 flex items-center pr-4']"
										>
											<CheckIcon class="h-5 w-5" aria-hidden="true" />
										</span>
									</li>
								</ListboxOption>
							</ListboxOptions>
						</transition>
					</div>
				</Listbox>
				<div>
					<span>Groups: </span>
					<span v-for="group in user.groups">{{ group }}</span>
				</div>
				<div class="flex flex-row space-x-2">
					<button class="btn btn-secondary" v-if="changesMade" @click="cancel()">Cancel</button>
					<button
						class="btn btn-primary"
						:disabled="!(changesMade && inputsValid)"
						@click="apply()"
					>Apply</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { ref, watch, reactive } from "vue";
import useSpawn from "../hooks/useSpawn";
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue'
import { CheckIcon, SelectorIcon } from '@heroicons/vue/solid'

export default {
	props: {
		modelValue: Object,
		shells: Array[Object],
	},
	setup(props, { emit }) {
		const user = reactive({ ...props.modelValue });
		const changesMade = ref(false);
		const inputsValid = ref(true);
		const feedback = reactive({});

		const cancel = () => {
			Object.assign(user, props.modelValue);
			emit('cancel');
		};

		const apply = () => {
			emit('update:modelValue', user);
		};

		const validateInputs = async () => {
			let result = true;
			if (!/^\//.test(user.home)) {
				feedback.home = "Home path must be absolute.";
				result = false;
			} else {
				delete feedback.home;
			}
			inputsValid.value = result;
		};

		watch(user, async () => {
			let changes = false;
			for (let key of Object.keys(props.modelValue)) {
				if (user[key] !== props.modelValue[key])
					changes = true;
			}
			await validateInputs(); // validate first to avoid split second where apply is not disabled while invalid
			changesMade.value = changes;
		});

		watch(props.modelValue, () => {
			Object.assign(user, props.modelValue);
		});

		return {
			user,
			changesMade,
			inputsValid,
			feedback,
			cancel,
			apply,
		}
	},
	components: {
		Listbox,
		ListboxButton,
		ListboxLabel,
		ListboxOption,
		ListboxOptions,
		CheckIcon,
		SelectorIcon,
	},
	emits: [
		'update:modelValue',
		'cancel',
	],
}
</script>
