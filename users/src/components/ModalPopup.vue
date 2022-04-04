<template>
	<TransitionRoot as="template" :show="showModal">
		<Dialog as="div" class="fixed z-10 inset-0 overflow-y-auto">
			<div
				class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
			>
				<TransitionChild
					as="template"
					enter="ease-out duration-300"
					enter-from="opacity-0"
					enter-to="opacity-100"
					leave="ease-in duration-200"
					leave-from="opacity-100"
					leave-to="opacity-0"
				>
					<DialogOverlay class="fixed inset-0 bg-neutral-500/75 dark:bg-black/50 transition-opacity" />
				</TransitionChild>

				<!-- This element is to trick the browser into centering the modal contents. -->
				<span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
				<TransitionChild
					as="template"
					enter="ease-out duration-300"
					enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
					enter-to="opacity-100 translate-y-0 sm:scale-100"
					leave="ease-in duration-200"
					leave-from="opacity-100 translate-y-0 sm:scale-100"
					leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
				>
					<div
						class="relative inline-block align-bottom bg-white dark:bg-neutral-900 px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
					>
						<div class="sm:flex sm:items-start mb-2">
							<slot />
						</div>
						<div class="flex flex-row space-x-3 justify-end">
							<button
								v-if="!noCancel"
								type="button"
								class="btn btn-secondary"
								@click="onCancel"
							>{{ cancelText }}</button>
							<button
								type="button"
								:class="['btn', 'btn-primary']"
								@click="onApply"
								:disabled="disableContinue"
							>{{ applyText }}</button>
						</div>
					</div>
				</TransitionChild>
			</div>
		</Dialog>
	</TransitionRoot>
</template>

<script>
import { Dialog, DialogOverlay, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';

export default {
	props: {
		showModal: Boolean,
		noCancel: {
			type: Boolean,
			required: false,
			default: false,
		},
		cancelText: {
			type: String,
			required: false,
			default: "Cancel",
		},
		applyText: {
			type: String,
			required: false,
			default: "Apply",
		},
		disableContinue: Boolean,
		onApply: Function,
		onCancel: Function,
	},
	components: {
		Dialog,
		DialogOverlay,
		DialogTitle,
		TransitionChild,
		TransitionRoot,
	},
};
</script>
