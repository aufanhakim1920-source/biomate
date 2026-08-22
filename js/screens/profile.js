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
import { el, avatar, toast, fmtDistance, fmtDuration } from "../ui.js";
import { icon } from "../icons.js";
import { say, setAudio, setTheme } from "../a11y.js";
import { get } from "../store.js";
import { setSound } from "../sound.js";
import { go, back } from "../router.js";
import { refreshAppbar } from "../appbar.js";
import { prepare } from "../photo.js";
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
      /* Aufan: "consolidate profile details into 1 page". Editing used
         to be a separate screen, so seeing your profile and changing it
         were two places. Now it is one page and this jumps down to the
         part that edits — same page, moved focus, so a keyboard user
         lands on the first field rather than being scrolled past it. */
      el("button", {
        class: "btn btn--ghost", style: "padding:8px 16px;font-size:var(--t-sm)",
        type: "button", text: "Edit",
        onclick: () => {
          const t = document.getElementById("your-details");
          if (!t) return;
          t.scrollIntoView({ block: "start", behavior: "smooth" });
          const first = t.querySelector("input, select, button");
          if (first) first.focus({ preventScroll: true });
        },
      }),
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
      onclick: () => {
        if (b.key !== "settings") return go(`shelf/${b.key}`);
        /* the Settings spine used to open a second page holding the
           same things this one now holds */
        const t = document.getElementById("your-details");
        if (t) t.scrollIntoView({ block: "start", behavior: "smooth" });
      },
    }, [
      el("span", { class: "book__spine" }, [el("span", { class: "book__title", text: b.title })]),
      el("span", { class: "book__pages", "aria-hidden": "true" }),
      el("span", { class: "book__edge", "aria-hidden": "true" }),
    ]);
    shelf.append(book);
  });

  wrap.append(el("div", { class: "shelfwrap" }, [shelf, el("div", { class: "shelf__plank", "aria-hidden": "true" })]));

  /* ---- your details, on the same page as the profile they change ---- */
  wrap.append(detailsSection(me, meId));

  /* ---- quick accessibility controls, always reachable ---- */
  const s = get();

  /* Sound effects sit directly under audio description because they are
     the same decision made twice, and someone who has just thought
     about one is the person best placed to answer the other. Both
     default to OFF for the identical reason, and the copy says so out
     loud rather than making anyone guess.

     ⚠️ setSound() must run INSIDE the click handler. That gesture is
     what unlocks audio playback for the session — move it behind an
     await or a timeout and the browser swallows every cue until the
     visitor happens to click something else, which reads as "the
     toggle is broken". toggleRow calls onChange synchronously, which
     is what makes this safe. */
  const soundNote = el("p", { class: "tiny", style: "margin-top:8px" });

  wrap.append(
    el("section", { class: "block" }, [
      el("h2", { class: "h2", text: "Accessibility" }),
      toggleRow("Audio description", s.audio, (on) => setAudio(on),
        "Reads each screen aloud. Off by default so a shared link never surprises anyone."),
      toggleRow("Sound effects", s.sound, (on) => {
        soundNote.textContent = "";
        say(on ? "Sound effects on." : "Sound effects off.");
        setSound(on).then((installed) => {
          /* Honest about a real possibility: this repo ships the sound
             SYSTEM, and the MP3s are dropped in separately (see
             assets/sfx/README.md). A switch that turns on and then does
             nothing, with no explanation, is a bug report waiting to
             happen — so it says so itself. */
          if (on && installed === 0) {
            soundNote.textContent = "No sound files are installed yet — see assets/sfx/README.md. Everything else works; there is just nothing to play.";
          }
        });
      }, "A short sound when you join a walk, earn a badge or level up. Off by default, for the same reason."),
      soundNote,
      el("div", { class: "inline", style: "margin-top:10px" }, [
        themeBtn("Follow system", null, s.theme),
        themeBtn("Light", "light", s.theme),
        themeBtn("Dark", "dark", s.theme),
      ]),
    ])
  );

  /* ---- account, at the very bottom ----
     Aufan: "put sign out and change my password at the bottom of the
     existing profile page". Last, because it is the section you visit
     least and the one you least want to hit by accident. */
  if (DB.isLive) wrap.append(accountSection());

  /* ---- start over ---- */
  wrap.append(
    el("section", { class: "block" }, [
      el("h2", { class: "h2", text: "Start over" }),
      el("p", { class: "meta", text: "Clears everything stored on this device. Your account and anything you posted stay on the server." }),
      el("button", {
        class: "btn btn--ghost", style: "margin-top:10px", type: "button", text: "Reset this device",
        onclick: () => {
          if (!confirm("Clear all Biomate data on this device? This cannot be undone.")) return;
          /* sweep by prefix — a hand-kept list of keys had already
             drifted once and left an unfinished walk behind */
          const wipe = (store) => {
            const doomed = [];
            for (let i = 0; i < store.length; i++) {
              const k = store.key(i);
              if (k && k.startsWith("biomate/")) doomed.push(k);
            }
            doomed.forEach((k) => store.removeItem(k));
          };
          wipe(localStorage);
          wipe(sessionStorage);
          location.hash = "#/welcome/1";
          location.reload();
        },
      }),
    ])
  );

  return wrap;
}

