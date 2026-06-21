# Working with Harsh — handoff for the next AI

A field guide for any Claude or AI agent picking up collaboration with **Harsh Kumar Arya** on harsharya.com or related Cowork sessions. Written by the AI at the end of the June 5, 2026 session that took the site from "Credentials mid-iteration" to "speakeasy door + Stack rebuild + repo reorganised and moved to iCloud."

This document is **not** the project handover — that's `HANDOVER.md` in the same folder, and it covers the codebase state. This document is about *how Harsh works*. Read both before doing anything.

---

## 1. Who he is, in one paragraph

Harsh Kumar Arya — Harshu to family. ISB '25, Georgia Tech research scholar (2019), founded Ninety-Eight Entertainment (talent + creative agency, 2020–23) and is relaunching it as 2.0. Born in Ratlam (~270K, on the Mumbai–Delhi line, on no one's map) — the Ratlam-origin story is load-bearing in how he frames himself. Reads voraciously (118+ books since 2021, R. K. Narayan dominates), watches deliberately (624 films, festival circuit, defends Forrest Gump and Tarantino without flinching), plays golf at 12-handicap, photographs on film. Operator-first, creative-second, but the creative drives the operator. Built the site himself with AI assistance — knows enough code to read what you produce.

Email: `harsharya7021@gmail.com`. Lives between Hyderabad (ISB), Bombay, and Ratlam.

---

## 2. Workstyle — what to notice

### He iterates by reaction, not by spec.

He almost never writes a detailed brief. He writes a vibe ("update the website with a lot of pictures, stories, articles…") or a short directive ("commit") and then reacts to what you produce. The iteration loop is:

> AI shows draft → Harsh reacts ("the font has shrunk", "the wink isn't firing", "this doesn't feel meticulous") → AI fixes → Harsh reacts again or moves on.

**Implication:** ship something visible fast. Don't over-design in chat before showing him a rendered version. He decides better against a real artifact than against text.

### He uses voice input often.

Look at his messages: run-on sentences, mid-thought "Hello?", missing punctuation, occasional homophones ("speak easy kinda thing"). He's frequently dictating from his phone while doing something else. Parse charitably and **don't ask him to clarify his own grammar** — re-state the intent back and confirm.

### He goes wide, then pulls himself back.

When an idea sparks he goes big — a *3D character walking through rooms of his life*. Then often, mid-pitch, he checks himself: *"there's too much complexity to be doing something so silly but it will be fine. You know?"* That hedge is the tell. He wants you to scope it down or stage it without killing the ambition. The right move is to acknowledge the ambition is on-brand, name the spectrum from simplest to biggest, and propose a *prototype-first* path. He picked "build one room first" in this session — that was the right call and he confirmed it.

### He parks, he doesn't kill.

In this session: the 3-question speakeasy CAPTCHA was built, then he redirected to "a closed door, no one passes." The 3D house was built (one-room prototype), then "park as a feature feature, build the stack first." Neither got deleted. Both live in the repo. The pattern is *keep the working artifacts, change the priority*.

**Implication:** when he says park, file it tidily under `_workshop/prototypes/` (or leave unlinked at the live path), don't delete. He'll come back.

### He'll often ask "what do we do now?" or "okay what next."

This is a *real* question. He genuinely wants you to propose 2–3 concrete next moves. Don't enumerate ten options. Don't ask him to specify. Read the project state, surface the highest-value moves, and let him pick. Surfacing options proactively is one of the highest-value behaviors here.

---

## 3. Decision-making — patterns

### He picks fast via AskUserQuestion.

He almost never deliberates. He picks in seconds. **Use AskUserQuestion liberally** when there's a real fork in the road, especially for aesthetic choices ("which house style?", "music in or out?"). Give 3–4 options. Mark your recommendation as `(Recommended)` in the first option — he often picks that one but feels good having seen the alternatives.

### He'll pivot inside the question UI.

He'll sometimes write a custom answer that reframes the question entirely. Example from this session: I asked which gate mechanic he wanted (riddle / multi-step / passphrase / Konami). His answer: *"what is konami-style hidden trigger? can we have a verify that you are a human friend of harshu as the captcha with some passphrase or riddle etc."* He'd seen an unfamiliar term, asked about it, AND simultaneously named a better framing ("verify you are a human friend of Harshu" as a CAPTCHA). The next AI move was to explain Konami briefly, then immediately embrace his framing — which became the actual product. **Listen for these pivots inside answers; they're often the best idea of the conversation.**

### He'll accept the recommended option.

In this session he picked "Sticky nav + back-to-top button" (my rec), "Isometric pixel house" (my rec), "Warhol-pop continuity" (one of the options I framed as defensible). He's not deferring; he just trusts a reasoned recommendation. **Make recommendations. Don't pretend to be neutral.**

