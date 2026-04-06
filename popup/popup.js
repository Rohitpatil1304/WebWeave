const statsEl = document.getElementById("stats");
const startBtn = document.getElementById("startSession");
const stopBtn = document.getElementById("stopSession");
const openDashboardBtn = document.getElementById("openDashboard");

let currentState = null;

const port = chrome.runtime.connect({ name: "webweave-popup" });
port.onMessage.addListener((message) => {
	if (message.type === "STATE_UPDATE") {
		currentState = message.data;
		renderState(message.data);
	}
});

function formatTime(ts) {
	if (!ts) {
		return "-";
	}
	return new Date(ts).toLocaleTimeString();
}

function renderStats(snapshot) {
	const rows = [
		{ k: "Session", v: snapshot.sessionActive ? "Active" : "Stopped" },
		{ k: "Nodes", v: String(snapshot.nodeCount || 0) },
		{ k: "Edges", v: String(snapshot.edgeCount || 0) },
		{ k: "Started", v: formatTime(snapshot.startedAt) }
	];

	statsEl.innerHTML = rows
		.map(
			(r) =>
				`<article class="card"><div class="label">${r.k}</div><div class="value">${r.v}</div></article>`
		)
		.join("");
}

function renderState(snapshot) {
	renderStats(snapshot);
}

startBtn.addEventListener("click", async () => {
	const res = await chrome.runtime.sendMessage({ type: "START_SESSION" });
	if (res && res.ok) {
		currentState = res.state;
		renderState(res.state);
	}
});

stopBtn.addEventListener("click", async () => {
	const res = await chrome.runtime.sendMessage({ type: "STOP_SESSION" });
	if (res && res.ok) {
		currentState = res.state;
		renderState(res.state);
	}
});

openDashboardBtn.addEventListener("click", () => {
	chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

async function init() {
	const res = await chrome.runtime.sendMessage({ type: "GET_STATE" });
	if (res && res.ok) {
		currentState = res.state;
		renderState(res.state);
	}
}

init();
