# Frontend Framework

The framework is intentionally compact. It focuses on core requirements instead of recreating a full production ecosystem:

- declarative UI creation with `createElement(...)`
- reusable function and class components
- reactive state with rerendering
- shared state across pages with `Store`
- routing based on the browser URL
- render-time event registration, delegation, and event modifiers
- HTTP requests through a small `http` client
- virtualized rendering for large lists

The demo app is a minimal two-route task demo:

- `#/` task state, form handling, delegated events, and HTTP actions
- `#/performance` a 10,000-row virtualized list that still reads shared state

## Setup And Installation

### Requirements

- Node.js 18+ or another static file server

### Run The Demo

Serve the repository root so the browser can load both `framework/` and `example/`:

```bash
npx serve .
```

Then open:

```text
http://localhost:3000/example/
```

The example app uses hash routing, so refreshing on sub-routes works without extra server configuration.

## Usage Guide

### Framework Entry Point

The framework is loaded in the browser through:

```html
<script src="../framework/framework.js"></script>
```

### Review Walkthrough

1. Open `#/` and add a task with the form.
2. Click `GET` to show `http.get(...)`.
3. Click `POST` to show `http.post(...)`.
4. Toggle tasks with delegated checkbox events.
5. Remove a task to show direct event handlers and propagation control.
6. Move to `#/performance` and scroll the list to show virtualization.

## Additional Features

- both function components and class components
- event modifiers through declarative handler objects
- hash and history router modes
- a helper for calculating visible virtual list ranges

## Documentation

- [framework/README.md](./framework/README.md)
