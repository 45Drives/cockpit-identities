<template>
	<div class="mt-1 flex flex-col">
		<div class="-my-2 -mx-4 sm:-mx-6 lg:-mx-8">
			<div class="min-w-full py-2 align-middle md:px-6 lg:px-8 flex flex-col overflow-x-auto">
				<div class="shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg inline-flex flex-col items-stretch overflow-x-visible">
					<div class="self-stretch flex flex-row flex-nowrap justify-between items-baseline bg-neutral-50 dark:bg-neutral-800">
						<div
							class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8 whitespace-nowrap"
						>{{ user.name === "" ? user.user : user.name }}'s Login History</div>
							<Datepicker v-model="range" range placeholder="Date Range" :dark="darkMode" class="w-auto" />
					</div>
					<div class="flex flex-col overflow-y-auto max-h-80">
						<table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
							<thead class="bg-neutral-50 dark:bg-neutral-800">
								<tr>
									<th
										scope="col"
										class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>Session Start</th>
									<th
										scope="col"
										class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>Session End</th>
									<th
										scope="col"
										class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>Time Logged In</th>
									<th
										scope="col"
										class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>
										<div class="flex flex-row flex-nowrap justify-between space-x-5">
											<span>IP Address</span>
											<FilterIcon class="w-5 h-5 text-gray-500 cursor-pointer" />
											<div class="relative">
												<div class="absolute">
													
												</div>
											</div>

										</div>
									</th>
									<th
										scope="col"
										class="whitespace-nowrap border-b-2 border-b-gray-300 dark:border-b-gray-700 bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>
										<div class="flex flex-row flex-nowrap justify-between space-x-5">
											<span>TTY</span>
											<FilterIcon class="w-5 h-5 text-gray-500 cursor-pointer" />
										</div>
									</th>
								</tr>
							</thead>
							<tbody class="dark:bg-neutral-800">
								<tr
									v-for="(entry, index) in historyReactive"
									:class="index % 2 === 0 ? undefined : 'bg-neutral-50 dark:bg-neutral-700'"
									:title="`${entry.tty}`"
								>
									<td
										class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
									>{{ entry.sessionStart }}</td>
									<td
										class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8"
									>{{ entry.sessionEnd }}</td>
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
</template>

<script>
import { ref, reactive, watch, inject, onMounted, computed } from 'vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useSpawn, errorString } from '../hooks/useSpawn';
import { FilterIcon } from '@heroicons/vue/solid';

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

function formatDate(date) {
	const useBrowserLocale = [];
	try {
		return new Intl.DateTimeFormat(useBrowserLocale, { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
	} catch (error) {
		console.error("Error formatting date: " + JSON.stringify(date) + error.message);
		return date;
	}
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

export default {
	props: {
		user: Object,
	},
	setup(props) {
		const range = ref();
		const history = ref([]);
		const historyReactive = reactive(history);
		const processing = inject('processing');
		const darkMode = inject('darkMode');

		const getHistory = async () => {
			processing.value++;

			const argv = ['last', '--fullnames', '--time-format=iso', '--ip'];

			if (range.value?.[0])
				argv.push('--since', formatDateForLast(range.value[0]));
			if (range.value?.[1])
				argv.push('--until', formatDateForLast(range.value[1]));

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
								sessionStart: formatDate(match[3]),
								sessionEnd: match[4] ? formatDate(match[4]) : match[6], // end time or "still logged in" (or something else?)
								sessionTime: match[5] ? sessionTimeToSentence(match[5]) : null,
							});
							if (obj.sessionTime === null) {
								if (obj.sessionEnd === "still logged in") {
									// live update time
									setInterval(() => obj.sessionTime = timeSince(match[3]), 60 * 1000);
									obj.sessionTime = timeSince(match[3])
								}
							}
							return obj;
						} catch (error) {
							throw new Error(error.message + `, trigger: ${line}`);
						}
					}).filter(entry => entry !== null);
			} catch (state) {
				console.error("Error getting login history: " + errorString(state));
				return;
			}

			processing.value--;
		}

		onMounted(() => {
			const to = new Date();
			const from = new Date(new Date().setDate(to.getDate() - 7));
			to.setHours(23, 59, 59);
			from.setHours(0, 0, 0);
			range.value = [from, to];
			watch(props.user, getHistory, { onMounted: true });
			watch(range, getHistory);
		});

		return {
			range,
			history,
			historyReactive,
			processing,
			darkMode,
		}
	},
	components: {
		Datepicker,
		FilterIcon,
	}
}
</script>
