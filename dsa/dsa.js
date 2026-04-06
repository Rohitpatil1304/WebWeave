export class DLLNode {
	constructor(data) {
		this.data = data;
		this.prev = null;
		this.next = null;
	}
}

export class DoublyLinkedList {
	constructor() {
		this.head = null;
		this.tail = null;
		this.length = 0;
	}

	append(data) {
		const node = new DLLNode(data);
		if (!this.head) {
			this.head = node;
			this.tail = node;
			this.length = 1;
			return node;
		}

		node.prev = this.tail;
		this.tail.next = node;
		this.tail = node;
		this.length += 1;
		return node;
	}

	toArray() {
		const out = [];
		let cur = this.head;
		while (cur) {
			out.push(cur.data);
			cur = cur.next;
		}
		return out;
	}
}

export class Stack {
	constructor() {
		this.items = [];
	}

	push(item) {
		this.items.push(item);
	}

	pop() {
		if (this.items.length === 0) {
			return null;
		}
		return this.items.pop();
	}

	peek() {
		if (this.items.length === 0) {
			return null;
		}
		return this.items[this.items.length - 1];
	}

	size() {
		return this.items.length;
	}
}

class TrieNode {
	constructor() {
		this.children = new Map();
		this.isEnd = false;
	}
}

export class Trie {
	constructor() {
		this.root = new TrieNode();
	}

	insert(word) {
		if (!word) {
			return;
		}

		let cur = this.root;
		for (const ch of word.toLowerCase()) {
			if (!cur.children.has(ch)) {
				cur.children.set(ch, new TrieNode());
			}
			cur = cur.children.get(ch);
		}
		cur.isEnd = true;
	}

	autocomplete(prefix, limit = 10) {
		const normalized = (prefix || "").toLowerCase();
		let cur = this.root;

		for (const ch of normalized) {
			if (!cur.children.has(ch)) {
				return [];
			}
			cur = cur.children.get(ch);
		}

		const out = [];
		const dfs = (node, path) => {
			if (out.length >= limit) {
				return;
			}
			if (node.isEnd) {
				out.push(path);
			}
			for (const [ch, child] of node.children.entries()) {
				dfs(child, path + ch);
			}
		};

		dfs(cur, normalized);
		return out;
	}
}

export class LRUCache {
	constructor(capacity = 250) {
		this.capacity = capacity;
		this.map = new Map();
	}

	get(key) {
		if (!this.map.has(key)) {
			return null;
		}

		const value = this.map.get(key);
		this.map.delete(key);
		this.map.set(key, value);
		return value;
	}

	put(key, value) {
		if (this.map.has(key)) {
			this.map.delete(key);
		}

		this.map.set(key, value);

		if (this.map.size > this.capacity) {
			const oldest = this.map.keys().next().value;
			this.map.delete(oldest);
		}
	}

	size() {
		return this.map.size;
	}
}

export function buildAdjacency(edges) {
	const adj = new Map();
	for (const edge of edges) {
		if (!adj.has(edge.from)) {
			adj.set(edge.from, []);
		}
		adj.get(edge.from).push(edge.to);
	}
	return adj;
}

export function bfsPath(start, goal, edges) {
	if (start === goal) {
		return [start];
	}

	const adj = buildAdjacency(edges);
	const queue = [start];
	const visited = new Set([start]);
	const parent = new Map();

	while (queue.length) {
		const node = queue.shift();
		const neighbors = adj.get(node) || [];

		for (const next of neighbors) {
			if (visited.has(next)) {
				continue;
			}

			parent.set(next, node);
			if (next === goal) {
				const path = [goal];
				let cur = goal;
				while (parent.has(cur)) {
					cur = parent.get(cur);
					path.push(cur);
				}
				return path.reverse();
			}

			visited.add(next);
			queue.push(next);
		}
	}

	return [];
}

export function dfsTree(rootTabId, childMap) {
	const out = [];

	const walk = (tabId, depth) => {
		out.push({ tabId, depth });
		const children = childMap.get(tabId) || [];
		for (const next of children) {
			walk(next, depth + 1);
		}
	};

	walk(rootTabId, 0);
	return out;
}
