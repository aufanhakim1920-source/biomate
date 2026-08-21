/* ============================================================
   Biomate — onboarding and settings

   The Figma's onboarding is 5 steps and still raw system-font
   wireframes, so this is designed rather than copied — but it keeps
   the design's own decisions: five steps, a progress counter, and
   step 4 asking for PRONOUNS rather than gender.

   That last one is the design's call and a good one: pronouns are
   identity to display, not a filter to sort strangers by. The brief
   lists "gender" among the matching preferences; the Figma quietly
   improved on it, so the Figma wins here.
   ============================================================ */

import { DB } from "../db.js";
import { el, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say, setAudio, setTheme } from "../a11y.js";
import { get } from "../store.js";
import { go, back } from "../router.js";

const EXPERIENCE = [
  ["beginner", "New to this", "A few easy walks, still working out what I like"],
  ["intermediate", "Comfortable", "Happy with a long day and some elevation"],
  ["thru-hiker", "Thru-hiker", "Multi-day, carrying everything, in most weather"],
];

const INTERESTS = ["Day hikes", "Backpacking", "Trail running", "Dog friendly", "Camping", "Photography"];
const PRONOUNS = ["she/her", "he/him", "they/them", "prefer not to say"];

export async function onboarding({ id }) {
  const step = Math.max(1, Math.min(5, Number(id) || 1));
  const me = (await DB.me()) || {};
  const draft = JSON.parse(sessionStorage.getItem("biomate/onboard") || "{}");

  const keep = (patch) => {
    Object.assign(draft, patch);
    sessionStorage.setItem("biomate/onboard", JSON.stringify(draft));
  };

  const wrap = el("div", { class: "onb" });

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      step > 1
        ? el("button", { class: "iconbtn", type: "button", "aria-label": "Previous step", html: icon("back", { size: 22 }), onclick: () => go(`welcome/${step - 1}`) })
        : el("span", { style: "width:44px" }),
      el("span", { class: "tiny", style: "flex:1;text-align:center", text: `${step}/5` }),
      el("button", { class: "linky", type: "button", text: "Skip", onclick: finish }),
    ])
  );

  const body = el("div", { class: "onb__body" });
  wrap.append(body);

  if (step === 1) {
    body.append(
      el("div", { class: "onb__mark", html: mark() }),
      el("h1", { class: "display", style: "text-align:center", text: "Welcome to Biomate" }),
      el("p", { class: "meta", style: "text-align:center;max-width:30ch;margin:8px auto 0", text: "Find people to walk with. The hike is the excuse; the company is the point." })
    );
  }

  if (step === 2) {
    const input = el("input", { class: "field", id: "name", type: "text", placeholder: "What should people call you?", "aria-label": "Your name" });
    input.value = draft.display_name || me.display_name || "";
    input.addEventListener("input", () => keep({ display_name: input.value }));
    body.append(question("What's your name?"), input);
  }

  if (step === 3) {
    body.append(question("How much walking have you done?"));
    const list = el("div", { class: "stack", style: "padding:0" });
    EXPERIENCE.forEach(([key, label, hint]) => {
      list.append(el("button", {
        class: "row", type: "button",
        "aria-pressed": (draft.experience || me.experience) === key ? "true" : "false",
        onclick: (e) => {
          keep({ experience: key });
          [...list.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
          e.currentTarget.setAttribute("aria-pressed", "true");
          say(label);
        },
      }, [
        el("span", { class: "row__body" }, [
          el("span", { class: "row__title", text: label }),
          el("span", { class: "row__sub", text: hint }),
        ]),
      ]));
    });
    body.append(list);
  }

  if (step === 4) {
    body.append(question("What are your pronouns?"));
    const sel = el("select", { class: "field", id: "pronouns", "aria-label": "Pronouns" }, [
      el("option", { value: "", text: "Pronouns" }),
      ...PRONOUNS.map((p) => el("option", { value: p, text: p })),
    ]);
    sel.value = draft.pronouns || me.pronouns || "";
    sel.addEventListener("change", () => keep({ pronouns: sel.value }));
    body.append(sel);
    body.append(el("p", { class: "tiny", style: "margin-top:12px", text: "Shown on your profile so people know how to refer to you. It is not used to filter who you see." }));
  }

  if (step === 5) {
    body.append(question("What are you into?"));
    const chips = el("div", { class: "chips", style: "flex-wrap:wrap;overflow:visible", role: "group", "aria-label": "Interests" });
    const picked = new Set(draft.interests || []);
    INTERESTS.forEach((t) => chips.append(el("button", {
      class: "chip", type: "button", text: t,
      "aria-pressed": picked.has(t) ? "true" : "false",
      onclick: (e) => {
        if (picked.has(t)) picked.delete(t); else picked.add(t);
        e.currentTarget.setAttribute("aria-pressed", picked.has(t) ? "true" : "false");
        keep({ interests: [...picked] });
      },
    })));
    body.append(chips);
  }

  wrap.append(
    el("div", { class: "onb__foot" }, [
      step < 5
        ? el("button", { class: "btn btn--primary btn--block", type: "button", html: `<span>Next</span>${icon("arrow", { size: 18 })}`, onclick: () => go(`welcome/${step + 1}`) })
        : el("button", { class: "btn btn--primary btn--block", type: "button", text: "Start exploring", onclick: finish }),
    ])
  );

  async function finish() {
    await DB.saveProfile({
      display_name: draft.display_name || me.display_name || "You",
      pronouns: draft.pronouns || "",
      experience: draft.experience || "beginner",
      prefs: { interests: draft.interests || [] },
    });
    localStorage.setItem("biomate/onboarded", "1");
    sessionStorage.removeItem("biomate/onboard");
    toast("You're set");
    go("home");
  }

  return wrap;
}

