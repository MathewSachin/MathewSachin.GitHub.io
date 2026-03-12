#!/usr/bin/env python3
"""Migrate Disqus blog-post comments to GitHub Discussions for giscus.

giscus is configured with data-mapping="pathname" and data-strict="1",
so each Discussion title must exactly match the page's URL pathname
(e.g. /blog/2016/11/05/chrome-dino-hack).

This script:
  1. Parses a Disqus XML export file.
  2. Filters to threads whose URL path starts with /blog/.
  3. Deduplicates threads that point to the same post under different
     domains or with tracking query parameters.
  4. For each unique blog post that has at least one comment, creates a
     GitHub Discussion with the pathname as its title.
  5. Posts each non-deleted, non-spam comment as a reply in that
     Discussion, preserving parent/child threading where possible.

Usage:
    export GITHUB_TOKEN=ghp_your_token_here
    python3 tools/migrate-disqus-to-giscus.py path/to/disqus-export.xml

Add --dry-run to preview what would be created without touching GitHub.

Requirements:
    pip install requests
"""

import argparse
import os
import sys
import time
import xml.etree.ElementTree as ET
from collections import defaultdict
from urllib.parse import urlparse

import requests

# ── giscus / repo constants ────────────────────────────────────────────────────

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

# Values taken directly from _includes/giscus.html
REPO_ID = "MDEwOlJlcG9zaXRvcnk0ODg1MDA2Mw=="
CATEGORY_ID = "DIC_kwDOAulkj84C4PRo"
SITE_URL = "https://mathewsachin.github.io"

# ── Disqus XML namespaces ──────────────────────────────────────────────────────

_DISQUS_NS = "http://disqus.com"
_DISQUS_INTERNALS_NS = "http://disqus.com/disqus-internals"


def _d(tag: str) -> str:
    """Qualify a tag name with the Disqus default namespace."""
    return f"{{{_DISQUS_NS}}}{tag}"


def _dsq(attr: str) -> str:
    """Qualify an attribute name with the dsq: namespace."""
    return f"{{{_DISQUS_INTERNALS_NS}}}{attr}"


# ── URL utilities ──────────────────────────────────────────────────────────────

def canonical_pathname(url: str) -> str | None:
    """Return the canonical pathname for a URL, or None if not a blog post.

    Strips the domain, query string, URL fragment, and .html extension so
    that the result matches the path giscus sees (data-mapping="pathname").
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


# ── Disqus XML parsing ─────────────────────────────────────────────────────────

def parse_export(xml_path: str):
    """Parse a Disqus XML export file.

    Returns:
        pathname_titles: dict[pathname, title]
        posts_by_pathname: dict[pathname, list[post_dict]]

    Each post_dict has keys:
        id, message, author_name, author_username, created_at, parent_id
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()

    # Map dsq:id -> canonical pathname (and title for first-seen thread)
    thread_map: dict[str, str] = {}     # dsq:id  -> pathname
    pathname_titles: dict[str, str] = {}  # pathname -> title

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

    # Gather non-deleted, non-spam posts belonging to blog-post threads
    posts_by_pathname: dict[str, list] = defaultdict(list)

    for post in root.findall(_d("post")):
        if (post.findtext(_d("isDeleted"), "false").strip() == "true"
                or post.findtext(_d("isSpam"), "false").strip() == "true"):
            continue

        thread_ref = post.find(_d("thread"))
        if thread_ref is None:
            continue
        tid = thread_ref.get(_dsq("id"))
        if tid not in thread_map:
            continue

        message = (post.findtext(_d("message")) or "").strip()
        if not message:
            continue

        author_el = post.find(_d("author"))
        author_name = ""
        author_username = ""
        if author_el is not None:
            author_name = (author_el.findtext(_d("name")) or "").strip()
            author_username = (author_el.findtext(_d("username")) or "").strip()

        parent_el = post.find(_d("parent"))
        parent_id = (
            parent_el.get(_dsq("id")) if parent_el is not None else None
        )

        posts_by_pathname[thread_map[tid]].append(
            {
                "id": post.get(_dsq("id")),
                "message": message,
                "author_name": author_name,
                "author_username": author_username,
                "created_at": (post.findtext(_d("createdAt")) or "").strip(),
                "parent_id": parent_id,
            }
        )

    return pathname_titles, posts_by_pathname


# ── GitHub GraphQL helpers ─────────────────────────────────────────────────────

_CREATE_DISCUSSION = """
mutation CreateDiscussion(
    $repoId: ID!, $categoryId: ID!, $title: String!, $body: String!
) {
  createDiscussion(input: {
    repositoryId: $repoId
    categoryId: $categoryId
    title: $title
    body: $body
  }) {
    discussion { id url }
  }
}
"""

_ADD_COMMENT = """
mutation AddComment($discussionId: ID!, $body: String!) {
  addDiscussionComment(input: {
    discussionId: $discussionId
    body: $body
  }) {
    comment { id }
  }
}
"""

