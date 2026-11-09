function commandMissing(error) {
	return error?.problem === 'not-found' || error?.stderr?.trim() === 'not-found';
}

export async function readLoginHistory(spawn, options) {
	let failed;
	try {
		failed = await spawn(['lastb', ...options]);
	} catch (error) {
		if (!commandMissing(error))
			throw error;
		try {
			const successful = await spawn(['wtmpdb', 'last', '--json', ...options]);
			return {
				sources: [{ command: 'last', format: 'json', stdout: successful.stdout }],
				failedHistoryAvailable: false,
			};
		} catch (nativeError) {
			if (!commandMissing(nativeError) && !/unrecognized option .*--json/.test(nativeError?.stderr ?? ''))
				throw nativeError;
		}
		const successful = await spawn(['last', ...options]);
		return {
			sources: [{ command: 'last', stdout: successful.stdout }],
			failedHistoryAvailable: false,
		};
	}
	const successful = await spawn(['last', ...options]);
	return {
		sources: [{ command: 'last', stdout: successful.stdout }, { command: 'lastb', stdout: failed.stdout }],
		failedHistoryAvailable: true,
	};
}

export function formatDateForLast(date) {
	const fields = [date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
		.map(value => value.toString().padStart(2, '0'));
	return `${date.getFullYear().toString().padStart(4, '0')}-${fields[0]}-${fields[1]} ${fields[2]}:${fields[3]}:${fields[4]}`;
}

export function parseLoginHistoryLine(line) {
	const match = line.match(/^(\S+)\s+(?:(.*?)\s+)?(\S+)\s+(\d{4}-\d{2}-\d{2}T\S+)\s+(.+)$/);
	if (!match)
		return null;
	const [, user, terminal, ip, sessionStart, ending] = match;
	const tty = terminal?.trim() ?? '';
	if (Number.isNaN(Date.parse(sessionStart)))
		return null;
	if (['reboot', 'shutdown', 'runlevel'].includes(user) && tty.startsWith('system '))
		return null;
	const description = ending.replace(/^-\s*/, '').trim();
	return {
		user,
		tty,
		ip,
		sessionStart,
		sessionEnd: description.match(/^(\d{4}-\d{2}-\d{2}T\S+)/)?.[1] ?? null,
		sessionTime: description.match(/\(([^)]+)\)\s*$/)?.[1] ?? null,
		stillRunning: description,
	};
}

export function parseLoginHistoryOutput(source) {
	if (source.format !== 'json')
		return source.stdout.split('\n').map(parseLoginHistoryLine).filter(entry => entry !== null);
	const data = JSON.parse(source.stdout);
	if (!Array.isArray(data.entries))
		throw new Error('Invalid wtmpdb login-history output');
	return data.entries.map(entry => {
		const tty = entry.tty ?? '';
		if (['reboot', 'shutdown', 'runlevel'].includes(entry.user) && tty.startsWith('system '))
			return null;
		if (typeof entry.user !== 'string' || typeof entry.login !== 'string' || Number.isNaN(Date.parse(entry.login)))
			throw new Error('Invalid wtmpdb login-history entry');
		const ending = entry.logout?.trim() ?? '';
		return {
			user: entry.user,
			tty,
			ip: entry.hostname ?? '',
			sessionStart: entry.login,
			sessionEnd: Number.isNaN(Date.parse(ending)) ? null : ending,
			sessionTime: entry.length ?? null,
			stillRunning: ending,
		};
	}).filter(entry => entry !== null);
}
