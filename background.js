import {
	DoublyLinkedList,
	Stack,
	Trie,
	LRUCache,
	bfsPath,
	dfsTree
} from "./dsa/dsa.js";

const state = {
	sessionActive: false,
	sessionId: null,
	startedAt: null,
	nextNodeId: 1,
	nodes: [],
	edges: [],
	tabLists: new Map(),
	tabParent: new Map(),
	tabChildren: new Map(),
	tabBackStack: new Map(),
	urlIndex: new Map(),
	trie: new Trie(),
	lru: new LRUCache(500),
	ports: new Set()
};

function resetSession() {
	state.sessionId = `session-${Date.now()}`;
	state.startedAt = Date.now();
	state.nextNodeId = 1;
	state.nodes = [];
	state.edges = [];
	state.tabLists = new Map();
	state.tabParent = new Map();
	state.tabChildren = new Map();
	state.tabBackStack = new Map();
	state.urlIndex = new Map();
	state.trie = new Trie();
	state.lru = new LRUCache(500);
}

function ensureTab(tabId) {
	if (!state.tabLists.has(tabId)) {
		state.tabLists.set(tabId, new DoublyLinkedList());
	}
	if (!state.tabBackStack.has(tabId)) {
		state.tabBackStack.set(tabId, new Stack());
	}
}

function addNodeForNavigation(tabId, url) {
	if (!state.sessionActive || !url) {
		return;
	}

	const isInternalPage = url.startsWith("chrome://") && 
		!url.startsWith("chrome://newtab");
	if (isInternalPage) {
		return;
	}

	ensureTab(tabId);
	const list = state.tabLists.get(tabId);

	const node = {
		id: state.nextNodeId++,
		tabId,
		url,
		visitedAt: Date.now()
	};

	const previous = list.tail ? list.tail.data : null;
	list.append(node);
	state.nodes.push(node);
	state.tabBackStack.get(tabId).push(node.id);

	if (previous) {
		state.edges.push({ from: previous.id, to: node.id, type: "same-tab" });
	}

	if (!state.urlIndex.has(url)) {
		state.urlIndex.set(url, []);
	}
	state.urlIndex.get(url).push(node.id);
	state.trie.insert(url);
	state.lru.put(url, { lastVisited: node.visitedAt, tabId });

	broadcastState();
}

function registerTabBranch(tabId, openerTabId) {
	if (!state.sessionActive) {
		return;
	}

	ensureTab(tabId);

	if (typeof openerTabId !== "number") {
		return;
	}

	state.tabParent.set(tabId, openerTabId);
	if (!state.tabChildren.has(openerTabId)) {
		state.tabChildren.set(openerTabId, []);
	}
	state.tabChildren.get(openerTabId).push(tabId);
}

function findLatestNodeForUrl(url) {
	const canonicalUrl = resolveCanonicalUrl(url);
	if (!canonicalUrl) {
		return null;
	}

	const ids = state.urlIndex.get(canonicalUrl);
	if (!ids || ids.length === 0) {
		return null;
	}
	const lastId = ids[ids.length - 1];
	return state.nodes.find((n) => n.id === lastId) || null;
}

