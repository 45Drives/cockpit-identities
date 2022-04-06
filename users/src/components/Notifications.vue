<template>
	<!-- Global notification live region, render this permanently at the end of the document -->
	<div
		aria-live="assertive"
		class="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-20 h-screen overflow-y-auto"
	>
		<div class="w-full flex flex-col items-center space-y-4 sm:items-end">
			<!-- Notification panel, dynamically insert this into the live region when it needs to be displayed -->
			<transition
				v-for="notification in notificationList"
				:key="notification.id"
				enter-active-class="transform ease-out duration-300 transition"
				enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
				enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
				leave-active-class="transition ease-in duration-100"
				leave-from-class="opacity-100"
				leave-to-class="opacity-0"
				class="transition-transform"
			>
				<div
					v-if="notification.show"
					class="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden"
				>
					<div class="p-4">
						<div class="flex items-start">
							<div class="flex-shrink-0">
								<ExclamationCircleIcon
									v-if="notification.level === 'error'"
									class="h-6 w-6 text-red-600"
									aria-hidden="true"
								/>
								<ExclamationCircleIcon
									v-else-if="notification.level === 'warning'"
									class="h-6 w-6 text-yellow-400"
									aria-hidden="true"
								/>
								<CheckCircleIcon
									v-else-if="notification.level === 'success'"
									class="h-6 w-6 text-green-500"
									aria-hidden="true"
								/>
								<InformationCircleIcon v-else class="h-6 w-6 text-blue-500" aria-hidden="true" />
							</div>
							<div class="ml-3 w-0 flex-1 pt-0.5">
								<p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
								<p class="mt-1 text-sm text-gray-500 whitespace-pre-wrap" v-html="notification.body"></p>
								<div v-if="notification.actions?.length" class="mt-3 flex space-x-7">
									<button v-for="action in notification.actions" @click="action.callback">{{ action.text }}</button>
									<button
										@click="notification.show = false"
										type="button"
										class="bg-white rounded-md text-sm font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-0 focus:ring-offset-0"
									>Dismiss</button>
								</div>
							</div>
							<div class="ml-4 flex-shrink-0 flex">
								<button
									@click="notification.show = false"
									class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-0 focus:ring-offset-0"
								>
									<span class="sr-only">Close</span>
									<XIcon class="h-5 w-5" aria-hidden="true" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</transition>
		</div>
	</div>
</template>

<script>
import { ref, watch } from 'vue';
import { InformationCircleIcon, ExclamationCircleIcon, MinusCircleIcon, CheckCircleIcon } from '@heroicons/vue/outline';
import { XIcon } from '@heroicons/vue/solid';
import FIFO from '../classes/FIFO';
import UniqueIDGenerator from '../classes/UniqueIDGenerator';

/** Notification passed to showNotification
 * 
 * @typedef {Object} Notification
 * @property {string} title -  Header text
 * @property {string} body - Notification content
 * @property {string} level - 'info'|'warning'|'error'|'success'
 * @property {number} timeout - time to display notification
 * @property {function} addAction - add action to notification
 */

export default {
	props: {
		notificationFIFO: FIFO,
	},
	setup(props) {
		const notificationList = ref([]);

		const uniqueIDGenerator = new UniqueIDGenerator();

		/** Construct new notification and show it
		 * 
		 * @param {string} title - Header text
		 * @param {string} body - Notification content
		 * @param {string} [level='info'] - 'info'|'warning'|'error'|'success'
		 * @param {number} [timeout=10000] - time to display notification in milliseconds, or zero to display forever
		 * 
		 * @returns {Notification} - Object to chain add actions to
		 */
		const constructNotification = (title, body, level = 'info', timeout = 10000) => {
			const actions = [];
			const obj = {
				show: true,
				title,
				body,
				level,
				timeout,
				actions,
				/** Add an action to the notification (chainable)
				 * 
				 * @param {string} text button text for action
				 * @param {function} callback onclick callback for action
				 */
				addAction(text, callback) {
					actions.push({ text, callback });
					return this;
				},
			}
			showNotificationObj(obj);
			return obj;
		}

		/** Display notification to screen
		 * 
		 * @param {Notification} notificationObj notification to display
		 * 
		 */
		const showNotificationObj = (notificationObj) => {
			notificationObj.show = true;
			notificationObj.id = uniqueIDGenerator.get();
			notificationList.value = [notificationObj, ...notificationList.value];
			if (notificationObj.timeout > 0) {
				setTimeout(
					() => notificationObj.show = false,
					notificationObj.timeout
				);
				setTimeout(
					() => {
						notificationList.value = notificationList.value.filter(obj => obj !== notificationObj);
						uniqueIDGenerator.release(notificationObj.id);
					},
					notificationObj.timeout + 2000
				);
			}
		}

		watch(() => props.notificationFIFO.getLen(), (newLen, oldLen) => {
			if (newLen > oldLen) {
				try {
					const notification = props.notificationFIFO.pop();
					if (notification)
						showNotificationObj(notification);
				} catch (error) {
					console.error(error);
					constructNotification("System Error", "An error occured, check the system console (CTRL+SHIFT+J) for more information.", 'error');
				}
			}
		});

		return {
			notificationList,
			constructNotification,
			showNotificationObj,
		}
	},
	components: {
		InformationCircleIcon,
		ExclamationCircleIcon,
		MinusCircleIcon,
		CheckCircleIcon,
		XIcon,
	},
}
</script>
