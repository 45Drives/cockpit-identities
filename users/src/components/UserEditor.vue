<template>
	<div class="card-body space-y-5 overflow-visible">
		<div v-if="createNew">
			<label class="block text-sm font-medium">Username</label>
			<div class="mt-1">
				<input
					type="text"
					class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
					placeholder="Valid format: [a-z_][a-z0-9_-]*[$a-z0-9_-]"
					v-model="tmpUser.user"
				/>
			</div>
			<div
				class="mt-2 text-sm text-red-600 flex flex-row justify-start items-center space-x-1"
				v-if="feedback.user"
			>
				<ExclamationCircleIcon class="w-5 h-5 inline" />
				<span v-html="feedback.user"></span>
			</div>
		</div>
		<div>
			<label class="block text-sm font-medium">Full Name/Description</label>
			<div class="mt-1">
				<input
					type="text"
					class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block w-full sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
					placeholder="Full Name"
					v-model="tmpUser.name"
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
					v-model="tmpUser.home"
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
		<Listbox as="div" v-if="tmpUser.shell" v-model="tmpUser.shell" class="overflow-visible">
			<ListboxLabel class="block text-sm font-medium">Login Shell</ListboxLabel>
			<div class="mt-1 relative overflow-visible">
				<ListboxButton
					class="relative w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-0 sm:text-sm"
				>
					<span class="w-full inline-flex truncate">
						<span class="truncate">{{ tmpUser.shell.name }}</span>
						<span class="ml-2 truncate text-gray-500">{{ tmpUser.shell.path }}</span>
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
								:class="[active ? 'text-white bg-red-600' : '', 'cursor-default select-none relative py-2 pl-3 pr-9']"
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
						<ListboxOption as="template" :value="customShell" v-slot="{ active, selected }">
							<li
								:class="[active ? 'bg-red-600' : '', 'cursor-default select-none relative py-2 pl-3 pr-9']"
							>
								<div class="flex items-baseline space-x-2">
									<span
										:class="[selected ? 'font-semibold' : 'font-normal', 'truncate', active ? 'text-white' : '']"
									>Custom Shell</span>
									<input
										@click.stop
										@keydown.stop="e => { if (e.code === 'Enter') $emit('keydown', e) }"
										@keypress.stop="e => { if (e.code === 'Enter') $emit('keypress', e) }"
										@change="tmpUser.shell = customShell"
										v-model="customShell.path"
										type="text"
										placeholder="/path/to/custom/shell"
										class="shadow-sm focus:border-gray-500 focus:ring-0 focus:outline-none block sm:text-sm border-gray-300 dark:border-gray-700 dark:bg-neutral-800 rounded-md"
									/>
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
						<div class="flex flex-row justify-between items-center bg-neutral-50 dark:bg-neutral-800">
							<div
								class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
							>{{ user.name === "" ? user.user : user.name }}'s Groups</div>
							<div class="overflow-visible">
								<Listbox as="div" class="overflow-visible" v-model="addGroupSelectorValue">
									<div class="mt-1 overflow-visible relative">
										<ListboxButton>
											<PlusIcon class="w-5 h-5 mr-7 cursor-pointer text-gray-500" />
										</ListboxButton>

										<transition
											leave-active-class="transition ease-in duration-100"
											leave-from-class="opacity-100"
											leave-to-class="opacity-0"
										>
											<ListboxOptions
												class="absolute z-10 mt-1 right-3 top-8 bg-white dark:bg-neutral-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
											>
												<ListboxOption
													as="template"
													v-for="group in nonMemberGroups"
													:value="group"
													v-slot="{ active, selected }"
												>
													<li
														:class="[active ? 'text-white bg-red-600' : '', 'cursor-default select-none relative py-2 pl-3 pr-9']"
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
						</div>
						<div class="flex flex-col overflow-y-auto max-h-80">
							<table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
								<thead class="bg-neutral-50 dark:bg-neutral-800">
									<tr>
										<th
											scope="col"
											class="sr-only py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>{{ tmpUser.name === "" ? tmpUser.user : tmpUser.name }}'s Groups</th>
										<th
											scope="col"
											class="sr-only py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>Remove</th>
									</tr>
								</thead>
								<tbody class="dark:bg-neutral-800">
									<tr
										v-for="(group, index) in tmpUser.groups"
										:class="index % 2 === 0 ? undefined : 'bg-neutral-50 dark:bg-neutral-700'"
									>
										<td
											class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
										>{{ group }}</td>
										<td
											class="flex flex-row justify-end whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium"
										>
											<MinusIcon
												v-if="group !== tmpUser.user"
												@click="removeGroup(group)"
												class="uppercase text-red-600 hover:text-red-900 cursor-pointer w-5 h-5"
											/>
										</td>
									</tr>
									<tr v-if="tmpUser.groups.length === 0">
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
		</div>
		<div class="flex flex-row space-x-3">
			<slot />
			<div class="grow"/>
			<button class="btn btn-secondary justify-self-end" v-if="changesMade" @click="cancel()">Cancel</button>
			<button class="btn btn-primary justify-self-end" :disabled="!(changesMade && inputsValid)" @click="apply()">Apply</button>
		</div>
	</div>
</template>

