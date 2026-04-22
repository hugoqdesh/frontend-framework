import { Reactive } from "./reactive.js";
import { createElement, mount, rerender } from "./dom.js";
import { Store } from "./store.js";
import { Router, Link } from "./router.js";
import { http } from "./http.js";
import { VirtualList, getVirtualWindow } from "./virtual-list.js";

const api = {
	Reactive,
	createElement,
	mount,
	rerender,
	Store,
	Router,
	Link,
	VirtualList,
	getVirtualWindow,
	http,
};

if (typeof window !== "undefined") {
	Object.assign(window, api);
}

export {
	Reactive,
	createElement,
	mount,
	rerender,
	Store,
	Router,
	Link,
	VirtualList,
	getVirtualWindow,
	http,
};
