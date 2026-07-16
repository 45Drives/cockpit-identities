import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
	commandProbe,
	formatDateForLast,
	parseWtmpdbOutput,
	selectHistorySources,
} from '../src/loginHistory.mjs';

test('prefers wtmpdb with a util-linux fallback for older Debian releases', async () => {
	const manifest = JSON.parse(await readFile(new URL('../../manifest.json', import.meta.url)));

	assert.ok(manifest.dependencies.debian_common.includes('wtmpdb | util-linux'));
	assert.ok(!manifest.dependencies.debian_common.includes('util-linux'));
});

test('formats history range timestamps with seconds', () => {
	const date = new Date(2026, 6, 11, 9, 8, 7);

	assert.equal(formatDateForLast(date), '2026-07-11 09:08:07');
});

test('checks command availability without requiring administrative mode', () => {
	assert.deepEqual(commandProbe('wtmpdb'), {
		command: ['sh', '-c', 'command -v "$1" >/dev/null 2>&1', 'sh', 'wtmpdb'],
		options: { superuser: 'try' },
	});
});

test('preserves the complete legacy backend when last and lastb are available', () => {
	assert.deepEqual(
		selectHistorySources(new Set(['wtmpdb', 'last', 'lastb'])),
		[
			{ command: ['last'], format: 'last-text', authResult: 'good' },
			{ command: ['lastb'], format: 'last-text', authResult: 'bad' },
		],
	);
});

test('uses successful wtmpdb history without requiring lastb', () => {
	assert.deepEqual(
		selectHistorySources(new Set(['wtmpdb', 'last'])),
		[
			{ command: ['wtmpdb', 'last', '--json'], format: 'wtmpdb-json', authResult: 'good' },
		],
	);
});

test('retains legacy last and lastb support', () => {
	assert.deepEqual(
		selectHistorySources(new Set(['last', 'lastb'])),
		[
			{ command: ['last'], format: 'last-text', authResult: 'good' },
			{ command: ['lastb'], format: 'last-text', authResult: 'bad' },
		],
	);
});

test('parses wtmpdb JSON including entries without a tty', () => {
	const output = JSON.stringify({
		entries: [
			{
				user: 'admin',
				tty: '',
				hostname: '127.0.0.1',
				login: '2026-07-11T10:25:12-0600',
				logout: '2026-07-11T10:25:28-0600',
				length: '00:00',
			},
			{
				user: 'root',
				tty: 'pts/0',
				hostname: '192.0.2.10',
				login: '2026-07-11T10:31:15-0600',
				logout: 'still logged in ',
			},
		],
	});

	assert.deepEqual(parseWtmpdbOutput(output), [
		{
			user: 'admin',
			tty: '',
			ip: '127.0.0.1',
			sessionStart: '2026-07-11T10:25:12-0600',
			sessionEnd: '2026-07-11T10:25:28-0600',
			sessionTime: '00:00',
			stillRunning: null,
			authResult: 'good',
		},
		{
			user: 'root',
			tty: 'pts/0',
			ip: '192.0.2.10',
			sessionStart: '2026-07-11T10:31:15-0600',
			sessionEnd: null,
			sessionTime: null,
			stillRunning: 'still logged in',
			authResult: 'good',
		},
	]);
});