_ADD_REPLY = """
mutation AddReply($discussionId: ID!, $replyToId: ID!, $body: String!) {
  addDiscussionComment(input: {
    discussionId: $discussionId
    replyToId: $replyToId
    body: $body
  }) {
    comment { id }
  }
}
"""

_FIND_DISCUSSION = """
query FindDiscussion($owner: String!, $repo: String!, $title: String!) {
  repository(owner: $owner, name: $repo) {
    discussions(first: 5, categoryId: "%s") {
      nodes { id url title }
    }
  }
}
""" % CATEGORY_ID


def _gh_query(token: str, query: str, variables: dict) -> dict:
    headers = {
        "Authorization": f"bearer {token}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        GITHUB_GRAPHQL_URL,
        json={"query": query, "variables": variables},
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL errors: {data['errors']}")
    return data["data"]


def _find_existing_discussion(token: str, pathname: str) -> str | None:
    """Return the node ID of an existing discussion whose title == pathname."""
    data = _gh_query(
        token,
        _FIND_DISCUSSION,
        {"owner": "MathewSachin", "repo": "MathewSachin.GitHub.io", "title": pathname},
    )
    for node in data["repository"]["discussions"]["nodes"]:
        if node["title"] == pathname:
            return node["id"]
    return None


def _create_discussion(token: str, pathname: str, title: str) -> str:
    """Create a GitHub Discussion and return its node ID."""
    body = (
        f"*Comments for [{title}]({SITE_URL}{pathname}), "
        f"migrated from Disqus.*"
    )
    data = _gh_query(
        token,
        _CREATE_DISCUSSION,
        {
            "repoId": REPO_ID,
            "categoryId": CATEGORY_ID,
            "title": pathname,
            "body": body,
        },
    )
    discussion = data["createDiscussion"]["discussion"]
    print(f"  ✓ Created: {discussion['url']}")
    return discussion["id"]


def _format_comment(post: dict) -> str:
    """Format a Disqus post as a GitHub Discussion comment body."""
    display = post["author_username"] or post["author_name"] or "Anonymous"
    created = post["created_at"] or "unknown date"
    return (
        f"**{display}** *(migrated from Disqus — {created})*\n\n"
        + post["message"]
    )


def _migrate_comments(
    token: str, discussion_id: str, posts: list[dict], dry_run: bool
):
    """Post all comments into a Discussion, preserving reply structure."""
    id_map: dict[str, str] = {}  # disqus post id -> github comment id

    for post in sorted(posts, key=lambda p: p["created_at"]):
        body = _format_comment(post)
        parent_dsq_id = post["parent_id"]
        author = post["author_name"] or post["author_username"] or "Anonymous"

        if dry_run:
            indent = "    ↳ " if (parent_dsq_id and parent_dsq_id in id_map) else "    • "
            print(f"{indent}{author}: {post['message'][:60]}…")
            id_map[post["id"]] = f"dry-run-{post['id']}"
            continue

        if parent_dsq_id and parent_dsq_id in id_map:
            data = _gh_query(
                token,
                _ADD_REPLY,
                {
                    "discussionId": discussion_id,
                    "replyToId": id_map[parent_dsq_id],
                    "body": body,
                },
            )
        else:
            data = _gh_query(
                token,
                _ADD_COMMENT,
                {"discussionId": discussion_id, "body": body},
            )

        id_map[post["id"]] = data["addDiscussionComment"]["comment"]["id"]
        print(f"    • {author}")
        time.sleep(0.5)  # stay within GitHub's rate limits


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Migrate Disqus blog comments to GitHub Discussions for giscus."
    )
    parser.add_argument("xml", help="Path to the Disqus XML export file.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be created without calling the GitHub API.",
    )
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN", "")
    if not token and not args.dry_run:
        print(
            "Error: set the GITHUB_TOKEN environment variable before running.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Parsing {args.xml} …")
    pathname_titles, posts_by_pathname = parse_export(args.xml)

    blog_pathnames = sorted(posts_by_pathname)
    if not blog_pathnames:
        print("No blog-post comments found in the export.")
        return

    print(f"\nFound {len(blog_pathnames)} blog post(s) with comments:\n")
    for p in blog_pathnames:
        n = len(posts_by_pathname[p])
        print(f"  {p}  ({n} comment{'s' if n != 1 else ''})")

    if args.dry_run:
        print("\n── DRY RUN — nothing will be written to GitHub ──\n")

    for pathname in blog_pathnames:
        title = pathname_titles.get(pathname, pathname)
        n = len(posts_by_pathname[pathname])
        print(f'\n\u201c{title}\u201d ({pathname})  \u2014 {n} comment{"s" if n != 1 else ""}')

        if args.dry_run:
            discussion_id = "dry-run"
        else:
            existing = _find_existing_discussion(token, pathname)
            if existing:
                print(f"  ℹ Discussion already exists, appending comments.")
                discussion_id = existing
            else:
                discussion_id = _create_discussion(token, pathname, title)

        _migrate_comments(token, discussion_id, posts_by_pathname[pathname], args.dry_run)

    print("\n✅ Migration complete." if not args.dry_run else "\n✅ Dry run complete.")


if __name__ == "__main__":
    main()
