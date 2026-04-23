import { Reactive } from "./reactive.js";

function canUseStorage() {
	return (
		typeof window !== "undefined" && typeof window.localStorage !== "undefined"
	);
}

function createStoreConfig(key, options = {}) {
	return {
		persist: Boolean(options.persist),
		storageKey: options.storageKey || `store:${key}`,
		serialize:
			typeof options.serialize === "function"
				? options.serialize
				: (value) => JSON.stringify(value),
		deserialize:
			typeof options.deserialize === "function"
				? options.deserialize
				: (value) => JSON.parse(value),
	};
}

function readStoredValue(config, fallbackValue) {
	if (!config.persist || !canUseStorage()) return fallbackValue;

	try {
		const rawValue = window.localStorage.getItem(config.storageKey);
		if (rawValue == null) return fallbackValue;
		return config.deserialize(rawValue);
	} catch (error) {
		console.warn(
			`Unable to restore persisted store "${config.storageKey}".`,
			error,
		);
		return fallbackValue;
	}
}

function writeStoredValue(config, value) {
	if (!config.persist || !canUseStorage()) return;

	try {
		window.localStorage.setItem(config.storageKey, config.serialize(value));
	} catch (error) {
		console.warn(`Unable to persist store "${config.storageKey}".`, error);
	}
}

export const Store = {
	state: Object.create(null),
	config: Object.create(null),

	create(key, initialValue, options = {}) {
		if (!this.state[key]) {
			const config = createStoreConfig(key, options);
			const startingValue = readStoredValue(config, initialValue);
			const store = new Reactive(startingValue);

			if (config.persist) {
				store.subscribe((value) => writeStoredValue(config, value));
				writeStoredValue(config, store.value);
			}

			this.state[key] = store;
			this.config[key] = config;
		}

		return this.state[key];
	},

	get(key) {
		return this.state[key] || null;
	},

	reset() {
		this.state = Object.create(null);
		this.config = Object.create(null);
	},
};
