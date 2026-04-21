class Reactive {
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

class Component {
	constructor(props = {}) {
		this.props = props;
	}

	render() {
		return null;
	}
}

function createElement(tag, props, ...children) {
	return {
		tag,
		props: props || {},
		children: flattenChildren(children),
	};
}

function flattenChildren(children, result = []) {
	children.forEach((child) => {
		if (Array.isArray(child)) {
			flattenChildren(child, result);
			return;
		}

		if (child == null || child === false) return;
		result.push(child);
	});

	return result;
}

function isClassComponent(tag) {
	return typeof tag === "function" && tag.prototype instanceof Component;
}

function resolveNode(node) {
	if (node == null || node === false) return null;
	if (typeof node === "string" || typeof node === "number") return node;

	if (typeof node.tag === "function") {
		const props = {
			...(node.props || {}),
			children: node.children || [],
		};

		if (isClassComponent(node.tag)) {
			const instance = new node.tag(props);
			return resolveNode(instance.render());
		}

		return resolveNode(node.tag(props));
	}

	return {
		...node,
		props: node.props || {},
		children: flattenChildren(
			(node.children || []).map((child) => resolveNode(child)),
		),
	};
}

function renderElement(node) {
	const resolved = resolveNode(node);

	if (resolved == null) {
		return document.createComment("");
	}

	if (typeof resolved === "string" || typeof resolved === "number") {
		return document.createTextNode(String(resolved));
	}

	const el = document.createElement(resolved.tag);
	applyProps(el, {}, resolved.props, resolved.tag);

	resolved.children.forEach((child) => {
		const renderedChild = renderElement(child);
		el.appendChild(renderedChild);
	});

	return el;
}

function isEventProp(key) {
	return key.startsWith("on") && key.length > 2;
}

function eventNameFromProp(key) {
	return key.slice(2).toLowerCase();
}

function normalizeEventDescriptor(value) {
	if (typeof value === "function") {
		return {
			handler: value,
			selector: null,
			preventDefault: false,
			stopPropagation: false,
			options: undefined,
		};
	}

	if (Array.isArray(value) && value.length >= 2) {
		const [selector, handler, config = {}] = value;
		return {
			handler,
			selector,
			preventDefault: Boolean(config.preventDefault),
			stopPropagation: Boolean(config.stopPropagation),
			options: config.options,
		};
	}

	if (
		value &&
		typeof value === "object" &&
		typeof value.handler === "function"
	) {
		return {
			handler: value.handler,
			selector: value.delegate || null,
			preventDefault: Boolean(value.preventDefault),
			stopPropagation: Boolean(value.stopPropagation),
			options: value.options,
		};
	}

	return null;
}

function setEventListener(el, key, value) {
	const eventName = eventNameFromProp(key);
	const events = el.__dotEvents || (el.__dotEvents = {});

	if (events[eventName]) {
		el.removeEventListener(
			eventName,
			events[eventName].listener,
			events[eventName].options,
		);
		delete events[eventName];
	}

	const descriptor = normalizeEventDescriptor(value);
	if (!descriptor) return;

	const listener = (event) => {
		let matchedTarget = el;

		if (descriptor.selector) {
			matchedTarget = event.target.closest(descriptor.selector);
			if (!matchedTarget || !el.contains(matchedTarget)) return;
		}

		if (descriptor.preventDefault) event.preventDefault();
		if (descriptor.stopPropagation) event.stopPropagation();

		descriptor.handler(event, matchedTarget);
	};

	el.addEventListener(eventName, listener, descriptor.options);
	events[eventName] = {
		listener,
		options: descriptor.options,
	};
}

function removeEventListener(el, key) {
	const events = el.__dotEvents;
	if (!events) return;

	const eventName = eventNameFromProp(key);
	const entry = events[eventName];

	if (!entry) return;
	el.removeEventListener(eventName, entry.listener, entry.options);
	delete events[eventName];
}

function setStyle(el, value) {
	if (value == null) {
		el.removeAttribute("style");
		return;
	}

	if (typeof value === "string") {
		el.style.cssText = value;
		return;
	}

	Object.entries(value).forEach(([key, styleValue]) => {
		if (styleValue == null) return;

		if (key.startsWith("--") || key.includes("-")) {
			el.style.setProperty(key, String(styleValue));
			return;
		}

		el.style[key] = String(styleValue);
	});
}

function patchStyle(el, oldValue, newValue) {
	if (newValue == null) {
		el.removeAttribute("style");
		return;
	}

	if (typeof oldValue === "string" || typeof newValue === "string") {
		if (oldValue !== newValue) {
			setStyle(el, newValue);
		}
		return;
	}

	const oldEntries = oldValue || {};
	const newEntries = newValue || {};

	Object.keys(oldEntries).forEach((key) => {
		if (key in newEntries) return;

		if (key.startsWith("--") || key.includes("-")) {
			el.style.removeProperty(key);
			return;
		}

		el.style[key] = "";
	});

	Object.entries(newEntries).forEach(([key, styleValue]) => {
		if (oldEntries[key] === styleValue) return;

		if (styleValue == null) {
			if (key.startsWith("--") || key.includes("-")) {
				el.style.removeProperty(key);
			} else {
				el.style[key] = "";
			}
			return;
		}

		if (key.startsWith("--") || key.includes("-")) {
			el.style.setProperty(key, String(styleValue));
			return;
		}

		el.style[key] = String(styleValue);
	});
}

function applyProp(el, key, value, tag) {
	if (key === "ref" && typeof value === "function") {
		value(el);
		return;
	}

	if (isEventProp(key)) {
		setEventListener(el, key, value);
		return;
	}

	if (key === "style") {
		setStyle(el, value);
		return;
	}

	if (key === "className") {
		el.setAttribute("class", value || "");
		return;
	}

	if (key === "htmlFor") {
		el.setAttribute("for", value || "");
		return;
	}

	if (
		key === "value" &&
		(tag === "input" || tag === "textarea" || tag === "select")
	) {
		el.value = value ?? "";
		return;
	}

	if (key === "checked" && tag === "input") {
		el.checked = Boolean(value);
		return;
	}

	if (typeof value === "boolean") {
		if (value) {
			el.setAttribute(key, "");
		} else {
			el.removeAttribute(key);
		}
		return;
	}

	if (value != null) {
		el.setAttribute(key, String(value));
	}
}

function removeProp(el, key, oldValue, tag) {
	if (key === "ref") return;

	if (isEventProp(key)) {
		removeEventListener(el, key);
		return;
	}

	if (key === "style") {
		el.removeAttribute("style");
		return;
	}

	if (key === "className") {
		el.removeAttribute("class");
		return;
	}

	if (key === "htmlFor") {
		el.removeAttribute("for");
		return;
	}

	if (
		key === "value" &&
		(tag === "input" || tag === "textarea" || tag === "select")
	) {
		el.value = "";
		return;
	}

	if (key === "checked" && tag === "input") {
		el.checked = false;
		return;
	}

	if (typeof oldValue === "boolean") {
		el.removeAttribute(key);
		return;
	}

	el.removeAttribute(key);
}

function applyProps(el, oldProps, newProps, tag) {
	const previous = oldProps || {};
	const next = newProps || {};

	Object.keys(previous).forEach((key) => {
		if (key in next) return;
		removeProp(el, key, previous[key], tag);
	});

	Object.entries(next).forEach(([key, value]) => {
		if (key === "style") {
			patchStyle(el, previous.style, value);
			return;
		}

		if (isEventProp(key)) {
			if (previous[key] !== value) {
				setEventListener(el, key, value);
			}
			return;
		}

		if (previous[key] === value) return;
		applyProp(el, key, value, tag);
	});
}

function isTextNode(node) {
	return typeof node === "string" || typeof node === "number";
}

function describeNode(node) {
	const resolved = resolveNode(node);

	if (resolved == null) return "null";
	if (isTextNode(resolved)) return `text(${String(resolved)})`;
	return `tag(${resolved.tag})`;
}

function diff(parent, oldNode, newNode, index = 0) {
	if (!parent) {
		throw new Error(
			`diff parent missing at index ${index}: ${describeNode(oldNode)} -> ${describeNode(newNode)}`,
		);
	}

	const previous = resolveNode(oldNode);
	const next = resolveNode(newNode);
	const existing = parent.childNodes[index];

	if (previous != null && next != null && !existing) {
		const parentTag =
			parent.nodeType === Node.ELEMENT_NODE
				? parent.tagName.toLowerCase()
				: `node-${parent.nodeType}`;
		throw new Error(
			`missing DOM child at index ${index} under ${parentTag}: ${describeNode(oldNode)} -> ${describeNode(newNode)}`,
		);
	}

	if (previous == null) {
		if (next != null) {
			parent.appendChild(renderElement(next));
		}
		return;
	}

	if (next == null) {
		if (existing) parent.removeChild(existing);
		return;
	}

	if (isTextNode(previous) && isTextNode(next)) {
		if (String(previous) !== String(next)) {
			existing.textContent = String(next);
		}
		return;
	}

	if (isTextNode(previous) !== isTextNode(next) || previous.tag !== next.tag) {
		parent.replaceChild(renderElement(next), existing);
		return;
	}

	applyProps(existing, previous.props, next.props, next.tag);
	diffChildren(existing, previous.children, next.children);
}

function diffChildren(parent, oldChildren = [], newChildren = []) {
	if (oldChildren.length !== newChildren.length) {
		parent.innerHTML = "";
		newChildren.forEach((child) => {
			parent.appendChild(renderElement(child));
		});
		return;
	}

	const sharedLength = Math.min(oldChildren.length, newChildren.length);

	for (let index = 0; index < sharedLength; index += 1) {
		diff(parent, oldChildren[index], newChildren[index], index);
	}
}

let rootInstance = null;

function mount(vnode, container) {
	const resolved = resolveNode(vnode);
	container.innerHTML = "";
	container.appendChild(renderElement(resolved));
	rootInstance = { vnode: resolved, container };
}

function rerender(vnode) {
	if (!rootInstance) return;
	const resolved = resolveNode(vnode);
	diff(rootInstance.container, rootInstance.vnode, resolved, 0);
	rootInstance.vnode = resolved;
}

function canUseStorage() {
	return (
		typeof window !== "undefined" && typeof window.localStorage !== "undefined"
	);
}

function createStoreConfig(key, options = {}) {
	const persist = Boolean(options.persist);
	const storageKey = options.storageKey || `store:${key}`;
	const serialize =
		typeof options.serialize === "function"
			? options.serialize
			: (value) => JSON.stringify(value);
	const deserialize =
		typeof options.deserialize === "function"
			? options.deserialize
			: (value) => JSON.parse(value);

	return {
		persist,
		storageKey,
		serialize,
		deserialize,
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

const Store = {
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
		return this.state[key];
	},

	reset() {
		this.state = Object.create(null);
		this.config = Object.create(null);
	},
};

function normalizePath(path) {
	if (!path) return "/";
	return path.startsWith("/") ? path : `/${path}`;
}

const Router = {
	routes: Object.create(null),
	root: null,
	mode: "hash",
	notFoundComponent: null,
	_currentVnode: null,
	_listener: null,
	_eventName: null,

	add(path, component) {
		this.routes[normalizePath(path)] = component;
		return this;
	},

	notFound(component) {
		this.notFoundComponent = component;
		return this;
	},

	getPath() {
		if (this.mode === "hash") {
			const hash = window.location.hash.replace(/^#/, "");
			return normalizePath(hash || "/");
		}

		return normalizePath(window.location.pathname || "/");
	},

	navigate(path) {
		const nextPath = normalizePath(path);

		if (this.mode === "hash") {
			const nextHash = `#${nextPath}`;

			if (window.location.hash === nextHash) {
				this.render();
				return;
			}

			window.location.hash = nextHash;
			return;
		}

		window.history.pushState({}, "", nextPath);
		this.render();
	},

	resolveComponent() {
		return this.routes[this.getPath()] || this.notFoundComponent;
	},

	render() {
		if (!this.root) return;

		const ActiveComponent = this.resolveComponent();
		const vnode = ActiveComponent
			? createElement(ActiveComponent, { path: this.getPath() })
			: createElement("p", {}, "Route not found.");
		const resolved = resolveNode(vnode);

		if (!this._currentVnode) {
			mount(resolved, this.root);
		} else {
			diff(this.root, this._currentVnode, resolved, 0);
			rootInstance = { vnode: resolved, container: this.root };
		}

		this._currentVnode = resolved;
	},

	start(rootElement, options = {}) {
		this.root = rootElement;
		this.mode = options.mode || "hash";

		if (this._listener && this._eventName) {
			window.removeEventListener(this._eventName, this._listener);
		}

		this._eventName = this.mode === "hash" ? "hashchange" : "popstate";
		this._listener = () => this.render();
		window.addEventListener(this._eventName, this._listener);

		if (this.mode === "hash" && !window.location.hash) {
			window.location.hash = "/";
		}

		this.render();
	},
};

function Link(props = {}) {
	const { to = "/", children = [], onClick, ...rest } = props;
	const href =
		Router.mode === "hash" ? `#${normalizePath(to)}` : normalizePath(to);

	return createElement(
		"a",
		{
			...rest,
			href,
			onClick: {
				handler: (event, target) => {
					if (
						typeof onClick === "function" &&
						onClick(event, target) === false
					) {
						return;
					}

					Router.navigate(to);
				},
				preventDefault: true,
			},
		},
		...children,
	);
}

function getVirtualWindow({
	itemCount,
	itemHeight,
	height,
	scrollTop = 0,
	overscan = 4,
}) {
	const safeItemCount = Math.max(0, Number(itemCount) || 0);
	const safeItemHeight = Math.max(1, Number(itemHeight) || 1);
	const safeHeight = Math.max(safeItemHeight, Number(height) || safeItemHeight);
	const visibleCount = Math.max(1, Math.ceil(safeHeight / safeItemHeight));
	const start = Math.max(
		0,
		Math.floor((Number(scrollTop) || 0) / safeItemHeight) - overscan,
	);
	const end = Math.min(safeItemCount, start + visibleCount + overscan * 2);

	return {
		start,
		end,
		visibleCount,
		topSpacerHeight: start * safeItemHeight,
		bottomSpacerHeight: (safeItemCount - end) * safeItemHeight,
	};
}

function VirtualList(props = {}) {
	const {
		items = [],
		itemHeight = 32,
		height = 320,
		scrollTop = 0,
		overscan = 4,
		renderItem,
		onScroll,
		style = {},
		emptyMessage = "Nothing to render.",
	} = props;

	if (typeof renderItem !== "function") {
		throw new Error("VirtualList requires a renderItem function.");
	}

	const windowState = getVirtualWindow({
		itemCount: items.length,
		itemHeight,
		height,
		scrollTop,
		overscan,
	});

	const visibleItems = items.slice(windowState.start, windowState.end);
	const listHeight = `${height}px`;
	const rowHeight = `${itemHeight}px`;

	return createElement(
		"div",
		{
			style: {
				height: listHeight,
				overflowY: "auto",
				overflowAnchor: "none",
				...style,
			},
			onScroll,
		},
		items.length === 0
			? createElement("p", { style: { margin: "0" } }, emptyMessage)
			: [
					createElement("div", {
						style: { height: `${windowState.topSpacerHeight}px` },
					}),
					...visibleItems.map((item, index) =>
						createElement(
							"div",
							{
								style: {
									height: rowHeight,
									boxSizing: "border-box",
								},
							},
							renderItem(item, windowState.start + index),
						),
					),
					createElement("div", {
						style: { height: `${windowState.bottomSpacerHeight}px` },
					}),
				],
	);
}

async function request(method, url, options = {}) {
	const hasBody = options.body != null;
	const response = await fetch(url, {
		method,
		headers: {
			...(hasBody ? { "Content-Type": "application/json" } : {}),
			...(options.headers || {}),
		},
		body: hasBody ? JSON.stringify(options.body) : undefined,
	});

	if (!response.ok) {
		throw new Error(`${method} ${url} failed: ${response.status}`);
	}

	const contentType = response.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		return response.json();
	}

	return response.text();
}

const http = {
	request,
	get(url, options = {}) {
		return request("GET", url, options);
	},
	post(url, body, options = {}) {
		return request("POST", url, { ...options, body });
	},
	put(url, body, options = {}) {
		return request("PUT", url, { ...options, body });
	},
	patch(url, body, options = {}) {
		return request("PATCH", url, { ...options, body });
	},
	delete(url, options = {}) {
		return request("DELETE", url, options);
	},
};

if (typeof window !== "undefined") {
	Object.assign(window, {
		Reactive,
		Component,
		createElement,
		mount,
		rerender,
		Store,
		Router,
		Link,
		VirtualList,
		getVirtualWindow,
		http,
	});
}
