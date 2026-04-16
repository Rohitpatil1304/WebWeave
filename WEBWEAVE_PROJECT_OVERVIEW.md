# WebWeave Project Overview

WebWeave is a Chrome extension that records browsing activity and converts it into a live, interactive graph. It is designed as a data structures and algorithms project, but it also behaves like a real product: you can start a session, browse normally, and inspect the resulting navigation graph in the dashboard.

## Short Presentation Summary

The easiest way to describe WebWeave is this: it watches how the user moves through tabs and pages, stores that journey as graph data, and then visualizes it. New tabs appear immediately in the graph, link clicks are tracked as soon as they happen, and the dashboard lets the user search URLs, find a path between two points, and jump back to the exact page.

## End-To-End Workflow

The project works in a clear pipeline:

1. The user starts a session from the popup or dashboard.
2. The background service worker clears old state and begins listening to browser events.
3. When the user opens a new tab, WebWeave creates a placeholder node right away so the graph already shows the tab.
4. When the user clicks a link, the content script captures that click and sends the destination URL to the background script.
5. The background script creates a node for that click and links it to the previous page in the same tab.
6. When the browser navigation actually commits, the background script reuses the pending node instead of duplicating it.
7. The dashboard receives the updated session snapshot and redraws the D3 graph.
8. The user can then type From and To URLs, choose suggestions from the graph, and run BFS to highlight the path.

That workflow is what makes the project feel live instead of static. It does not wait for manual imports or offline processing; it updates in real time as the browser changes.

## Main Components

- [manifest.json](manifest.json) defines the extension, permissions, content script, background service worker, and popup entry point.
- [background.js](background.js) is the central state manager. It stores nodes, edges, tab relationships, autocomplete data, and path search logic.
- [content.js](content.js) captures link clicks from pages and reports them to the background script.
- [popup/popup.html](popup/popup.html), [popup/popup.js](popup/popup.js), and [popup/popup.css](popup/popup.css) implement the compact control panel.
- [dashboard.html](dashboard.html), [dashboard.js](dashboard.js), and [dashboard.css](dashboard.css) implement the full visualization and path search interface.
- [dsa/dsa.js](dsa/dsa.js) contains the JavaScript implementations of the core data structures and graph algorithms.
- [java/src/com/webweave/dsa/](java/src/com/webweave/dsa/) contains equivalent Java implementations for reference and presentation.

## How The Implementation Works

### 1. Session State In The Background Script

The background script is the single source of truth. It keeps all session data in memory, including:

- `nodes`: every page visit and placeholder tab node.
- `edges`: the connections between visits.
- `tabLists`: ordered visit history per tab.
- `tabBackStack`: a stack of visit IDs per tab.
- `tabParent` and `tabChildren`: a tree of tab opening relationships.
- `urlIndex`: a lookup from URL to visit IDs.
- `trie`: autocomplete storage for previously visited URLs.
- `lru`: a small recent-URL cache.
- `tabPendingClicks`: a temporary map used to merge click events with later navigation commits.

This makes the background script responsible for both tracking and query handling.

### 2. New Tab Initialization

When a new tab opens during an active session, the background script creates an empty placeholder node immediately. This is why the graph can show a new tab before any website loads. It helps the user understand that a tab exists even if it is still blank.

### 3. Link Click Tracking

The content script listens for click events on anchors. When the user clicks a link, it sends the clicked URL, title, target, and modifier-key information to the background script. This means the project can record link activity at click time, not only after navigation completes.

The background script then creates a node for that click and stores it as a pending visit. When the browser later reports the committed navigation for the same tab, the script checks whether the visit already exists and updates that node instead of adding a duplicate.

This is the key reason the graph stays accurate while still responding quickly.

### 4. URL Indexing And Suggestions

Every recorded URL is inserted into the trie and into the URL index. That supports autocomplete in the dashboard. The current UI uses From and To fields only, and both fields share the same URL suggestion source.

Autocomplete is intentionally flexible:

- It matches URL prefixes.
- It also matches word fragments inside the URL.
- It ignores the `http://` and `https://` difference when searching.

