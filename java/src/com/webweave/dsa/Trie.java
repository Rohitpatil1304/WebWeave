package com.webweave.dsa;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Trie {
    private static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        boolean isEnd;
    }

    private final TrieNode root = new TrieNode();

    public void insert(String word) {
        if (word == null || word.isBlank()) {
            return;
        }

        TrieNode cur = root;
        for (char ch : word.toLowerCase().toCharArray()) {
            cur.children.putIfAbsent(ch, new TrieNode());
            cur = cur.children.get(ch);
        }
        cur.isEnd = true;
    }

    public List<String> autocomplete(String prefix, int limit) {
        List<String> out = new ArrayList<>();
        if (prefix == null) {
            return out;
        }

        String normalized = prefix.toLowerCase();
        TrieNode cur = root;
        for (char ch : normalized.toCharArray()) {
            if (!cur.children.containsKey(ch)) {
                return out;
            }
            cur = cur.children.get(ch);
        }

        dfs(cur, normalized, out, limit);
        return out;
    }

    private void dfs(TrieNode node, String path, List<String> out, int limit) {
        if (out.size() >= limit) {
            return;
        }
        if (node.isEnd) {
            out.add(path);
        }

        for (Map.Entry<Character, TrieNode> entry : node.children.entrySet()) {
            dfs(entry.getValue(), path + entry.getKey(), out, limit);
        }
    }
}
