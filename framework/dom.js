import { applyEventProp, isEventProp } from "./events.js";

export function createElement(tag, props, ...children) {
	return {
		tag,
		props: props || {},
		children: flattenChildren(children),
	};
}

export function flattenChildren(children, result = []) {
	children.forEach((child) => {
		if (Array.isArray(child)) {
			flattenChildren(child, result);
			return;
		}

		if (child == null || child === false || child === true) return;
		result.push(child);
	});

	return result;
}

export function setStyle(el, value) {
	if (value == null) {
		el.removeAttribute("style");
		return;
	}

	if (typeof value === "string") {
		el.style.cssText = value;
		return;
	}

	Object.entries(value).forEach(([key, styleValue]) => {
		if (styleValue == null) return;

		if (key.startsWith("--") || key.includes("-")) {
			el.style.setProperty(key, String(styleValue));
			return;
		}

		el.style[key] = String(styleValue);
	});
}

export function applyAttribute(el, key, value, tag) {
	if (key === "style") {
		setStyle(el, value);
		return;
	}

	if (key === "className") {
		el.className = value || "";
		return;
	}

	if (key === "htmlFor") {
		el.htmlFor = value || "";
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
		el.checked = Boolean(value);
		return;
	}

	if (typeof value === "boolean") {
		if (value) {
			el.setAttribute(key, "");
		}
		return;
	}

	if (value != null) {
		el.setAttribute(key, String(value));
	}
}

export function applyProps(el, props, tag) {
	Object.entries(props || {}).forEach(([key, value]) => {
		if (key === "ref" || key === "scrollTop") return;

		if (isEventProp(key)) {
			applyEventProp(el, key, value);
			return;
		}

		applyAttribute(el, key, value, tag);
	});
}

export function applyPostMountProps(el, props) {
	if (!props) return;

	if (props.scrollTop != null) {
		el.scrollTop = Number(props.scrollTop) || 0;
	}

	if (typeof props.ref === "function") {
		props.ref(el);
	}
}

export function renderElement(node) {
	if (node == null || node === false || node === true) {
		return document.createComment("");
	}

	if (typeof node === "string" || typeof node === "number") {
		return document.createTextNode(String(node));
	}

	if (typeof node.tag === "function") {
		return renderElement(
			node.tag({
				...(node.props || {}),
				children: node.children || [],
			}),
		);
	}

	const el = document.createElement(node.tag);
	const props = node.props || {};

	applyProps(el, props, node.tag);

	(node.children || []).forEach((child) => {
		el.appendChild(renderElement(child));
	});

	applyPostMountProps(el, props);
	return el;
}

let rootInstance = null;

export function mount(vnode, container) {
	if (!container) {
		throw new Error("mount requires a container element.");
	}

	container.replaceChildren(renderElement(vnode));
	rootInstance = { vnode, container };
}

export function rerender(vnode = rootInstance?.vnode) {
	if (!rootInstance || vnode == null) return;
	mount(vnode, rootInstance.container);
}
