<template>
	<div class="mt-1 flex flex-col">
		<div class="-my-2 -mx-4 sm:-mx-6 lg:-mx-8">
			<div class="min-w-full py-2 align-middle md:px-6 lg:px-8 flex flex-col overflow-x-auto">
				<div
					class="shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg inline-flex flex-col items-stretch overflow-x-visible"
				>
					<div
						class="self-stretch flex flex-row flex-nowrap justify-between items-baseline bg-neutral-50 dark:bg-neutral-800"
					>
						<div class="flex flex-row space-x-2 items-center">
							<div
								v-if="user !== null"
								class="py-3.5 pl-4 text-left text-sm font-semibold sm:pl-6 lg:pl-8 whitespace-nowrap"
							>{{ user.name === "" ? user.user : user.name }}'s Login History</div>
							<div
								v-else
								class="py-3.5 pl-4 text-left text-sm font-semibold sm:pl-6 lg:pl-8 whitespace-nowrap"
							>User Login History</div>
							<LoadingSpinner v-if="processing" class="w-5 h-5" />
						</div>
						<Datepicker
							v-model="range"
							range
							:partialRange="false"
							placeholder="Date Range"
							:dark="darkMode"
							class="w-auto mr-4"
							:format="rangePreviewFormatter"
						/>
					</div>
					<div class="relative">
						<div class="flex flex-col overflow-y-auto max-h-80">
							<table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
								<thead class="bg-neutral-50 dark:bg-neutral-800">
									<tr>
										<th
											v-if="user === null"
											scope="col"
											class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>
											<div class="flex flex-row flex-nowrap justify-end space-x-2">
												<div class="grow">User</div>
												<SortCallbackButton
													v-model="sortCallback"
													:compareFunc="compareFuncs.user"
													:initialFuncIsMine="true"
												/>
												<SimpleFilter
													:noRelative="true"
													:set="filters.users.set"
													v-model="filters.users.callback"
												/>
											</div>
										</th>
										<th
											scope="col"
											class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>
											<div class="flex flex-row flex-nowrap justify-end space-x-2">
												<div class="grow">Session Start</div>
												<SortCallbackButton v-model="sortCallback" :compareFunc="compareFuncs.sessionStart" />
											</div>
										</th>
										<th
											scope="col"
											class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>
											<div class="flex flex-row flex-nowrap justify-end space-x-2">
												<div class="grow">Session End</div>
												<SortCallbackButton v-model="sortCallback" :compareFunc="compareFuncs.sessionEnd" />
											</div>
										</th>
										<th
											scope="col"
											class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>
											<div class="flex flex-row flex-nowrap justify-end space-x-2">
												<div class="grow">Time Logged In</div>
												<SortCallbackButton v-model="sortCallback" :compareFunc="compareFuncs.sessionTime" />
											</div>
										</th>
										<th
											scope="col"
											class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>
											<div class="flex flex-row flex-nowrap justify-between space-x-5">
												<span>IP Address</span>
												<SimpleFilter :noRelative="true" :set="filters.ips.set" v-model="filters.ips.callback" />
											</div>
										</th>
										<th
											scope="col"
											class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
										>
											<div class="flex flex-row flex-nowrap justify-between space-x-5">
												<span>TTY</span>
												<SimpleFilter
													:noRelative="true"
													:set="filters.ttys.set"
													v-model="filters.ttys.callback"
												/>
											</div>
										</th>
									</tr>
								</thead>
								<tbody class="dark:bg-neutral-800">
									<tr
										v-for="(entry, index) in historyReactive"
										v-show="filters.users.callback(entry.user) && filters.ips.callback(entry.ip) && filters.ttys.callback(entry.tty)"
										:class="index % 2 === 0 ? undefined : 'bg-neutral-50 dark:bg-neutral-700'"
									>
										<td
											v-if="user === null"
											class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
										>{{ entry.user }}</td>
										<td
											class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
										>{{ formatDate(entry.sessionStart) }}</td>
										<td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8">
											<span v-if="entry.stillLoggedIn">Still Logged In</span>
											<span v-else>{{ formatDate(entry.sessionEnd) }}</span>
										</td>
										<td
											class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
										>{{ entry.sessionTime ?? "" }}</td>
										<td
											class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
										>{{ entry.ip }}</td>
										<td
											class="whitespace-nowrap py-4 pl-4 pr\-3 text-sm font-medium sm:pl-6 lg:pl-8"
										>{{ entry.tty }}</td>
									</tr>
									<tr v-if="history.length === 0">
										<td
											class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-6 lg:pl-8"
										>Nothing to show.</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { ref, reactive, watch, inject, onMounted, computed } from 'vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useSpawn, errorString } from '../hooks/useSpawn';
