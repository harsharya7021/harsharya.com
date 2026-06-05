# harsharya.com

Personal site of **Harsh Kumar Arya** — ISB '25, Georgia Tech research scholar, founder of Ninety-Eight Entertainment.

Static HTML, hosted on GitHub Pages, served from the custom domain **harsharya.com** via the `CNAME` file in this folder.

---

## Folder layout

The folder is split into two halves. The **top half** is the deployed site — every folder name here maps directly to a URL on the live site, so don't rename them without breaking links. The **bottom half** (prefixed with `_`) is working material that stays on your machine and never ships.

### Deployed site (touch with care)

```
index.html              # the home page (harsharya.com)
styles.css              # shared stylesheet for every page
CNAME                   # custom domain anchor
.nojekyll               # GitHub Pages: skip Jekyll

assets/                 # all the images, fonts and credentials art
  ├── about.jpg, portrait.jpg
  ├── creative/         # Kochi photo series
  ├── life/             # off-the-clock grid + gallery series
  │   ├── kerala/       # Varkala chapter
  │   ├── jodhpur/      # Rajasthan series
  │   ├── malaysia/     # Southeast Asia series
  │   └── shimla/       # Himachal series
  ├── press/            # Outlook / The Week / Mid-day clippings
  └── credentials/      # ISB and Georgia Tech marks

consult/index.html      # → harsharya.com/consult — paid consult booking
gallery/                # → harsharya.com/gallery
  ├── index.html        #   the series list
  ├── kerala.html       #   umbrella + lightbox modal
  ├── jodhpur.html
  ├── malaysia.html
  ├── shimla.html
  └── kochi.html
life/index.html         # → harsharya.com/life
notes (writing/)        # → harsharya.com/writing
stack/index.html        # → harsharya.com/stack — books + films, physical-object treatment
speakeasy/index.html    # → harsharya.com/speakeasy — the closed door
```

### Workshop (local-only — `.gitignore`d)

```
_workshop/              # everything that helps build the site but isn't part of it
  ├── README.md         # tour of the workshop
  ├── notes/            # HANDOVER, profile, publishing playbook
  ├── prototypes/       # standalone HTMLs used to design before baking
  └── drafts/           # markdown drafts (speakeasy questions, work-about copy)

_archive/               # superseded files, kept for reference
_deck-media/            # exported media for talks/decks — not the live site
```

---

## Working with the site

### Local preview

```bash
open index.html              # the home page
open speakeasy/index.html    # the closed door
open stack/index.html        # the rebuilt Stack
open gallery/kerala.html     # umbrella gallery + lightbox
```

### Adding photos

Drop image files into the relevant `assets/` subfolder (`assets/life/<series>/`, `assets/press/`, etc.) using the filenames the HTML expects. Run `sips -Z 1800 -s format jpeg -s formatOptions 78 *.png` to web-optimise before committing.

### Writing a new post

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

3. Commit and push.

### Cache-busting

Every page's `<link rel="stylesheet" href="styles.css?v=N">` carries a version number. When you change `styles.css`, bump `v` on every page that links it (grep for `styles.css?v=` to find them all). Currently at **v=11**.

---

## Deploy

Hosted on GitHub Pages from the `main` branch root. Pushing to `main` redeploys in ~30 seconds.

```bash
git add .
git commit -m "<what changed>"
git push
```

The custom domain is set via `CNAME` here + DNS at the registrar (four GitHub Pages A records on the apex, `www` CNAME to `harsharya7021.github.io`).

---

## Where to find more

- **The full state of the site, every convention, every gotcha:** `_workshop/notes/HANDOVER.md`
- **Personal profile / voice notes:** `_workshop/notes/Harsh-Kumar-Arya-Profile.md`
- **Publishing playbook:** `_workshop/notes/HOW_TO_PUBLISH.md`
- **Speakeasy lore + draft questions:** `_workshop/drafts/speakeasy-questions.md`

If you're a future Cowork session opening this folder — start with `_workshop/notes/HANDOVER.md`. It catches you up on everything.
