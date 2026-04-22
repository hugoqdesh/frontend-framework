import { createElement } from "./dom.js";

export function getVirtualWindow({
	itemCount,
	itemHeight,
	height,
	scrollTop = 0,
	overscan = 4,
}) {
	const safeItemCount = Math.max(0, Number(itemCount) || 0);
	const safeItemHeight = Math.max(1, Number(itemHeight) || 1);
	const safeHeight = Math.max(safeItemHeight, Number(height) || safeItemHeight);
	const visibleCount = Math.max(1, Math.ceil(safeHeight / safeItemHeight));
	const start = Math.max(
		0,
		Math.floor((Number(scrollTop) || 0) / safeItemHeight) - overscan,
	);
	const end = Math.min(safeItemCount, start + visibleCount + overscan * 2);

	return {
		start,
		end,
		visibleCount,
		topSpacerHeight: start * safeItemHeight,
		bottomSpacerHeight: (safeItemCount - end) * safeItemHeight,
	};
}

export function VirtualList(props = {}) {
	const {
		items = [],
		itemHeight = 32,
		height = 320,
		scrollTop = 0,
		overscan = 4,
		renderItem,
		onScroll,
		style = {},
		emptyMessage = "Nothing to render.",
	} = props;

	if (typeof renderItem !== "function") {
		throw new Error("VirtualList requires a renderItem function.");
	}

	const windowState = getVirtualWindow({
		itemCount: items.length,
		itemHeight,
		height,
		scrollTop,
		overscan,
	});

	const visibleItems = items.slice(windowState.start, windowState.end);
	const listHeight = `${height}px`;
	const rowHeight = `${itemHeight}px`;

	return createElement(
		"div",
		{
			style: {
				height: listHeight,
				overflowY: "auto",
				overflowAnchor: "none",
				border: "1px solid #cbd5e1",
				...style,
			},
			scrollTop,
			onScroll,
		},
		items.length === 0
			? createElement("p", { style: { margin: "0" } }, emptyMessage)
			: [
					createElement("div", {
						style: { height: `${windowState.topSpacerHeight}px` },
					}),
					...visibleItems.map((item, index) =>
						createElement(
							"div",
							{
								style: {
									height: rowHeight,
									boxSizing: "border-box",
									borderBottom: "1px solid #e2e8f0",
									padding: "4px 8px",
								},
							},
							renderItem(item, windowState.start + index),
						),
					),
					createElement("div", {
						style: { height: `${windowState.bottomSpacerHeight}px` },
					}),
				],
	);
}
