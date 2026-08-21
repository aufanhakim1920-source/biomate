/* ============================================================
   Biomate — the photo gallery, with or without the lens

   Aufan's rule, and it is the right one:

     "when you're looking at someone's profile we should be able to
      see their gallery but there is the blurry thing, while our own
      profile we don't have any blurry circle"

   So the lens is not a decoration applied everywhere — it MEANS
   something. Someone else's photos sit behind it and you move the
   circle to look, which is a small act of curiosity. Your own photos
   are just your photos; making you drag a lens over your own gallery
   would be friction with no payoff.

   Mechanics of the lens (his spec, from the design library):
     · a visible circle you press and drag, that stays where you leave it
     · LIFTED ~72px above the touch point while dragging, or your own
       hand covers exactly what it reveals
     · touch-action:none on the RIM only, so the lens drags and the
       page still scrolls
     · a rim and a shadow, or it reads as a rendering artefact and
       nobody tries to grab it

   ⚠️ The blur is VISUAL ONLY. Every photo keeps its alt text and stays
   focusable and tappable — a state only a pointer can reveal would be
   a bug, not an effect.
   ============================================================ */

import { el } from "./ui.js";
import { say, reducedMotion } from "./a11y.js";

/**
 * @param {Array<{url:string, alt:string}>} shots
 * @param {{lens?:boolean, onOpen?:(shot:object)=>void}} [opts]
 */
export function gallery(shots, opts = {}) {
  const { lens = false, onOpen } = opts;

  const grid = el("div", { class: "pgrid" },
    shots.map((s, i) =>
      el("button", {
        class: "pgrid__cell",
        type: "button",
        "aria-label": s.alt || `Photo ${i + 1}`,
        onclick: () => (onOpen ? onOpen(s) : say(s.alt || "Photo")),
      }, [
        el("img", {
          src: s.url,
          alt: "",
          /* never lazy-load a data: URI — there is nothing to defer and
             the decode can simply never start */
          loading: s.url.startsWith("data:") ? "eager" : "lazy",
        }),
      ])
    )
  );

  if (!lens) return el("div", {}, [grid]);

  const holder = el("div", { class: "lenswrap" });
  const veil = el("div", { class: "lens__veil", "aria-hidden": "true" });
  const rim = el("div", {
    class: "lens__rim",
    role: "slider",
    tabindex: "0",
    "aria-label": "Focus lens. Drag it, or use the arrow keys, to bring photos into focus.",
    "aria-valuetext": "centre",
  });

  holder.append(grid, veil, rim);

  let lx = 50, ly = 44;   /* above centre — out of thumb territory */
  let lift = 0;

  const place = () => {
    holder.style.setProperty("--lx", lx + "%");
    holder.style.setProperty("--ly", `calc(${ly}% - ${lift}px)`);
    rim.style.left = lx + "%";
    rim.style.top = `calc(${ly}% - ${lift}px)`;
  };

  const fromEvent = (e) => {
    const r = holder.getBoundingClientRect();
    lx = Math.max(6, Math.min(94, ((e.clientX - r.left) / r.width) * 100));
    ly = Math.max(8, Math.min(92, ((e.clientY - r.top) / r.height) * 100));
    place();
  };

  let dragging = false;
  rim.addEventListener("pointerdown", (e) => {
    dragging = true;
    rim.setPointerCapture(e.pointerId);
    rim.dataset.held = "1";
    /* lift for touch only — a mouse cursor is a point and occludes
       nothing, so shifting the lens away from it would feel broken */
    lift = e.pointerType === "touch" ? 72 : 0;
    place();
  });
  rim.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });

  const drop = () => {
    if (!dragging) return;
    dragging = false;
    rim.dataset.held = "0";
    lift = 0;
    place();
    rim.setAttribute("aria-valuetext", `${Math.round(lx)} percent across, ${Math.round(ly)} percent down`);
  };
  rim.addEventListener("pointerup", drop);
  rim.addEventListener("pointercancel", drop);

  rim.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 12 : 5;
    if (e.key === "ArrowLeft") lx = Math.max(6, lx - step);
    else if (e.key === "ArrowRight") lx = Math.min(94, lx + step);
    else if (e.key === "ArrowUp") ly = Math.max(8, ly - step);
    else if (e.key === "ArrowDown") ly = Math.min(92, ly + step);
    else return;
    e.preventDefault();
    place();
  });

  if (reducedMotion()) rim.style.transition = "none";
  place();

  return el("div", {}, [
    holder,
    el("p", { class: "tiny", style: "padding:10px 20px 0", text: "Drag the circle to bring their photos into focus. Arrow keys work too." }),
  ]);
}
