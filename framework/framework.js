// Reactive

class Reactive {
  constructor(value) {
    this._value = value;
    this.subscribers = new Set();
  }

  get value() {
    return this._value;
  }

  set value(newValue) {
    console.log("setting value...");
    if (this._value === newValue) return;
    this._value = newValue;
    console.log("value set to " + this._value);
    this.subscribers.forEach((fn) => fn());
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    // Returns an unsubscribe function
    return () => this.subscribers.delete(fn);
  }
}

// Component
// Base class for class-based components (optional to use).

class Component {
  constructor(props) {
    this.props = props;
  }

  render() {
    return createElement("div", {}, "Default Component");
  }
}

// createElement / setStyle
// Build a lightweight virtual DOM node: { tag, props, children }.

function createElement(tag, props, ...children) {
  return { tag, props: props || {}, children: children.flat() };
}

function setStyle(el, value) {
  if (value == null) return;

  if (typeof value === "string") {
    el.style.cssText = value;
    return;
  }

  Object.entries(value).forEach(([key, styleValue]) => {
    if (styleValue == null) return;
    if (key.startsWith("--") || key.includes("-")) {
      el.style.setProperty(key, String(styleValue));
    } else {
      el.style[key] = String(styleValue);
    }
  });
}

// renderElement
// Turn a vnode into a real DOM element. Used when creating from scratch.

function renderElement(node) {
  if (typeof node === "string" || typeof node === "number") {
    return document.createTextNode(String(node));
  }

  if (typeof node.tag === "function") {
    return renderElement(node.tag(node.props));
  }

  const el = document.createElement(node.tag);

  applyProps(el, node.props, node.tag);

  node.children.forEach((child) => {
    if (child != null && child !== false) {
      el.appendChild(renderElement(child));
    }
  });

  return el;
}

// Helpers
function applyProps(el, props, tag) {
  if (!props) return;

  Object.entries(props).forEach(([key, value]) => {
    applyProp(el, key, value, tag);
  });
}

function applyProp(el, key, value, tag) {
  if (key === "ref" && typeof value === "function") {
    value(el);
    return;
  }

  if (key.startsWith("on")) {
    const eventName = key.slice(2).toLowerCase();
    if (Array.isArray(value)) {
      const [selector, handler] = value;
      el.addEventListener(eventName, (event) => {
        const target = event.target.closest(selector);
        if (target && el.contains(target)) handler(event, target);
      });
    } else {
      el.addEventListener(eventName, value);
    }
    return;
  }

  if (
    key === "value" &&
    (tag === "input" || tag === "textarea" || tag === "select")
  ) {
    el.value = value ?? "";
    return;
  }

  if (key === "checked" && tag === "input") {
    el.checked = !!value;
    return;
  }

  if (key === "style") {
    setStyle(el, value);
    return;
  }

  if (value != null) {
    el.setAttribute(key, String(value));
  }
}

// diff
// Compare two vnodes and update only what changed in the real DOM.
//
//   1. No old node  → create a fresh element and append it
//   2. No new node  → remove the existing element
//   3. Both exist   → compare and patch in-place (or replace if tags differ)

function diff(parent, oldNode, newNode, index = 0) {
  const existing = parent.childNodes[index];

  if (oldNode == null) {
    if (newNode != null && newNode !== false) {
      parent.appendChild(renderElement(newNode));
    }
    return;
  }

  if (newNode == null || newNode === false) {
    if (existing) parent.removeChild(existing);
    return;
  }

  if (isTextNode(oldNode) && isTextNode(newNode)) {
    if (String(oldNode) !== String(newNode)) {
      existing.textContent = String(newNode);
    }
    return;
  }

  if (
    isTextNode(oldNode) !== isTextNode(newNode) ||
    oldNode.tag !== newNode.tag
  ) {
    parent.replaceChild(renderElement(newNode), existing);
    return;
  }

  if (typeof newNode.tag === "function") {
    const resolvedOld =
      typeof oldNode.tag === "function" ? oldNode.tag(oldNode.props) : oldNode;
    const resolvedNew = newNode.tag(newNode.props);
    diff(parent, resolvedOld, resolvedNew, index);
    return;
  }

  patchProps(existing, oldNode.props, newNode.props, newNode.tag);
  diffChildren(existing, oldNode.children, newNode.children);
}

function isTextNode(node) {
  return typeof node === "string" || typeof node === "number";
}

// Patch only the props that actually changed
function patchProps(el, oldProps, newProps, tag) {
  oldProps = oldProps || {};
  newProps = newProps || {};

  Object.keys(oldProps).forEach((key) => {
    if (key.startsWith("on") || key === "ref") return;
    if (!(key in newProps)) {
      if (key === "style") {
        el.style.cssText = "";
      } else {
        el.removeAttribute(key);
      }
    }
  });

  Object.entries(newProps).forEach(([key, value]) => {
    if (key.startsWith("on") || key === "ref") return; // events are set once on creation
    if (oldProps[key] === value) return; // unchanged — skip
    applyProp(el, key, value, tag);
  });
}

// Diff children arrays
function diffChildren(parent, oldChildren = [], newChildren = []) {
  const length = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < length; i++) {
    diff(parent, oldChildren[i], newChildren[i], i);
  }

  while (
    parent.childNodes.length >
    newChildren.filter((c) => c != null && c !== false).length
  ) {
    parent.removeChild(parent.lastChild);
  }
}

// mount / rerender
// mount: initial render (wipes the container).
// rerender: diff the new tree against the last rendered tree.

let rootInstance = null;

function mount(vnode, container) {
  container.innerHTML = "";
  const el = renderElement(vnode);
  container.appendChild(el);
  rootInstance = { vnode, container };
}

function rerender(newVnode) {
  if (!rootInstance) return;
  diff(rootInstance.container, rootInstance.vnode, newVnode, 0);
  rootInstance.vnode = newVnode;
}

// Store
// Global key-value store of Reactive values for shared state.

const Store = {
  state: {},

  create(key, initialValue) {
    this.state[key] = new Reactive(initialValue);
    return this.state[key];
  },

  get(key) {
    return this.state[key];
  },
};

// Router
// Hash-free client-side router using the History API.

const Router = {
  routes: {},
  root: null,
  _currentVnode: null,

  add(path, component) {
    this.routes[path] = component;
  },

  navigate(path) {
    window.history.pushState({}, "", path);
    this.render();
  },

  render() {
    const path = window.location.pathname;
    const Component = this.routes[path];

    if (!Component) {
      this.root.innerHTML = "<p>404 — Page not found</p>";
      this._currentVnode = null;
      return;
    }

    const newVnode = createElement(Component);

    if (!this._currentVnode) {
      mount(newVnode, this.root);
    } else {
      diff(this.root, this._currentVnode, newVnode, 0);
    }

    this._currentVnode = newVnode;
    rootInstance = { vnode: newVnode, container: this.root };
  },

  init(rootElement) {
    this.root = rootElement;
    window.addEventListener("popstate", () => this.render());
    this.render();
  },
};

// http

const http = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
  },

  async post(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json();
  },
};
