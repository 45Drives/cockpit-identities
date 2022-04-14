<!--
Copyright (C) 2022 Mark Hooper <mhooper@45drives.com>
                   Josh Boudreau <jboudreau@45drives.com>

This file is part of Cockpit File Sharing.

Cockpit File Sharing is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version.

Cockpit File Sharing is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Cockpit File Sharing.
If not, see <https://www.gnu.org/licenses/>. 
-->

<template>
	<div class="px-3 py-1 sm:p-5 flex items-center bg-plugin-header font-redhat shadow-lg z-10">
		<div class="flex flex-row items-baseline basis-32 grow shrink-0">
			<img
				class="w-6 h-6 mr-0.5 self-center"
				:src="darkMode ? './assets/images/45d-fan-dark.svg' : './assets/images/45d-fan-light.svg'"
			/>
			<h1 class="text-2xl">
				<span
					class="text-red-800 dark:text-white font-bold font-source-sans-pro"
					:style="{ 'font-size': '1.6rem' }"
				>45</span>
				<span class="text-gray-800 dark:text-red-600">Drives</span>
			</h1>
		</div>
		<h1
			class="text-red-800 dark:text-white text-base sm:text-2xl cursor-pointer grow-0 text-center"
			@click="home"
		>{{ moduleName }}</h1>
		<div class="flex basis-32 justify-end grow shrink-0">
			<button
				@click="darkMode = !darkMode"
				id="theme-toggle"
				type="button"
				class="text-muted focus:outline-none"
			>
				<SunIcon v-if="darkMode" class="size-icon-lg" />
				<MoonIcon v-else class="size-icon-lg" />
			</button>
		</div>
	</div>
</template>

<script>
import "@fontsource/red-hat-text/700.css";
import "@fontsource/red-hat-text/400.css";
import "source-sans-pro/source-sans-pro.css";
import { SunIcon, MoonIcon } from "@heroicons/vue/solid";
import { ref, watch, inject } from "vue";
import { darkModeInjectionKey } from "../keys";

export default {
	props: {
		moduleName: String,
	},
	setup(props) {
		const darkMode = inject(darkModeInjectionKey) ?? ref(true);
		function getTheme() {
			let prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
			let theme = localStorage.getItem("color-theme");
			if (theme === null)
				return prefersDark;
			if (theme === "dark")
				return true;
			return false;
		}
		darkMode.value = getTheme();
		if (darkMode.value) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
		const home = () => {
			cockpit.location.go('/');
		};
		watch(() => darkMode.value, (darkMode, oldDarkMode) => {
			localStorage.setItem("color-theme", darkMode ? "dark" : "light");
			if (darkMode) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}, { lazy: false });
		return {
			darkMode,
			home,
		};
	},
	components: {
		SunIcon,
		MoonIcon
	}
};
</script>