/* ------------------------------------------------------------
   The editable half of the profile. Same fields as the old settings
   screen, in the same order they appear on the card above, so the
   form reads as *the thing you are editing* rather than a list of
   unrelated inputs.
   ------------------------------------------------------------ */
const PRONOUNS = ["she/her", "he/him", "they/them", "prefer not to say"];
const EXPERIENCE = [
  ["beginner", "New to this", "A few easy walks, still working out what I like"],
  ["intermediate", "Comfortable", "Happy with a long day and some elevation"],
  ["thru-hiker", "Thru-hiker", "Multi-day, carrying everything, in most weather"],
];

function detailsSection(me = {}, meId) {
  const box = el("section", { class: "block", id: "your-details", tabindex: "-1" });
  box.append(el("h2", { class: "h2", text: "Your details" }));

  /* picture */
  let avatarUrl = me.avatar_url || "";
  const uid = meId || "you";
  const options = ["", ...[1, 2, 3, 4, 5, 6].map((n) => `https://i.pravatar.cc/200?u=${uid}-${n}`)];
  const preview = el("span", { class: "avatarpick__now" });
  const drawPreview = () => preview.replaceChildren(avatar(avatarUrl, me.display_name || "You", "avatar avatar--xl"));
  const picker = el("div", { class: "avatarpick__row", role: "radiogroup", "aria-label": "Choose a picture" });
  const drawPicker = () => {
    picker.replaceChildren(...options.map((u, i) =>
      el("button", {
        class: `avatarpick__opt ${u === avatarUrl ? "is-on" : ""}`,
        type: "button", role: "radio",
        "aria-checked": u === avatarUrl ? "true" : "false",
        "aria-label": u ? `Picture ${i}` : "No picture, use my initial instead",
        onclick: async () => {
          avatarUrl = u; drawPreview(); drawPicker();
          await DB.saveProfile({ avatar_url: u });
          say(u ? "Picture changed." : "Picture removed.");
        },
      }, [avatar(u, me.display_name || "You")])
    ));
  };
  drawPreview(); drawPicker();

  /* ⚠️ Your own photo can be a REAL photo, not just one of six stock
     faces. The group photo already took an upload while your own face
     did not, which is backwards — the group photo is what strangers
     swipe on, but your face is what they see when deciding whether to
     walk with you. Same pipeline: resized in the browser before it
     goes anywhere, so a 4 MB phone photo does not become a 4 MB avatar
     drawn at 34 pixels. */
  const upInput = el("input", { class: "sr-only", type: "file", id: "avatar-file", accept: "image/*" });
  const upStatus = el("p", { class: "tiny", style: "padding-top:8px" });
  const upLabel = el("label", { class: "btn btn--ghost", for: "avatar-file", style: "margin-top:10px" }, [
    el("span", { text: "Use my own photo" }),
  ]);

  upInput.addEventListener("change", async () => {
    const file = upInput.files && upInput.files[0];
    if (!file) return;
    upStatus.textContent = "Reading the photo…";
    try {
      const out = await prepare(file);
      upStatus.textContent = "Uploading…";
      const url = await DB.upload(out.blob, `avatar-${meId || "me"}.jpg`);
      avatarUrl = url;
      drawPreview(); drawPicker();
      await DB.saveProfile({ avatar_url: url });
      await refreshAppbar();
      upStatus.textContent = `That's you — ${Math.round(out.bytes / 1024)} KB.`;
      toast("Photo updated");
      say("Profile photo updated.");
    } catch (err) {
      console.warn("[profile] avatar upload failed", err);
      upStatus.textContent = err.message || "That didn't upload. Try again.";
      upInput.value = "";
    }
  });

  box.append(el("div", { class: "avatarpick" }, [
    el("div", { class: "avatarpick__wrap" }, [preview, picker]),
    upLabel, upInput, upStatus,
  ]));

  const name = el("input", { class: "field", id: "dn", type: "text", maxlength: "40", "aria-label": "Display name" });
  name.value = me.display_name || "";
  const bio = el("textarea", {
    class: "planbox", id: "bio", rows: "3", maxlength: "240",
    placeholder: "A line about how you like to walk. Slow? Early starts? Always brings snacks?",
    "aria-label": "About you",
  });
  bio.value = me.bio || "";
  const area = el("input", { class: "field", id: "area", type: "text", maxlength: "60", placeholder: "Melbourne", "aria-label": "Where you are based" });
  area.value = me.home_area || "";
  const pronouns = el("select", { class: "field", id: "pn", "aria-label": "Pronouns" }, [
    el("option", { value: "", text: "Prefer not to say" }),
    ...PRONOUNS.map((x) => el("option", { value: x, text: x })),
  ]);
  pronouns.value = me.pronouns || "";

  let exp = me.experience || "beginner";
  const expWrap = el("div", { class: "stack", style: "padding:0" });
  const drawExp = () => expWrap.replaceChildren(...EXPERIENCE.map(([key, label, hint]) =>
    el("button", {
      class: "row", type: "button",
      "aria-pressed": exp === key ? "true" : "false",
      onclick: () => { exp = key; drawExp(); say(label); },
    }, [
      el("span", { class: "row__body" }, [
        el("span", { class: "row__title", text: label }),
        el("span", { class: "row__sub", text: hint }),
      ]),
    ])
  ));
  drawExp();

  const field = (id, label, node) => el("div", { style: "margin-top:14px" }, [
    el("label", { class: "tiny", for: id, text: label }), node,
  ]);
  box.append(
    field("dn", "DISPLAY NAME", name),
    field("bio", "ABOUT YOU", bio),
    field("area", "WHERE YOU ARE BASED", area),
    field("pn", "PRONOUNS", pronouns),
    el("p", { class: "tiny", style: "margin-top:14px", text: "EXPERIENCE" }),
    expWrap
  );

  const saveBtn = el("button", {
    class: "btn btn--primary btn--block", style: "margin-top:16px",
    type: "button", text: "Save profile",
    onclick: async () => {
      saveBtn.disabled = true;
      await DB.saveProfile({
        display_name: name.value.trim() || "New hiker",
        bio: bio.value.trim(),
        home_area: area.value.trim(),
        pronouns: pronouns.value,
        experience: exp,
      });
      saveBtn.disabled = false;
      toast("Profile saved");
      say("Profile saved.");
      /* the page above shows what was just edited, so it has to redraw */
      go("profile");
    },
  });
  box.append(saveBtn);
  return box;
}

