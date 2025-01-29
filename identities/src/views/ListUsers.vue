<!--
Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>

This file is part of Cockpit Identities.

Cockpit Identities is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version.

Cockpit Identities is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Cockpit Identities.
If not, see <https://www.gnu.org/licenses/>. 
-->

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
import { ref } from "vue";
import { LoadingSpinner } from "@45drives/houston-common-ui";
import { legacy, getUsers } from '@45drives/houston-common-lib';
const { errorString } = legacy;

export default {
	setup() {
		const users = ref([]);
		const processing = ref(0);

		const getAllUsers = async () => {
			processing.value++;
			try {
				users.value = await getUsers();
			} catch (state) {
				alert("Failed to get users: " + errorString(state));
			} finally {
				processing.value--;
			}
		}

		const openUser = (username) => {
			cockpit.location.go(`/users/${username}`);
		};

		getAllUsers();

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
