/* ============================================================
   Biomate — your profile, editable

   Aufan: "we can update our profile". Everything a person shows to
   others is editable here, in the same order it appears on the
   profile card, so the form reads as *the thing you are editing*
   rather than as a list of unrelated fields.

   Split out of onboarding.js once it grew past being a settings
   page — file splits follow readability here, not ownership.
   ============================================================ */

import { DB } from "../db.js";
import { el, toast, avatar } from "../ui.js";
import { icon } from "../icons.js";
import { say, setAudio, setTheme } from "../a11y.js";
import { get } from "../store.js";
import * as Auth from "../auth.js";
import { go, back } from "../router.js";

const PRONOUNS = ["she/her", "he/him", "they/them", "prefer not to say"];

const EXPERIENCE = [
  ["beginner", "New to this", "A few easy walks, still working out what I like"],
  ["intermediate", "Comfortable", "Happy with a long day and some elevation"],
  ["thru-hiker", "Thru-hiker", "Multi-day, carrying everything, in most weather"],
];

export async function settings() {
  const s = get();
  const me = (await DB.me()) || {};
  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "Your profile" }),
    ])
  );

  /* ---------------- account ----------------
     First, because "who am I signed in as" frames everything below
     it — a bio you edit as a guest lives in one browser, and the
     same bio on an account follows you. Registering the route is not
     the same as shipping the feature; this is the door. */
  if (DB.isLive) {
    const acct = Auth.account();
    wrap.append(
      el("section", { class: "block" }, [
        el("h2", { class: "h2", text: "Account" }),
        el("button", { class: "row", type: "button", style: "margin-top:8px", onclick: () => go("account") }, [
          el("span", { class: "iconbtn", html: icon(acct.signedIn ? "check" : "people", { size: 20 }) }),
          el("span", { class: "row__body" }, [
            el("span", { class: "row__title", text: acct.signedIn ? "Signed in" : "Browsing as a guest" }),
            el("span", { class: "row__sub", text: acct.signedIn
              ? acct.email
              : acct.awaitingConfirmation
                ? `Waiting on confirmation for ${acct.email}`
                : "Create an account to keep this on another device" }),
          ]),
          el("span", { class: "iconbtn", html: icon("arrow", { size: 20 }) }),
        ]),
      ])
    );
  }

  /* ---------------- picture ---------------- */
  let avatarUrl = me.avatar_url || "";
  const uid = DB.uid() || "you";
  const options = ["", ...[1, 2, 3, 4, 5, 6].map((n) => `https://i.pravatar.cc/200?u=${uid}-${n}`)];

  const preview = el("span", { class: "avatarpick__now" });
  const drawPreview = () =>
    preview.replaceChildren(avatar(avatarUrl, me.display_name || "You", "avatar avatar--xl"));
  drawPreview();

  const picker = el("div", { class: "avatarpick__row", role: "radiogroup", "aria-label": "Choose a picture" });
  const drawPicker = () => {
    picker.replaceChildren(
      ...options.map((u, i) =>
        el("button", {
          class: `avatarpick__opt ${u === avatarUrl ? "is-on" : ""}`,
          type: "button",
          role: "radio",
          "aria-checked": u === avatarUrl ? "true" : "false",
          "aria-label": u ? `Picture ${i}` : "No picture, use my initial instead",
          onclick: async () => {
            avatarUrl = u;
            drawPreview();
            drawPicker();
            await DB.saveProfile({ avatar_url: u });
            say(u ? "Picture changed." : "Picture removed.");
          },
        }, [avatar(u, me.display_name || "You")])
      )
    );
  };
  drawPicker();

  wrap.append(
    el("section", { class: "block avatarpick" }, [
      el("h2", { class: "h2", text: "Picture" }),
      el("div", { class: "avatarpick__wrap" }, [preview, picker]),
    ])
  );

  /* ---------------- the fields ---------------- */
  const name = el("input", { class: "field", id: "dn", type: "text", maxlength: "40", "aria-label": "Display name" });
  name.value = me.display_name || "";

  const bio = el("textarea", {
    class: "planbox", id: "bio", rows: "3", maxlength: "240",
    placeholder: "A line about how you like to walk. Slow? Early starts? Always brings snacks?",
    "aria-label": "About you",
  });
  bio.value = me.bio || "";

  const area = el("input", {
    class: "field", id: "area", type: "text", maxlength: "60",
    placeholder: "Melbourne", "aria-label": "Where you are based",
  });
  area.value = me.home_area || "";

  const pronouns = el("select", { class: "field", id: "pn", "aria-label": "Pronouns" }, [
    el("option", { value: "", text: "Prefer not to say" }),
    ...PRONOUNS.map((x) => el("option", { value: x, text: x })),
  ]);
  pronouns.value = me.pronouns || "";

  let exp = me.experience || "beginner";
  const expWrap = el("div", { class: "stack", style: "padding:0" });
  const drawExp = () => {
    expWrap.replaceChildren(
      ...EXPERIENCE.map(([key, label, hint]) =>
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
      )
    );
  };
  drawExp();

  const field = (id, label, node) =>
    el("section", { class: "block" }, [el("label", { class: "tiny", for: id, text: label }), node]);

  wrap.append(
    field("dn", "DISPLAY NAME", name),
    field("bio", "ABOUT YOU", bio),
    field("area", "WHERE YOU ARE BASED", area),
    field("pn", "PRONOUNS", pronouns),
    el("section", { class: "block" }, [el("span", { class: "tiny", text: "EXPERIENCE" })]),
    el("div", { class: "block", style: "padding-top:0" }, [expWrap])
  );

  const saveBtn = el("button", {
    class: "btn btn--primary btn--block",
    type: "button",
    text: "Save profile",
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
      go("profile");
    },
  });
  wrap.append(el("div", { class: "block" }, [saveBtn]));

  /* ---------------- accessibility ---------------- */
  wrap.append(
    el("section", { class: "block" }, [
      el("h2", { class: "h2", text: "Audio description" }),
      el("p", { class: "meta", text: "Reads each screen aloud. Off by default so a shared link never surprises anyone. Screen readers get the same text either way." }),
      el("button", {
        class: "switch", type: "button", role: "switch", style: "margin-top:10px",
        "aria-checked": s.audio ? "true" : "false",
        onclick: (e) => {
          const next = e.currentTarget.getAttribute("aria-checked") !== "true";
          e.currentTarget.setAttribute("aria-checked", next ? "true" : "false");
          setAudio(next);
        },
      }, [
        el("span", { class: "switch__label", text: "Speak screens aloud" }),
        el("span", { class: "switch__track", "aria-hidden": "true" }, [el("span", { class: "switch__knob" })]),
      ]),
    ])
  );

  wrap.append(
    el("section", { class: "block" }, [
      el("h2", { class: "h2", text: "Appearance" }),
      el("div", { class: "inline", style: "margin-top:8px" }, [
        themeChip("Follow system", null, s.theme),
        themeChip("Light", "light", s.theme),
        themeChip("Dark", "dark", s.theme),
      ]),
    ])
  );

  wrap.append(
    el("section", { class: "block" }, [
      el("h2", { class: "h2", text: "Start over" }),
      el("p", { class: "meta", text: "Clears everything stored on this device. Your account and anything you posted stay on the server." }),
      el("button", {
        class: "btn btn--ghost", style: "margin-top:10px", type: "button", text: "Reset this device",
        onclick: () => {
          if (!confirm("Clear all Biomate data on this device? This cannot be undone.")) return;
          ["biomate/db", "biomate/local-uid", "biomate/prefs", "biomate/onboarded",
            "biomate/session", "biomate/celebrated", "biomate/streak"]
            .forEach((k) => localStorage.removeItem(k));
          location.hash = "#/welcome/1";
          location.reload();
        },
      }),
    ])
  );

  return wrap;
}

function themeChip(label, value, current) {
  return el("button", {
    class: "chip", type: "button", text: label,
    "aria-pressed": current === value ? "true" : "false",
    onclick: (e) => {
      setTheme(value);
      [...e.currentTarget.parentElement.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
      e.currentTarget.setAttribute("aria-pressed", "true");
    },
  });
}
