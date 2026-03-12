#!/usr/bin/env python3
"""Convert a Disqus XML export into per-post Markdown comment files.

Each blog post found in the export gets its own .md file with all comments
formatted as nested Markdown blockquotes, preserving reply threading.
No comments are skipped — deleted and spam posts are included and labelled.

Usage:
    python3 tools/disqus-to-markdown.py disqus-export.xml
    python3 tools/disqus-to-markdown.py disqus-export.xml --output-dir my-comments/

Output files are named after the post path, e.g.:
    blog-2016-11-05-chrome-dino-hack.md
"""

import argparse
import os
import xml.etree.ElementTree as ET
from collections import defaultdict
from urllib.parse import urlparse

SITE_URL = "https://mathewsachin.github.io"

_DISQUS_NS = "http://disqus.com"
_DISQUS_INTERNALS_NS = "http://disqus.com/disqus-internals"


def _d(tag: str) -> str:
    return f"{{{_DISQUS_NS}}}{tag}"


def _dsq(attr: str) -> str:
    return f"{{{_DISQUS_INTERNALS_NS}}}{attr}"


# ── URL utilities ──────────────────────────────────────────────────────────────

def canonical_pathname(url: str) -> str | None:
    """Return the canonical /blog/… pathname for a URL, or None if not a blog post.

    Strips the domain, query string, URL fragment, and .html extension.
    """
    try:
        path = urlparse(url.strip()).path
    except Exception:
        return None
    if not path.startswith("/blog/"):
        return None
    if path.endswith(".html"):
        path = path[:-5]
    return path.rstrip("/")


def pathname_to_filename(pathname: str) -> str:
    """Convert /blog/2016/11/05/chrome-dino-hack → blog-2016-11-05-chrome-dino-hack.md"""
    return pathname.lstrip("/").replace("/", "-") + ".md"


# ── Disqus XML parsing ─────────────────────────────────────────────────────────

