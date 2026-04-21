# Framework Documentation

This is a minimal frontend framework for building browser interfaces with plain JavaScript. It is designed around a few small primitives that work together:

- `createElement(...)` describes the UI as virtual nodes
- `mount(...)` and `rerender(...)` turn those nodes into real DOM updates
- `Reactive` and `Store` keep application state synchronized with the UI
- `Router` switches views based on the URL
- declarative event props attach listeners during rendering
- `http` wraps browser `fetch(...)`
- `VirtualList` renders only visible rows for large collections

## Architecture And Design Principles

### 1. Small Surface Area

The framework exposes a small number of primitives instead of a large API. Each primitive solves one job:

- rendering
- state
- routing
- events
- data fetching
- performance for large lists

### 2. Declarative UI

Applications describe what the UI should look like with nested `createElement(...)` calls. The framework then creates or patches real DOM elements.

### 3. Reactive Updates

State lives in `Reactive` values. When a value changes, subscribers rerender the active view.

### 4. Reusable Components

You can define components as:

- plain functions
- classes that extend `Component`

### 5. Static Hosting Friendly

The router supports both:

- `history` mode for clean URLs
- `hash` mode for static servers without SPA fallback support

The example app uses `hash` mode so it runs correctly from a simple static server.

## Installation

No package installation is required for the framework itself. Include it as a browser script:

```html
<script src="../framework/framework.js"></script>
```

For local development:

```bash
npx serve .
```

Then visit:

```text
http://localhost:3000/example/
```

## Getting Started

This is the smallest app:

```html
<div id="root"></div>
<script src="./framework/framework.js"></script>
<script>
	const counter = new Reactive(0);

	function App() {
		return createElement(
			"main",
			{},
			createElement("h1", {}, `Count: ${counter.value}`),
			createElement(
				"button",
				{
					onClick: () => {
						counter.value += 1;
					},
				},
				"Increment",
			),
		);
	}

	counter.subscribe(() => rerender(App()));
	window.addEventListener("DOMContentLoaded", () => {
		mount(App(), document.getElementById("root"));
	});
</script>
```

How it works:

1. `Reactive` stores the state.
2. `App()` returns a virtual node tree.
3. `mount(...)` renders the initial DOM.
4. `counter.subscribe(...)` rerenders the app after state changes.

## Feature Reference

### `createElement(tag, props, ...children)`

Creates a virtual node.

```js
const vnode = createElement(
	"button",
	{ className: "primary", onClick: () => alert("Clicked") },
	"Save",
);
```

Supported prop patterns:

- regular attributes such as `id`, `type`, `placeholder`, `data-*`
- `className`
- `style` as a string or object
- controlled form props such as `value` and `checked`
- `ref` callback
- event props such as `onClick`, `onInput`, `onSubmit`

### Components

#### Function Component

```js
function Badge({ children }) {
	return createElement(
		"span",
		{ style: { padding: "4px 8px", border: "1px solid #ccc" } },
		...children,
	);
}
```

#### Class Component

```js
class Banner extends Component {
	render() {
		return createElement("p", {}, this.props.message);
	}
}
```

### `Reactive`

`Reactive` stores a value and notifies subscribers when the value changes.

```js
const search = new Reactive("");

search.subscribe(() => {
	rerender(App());
});

search.value = "Frontend";
search.update((value) => value + " Framework");
```

Useful methods:

- `value` getter and setter
- `update(updater)`
- `subscribe(callback, options?)`

### `Store`

`Store` manages shared `Reactive` values by key. This is useful for state that multiple components or pages depend on.

```js
const userStore = Store.create("user", { name: "Ada" });
const settingsStore = Store.create("settings", { theme: "light" });

console.log(Store.get("user").value.name);
```

Persist a store between browser sessions:

```js
const tasks = Store.create("tasks", [], {
	persist: true,
	storageKey: "example:tasks",
});
```

Persist only part of a store:

```js
const ui = Store.create(
	"ui",
	{ draft: "", selectedId: 1 },
	{
		persist: true,
		serialize(value) {
			return JSON.stringify({
				draft: value.draft,
				selectedId: value.selectedId,
			});
		},
		deserialize(rawValue) {
			return { draft: "", selectedId: 1, ...JSON.parse(rawValue) };
		},
	},
);
```

Supported store options:

- `persist`
- `storageKey`
- `serialize(value)`
- `deserialize(rawValue)`

### Routing

`Router` maps URLs to components and renders the active route.

