# Framework Documentation

Main primitives:

- `createElement(...)` describes UI trees
- `mount(...)` renders first view
- `rerender(...)` redraws active view after state changes
- `Reactive` stores reactive values
- `Store` shares and optionally persists state
- `Router` controls the view from the URL
- `Link` performs declarative navigation
- `http` wraps browser `fetch(...)`
- `VirtualList` renders only visible rows from very large lists

## Source Layout

Framework is split by responsibility:

- `reactive.js` for `Reactive`
- `events.js` for declarative event descriptors, delegation, and modifiers
- `dom.js` for element creation and rendering
- `store.js` for shared state and persistence
- `router.js` for URL routing and `Link`
- `http.js` for remote requests
- `virtual-list.js` for performance helpers
- `framework.js` as public entrypoint that re-exports everything

## Architecture And Design Principles

### 1. Framework Conventions Over Manual DOM Code

Applications are expected to follow one flow:

1. Describe UI with `createElement(...)`.
2. Keep app state inside `Reactive` or `Store`.
3. Subscribe state changes to `rerender(...)` or `Router.render()`.
4. Register routes centrally with `Router`.
5. Declare events in element props during rendering.

This is closer to framework usage than a loose helper library, because render flow, routing, state flow, and event declaration all follow one opinionated pattern.

### 2. Small Core, Required Features Only

Framework intentionally skips large abstractions such as a template compiler or diff-heavy component model. It keeps required assignment features, but avoids hidden magic.

### 3. Full Rerender For Simplicity

Regular UI updates rerender from current root vnode. This keeps rendering code easy to reason about and easy to explain during review.

### 4. Explicit Performance Optimization

Instead of making whole renderer complex, performance work is isolated to `VirtualList`. Small views stay simple. Large lists get virtualization.

### 5. Static Hosting Friendly

Hash routing works with any static file server. Optional history mode exists when the server can return SPA shell files for every route.

## Installation

No package install is needed for framework itself. Import public entrypoint from module code:

```js
import {
	createElement,
	Reactive,
	mount,
	rerender,
} from "../framework/framework.js";
```

For local development:

```bash
npx serve .
```

Then open:

```text
http://localhost:3000/example/
```

## Getting Started

Smallest app:

```html
<div id="root"></div>
<script type="module">
	import {
		Reactive,
		createElement,
		mount,
		rerender,
	} from "./framework/framework.js";

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

	counter.subscribe(() => rerender());

	window.addEventListener("DOMContentLoaded", () => {
		mount(createElement(App), document.getElementById("root"));
	});
</script>
```

How it works:

1. `Reactive` owns state.
2. `App` returns a virtual tree.
3. `mount(...)` renders first view.
4. `counter.subscribe(...)` tells framework to rerender when state changes.

## Feature Reference

### `createElement(tag, props, ...children)`

Creates virtual nodes for DOM tags or function components.

```js
const button = createElement(
	"button",
	{
		type: "button",
		className: "primary",
		onClick: () => console.log("save"),
	},
	"Save",
);
```

Supported prop patterns:

- DOM attributes like `id`, `type`, `placeholder`, `data-*`
- `className`
- `style` as string or object
- form values like `value` and `checked`
- `ref` callback
- `scrollTop` for scroll containers
- event props like `onClick`, `onInput`, `onSubmit`, `onChange`

### Reusable Components

Components are plain functions that receive props and return virtual nodes.

```js
function Badge({ tone = "neutral", children }) {
	return createElement(
		"span",
		{
			style: {
				padding: "4px 8px",
				border: "1px solid #cbd5e1",
				background: tone === "success" ? "#dcfce7" : "#f8fafc",
			},
		},
		...children,
	);
}
```

Use them like:

```js
createElement(Badge, { tone: "success" }, "Ready");
```

### DOM Manipulation

The framework abstracts direct DOM creation. You describe nested nodes, attributes, styles, and listeners in one tree.

```js
function Card({ title, body }) {
	return createElement(
		"article",
		{
			style: {
				padding: "16px",
				border: "1px solid #d1d5db",
				borderRadius: "12px",
			},
		},
		createElement("h2", {}, title),
		createElement("p", {}, body),
	);
}
```

This covers:

- creating elements
- nesting elements
- manipulating attributes
- manipulating styles
- wiring events at render time
- handling user input and forms

### `Reactive`

`Reactive` stores one reactive value and notifies subscribers after updates.

```js
const search = new Reactive("");

search.subscribe((value) => {
	console.log("next", value);
});

search.value = "frontend";
search.update((value) => value.toUpperCase());
```

Methods:

- `value` getter/setter
- `update(updater)`
- `subscribe(callback, options?)`

### `Store`

