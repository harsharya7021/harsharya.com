/* ===========================================================
   gate.js — newsletter capture + soft content gate.

   · Passwordless email-link sign-in (Firebase Auth).
   · Every sign-in is saved to Firestore `subscribers` → your list.
   · Soft gate: a container marked [data-gate] shows a preview,
     then a "read the rest — sign in with your email" card. Once
     signed in (persisted), the whole thing unlocks forever on
     that device.

   SAFE BY DEFAULT: until you paste your Firebase web config below,
   this runs in PREVIEW mode — nothing is hidden, and the signup
   card shows a gentle "opening soon" note. So the site never
   breaks while you're setting Firebase up. See _os/newsletter/SETUP.md.

   The Firebase web config is NOT a secret (it only identifies the
   project; Firestore rules do the protecting), so it's fine to
   paste it here and commit it.
   =========================================================== */

/* ─────────────  1 · PASTE YOUR FIREBASE CONFIG  ───────────── */
const CONFIG = {
  apiKey:            "PASTE_API_KEY",
  authDomain:        "PASTE_PROJECT.firebaseapp.com",
  projectId:         "PASTE_PROJECT_ID",
  appId:             "PASTE_APP_ID"
};
/* ─────────────────────────────────────────────────────────── */

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";
const READY = !Object.values(CONFIG).some(v => /^PASTE_/.test(v));
const LSKEY = "hka.gate.email";