def parse_export(xml_path: str):
    """Parse a Disqus XML export.

    Returns:
        pathname_titles: dict[pathname, title]  — all blog-post threads
        posts_by_pathname: dict[pathname, list[post_dict]]  — ALL posts, incl. deleted/spam
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()

    thread_map: dict[str, str] = {}       # dsq:id -> pathname
    pathname_titles: dict[str, str] = {}  # pathname -> title (first-seen thread wins)

    for thread in root.findall(_d("thread")):
        tid = thread.get(_dsq("id"))
        if not tid:
            continue
        link_el = thread.find(_d("link"))
        if link_el is None or not (link_el.text or "").strip():
            continue
        pathname = canonical_pathname(link_el.text)
        if pathname is None:
            continue
        thread_map[tid] = pathname
        if pathname not in pathname_titles:
            title_el = thread.find(_d("title"))
            pathname_titles[pathname] = (
                (title_el.text or "").strip() if title_el is not None else ""
            )

    posts_by_pathname: dict[str, list] = defaultdict(list)

    for post in root.findall(_d("post")):
        thread_ref = post.find(_d("thread"))
        if thread_ref is None:
            continue
        tid = thread_ref.get(_dsq("id"))
        if tid not in thread_map:
            continue

        author_el = post.find(_d("author"))
        author_name = ""
        author_username = ""
        if author_el is not None:
            author_name = (author_el.findtext(_d("name")) or "").strip()
            author_username = (author_el.findtext(_d("username")) or "").strip()

        parent_el = post.find(_d("parent"))
        parent_id = parent_el.get(_dsq("id")) if parent_el is not None else None

        posts_by_pathname[thread_map[tid]].append({
            "id": post.get(_dsq("id")),
            "message": (post.findtext(_d("message")) or "").strip(),
            "author_name": author_name,
            "author_username": author_username,
            "created_at": (post.findtext(_d("createdAt")) or "").strip(),
            "parent_id": parent_id,
            "is_deleted": post.findtext(_d("isDeleted"), "false").strip() == "true",
            "is_spam": post.findtext(_d("isSpam"), "false").strip() == "true",
        })

    return pathname_titles, posts_by_pathname


# ── Markdown rendering ─────────────────────────────────────────────────────────

def _blockquote(text: str, depth: int) -> str:
    """Wrap every line of text in `depth` levels of Markdown blockquote `> `."""
    if depth == 0:
        return text
    prefix = "> " * depth
    bare = prefix.rstrip()
    return "\n".join(
        (prefix + line) if line.strip() else bare
        for line in text.splitlines()
    )


def _render_post(post: dict, depth: int) -> str:
    """Format a single comment as a Markdown block at the given nesting depth."""
    display = post["author_username"] or post["author_name"] or "Anonymous"
    created = post["created_at"] or "unknown date"

    if post["is_deleted"]:
        header = f"**{display}** · {created} *(deleted)*"
        body = "*[This comment was deleted.]*"
    elif post["is_spam"]:
        header = f"**{display}** · {created} *(spam)*"
        body = "*[This comment was marked as spam.]*"
    else:
        header = f"**{display}** · {created}"
        body = post["message"]

    return _blockquote(f"{header}\n\n{body}", depth)


def _render_children(
    parent_id: str | None,
    children_map: dict[str | None, list],
    depth: int,
) -> list[str]:
    """Recursively render a post and all its replies, depth-first."""
    lines: list[str] = []
    for post in sorted(children_map.get(parent_id, []), key=lambda p: p["created_at"]):
        lines.append(_render_post(post, depth))
        lines.extend(_render_children(post["id"], children_map, depth + 1))
        if depth == 0:
            lines += ["", "---", ""]
    return lines


def build_markdown(pathname: str, title: str, posts: list[dict]) -> str:
    """Build the full Markdown content for a single blog post's comment thread."""
    url = f"{SITE_URL}{pathname}"
    lines = [
        f"# {title or pathname}",
        "",
        f"**Post:** [{pathname}]({url})",
        "",
        "*Exported from Disqus*",
        "",
        "---",
        "",
    ]

    if not posts:
        return "\n".join(lines + ["*No comments.*", ""])

    # Build a parent_id → [child posts] map.
    # Posts whose parent is not in this thread are treated as top-level (parent_id = None).
    post_ids = {p["id"] for p in posts}
    children_map: dict[str | None, list] = defaultdict(list)
    for post in posts:
        parent = post["parent_id"]
        key = parent if (parent and parent in post_ids) else None
        children_map[key].append(post)

    body = _render_children(None, children_map, depth=0)

    # Strip trailing blank lines / stray separators
    while body and body[-1] in ("---", ""):
        body.pop()

    return "\n".join(lines + body) + "\n"


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Convert a Disqus XML export into per-post Markdown comment files."
    )
    parser.add_argument("xml", help="Path to the Disqus XML export file.")
    parser.add_argument(
        "--output-dir",
        default="tools/disqus-comments",
        metavar="DIR",
        help="Directory to write .md files into (default: tools/disqus-comments).",
    )
    args = parser.parse_args()

    print(f"Parsing {args.xml} \u2026")
    pathname_titles, posts_by_pathname = parse_export(args.xml)

    if not pathname_titles:
        print("No blog-post threads found in the export.")
        return

    os.makedirs(args.output_dir, exist_ok=True)

    total_posts = sum(len(v) for v in posts_by_pathname.values())
    print(
        f"Found {len(pathname_titles)} blog post thread(s), "
        f"{total_posts} comment(s). Writing to {args.output_dir}/\n"
    )

    for pathname in sorted(pathname_titles):
        title = pathname_titles[pathname]
        posts = posts_by_pathname.get(pathname, [])
        content = build_markdown(pathname, title, posts)
        filename = pathname_to_filename(pathname)
        filepath = os.path.join(args.output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        n = len(posts)
        print(f"  \u2713 {filename}  ({n} comment{'s' if n != 1 else ''})")

    print(
        f"\n\u2705 Done. {len(pathname_titles)} file(s) written to {args.output_dir}/"
    )


if __name__ == "__main__":
    main()
