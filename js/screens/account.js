/* ============================================================
   Biomate — guest, or an account

   Aufan: "peoplle can join guest mode but make sure there is create
   acc option ok and sign in"

   So guest stays the front door. Nobody is asked to sign up before
   they can look around — the app has always created an anonymous
   Supabase user on first visit, and that user is real: a row in
   auth.users with a signed token, which is what makes "only edit
   your own row" enforceable by Postgres rather than by politeness.

   What this screen adds is the part that was missing: a way to KEEP
   it. Creating an account converts the guest you already are, in
   place, so the user id never changes and every hike, walk, badge
   and day of streak carries over. There is no migration because
   nothing moves.

   Three states, and the screen is honest about all of them:

     GUEST         — offer to create an account, or sign in
     PENDING       — account made, address not confirmed yet. The
                     guest session still works. Say that, rather
                     than showing a success screen for something
                     that has not finished.
     SIGNED IN     — who you are, and a way out

   ⚠️ Signing in to a DIFFERENT account from a guest session leaves
   the guest's rows behind, owned by an anonymous user nobody can
   sign into again. That is unrecoverable, so when there is anything
   to lose the screen counts it and asks first.
   ============================================================ */

import { DB } from "../db.js";
import { el, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import * as Auth from "../auth.js";
import { go, back } from "../router.js";

const MIN_PASSWORD = 8;

/* GoTrue's messages are accurate and read like a stack trace. Map the
   ones people actually hit; fall through to the real text rather than
   swallowing something unrecognised. */
function friendly(err) {
  const m = String((err && err.message) || err);
  if (/already registered|already exists/i.test(m)) return "That email already has an account. Sign in instead.";
  if (/invalid login credentials/i.test(m)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(m)) return "That account still needs confirming — check your email.";
  if (/password should be at least (\d+)/i.test(m)) return `Passwords need at least ${m.match(/at least (\d+)/i)[1]} characters.`;
  if (/rate limit|too many/i.test(m)) return "Too many attempts just now. Wait a minute and try again.";
  if (/unable to validate email|invalid format/i.test(m)) return "That doesn't look like an email address.";
  return m.replace(/^auth [^:]+:\s*/, "");
}

export async function account() {
  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", { class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back", html: icon("back", { size: 20 }), onclick: back }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "Your account" }),
    ])
  );

  if (!DB.isLive) {
    wrap.append(
      el("section", { class: "block" }, [
        el("p", { class: "meta", text: "This copy of Biomate is running on local storage only, so there are no accounts to create. Everything you do stays in this browser." }),
      ])
    );
    return wrap;
  }

  const state = Auth.account();

  /* what a guest would be walking away from */
  const meId = DB.uid();
  const [members, logs] = await Promise.all([
    DB.list("hike_members", { filter: { user_id: meId } }),
    DB.list("trail_logs", { filter: { user_id: meId } }),
  ]);
  const joined = members.filter((m) => m.status !== "left").length;
  const walks = logs.length;
  const hasSomethingToLose = joined > 0 || walks > 0;

  const body = el("div");
  wrap.append(body);

  /* ---------------- signed in ---------------- */
  if (state.signedIn) {
    body.append(
      el("section", { class: "block" }, [
        el("div", { class: "acct__badge" }, [
          el("span", { class: "acct__ic", html: icon("check", { size: 18 }), "aria-hidden": "true" }),
          el("div", {}, [
            el("p", { class: "row__title", text: "Signed in" }),
            el("p", { class: "row__sub", text: state.email }),
          ]),
        ]),
        el("p", { class: "meta", style: "margin-top:12px", text: "Your hikes, walks and badges are tied to this account, so they follow you to any device you sign in on." }),
      ]),
      el("div", { class: "block" }, [
        el("button", {
          class: "btn btn--ghost btn--block", type: "button", text: "Sign out",
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            await Auth.signOut();
            toast("Signed out — browsing as a guest");
            say("Signed out. You are browsing as a guest again.");
            go("home");
          },
        }),
        el("p", { class: "tiny", style: "padding:8px 2px 0", text: "Signing out puts you back in guest mode with a fresh, empty profile. Nothing on your account is deleted — sign back in and it is all there." }),
      ])
    );
    return wrap;
  }

  /* ---------------- account made, not confirmed ---------------- */
  if (state.awaitingConfirmation) {
    body.append(confirmationPanel(state.email));
    return wrap;
  }

  /* ---------------- guest ---------------- */
  body.append(
    el("section", { class: "block" }, [
      el("div", { class: "acct__badge acct__badge--guest" }, [
        el("span", { class: "acct__ic", html: icon("people", { size: 18 }), "aria-hidden": "true" }),
        el("div", {}, [
          el("p", { class: "row__title", text: "You're browsing as a guest" }),
          el("p", { class: "row__sub", text: hasSomethingToLose
            ? `${joined} hike${joined === 1 ? "" : "s"} joined · ${walks} walk${walks === 1 ? "" : "s"} recorded`
            : "Nothing saved yet" }),
        ]),
      ]),
      el("p", { class: "meta", style: "margin-top:12px", text: "A guest account is real and everything works — but it only lives in this browser. Clear your data or open Biomate on your phone and you start again as somebody new." }),
    ])
  );

  const panel = el("div");
  body.append(panel);

  let mode = "create";
  render();

  function render() {
    panel.replaceChildren(mode === "create" ? createForm() : signInForm());
  }

  /* ---- create ---- */
  function createForm() {
    const emailInput = field("acct-email", "EMAIL", { type: "email", autocomplete: "email", placeholder: "you@example.com" });
    const passInput = field("acct-pass", "PASSWORD", { type: "password", autocomplete: "new-password", placeholder: `At least ${MIN_PASSWORD} characters` });
    const err = el("p", { class: "acct__err", role: "alert" });

    const submit = el("button", {
      class: "btn btn--primary btn--block", type: "submit", text: "Create my account",
    });

    /* novalidate on purpose. `required` stays for semantics — screen
       readers announce the field as required — but the browser's own
       validation bubble is inconsistent between engines, disappears on
       scroll, and is not announced reliably. Worse, it BLOCKS submit,
       so the inline error path below never ran and the previous
       message just sat there looking like the new one. One error
       path, in the page, announced. */
    const form = el("form", {
      class: "block", novalidate: "",
      onsubmit: async (e) => {
        e.preventDefault();
        err.textContent = "";
        const email = emailInput.input.value.trim();
        const pass = passInput.input.value;

        if (!email) return fail(err, "Enter an email address.", emailInput.input);
        if (!looksLikeEmail(email)) return fail(err, "That doesn't look like an email address.", emailInput.input);
        if (pass.length < MIN_PASSWORD) return fail(err, `Passwords need at least ${MIN_PASSWORD} characters.`, passInput.input);

        submit.disabled = true;
        submit.textContent = "Creating…";
        try {
          const res = await Auth.createAccount(email, pass);
          if (res.confirmed) {
            toast("Account created");
            say("Account created. Everything you have done is now saved to it.");
            go("account");
          } else {
            panel.replaceChildren(confirmationPanel(res.pendingEmail));
            say(`Almost there. Confirm your address from the email sent to ${res.pendingEmail}.`);
          }
        } catch (e2) {
          submit.disabled = false;
          submit.textContent = "Create my account";
          fail(err, friendly(e2), emailInput.input);
        }
      },
    }, [
      el("h2", { class: "h2", text: "Create an account" }),
      el("p", { class: "meta", style: "margin-bottom:14px", text: hasSomethingToLose
        ? `Keeps what you already have — ${joined ? `${joined} hike${joined === 1 ? "" : "s"}` : "your profile"}${walks ? ` and ${walks} recorded walk${walks === 1 ? "" : "s"}` : ""} — and lets you pick it up on another device.`
        : "Keeps your profile, hikes and walks, and lets you pick them up on another device." }),
      emailInput.node,
      passInput.node,
      err,
      submit,
      el("button", {
        class: "linky", type: "button", style: "margin-top:14px",
        text: "I already have an account",
        onclick: () => { mode = "signin"; render(); },
      }),
    ]);
    return form;
  }

  /* ---- sign in ---- */
  function signInForm() {
    const emailInput = field("in-email", "EMAIL", { type: "email", autocomplete: "email", placeholder: "you@example.com" });
    const passInput = field("in-pass", "PASSWORD", { type: "password", autocomplete: "current-password", placeholder: "Your password" });
    const err = el("p", { class: "acct__err", role: "alert" });
    const submit = el("button", { class: "btn btn--primary btn--block", type: "submit", text: "Sign in" });

    /* The warning only appears when there is genuinely something to
       lose. A blanket "are you sure" on an empty guest profile trains
       people to click through warnings that matter. */
    const warning = hasSomethingToLose
      ? el("p", { class: "acct__warn" }, [
          el("span", { class: "acct__ic", html: icon("alert", { size: 16 }), "aria-hidden": "true" }),
          el("span", { text: `Signing in to a different account leaves this guest profile behind — ${joined} hike${joined === 1 ? "" : "s"} and ${walks} walk${walks === 1 ? "" : "s"} would no longer be reachable. If you meant to keep them, create an account instead.` }),
        ])
      : null;

    return el("form", {
      class: "block", novalidate: "",
      onsubmit: async (e) => {
        e.preventDefault();
        err.textContent = "";
        const email = emailInput.input.value.trim();
        const pass = passInput.input.value;
        if (!email || !pass) return fail(err, "Enter your email and password.", emailInput.input);

        submit.disabled = true;
        submit.textContent = "Signing in…";
        try {
          await Auth.signIn(email, pass);
          toast("Signed in");
          say("Signed in.");
          go("home");
        } catch (e2) {
          submit.disabled = false;
          submit.textContent = "Sign in";
          fail(err, friendly(e2), passInput.input);
        }
      },
    }, [
      el("h2", { class: "h2", text: "Sign in" }),
      warning,
      emailInput.node,
      passInput.node,
      err,
      submit,
      el("button", {
        class: "linky", type: "button", style: "margin-top:14px",
        text: "I don't have one yet",
        onclick: () => { mode = "create"; render(); },
      }),
    ]);
  }

  return wrap;
}