/* ---------- styles (brand-matched, injected once) ---------- */
(function styles(){
  const css = `
  .nlcard{border:2px solid var(--text,#1a1a1a); background:var(--accent-3,#ffc700); padding:22px 22px 20px; margin:40px 0; max-width:640px; box-shadow:6px 6px 0 var(--text,#1a1a1a);}
  .nlcard h3{font-family:var(--font-display,"Anton",sans-serif); text-transform:uppercase; font-size:clamp(24px,4vw,34px); line-height:1; letter-spacing:.01em; margin:0 0 8px;}
  .nlcard p{font-size:14px; line-height:1.55; color:#2a2620; margin:0 0 14px; max-width:52ch;}
  .nlform{display:flex; gap:8px; flex-wrap:wrap;}
  .nlform input[type=email]{flex:1; min-width:200px; font-family:var(--font-body,Inter,sans-serif); font-size:15px; padding:11px 12px; border:2px solid var(--text,#1a1a1a); background:#fff; color:#1a1a1a; outline:none;}
  .nlform input[type=email]:focus{box-shadow:3px 3px 0 rgba(26,26,26,.35);}
  .nlbtn{font-family:var(--font-mono,"Space Mono",monospace); font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; border:2px solid var(--text,#1a1a1a); background:var(--text,#1a1a1a); color:var(--bg,#fff8e7); padding:11px 18px; cursor:pointer; transition:background .15s,color .15s;}
  .nlbtn:hover{background:var(--accent,#ff5a00); color:var(--text,#1a1a1a);}
  .nlbtn:disabled{opacity:.5; cursor:default;}
  .nlnote{font-family:var(--font-mono,"Space Mono",monospace); font-size:11px; letter-spacing:.04em; margin-top:12px; min-height:15px; color:#2a2620;}
  .nlnote.ok{color:#0a7d3c;} .nlnote.err{color:#b30000;}
  .nlcard.is-in{background:var(--bg,#fff8e7);}
  .nlcard.is-in h3{color:var(--text,#1a1a1a);}
  .nl-mini{font-family:var(--font-mono,"Space Mono",monospace); font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted,#6b6358); margin-top:6px; display:inline-block; background:none; border:0; cursor:pointer; text-decoration:underline;}

  /* sign-in modal (perks, e.g. save-a-frame) */
  .nlmodal{position:fixed; inset:0; z-index:700; display:flex; align-items:center; justify-content:center; padding:22px;
    background:rgba(26,26,26,.45); backdrop-filter:blur(3px); opacity:0; transition:opacity .25s ease;}
  .nlmodal.on{opacity:1;}
  .nlmodal-box{position:relative; max-width:560px; width:100%;}
  .nlmodal-box .nlcard{margin:0;}
  .nlmodal-x{position:absolute; top:-14px; right:-14px; z-index:2; width:34px; height:34px; border:2px solid var(--text,#1a1a1a);
    background:var(--bg,#fff8e7); color:var(--text,#1a1a1a); font-family:var(--font-mono,"Space Mono",monospace); font-size:14px;
    cursor:pointer; line-height:1;}
  .nlmodal-x:hover{background:var(--text,#1a1a1a); color:var(--bg,#fff8e7);}

  /* soft gate */
  [data-gate]{position:relative;}
  [data-gate].gate-locked > .gate-hidden{display:none !important;}
  .gate-veil{position:relative; margin-top:8px;}
  .gate-veil::before{content:""; position:absolute; left:0; right:0; top:-120px; height:120px; pointer-events:none;
    background:linear-gradient(180deg, transparent, var(--bg,#fff8e7));}
  @media (prefers-reduced-motion:no-preference){ .nlcard{transition:background .3s;} }
  `;
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();

/* ---------- tiny helpers ---------- */
const esc = s => (s||"").replace(/[<>&"]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]));
const validEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/* ---------- Firebase (loaded only when configured) ---------- */
let fb = null;
async function initFirebase(){
  if (!READY || fb) return fb;
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`)
  ]);
  const app = initializeApp(CONFIG);
  const a = auth.getAuth(app);
  await auth.setPersistence(a, auth.browserLocalPersistence).catch(()=>{});
  fb = { app, auth, fs, a, db: fs.getFirestore(app) };
  return fb;
}

async function sendLink(email){
  const f = await initFirebase();
  const actionCodeSettings = { url: window.location.href, handleCodeInApp: true };
  await f.auth.sendSignInLinkToEmail(f.a, email, actionCodeSettings);
  try { localStorage.setItem(LSKEY, email); } catch(e){}
}

async function saveSubscriber(user){
  try {
    const f = await initFirebase();
    await f.fs.setDoc(
      f.fs.doc(f.db, "subscribers", user.uid),
      { email: user.email, createdAt: f.fs.serverTimestamp(), source: location.pathname },
      { merge: true }
    );
  } catch(e){ /* non-fatal — they're still signed in */ }
}

/* complete the magic-link round-trip if we arrived via the email link */
async function completeMagicLink(){
  if (!READY) return null;
  const f = await initFirebase();
  if (!f.auth.isSignInWithEmailLink(f.a, window.location.href)) return null;
  let email = null; try { email = localStorage.getItem(LSKEY); } catch(e){}
  if (!email) email = window.prompt("Confirm the email you signed up with:") || "";
  if (!email) return null;
  const cred = await f.auth.signInWithEmailLink(f.a, email, window.location.href);
  try { localStorage.removeItem(LSKEY); } catch(e){}
  await saveSubscriber(cred.user);
  /* strip the magic-link params from the URL */
  history.replaceState({}, document.title, location.pathname + location.hash);
  return cred.user;
}

/* ---------- UI: signup card ---------- */
function signupCard(host, opts){
  opts = opts || {};
  const title = host.getAttribute("data-title") || opts.title || "From the Harshu's Mouth";
  const blurb = host.getAttribute("data-blurb") || opts.blurb ||
    "New notes and photo series, straight to your inbox. One email, no spam, unsubscribe anytime.";
  host.innerHTML =
    `<div class="nlcard">
       <h3>${esc(title)}</h3>
       <p>${esc(blurb)}</p>
       <form class="nlform" novalidate>
         <input type="email" placeholder="you@email.com" autocomplete="email" aria-label="Email address" required />
         <button class="nlbtn" type="submit">${READY ? "Sign me up" : "Notify me"}</button>
       </form>
       <div class="nlnote">${READY ? "" : "The newsletter is opening soon — configure Firebase to go live."}</div>
     </div>`;
  const form = host.querySelector("form"), input = host.querySelector("input"),
        btn = host.querySelector("button"), note = host.querySelector(".nlnote");
  form.addEventListener("submit", async function(e){
    e.preventDefault();
    const email = input.value.trim();
    if (!validEmail(email)){ note.className="nlnote err"; note.textContent="That email doesn't look right."; return; }
    if (!READY){ note.className="nlnote"; note.textContent="Saved for when we launch — thanks!"; input.value=""; return; }
    btn.disabled = true; note.className="nlnote"; note.textContent="Sending your magic link…";
    try {
      await sendLink(email);
      note.className="nlnote ok";
      note.textContent="Check your inbox — tap the link to confirm. You can close this tab.";
      form.style.display="none";
    } catch(err){
      btn.disabled=false; note.className="nlnote err";
      note.textContent = friendly(err);
    }
  });
  return { setSignedIn };
  function setSignedIn(user){
    host.querySelector(".nlcard").classList.add("is-in");
    host.querySelector("h3").textContent = "You're on the list ✓";
    host.querySelector("p").textContent = `Signed in as ${user.email}. New pieces unlock automatically.`;
    if (form) form.style.display="none";
    note.className="nlnote ok"; note.innerHTML = `<button class="nl-mini" data-signout>sign out</button>`;
    const so = host.querySelector("[data-signout]");
    if (so) so.addEventListener("click", async ()=>{ const f=await initFirebase(); await f.auth.signOut(f.a); location.reload(); });
  }
}

/* ---------- UI: soft gate ---------- */
function applyGate(container, signedIn){
  const preview = parseInt(container.getAttribute("data-gate-preview") || "3", 10);
  const kids = Array.prototype.filter.call(container.children, k => !k.hasAttribute("data-gate-keep"));
  if (signedIn){
    container.classList.remove("gate-locked");
    kids.forEach(k => k.classList.remove("gate-hidden"));
    const veil = container.querySelector(":scope > .gate-veil"); if (veil) veil.remove();
    return;
  }
  container.classList.add("gate-locked");
  kids.forEach((k,i)=> k.classList.toggle("gate-hidden", i >= preview));
  if (!container.querySelector(":scope > .gate-veil")){
    const veil = document.createElement("div");
    veil.className = "gate-veil";
    const mount = document.createElement("div");
    veil.appendChild(mount);
    container.appendChild(veil);
    signupCard(mount, {
      title: "Read the rest — it's free",
      blurb: "This one's for subscribers. Drop your email, tap the magic link, and the full piece (plus every photo series) opens up."
    });
  }
}

/* ---------- friendly errors ---------- */
function friendly(err){
  const m = String(err && err.code || err || "");
  if (m.includes("unauthorized-domain")) return "This domain isn't authorized in Firebase yet (see setup).";
  if (m.includes("invalid-email")) return "That email doesn't look right.";
  if (m.includes("quota")) return "Too many requests just now — try again in a minute.";
  return "Couldn't send the link — try again in a moment.";
}

/* ---------- public API (used by the gallery save-frame perk) ----------
   window.HKAGate — safe for classic scripts to poke at click-time:
     .configured   → Firebase keys pasted? (false = preview mode: perks stay open)
     .signedIn()   → is a subscriber signed in on this device?
     .onChange(cb) → cb(user|null) now-ish and on every auth change
     .prompt(opts) → open the email magic-link card in a modal              */
let _user = null;
const _subs = [];
function _emit(){ _subs.forEach(cb => { try{ cb(_user); }catch(e){} }); }

let _modal = null;
function openModal(opts){
  closeModal();
  const wrap = document.createElement("div");
  wrap.className = "nlmodal";
  wrap.innerHTML = `<div class="nlmodal-box"><button class="nlmodal-x" aria-label="Close">✕</button><div></div></div>`;
  document.body.appendChild(wrap);
  const card = signupCard(wrap.querySelector(".nlmodal-box > div"), opts || {});
  if (_user) card.setSignedIn(_user);
  requestAnimationFrame(()=> wrap.classList.add("on"));
  const close = ()=> closeModal();
  wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
  wrap.querySelector(".nlmodal-x").addEventListener("click", close);
  document.addEventListener("keydown", function esc(e){ if (e.key==="Escape"){ close(); document.removeEventListener("keydown", esc); } });
  _modal = { wrap, card };
}
function closeModal(){ if (_modal){ _modal.wrap.classList.remove("on"); const w=_modal.wrap; setTimeout(()=>w.remove(), 250); _modal = null; } }

window.HKAGate = {
  configured: READY,
  signedIn: () => !!_user,
  user: () => _user,
  onChange(cb){ _subs.push(cb); cb(_user); },
  prompt(opts){ openModal(opts); }
};

/* ---------- boot ---------- */
(async function boot(){
  const signups = Array.prototype.slice.call(document.querySelectorAll("[data-newsletter], #newsletter"));
  const gates   = Array.prototype.slice.call(document.querySelectorAll("[data-gate]"));
  const cards = signups.map(h => signupCard(h));

  /* preview mode (no config): reveal everything, keep the signup CTA */
  if (!READY){ gates.forEach(g => applyGate(g, true)); return; }

  /* finish a magic-link sign-in if we came back via the email */
  let arrived = null;
  try { arrived = await completeMagicLink(); } catch(e){ /* ignore */ }

  const f = await initFirebase();
  f.auth.onAuthStateChanged(f.a, function(user){
    const signedIn = !!user;
    _user = user || null; _emit();
    gates.forEach(g => applyGate(g, signedIn));
    if (signedIn){
      cards.forEach(c => c.setSignedIn(user));
      if (_modal) _modal.card.setSignedIn(user);
      saveSubscriber(user);
    }
  });
})();
