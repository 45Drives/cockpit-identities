<template>
	<div>
		<label class="block text-sm font-medium">SSH Keys</label>
		<div class="mt-8 flex flex-col overflow-visible">
			<div class="-my-2 -mx-4 sm:-mx-6 lg:-mx-8 overflow-visible">
				<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8 overflow-visible">
					<div
						class="overflow-visible shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg"
					>
						<table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700 overflow-visible">
							<thead class="bg-neutral-50 dark:bg-neutral-800 overflow-visible">
								<tr class="overflow-visible">
									<th
										scope="col"
										class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>{{ user.name === "" ? user.user : user.name }}'s Keys</th>
									<th
										scope="col"
										class="sr-only py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6 lg:pl-8"
									>Remove</th>
									<div class="relative">
										<PlusIcon
											@click="showModal('add')"
											class="w-5 h-5 absolute right-3 top-3.5 cursor-pointer text-gray-500"
										/>
									</div>
								</tr>
							</thead>
							<tbody class="dark:bg-neutral-800">
								<tr
									v-for="(key, index) in keys"
									:class="index % 2 === 0 ? undefined : 'bg-neutral-50 dark:bg-neutral-700'"
								>
									<td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 lg:pl-8">{{ key }}</td>
									<td class="flex flex-row justify-end whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium">
										<MinusIcon
											@click="showModal('remove', key)"
											class="uppercase text-red-600 hover:text-red-900 cursor-pointer w-5 h-5"
										/>
									</td>
								</tr>
								<tr v-if="keys.length === 0">
									<td
										class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-6 lg:pl-8"
									>No keys. Click "+" to add one.</td>
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
import { useSpawn } from '../hooks/useSpawn';
const authorizedKeysSyntax = {
	parse: (string) => {
		return string.split('\n')
			.filter(line => !/^(\s*|\s*#.*)$/.test(line)) // remove empty lines and comments
			.map(line => line.replace(/\s*#.*$/, '')) // remove end-of-line comments
			.map(async (line) => {
				const obj = {};
				let tmpFile;
				try {
					tmpFile = (await useSpawn(['mktemp'], { superuser: 'try' }).promise()).stdout.trim();
					const ddState = useSpawn(['dd', `of=${tmpFile}`], { superuser: 'try' });
					ddState.proc.input(line);
					await ddState.promise();
					obj.fingerprint = (await useSpawn(['ssh-keygen', '-l', '-f', tmpFile], { superuser: 'try' }).promise()).stdout
						.split(' ')[1]
				} catch (state) {
					obj.fingerprint = "Failed to get fingerprint: " + errorString(state);
				} finally {
					if (tmpFile)
						useSpawn(['rm', tmpFile], { superuser: 'try' });
				}
				const regexp = new RegExp([
					/^((?:\w+=(?:"[^"]*"|'[^']*'|(?:[^,\s]|\\\s)*),?)*)/, // first group: possible options at start of line
					/\s*/,                                                // space delimiter
					/\b(\S+)\b/,                                          // second group: algorithm
					/\s*/,                                                // space delimiter
					/(\S+)/,                                              // third group: key
					/\s*/,                                                // space delimiter
					/(\S*)$/,                                             // fourth group: comment
				].map(r => r.source).join(''));
				const regMatch = line.match(regexp);
				if (!regMatch) {
					console.error("regex match on key failed: " + line);
					return { ...obj };
				}
				// split on unquoted unescaped commas
				obj.options = regMatch[1]?.split(/(?<!\\),(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)(?=(?:[^\']*\'[^\']*\')*[^\']*$)/g) ?? [];
				obj.algo = regMatch[2];
				obj.pubKey = regMatch[3];
				obj.comment = regMatch[4];
				return { ...obj };
			})
	},
	stringify: (objs) => {
		return objs.map(obj => `${obj.options?.join(',') ?? ""}`)
	}
};

export default {
	props: {
		user: Object,
	},
	setup(props) {
		const keys = ref([]);
		const newKey = reactive({});

		const authorizedKeysFile = cockpit.file(`${user.home}/.ssh/authorized_keys`, { superuser: 'try' });

		let modalConfirmCallback = () => { }

		const getKeys = async () => {
			let tmpKeys = [];
			try {

			} catch (error) {

			}
			keys.value = [...tmpKeys];
		};

		const showModal = (action, key) => {
			if (action === 'add') {
				modalConfirmCallback = () => keys.value = [...keys.value, newKey].sort();
			} else if (action === 'remove') {
				modalConfirmCallback = () => keys.value = keys.value.filter(a => a === key);
			}
		}

		watch(props.user, () => {
			getKeys();
		}, { immediate: true });

		return {
			keys,
			newKey,
			modalConfirmCallback,
			showModal,
		}
	}
}
</script>
