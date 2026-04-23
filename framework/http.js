async function request(method, url, options = {}) {
	const hasBody = options.body != null;
	const response = await fetch(url, {
		method,
		headers: {
			...(hasBody ? { "Content-Type": "application/json" } : {}),
			...(options.headers || {}),
		},
		body: hasBody ? JSON.stringify(options.body) : undefined,
	});

	if (!response.ok) {
		throw new Error(`${method} ${url} failed: ${response.status}`);
	}

	const contentType = response.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		return response.json();
	}

	return response.text();
}

export const http = {
	request,
	get(url, options = {}) {
		return request("GET", url, options);
	},
	post(url, body, options = {}) {
		return request("POST", url, { ...options, body });
	},
	put(url, body, options = {}) {
		return request("PUT", url, { ...options, body });
	},
	patch(url, body, options = {}) {
		return request("PATCH", url, { ...options, body });
	},
	delete(url, options = {}) {
		return request("DELETE", url, options);
	},
};
