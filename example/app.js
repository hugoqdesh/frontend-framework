const tasks = Store.create("tasks", [
	{ id: 1, title: "Build the example", done: false, source: "local" },
	{ id: 2, title: "Document the framework", done: true, source: "local" },
]);

const ui = Store.create("ui", {
	draft: "",
	message: "Demo",
	loading: false,
	selectedId: 1,
	scrollTop: 0,
});

const rows = Array.from({ length: 10000 }, (_, index) => `Row ${index + 1}`);
let nextId = tasks.value.length + 1;
let renderQueued = false;

function setUi(patch) {
	ui.value = { ...ui.value, ...patch };
}

function queueRender() {
	if (renderQueued) return;
	renderQueued = true;

	queueMicrotask(() => {
		renderQueued = false;
		Router.render();
	});
}

[tasks, ui].forEach((state) => state.subscribe(queueRender));

function selectedTask() {
	return tasks.value.find((task) => task.id === ui.value.selectedId) || null;
}

function counts() {
	return {
		total: tasks.value.length,
		done: tasks.value.filter((task) => task.done).length,
	};
}

function addTask() {
	const title = ui.value.draft.trim();

	if (!title) {
		setUi({ message: "Type a task first." });
		return;
	}

	const task = { id: nextId++, title, done: false, source: "local" };
	tasks.value = [task, ...tasks.value];
	setUi({
		draft: "",
		selectedId: task.id,
		message: `Added "${title}".`,
	});
}

function removeTask(id) {
	const task = tasks.value.find((entry) => entry.id === id);
	tasks.value = tasks.value.filter((entry) => entry.id !== id);

	setUi({
		selectedId:
			ui.value.selectedId === id
				? (tasks.value[0]?.id ?? null)
				: ui.value.selectedId,
		message: task ? `Removed "${task.title}".` : "Task removed.",
	});
}

function toggleTask(_, target) {
	const id = Number(target.getAttribute("data-id"));

	tasks.value = tasks.value.map((task) =>
		task.id === id ? { ...task, done: !task.done } : task,
	);

	const task = tasks.value.find((entry) => entry.id === id);
	if (task) {
		setUi({ message: `${task.title}: ${task.done ? "done" : "open"}.` });
	}
}

async function loadRemoteTasks() {
	setUi({ loading: true, message: "Loading..." });

	try {
		const todos = await http.get(
			"https://jsonplaceholder.typicode.com/todos?_limit=3",
		);
		const remoteIds = new Set(
			tasks.value
				.map((task) => task.remoteId)
				.filter((remoteId) => remoteId != null),
		);

		const incoming = todos
			.filter((todo) => !remoteIds.has(todo.id))
			.map((todo) => ({
				id: nextId++,
				title: todo.title,
				done: Boolean(todo.completed),
				source: "remote",
				remoteId: todo.id,
			}));

		tasks.value = [...incoming, ...tasks.value];
		setUi({
			loading: false,
			message: `Loaded ${incoming.length} remote tasks.`,
		});
	} catch (error) {
		setUi({
			loading: false,
			message: error instanceof Error ? error.message : "GET failed.",
		});
	}
}

async function postTask() {
	const title = ui.value.draft.trim() || selectedTask()?.title || "Untitled";
	setUi({ loading: true, message: "Posting..." });

	try {
		const result = await http.post(
			"https://jsonplaceholder.typicode.com/posts",
			{ title, completed: false },
		);

		setUi({
			loading: false,
			message: `Remote POST succeeded with id ${result.id}.`,
		});
	} catch (error) {
		setUi({
			loading: false,
			message: error instanceof Error ? error.message : "POST failed.",
		});
	}
}

function Layout({ title, children }) {
	const summary = counts();

	return createElement(
		"main",
		{
			style: {
				maxWidth: "720px",
				margin: "24px auto",
				fontFamily: "sans-serif",
			},
		},
		createElement(
			"nav",
			{ style: { display: "flex", gap: "12px", marginBottom: "16px" } },
			createElement(Link, { to: "/" }, "Home"),
			createElement(Link, { to: "/performance" }, "Performance"),
			createElement(
				"span",
				{ style: { marginLeft: "auto" } },
				`tasks: ${summary.total}, done: ${summary.done}`,
			),
		),
		createElement("h1", {}, title),
		ui.value.loading ? createElement("p", {}, "Loading...") : null,
		createElement("p", {}, ui.value.message),
		...children,
	);
}

function TaskList() {
	if (tasks.value.length === 0) {
		return createElement("p", {}, "No tasks.");
	}

	return createElement(
		"ul",
		{
			onChange: ["input[data-id]", toggleTask],
			style: { paddingLeft: "20px" },
		},
		...tasks.value.map((task) =>
			createElement(
				"li",
				{
					onClick: () =>
						setUi({
							selectedId: task.id,
							message: `Selected "${task.title}".`,
						}),
					style: { marginBottom: "8px" },
				},
				createElement("input", {
					type: "checkbox",
					checked: task.done,
					"data-id": task.id,
				}),
				" ",
				task.title,
				task.source === "remote" ? " (remote)" : "",
				ui.value.selectedId === task.id ? " [selected]" : "",
				" ",
				createElement(
					"button",
					{
						type: "button",
						onClick: {
							handler: () => removeTask(task.id),
							stopPropagation: true,
						},
					},
					"remove",
				),
			),
		),
	);
}

function HomePage() {
	const task = selectedTask();

	return createElement(
		Layout,
		{ title: "Framework Example" },
		createElement(
			"form",
			{
				onSubmit: { handler: addTask, preventDefault: true },
				style: { display: "flex", gap: "8px", marginBottom: "12px" },
			},
			createElement("input", {
				type: "text",
				value: ui.value.draft,
				onInput: (event) => setUi({ draft: event.target.value }),
				placeholder: "New task",
				style: { flex: "1" },
			}),
			createElement("button", { type: "submit" }, "add"),
		),
		createElement(
			"div",
			{ style: { display: "flex", gap: "8px", marginBottom: "12px" } },
			createElement(
				"button",
				{ type: "button", onClick: loadRemoteTasks },
				"GET",
			),
			createElement("button", { type: "button", onClick: postTask }, "POST"),
			createElement(
				"button",
				{ type: "button", onClick: () => Router.navigate("/performance") },
				"go to performance",
			),
		),
		TaskList(),
		createElement(
			"p",
			{},
			task ? `Selected task: ${task.title}` : "Selected task: none",
		),
	);
}

function PerformancePage() {
	return createElement(
		Layout,
		{ title: "Performance" },
		createElement(
			"p",
			{},
			selectedTask()
				? `Shared state still available: ${selectedTask().title}`
				: "Shared state still available: none",
		),
		createElement(VirtualList, {
			items: rows,
			itemHeight: 24,
			height: 240,
			scrollTop: ui.value.scrollTop,
			onScroll: (event) => setUi({ scrollTop: event.target.scrollTop }),
			renderItem: (row, index) =>
				createElement("div", {}, `${index + 1}. ${row}`),
		}),
	);
}

function NotFoundPage() {
	return createElement(
		Layout,
		{ title: "Not found" },
		createElement(Link, { to: "/" }, "Back home"),
	);
}

Router.add("/", HomePage)
	.add("/performance", PerformancePage)
	.notFound(NotFoundPage);

window.addEventListener("DOMContentLoaded", () => {
	Router.start(document.getElementById("root"), { mode: "hash" });
});
