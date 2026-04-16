const statsEl = document.getElementById("stats");
const startBtn = document.getElementById("startSession");
const stopBtn = document.getElementById("stopSession");
const fromUrlEl = document.getElementById("fromUrl");
const toUrlEl = document.getElementById("toUrl");
const urlSuggestionsEl = document.getElementById("urlSuggestions");
const pathBtn = document.getElementById("findPath");
const pathResultEl = document.getElementById("pathResult");

let currentState = null;
let highlightPathIds = new Set();

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

function shorten(url) {
  if (!url) {
    return "";
  }
  return url.length > 55 ? `${url.slice(0, 52)}...` : url;
}

function getNodeLabel(node) {
  if (!node) {
    return "";
  }

  if (node.isPlaceholder) {
    return node.label || "New Tab";
  }

  return shorten(node.url);
}

function renderGraph(snapshot) {
  const svg = d3.select("#graph");
  svg.selectAll("*").remove();

  const width = 1500;
  const height = 860;

  const nodes = snapshot.nodes.map((n) => ({ ...n }));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const links = snapshot.edges
    .map((e) => ({
    source: e.from,
    target: e.to,
    from: e.from,
    to: e.to,
    type: e.type
    }))
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  if (nodes.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#666666")
      .attr("font-size", 18)
      .text("Start a session and open a new tab to initialize the graph.");
    return;
  }

  const linkKey = (d) => {
    const src = typeof d.source === "object" ? d.source.id : d.source;
    const dst = typeof d.target === "object" ? d.target.id : d.target;
    return `${src}->${dst}`;
  };

  const pathEdges = new Set();
  if (highlightPathIds.size > 1) {
    const ids = Array.from(highlightPathIds);
    for (let i = 0; i < ids.length - 1; i += 1) {
      pathEdges.add(`${ids[i]}->${ids[i + 1]}`);
    }
  }

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-380))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg
    .append("g")
    .attr("stroke-opacity", 0.9)
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke-width", (d) => (pathEdges.has(linkKey(d)) ? 4 : 2))
    .attr("stroke", (d) => (pathEdges.has(linkKey(d)) ? "rgb(232, 12, 12)" : "#a0a0a0"));

  const node = svg
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 11)
    .attr("fill", (d) => (highlightPathIds.has(d.id) ? "#111111" : "#5f5f5f"))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("click", (_, d) => {
      if (!d.isPlaceholder) {
        chrome.runtime.sendMessage({ type: "JUMP_TO_NODE", nodeId: d.id });
      }
    })
    .call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0.25).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0);
          }
          d.fx = null;
          d.fy = null;
        })
    );

  node.append("title").text((d) => (d.isPlaceholder ? "New Tab" : d.url));

  const labels = svg
    .append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text((d) => getNodeLabel(d))
    .attr("font-size", 11)
    .attr("fill", "#444444")
    .attr("dx", 14)
    .attr("dy", 4);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });
}

function renderState(snapshot) {
  renderStats(snapshot);
  renderGraph(snapshot);
}

async function updateAutocompleteSuggestions(prefix) {
  const query = prefix.trim();
  if (!query) {
    urlSuggestionsEl.innerHTML = "";
    return;
  }

  const res = await chrome.runtime.sendMessage({ type: "AUTOCOMPLETE", prefix: query });
  const items = (res && res.suggestions) || [];
  urlSuggestionsEl.innerHTML = items
    .map((s) => `<option value="${s.replace(/"/g, "&quot;")}"></option>`)
    .join("");
}

startBtn.addEventListener("click", async () => {
  highlightPathIds = new Set();
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

fromUrlEl.addEventListener("input", () => {
  updateAutocompleteSuggestions(fromUrlEl.value);
});

toUrlEl.addEventListener("input", () => {
  updateAutocompleteSuggestions(toUrlEl.value);
});

pathBtn.addEventListener("click", async () => {
  const fromUrl = fromUrlEl.value.trim();
  const toUrl = toUrlEl.value.trim();
  if (!fromUrl || !toUrl) {
    pathResultEl.textContent = "Enter both source and destination URLs.";
    return;
  }

  const res = await chrome.runtime.sendMessage({ type: "FIND_PATH", fromUrl, toUrl });
  if (!res || !res.ok) {
    pathResultEl.textContent = (res && res.error) || "Path search failed.";
    highlightPathIds = new Set();
    if (currentState) {
      renderGraph(currentState);
    }
    return;
  }

  highlightPathIds = new Set(res.path || []);
  pathResultEl.textContent = res.path.length
    ? `Path node IDs: ${res.path.join(" -> ")}`
    : "No path found.";

  if (currentState) {
    renderGraph(currentState);
  }
});

async function init() {
  const res = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (res && res.ok) {
    currentState = res.state;
    renderState(res.state);
  }
}

init();
