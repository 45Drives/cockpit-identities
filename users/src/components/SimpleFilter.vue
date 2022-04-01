<template>
	<div v-click-outside="() => showMenu = false" :class="[noRelative ? '' : 'relative']">
		<FilterIcon class="w-5 h-5 text-gray-500 cursor-pointer" @click="showMenu = !showMenu" />
		<transition
			leave-active-class="transition ease-in duration-100"
			leave-from-class="opacity-100"
			leave-to-class="opacity-0"
		>
			<ul
				v-show="showMenu"
				class="absolute z-10 mt-1 right-3 top-8 w-40 bg-white dark:bg-neutral-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-y-auto focus:outline-none sm:text-sm"
			>
				<li
					v-if="selected.size > 0" @click="clearSelected()"
					class="hover:text-white hover:bg-red-600 py-2 pl-3 pr-9"
				>
					<span class="font-semibold select-none">Clear Filters</span>
				</li>
				<li
					v-for="item in masterSet"
					@click="toggleSelect(item)"
					class="hover:text-white hover:bg-red-600 cursor-default select-none py-2 pl-3 pr-4 flex flex-row flex-nowrap justify-between items-center"
				>
					<div
						:class="[selected.has(item) ? 'font-semibold' : 'font-normal', 'block truncate']"
					>{{ item }}</div>
					<CheckIcon class="h-5 w-5" v-if="selected.has(item)" aria-hidden="true" />
				</li>
			</ul>
		</transition>
	</div>
</template>

<script>
import { onMounted, reactive, ref, watch } from 'vue';
import { CheckIcon, FilterIcon } from '@heroicons/vue/solid';

export default {
	props: {
		set: {
			type: Array,
			required: true,
		},
		modelValue: Function,
		noRelative: {
			type: Boolean,
			required: false,
			default: false,
		}
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

		watch(() => props.set, () => { masterSet.value = [...(props.set)]; clearSelected() }, { deep: true });

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