`Store` manages shared `Reactive` values by key.

```js
const user = Store.create("user", { name: "Ada" });
const ui = Store.create("ui", { open: false });

console.log(Store.get("user").value.name);
```

Persist state across sessions:

```js
const tasks = Store.create("tasks", [], {
	persist: true,
	storageKey: "demo:tasks",
});
```

Persist only selected fields:

```js
const ui = Store.create(
	"ui",
	{ draft: "", selectedId: null, loading: false },
	{
		persist: true,
		storageKey: "demo:ui",
		serialize(value) {
			return JSON.stringify({
				draft: value.draft,
				selectedId: value.selectedId,
			});
		},
		deserialize(rawValue) {
			return {
				draft: "",
				selectedId: null,
				loading: false,
				...JSON.parse(rawValue),
			};
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

`Router` maps URL paths to components.

```js
function Home() {
	return createElement("h1", {}, "Home");
}

function About() {
	return createElement("h1", {}, "About");
}

Router.add("/", Home).add("/about", About);

window.addEventListener("DOMContentLoaded", () => {
	Router.start(document.getElementById("root"), { mode: "hash" });
});
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

- `hash` for static hosting
- `history` when server supports SPA fallback routing

### Event Handling

Event listeners are declared in render output, not attached manually after querying DOM nodes. This is why framework event handling is more than raw `addEventListener(...)`.

#### Direct Handlers

```js
createElement(
	"button",
	{
		onClick: () => console.log("clicked"),
	},
	"Click",
);
```

#### Delegated Handlers

Attach one listener to parent and react to matching children:

```js
createElement(
	"ul",
	{
		onChange: {
			delegate: "input[data-id]",
			handler: (event, target) => {
				console.log(target.getAttribute("data-id"));
			},
		},
	},
	...items,
);
```

#### Event Modifiers

Use handler objects when the framework should control browser defaults:

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

Stop bubbling:

```js
createElement(
	"button",
	{
		onClick: {
			handler: removeItem,
			stopPropagation: true,
		},
	},
	"Remove",
);
```

Supported event descriptor fields:

- `handler`
- `delegate`
- `preventDefault`
- `stopPropagation`
- `options`

### HTTP Requests

`http` wraps browser `fetch(...)` and parses JSON when response content type is JSON.

```js
const todos = await http.get(
	"https://jsonplaceholder.typicode.com/todos?_limit=3",
);

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

Large collections do not need every row in DOM at once.

#### `getVirtualWindow(...)`

Calculates visible slice:

```js
const windowState = getVirtualWindow({
	itemCount: 10000,
	itemHeight: 28,
	height: 240,
	scrollTop: 560,
	overscan: 4,
});
```

Returned fields:

- `start`
- `end`
- `visibleCount`
- `topSpacerHeight`
- `bottomSpacerHeight`

#### `VirtualList`

Render only visible rows:

```js
createElement(VirtualList, {
	items,
	itemHeight: 28,
	height: 240,
	scrollTop,
	onScroll: (event) => {
		scrollState.value = event.target.scrollTop;
	},
	renderItem: (item, index) =>
		createElement("div", {}, `${index + 1}. ${item.label}`),
});
```

Performance decision:

- normal framework rendering stays simple
- only large-list rendering gets special logic
- example app proves it with 10,000 rows on `#/performance`
- with `height: 240`, `itemHeight: 24`, and `overscan: 4`, the demo keeps about 18 row nodes in DOM instead of 10,000

## Best Practices

### Keep State Intentional

- Use `Reactive` for state owned by one view or one concern.
- Use `Store` when multiple components or routes depend on same data.
- Persist only fields that should survive reloads.

### Keep Rerenders Centralized

- Subscribe state near app bootstrap.
- Trigger `rerender()` or `Router.render()` from subscriptions instead of manually mutating DOM.
- Batch multiple state updates when useful.

### Prefer Delegation For Repeated Lists

- Use delegated handlers on parent lists and tables.
- Use direct handlers for single controls.

### Keep Components Small

- Split repeated markup into function components early.
- Pass explicit props instead of reading unrelated global state everywhere.

### Use Hash Routing On Static Hosts

- Use `mode: "hash"` with simple static servers.
- Use `mode: "history"` only when server fallback exists.

### Use Virtualization Only For Large Collections

- Small lists should render normally.
- Very large lists, pickers, or tables should use `VirtualList`.

## Example Application Notes

`example/` intentionally exercises all major features:

- shared state with `Store`
- persisted state between sessions
- forms and controlled input
- render-time event listeners
- delegated checkbox handling
- `preventDefault` and `stopPropagation`
- programmatic and declarative routing
- remote GET and POST requests
- virtualized 10,000-row rendering
