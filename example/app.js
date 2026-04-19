const count = new Reactive(0);

function Counter() {
  return createElement(
    "div",
    {},
    createElement("h1", {}, `Count: ${count.value}`),
    createElement("button", { onClick: () => count.value++ }, "+"),
    createElement("button", { onClick: () => count.value-- }, "-"),
    createElement("button", { onClick: () => (count.value = 0) }, "Reset"),
  );
}

count.subscribe(() => rerender(Counter()));

// const baseUrl = "/example";
// Router.add(baseUrl + "/", app);
// Router.add(baseUrl + "/about", About);
// Router.add(baseUrl + "/login", Login);

window.onload = () => {
  const root = document.getElementById("root");
  mount(Counter(), root);
};
