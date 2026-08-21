/* ============================================================
   Biomate — the Australia map

   Deliberately NOT Mapbox or Leaflet. The Figma draws a warm
   watercolour continent with state names as terracotta pills — a
   different and far more characterful thing than a slippy map, and
   it costs no tiles, no API key and no network.

   The outline is a hand-built simplification. The three features
   that make a blob read as Australia are kept and everything else
   is smoothed away: Cape York, the Gulf of Carpentaria notch, and
   the Great Australian Bight.

   ⚠️ "Womindjeka!" is a real DOM element, not SVG text inside an
   aria-hidden graphic. It is Woiwurrung for *welcome* and an
   acknowledgement of Country — burying it in a decorative layer
   would hide it from exactly the people who most rely on the text
   being real. It carries lang="woi" so a screen reader doesn't run
   it through English phonics.
   ============================================================ */

import { el } from "./ui.js";
import { say } from "./a11y.js";

/* Projected from real coastal waypoints rather than eyeballed:
   lng 112-154 -> x, lat -10..-44 -> y, at matched scale so the
   proportions are right. Smoothed with quadratics through the
   midpoints so the coast curves instead of showing its corners. */
const OUTLINE = "M11.7 28.8 Q11.1 32.5 10.5 36.2 Q12.6 41.5 14.7 46.8 Q14.1 48.9 13.5 51.1 Q15.9 51.7 18.4 52.3 Q21.9 51.2 25.4 50.2 Q33.6 48.1 41.8 45.9 Q46.9 49.0 52.0 52.1 Q53.5 52.0 54.9 51.9 Q59.2 55.5 63.5 59.0 Q66.1 59.2 68.6 59.4 Q72.8 54.8 77.1 50.2 Q78.7 44.5 80.2 38.9 Q78.0 35.3 75.8 31.7 Q71.7 25.9 67.6 20.2 Q64.6 14.7 61.7 9.2 Q60.2 15.2 58.7 21.2 Q57.6 21.4 56.5 21.6 Q53.6 20.1 50.8 18.6 Q51.0 15.1 51.2 11.5 Q46.1 11.9 41.1 12.2 Q37.7 13.4 34.3 14.5 Q30.1 18.3 26.0 22.1 Q22.8 24.1 19.6 26.2 Q15.7 27.5 11.7 28.8 Z";

const REGIONS = [
  { code: "NT",  name: "Northern Territory", x: 44, y: 24 },
  { code: "QLD", name: "Queensland",         x: 68, y: 30 },
  { code: "WA",  name: "Western Australia",  x: 20, y: 28 },
  { code: "SA",  name: "South Australia",    x: 51, y: 44 },
  { code: "NSW", name: "New South Wales",    x: 72, y: 44 },
  { code: "VIC", name: "Victoria",           x: 63, y: 52 },
  { code: "TAS", name: "Tasmania",           x: 79, y: 66 },
];

/**
 * @param {(code:string)=>void} onPick
 * @param {Record<string,number>} counts  open hikes per region
 * @param {Set<string>} visited           regions you have actually hiked in
 *
 * The map doubles as the COLLECTION BOARD. A state you have walked in
 * is filled and ticked; one you haven't is an outline waiting to be
 * claimed. Same element, twice the job — no extra screen, and the
 * hero of the app becomes the thing you are filling in.
 */
export function ausMap(onPick, counts = {}, visited = new Set()) {
  const wrap = el("div", { class: "ausmap" });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 90 74");
  svg.setAttribute("class", "ausmap__svg");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <defs>
      <linearGradient id="ausfill" x1=".1" y1="0" x2=".9" y2="1">
        <stop offset="0"   stop-color="#F7C86B"/>
        <stop offset=".45" stop-color="var(--amber)"/>
        <stop offset="1"   stop-color="var(--brand-soft)"/>
      </linearGradient>
      <filter id="auswash" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="11" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="0.9"/>
      </filter>
    </defs>
    <g filter="url(#auswash)">
      <path d="${OUTLINE}" fill="url(#ausfill)" opacity=".94"/>
      <ellipse cx="67" cy="66" rx="4.6" ry="3.6" fill="url(#ausfill)" opacity=".94"/>
    </g>`;

  wrap.append(svg);

  /* a real element, announced, in its own language */
  wrap.append(el("span", {
    class: "ausmap__welcome",
    lang: "woi",
    text: "Womindjeka!",
    title: "Woiwurrung for welcome",
  }));

  const layer = el("div", { class: "ausmap__pins", role: "group", "aria-label": "Choose a region" });
  REGIONS.forEach((r) => {
    const n = counts[r.code] || 0;
    const been = visited.has(r.code);
    layer.append(el("button", {
      class: `ausmap__pin ${been ? "is-visited" : ""}`,
      type: "button",
      style: `left:${(r.x / 90) * 100}%; top:${(r.y / 74) * 100}%`,
      "aria-label":
        (been ? `${r.name}, visited. ` : `${r.name}, not visited yet. `) +
        (n ? `${n} hike${n === 1 ? "" : "s"} on offer.` : "No hikes on offer."),
      onclick: () => { say(r.name); onPick(r.code); },
    }, [
      been ? el("span", { class: "ausmap__tick", html: TICK, "aria-hidden": "true" }) : null,
      el("span", { text: r.code }),
      n ? el("span", { class: "ausmap__count", text: String(n) }) : null,
    ]));
  });
  wrap.append(layer);

  return wrap;
}

const TICK = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
   stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>`;

export const ALL_REGIONS = REGIONS.map((r) => r.code);

export const regionName = (code) =>
  (REGIONS.find((r) => r.code === code) || {}).name || code;
