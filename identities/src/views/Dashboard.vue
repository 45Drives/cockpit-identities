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
	<div class="flex flex-col items-stretch p-well gap-well">
		<div class="flex flex-row items-stretch grow gap-well">
			<button
				class="card grow shrink"
				@click="open('users')"
			>
				<div class="card-body flex flex-col place-content-center items-center">
					<UsersIcon class="icon-default max-h-40 h-auto w-auto" />
					<div>Users</div>
				</div>
			</button>
			<button
				class="card grow shrink"
				@click="open('groups')"
			>
				<div class="card-body flex flex-col place-content-center items-center">
					<UserGroupIcon class="icon-default max-h-40" />
					<div>Groups</div>
				</div>
			</button>
		</div>
		<div class="card">
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
