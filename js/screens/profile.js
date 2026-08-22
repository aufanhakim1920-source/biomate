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
import * as Auth from "../auth.js";
import { el, avatar, fmtDistance, fmtDuration } from "../ui.js";
import { icon } from "../icons.js";
import { setAudio, setTheme } from "../a11y.js";
import { get } from "../store.js";
import { go, back } from "../router.js";
import { levelFor, breakdown, TERRAIN_XP, LEVELS } from "../levels.js";
import { catalogue, showcase, TIERS } from "../badges.js";

const LEVEL_NEXT_NAME = (lv) => (LEVELS[lv.level] || {}).name || "the next level";

/* ⚠️ Fixed hexes, not theme tokens.
   The spines carry white labels, and three of these used to be tokens
   that LIFT in dark mode — amber especially, where white measured
   1.82:1 against a 4.5 bar. A shelf of books is a physical object; its
   covers have no reason to invert with the theme, and pinning them
   removes the whole class of problem rather than patching one case.
   Every colour here carries white at 12px/700:
     #C14E27 4.79 · #A32E2E 7.03 · #8A6212 5.47 · #2E6B2E 6.44 · #6B5B95 5.91 */
const BOOKS = [
  { key: "photos",  title: "Photos",  hue: "#C14E27", h: 172, w: 40 },
  { key: "hikes",   title: "Hikes",   hue: "#A32E2E", h: 186, w: 34 },
  { key: "people",  title: "People",  hue: "#8A6212", h: 160, w: 46 },
  { key: "badges",  title: "Badges",  hue: "#2E6B2E", h: 178, w: 30 },
  { key: "settings",title: "Settings",hue: "#6B5B95", h: 166, w: 38 },
];

