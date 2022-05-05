<template>
	<Table stickyHeaders noShrink>
		<template #header>
			<div class="self-stretch flex flex-row flex-wrap gap-3 justify-between items-baseline">
				<div class="flex flex-row space-x-2 items-center">
					<div v-if="user !== null">{{ user.name === "" ? user.user : user.name }}'s Login History</div>
					<div v-else>User Login History</div>
					<button @click="saveCSV" title="Save data as CSV">
						<DocumentDownloadIcon class="size-icon icon-default" />
					</button>
					<LoadingSpinner v-if="processing" class="size-icon" />
				</div>
				<Datepicker
					v-model="range"
					range
					:partialRange="false"
					placeholder="Date Range"
					:dark="darkMode"
					:format="rangePreviewFormatter"
					autoApply
					teleport="#app"
					enableSeconds
					:startTime="[{ hours: 0, minutes: 0, seconds: 0 }, { hours: 23, minutes: 59, seconds: 59 }]"
				/>
			</div>
		</template>
		<template #thead>
			<tr>
				<th v-if="user === null" scope="col">
					<div class="flex flex-row flex-nowrap space-x-2">
						<div class="grow">User</div>
						<SimpleFilter :set="filters.users.set" v-model="filters.users.callback" />
						<SortCallbackButton v-model="sortCallback" :compareFunc="compareFuncs.user" />
					</div>
				</th>
				<th scope="col">
					<div class="flex flex-row flex-nowrap space-x-2">
						<div class="grow">Session Start</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="compareFuncs.sessionStart"
							initialFuncIsMine
							startReversed
						/>
					</div>
				</th>
				<th scope="col">
					<div class="flex flex-row flex-nowrap space-x-2">
						<div class="grow">Session End</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="compareFuncs.sessionEnd"
							startReversed
						/>
					</div>
				</th>
				<th scope="col">
					<div class="flex flex-row flex-nowrap space-x-2">
						<div class="grow">Time Logged In</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="compareFuncs.sessionTime"
							startReversed
						/>
					</div>
				</th>
				<th scope="col">
					<div class="flex flex-row flex-nowrap justify-between space-x-5">
						<span>IP Address</span>
						<SimpleFilter :set="filters.ips.set" v-model="filters.ips.callback" />
					</div>
				</th>
				<th scope="col">
					<div class="flex flex-row flex-nowrap justify-between space-x-5">
						<span>TTY</span>
						<SimpleFilter :set="filters.ttys.set" v-model="filters.ttys.callback" />
					</div>
				</th>
				<th scope="col">
					<div class="flex flex-row flex-nowrap justify-between space-x-5">
						<span>Auth Result</span>
						<SimpleFilter :set="filters.authResults.set" v-model="filters.authResults.callback" />
					</div>
				</th>
			</tr>
		</template>
		<template #tbody>
			<tr
				v-for="(entry, index) in historyReactive"
				v-show="filters.users.callback(entry.user) && filters.ips.callback(entry.ip) && filters.ttys.callback(entry.tty) && filters.authResults.callback(entry.authResult)"
			>
				<td v-if="user === null">{{ entry.user }}</td>
				<td>{{ formatDate(entry.sessionStart) }}</td>
				<td>{{ entry.overrideEndText ?? formatDate(entry.sessionEnd) }}</td>
				<td>{{ entry.sessionTime ?? "" }}</td>
				<td>{{ entry.ip }}</td>
				<td>{{ entry.tty }}</td>
				<td>{{ entry.authResult }}</td>
			</tr>
		</template>
	</Table>
</template>

<script>
import { ref, reactive, watch, inject, onMounted } from 'vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useSpawn, errorStringHTML, generatedFileDownload } from '@45drives/cockpit-helpers';
import { FilterIcon, DocumentDownloadIcon } from '@heroicons/vue/solid';
import SimpleFilter from './SimpleFilter.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import SortCallbackButton from './SortCallbackButton.vue';
import moment from 'moment';
import { darkModeInjectionKey, notificationsInjectionKey } from '../keys';
import Table from './Table.vue';

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

