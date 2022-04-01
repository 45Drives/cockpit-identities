<template>
	<component
		:class="[funcIsMine ? 'text-red-600' : '', 'w-5 h-5 text-gray-500 cursor-pointer']"
		:is="iconComponent"
		@click="updateModel()"
	/>
</template>

<script>
import { ref, watch } from 'vue';
import { SortAscendingIcon, SortDescendingIcon } from "@heroicons/vue/solid";

export default {
	props: {
		modelValue: Function,
		compareFunc: Function,
	},
	setup(props, { emit }) {
		const reverse = ref(false);
		const funcIsMine = ref(false);
		const iconComponent = ref(SortAscendingIcon);

		const updateModel = () => {
			if (funcIsMine.value)
				reverse.value = !reverse.value;
			iconComponent.value = reverse.value ? SortDescendingIcon : SortAscendingIcon;
			if (reverse.value)
				emit('update:modelValue', (a, b) => props.compareFunc(b, a));
			else
				emit('update:modelValue', (a, b) => props.compareFunc(a, b));
			// timeout to not overwrite change with self-triggered watch from emit
			setTimeout(() => funcIsMine.value = true, 100);
		};

		watch(() => props.modelValue, () => {
			funcIsMine.value = false;
		});

		return {
			reverse,
			funcIsMine,
			iconComponent,
			updateModel,
		}
	},
	components: {
		SortAscendingIcon,
		SortDescendingIcon
	},
	emits: [
		'update:modelValue'
	],
}
</script>
