#!/usr/bin/env python3
"""
Build the writing section.

Reads every .md in writing/posts/, renders each to writing/<slug>.html, and
generates writing/index.html with a chronologically sorted list.

Usage (from repo root):
    python writing/build.py

Each post .md must start with YAML-ish frontmatter like:
    ---
    title: A short title
    date: 2026-05-01
    tag: Intro
    description: One-line summary.
    ---

Requires: pip install markdown
"""

from __future__ import annotations

import sys
from datetime import date as Date
from pathlib import Path

try:
    import markdown  # type: ignore
except ImportError:
    sys.stderr.write(
        "Missing dependency: markdown\n"
        "Install with:  pip install markdown\n"
    )
    sys.exit(1)


# ─── Paths ──────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent          # repo/writing/
POSTS_DIR = ROOT / "posts"                      # repo/writing/posts/
OUT_DIR = ROOT                                  # repo/writing/
INDEX_OUT = ROOT / "index.html"


# ─── Templates ──────────────────────────────────────────────────────────────

POST_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — Harsh Kumar Arya</title>
  <meta name="description" content="{description}" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="writing.css" />
</head>
<body>

  <nav class="nav" id="nav">
    <div class="container nav-inner">
      <a href="../" class="logo">Harsh<span>.</span></a>
      <div class="nav-links">
        <a href="../#about">About</a>
        <a href="../#work">Work</a>
        <a href="../#off">Life</a>
        <a href="./">Notes</a>
        <a href="../#contact">Contact</a>
      </div>
    </div>
  </nav>

  <article class="post container">
    <header class="post-header">
      <a href="./" class="post-back">← All notes</a>
      <div class="post-meta">
        <span class="post-date">{date_human}</span>
        <span class="post-dot">·</span>
        <span class="post-tag">{tag}</span>
      </div>
      <h1 class="post-title">{title}</h1>
      {description_block}
    </header>
    <div class="post-body">
{body}
    </div>
    <footer class="post-footer">
      <a href="./">← All notes</a>
      <a href="../#contact">Get in touch →</a>
    </footer>
  </article>

  <footer class="site-footer">
    <div class="container">
      <span>© <span id="year"></span> Harsh Kumar Arya</span>
      <span>Built simply · Hosted on GitHub Pages</span>
    </div>
  </footer>

  <script>
    document.getElementById("year").textContent = new Date().getFullYear();
    const nav = document.getElementById("nav");
    window.addEventListener("scroll", () => {{
      if (window.scrollY > 8) nav.classList.add("scrolled"); else nav.classList.remove("scrolled");
    }});
  </script>
</body>
</html>
"""


INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notes — Harsh Kumar Arya</title>
  <meta name="description" content="Writing on go-to-market, talent management, founder's-office work, and Indian sports — by Harsh Kumar Arya." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="writing.css" />
</head>
<body>

  <nav class="nav" id="nav">
    <div class="container nav-inner">
      <a href="../" class="logo">Harsh<span>.</span></a>
      <div class="nav-links">
        <a href="../#about">About</a>
        <a href="../#work">Work</a>
        <a href="../#off">Life</a>
        <a href="./">Notes</a>
        <a href="../#contact">Contact</a>
      </div>
    </div>
  </nav>

  <header class="container index-header">
    <div class="hero-eyebrow">Notes</div>
    <h1 class="index-title">Stories from the<br><em>operator's seat.</em></h1>
    <p class="index-lead">A slow archive on agency-building, go-to-market, founder's-office work, Indian sports, and the books and ideas in between.</p>
  </header>

  <main class="container">
    <div class="notes-list">
{post_rows}
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <span>© <span id="year"></span> Harsh Kumar Arya</span>
      <span>Built simply · Hosted on GitHub Pages</span>
    </div>
  </footer>

  <script>
    document.getElementById("year").textContent = new Date().getFullYear();
    const nav = document.getElementById("nav");
    window.addEventListener("scroll", () => {{
      if (window.scrollY > 8) nav.classList.add("scrolled"); else nav.classList.remove("scrolled");
    }});
  </script>
</body>
</html>
"""


POST_ROW_TEMPLATE = """      <a class="note-item" href="{slug}.html">
        <span class="note-date">{date_short}</span>
        <span class="note-title">{title}</span>
        <span class="note-tag">{tag}</span>
      </a>
"""


# ─── Frontmatter parsing ────────────────────────────────────────────────────

def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Parse a leading ---\\nkey: value\\n--- block. Returns (meta, body)."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    raw_meta, body = parts[1], parts[2].lstrip("\n")
    meta = {}
    for line in raw_meta.strip().splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip('"').strip("'")
    return meta, body


def parse_date(s: str) -> Date:
    return Date.fromisoformat(s)


def date_human(d: Date) -> str:
    return d.strftime("%B %Y")


def date_short(d: Date) -> str:
    return d.strftime("%b %Y")


# ─── Rendering ──────────────────────────────────────────────────────────────

def render_post(md_path: Path) -> dict:
    raw = md_path.read_text(encoding="utf-8")
    meta, body_md = parse_frontmatter(raw)

    title = meta.get("title", md_path.stem)
    tag = meta.get("tag", "Note")
    description = meta.get("description", "")
    try:
        d = parse_date(meta.get("date", "1970-01-01"))
    except ValueError:
        d = Date(1970, 1, 1)

    slug = md_path.stem
    body_html = markdown.markdown(body_md, extensions=["extra", "smarty"])

    description_block = (
        f'<p class="post-description">{description}</p>' if description else ""
    )

    indented_body = "\n".join("      " + line for line in body_html.splitlines())

    out_html = POST_TEMPLATE.format(
        title=title,
        description=description,
        date_human=date_human(d),
        tag=tag,
        body=indented_body,
        description_block=description_block,
    )

    out_path = OUT_DIR / f"{slug}.html"
    out_path.write_text(out_html, encoding="utf-8")
    print(f"  · {slug}.html")

    return {
        "slug": slug,
        "title": title,
        "tag": tag,
        "date": d,
        "date_short": date_short(d),
    }


def render_index(posts: list[dict]) -> None:
    posts_sorted = sorted(posts, key=lambda p: p["date"], reverse=True)
    rows = "".join(POST_ROW_TEMPLATE.format(**p) for p in posts_sorted)
    out_html = INDEX_TEMPLATE.format(post_rows=rows.rstrip())
    INDEX_OUT.write_text(out_html, encoding="utf-8")
    n = len(posts_sorted)
    print(f"  · index.html ({n} post{'s' if n != 1 else ''})")


# ─── Main ───────────────────────────────────────────────────────────────────

def main() -> int:
    if not POSTS_DIR.exists():
        print(f"No posts directory at {POSTS_DIR}")
        return 1
    md_files = sorted(POSTS_DIR.glob("*.md"))
    if not md_files:
        print("No markdown posts found.")
        return 0

    print(f"Building {len(md_files)} post(s)…")
    posts = [render_post(p) for p in md_files]
    render_index(posts)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
