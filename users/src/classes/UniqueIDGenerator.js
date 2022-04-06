export default class UniqueIDGenerator {
	constructor(maxIds = Number.MAX_SAFE_INTEGER) {
		this.id = 0;
		this.maxIds = maxIds;
		this.reuptake = [];
	}
	get() {
		if (this.id == this.maxIds && this.reuptake.length === 0)
			throw new Error("Unique ID limit reached");
		return this.reuptake.length ? this.reuptake.shift() : this.id++;
	}
	release(id) {
		if (this.reuptake.includes(id))
			throw new Error("Double release of unique ID");
		if (id >= this.id)
			throw new Error("Released ID was never given");
		this.reuptake.push(id);
	}
}