That is why typing a word like `leetcode` or even a partial URL still gives meaningful suggestions.

### 5. Path Search

After the user chooses a From URL and a To URL, the background script finds the latest recorded node for each one. It then runs BFS over the session edges to find the shortest path between them.

The dashboard receives the resulting node ID list and highlights the path in the graph. This is useful when presenting the project because it shows a real algorithm solving a real navigation question: how did the user get from one page to another in the session?

### 6. Graph Rendering

The dashboard renders the session as a D3 force-directed graph.

- Nodes represent visits.
- Edges represent transitions.
- Placeholder nodes represent newly opened tabs.
- Highlighted nodes and edges show the BFS path.

The force simulation keeps the graph readable by spreading nodes apart, and drag behavior lets the user manually inspect a cluster.

## Detailed Module Breakdown

### Background Script

The background script listens to:

- `chrome.tabs.onCreated` to register new tabs.
- `chrome.tabs.onRemoved` to clean tab state.
- `chrome.webNavigation.onCommitted` to record real page loads.
- `chrome.runtime.onMessage` to handle start, stop, autocomplete, path search, and node jump actions.
- `chrome.runtime.onConnect` to broadcast live state updates to the UI.

That gives it full control over the session lifecycle.

### Popup UI

The popup is the quick control surface. It is used to start or stop the session and to open the dashboard. It also shows lightweight stats such as session status, node count, edge count, and session start time.

### Dashboard UI

The dashboard is where the presentation lives.

- The top area shows live session stats.
- The path area lets the user type From and To URLs.
- The browser suggestions come from the graph itself.
- The graph area shows the live navigation network.
- Clicking a non-placeholder node jumps back to that exact page.

## Data Structures And Algorithms

The project is intentionally built around DSA concepts.

- [dsa/dsa.js](dsa/dsa.js) implements a doubly linked list, stack, trie, LRU cache, BFS path search, and DFS tree traversal.
- [java/src/com/webweave/dsa/DoublyLinkedList.java](java/src/com/webweave/dsa/DoublyLinkedList.java), [java/src/com/webweave/dsa/StackDS.java](java/src/com/webweave/dsa/StackDS.java), [java/src/com/webweave/dsa/Trie.java](java/src/com/webweave/dsa/Trie.java), [java/src/com/webweave/dsa/LRUCache.java](java/src/com/webweave/dsa/LRUCache.java), and [java/src/com/webweave/dsa/GraphAlgorithms.java](java/src/com/webweave/dsa/GraphAlgorithms.java) mirror the JavaScript logic.
- [java/src/com/webweave/dsa/WebWeaveSession.java](java/src/com/webweave/dsa/WebWeaveSession.java) combines the structures into a Java session model.

What each one does:

- The doubly linked list stores the ordered history for each tab.
- The stack supports back-navigation style tracking.
- The trie provides fast URL suggestion lookup.
- The LRU cache remembers recently used URLs.
- BFS finds the shortest path through the session graph.
- DFS walks the tree of tabs opened from other tabs.

## Why The Project Is Good For Presentation

WebWeave is easy to present because it connects theory and practice:

- The browser interaction is easy to understand.
- The graph visualization is immediately visible.
- The algorithms are simple to explain and map directly to features.
- The Java and JavaScript implementations show the same concepts in two languages.

If you are demoing it live, the best sequence is:

1. Start a session.
2. Open a new tab.
3. Click a few links on different pages.
4. Show the graph updating.
5. Use From and To suggestions.
6. Run BFS and highlight the path.
7. Click a node to jump back to the page.

## Limitations

The current version is intentionally simple and has a few constraints:

- Session data is in memory, so it resets when the extension reloads or the browser restarts.
- Large sessions can make the graph heavier to render.
- URL matching is practical but not fully canonicalized.
- Internal browser pages are mostly filtered out.

## Closing Summary

WebWeave is a browser-session visualization tool built around core DSA ideas. It tracks tabs, captures link clicks, records navigation as graph data, and lets the user search and highlight paths through the browsing history. For presentation, the most important message is that the project turns an ordinary browser session into a live graph that is both interactive and algorithmically meaningful.