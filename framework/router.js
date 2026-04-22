import { createElement, mount } from "./dom.js";

function normalizePath(path) {
	if (!path) return "/";
	return path.startsWith("/") ? path : `/${path}`;
}

export const Router = {
	routes: Object.create(null),
	root: null,
	mode: "hash",
	notFoundComponent: null,
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
		if (this.mode === "history") {
			return normalizePath(window.location.pathname || "/");
		}

		const hash = window.location.hash.replace(/^#/, "");
		return normalizePath(hash || "/");
	},

	navigate(path) {
		const nextPath = normalizePath(path);

		if (this.mode === "history") {
			if (window.location.pathname !== nextPath) {
				window.history.pushState({}, "", nextPath);
			}
			this.render();
			return;
		}

		const nextHash = `#${nextPath}`;

		if (window.location.hash === nextHash) {
			this.render();
			return;
		}

		window.location.hash = nextHash;
	},

	resolveComponent() {
		return this.routes[this.getPath()] || this.notFoundComponent;
	},

	render() {
		if (!this.root) return;

		const ActiveComponent = this.resolveComponent();
		const view = ActiveComponent
			? createElement(ActiveComponent, { path: this.getPath() })
			: createElement("p", {}, "Route not found.");

		mount(view, this.root);
	},

	start(rootElement, options = {}) {
		this.root = rootElement;
		this.mode = options.mode || "hash";

		if (this._listener && this._eventName) {
			window.removeEventListener(this._eventName, this._listener);
		}

		this._eventName = this.mode === "history" ? "popstate" : "hashchange";
		this._listener = () => this.render();
		window.addEventListener(this._eventName, this._listener);

		if (this.mode === "hash" && !window.location.hash) {
			window.location.hash = "/";
		}

		this.render();
	},
};

export function Link(props = {}) {
	const { to = "/", children = [], onClick, ...rest } = props;
	const href =
		Router.mode === "history" ? normalizePath(to) : `#${normalizePath(to)}`;

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
