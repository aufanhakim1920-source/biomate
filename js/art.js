/* ============================================================
   Biomate — generated artwork

   Every hike needs a photo and there are none offline. Rather than
   ship broken <img>s or make every card identical, each hike gets a
   deterministic drawn landscape: layered ridgelines, a sun, a haze
   band, seeded from its own id.

   This is the Peak & Pan rule taken one step further — a missing
   image must never break a screen, and if it can also be *pleasant*
   the empty state stops being an apology.

   Pure SVG in a data URI: no network, no CORS, no decode cost worth
   measuring, and it renders identically in a headless screenshot.
   ============================================================ */

/* xorshift so the same id always draws the same mountain */
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5;  h >>>= 0;
    return h / 4294967296;
  };
}

const PALETTES = [
  { sky: ["#F6C86A", "#E88A4A"], sun: "#FFF3D6", ridges: ["#B8552F", "#8E3F2A", "#5E2A22"] },
  { sky: ["#F2A65A", "#C9552F"], sun: "#FFE9C2", ridges: ["#A64A33", "#7A3528", "#4A2320"] },
  { sky: ["#9FC7A6", "#4E8C63"], sun: "#F4FFE8", ridges: ["#3E6B4C", "#2C4E3A", "#1B3226"] },
  { sky: ["#F4B9A0", "#B0616B"], sun: "#FFEDE4", ridges: ["#8E4A57", "#653744", "#3E2330"] },
  { sky: ["#EBD5A8", "#C08A4E"], sun: "#FFF8E7", ridges: ["#8C6234", "#63452A", "#3B2A1C"] },
];

/**
 * @param {string} seed  anything stable — a hike id
 * @param {number} w
 * @param {number} h
 * @returns {string} a data: URI you can put straight in src
 */
export function landscape(seed = "biomate", w = 800, h = 1000) {
  const r = rng(seed);
  const p = PALETTES[Math.floor(r() * PALETTES.length)];

  const sunX = 0.2 + r() * 0.6;
  const sunY = 0.16 + r() * 0.16;
  const sunR = 40 + r() * 46;

  /* three ridgelines, each lower-contrast and higher up than the last */
  const ridges = p.ridges.map((fill, i) => {
    const baseY = h * (0.5 + i * 0.16);
    const amp = h * (0.13 - i * 0.028);
    const steps = 6 + Math.floor(r() * 4);
    let d = `M0 ${h} L0 ${baseY}`;
    for (let s = 0; s <= steps; s++) {
      const x = (w / steps) * s;
      const peak = baseY - amp * (0.35 + r());
      const cx = x - w / steps / 2;
      d += ` Q${cx} ${peak} ${x} ${baseY - amp * (r() * 0.5)}`;
    }
    d += ` L${w} ${h} Z`;
    return `<path d="${d}" fill="${fill}"/>`;
  }).join("");

  /* a few birds, because an empty sky reads as unfinished */
  let birds = "";
  const n = Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const bx = 80 + r() * (w - 160);
    const by = h * (0.16 + r() * 0.2);
    const s = 8 + r() * 7;
    birds += `<path d="M${bx} ${by} q${s / 2} ${-s / 2} ${s} 0 q${s / 2} ${-s / 2} ${s} 0"
              fill="none" stroke="rgba(60,30,20,.45)" stroke-width="2.2" stroke-linecap="round"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/>
  </linearGradient>
  <radialGradient id="g"><stop offset="0" stop-color="${p.sun}" stop-opacity=".95"/>
    <stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<circle cx="${(sunX * w).toFixed(0)}" cy="${(sunY * h).toFixed(0)}" r="${(sunR * 2.6).toFixed(0)}" fill="url(#g)"/>
<circle cx="${(sunX * w).toFixed(0)}" cy="${(sunY * h).toFixed(0)}" r="${sunR.toFixed(0)}" fill="${p.sun}" opacity=".9"/>
${birds}${ridges}
<rect width="${w}" height="${h}" fill="none"/>
</svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/\s+/g, " "));
}

/** A round avatar-ish blob, same idea at a smaller size. */
export function face(seed = "x", size = 120) {
  const r = rng("face" + seed);
  const hue = Math.floor(r() * 360);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<rect width="100" height="100" fill="hsl(${hue} 55% 82%)"/>
<circle cx="50" cy="40" r="18" fill="hsl(${hue} 40% 96%)"/>
<path d="M18 100c0-20 14-32 32-32s32 12 32 32Z" fill="hsl(${hue} 42% 92%)"/>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/\s+/g, " "));
}
