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
	<HoustonAppContainer moduleName="Identities" :appVersion="version"
		sourceURL="https://github.com/45Drives/cockpit-identities"
		issuesURL="https://github.com/45Drives/cockpit-identities/issues">
		<router-view class="h-full" @refreshGroups="getAllGroups" />
	</HoustonAppContainer>
</template>

<script setup>
import { ref, provide } from 'vue';
import shellObj from './hooks/shellObj';
import { HoustonAppContainer, useDarkModeState } from '@45drives/houston-common-ui'
import { darkModeInjectionKey, shellsInjectionKey, groupsInjectionKey, infoNudgeScrollbarInjectionKey } from './keys';
import { legacy, getGroups } from '@45drives/houston-common-lib';
const { errorString } = legacy;

const version = __APP_VERSION__;

const darkMode = useDarkModeState();
provide(darkModeInjectionKey, darkMode);

const infoNudgeScrollbar = ref(false);
provide(infoNudgeScrollbarInjectionKey, infoNudgeScrollbar);

const processing = ref(0);

const shells = ref([]);
const getShells = async () => {
	processing.value++;
	try {
		try {
			shells.value = (await cockpit.file("/etc/shells", { superuser: 'try' }).read())
				.split('\n')
				.filter(line => !/^\s*(#.*)?$/.test(line))
				.map(path => (shellObj(path)));
		} catch (error) {
			alert("Failed to get shells: " + error.message);
			return;
		}

		shells.value.push(shellObj("/bin/nologin"));

		shells.value.sort((a, b) => {
			if (a.name === b.name)
				return a.path.localeCompare(b.path);
			return a.name.localeCompare(b.name);
		});
	} finally {
		processing.value--;
	}
}
provide(shellsInjectionKey, shells);

const groups = ref([]);
const getAllGroups = async () => {
	processing.value++;
	try {
		groups.value = await getGroups();
		groups.value.sort((a, b) => a.name.localeCompare(b.name));
	} catch (state) {
		alert("Failed to get groups: " + errorString(state));
	} finally {
		processing.value--;
	}
}
provide(groupsInjectionKey, groups);

const init = async () => {
	await getShells();
	await getAllGroups();
}

init();

</script>
