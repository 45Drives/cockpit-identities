<template>
	<div class="flex flex-row flex-wrap content-start gap-well p-well w-full">
		<button v-for="user in users" @click="openUser(user.user)" class="card">
			<div class="card-body flex flex-col items-center justify-center h-36 min-w-[10rem] relative">
				<div class="flex flex-col gap-0.5 absolute right-3 top-3">
					<div title="You">
						<StarIcon v-if="user.currentLoggedIn" class="size-icon icon-default" />
					</div>
					<div title="Administrator">
						<ShieldExclamationIcon v-if="user.uid === 0" class="size-icon icon-default" />
					</div>
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
		<LoadingSpinner v-if="processing" class="h-32 w-32 self-center" />
	</div>
</template>

<script>
import { UserIcon, UserAddIcon, StarIcon, ShieldExclamationIcon } from "@heroicons/vue/solid";
import { useSpawn, errorString } from '@45drives/cockpit-helpers';
import { ref } from "vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

export default {
	setup() {
		const users = ref([]);
		const processing = ref(0);

		const getUsers = async () => {
			processing.value++;
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
			} finally {
				processing.value--;
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
			users,
			processing,
			openUser,
			addUser,
		}
	},
	components: {
		UserIcon,
		UserAddIcon,
		StarIcon,
		ShieldExclamationIcon,
		LoadingSpinner,
	}
}
</script>
