module.exports = {
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {},
		fontFamily: {
			redhat: ['Red Hat Text', 'open-sans', 'sans-serif'],
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
	],
	darkMode: 'class',
}