```js
function Home() {
	return createElement("h1", {}, "Home");
}

function About() {
	return createElement("h1", {}, "About");
}

Router.add("/", Home).add("/about", About);
Router.start(document.getElementById("root"), { mode: "hash" });
```

Programmatic navigation:

```js
Router.navigate("/about");
```

Declarative navigation:

```js
createElement(Link, { to: "/about" }, "About");
```

Router modes:

- `hash` - best for static hosting
- `history` - best when your server can return the SPA shell for every route

### Event Handling

This attaches event listeners through render-time props. You do not need to manually call `addEventListener(...)` in app code.

#### Direct Handlers

```js
createElement(
	"button",
	{
		onClick: () => console.log("clicked"),
	},
	"Click me",
);
```

#### Delegated Handlers

Attach one listener to a parent and respond to matching children:

```js
createElement(
	"ul",
	{
		onClick: [
			"button[data-action='remove']",
			(_, target) => {
				console.log("remove", target.getAttribute("data-id"));
			},
		],
	},
	...items,
);
```

#### Event Modifiers

Use handler objects when you want the framework to apply browser event controls:

```js
createElement(
	"form",
	{
		onSubmit: {
			handler: submitForm,
			preventDefault: true,
		},
	},
	...children,
);
```

Supported modifier fields:

- `handler`
- `delegate`
- `preventDefault`
- `stopPropagation`
- `options`

### DOM Manipulation

This abstracts DOM creation and updates through virtual nodes and diffing. Developers do not need to manually query and mutate elements to keep the interface in sync.

Example:

```js
function ProfileCard(user) {
	return createElement(
		"article",
		{
			style: {
				padding: "16px",
				border: "1px solid #ddd",
				borderRadius: "12px",
			},
		},
		createElement("h2", {}, user.name),
		createElement("p", {}, user.role),
	);
}
```

This covers:

- creating elements
- nesting elements
- adding listeners
- setting attributes and styles
- handling form input

### HTTP Requests

The `http` helper wraps `fetch(...)` and returns parsed JSON when possible.

```js
const posts = await http.get("https://jsonplaceholder.typicode.com/posts");

const created = await http.post("https://jsonplaceholder.typicode.com/posts", {
	title: "Hello",
});
```

Available methods:

- `http.request(method, url, options?)`
- `http.get(url, options?)`
- `http.post(url, body, options?)`
- `http.put(url, body, options?)`
- `http.patch(url, body, options?)`
- `http.delete(url, options?)`

### Performance: Virtualized Rendering

This includes a virtualization helper for large scrollable lists.

#### `getVirtualWindow(...)`

Calculates which rows should be rendered.

```js
const windowState = getVirtualWindow({
	itemCount: 10000,
	itemHeight: 44,
	height: 360,
	scrollTop: 220,
	overscan: 6,
});
```

Returned fields:

- `start`
- `end`
- `visibleCount`
- `topSpacerHeight`
- `bottomSpacerHeight`

#### `VirtualList`

Renders only the visible portion of a list.

```js
createElement(VirtualList, {
	items,
	itemHeight: 44,
	height: 360,
	scrollTop,
	onScroll: (event) => {
		scrollState.value = event.target.scrollTop;
	},
	renderItem: (item) => createElement("div", {}, item.label),
});
```

This is the framework's explicit performance optimization. The example app uses it to keep a 10,000-row list fast and readable.

## Best Practices

### Keep State Intentional

- Use `Reactive` for local state owned by one area of the UI.
- Use `Store` when multiple routes or components depend on the same data.
- Use store persistence for state that should survive reloads or browser restarts.
- Prefer updating state through helper functions instead of mutating nested structures inline.

### Keep Components Small

- Split repeated UI into components early.
- Pass data through props instead of reading unrelated stores directly inside every component.

### Prefer Hash Routing On Static Hosts

- Use `mode: "hash"` when serving the project from a simple static server.
- Use `mode: "history"` only when your backend or dev server supports SPA fallback routing.

### Use Delegation For Repeated Lists

- Delegate events from a parent when rendering many similar children.
- Use direct handlers when the interaction belongs to a single element.

### Use Virtualization Only When Needed

- For small lists, render normally.
- For very large lists, tables, or pickers, use `VirtualList`.

### Keep Rerenders Centralized

- Subscribe state once near app bootstrap.
- Trigger rerenders from subscriptions instead of manually mutating DOM nodes.

## Example Application Notes

The demo in `example/` intentionally exercises every major feature:

- routing across three pages
- shared state across routes
- persisted state across browser sessions
- forms and controlled inputs
- function and class components
- direct and delegated events
- event propagation control
- GET and POST requests
- virtualized rendering
