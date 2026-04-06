package com.webweave.dsa;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class WebWeaveSession {
    public static class VisitNode {
        public final int id;
        public final int tabId;
        public final String url;

        public VisitNode(int id, int tabId, String url) {
            this.id = id;
            this.tabId = tabId;
            this.url = url;
        }
    }

    private int nextNodeId = 1;
    private final Map<Integer, DoublyLinkedList<VisitNode>> tabLists = new HashMap<>();
    private final Map<Integer, StackDS<Integer>> backStacks = new HashMap<>();
    private final Map<String, List<Integer>> urlIndex = new HashMap<>();
    private final Map<Integer, List<Integer>> tabTree = new HashMap<>();
    private final Trie trie = new Trie();
    private final LRUCache<String, Long> lru = new LRUCache<>(300);
    private final List<int[]> edges = new ArrayList<>();

    public VisitNode recordVisit(int tabId, String url) {
        tabLists.putIfAbsent(tabId, new DoublyLinkedList<>());
        backStacks.putIfAbsent(tabId, new StackDS<>());

        VisitNode prev = tabLists.get(tabId).getLast();
        VisitNode current = new VisitNode(nextNodeId++, tabId, url);

        tabLists.get(tabId).append(current);
        backStacks.get(tabId).push(current.id);

        if (prev != null) {
            edges.add(new int[] {prev.id, current.id});
        }

        urlIndex.computeIfAbsent(url, k -> new ArrayList<>()).add(current.id);
        trie.insert(url);
        lru.put(url, System.currentTimeMillis());

        return current;
    }

    public void addTabBranch(int parentTabId, int childTabId) {
        tabTree.computeIfAbsent(parentTabId, k -> new ArrayList<>()).add(childTabId);
    }

    public List<Integer> findPath(String fromUrl, String toUrl) {
        List<Integer> fromIds = urlIndex.getOrDefault(fromUrl, List.of());
        List<Integer> toIds = urlIndex.getOrDefault(toUrl, List.of());

        if (fromIds.isEmpty() || toIds.isEmpty()) {
            return List.of();
        }

        int start = fromIds.get(fromIds.size() - 1);
        int goal = toIds.get(toIds.size() - 1);
        return GraphAlgorithms.bfsPath(start, goal, edges);
    }

    public List<String> suggest(String prefix) {
        return trie.autocomplete(prefix, 8);
    }

    public List<Integer> tabTreeDfs(int rootTabId) {
        return GraphAlgorithms.dfsOrder(rootTabId, tabTree);
    }
}
