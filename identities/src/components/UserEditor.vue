<template>
	<div class="card-body space-y-content overflow-visible">
		<div v-if="createNew">
			<label class="block text-label">Username</label>
			<input type="text" class="w-full input-textlike" placeholder="Valid format: [a-z_][a-z0-9_-]*[$a-z0-9_-]"
				v-model="tmpUser.user" />
			<div class="feedback-group" v-if="feedback.user">
				<ExclamationCircleIcon class="size-icon icon-error" />
				<span v-html="feedback.user" class="text-feedback text-error"></span>
			</div>
		</div>
		<div>
			<label class="block text-label">Full Name/Description</label>
			<input type="text" class="w-full input-textlike" placeholder="Full Name" v-model="tmpUser.name" />
		</div>
		<div>
			<label class="block text-label">Home Directory</label>
			<input type="text" class="w-full input-textlike" placeholder="Path to Working Directory at login"
				v-model="tmpUser.home" />
			<div class="feedback-group" v-if="feedback.home">
				<ExclamationCircleIcon class="size-icon icon-error" />
				<span class="text-feedback text-error">{{ feedback.home }}</span>
			</div>
		</div>
		<Listbox as="div" v-if="tmpUser.shell" v-model="tmpUser.shell" class="overflow-visible">
			<ListboxLabel class="block text-label">Login Shell</ListboxLabel>
			<div class="relative overflow-visible">
				<ListboxButton class="relative w-full border pl-3 pr-10 py-2 input-textlike">
					<span class="w-full inline-flex truncate">
						<span class="truncate">{{ tmpUser.shell.name }}</span>
						<span class="ml-2 truncate text-muted">{{ tmpUser.shell.path }}</span>
					</span>
					<span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
						<SelectorIcon class="size-icon icon-default" aria-hidden="true" />
					</span>
				</ListboxButton>

				<transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100"
					leave-to-class="opacity-0">
					<ListboxOptions
						class="absolute z-10 mt-1 w-full bg-accent shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
						<ListboxOption as="template" v-for="shell in shells" :key="shell.path" :value="shell"
							v-slot="{ active, selected }">
							<li
								:class="[active ? 'text-white bg-red-600' : '', 'cursor-default select-none relative py-2 pl-3 pr-9']">
								<div class="flex">
									<span :class="[selected ? 'font-semibold' : 'font-normal', 'truncate']">{{
											shell.name
									}}</span>
									<span :class="[active ? 'text-red-200' : 'text-gray-500', 'ml-2 truncate']">{{
											shell.path
									}}</span>
								</div>

								<span v-if="selected"
									:class="[active ? 'text-white' : 'text-red-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
									<CheckIcon class="h-5 w-5" aria-hidden="true" />
								</span>
							</li>
						</ListboxOption>
						<ListboxOption as="template" :value="customShell" v-slot="{ active, selected }">
							<li
								:class="[active ? 'bg-red-600' : '', 'cursor-default select-none relative py-2 pl-3 pr-9']">
								<div class="flex items-baseline space-x-2">
									<span
										:class="[selected ? 'font-semibold' : 'font-normal', 'truncate', active ? 'text-white' : '']">Custom
										Shell</span>
									<input @click.stop
										@keydown.stop="e => { if (e.code === 'Enter') $emit('keydown', e) }"
										@keypress.stop="e => { if (e.code === 'Enter') $emit('keypress', e) }"
										@change="tmpUser.shell = customShell" v-model.lazy="customShell.path"
										type="text" placeholder="/path/to/custom/shell" class="input-textlike" />
								</div>
								<span v-if="selected"
									:class="[active ? 'text-white' : 'text-red-600', 'absolute inset-y-0 right-0 flex items-center pr-4']">
									<CheckIcon class="h-5 w-5" aria-hidden="true" />
								</span>
							</li>
						</ListboxOption>
					</ListboxOptions>
				</transition>
			</div>
		</Listbox>
		<div class="feedback-group" v-if="feedback.shell">
			<ExclamationCircleIcon class="size-icon icon-error" />
			<span v-html="feedback.shell" class="text-feedback text-error"></span>
		</div>
		<Table class="rounded-lg" emptyText="No groups. Click '+' to add one.">
			<template #header>
				<div class="flex flex-row justify-between items-center relative">
					<div>Groups</div>
					<FixedMenu extraMenuClasses="max-w-lg max-h-56 overflow-y-auto" hideOnClick>
						<template #buttonContent>
							<PlusIcon class="size-icon icon-default" />
						</template>
						<div class="block w-40"></div>
						<div v-for="group in nonMemberGroups" @click="addGroupSelectorValue = group" :title="group"
							class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm">
							{{ group }}
						</div>
					</FixedMenu>
				</div>
			</template>
			<template #thead>
				<tr>
					<th scope="col" class="sr-only">{{ tmpUser.name === "" ? tmpUser.user : tmpUser.name }}'s Groups
					</th>
					<th scope="col" class="sr-only">Remove</th>
				</tr>
			</template>
			<template #tbody>
				<slot name="primaryGroup" :primaryGroup="tmpUser?.primaryGroup ?? ''" />
				<tr v-for="(group, index) in tmpUser.groups">
					<td>
						{{ group }}
						<span v-if="group === tmpUser.primaryGroup" class="text-muted">(primary group)</span>
					</td>
					<td class="flex flex-row justify-end">
						<button v-if="group !== tmpUser.primaryGroup" @click="removeGroup(group)">
							<MinusIcon class="icon-danger size-icon" />
						</button>
					</td>
				</tr>
			</template>
		</Table>
	</div>
	<div class="card-footer">
		<div class="button-group-row">
			<slot />
			<div class="grow" />
			<button class="btn btn-secondary justify-self-end" v-if="changesMade" @click="cancel()">Cancel</button>
			<button class="btn btn-primary justify-self-end" :disabled="!(changesMade && inputsValid)"
				:title="!changesMade ? 'No changes to apply.' : (!inputsValid ? 'Cannot continue with errors.' : '')"
				@click="apply()">Apply</button>
		</div>
	</div>
