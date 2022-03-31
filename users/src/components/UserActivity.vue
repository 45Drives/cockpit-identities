<template>
	<div class="mt-1 flex flex-col">
		<div class="-my-2 -mx-4 sm:-mx-6 lg:-mx-8">
			<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
				<div
					class="shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg"
				>
					<div class="flex flex-row justify-between bg-neutral-50 dark:bg-neutral-800">
						<div
							class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
						>{{ user.name === "" ? user.user : user.name }}'s Login History</div>
						<div
							class="flex space-x-2 justify-end py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8 grow"
						>
							<Datepicker v-model="range" range placeholder="Date Range" :dark="darkMode" class="w-auto"/>
						</div>
					</div>
					<table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
						<thead class="bg-neutral-50 dark:bg-neutral-800">
							<tr>
								<th
									scope="col"
									class="sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
								>Session Start</th>
								<th
									scope="col"
									class="sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
								>Session End</th>
								<th
									scope="col"
									class="sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
								>Time Logged In</th>
								<th
									scope="col"
									class="sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
								>IP Address</th>
								<th scope="col" class="sticky top-0 z-10 py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8">TTY</th>
							</tr>
						</thead>
						<tbody class="dark:bg-neutral-800">
							<tr
								v-for="(entry, index) in history"
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
</template>

<script>
import { ref, reactive, watch, inject, onMounted } from 'vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useSpawn, errorString } from '../hooks/useSpawn';

function formatDateForLast(date) {
	const year = date.getFullYear().toString().padStart(4, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	const hour = date.getHours().toString().padStart(2, '0');
	const minute = date.getMinutes().toString().padStart(2, '0');
	return `${year}-${month}-${day} ${hour}:${minute}`;
}

function sessionTimeToSentance(sessionTime) {
	const fields = sessionTime.split(/[+:]/);
	let result = "";
	let itr = 0;
	if (fields.length === 3)
		result += `${fields[itr++]} Days,`
	result += `${fields[itr++]} Hours, ${fields[itr++]} Minutes`;
	return result;
}

export default {
	props: {
		user: Object,
	},
	setup(props) {
		const range = ref();
		const history = ref([]);
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
						return {
							user: match[0],
							tty: match[1],
							ip: match[2],
							sessionStart: match[3],
							sessionEnd: match[4] ?? match[6], // end time or "still logged in" (or something else?)
							sessionTime: match[5] ?? null,
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
			range.value = [from, to];
			watch(props.user, getHistory, { onMounted: true });
			watch(range, getHistory);
		});

		return {
			range,
			history,
			processing,
			darkMode,
		}
	},
	components: {
		Datepicker,
	}
}
</script>
