<template>
	<div class="flex flex-row flex-wrap content-start gap-well p-well w-full">
		<button
			v-for="user in users"
			@click="openUser(user.user)"
			class="card"
		>
			<div class="card-body flex flex-col items-center justify-center h-36 min-w-[10rem]">
				<UserIcon class="w-20 h-20 icon-default shrink-0" />
				<div>{{ user.name ?? user.user }}</div>
				<div
					v-if="user.user !== user.name"
					class="whitespace-nowrap text-sm font-mono text-muted"
				>({{ user.user }})</div>
			</div>
		</button>
		<button
			@click="addUser()"
			class="card"
		>
			<div class="card-body flex flex-col items-center justify-center h-36 min-w-[10rem]">
				<UserAddIcon class="w-20 h-20 icon-default shrink-0" />
				<div>New User</div>
			</div>
		</button>
	</div>
</template>

<script>
import { UserIcon, UserAddIcon } from "@heroicons/vue/solid";
import { useSpawn, errorString } from '../hooks/useSpawn';
import { ref } from "vue";

export default {
	setup() {
		const users = ref([]);

		const getUsers = async () => {
			try {
				const passwdDB = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout;
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
					users.value.push({ user, name: name === "" ? user : name });
				})
			} catch (state) {
				alert("Failed to get users: " + errorString(state));
			}
		}

		const openUser = (username) => {
			cockpit.location.go(`/users/${username}`);
		};

		getUsers();

		const addUser = () => {
			cockpit.location.go('/new-user');
		}

		return {
			openUser,
			users,
			addUser,
		}
	},
	components: {
		UserIcon,
		UserAddIcon,
	}
}
</script>
