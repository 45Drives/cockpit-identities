<template>
	<div class="card-body space-y-5 overflow-visible">
		<div v-if="createNew">
			<label class="block text-sm font-medium">Username</label>
			<div class="mt-1">
				<input
					type="text"
					class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
					placeholder="Valid format: [a-z_][a-z0-9_-]*[$a-z0-9_-]"
					v-model="user.user"
				/>
			</div>
			<div
				class="mt-2 text-sm text-red-600 flex flex-row justify-start items-center space-x-1"
				v-if="feedback.user"
			>
				<ExclamationCircleIcon class="w-5 h-5 inline" />
				<span>{{ feedback.user }}</span>
			</div>
		</div>
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
		<Listbox as="div" v-model="user.shell" v-if="user.shell" class="overflow-visible">
			<ListboxLabel class="block text-sm font-medium">Login Shell</ListboxLabel>
			<div class="mt-1 relative overflow-visible">
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
		<div class="mt-8 flex flex-col overflow-visible">
			<div class="-my-2 -mx-4 sm:-mx-6 lg:-mx-8 overflow-visible">
				<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8 overflow-visible">
					<div
						class="overflow-visible shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg"
					>
						<table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700 overflow-visible">
							<thead class="bg-neutral-50 dark:bg-neutral-800 overflow-visible">
								<tr class="overflow-visible">
									<th
										scope="col"
										class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>{{ user.name === "" ? user.user : user.name }}'s Groups</th>
									<th
										scope="col"
										class="sr-only py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>Remove</th>
									<div class="overflow-visible">
										<Listbox as="div" class="overflow-visible" v-model="addGroupSelectorValue">
											<div class="mt-1 relative overflow-visible">
												<ListboxButton>
													<PlusIcon class="w-5 h-5 absolute right-3 top-3.5 cursor-pointer text-gray-500" />
												</ListboxButton>

												<transition
													leave-active-class="transition ease-in duration-100"
													leave-from-class="opacity-100"
													leave-to-class="opacity-0"
												>
													<ListboxOptions
														class="absolute z-10 mt-1 right-0 top-10 bg-white dark:bg-neutral-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
													>
														<ListboxOption
															as="template"
															v-for="group in nonMemberGroups"
															:value="group"
															v-slot="{ active, selected }"
														>
															<li
																:class="[active ? 'text-white bg-red-500 dark:bg-red-600' : '', 'cursor-default select-none relative py-2 pl-3 pr-9']"
															>
																<div class="flex">
																	<span :class="[selected ? 'font-semibold' : 'font-normal', 'truncate']">{{ group }}</span>
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
									</div>
								</tr>
							</thead>
							<tbody class="dark:bg-neutral-800">
								<tr
									v-for="(group, index) in user.groups"
									:class="index % 2 === 0 ? undefined : 'bg-neutral-50 dark:bg-neutral-700'"
								>
									<td
										class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
									>{{ group }}</td>
									<td class="flex flex-row justify-end whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium">
										<MinusIcon
											@click="removeGroup(group)"
											class="uppercase text-red-600 hover:text-red-900 cursor-pointer w-5 h-5"
										/>
									</td>
								</tr>
								<tr v-if="user.groups.length === 0">
									<td
										class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-6 lg:pl-8"
									>No groups. Click "+" to add one.</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
		<slot />
		<div class="flex flex-row space-x-3 justify-end">
			<button class="btn btn-secondary" v-if="changesMade" @click="cancel()">Cancel</button>
			<button class="btn btn-primary" :disabled="!(changesMade && inputsValid)" @click="apply()">Apply</button>
		</div>
	</div>
</template>

<script>
import { ref, watch, reactive, inject } from "vue";
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { CheckIcon, SelectorIcon, PlusIcon, MinusIcon, ExclamationCircleIcon } from '@heroicons/vue/solid';
import LoadingSpinner from "../components/LoadingSpinner.vue";

