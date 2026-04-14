const count = new Reactive(0);
count.subscribe(() => rerender(app()));

function Counter() {
  return createElement(
    "div",
    {},
    createElement("p", {}, `Count: ${count.value}`),
    createElement("button", { onClick: () => count.value++ }, "Increment"),
  );
}

function About() {
  return createElement(
    "div",
    {},
    createElement("h1", {}, "About Page"),
    createElement(
      "button",
      { onClick: () => Router.navigate(baseUrl + "/") },
      "Go Home",
    ),
  );
}

function app() {
  return createElement(
    "div",
    {},
    createElement("h1", {}, "My Framework 🚀"),
    createElement(Counter),
    createElement(
      "button",
      { onClick: () => Router.navigate(baseUrl + "/about") },
      "Go to About",
    ),
  );
}

const baseUrl = "/example";
Router.add(baseUrl + "/", app);
Router.add(baseUrl + "/about", About);

window.onload = () => {
  const root = document.getElementById("root");
  Router.init(root);
};