<script>
import { ref, watch, reactive, inject } from "vue";
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { CheckIcon, SelectorIcon, PlusIcon, MinusIcon, ExclamationCircleIcon } from '@heroicons/vue/solid';
import LoadingSpinner from "../components/LoadingSpinner.vue";
import { shellsInjectionKey, groupsInjectionKey, processingInjectionKey } from "../keys";
import shellObj from "../hooks/shellObj";
import ModalPopup from './ModalPopup.vue';

export default {
	props: {
		user: Object,
		hooks: {
			type: Object,
			required: false,
			default: {},
		},
		createNew: {
			type: Boolean,
			required: false,
			default: false,
		}
	},
	setup(props, { emit }) {
		const tmpUser = reactive({ ...props.user });
		const changesMade = ref(false);
		const inputsValid = ref(true);
		const feedback = reactive({});
		const processing = inject(processingInjectionKey);
		const shells = inject(shellsInjectionKey);
		const groupsRef = inject(groupsInjectionKey);
		let groups = groupsRef.value.map(groupObj => groupObj.group); // get just plain group names
		const nonMemberGroups = ref(groups.filter(group => !(tmpUser.groups?.includes(group))));
		const addGroupSelectorValue = ref("");
		const showCustomShellModal = ref(false);
		const customShell = reactive(shellObj(""));

		const cancel = () => {
			Object.assign(tmpUser, props.user);
			emit('cancel');
		};

		const apply = () => {
			if (typeof props.hooks.preApply === 'function')
				props.hooks.preApply(tmpUser);
			emit('applyChanges', tmpUser);
		};

		const addGroup = (group) => {
			if (!group)
				return;
			tmpUser.groups = [group, ...tmpUser.groups];
			tmpUser.groups.sort();
		};

		const removeGroup = (groupToRemove) => {
			tmpUser.groups = tmpUser.groups.filter(group => group !== groupToRemove);
		}

		const validateInputs = async () => {
			let result = true;
			feedback.home = feedback.user = "";

			if (tmpUser.home && !/^\//.test(tmpUser.home)) {
				feedback.home = "Home path must be absolute.";
				result = false;
			}

			if (!tmpUser.user) {
				feedback.user = (feedback.user ?? "") + "Username required.\n";
				result = false;
			}
			if (!/^[a-z_][a-z0-9_-]*[\$a-z0-9_-]?$/.test(tmpUser.user)) {
				const invalidCharacters = [...(tmpUser.user.match(/(?:^[^a-z_]|(?<=.+)[^a-z0-9_-](?=.+)|[^\$a-z0-9_-]$)/g) ?? [])];
				feedback.user = (feedback.user ?? "")
					+ `Invalid character${invalidCharacters.length > 1 ? 's' : ''}: `
					+ invalidCharacters.map(char => `"${char}"`).join(', ') + '\n';
				result = false;
			}
			if (tmpUser.user.length > 32) {
				feedback.user = (feedback.user ?? "") + "Username too long.\n";
				result = false;
			}

			if (typeof props.hooks.validateInputs === 'function') {
				const hookRes = props.hooks.validateInputs(tmpUser);
				Object.keys(hookRes)
					.filter(key => Object.keys(feedback).includes(key))
					.map(key => feedback[key] = hookRes[key]);
				if (hookRes.errors === true)
					result = false;
			}

			inputsValid.value = result;
		};

		const checkIfChanged = async () => {
			let changes = false;
			for (let key of Object.keys(props.user)) {
				if (Array.isArray(tmpUser[key])) {
					if (tmpUser[key].sort().join(',') !== props.user[key].sort().join(','))
						changes = true
				} else if (tmpUser[key] !== props.user[key])
					changes = true;
			}
			nonMemberGroups.value = groups.filter(group => !(tmpUser.groups?.includes(group)));
			await validateInputs(); // validate first to avoid split second where apply is not disabled while invalid
			changesMade.value = changes;
		};

		const setCustomShell = (shellPath) => tmpUser.shell = shellObj(shellPath);

		watch(tmpUser, checkIfChanged); // deep watch for nested mutations

		watch(() => props.user, () => { // deep watch for nested mutations
			Object.assign(tmpUser, props.user);
			// the Object.assign should trigger the deep watch on tmpUser that calls checkIfChanged,
			// but for some reason it just won't trigger it. Running manually until it's figured out
			checkIfChanged();
		}, { deep: true });

		watch(addGroupSelectorValue, (group) => {
			addGroup(group);
			addGroupSelectorValue.value = "";
		});

		watch(groupsRef, () => { groups = groupsRef.value.map(groupObj => groupObj.group) }, { immediate: true });

		watch(() => customShell.path, () => Object.assign(customShell, shellObj(customShell.path)));

		if (typeof props.hooks.onInput === 'function') {
			watch(() => ({ ...tmpUser }), (newUser, oldUser) => props.hooks.onInput(tmpUser, oldUser));
		}

		return {
			tmpUser,
			changesMade,
			inputsValid,
			feedback,
			processing,
			shells,
			nonMemberGroups,
			showCustomShellModal,
			customShell,
			addGroupSelectorValue,
			cancel,
			apply,
			addGroup,
			removeGroup,
			setCustomShell,
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
		ModalPopup,
	},
	emits: [
		'applyChanges',
		'cancel',
	],
}
</script>