import { FilterIcon } from '@heroicons/vue/solid';
import SimpleFilter from './SimpleFilter.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import SortCallbackButton from './SortCallbackButton.vue';
import moment from 'moment';

function formatDateForLast(date) {
	const year = date.getFullYear().toString().padStart(4, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	const hour = date.getHours().toString().padStart(2, '0');
	const minute = date.getMinutes().toString().padStart(2, '0');
	return `${year}-${month}-${day} ${hour}:${minute}`;
}

function sessionTimeToSentence(sessionTime) {
	const matchGroups = sessionTime.match(/^(?:(\d+)\+)?(\d{2}):(\d{2})$/)?.slice(1).map(num => num === null ? num : parseInt(num)) ?? null;
	if (!matchGroups)
		return sessionTime;
	return (matchGroups[0] ? `${matchGroups[0]} Day${matchGroups[0] === 1 ? '' : 's'}, ` : "")
		+ (matchGroups[1] !== 0 ? `${matchGroups[1]} Hour${matchGroups[1] === 1 ? '' : 's'}, ` : "")
		+ `${matchGroups[2]} Minute${matchGroups[2] === 1 ? '' : 's'}`;
}

function sessionTimeToObj(sessionTime) {
	const matchGroups = sessionTime?.match(/^(?:(\d+)\+)?(\d{2}):(\d{2})$/)?.slice(1).map(num => num === null ? num : parseInt(num)) ?? null;
	if (!matchGroups)
		return { days: 0, hours: 0, minutes: 0 };
	return {
		days: isNaN(matchGroups[0]) ? 0 : matchGroups[0],
		hours: matchGroups[1],
		minutes: matchGroups[2],
	};
}

function timeSince(start) {
	const diff = new Date() - new Date(start); // milliseconds
	let minutes = Math.floor(diff / 1000 / 60);
	let hours = Math.floor(minutes / 60);
	let days = Math.floor(hours / 24);
	minutes %= 60;
	hours %= 24;
	return (days ? `${days} Day${days === 1 ? '' : 's'}, ` : "")
		+ (hours !== 0 ? `${hours} Hour${hours === 1 ? '' : 's'}, ` : "")
		+ `${minutes} Minute${minutes === 1 ? '' : 's'}`;
}

function sameDay(a, b) {
	return a.getFullYear() === b.getFullYear()
		&& a.getMonth() === b.getMonth()
		&& a.getDate() === b.getDate();
}

function tryDate(date) {
	const dateObj = new Date(date);
	if (isNaN(dateObj.getTime()))
		return null;
	return dateObj;
}

export default {
	props: {
		user: {
			type: Object,
			required: false,
			default: null,
		},
		initialRangeDays: {
			type: Number,
			required: false,
			default: 7,
		}
	},
	setup(props) {
		const range = ref();
		const history = ref([]);
		const historyReactive = reactive(history);
		const processing = inject('processing');
		const darkMode = inject('darkMode');
		const filters = reactive({
			users: {
				set: new Set([]),
				callback: () => true,
			},
			ips: {
				set: new Set([]),
				callback: () => true,
			},
			ttys: {
				set: new Set([]),
				callback: () => true,
			},
		});
		const compareFuncs = reactive({
			user: (entry1, entry2) => entry1.user.localeCompare(entry2.user),
			sessionStart: (entry1, entry2) => entry1.sessionStart - entry2.sessionStart,
			sessionEnd: (entry1, entry2) => entry1.sessionEnd - entry2.sessionEnd,
			sessionTime: (entry1, entry2) => {
				const match1 = entry1.sessionTime.match(/^(?:(\d+) Days?, )?(?:(\d+) Hours?, )?(\d+) Minutes?$/).slice(1);
				const match2 = entry2.sessionTime.match(/^(?:(\d+) Days?, )?(?:(\d+) Hours?, )?(\d+) Minutes?$/).slice(1);
				return ((match1[0] ? parseInt(match1[0]) * 1440 : 0) + (match1[1] ? parseInt(match1[1]) * 60 : 0) + (match1[2]))
					- ((match2[0] ? parseInt(match2[0]) * 1440 : 0) + (match2[1] ? parseInt(match2[1]) * 60 : 0) + (match2[2]));
			},
		});
		const sortCallback = ref(compareFuncs.user);

		const getHistory = async () => {
			processing.value++;

			Object.keys(filters).map(key => filters[key].set.clear());

			const argv = ['last', '--fullnames', '--time-format=iso', '--ip'];

			if (range.value?.[0])
				argv.push('--since', formatDateForLast(range.value[0]));
			if (range.value?.[1])
				argv.push('--until', formatDateForLast(range.value[1]));

			if (props.user !== null)
				argv.push(props.user.user);

			try {
				const historyDB = (await useSpawn(argv, { superuser: 'try' }).promise()).stdout;
				history.value = historyDB.split('\n')
					.filter(line => !(/^\s*$/.test(line) || /^[wb]tmp begins/.test(line))) // remove empty lines and last line
					.map(line => {
						const match = line.match(/^(\S+)\s+(\S+(?: \S+)*)\s+(\d{1,3}(?:.\d{1,3}){3})\s+(\S+)(?: - (\S+)\s+\(([^\)]+)\)|\s+(\S+(?: \S+)*))/)?.slice(1);
						if (!match)
							return null;
						try {
							const obj = reactive({
								user: match[0],
								tty: match[1],
								ip: match[2],
								sessionStart: tryDate(match[3]),
								sessionEnd: null, // end time or "still logged in" (or something else?)
								sessionTime: match[5] ? sessionTimeToSentence(match[5]) : "0 Minutes",
								stillLoggedIn: false,
							});
							if (match[6] === "still logged in") {
								// live update time
								setInterval(() => {
									obj.sessionTime = timeSince(match[3]);
									obj.sessionEnd = new Date();
								}, 60 * 1000);
								obj.sessionTime = timeSince(match[3])
								obj.stillLoggedIn = true;
							}
							const sessionTimeObj = sessionTimeToObj(match[5]);
							obj.sessionEnd = tryDate(match[4])
								?? ((!match[5])
									? new Date()
									: moment(obj.sessionStart)
										.add(sessionTimeObj.days, "days")
										.add(sessionTimeObj.hours, "hours")
										.add(sessionTimeObj.minutes, "minutes")
										.toDate()
								);
							filters.users.set.add(obj.user);
							filters.ips.set.add(obj.ip);
							filters.ttys.set.add(obj.tty);
							return obj;
						} catch (error) {
							throw new Error(error.message + `, trigger: ${line}`);
						}
					}).filter(entry => entry !== null).sort(sortCallback.value);
			} catch (state) {
				console.error("Error getting login history: " + errorString(state));
				return;
			}
			processing.value--;
		}

		const rangePreviewFormatter = (previewRange) => {
			let result = "";
			result += previewRange[0].toLocaleDateString([], { dateStyle: "short" });
			if (previewRange[1] !== null) {
				if (sameDay(...previewRange))
					result += `, ${previewRange[0].getHours().toString().padStart(2, '0')}:${previewRange[0].getMinutes().toString().padStart(2, '0')} - ${previewRange[1].getHours()}:${previewRange[1].getMinutes()}`;
				else
					result += ` - ${previewRange[1].toLocaleDateString([], { dateStyle: "short" })}`;
			}
			return result;
		}

		const formatDate = (date) => {
			if (!(date instanceof Date))
				return date;
			const useBrowserLocale = [];
			try {
				return new Intl.DateTimeFormat(useBrowserLocale, { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
			} catch (error) {
				console.error(`Error formatting date: ${JSON.stringify(date)} ` + error.message);
				return date;
			}
		}

		onMounted(() => {
			const to = new Date();
			const from = new Date(new Date().setDate(to.getDate() - props.initialRangeDays));
			to.setHours(23, 59, 59);
			from.setHours(0, 0, 0);
			range.value = [from, to];
			watch(() => props.user, getHistory, { immediate: true, deep: true });
			watch(range, getHistory);
			watch(sortCallback, () => {
				processing.value++;
				history.value.sort(sortCallback.value);
				processing.value--;
			});
		});

		return {
			range,
			history,
			historyReactive,
			processing,
			darkMode,
			filters,
			compareFuncs,
			sortCallback,
			rangePreviewFormatter,
			formatDate,
		}
	},
	components: {
		Datepicker,
		FilterIcon,
		SimpleFilter,
		LoadingSpinner,
		SortCallbackButton,
	}
}
</script>
