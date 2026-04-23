export function isEventProp(key) {
	return key.startsWith("on") && key.length > 2;
}

export function eventNameFromProp(key) {
	return key.slice(2).toLowerCase();
}

export function normalizeEventDescriptor(value) {
	if (typeof value === "function") {
		return {
			handler: value,
			delegate: null,
			preventDefault: false,
			stopPropagation: false,
			options: undefined,
		};
	}

	if (
		value &&
		typeof value === "object" &&
		typeof value.handler === "function"
	) {
		return {
			handler: value.handler,
			delegate: value.delegate || null,
			preventDefault: Boolean(value.preventDefault),
			stopPropagation: Boolean(value.stopPropagation),
			options: value.options,
		};
	}

	return null;
}

export function applyEventProp(el, key, value) {
	const descriptor = normalizeEventDescriptor(value);
	if (!descriptor) return;

	const listener = (event) => {
		let matchedTarget = el;

		if (descriptor.delegate) {
			const origin =
				event.target instanceof Element
					? event.target
					: event.target?.parentElement || null;

			if (!origin) return;

			matchedTarget = origin.closest(descriptor.delegate);
			if (!matchedTarget || !el.contains(matchedTarget)) return;
		}

		if (descriptor.preventDefault) {
			event.preventDefault();
		}

		if (descriptor.stopPropagation) {
			event.stopPropagation();
		}

		descriptor.handler(event, matchedTarget);
	};

	el.addEventListener(eventNameFromProp(key), listener, descriptor.options);
}
