<template>
	<div class="grid grid-cols-2 gap-8 p-8 h-1/2">
		<div class="card grow flex flex-col place-content-center items-center cursor-pointer"
		@click="open('users')">
			<UsersIcon class="text-gray-500 w-40 h-40" />
			<div>Users</div>
		</div>
		<div class="card grow flex flex-col place-content-center items-center cursor-pointer"
		@click="open('groups')">
			<UserGroupIcon class="text-gray-500 w-40 h-40" />
			<div>Groups</div>
		</div>
	</div>
</template>

<script>
import { UsersIcon, UserGroupIcon } from "@heroicons/vue/solid";
export default {
	setup() {
		const open = (path) => {
			cockpit.location.go(path);
		}

		return {
			open,
		}
	},
	components: {
		UsersIcon,
		UserGroupIcon,
	}
}
</script>