export async function profile() {
  const meId = DB.uid();
  const [me, members, hikes, logs, profiles, stats, msgs] = await Promise.all([
    DB.me(),
    DB.list("hike_members"),
    DB.list("hikes"),
    DB.list("trail_logs", { filter: { user_id: meId } }),
    DB.list("profiles"),
    DB.list("player_stats", { filter: { id: meId }, limit: 1 }),
    DB.list("messages", { filter: { user_id: meId } }),
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

  /* the database's number is the score; the client only explains it */
  const xp = (stats[0] && stats[0].xp) || 0;
  const lv = levelFor(xp);
  const myMemberRows = members.filter((m) => m.user_id === meId && m.status !== "left");
  const hosted = hikes.filter((h) => h.host_id === meId).length;
  const terrain = myMemberRows.reduce((a, m) => {
    const h = hikes.find((x) => x.id === m.hike_id);
    return a + (h ? (TERRAIN_XP[h.difficulty] || 0) : 0);
  }, 0);
  const rows = breakdown({
    joined: myMemberRows.length, hosted, terrain,
    messages: msgs.length, metres: totalM,
  });

  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "flex:1;font-size:1.5rem", text: (me && me.display_name) || "You" }),
      el("button", { class: "btn btn--ghost", style: "padding:8px 16px;font-size:var(--t-sm)", type: "button", text: "Edit", onclick: () => go("settings") }),
    ])
  );

  /* ---- your own profile card, so it reads like a person's page ---- */
  wrap.append(
    el("section", { class: "personhead" }, [
      avatar(me && me.avatar_url, (me && me.display_name) || "You", "avatar avatar--xl"),
      el("div", { class: "personhead__body" }, [
        el("span", { class: "personhead__name", text: (me && me.display_name) || "You" }),
        me && me.pronouns ? el("span", { class: "tiny", text: me.pronouns }) : null,
        me && me.home_area ? el("span", { class: "tiny", text: me.home_area }) : null,
        me && me.bio ? el("span", { class: "meta", style: "margin-top:6px", text: me.bio }) : null,
      ]),
    ])
  );

  /* ---- the three badges you chose to show off ---- */
  const facts = {
    joined: myHikeIds.size,
    hosted,
    logs: logs.length,
    metres: totalM,
    messages: msgs.length,
    states: new Set([...myHikeIds].map((id) => (hikes.find((h) => h.id === id) || {}).region).filter(Boolean)).size,
    hardDone: [...myHikeIds].filter((id) => (hikes.find((h) => h.id === id) || {}).difficulty === "hard").length,
    streak: (stats[0] && stats[0].streak) || 0,
    people: walkedWith.size,
  };
  const shown = showcase(catalogue(facts), (me && me.badges) || []);
  if (shown.length) {
    wrap.append(
      el("div", { class: "showcase" },
        shown.map((b) => el("span", { class: "showcase__b", "data-tier": b.tier,
          "aria-label": `${b.name}, ${TIERS[b.tier].label} badge` }, [
          el("span", { html: icon(b.icon, { size: 14 }), "aria-hidden": "true" }),
          el("span", { text: b.name }),
        ]))
      )
    );
  }

  /* ---- level ---- */
  wrap.append(
    el("section", { class: "levelcard" }, [
      el("div", { class: "levelcard__top" }, [
        el("span", { class: "levelcard__num", "aria-hidden": "true", text: String(lv.level) }),
        el("span", {}, [
          el("span", { class: "levelcard__name", text: lv.name }),
          el("span", { class: "levelcard__blurb", text: lv.blurb }),
        ]),
        el("span", { class: "levelcard__xp", text: `${xp} XP` }),
      ]),
      el("div", {
        class: "xpbar",
        role: "progressbar",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(lv.pct),
        "aria-label": lv.next
          ? `Level ${lv.level}, ${lv.name}. ${xp} XP. ${lv.next - xp} XP to the next level.`
          : `Level ${lv.level}, ${lv.name}. Highest level reached.`,
      }, [el("span", { class: "xpbar__fill", style: `width:${lv.pct}%` })]),
      el("p", { class: "tiny", style: "margin-top:8px",
        text: lv.next ? `${lv.next - xp} XP to ${LEVEL_NEXT_NAME(lv)}` : "Top level — nothing left to climb." }),
    ])
  );

  if (rows.length) {
    wrap.append(
      el("details", { class: "xpwhy" }, [
        el("summary", { text: "Where these points came from" }),
        el("ul", {}, rows.map((r) =>
          el("li", {}, [
            el("span", {}, [
              el("span", { class: "row__title", text: r.label }),
              el("span", { class: "row__sub", text: r.detail }),
            ]),
            el("b", { text: `+${r.xp}` }),
          ])
        )),
      ])
    );
  }

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

  /* ---- guest prompt ----
     Shown here rather than as a modal on first run: guest mode is the
     front door and interrupting it would defeat the point. It appears
     once there is something worth keeping, which is also the first
     moment the offer means anything. */
  if (DB.isLive) {
    const acct = Auth.account();
    if (!acct.signedIn) {
      wrap.append(
        el("button", { class: "guestbar", type: "button", onclick: () => go("account") }, [
          el("span", { class: "guestbar__ic", html: icon(acct.awaitingConfirmation ? "alert" : "people", { size: 18 }), "aria-hidden": "true" }),
          el("span", { class: "guestbar__body" }, [
            el("span", { class: "guestbar__t", text: acct.awaitingConfirmation ? "Confirm your email to finish" : "You're browsing as a guest" }),
            el("span", { class: "guestbar__s", text: acct.awaitingConfirmation
              ? `Sent to ${acct.email}. Until then this stays a guest profile.`
              : "This profile lives in this browser only. Create an account to keep it." }),
          ]),
          el("span", { class: "guestbar__go", html: icon("arrow", { size: 18 }), "aria-hidden": "true" }),
        ])
      );
    }
  }

  /* ---- start a walk ----
     The recorder existed with no way in: `#/trail` was reachable only
     by typing it. A feature with no door is a feature nobody has. It
     sits here, under the numbers it feeds, because "walked / trails
     logged / on foot" is exactly the moment you understand what
     pressing it does. */
  wrap.append(
    el("div", { class: "block" }, [
      el("button", {
        class: "btn btn--primary btn--block",
        type: "button",
        html: `${icon("route", { size: 18 })}<span>Record a walk</span>`,
        onclick: () => go("trail"),
      }),
      el("p", { class: "tiny", style: "padding:8px 2px 0", text: "Follows your phone's GPS and draws the route as you go. Open it from a hike instead and the walk is saved against that group." }),
    ])
  );

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
