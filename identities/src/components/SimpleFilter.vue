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

		onMounted(() => emit('update:modelValue', () => true));

		watch(() => props.set, () => {
			masterSet.value = [...(props.set)];
			clearSelected();
			// TODO: do it right
			//selected.value = new Set([...selected.value].filter(x => masterSet.value.includes(x)));
		}, { deep: true });

		return {
			selected,
			masterSet,
			showMenu,
			toggleSelect,
			clearSelected,
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
