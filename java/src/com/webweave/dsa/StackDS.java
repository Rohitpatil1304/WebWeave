package com.webweave.dsa;

import java.util.ArrayDeque;
import java.util.Deque;

public class StackDS<T> {
    private final Deque<T> stack = new ArrayDeque<>();

    public void push(T value) {
        stack.push(value);
    }

    public T pop() {
        return stack.isEmpty() ? null : stack.pop();
    }

    public T peek() {
        return stack.isEmpty() ? null : stack.peek();
    }

    public int size() {
        return stack.size();
    }
}
