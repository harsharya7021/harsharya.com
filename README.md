# harsharya.com

Personal site of Harsh Kumar Arya. Static HTML, hosted on GitHub Pages, served from `harsharya.com` (custom domain) via the Pages config in this repo.

## Layout

```
.
├── index.html               # the main page
├── CNAME                    # custom domain (harsharya.com)
├── .nojekyll                # tell Pages not to run Jekyll
├── assets/
│   ├── portrait.jpg         # hero portrait
│   ├── about.jpg            # about-section photo
│   ├── work/                # project images (ninety-eight.jpg, intellewings.jpg, …)
│   └── life/                # personal images (golf-1.jpg, design-1.jpg, …)
└── writing/
    ├── index.html           # blog index   (auto-generated)
    ├── writing.css          # blog styles  (shared)
    ├── build.py             # markdown → HTML renderer
    ├── posts/               # markdown sources
    │   └── welcome.md
    └── <slug>.html          # rendered posts (auto-generated)
```

## Local preview

```bash
open index.html              # the home page
open writing/index.html      # the writing list
```

## Adding photos

Drop image files into `assets/`, `assets/work/`, or `assets/life/` using the filenames the HTML expects (search `index.html` for `assets/`). The placeholder boxes will be replaced by the real images automatically.

## Writing a new post

1. Create `writing/posts/<slug>.md` with frontmatter:

   ```markdown
   ---
   title: A short, declarative title
   date: 2026-06-12
   tag: Ops
   description: One-line summary that shows below the title.
   ---

   The post body. Standard Markdown.
   ```

2. Build:

   ```bash
   pip install markdown      # one-time
   python writing/build.py
   ```

   This regenerates `writing/<slug>.html` for every post and rewrites `writing/index.html` with all posts sorted by date.

3. Commit and push:

   ```bash
   git add .
   git commit -m "writing: <slug>"
   git push
   ```

GitHub Pages redeploys in ~30 seconds.

## Deploy

Hosted on GitHub Pages from the `main` branch root. Pushing to `main` deploys.

The custom domain `harsharya.com` is set via the `CNAME` file plus DNS records at the registrar (four GitHub Pages A records on the apex, `www` CNAME to `harsharya7021.github.io`).
