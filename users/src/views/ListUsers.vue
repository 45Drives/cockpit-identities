<template>
	<div class="flex flex-row flex-wrap content-start gap-well p-well w-full">
		<button v-for="user in users" @click="openUser(user.user)" class="card">
			<div class="card-body flex flex-col items-center justify-center h-36 min-w-[10rem] relative">
				<div class="flex flex-col gap-2 absolute right-3 top-3">
					<StarIcon
						v-if="user.currentLoggedIn"
						class="size-icon icon-default"
						title="You"
					/>
					<ShieldExclamationIcon
						v-if="user.uid === 0"
						class="size-icon icon-default"
					/>
				</div>
				<UserIcon class="w-20 h-20 icon-default shrink-0" />
				<div>{{ user.name ?? user.user }}</div>
				<div
					v-if="user.user !== user.name"
					class="whitespace-nowrap text-sm font-mono text-muted"
				>({{ user.user }})</div>
			</div>
		</button>
		<button @click="addUser()" class="card">
			<div class="card-body flex flex-col items-center justify-center h-36 min-w-[10rem]">
				<UserAddIcon class="w-20 h-20 icon-default shrink-0" />
				<div>New User</div>
			</div>
		</button>
	</div>
</template>

<script>
import { UserIcon, UserAddIcon, StarIcon, ShieldExclamationIcon } from "@heroicons/vue/solid";
import { useSpawn, errorString } from '../hooks/useSpawn';
import { ref } from "vue";

export default {
	setup() {
		const users = ref([]);

		const getUsers = async () => {
			try {
				const currentLoggedInUser = (await cockpit.user()).name;
				users.value = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout
					.split('\n')
					.map(record => {
						if (/^\s*$/.test(record))
							return null;
						const fields = record.split(':');
						const uid = fields[2];
						const uidInt = parseInt(uid);
						if (uidInt < 1000 && uidInt !== 0)
							return null;
						const user = fields[0];
						const name = fields[4];
						return {
							user,
							name: name === "" ? user : name,
							currentLoggedIn: user === currentLoggedInUser,
							uid: uidInt,
						};
					}).filter(user => user !== null) ?? [];
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
		StarIcon,
		ShieldExclamationIcon,
	}
}
</script>
