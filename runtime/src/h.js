import { withoutNulls } from "./utils/arrays";

export const DOM_TYPES = {
	TEXT: "text",
	ELEMENT: "element",
	FRAGMENT: "fragment",
};

export function h(tag, props = {}, children = []) {
	return {
		tag,
		props,
		children: mapTextNodes(withoutNulls(children)),
		type: DOM_TYPES.ELEMENT,
	};
}

function mapTextNodes(children) {
	return children.map((child) => {
		typeof child === "string" ? hString(child) : child;
	});
}

export function hString(str) {
	return { type: DOM_TYPES.TEXT, value: str };
}

export function hFragment(vNodes) {
	return {
		type: DOM_TYPES.FRAGMENT,
		children: mapTextNodes(withoutNulls(vNodes)),
	};
}

// function lipsum(n) {
// 	const text = `Lorem ipsum dolor sit amet, consectetur adipiscing elit,
//     sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
//     enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
//     ut aliquip ex ea commodo consequat.`;

// 	return hFragment(Array(n).fill(h("p", {}, [text])));
// }

// function MessageComponent({ level, message }) {
// 	return h("div", { class: `message message--${level}` }, [
// 		h("p", {}, [message]),
// 	]);
// }
