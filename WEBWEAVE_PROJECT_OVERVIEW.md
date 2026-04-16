# WebWeave Project Overview

WebWeave is a Chrome extension that records a live browsing session and turns it into an interactive graph. The project is built to demonstrate data structures and algorithms in a practical browser tool, combining tab history tracking, autocomplete, graph search, and session visualization.

## What The Project Does

The extension watches page navigations during an active session and builds a session graph made of nodes and edges. Each node represents a visited page, while each edge represents a navigation step, usually from one page to the next in the same tab. The dashboard then renders that session as a D3 force-directed graph so the browsing flow becomes easy to inspect.

The project has two primary user-facing surfaces:

- The popup, which provides quick session controls and summary stats.
- The dashboard, which provides the full graph view, autocomplete, path search, and node-to-page jumping.

## Project Structure

- [manifest.json](manifest.json) defines the Chrome extension, permissions, background service worker, and popup entry point.
- [background.js](background.js) stores session state, listens to browser events, and answers messages from the UI.
- [popup/popup.html](popup/popup.html), [popup/popup.js](popup/popup.js), and [popup/popup.css](popup/popup.css) implement the compact popup UI.
- [dashboard.html](dashboard.html), [dashboard.js](dashboard.js), and [dashboard.css](dashboard.css) implement the full-page graph dashboard.
- [dsa/dsa.js](dsa/dsa.js) contains the JavaScript data structures and algorithms used by the extension.
- [java/src/com/webweave/dsa/](java/src/com/webweave/dsa/) contains Java versions of the same data structures and algorithms for reference.

## Extension Architecture

The extension uses Manifest V3 with a service worker background script. The background layer is the central source of truth for the session. It tracks nodes, edges, tab relationships, autocomplete data, and a lightweight cache. The popup and dashboard connect to the background script using `chrome.runtime.connect` and `chrome.runtime.sendMessage`, which keeps both UIs in sync with the current session state.

The main workflow is:

1. The user starts a session from the popup or dashboard.
2. The background script begins recording navigation events.
3. Each committed main-frame navigation becomes a node in the session graph.
4. Consecutive pages in the same tab create edges.
5. The dashboard receives live state updates and redraws the graph.

## Background Logic

The background script is responsible for the actual session model. It keeps the following state:

- `nodes`: all recorded visits.
- `edges`: navigation connections between visits.
- `tabLists`: per-tab linked lists of visits.
- `tabBackStack`: per-tab back stacks.
- `tabParent` and `tabChildren`: a tab tree based on opener relationships.
- `urlIndex`: a map from URL to the visit node IDs that used it.
- `trie`: URL prefix autocomplete.
- `lru`: a cache of recently visited URLs.

It listens to browser events such as `chrome.webNavigation.onCommitted`, `chrome.tabs.onCreated`, and `chrome.tabs.onRemoved`. When a tab is created, the script seeds an empty placeholder node so the graph initializes immediately. When a navigation is recorded, the script creates or extends the tab flow, links it to the previous visit in the same tab, indexes the URL, and broadcasts the updated snapshot to connected UIs.

The background script also supports the main UI actions:

- Start and stop a session.
- Fetch the current state.
- Return autocomplete suggestions.
- Find a shortest path between two visited URLs.
- Jump back to a recorded node by opening or focusing the corresponding tab and URL.

## Popup UI

The popup is the light-weight control panel. It shows the current session status, node count, edge count, and start time. It also provides buttons to start and stop the session and a shortcut to open the full dashboard.

This screen is intentionally simple. Its job is to make session control fast without requiring the full dashboard to be open.

## Dashboard UI

The dashboard is the main visualization layer. It combines session controls, autocomplete, path search, and the rendered graph into a single page.

Key dashboard features:

- A live stats panel for session state.
- A URL autocomplete input that suggests previously visited pages.
- A path search form that finds a BFS path between two URLs.
- A force-directed D3 graph that displays the browsing session.
- Clickable nodes that jump to the exact page in the browser.

The graph uses different colors to distinguish regular nodes from highlighted path nodes. Users can drag nodes to inspect the structure more comfortably, and the view updates whenever the session state changes.

## Data Structures And Algorithms

The project is explicitly built around DSA concepts, and the JavaScript implementation mirrors the Java reference code.

- [dsa/dsa.js](dsa/dsa.js) implements a doubly linked list, stack, trie, LRU cache, BFS shortest path, and DFS tree traversal.
- [java/src/com/webweave/dsa/DoublyLinkedList.java](java/src/com/webweave/dsa/DoublyLinkedList.java), [java/src/com/webweave/dsa/StackDS.java](java/src/com/webweave/dsa/StackDS.java), [java/src/com/webweave/dsa/Trie.java](java/src/com/webweave/dsa/Trie.java), [java/src/com/webweave/dsa/LRUCache.java](java/src/com/webweave/dsa/LRUCache.java), and [java/src/com/webweave/dsa/GraphAlgorithms.java](java/src/com/webweave/dsa/GraphAlgorithms.java) provide the Java counterparts.
- [java/src/com/webweave/dsa/WebWeaveSession.java](java/src/com/webweave/dsa/WebWeaveSession.java) ties those pieces together into a session model similar to the extension.

How the structures are used:

- The doubly linked list stores the ordered visit history for each tab.
- The stack keeps a back-navigation history per tab.
- The trie powers URL autocomplete.
- The LRU cache tracks recently visited URLs efficiently.
- BFS finds the shortest navigation path between two pages.
- DFS traverses the tab tree from root tabs to child tabs.

## Design Notes

The UI uses a clean green-and-cream visual style with soft gradients and rounded cards. The dashboard is built for broad screens, while the popup is compressed for quick access. The project also uses a large SVG canvas and a D3 force simulation to make the graph readable when the session grows.

## Limitations

The project is useful as a live visualization tool, but it still has a few practical limits:

- Session state is kept in memory, so it does not persist across browser restarts.
- Large browsing sessions can make the graph more expensive to render.
- The URL matching logic is mostly exact with a small amount of protocol normalization.
- Internal browser pages are intentionally filtered out in most cases.

## Summary

WebWeave is a browser extension that turns browsing activity into an analyzable session graph. It is both a working visualization tool and a teaching project that demonstrates linked lists, stacks, tries, caching, BFS, and DFS in a real UI.