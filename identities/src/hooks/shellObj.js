export default 
function shellObj(path) {
	let name = path
		.split('/').pop()
		.replace(/-/g, ' ') // kebab case to spaces
		.replace(/\b\w/g, c => c.toUpperCase()) // capitalize first letters
		.replace(/Nologin/, "No Login"); // special case of nologin
	return { path, name, isShellObj: true };
}
