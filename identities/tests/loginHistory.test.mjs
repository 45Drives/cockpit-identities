import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateForLast, parseLoginHistoryLine, parseLoginHistoryOutput, readLoginHistory } from '../src/loginHistory.mjs';

const options = ['--fullnames', '--time-format=iso', '--ip', '--since', '2026-01-02 03:04:05', 'alice'];
const missing = { stderr: 'not-found', status: undefined };
const nativeOutput = JSON.stringify({
	entries: [{
		user: 'alice', tty: '', hostname: '2001:db8::10',
		login: '2026-01-02T03:04:05+0100', logout: 'still logged in ',
	}],
});

test('reads both legacy histories and preserves argument boundaries and user filters', async () => {
	const calls = [];
	const result = await readLoginHistory(async (args) => {
		calls.push(args);
		return { stdout: `${args[0]} records` };
	}, options);
	assert.deepEqual(calls.map(args => args[0]).sort(), ['last', 'lastb']);
	for (const args of calls)
		assert.deepEqual(args.slice(1), options);
	assert.deepEqual(result, {
		sources: [{ command: 'last', stdout: 'last records' }, { command: 'lastb', stdout: 'lastb records' }],
		failedHistoryAvailable: true,
	});
});

for (const missingCommand of [missing, { problem: 'not-found' }]) {
	test(`uses native JSON when lastb is missing: ${JSON.stringify(missingCommand)}`, async () => {
		const calls = [];
		const result = await readLoginHistory(async (args) => {
			calls.push(args);
			if (args[0] === 'lastb')
				throw missingCommand;
			assert.deepEqual(args, ['wtmpdb', 'last', '--json', ...options]);
			return { stdout: nativeOutput };
		}, options);
		assert.equal(calls.length, 2);
		assert.equal(result.failedHistoryAvailable, false);
		assert.deepEqual(result.sources.flatMap(parseLoginHistoryOutput), [{
			user: 'alice', tty: '', ip: '2001:db8::10',
			sessionStart: '2026-01-02T03:04:05+0100', sessionEnd: null,
			sessionTime: null, stillRunning: 'still logged in',
		}]);
	});
}

test('retains a successful legacy last command when wtmpdb and lastb are absent', async () => {
	const result = await readLoginHistory(async ([command]) => {
		if (command !== 'last')
			throw missing;
		return { stdout: 'successful login records' };
	}, options);
	assert.deepEqual(result, {
		sources: [{ command: 'last', stdout: 'successful login records' }],
		failedHistoryAvailable: false,
	});
});

test('falls back to last for a native backend without JSON support', async () => {
	const result = await readLoginHistory(async ([command]) => {
		if (command === 'lastb')
			throw missing;
		if (command === 'wtmpdb')
			throw { stderr: "last: unrecognized option '--json'", status: 1 };
		return { stdout: 'successful login records' };
	}, options);
	assert.equal(result.sources[0].stdout, 'successful login records');
	assert.equal(result.failedHistoryAvailable, false);
});

test('reports missing successful-history backends', async () => {
	await assert.rejects(readLoginHistory(async () => { throw missing; }, options), error => error === missing);
});

for (const failure of [{ stderr: 'Permission denied', status: 1 }, { stderr: 'Invalid time value', status: 1 }]) {
	test(`does not hide legacy backend errors: ${failure.stderr}`, async () => {
		await assert.rejects(readLoginHistory(async () => { throw failure; }, options), error => error === failure);
	});
}

test('does not hide a native database error behind a legacy fallback', async () => {
	const failure = { stderr: 'Cannot open login database', status: 1 };
	await assert.rejects(readLoginHistory(async ([command]) => {
		if (command === 'lastb')
			throw missing;
		throw failure;
	}, options), error => error === failure);
});

test('preserves seconds and local date fields without adding shell quotes', () => {
	assert.equal(formatDateForLast(new Date(2026, 0, 2, 3, 4, 5)), '2026-01-02 03:04:05');
});

test('parses native completed sessions with missing host or terminal fields', () => {
	const [entry] = parseLoginHistoryOutput({ format: 'json', stdout: JSON.stringify({ entries: [{
		user: 'alice', login: '2026-01-02T03:04:05+0100',
		logout: '2026-01-03T05:34:05+0100', length: '1+02:30',
	}] }) });
	assert.equal(entry.tty, '');
	assert.equal(entry.ip, '');
	assert.equal(entry.sessionEnd, '2026-01-03T05:34:05+0100');
	assert.equal(entry.sessionTime, '1+02:30');
});

test('rejects invalid native JSON data', () => {
	for (const stdout of ['not JSON', '{}', '{"entries":{}}', '{"entries":[{"user":"alice","login":"invalid"}]}'])
		assert.throws(() => parseLoginHistoryOutput({ format: 'json', stdout }));
});

test('parses mapped IPv6 addresses and native live-session separators in text output', () => {
	assert.deepEqual(parseLoginHistoryLine('alice    web console  ::ffff:192.0.2.10 2026-01-02T03:04:05+0100  - still logged in'), {
		user: 'alice', tty: 'web console', ip: '::ffff:192.0.2.10',
		sessionStart: '2026-01-02T03:04:05+0100', sessionEnd: null,
		sessionTime: null, stillRunning: 'still logged in',
	});
});

test('preserves completed legacy IPv4 sessions and durations', () => {
	const entry = parseLoginHistoryLine('alice pts/0 192.0.2.10 2026-01-02T03:04:05+01:00 - 2026-01-03T05:34:05+01:00 (1+02:30)');
	assert.equal(entry.ip, '192.0.2.10');
	assert.equal(entry.sessionEnd, '2026-01-03T05:34:05+01:00');
	assert.equal(entry.sessionTime, '1+02:30');
});

test('parses ordinary IPv6 addresses and empty terminal columns in text output', () => {
	for (const prefix of ['bob pts/2 2001:db8::10', 'bob            2001:db8::10']) {
		const entry = parseLoginHistoryLine(prefix + ' 2026-01-02T03:04:05+0100 still logged in');
		assert.equal(entry.ip, '2001:db8::10');
		assert.equal(entry.stillRunning, 'still logged in');
	}
});

test('ignores system boot records, footers, and malformed timestamps', () => {
	for (const line of [
		'reboot system boot 6.12.0 2026-01-02T01:00:00+0100 - still running',
		'wtmpdb begins 2026-01-01T01:00:00+0100',
		'wtmp begins 2026-01-01T01:00:00+0100',
		'alice pts/0 192.0.2.10 2026-99-99T03:04:05+0100 still logged in',
	])
		assert.equal(parseLoginHistoryLine(line), null);
});
