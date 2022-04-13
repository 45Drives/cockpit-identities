import { useSpawn, errorString } from './useSpawn';

const SSHAuthorizedKeysSyntax = {
	parse: (string) => {
		return string.split('\n')
			.filter(line => !/^(\s*|\s*#.*)$/.test(line)) // remove empty lines and comments
			.map(line => line.replace(/\s*#.*$/, '')) // remove end-of-line comments
			.map(async (line) => {
				const obj = { pubKey: line };
				let tmpFile;
				try {
					tmpFile = (await useSpawn(['mktemp'], { superuser: 'try' }).promise()).stdout.trim();
					const ddState = useSpawn(['dd', `of=${tmpFile}`], { superuser: 'try' });
					ddState.proc.input(line);
					await ddState.promise();
					obj.fingerprint = (await useSpawn(['ssh-keygen', '-l', '-f', tmpFile], { superuser: 'try' }).promise()).stdout
						.split(' ')[1]
				} catch (state) {
					obj.fingerprint = "Failed to get fingerprint: " + errorString(state);
				} finally {
					if (tmpFile)
						useSpawn(['rm', tmpFile], { superuser: 'try' });
				}
				const regexp = new RegExp([
					/^((?:\w+=(?:"[^"]*"|'[^']*'|(?:[^,\s]|\\\s)*),?)*)/, // first group: possible options at start of line
					/\s*/,                                                // space delimiter
					/\b(\S+)\b/,                                          // second group: algorithm
					/\s*/,                                                // space delimiter
					/(\S+)/,                                              // third group: key
					/\s*/,                                                // space delimiter
					/(\S*)$/,                                             // fourth group: comment
				].map(r => r.source).join(''));
				const regMatch = line.match(regexp);
				if (!regMatch) {
					console.error("regex match on key failed: " + line);
					return null;
				}
				// split on unquoted unescaped commas
				obj.options = regMatch[1]?.split(/(?<!\\),(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)(?=(?:[^\']*\'[^\']*\')*[^\']*$)/g) ?? null;
				obj.algo = regMatch[2];
				obj.pubKey = regMatch[3];
				obj.comment = regMatch[4];
				return { ...obj };
			})
			.filter(obj => obj !== null);
	},
	stringify: (objs) => {
		return objs
			.map(obj => [
					obj.options?.join(',') ?? null,
					obj.algo,
					obj.pubKey,
					obj.comment,
				]
				.filter(field => field !== null)
				.join(' '))
			.join('\n');
	}
};

export {
	SSHAuthorizedKeysSyntax,
}
