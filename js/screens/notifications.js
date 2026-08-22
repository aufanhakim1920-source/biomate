/* ============================================================
   Biomate — What you missed

   The list half of the derived inbox. Everything here comes out of
   js/notify.js; this file only decides how it reads.

   Three decisions worth keeping:

   · **Rows are <button>s, not links with a badge.** Activating one
     both navigates AND advances the read marker to that row's own
     timestamp — so opening the newest thing marks everything older
     read too, which is what people mean when they open the newest
     thing. Ctrl-clicking a link could never do that.

   · **The empty state is the good one.** "Nothing new" with a quiet
     line under it, not an apologetic illustration. An empty inbox
     means the app is caught up, which is a success.

   · **Time is stated, not just implied.** timeAgo() next to every
     row, because "someone joined" with no when is a fact you cannot
     act on.
   ============================================================ */

import { el, timeAgo, toast } from "../ui.js";
import { icon } from "../icons.js";
import { say } from "../a11y.js";
import { go, back, render } from "../router.js";
import { feed, markRead, refreshBadge } from "../notify.js";

export async function notifications() {
  const { items, count } = await feed();
  const wrap = el("div");

  wrap.append(
    el("div", { class: "topbar topbar--left" }, [
      el("button", {
        class: "iconbtn iconbtn--ring", type: "button", "aria-label": "Back",
        html: icon("back", { size: 20 }), onclick: back,
      }),
      el("h1", { class: "display", style: "font-size:1.5rem", text: "What you missed" }),
    ])
  );

  if (!count) {
    wrap.append(
      el("div", { class: "stack", style: "padding-top:40px;text-align:center" }, [
        el("p", { class: "display", style: "font-size:1.3rem", text: "Nothing new" }),
        el("p", { class: "meta", text: "When somebody joins a walk you're hosting, says something in one of your groups, or locks in a date, it turns up here." }),
        el("button", {
          class: "btn btn--primary", style: "margin-top:8px", type: "button",
          text: "Open your messages", onclick: () => go("messages"),
        }),
      ])
    );
    return wrap;
  }

  wrap.append(
    el("div", { class: "block", style: "display:flex;align-items:center;gap:12px" }, [
      el("p", { class: "meta", style: "flex:1;margin:0", text: `${count} thing${count === 1 ? "" : "s"} happened since you were last here.` }),
      el("button", {
        class: "btn btn--ghost", type: "button", text: "Mark all read",
        onclick: async () => {
          markRead();
          await refreshBadge({ silent: true });
          toast("All caught up");
          say("All marked read.");
          /* re-render rather than emptying the list by hand: the
             screen is a pure function of the read marker, and hand-
             patching the DOM is how the two get to disagree */
          render();
        },
      }),
    ])
  );

  wrap.append(el("div", { class: "stack" }, items.map(row)));

  return wrap;
}

function row(n) {
  return el("button", {
    class: `row notif notif--${n.kind}`,
    type: "button",
    /* The whole row's meaning in one string, because a screen reader
       reads the accessible name and stops — the timestamp has to be
       inside it, not sitting beside it visually.

       ⚠️ Built from the item's own `spoken` sentence rather than by
       concatenating the visible title and subtitle. Concatenating
       produced "Date confirmed. Date confirmed. Uluru and Kata
       Tjuta…" — the kind label and the title are the same words for
       that kind, and "New messages. …3 new messages…" stuttered the
       same way. The visible layout wants a short title over a
       detail line; a screen reader wants one sentence. They are
       different jobs and this row now does both. */
    "aria-label": `${n.spoken} ${timeAgo(n.at)} ago.`,
    onclick: async () => {
      /* advancing to THIS row's timestamp marks it and everything
         older read — "I've seen down to here" */
      markRead(n.at);
      await refreshBadge({ silent: true });
      go(n.to);
    },
  }, [
    el("span", { class: "notif__ic", html: icon(n.icon, { size: 20 }), "aria-hidden": "true" }),
    el("span", { class: "row__body" }, [
      el("span", { class: "row__title", text: n.title }),
      el("span", { class: "row__sub", text: n.sub }),
    ]),
    el("span", { class: "tiny notif__when", "aria-hidden": "true", text: timeAgo(n.at) }),
  ]);
}
