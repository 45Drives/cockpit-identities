<template>
	<div class="flex flex-col items-stretch p-well gap-well">
		<div class="flex flex-row items-stretch grow gap-well">
			<button
				class="card flex flex-col place-content-center items-center grow shrink"
				@click="open('users')"
			>
				<div class="card-body">
					<UsersIcon class="text-gray-500 max-h-40" />
					<div>Users</div>
				</div>
			</button>
			<button
				class="card flex flex-col place-content-center items-center grow shrink"
				@click="open('groups')"
			>
				<div class="card-body">
					<UserGroupIcon class="text-gray-500 max-h-40" />
					<div>Groups</div>
				</div>
			</button>
		</div>
		<div class="card grow">
			<div class="card-body">
				<UserActivity :initialRangeDays="0" />
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
