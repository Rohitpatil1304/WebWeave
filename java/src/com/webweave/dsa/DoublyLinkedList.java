package com.webweave.dsa;

import java.util.ArrayList;
import java.util.List;

public class DoublyLinkedList<T> {
    static class Node<T> {
        T value;
        Node<T> prev;
        Node<T> next;

        Node(T value) {
            this.value = value;
        }
    }

    private Node<T> head;
    private Node<T> tail;
    private int size;

    public void append(T value) {
        Node<T> node = new Node<>(value);
        if (head == null) {
            head = node;
            tail = node;
            size = 1;
            return;
        }

        tail.next = node;
        node.prev = tail;
        tail = node;
        size++;
    }

    public T getLast() {
        return tail == null ? null : tail.value;
    }

    public int size() {
        return size;
    }

    public List<T> toList() {
        List<T> out = new ArrayList<>();
        Node<T> cur = head;
        while (cur != null) {
            out.add(cur.value);
            cur = cur.next;
        }
        return out;
    }
}
