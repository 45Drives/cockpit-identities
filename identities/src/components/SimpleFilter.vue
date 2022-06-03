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
	<FixedMenu
		:disabled="masterSet.length < 2"
		:title="masterSet.length < 2 ? 'Less than two options' : ''"
		extraMenuClasses="max-w-lg max-h-56 overflow-y-auto"
	>
		<template #buttonContent>
			<FilterIcon :class="[selected.size > 0 ? 'icon-45d' : 'icon-default', 'size-icon']" />
		</template>
		<div class="block w-40"></div>
		<div
			v-if="selected.size > 0"
			@click="clearSelected()"
			class="hover:text-white hover:bg-red-600 flex flex-row justify-between items-center px-4 py-2 text-sm"
		>
			<div class="block truncate font-semibold">Clear Filters</div>
		</div>
		<div
			v-for="item in masterSet"
			@click="toggleSelect(item)"
			class="hover:text-white hover:bg-red-600 flex flex-row justify-between items-center px-4 py-2 text-sm"
		>
			<div
				:class="[selected.has(item) ? 'font-semibold' : 'font-normal', 'block truncate']"
			>{{ item.name ?? item }}</div>
			<CheckIcon class="size-icon" v-if="selected.has(item)" aria-hidden="true" />
		</div>
	</FixedMenu>
</template>

<script>
import { onMounted, reactive, ref, watch } from 'vue';
import { CheckIcon, FilterIcon } from '@heroicons/vue/solid';
import FixedMenu from './FixedMenu.vue';

export default {
	props: {
		set: {
			type: Array,
			required: true,
		},
		modelValue: Function,
	},
	setup(props, { emit }) {
		const selected = ref(new Set([]));
		const masterSet = ref([...(props.set)]);
		const showMenu = ref(false);

		const toggleSelect = (item) => {
			if (selected.value.has(item))
				selected.value.delete(item);
			else
				selected.value.add(item);
			if (selected.value.size > 0)
				emit('update:modelValue', (item) => selected.value.has(item));
			else
				emit('update:modelValue', () => true);
		}

		const clearSelected = () => {
			selected.value.clear();
			emit('update:modelValue', () => true);
		}

		const asString = () => {
			return selected.value.size ? [...selected.value].join(', ') : '(all)';
		}

		onMounted(() => emit('update:modelValue', () => true));

		watch(() => props.set, () => {
			masterSet.value = [...(props.set)];
			clearSelected();
		}, { deep: true });

		return {
			selected,
			masterSet,
			showMenu,
			toggleSelect,
			clearSelected,
			asString,
		}
	},
	components: {
		CheckIcon,
		FilterIcon,
		FixedMenu,
	},
	emits: [
		'update:modelValue'
	],
	directives: {
		"click-outside": {
			mounted(el, binding, vnode) {
				el.clickOutsideEvent = (event) => {
					if (!(el === event.target || el.contains(event.target))) {
						binding.value();
					}
				};
				document.body.addEventListener("click", el.clickOutsideEvent);
			},
			unmounted(el) {
				document.body.removeEventListener("click", el.clickOutsideEvent);
			}
		},
	},
}
</script>
