export function formatDateForLast(date) {
	const year = date.getFullYear().toString().padStart(4, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	const hour = date.getHours().toString().padStart(2, '0');
	const minute = date.getMinutes().toString().padStart(2, '0');
	const second = date.getSeconds().toString().padStart(2, '0');
	return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function commandProbe(command) {
	return {
		command: ['sh', '-c', 'command -v "$1" >/dev/null 2>&1', 'sh', command],
		options: { superuser: 'try' },
	};
}

export function selectHistorySources(availableCommands) {
	if (availableCommands.has('last') && availableCommands.has('lastb')) {
		return [
			{ command: ['last'], format: 'last-text', authResult: 'good' },
			{ command: ['lastb'], format: 'last-text', authResult: 'bad' },
		];
	}

	const sources = [];

	if (availableCommands.has('wtmpdb')) {
		sources.push({
			command: ['wtmpdb', 'last', '--json'],
			format: 'wtmpdb-json',
			authResult: 'good',
		});
	} else if (availableCommands.has('last')) {
		sources.push({
			command: ['last'],
			format: 'last-text',
			authResult: 'good',
		});
	}

	if (availableCommands.has('lastb')) {
		sources.push({
			command: ['lastb'],
			format: 'last-text',
			authResult: 'bad',
		});
	}

	return sources;
}

export function parseWtmpdbOutput(output) {
	const { entries = [] } = JSON.parse(output);

	return entries.map((entry) => {
		const logout = entry.logout?.trim() || null;
		const logoutIsTimestamp = logout !== null && !isNaN(new Date(logout).getTime());

		return {
			user: entry.user,
			tty: entry.tty ?? '',
			ip: entry.hostname ?? '',
			sessionStart: entry.login,
			sessionEnd: logoutIsTimestamp ? logout : null,
			sessionTime: entry.length ?? null,
			stillRunning: logoutIsTimestamp ? null : logout,
			authResult: 'good',
		};
	});
}