</template>

<script>
import { ref, watch, reactive, inject, onMounted } from "vue";
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { CheckIcon, SelectorIcon, PlusIcon, MinusIcon, ExclamationCircleIcon } from '@heroicons/vue/solid';
import LoadingSpinner from "../components/LoadingSpinner.vue";
import { shellsInjectionKey, groupsInjectionKey } from "../keys";
import shellObj from "../hooks/shellObj";
import ModalPopup from './ModalPopup.vue';
import { useSpawn } from "@45drives/cockpit-helpers";
import Table from "./Table.vue";
import FixedMenu from "./FixedMenu.vue";

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
		const shells = inject(shellsInjectionKey);
		const groupsRef = inject(groupsInjectionKey);
		let groups = [];
		const nonMemberGroups = ref([]);
		const addGroupSelectorValue = ref("");
		const showCustomShellModal = ref(false);
		const customShell = reactive({ ...shellObj(""), isCustom: true });

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
			feedback.home = feedback.user = feedback.shell = "";

			if (tmpUser.home && !/^\//.test(tmpUser.home)) {
				feedback.home = "Home path must be absolute.";
				result = false;
			}

			if (!tmpUser.user) {
				feedback.user = (feedback.user ?? "") + "Username required.\n";
				result = false;
			} else if (!/^[a-z_][a-z0-9_-]*[\$a-z0-9_-]?$/.test(tmpUser.user)) {
				const invalidCharacters = [...(tmpUser.user.match(/(?:^[^a-z_]|(?<=.+)[^a-z0-9_-](?=.+)|[^\$a-z0-9_-]$)/g) ?? [])];
				feedback.user = (feedback.user ?? "")
					+ `Invalid character${invalidCharacters.length > 1 ? 's' : ''}: `
					+ invalidCharacters.filter((c, i, a) => a.indexOf(c) === i).map(char => `'${char}'`).join(', ') + '\n';
				result = false;
			}
			if (tmpUser.user.length > 32) {
				feedback.user = (feedback.user ?? "") + "Username too long.\n";
				result = false;
			}

			if (tmpUser.shell === customShell) {
				try {
					await useSpawn(['stat', tmpUser.shell.path], { superuser: 'try' }).promise();
					try {
						let argv = ['test', '-x', tmpUser.shell.path];
						if (!props.createNew)
							argv = ['sudo', '-u', tmpUser.user, ...argv];
						await useSpawn(argv, { superuser: 'try' }).promise();
						try {
							await useSpawn(['test', '-d', tmpUser.shell.path], { superuser: 'try' }).promise();
							feedback.shell = `${tmpUser.shell.path} is a directory.`;
							result = false;
						} catch { }
					} catch (state) {
						feedback.shell = `${tmpUser.shell.path} cannot be executed${props.createNew ? "" : ` by ${tmpUser.user}`}.`;
						result = false;
					}
				} catch {
					feedback.shell = `${tmpUser.shell.path} does not exist. (stat failed)`;
					result = false;
				}
			}

			if (typeof props.hooks.validateInputs === 'function') {
				const hookRes = await props.hooks.validateInputs(tmpUser);
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
				} else if (tmpUser[key].isShellObj && (tmpUser[key].path !== props.user[key].path)) {
					changes = true; // special check for shell
				} else if (!tmpUser[key].isShellObj && tmpUser[key] !== props.user[key])
					changes = true;
			}
			await validateInputs(); // validate first to avoid split second where apply is not disabled while invalid
			changesMade.value = changes;
		};

		onMounted(() => {
			watch(groupsRef, () => {
				groups = groupsRef.value.map(groupObj => groupObj.group); // get just plain group names
				nonMemberGroups.value = groups.filter(group => !(tmpUser.groups?.includes(group)));
			}, { immediate: true });

			watch(tmpUser, checkIfChanged); // deep watch for nested mutations

			watch(() => tmpUser.groups, () => {
				nonMemberGroups.value = groups.filter(group => !(tmpUser.groups?.includes(group))).sort();
			});

			watch(() => props.user, () => { // deep watch for nested mutations
				Object.assign(tmpUser, props.user);
				if (!shells.value.includes(tmpUser.shell)) {
					Object.assign(customShell, tmpUser.shell);
					tmpUser.shell = customShell;
				}
				// the Object.assign should trigger the deep watch on tmpUser that calls checkIfChanged,
				// but for some reason it just won't trigger it. Running manually until it's figured out
				checkIfChanged();
			}, { deep: true, immediate: true });

			watch(addGroupSelectorValue, (group) => {
				addGroup(group);
				addGroupSelectorValue.value = "";
			});

			watch(groupsRef, () => { groups = groupsRef.value.map(groupObj => groupObj.group) }, { immediate: true });

			watch(() => customShell.path, () => Object.assign(customShell, shellObj(customShell.path)));

			if (typeof props.hooks.onInput === 'function') {
				watch(() => ({ ...tmpUser }), (newUser, oldUser) => props.hooks.onInput(tmpUser, oldUser));
			}
		});

		return {
			groupsRef,
			tmpUser,
			changesMade,
			inputsValid,
			feedback,
			shells,
			nonMemberGroups,
			showCustomShellModal,
			customShell,
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
		ModalPopup,
		Table,
		FixedMenu,
	},
	emits: [
		'applyChanges',
		'cancel',
	],
}
</script>
