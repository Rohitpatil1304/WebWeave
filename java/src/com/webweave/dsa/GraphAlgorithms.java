package com.webweave.dsa;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class GraphAlgorithms {
    public static List<Integer> bfsPath(int start, int goal, List<int[]> edges) {
        if (start == goal) {
            return List.of(start);
        }

        Map<Integer, List<Integer>> adj = new HashMap<>();
        for (int[] edge : edges) {
            adj.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(edge[1]);
        }

        Deque<Integer> queue = new ArrayDeque<>();
        queue.offer(start);
        Set<Integer> visited = new HashSet<>();
        visited.add(start);
        Map<Integer, Integer> parent = new HashMap<>();

        while (!queue.isEmpty()) {
            int node = queue.poll();
            for (int next : adj.getOrDefault(node, List.of())) {
                if (visited.contains(next)) {
                    continue;
                }

                visited.add(next);
                parent.put(next, node);

                if (next == goal) {
                    return reconstructPath(parent, start, goal);
                }
                queue.offer(next);
            }
        }

        return List.of();
    }

    public static List<Integer> dfsOrder(int root, Map<Integer, List<Integer>> tree) {
        List<Integer> out = new ArrayList<>();
        dfs(root, tree, out);
        return out;
    }

    private static void dfs(int node, Map<Integer, List<Integer>> tree, List<Integer> out) {
        out.add(node);
        for (int child : tree.getOrDefault(node, List.of())) {
            dfs(child, tree, out);
        }
    }

    private static List<Integer> reconstructPath(Map<Integer, Integer> parent, int start, int goal) {
        List<Integer> out = new ArrayList<>();
        int cur = goal;
        out.add(cur);

        while (parent.containsKey(cur)) {
            cur = parent.get(cur);
            out.add(cur);
        }

        java.util.Collections.reverse(out);
        if (out.isEmpty() || out.get(0) != start) {
            return List.of();
        }
        return out;
    }
}