### He course-corrects mid-stream without explanation.

The speakeasy went from "3-question CAPTCHA → library room → 4 shelves of personal content" to "closed door, nobody passes, no room" in one message. He doesn't apologise or explain the reversal. He just says where he wants to go now. **Match this — don't litigate the reversal, just execute the new direction.**

---

## 4. Taste — what to infer

This is the most useful section. Future builds should pass these tests.

### The Warhol-pop master frame is locked.

`body[data-mode="warhol"]` with Anton uppercase display, Bodoni Moda italic emphasis, hard 8px offset shadows, accent orange `#ff5a00`, cream bg `#fff8e7`, hot pink `#ff2d87`, cyan `#00b3ff`, yellow `#ffc700`. **Don't propose a new aesthetic for the public site.** He fought to land this and the front of the house is settled.

### But individual rooms can break the palette.

Speakeasy = cream paper, Bodoni italic, no Warhol. Projection Room inside the Stack = black, cream, hot-yellow accents. The pattern: **a different room of the magazine gets a different visual treatment, but the building is the same.** When you propose a new section, ask whether it should match the front-of-house Warhol or feel like its own room.

### Mediums have native physical forms.

This is the biggest taste signal in this session. He wanted the Stack to feel like physical objects — books as **shelf / bookshop / archive**, films as **70mm/35mm projected on a wide screen**, music as either **a vinyl crate** or **mood cassettes**. He thinks in mediums-as-objects. When a feature is about presenting content, the native form of that content is the right starting point. Avoid generic list/grid presentations unless the content type genuinely calls for it.

### Cinema vocabulary is real.

He named 70mm / 35mm specifically. He picks festival cinema (Wim Wenders, Bong Joon Ho, Damián Szifron). He'll happily defend Forrest Gump and Tarantino at dinner. The film section should feel like it was designed by someone who actually goes to the cinema, not someone who scraped Letterboxd.

### Easter eggs > navigation.

Discreet, in-aesthetic, no-signposting triggers are *his pattern*. Examples from this session:
- "few people" in the footer copy is a hidden link to `/speakeasy/`
- A missing book on the Currently Reading shelf is the other speakeasy entry
- The hero cinematic's "little numbers are clickable" footnote-style exhibits

When you build something secret, **don't put it in the nav and don't add a label.** The discovery is the feature.

### Editorial sensibility, not portfolio.

Eyebrows in mono caps. Section numbers as "Shelf I / II / III / IV" or "Movement 1 / Movement 2." Footnote-style exhibits. "Last refreshed · May 2026" timestamps. This is a magazine, not a CV. Resist any urge to add a "Skills" section or a "Resume" download.

### Cinematic devices over static state.

The hero cinematic is the marquee feature for a reason — he wanted theatre, not a hero block. He'll go for ambitious scroll-driven interactions if the payoff feels worth it. The 3D house was killed for scope, not for genre — he wanted that energy.

### Footnote/exhibit pattern is a signature.

The hero cinematic has on-demand "exhibits" — `sup` footnote numbers that open footnote cards which can replace the passport photo in-frame. This pattern recurs and he loves it. When introducing claims on the site, **use the exhibit/footnote pattern** rather than parenthetical asides.

### The R. K. Narayan tell.

Four of his eight 5★ books are R. K. Narayan. Three of those eight are "to hand to" gifts — he physically gives books to people. Combined with Ratlam being recurringly load-bearing in his bio, his taste leans toward *small-town quiet observation, unsentimental literary realism, voice-driven prose*. When generating content in his voice (e.g., the bookshop notes I drafted), aim for that register: specific, dry, slightly literary, no flourish for its own sake.

---

## 5. Voice — how to write *as* him (or *for* him)

When you draft content for the site:

- **First-person, lightly literary, operator-tinged.** Dry. Specific. Confident without flexing.
- **Use footnotes and asides as a device**, not as a tic. The exhibits in the hero work because they're substantive.
- **Avoid:** vulnerable-journal language ("armour", "facade", "showing up"), Forbes-flex ("scaled to $1M ARR" in body copy — fine in stats), SaaS-speak ("leverage", "synergy", "stakeholders"), generic-LinkedIn motivational tone.
- **Embrace:** parenthetical specificity ("Born in Ratlam — population ~270K, on the Mumbai–Delhi line, on no one's map"), real numbers when relevant ("12-handicap"), naming people ("Pratima Singh, Ishant Sharma, Prof. Prasanna Tantri"), self-aware wit (the "few people who'll actually read this far" footer).
- **Things he calls back to repeatedly:** Ratlam (origin), the 12-handicap (golf, "swing still inconsistent"), the Ishant Sharma signing + ISB admit-same-month (a personal mythic moment), film as a medium ("two books deep at any time — usually one history, one operator memoir").

