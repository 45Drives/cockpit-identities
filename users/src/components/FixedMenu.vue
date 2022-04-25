<template>
	<div class="inline-block text-left overflow-visible" v-click-outside="hideMenu">
		<button
			:disabled="disabled"
			:title="title"
			v-if="!noButton"
			@click="showMenu"
			ref="buttonElement"
		>
			<slot name="buttonContent">
				<span class="sr-only">{{ screenReaderButtonText }}</span>
				<MenuIcon class="size-icon icon-default" />
			</slot>
		</button>

		<transition
			enter-active-class="transition ease-out duration-100"
			enter-from-class="transform opacity-0 scale-95"
			enter-to-class="transform opacity-100 scale-100"
			leave-active-class="transition ease-in duration-75"
			leave-from-class="transform opacity-100 scale-100"
			leave-to-class="transform opacity-0 scale-95"
		>
			<div
				:class="['fixed z-30', menuClasses, extraMenuClasses]"
				v-show="menuVisible"
				ref="menuElement"
			>
				<div
					v-for="option in options"
					@click="option.callback?.()"
					class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm"
				>
					<div class="font-normal block truncate">{{ option.text }}</div>
				</div>
				<slot />
			</div>
		</transition>
	</div>
</template>

<script>
import { onBeforeUnmount, onBeforeUpdate, onMounted, onUnmounted, reactive, ref, watchEffect } from 'vue';
import { MenuIcon } from '@heroicons/vue/solid';

function fakeBoundingRect(x, y, w, h) {
	return {
		left: x,
		right: x + (w ?? 0),
		top: y,
		bottom: y + (h ?? 0),
		width: w ?? 0,
		height: h ?? 0,
	};
}

export default {
	props: {
		options: {
			type: Array,
			required: false,
			default: [],
		},
		noButton: Boolean,
		snapToMouse: Boolean,
		disabled: Boolean,
		title: String,
		screenReaderButtonText: {
			type: String,
			required: false,
			default: "Open menu",
		},
		menuClasses: {
			type: String,
			required: false,
			default: "rounded-md shadow-lg bg-default py-1 flex flex-col items-stretch",
		},
		extraMenuClasses: String,
		boundingRect: {
			type: Object,
			required: false,
			default: {
				x: 0,
				y: 0,
				left: 0,
				top: 0,
				right: window.innerWidth,
				bottom: window.innerHeight,
				width: window.innerWidth,
				height: window.innerHeight,
			},
		},
		position: Object,
		prefer: {
			type: String,
			required: false,
			default: 'bottom-left',
		}
	},
	setup(props, { emit }) {
		const buttonElement = ref(null);
		const menuElement = ref(null);
		const menuVisible = ref(false);

		let intervalHandle = null;

		const setPosition = (anchorRect) => {
			const menuRect = menuElement.value?.getBoundingClientRect();
			if (!menuRect)
				return;
			if (/bottom/.test(props.prefer)) {
				if ((anchorRect.bottom + menuRect.height) < props.boundingRect.bottom) {
					menuElement.value.style.top = `${anchorRect.bottom}px`;
				} else {
					menuElement.value.style.top = `${anchorRect.top - menuRect.height}px`;
				}
			} else {
				if ((anchorRect.top - menuRect.height) > props.boundingRect.top) {
					menuElement.value.style.top = `${anchorRect.top - menuRect.height}px`;
				} else {
					menuElement.value.style.top = `${anchorRect.bottom}px`;
				}
			}
			if (/left/.test(props.prefer)) {
				if ((anchorRect.right - menuRect.width) > props.boundingRect.left) {
					menuElement.value.style.left = `${anchorRect.right - menuRect.width}px`;
				} else {
					menuElement.value.style.left = `${anchorRect.left}px`;
				}
			} else {
				if ((anchorRect.left + menuRect.width) < props.boundingRect.right) {
					menuElement.value.style.left = `${anchorRect.left}px`;
				} else {
					menuElement.value.style.left = `${anchorRect.right - menuRect.width}px`;
				}
			}

		}

		const showMenu = (event) => {
			if (props.snapToMouse) {
				if (event.clientX !== undefined && event.clientY !== undefined)
					setPosition(fakeBoundingRect(event.clientX, event.clientY));
			} else if (!props.noButton) {
				intervalHandle = setInterval(() => {
					const rect = buttonElement.value?.getBoundingClientRect();
					if (rect)
						setPosition(rect);
				}, 1000 / 60);
			} else if (props.position?.x !== undefined && props.prosition?.y !== undefined) {
				setPosition(fakeBoundingRect(props.position.x, props.position.y));
			}
			menuVisible.value = true;
		}

		const hideMenu = () => {
			menuVisible.value = false;
			if (intervalHandle)
				clearInterval(intervalHandle);
		}

		let origMenuParent;

		onMounted(() => {
			origMenuParent = menuElement.value.parentElement;
			origMenuParent.removeChild(menuElement.value);
			document.documentElement.append(menuElement.value);
		});

		onBeforeUnmount(() => {
			if (intervalHandle)
				clearInterval(intervalHandle);
			document.documentElement.removeChild(menuElement.value);
			origMenuParent.append(menuElement.value);
		});

		return {
			buttonElement,
			menuElement,
			menuVisible,
			showMenu,
			hideMenu,
		}
	},
	components: {
		MenuIcon,
	},
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
