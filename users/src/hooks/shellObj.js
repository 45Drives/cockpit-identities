export default 
function shellObj(path) {
	if (!path || /^\s*$/.test(path))
		return null;
	let name = path
		.replace(/^(?:\/[^\/]*)*\//, '') // remove path leaving only executable name
		.replace(/-/g, ' ') // kebab case to spaces
		.replace(/\b\w/g, c => c.toUpperCase()) // capitalize first letters
		.replace(/Nologin/, "No Login"); // special case of nologin
	return { path, name };
}
