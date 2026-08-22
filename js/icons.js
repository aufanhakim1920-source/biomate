/* ============================================================
   Biomate — inline SVG icons

   Inline rather than an icon font or sprite sheet: they inherit
   `currentColor`, so the nav's active state and the pressed state
   both work with no extra rules, and there is no extra request.

   Rounded caps and joins on purpose. Square/miter reads as
   engineering — right for a schematic, wrong for an app about
   making friends outdoors.
   ============================================================ */

const wrap = (paths, { size = 24, fill = "none" } = {}) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const icons = {
  /* ---- bottom nav, in the Figma's order ---- */
  map: (o) => wrap(`<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 7 9 4Z"/><path d="M9 4v13"/><path d="M15 7v12.5"/>`, o),
  camera: (o) => wrap(`<path d="M3 9a2 2 0 0 1 2-2h1.6a2 2 0 0 0 1.7-.9l.8-1.2A2 2 0 0 1 10.8 4h2.4a2 2 0 0 1 1.7.9l.8 1.2a2 2 0 0 0 1.7.9H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><circle cx="12" cy="13" r="3.2"/>`, o),
  home: (o) => wrap(`<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z"/>`, o),
  chat: (o) => wrap(`<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h8A2.5 2.5 0 0 1 17 6.5v4A2.5 2.5 0 0 1 14.5 13H9l-3.5 3v-3A1.5 1.5 0 0 1 4 11.5v-5Z"/><path d="M17 9h.5A2.5 2.5 0 0 1 20 11.5v4A2.5 2.5 0 0 1 17.5 18H17l-2 2v-2"/>`, o),
  cards: (o) => wrap(`<rect x="7.5" y="4" width="11" height="15" rx="2.5"/><path d="M5.2 7.2 3.4 8a2 2 0 0 0-1.1 2.6l3.2 8.2"/>`, o),

  /* ---- actions ---- */
  back: (o) => wrap(`<path d="M14.5 6 9 12l5.5 6"/>`, o),
  close: (o) => wrap(`<path d="m6 6 12 12M18 6 6 18"/>`, o),
  check: (o) => wrap(`<path d="m5 12.5 4.5 4.5L19 7"/>`, o),
  arrow: (o) => wrap(`<path d="M5 12h13m-5.5-5.5L18 12l-5.5 5.5"/>`, o),
  send: (o) => wrap(`<path d="M4.5 12 20 4.5 14 20l-2.5-6.5L4.5 12Z"/>`, o),
  search: (o) => wrap(`<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>`, o),
  plus: (o) => wrap(`<path d="M12 5v14M5 12h14"/>`, o),

  /* ---- the Plan your activity buttons ---- */
  calendar: (o) => wrap(`<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>`, o),
  pin: (o) => wrap(`<path d="M12 21s6.5-5.4 6.5-10a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21Z"/><circle cx="12" cy="11" r="2.4"/>`, o),
  gear: (o) => wrap(`<path d="M6 7h12l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H9a1.8 1.8 0 0 1-1.8-1.6L6 7Z"/><path d="M9.5 7V5.2A2.2 2.2 0 0 1 11.7 3h.6a2.2 2.2 0 0 1 2.2 2.2V7"/>`, o),

  /* ---- details ---- */
  people: (o) => wrap(`<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 6.6a3 3 0 0 1 0 5.8M17.5 19.5c0-2-.7-3.6-1.8-4.6"/>`, o),
  alert: (o) => wrap(`<path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>`, o),
  bookmark: (o) => wrap(`<path d="M6.5 4h11v16l-5.5-4-5.5 4V4Z"/>`, o),
  flame: (o) => wrap(`<path d="M12 3s4.5 3.8 4.5 8a4.5 4.5 0 0 1-9 0c0-1.6.8-3 .8-3S9 11 10.2 11c1.4 0 1.6-2.5 1.8-8Z"/>`, o),
  clock: (o) => wrap(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>`, o),
  route: (o) => wrap(`<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 17c4.5-1 5-3 5-5.5S14 6.5 15.5 6"/>`, o),
  volume: (o) => wrap(`<path d="M4 9.5h3L11 6v12l-4-3.5H4v-5Z"/><path d="M14.5 9.5a3.5 3.5 0 0 1 0 5M17 7a7 7 0 0 1 0 10"/>`, o),
  mute: (o) => wrap(`<path d="M4 9.5h3L11 6v12l-4-3.5H4v-5Z"/><path d="m15 9.5 4 5M19 9.5l-4 5"/>`, o),
  leaf: (o) => wrap(`<path d="M20 4C10 4 4 8.5 4 15a5 5 0 0 0 5 5c6.5 0 11-6 11-16Z"/><path d="M8.5 15.5C11 13 14 11.5 17 11"/>`, o),
  /* "what you missed" — an upright bell, not a tilted ringing one.
     A tilted bell is the icon for an alert going off right now; this
     opens a list of things that already happened. */
  bell: (o) => wrap(`<path d="M6.5 17V11a5.5 5.5 0 0 1 11 0v6"/><path d="M4.5 17h15"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>`, o),
};

/** Insert an icon into a container element by name. */
export function icon(name, opts) {
  const f = icons[name];
  return f ? f(opts) : "";
}
