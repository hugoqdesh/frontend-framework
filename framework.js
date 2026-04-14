class Reactive {
	constructor(value) {
		this._value = value;
		this.subscribers = new Set();
	}

	get value() {
		return this._value;
	}

	set value(newValue) {
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

function renderElement(node) {
	if (typeof node === "string") return document.createTextNode(node);

	const el = document.createElement(node.tag);

	if (node.props) {
		Object.entries(node.props).forEach(([key, value]) => {
			if (key.startsWith("on")) {
				const eventName = key.toLowerCase().substring(2);
				el.addEventListener(eventName, value);
			} else {
				el.setAttribute(key, value);
			}
		});
	}

	node.children.map(renderElement).forEach((child) => el.appendChild(child));
	return el;
}

function mount(vnode, container) {
	container.appendChild(renderElement(vnode));
}

const state = new Reactive(0);

function App() {
	return createElement(
		"div",
		{},
		`Count: ${state.value}`,
		createElement("button", { onclick: () => state.value++ }, "+"),
	);
}

function renderApp() {
	const root = document.getElementById("root");
	root.innerHTML = "";
	mount(App(), root);
}

state.subscribe(renderApp);
renderApp();
