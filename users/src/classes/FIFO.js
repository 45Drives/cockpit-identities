export default class FIFO {
	constructor() {
		this.arr = [];
		this.len = 0;
	}
	push(obj) {
		console.log("push", obj);
		this.len++;
		this.arr.push(obj);
	}
	pop() {
		const obj = this.arr.shift() ?? null;
		console.log("pop", obj);
		if (obj)
			this.len--;
		return obj;
	}
	getLen() {
		return this.len;
	}
}
