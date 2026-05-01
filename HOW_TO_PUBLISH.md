# How to edit and publish your site

You have one file: `index.html`. That's the whole site. Open it in any editor (TextEdit, VS Code, even the browser source view) and you can ship it.

## 1. Fill in the placeholders

Search for `[` in the file — every spot you need to edit is wrapped in square brackets.

What to swap, in order of importance:
- `[Your Name]` (appears in the title bar, the H1, and the footer)
- The lead sentence under the H1
- About paragraphs
- The four skills rows (Languages / Tools / Areas / Other) — keep, edit, or drop rows as you like
- Each project block (title, status, why, what, links)
- The achievements list (year + one-line description)
- The contact line and the GitHub / LinkedIn / X URLs

The email link is already wired to `harsharya7021@gmail.com`. Change it if you'd rather use a different address.

## 2. Test it locally

Just double-click `index.html`. It opens in your browser. No server needed.

## 3. Publish it

Three good options, ordered by ease:

**Netlify Drop** — go to https://app.netlify.com/drop, drag the file in, done. You get a free URL like `cool-name-123.netlify.app` instantly, and you can wire a custom domain later. No account technically required to test, but make one to keep the site.

**GitHub Pages** — make a public repo, upload `index.html` to it, then in the repo's **Settings → Pages** set the source to your `main` branch. Your site lives at `https://<your-username>.github.io/<repo-name>`. If you name the repo `<your-username>.github.io`, it lives at the cleaner `https://<your-username>.github.io`.

**Vercel** — `vercel deploy` from the folder if you have the CLI, or connect a GitHub repo from their dashboard. Same idea as Netlify; either works.

## 4. Custom domain (optional)

All three hosts let you point a domain at your site. Buy one from Namecheap, Cloudflare, or Porkbun, then follow the host's "custom domain" docs — usually a CNAME or A record.

## A few small upgrades you might want later

- Add a favicon (a 32x32 PNG named `favicon.png` next to `index.html`, plus `<link rel="icon" href="favicon.png">` in the `<head>`).
- Drop in a real photo by adding an `<img>` near the H1.
- Swap the system font stack for a Google Font by adding one `<link>` to the head and one `font-family` line to the body.
- Add Plausible or Simple Analytics if you want to see who's visiting.

That's it. The whole point is to start small and ship — you can always make it nicer once it's live.