function question(text) {
  return el("h1", { class: "onb__q", text });
}

function mark() {
  return `<svg viewBox="0 0 48 48" width="96" height="96" aria-hidden="true">
    <circle cx="24" cy="24" r="21" fill="var(--cream)" stroke="var(--brand-text)" stroke-width="3.2"/>
    <path d="M14 32 Q20 30 24 24 Q28 18 34 16" fill="none" stroke="var(--ink-soft)" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="14" cy="32" r="4.4" fill="var(--brand)"/>
    <circle cx="24" cy="24" r="4.4" fill="var(--amber)"/>
    <circle cx="34" cy="16" r="4.4" fill="var(--forest)"/>
  </svg>`;
}

/* ---------------- settings ---------------- */
export async function settings() {
  const s = get();
  const me = (await DB.me()) || {};
  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "Settings" }),
    ])
  );

  const name = el("input", { class: "field", id: "dn", type: "text", "aria-label": "Display name" });
  name.value = me.display_name || "";

  wrap.append(el("section", { class: "block" }, [
    el("label", { class: "tiny", for: "dn", text: "DISPLAY NAME" }),
    name,
    el("button", {
      class: "btn btn--ghost", style: "margin-top:10px", type: "button", text: "Save",
      onclick: async () => { await DB.saveProfile({ display_name: name.value.trim() || "You" }); toast("Saved"); say("Name saved."); },
    }),
  ]));

  wrap.append(el("section", { class: "block" }, [
    el("h2", { class: "h2", text: "Audio description" }),
    el("p", { class: "meta", text: "Reads each screen aloud. Off by default so a shared link never surprises anyone. Screen readers get the same text whether this is on or not." }),
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
  ]));

  wrap.append(el("section", { class: "block" }, [
    el("h2", { class: "h2", text: "Appearance" }),
    el("div", { class: "inline", style: "margin-top:8px" }, [
      themeChip("Follow system", null, s.theme),
      themeChip("Light", "light", s.theme),
      themeChip("Dark", "dark", s.theme),
    ]),
  ]));

  wrap.append(el("section", { class: "block" }, [
    el("h2", { class: "h2", text: "Start over" }),
    el("p", { class: "meta", text: "Clears everything stored on this device — your profile, hikes, messages and logged trails." }),
    el("button", {
      class: "btn btn--ghost", style: "margin-top:10px", type: "button", text: "Reset this device",
      onclick: () => {
        if (!confirm("Clear all Biomate data on this device? This cannot be undone.")) return;
        ["biomate/db", "biomate/local-uid", "biomate/prefs", "biomate/onboarded", "biomate/session"]
          .forEach((k) => localStorage.removeItem(k));
        location.hash = "#/welcome/1";
        location.reload();
      },
    }),
  ]));

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
