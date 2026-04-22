# Frontend Framework

Repo has two directories:

- `framework/` contains framework source and framework documentation
- `example/` contains demo app that uses every major feature

## Project Overview

Framework focuses on core needs instead of full ecosystem size:

- declarative UI creation with `createElement(...)`
- reusable function components
- reactive state with `Reactive`
- shared and persisted state with `Store`
- URL-based routing with `Router`
- render-time event registration through props
- delegated events and event modifiers
- HTTP requests through `http`
- performance optimization through `VirtualList`

Framework follows framework-style conventions:

- one render root
- views described declaratively
- state changes trigger framework rerenders
- routes register centrally
- events are declared in render output, not wired imperatively later

## Setup And Installation

### Requirements

- Node.js 18+ or any other static file server

### Run Demo

Serve repo root so browser can load both `framework/` and `example/`:

```bash
npx serve .
```

Open:

```text
http://localhost:3000/example/
```

Demo uses hash routing, so refreshes on sub-routes work on a simple static server.

## Usage Guide

### Framework Entry Point

Import framework entrypoint from module code:

```js
import {
	createElement,
	Reactive,
	Store,
	Router,
} from "../framework/framework.js";
```

### Review Walkthrough

1. Open `#/` and add task through form submit.
2. Toggle tasks with delegated checkbox handler.
3. Remove task to show `stopPropagation`.
4. Refresh page to confirm persisted state survives sessions.
5. Click `GET` to load remote tasks with `http.get(...)`.
6. Click `POST` to send selected task with `http.post(...)`.
7. Move to `#/performance` to confirm routing, shared state, and virtualization.

### Ideas Reviewer Can Add

Framework and docs should make these easy to add during review:

- priority badges on tasks
- route for archived tasks
- extra fields in persisted UI store
- filter input tied to shared state
- alternate remote endpoint for `http`

## Additional Features

Required extras included:

- opt-in persisted stores backed by browser storage
- event delegation and declarative event modifiers
- HTTP helper around `fetch(...)`
- virtualized rendering for 10,000-row lists
- validated virtualization effect: performance route renders only visible rows plus spacers, not all 10,000 rows

Small convenience bonuses included:

- `ref` callbacks for grabbing rendered elements
- optional `history` router mode
- split source files inside `framework/` for easier review and maintenance

## Documentation

- [framework/README.md](./framework/README.md)
