<template>
	<div class="flex flex-row flex-wrap content-start gap-8 p-8 w-full">
		<div
			v-for="user in users"
			@click="openUser(user.user)"
			class="card flex flex-col items-center justify-center h-36 min-w-[10rem] cursor-pointer p-4"
		>
			<UserIcon class="w-20 h-20 text-gray-500 shrink-0" />
			<div>{{ user.name ?? user.user }}</div>
			<div v-if="user.user !== user.name" class="whitespace-nowrap text-sm font-mono text-gray-500">({{user.user}})</div>
		</div>
	</div>
</template>

<script>
import { UserIcon } from "@heroicons/vue/solid";
import useSpawn from '../hooks/useSpawn';
import { ref } from "vue";

export default {
	setup() {
		const users = ref([]);

		const getUsers = async () => {
			try {
				const passwdDB = (await useSpawn(['getent', 'passwd'], {superuser: 'try'}).promise()).stdout;
				passwdDB.split('\n').forEach(record => {
					if (/^\s*$/.test(record))
						return;
					const fields = record.split(':');
					const uid = fields[2];
					const uidInt = parseInt(uid);
					if (uidInt < 1000 && uidInt !== 0)
						return;
					const user = fields[0];
					const name = fields[4];
					users.value.push({user, name: name === "" ? user : name});
				})
			} catch (state) {
				alert("Failed to get users: " + state.stderr);
			}
		}

		const openUser = (username) => {
			cockpit.location.go(`users/${username}`);
		};

		getUsers();

		return {
			openUser,
			users,
		}
	},
	components: {
		UserIcon,
	}
}
</script>