When in doubt about whether a draft sounds like him: it probably doesn't. Flag your draft as a draft and ask. He'll rewrite or approve. **Do not pretend hallucinated content sounds like him.** He'd rather see a placeholder marked "[your line goes here]" than a fabricated quote.

---

## 6. Session arc — what got built (in order)

For situational awareness of the most recent build cycle:

1. **Hero cinematic** — scroll-driven theatrical hero on the homepage. Movement 1: passport intro → staggered story → wink → editor's note → on-demand exhibits. Movement 2: AS-NOT-FEATURED-IN clippings → Forbes 30 Under 30 placeholder rising into empty space. Mobile fallback collapses to a static stack at ≤820px. Iterated 6–7 times on pacing, headline size, photo-swap-during-exhibit behavior, the wink-during-tilt timing, the "not" italic yellow box.
2. **Credentials bleed ID-cards** — ISB and GT cards each bleed an absolutely-positioned ID card off the outer edge. Built a 4-option preview file (`_workshop/prototypes/credentials-options.html`) — he picked "Full Bleed Outside." Also built a scroll-locked reveal prototype (`_workshop/prototypes/credentials-scroll.html`) — parked. Production uses the static bleed.
3. **Galleries** — Kerala (umbrella + Varkala chapter + bespoke white lightbox modal), Jodhpur, Malaysia, Shimla. All use `object-fit: contain` (he insisted: don't crop). Web-optimised JPEGs in `assets/life/{series}/`.
4. **Mobile audit via iPhone Mirroring** — he mirrored his iPhone to his Mac and the AI drove Safari via the computer-use MCP to walk every page on real mobile. **Innovative move** — when classical mobile testing tools (Chrome MCP resize, iframe audit pages) failed, he proposed the iPhone Mirroring workaround. Always consider this approach when mobile testing is needed.
5. **Mobile fix pass** — 6 documented issues. Real bug worth remembering: desktop `.cred-isb .idcard-isb { top: 152px; left: -80px }` had higher specificity than mobile `.idcard { inset: auto }`, so desktop offsets leaked into mobile and broke layout. Fixed with explicit `top/left/right/bottom: auto` in the mobile rules. Cache-bust bumped from `?v=10` → `?v=11` across 12 pages.
6. **Speakeasy v1** (3-question CAPTCHA → library room with 4 shelves) — built, then abandoned at his request.
7. **House prototype** (isometric room with character) — built, then parked at his request. File lives at `speakeasy/house/reading-room.html`, unlinked.
8. **Speakeasy v2** (closed door, nobody passes) — current production state. One unanswerable question, four wrong options, witty "Not tonight" close.
9. **Stack rebuild** (`stack/index.html`) — shelf as colored book spines (currently reading + 4 placeholder "next up" + 1 missing-book hidden trigger linking to speakeasy) / bookshop as 8 face-out Warhol-color covers / projection room as black section with wide screen + 4 posters + ticket-stub strip + 2 list cards / archive as placeholder-only.
10. **Back-to-top pill + sticky nav** — verified existing sticky nav, added floating yellow Warhol pill that appears after 1.4 viewports scrolled.
11. **Repo reorganisation** — root cleaned, working docs moved into `_workshop/{notes,prototypes,drafts}/`, `.gitignore` updated, `README.md` rewritten, this file written. Then moved to iCloud Drive under `Creative-Projects/`.

---

## 7. Patterns that worked — repeat these

- **Asking 2 questions with AskUserQuestion before any nontrivial build.** Got him from vague-direction to clear-scope in one round-trip every time.
- **Building a small prototype first.** The 4-variant credentials preview, the one-room reading-room prototype, the scroll-locked credentials reveal — each let him react to a real artifact before committing.
- **Marking recommended options.** "(Recommended)" tags in AskUserQuestion got picked nearly every time.
- **Acknowledging the ambition is on-brand before scoping it down.** He responds to "this is the right kind of ambition, here's how we'd stage it" much better than to "this is too much, let's do something smaller."
- **Surfacing concrete next moves when he asks "what now."** Don't enumerate; pick 2–3 high-leverage things and propose them.
- **Iterating on the same artifact repeatedly without resetting.** The hero cinematic had ~7 iteration rounds; the speakeasy had a complete reframe; neither required starting over.
- **Drafting content in his voice and labeling it as a draft.** The speakeasy questions and the bookshop notes worked because the AI flagged them as guesses. He's fine with placeholder content; he hates fabricated content presented as real.
- **Committing in tight batches with descriptive messages.** He runs commits from his Mac terminal because the sandbox has a phantom `.git/index.lock` problem. Always give him the exact `cd / rm -f index.lock / git add / git commit / git push` line ready to paste.

---

## 8. Patterns that failed or wasted time — skip these

- **Trying to make Chrome MCP `resize_window` simulate mobile.** It doesn't actually shrink the viewport for scroll-driven JS; the audit was inconclusive. Solution: iPhone Mirroring.
- **Building iframe-based mobile audit pages.** Two attempts (`_workshop/prototypes/mobile-audit-failed.html`, `mobile-one-failed.html`) — the iframes never reached `document_idle` because the cinematic's scroll JS kept the page "busy." Don't retry.
- **Pretending to be neutral with options.** When the AI laid out tradeoffs without a recommendation, he sometimes picked at random; when the AI named a recommendation, the choice landed better.
- **Reading output-format SKILL.md files before content was researched.** Wasted context. Research the content first, then read the format skill.
- **Suggesting `brctl evict --no-evict` for iCloud.** That flag doesn't exist on modern macOS. The correct response is "skip it; for actively-used repos iCloud doesn't evict."
- **Trying to `mv` across the iCloud File Provider boundary.** Cross-filesystem `mv` of directories fails silently with misleading "No such file or directory." Use `cp -R` then `rm -rf` instead.
- **Apologising for past mistakes mid-task.** He doesn't engage with apologies. Acknowledge briefly, fix, move on.

---

## 9. Things to do in the first 5 minutes of a new session

1. **Read `_workshop/notes/HANDOVER.md`** — full project state, conventions, gotchas.
2. **Read this file.**
3. **Run `git log -5 --oneline`** in the repo to see what's actually been pushed since the handover was written. Don't assume the handover is fresh.
4. **Check the actual root state**: `ls -la <repo>` to confirm folder structure matches the handover's file map. He might have moved things since.
5. **Don't propose work before he asks.** Wait for him to direct the session, or ask "what do you want to tackle?" — pick the single most useful next step from the pending task list as a suggestion if he's silent.

---

## 10. The to-and-fro — the actual rhythm

In practice, a Cowork session with him looks like:

> **Harsh:** vague direction (one line, often voice-input)
> **AI:** clarify with AskUserQuestion (2–3 options, mark recommended), or proceed if it's clear
> **Harsh:** picks fast
> **AI:** builds visibly, ships a file, surfaces it via `present_files`
> **Harsh:** opens it on his actual device, comes back with specific reactions
> **AI:** iterates same file, sometimes 3–5 cycles
> **Harsh:** says commit or pivots to next thing
> **AI:** drafts the commit command, he runs it from his Mac terminal
> **AI:** updates task list, surfaces next move

That's a session. Build → react → iterate → commit. He doesn't want long status updates or work plans. He wants the next visible artifact.

Stack the work in roughly **30–60 minute features**: a hero cinematic refinement, a single gallery, a speakeasy door redesign. Bigger features (3D house, full library archive) get prototyped first and then scoped or parked.

---

## 11. Specific gotchas — file these mentally

- **Sandbox `.git/index.lock` is phantom.** Cowork's bash can't remove it. He runs all commits from his native Terminal.
- **Cache-bust is `styles.css?v=N`** — bump N across all 12 pages when CSS changes (writing, life, stack, welcome, kochi, consult, galleries, speakeasy, root). Currently `v=11`.
- **Multi-mode CSS still ships** (Warhol locked active, plus Issue / Margiela / Tabloid inert). Don't deliberately remove the inert modes without asking.
- **Mobile breakpoints to respect:** 820px (cinematic fallback) / 760px (most layout stack) / 720px (gallery viewer) / 560px (small-phone tightening).
- **The `_workshop/` folder is `.gitignore`d** — never gets pushed to GitHub. This is intentional. Don't try to track its files.
- **iCloud Drive path** (current home): `~/Library/Mobile Documents/com~apple~CloudDocs/Creative-Projects/harsharya.com`. The `~/Projects/harsharya.com/` path is dead.
- **He runs the local preview by double-clicking files**, not via a server, so `file://` paths matter. Don't introduce features that require a server.
- **Personal email** for git commits: `harsharya7021@gmail.com`. Always pass `-c user.email="..."` if a `git commit` is part of your output.

---

## 12. One last thing — he's running a brand, not a CV

Everything in this build leans toward **Harsh Kumar Arya as a creative-strategy operator who reads, makes things, and pays attention** — not toward Harsh as a job applicant. When in doubt about whether a feature/section/copy fits, ask: *does this make the site feel more like a magazine and less like a resume?* If yes, you're on track.

Good luck. He's an enjoyable collaborator who knows what he wants — but isn't always willing or able to articulate it in advance. Lean on artifacts, lean on options, ship visibly, trust that he'll react.

---

*Written: June 5, 2026. Update this document at the end of any session that meaningfully changes how he works or what he wants. Don't archive — overwrite. The latest version is the truth.*