function isSameDay(a, b) {
	return a.getFullYear() === b.getFullYear()
		&& a.getMonth() === b.getMonth()
		&& a.getDate() === b.getDate();
}

function isFullDay(a, b) {
	return isSameDay(a, b)
		&& a.getHours() === 0
		&& a.getMinutes() === 0
		&& a.getSeconds() === 0
		&& b.getHours() === 23
		&& b.getMinutes() === 59
		&& b.getSeconds() === 59
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
		},
	},
	setup(props) {
		const range = ref();
		const history = ref([]);
		const historyReactive = reactive(history);
		const processing = ref(0);
		const darkMode = inject(darkModeInjectionKey);
		const notifications = inject(notificationsInjectionKey);
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
			authResults: {
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
		const sortCallback = ref(() => 0);

		const getHistory = async () => {
			processing.value++;
			try {
				Object.keys(filters).map(key => filters[key].set.clear());

				const opts = ['--fullnames', '--time-format=iso', '--ip'];

				if (range.value?.[0])
					opts.push('--since', formatDateForLast(range.value[0]));
				if (range.value?.[1])
					opts.push('--until', formatDateForLast(range.value[1]));

				if (props.user !== null)
					opts.push(props.user.user);

				try {
					let tmpHistory = [];
					for (let arg of ['last', 'lastb']) {
						tmpHistory.push(
							...(await useSpawn([arg, ...opts], { superuser: 'try' }).promise()).stdout.split('\n')
								.filter(line => !(/^\s*$/.test(line) || /^[wb]tmp begins/.test(line))) // remove empty lines and last line
								.map(line => {
									const bad = arg === 'lastb';
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
											overrideEndText: null,
											authResult: bad ? 'bad' : 'good',
										});
										if (match[6] === "still logged in" || match[6] === "still running") {
											// live update time
											setInterval(() => {
												obj.sessionTime = timeSince(match[3]);
												obj.sessionEnd = new Date();
											}, 60 * 1000);
											obj.sessionTime = timeSince(match[3]);
											obj.overrideEndText = match[6].replace(/\b(\w)/g, w => w.toUpperCase());
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
										filters.authResults.set.add(obj.authResult);
										return obj;
									} catch (error) {
										throw new Error(error.message + `, trigger: ${line}`);
									}
								}).filter(entry => entry !== null)
						)
					}
					history.value = tmpHistory.sort(sortCallback.value);
				} catch (state) {
					notifications.value.constructNotification("Error getting login history", errorStringHTML(state), 'error');
					return;
				}
			} finally {
				processing.value--;
			}
		}

		const rangePreviewFormatter = (previewRange) => {
			let result = "";
			result += previewRange[0].toLocaleDateString([], { dateStyle: "short" });
			if (previewRange[1] !== null) {
				if (isFullDay(...previewRange)) {}
				else if (isSameDay(...previewRange))
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

		const saveCSV = async () => {
			const header = "user,session start,session end,time logged in,IP address,TTY,authorization result"
			const data = [
				header,
				...(history.value
					.map(entry => [
						entry.user,
						formatDate(entry.sessionStart),
						entry.overrideEndText ?? formatDate(entry.sessionEnd),
						entry.sessionTime ?? "",
						entry.ip,
						entry.tty,
						entry.authResult,
					].map(field => field.includes(',') ? `"${field}"` : field).join(','))
				)
			].join('\n');
			let hostname = "";
			try {
				hostname = (await useSpawn(['hostname'], { superuser: 'try' }).promise()).stdout.trim() + ' ';
			} catch { }
			const dataRange = range.value ? rangePreviewFormatter(range.value) : 'all time';
			try {
				await generatedFileDownload(`${hostname}user activity - ${dataRange}.csv`, data);
			} catch (error) {
				notifications.value.constructNotification("Failed to download file", errorStringHTML(error), 'error');
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
				try {
					history.value.sort(sortCallback.value);
				} finally {
					processing.value--;
				}
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
			saveCSV,
		}
	},
	components: {
		Datepicker,
		FilterIcon,
		SimpleFilter,
		LoadingSpinner,
		SortCallbackButton,
		Table,
		DocumentDownloadIcon,
	}
}
</script>
