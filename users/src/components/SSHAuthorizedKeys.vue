<template>
	<Table>
		<template #header>
			<div class="flex flex-row justify-between items-center">
				<div>Authorized SSH Access Keys</div>
				<!-- TODO: reword or add tooltip to clarify that these are other machines' keys -->
				<button @click="showModal('add')">
					<PlusIcon class="size-icon icon-default" />
				</button>
			</div>
		</template>
		<template #thead>
			<tr>
				<th
					scope="col"
					class="sr-only"
				>{{ user.name === "" ? user.user : user.name }}'s Authorized Public SSH Keys</th>
				<th scope="col" class="sr-only">Remove</th>
			</tr>
		</template>
		<template #tbody>
			<tr v-for="(key, index) in keys">
				<td>{{ key }}</td>
				<td class="flex flex-row justify-end">
					<button @click="showModal('remove', key)">
						<MinusIcon class="size-icon icon-danger" />
					</button>
				</td>
			</tr>
			<tr v-if="keys.length === 0">
				<td class="text-muted">No keys. Click "+" to add one.</td>
			</tr>
		</template>
	</Table>
</template>

<script>
import { ref, reactive, watch } from 'vue';
import { useSpawn } from '../hooks/useSpawn';
import { MinusIcon, PlusIcon } from '@heroicons/vue/solid';
import Table from './Table.vue';

const authorizedKeysSyntax = {
	parse: (string) => {
		return string.split('\n')
			.filter(line => !/^(\s*|\s*#.*)$/.test(line)) // remove empty lines and comments
			.map(line => line.replace(/\s*#.*$/, '')) // remove end-of-line comments
			.map(async (line) => {
				const obj = { pubKey: line };
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

		const authorizedKeysFile = cockpit.file(`${props.user.home}/.ssh/authorized_keys`, { superuser: 'try' });

		let modalConfirmCallback = () => { }

		const getKeys = async () => {
			let tmpKeys = [
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
				'asdfasdfa',
			];
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
	},
	components: {
		PlusIcon,
		MinusIcon,
		Table,
	}
}
</script>
