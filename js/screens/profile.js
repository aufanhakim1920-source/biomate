/* ============================================================
   Biomate — Profile

   Aufan's call: the sections of a person are a BOOKSHELF, reusing
   the CSS-3D spines from the shelf portfolio (and, before that,
   Peak & Pan's settings screen).

   It solves a real problem, not just a decorative one: six equal
   tabs read as a settings menu, whereas a shelf reads as things a
   person has accumulated — the right register for a social app.

   Each book is three faces off a spine div — spine, top pages,
   fore-edge — with a couple leaned via rotateZ so the row isn't
   robotic.
   ============================================================ */

import { DB } from "../db.js";
import { el, avatar, fmtDistance, fmtDuration } from "../ui.js";
import { icon } from "../icons.js";
import { setAudio, setTheme } from "../a11y.js";
import { get } from "../store.js";
import { go, back } from "../router.js";

const BOOKS = [
  { key: "photos",  title: "Photos",  hue: "var(--brand)",     h: 172, w: 40 },
  { key: "hikes",   title: "Hikes",   hue: "var(--brand-text)", h: 186, w: 34 },
  { key: "people",  title: "People",  hue: "var(--amber)",     h: 160, w: 46 },
  { key: "badges",  title: "Badges",  hue: "var(--forest)",    h: 178, w: 30 },
  { key: "settings",title: "Settings",hue: "#6B5B95",          h: 166, w: 38 },
];

export async function profile() {
  const meId = DB.uid();
  const [me, members, hikes, logs, profiles] = await Promise.all([
    DB.me(),
    DB.list("hike_members"),
    DB.list("hikes"),
    DB.list("trail_logs", { filter: { user_id: meId } }),
    DB.list("profiles"),
  ]);

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const myHikeIds = new Set(members.filter((m) => m.user_id === meId && m.status !== "left").map((m) => m.hike_id));

  /* "the number of unique people you hiked with" — straight out of
     co-membership, which is only computable because the event IS the
     group. This one line is why the data model is shaped that way. */
  const walkedWith = new Set(
    members
      .filter((m) => myHikeIds.has(m.hike_id) && m.user_id !== meId && m.status !== "left")
      .map((m) => m.user_id)
  );

  const totalM = logs.reduce((a, l) => a + (l.distance_m || 0), 0);
  const totalS = logs.reduce((a, l) => a + (l.duration_s || 0), 0);

  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: (me && me.display_name) || "You" }),
    ])
  );

  /* ---- headline stats ---- */
  wrap.append(
    el("div", { class: "statgrid" }, [
      stat(fmtDistance(totalM), "walked"),
      stat(String(walkedWith.size), walkedWith.size === 1 ? "person met" : "people met"),
      stat(String(logs.length), logs.length === 1 ? "trail logged" : "trails logged"),
      stat(fmtDuration(totalS), "on foot"),
    ])
  );

  /* the "+N more" cluster, borrowed from reference 24's dashboard and
     reskinned — there it counted teams, here it counts the people you
     have actually walked with */
  if (walkedWith.size) {
    wrap.append(
      el("div", { class: "block" }, [
        el("div", { class: "avstack" }, [
          ...[...walkedWith].slice(0, 4).map((u) => avatar((byId[u] || {}).avatar_url, (byId[u] || {}).display_name || "?")),
          walkedWith.size > 4 ? el("span", { class: "avstack__more", text: `+${walkedWith.size - 4} more` }) : null,
        ]),
      ])
    );
  }

  /* ---- the shelf ---- */
  wrap.append(el("h2", { class: "sectionhead", text: "Your shelf" }));

  const shelf = el("div", { class: "shelf", role: "list", "aria-label": "Profile sections" });
  BOOKS.forEach((b, i) => {
    const lean = i === 2 ? -4 : i === 4 ? 3 : 0;
    const book = el("button", {
      class: "book",
      type: "button",
      role: "listitem",
      style: `--bw:${b.w}px; --bh:${b.h}px; --hue:${b.hue}; --lean:${lean}deg`,
      "aria-label": `${b.title} section`,
      onclick: () => go(b.key === "settings" ? "settings" : `shelf/${b.key}`),
    }, [
      el("span", { class: "book__spine" }, [el("span", { class: "book__title", text: b.title })]),
      el("span", { class: "book__pages", "aria-hidden": "true" }),
      el("span", { class: "book__edge", "aria-hidden": "true" }),
    ]);
    shelf.append(book);
  });

  wrap.append(el("div", { class: "shelfwrap" }, [shelf, el("div", { class: "shelf__plank", "aria-hidden": "true" })]));

  /* ---- quick accessibility controls, always reachable ---- */
  const s = get();
  wrap.append(
    el("section", { class: "block" }, [
      el("h2", { class: "h2", text: "Accessibility" }),
      toggleRow("Audio description", s.audio, (on) => setAudio(on),
        "Reads each screen aloud. Off by default so a shared link never surprises anyone."),
      el("div", { class: "inline", style: "margin-top:10px" }, [
        themeBtn("Follow system", null, s.theme),
        themeBtn("Light", "light", s.theme),
        themeBtn("Dark", "dark", s.theme),
      ]),
    ])
  );

  return wrap;
}

function stat(value, label) {
  return el("div", { class: "stat" }, [
    el("span", { class: "stat__v", text: value }),
    el("span", { class: "stat__l", text: label }),
  ]);
}

function toggleRow(label, on, onChange, hint) {
  const btn = el("button", {
    class: "switch",
    type: "button",
    role: "switch",
    "aria-checked": on ? "true" : "false",
    onclick: (e) => {
      const next = e.currentTarget.getAttribute("aria-checked") !== "true";
      e.currentTarget.setAttribute("aria-checked", next ? "true" : "false");
      onChange(next);
    },
  }, [
    el("span", { class: "switch__label" }, [
      el("span", { text: label }),
      hint ? el("span", { class: "tiny", text: hint }) : null,
    ]),
    el("span", { class: "switch__track", "aria-hidden": "true" }, [el("span", { class: "switch__knob" })]),
  ]);
  return btn;
}

function themeBtn(label, value, current) {
  return el("button", {
    class: "chip",
    type: "button",
    "aria-pressed": current === value ? "true" : "false",
    text: label,
    onclick: (e) => {
      setTheme(value);
      [...e.currentTarget.parentElement.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
      e.currentTarget.setAttribute("aria-pressed", "true");
    },
  });
}