/* ------------------------------------------------------------
   Account — the bottom of the page.
   ------------------------------------------------------------ */
function accountSection() {
  const a = Auth.account();
  const box = el("section", { class: "block" }, [el("h2", { class: "h2", text: "Account" })]);

  if (!a.signedIn) {
    box.append(
      el("p", { class: "meta", text: a.awaitingConfirmation
        ? `Almost there — confirm the email sent to ${a.email} and this becomes a real account.`
        : "You're browsing as a guest, so this profile lives in this browser only." }),
      el("button", {
        class: "btn btn--primary btn--block", style: "margin-top:12px", type: "button",
        text: a.awaitingConfirmation ? "Finish setting up" : "Create an account, or sign in",
        onclick: () => go("account"),
      })
    );
    return box;
  }

  const err = el("p", { class: "acct__err", role: "alert" });
  box.append(
    el("div", { class: "acct__badge" }, [
      el("span", { class: "acct__ic", html: icon("check", { size: 18 }), "aria-hidden": "true" }),
      el("div", {}, [
        el("p", { class: "row__title", text: "Signed in" }),
        el("p", { class: "row__sub", text: a.email }),
      ]),
    ]),
    err,
    el("button", {
      class: "btn btn--ghost btn--block", style: "margin-top:12px", type: "button", text: "Change my password",
      onclick: async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        err.textContent = "";
        try {
          await Auth.requestPasswordReset(a.email);
          toast("Reset link sent");
          say(`A reset link is on its way to ${a.email}.`);
        } catch (e2) {
          err.textContent = String(e2.message || e2).replace(/^auth [^:]+:\s*/, "");
          b.disabled = false;
        }
      },
    }),
    el("button", {
      class: "btn btn--ghost btn--block", style: "margin-top:10px", type: "button", text: "Sign out",
      onclick: async (e) => {
        e.currentTarget.disabled = true;
        await Auth.signOut();
        await refreshAppbar();
        toast("Signed out — browsing as a guest");
        say("Signed out. You are browsing as a guest again.");
        go("home");
      },
    }),
    el("p", { class: "tiny", style: "padding-top:10px", text: "Signing out puts you back in guest mode with a fresh, empty profile. Nothing on your account is deleted — sign back in and it is all there." })
  );
  return box;
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