function resolveCanonicalUrl(inputUrl) {
	const raw = (inputUrl || "").trim();
	if (!raw) {
		return null;
	}

	const query = raw.toLowerCase();
	for (const knownUrl of state.urlIndex.keys()) {
		if (knownUrl.toLowerCase() === query) {
			return knownUrl;
		}
	}

	const queryNoProto = query.replace(/^https?:\/\//, "");
	for (const knownUrl of state.urlIndex.keys()) {
		const knownLower = knownUrl.toLowerCase();
		if (knownLower.replace(/^https?:\/\//, "") === queryNoProto) {
			return knownUrl;
		}
	}

	return null;
}

function getAutocompleteSuggestions(prefix, limit = 8) {
	const raw = (prefix || "").trim();
	if (!raw) {
		return [];
	}

	const query = raw.toLowerCase();
	const queryNoProto = query.replace(/^https?:\/\//, "");
	const out = [];
	const seen = new Set();

	const add = (url) => {
		if (!url || seen.has(url)) {
			return;
		}
		seen.add(url);
		out.push(url);
	};

	for (const s of state.trie.autocomplete(query, limit)) {
		add(s);
		if (out.length >= limit) {
			return out;
		}
	}

	for (const knownUrl of state.urlIndex.keys()) {
		const knownLower = knownUrl.toLowerCase();
		const knownNoProto = knownLower.replace(/^https?:\/\//, "");
		if (knownLower.startsWith(query) || knownNoProto.startsWith(queryNoProto)) {
			add(knownUrl);
		}
		if (out.length >= limit) {
			break;
		}
	}

	return out;
}

function getSnapshot() {
	const tabLists = {};
	for (const [tabId, dll] of state.tabLists.entries()) {
		tabLists[tabId] = dll.toArray();
	}

	const tabChildren = {};
	for (const [tabId, children] of state.tabChildren.entries()) {
		tabChildren[tabId] = children;
	}

	const treeRoots = [];
	for (const tabId of Object.keys(tabLists).map(Number)) {
		if (!state.tabParent.has(tabId)) {
			treeRoots.push(tabId);
		}
	}

	const dfsOrder = [];
	for (const root of treeRoots) {
		dfsOrder.push(...dfsTree(root, state.tabChildren));
	}

	return {
		name: "WebWeave",
		sessionActive: state.sessionActive,
		sessionId: state.sessionId,
		startedAt: state.startedAt,
		nodes: state.nodes,
		edges: state.edges,
		tabLists,
		tabChildren,
		dfsOrder,
		nodeCount: state.nodes.length,
		edgeCount: state.edges.length,
		cacheSize: state.lru.size()
	};
}

function broadcastState() {
	const payload = { type: "STATE_UPDATE", data: getSnapshot() };
	for (const port of state.ports) {
		try {
			port.postMessage(payload);
		} catch {
			state.ports.delete(port);
		}
	}
}

chrome.runtime.onInstalled.addListener(() => {
	resetSession();
});

chrome.runtime.onConnect.addListener((port) => {
	if (port.name !== "webweave-popup") {
		return;
	}

	state.ports.add(port);
	port.postMessage({ type: "STATE_UPDATE", data: getSnapshot() });

	port.onDisconnect.addListener(() => {
		state.ports.delete(port);
	});
});

chrome.tabs.onCreated.addListener((tab) => {
	if (!state.sessionActive) {
		return;
	}

	registerTabBranch(tab.id, tab.openerTabId);
	broadcastState();
});

chrome.tabs.onRemoved.addListener((tabId) => {
	if (state.tabLists.has(tabId)) {
		state.tabLists.delete(tabId);
	}
	if (state.tabBackStack.has(tabId)) {
		state.tabBackStack.delete(tabId);
	}
});

chrome.webNavigation.onCommitted.addListener((details) => {
	if (details.frameId !== 0) {
		return;
	}

	addNodeForNavigation(details.tabId, details.url);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (!message || !message.type) {
		sendResponse({ ok: false, error: "Invalid message" });
		return;
	}

	if (message.type === "START_SESSION") {
		state.sessionActive = true;
		resetSession();
		broadcastState();
		sendResponse({ ok: true, state: getSnapshot() });
		return;
	}

	if (message.type === "STOP_SESSION") {
		state.sessionActive = false;
		broadcastState();
		sendResponse({ ok: true, state: getSnapshot() });
		return;
	}

	if (message.type === "GET_STATE") {
		sendResponse({ ok: true, state: getSnapshot() });
		return;
	}

	if (message.type === "AUTOCOMPLETE") {
		const prefix = message.prefix || "";
		sendResponse({ ok: true, suggestions: getAutocompleteSuggestions(prefix, 8) });
		return;
	}

	if (message.type === "FIND_PATH") {
		const fromNode = findLatestNodeForUrl(message.fromUrl);
		const toNode = findLatestNodeForUrl(message.toUrl);

		if (!fromNode || !toNode) {
			sendResponse({ ok: false, error: "One or both URLs are missing in this session." });
			return;
		}

		const path = bfsPath(fromNode.id, toNode.id, state.edges);
		sendResponse({ ok: true, path });
		return;
	}

	if (message.type === "JUMP_TO_NODE") {
		const node = state.nodes.find((n) => n.id === message.nodeId);
		if (!node) {
			sendResponse({ ok: false, error: "Node not found." });
			return;
		}

		chrome.tabs.get(node.tabId, (existingTab) => {
			if (chrome.runtime.lastError || !existingTab) {
				chrome.tabs.create({ url: node.url, active: true });
				sendResponse({ ok: true, openedNewTab: true });
				return;
			}

			chrome.tabs.update(node.tabId, { url: node.url, active: true });
			sendResponse({ ok: true, openedNewTab: false });
		});

		return true;
	}

	sendResponse({ ok: false, error: "Unknown message type" });
});