export default {
	props: {
		modelValue: Object,
		createNew: {
			type: Boolean,
			required: false,
			default: false,
		}
	},
	setup(props, { emit }) {
		const user = reactive({ ...props.modelValue });
		const changesMade = ref(false);
		const inputsValid = ref(true);
		const feedback = reactive({});
		const processing = inject('processing');
		const shells = inject('shells');
		const groupsRef = inject('groups');
		let groups = groupsRef.value.map(groupObj => groupObj.group); // get just plain group names
		const nonMemberGroups = ref(groups.filter(group => !(user.groups?.includes(group))));
		const addGroupSelectorValue = ref("");
		let applyHooks = () => {};

		const cancel = () => {
			Object.assign(user, props.modelValue);
			emit('cancel');
		};

		const apply = () => {
			applyHooks();
			emit('update:modelValue', user);
		};

		const addGroup = (group) => {
			if (!group)
				return;
			user.groups = [group, ...user.groups];
			user.groups.sort();
		};

		const removeGroup = (groupToRemove) => {
			user.groups = user.groups.filter(group => group !== groupToRemove);
		}

		const validateInputs = async () => {
			let result = true;
			feedback.home = feedback.user = "";

			if (user.home && !/^\//.test(user.home)) {
				feedback.home = "Home path must be absolute.";
				result = false;
			}

			if (!user.user) {
				feedback.user = (feedback.user ?? "") + "Username required.\n";
				result = false;
			}
			if (!/^[a-z_][a-z0-9_-]*[\$a-z0-9_-]?$/.test(user.user)) {
				const invalidCharacters = [...(user.user.match(/(?:^[^a-z_]|(?<=.+)[^a-z0-9_-](?=.+)|[^\$a-z0-9_-]$)/g) ?? [])];
				feedback.user = (feedback.user ?? "")
					+ `Invalid character${invalidCharacters.length > 1 ? 's' : ''}: `
					+ invalidCharacters.map(char => `"${char}"`).join(', ') + '\n';
				result = false;
			}
			if (user.user.length > 32) {
				feedback.user = (feedback.user ?? "") + "Username too long.\n";
				result = false;
			}
			
			inputsValid.value = result;
			console.log(JSON.stringify(feedback));
		};

		const checkIfChanged = async () => {
			let changes = false;
			for (let key of Object.keys(props.modelValue)) {
				if (Array.isArray(user[key])) {
					if (user[key].sort().join(',') !== props.modelValue[key].sort().join(','))
						changes = true
				} else if (user[key] !== props.modelValue[key])
					changes = true;
			}
			nonMemberGroups.value = groups.filter(group => !(user.groups?.includes(group)));
			await validateInputs(); // validate first to avoid split second where apply is not disabled while invalid
			changesMade.value = changes;
		};

		watch(() => ({ ...user }), checkIfChanged);

		watch(props.modelValue, () => {
			Object.assign(user, props.modelValue);
			checkIfChanged();
		});

		watch(addGroupSelectorValue, (group) => {
			addGroup(group);
			addGroupSelectorValue.value = "";
		});

		watch(groupsRef, () => { groups = groupsRef.value.map(groupObj => groupObj.group) }, { immediate: true });

		if (props.createNew) {
			applyHooks = () => {
				
			}
			watch(() => user.user, () => {
				if (!user.user && /^\/home\//.test(user.home))
					user.home = "";
				else if (!user.home || /^\/home\//.test(user.home))
					user.home = `/home/${user.user}`;
			});
		}

		return {
			user,
			changesMade,
			inputsValid,
			feedback,
			processing,
			shells,
			nonMemberGroups,
			addGroupSelectorValue,
			cancel,
			apply,
			addGroup,
			removeGroup,
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
		LoadingSpinner,
		PlusIcon,
		MinusIcon,
		ExclamationCircleIcon,
	},
	emits: [
		'update:modelValue',
		'cancel',
	],
}
</script>
