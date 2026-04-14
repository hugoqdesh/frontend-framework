const count = new Reactive(0);

function Counter() {
	return createElement(
		"div",
		{},
		createElement("p", {}, `Count: ${count.value}`),
		createElement("button", { onclick: () => count.value++ }, "Increment"),
	);
}

function renderApp() {
	const root = document.getElementById("root");
	root.innerHTML = "";
	mount(Counter(), root);
}

count.subscribe(renderApp);
renderApp();
