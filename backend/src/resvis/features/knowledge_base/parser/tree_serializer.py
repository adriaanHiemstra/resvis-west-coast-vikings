"""Converts the vendored parser's `Node` objects into plain dict/JSON-
friendly structures. Kept separate from `adapter.py` on purpose: the
adapter's job is "get a tree from text", this file's job is "make a tree
travel over HTTP" — two different reasons to change, two different files.
"""

from __future__ import annotations

from resvis.features.knowledge_base.parser.vendor.parser import Node


def serialize_node(node: Node | None) -> dict | None:
    """Recursively turns one `Node` into `{"label", "left", "right"}`.

    A leaf (a plain letter like "P") has no children, so its `left` and
    `right` come out as `None`. A binary operator node's `left`/`right`
    are themselves serialized the same way, all the way down — that's
    the recursion: to serialize a tree, serialize its two branches and
    wrap them with this node's own label.
    """
    if node is None:
        return None
    return {
        "label": node.label,
        "left": serialize_node(node.left),
        "right": serialize_node(node.right),
    }
