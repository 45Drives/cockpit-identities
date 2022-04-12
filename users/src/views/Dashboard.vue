<template>
	<div class="flex flex-col items-stretch p-well gap-well">
		<div class="flex flex-row items-stretch grow gap-well">
			<button
				class="card grow flex flex-col place-content-center items-center"
				@click="open('users')"
			>
				<div class="card-body">
					<UsersIcon class="text-gray-500 w-40 h-40" />
					<div>Users</div>
				</div>
			</button>
			<button
				class="card grow flex flex-col place-content-center items-center"
				@click="open('groups')"
			>
				<div class="card-body">
					<UserGroupIcon class="text-gray-500 w-40 h-40" />
					<div>Groups</div>
				</div>
			</button>
		</div>
		<div class="flex flex-row items-stretch">
			<div class="card grow flex flex-col items-stretch place-content-center">
				<div class="card-body grow">
					<UserActivity :initialRangeDays="0" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { UsersIcon, UserGroupIcon } from "@heroicons/vue/solid";
import UserActivity from "../components/UserActivity.vue";
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
		UserActivity,
	}
}
</script>