/* ------------------------------------------------------------
   Not a success screen. The account is not usable until the address
   is confirmed, and this project has confirmation switched on, so
   saying "done" here would be a lie the user only discovers on
   their next device.
   ------------------------------------------------------------ */
function confirmationPanel(email) {
  const err = el("p", { class: "acct__err", role: "alert" });

  return el("section", { class: "block" }, [
    el("h2", { class: "h2", text: "One more step" }),
    el("p", { class: "meta", style: "margin-top:6px" }, [
      el("span", { text: "We've sent a confirmation link to " }),
      el("b", { text: email }),
      el("span", { text: ". Open it and the account is yours — until then you're still browsing as a guest, and nothing you do is lost." }),
    ]),
    el("p", { class: "tiny", style: "margin-top:10px", text: "Check spam. Confirmation mail on a free Supabase project is rate-limited, so it can take a few minutes." }),
    err,
    el("button", {
      class: "btn btn--ghost btn--block", style: "margin-top:14px", type: "button", text: "Send it again",
      onclick: async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        err.textContent = "";
        try {
          await Auth.resendConfirmation(email);
          toast("Sent again");
          say("Confirmation email sent again.");
        } catch (e2) {
          err.textContent = friendly(e2);
        }
        setTimeout(() => { b.disabled = false; }, 30000);
      },
    }),
    el("button", { class: "linky", style: "margin-top:14px", type: "button", text: "Keep looking around", onclick: () => go("home") }),
  ]);
}

/* ---- small helpers ---- */

function field(id, label, attrs) {
  const input = el("input", { class: "field", id, required: "", ...attrs });
  const node = el("div", { style: "margin-bottom:14px" }, [
    el("label", { class: "tiny", for: id, text: label }),
    input,
  ]);
  return { node, input };
}

/* Deliberately loose. Email validation by regex is a famous rabbit
   hole and the server is the real authority — this only catches the
   typo that would otherwise cost a round trip to discover. */
function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function fail(err, message, focusEl) {
  err.textContent = message;
  say(message);
  if (focusEl) focusEl.focus();
}
