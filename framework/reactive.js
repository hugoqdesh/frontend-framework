export class Reactive {
	constructor(value) {
		this._value = value;
		this.subscribers = new Set();
	}

	get value() {
		return this._value;
	}

	set value(nextValue) {
		if (Object.is(this._value, nextValue)) return;
		this._value = nextValue;
		this.notify();
	}

	update(updater) {
		this.value = updater(this._value);
	}

	subscribe(callback, options = {}) {
		this.subscribers.add(callback);

		if (options.immediate) {
			callback(this._value);
		}

		return () => this.subscribers.delete(callback);
	}

	notify() {
		this.subscribers.forEach((callback) => callback(this._value));
	}
}
