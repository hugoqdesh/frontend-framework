class Reactive {
	constructor(value) {
		this._value = value;
		this.subscribers = new Set();
	}

	get value() {
		return this._value;
	}

	set value(newValue) {
		if (this._value === newValue) return;
		this._value = newValue;
		this.subscribers.forEach((fn) => fn());
	}

	subscribe(fn) {
		this.subscribers.add(fn);
	}
}

class Component {
	constructor(props) {
		this.props = props;
	}

	render() {
		return createElement("div", {}, "Default Component");
	}
}

function createElement(tag, props, ...children) {
	return { tag, props, children };
}

function setStyle(el, value) {
	if (value == null) return;

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

function renderElement(node) {
	if (typeof node === "string") return document.createTextNode(node);

	if (typeof node.tag === "function") {
		return renderElement(node.tag(node.props));
	}

	const el = document.createElement(node.tag);

	if (node.props) {
		Object.entries(node.props).forEach(([key, value]) => {
			if (key.startsWith("on")) {
				const eventName = key.slice(2).toLowerCase();

				if (Array.isArray(value)) {
					const [selector, handler] = value;

					el.addEventListener(eventName, (event) => {
						const target = event.target.closest(selector);
						if (target && el.contains(target)) {
							handler(event, target);
						}
					});
				} else {
					el.addEventListener(eventName, value);
				}

				return;
			}

			if (key === "style") {
				setStyle(el, value);
				return;
			}

			el.setAttribute(key, value);
		});
	}

	node.children.forEach((child) => {
		el.appendChild(renderElement(child));
	});

	return el;
}

let rootInstance = null;

function mount(vnode, container) {
	container.innerHTML = "";
	const el = renderElement(vnode);
	container.appendChild(el);

	rootInstance = { vnode, container };
}

function rerender(vnode) {
	if (!rootInstance) return;
	mount(vnode, rootInstance.container);
}

// Global Store for shred state

const Store = {
	state: {},

	create(key, initialValue) {
		this.state[key] = new Reactive(initialValue);
		return this.state[key];
	},

	get(key) {
		return this.state[key];
	},
};

const Router = {
	routes: {},
	root: null,

	add(path, component) {
		this.routes[path] = component;
	},

	navigate(path) {
		window.history.pushState({}, "", path);
		this.render();
	},

	render() {
		const path = window.location.pathname;
		console.log(path);
		const Component = this.routes[path];

		if (!Component) {
			this.root.innerHTML = "404 Not Found";
			return;
		}

		mount(createElement(Component), this.root);
	},

	init(rootElement) {
		this.root = rootElement;

		window.addEventListener("popstate", () => {
			this.render();
		});

		this.render();
	},
};

const http = {
	get: async (url) => {
		const res = await fetch(url);
		return res.json();
	},

	post: async (url, data) => {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		return res.json();
	},
};
