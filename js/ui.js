/* ============================================================
   Biomate — shared UI helpers
   Small, boring, and used by every screen.
   ============================================================ */

import { icon } from "./icons.js";

/** Create an element. `props.html` sets innerHTML, `props.text` textContent. */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style") node.setAttribute("style", v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .forEach((c) => node.append(c));
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** An icon-only button that still has an accessible name. */
export function iconButton(name, label, onClick, cls = "iconbtn") {
  return el("button", {
    class: cls,
    type: "button",
    "aria-label": label,
    html: icon(name),
    onclick: onClick,
  });
}

/* ---------------- toast ---------------- */
let toastEl = null;
let toastTimer = null;

export function toast(msg) {
  if (!toastEl) {
    toastEl = el("div", { class: "toast", role: "status", "aria-live": "polite" });
    document.body.append(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.dataset.show = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.dataset.show = "0"; }, 2600);
}

/* ---------------- formatting ---------------- */

export function fmtDate(iso) {
  if (!iso) return "Date to be decided";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d)) return "Date to be decided";
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

export function fmtShortDate(iso) {
  if (!iso) return "TBD";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return isNaN(d) ? "TBD" : d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function fmtDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function fmtDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/** Difficulty is never colour-only — the word travels with it. */
export const difficultyLabel = (d) =>
  ({ easy: "Easy", moderate: "Moderate", hard: "Hard" }[d] || "Moderate");

/* ---------------- images ---------------- */

/**
 * A photo that can never break a screen. A missing or failed image
 * falls back to drawn artwork in the brand colours, per the Peak &
 * Pan rule that absent media must degrade, not explode.
 */
export function photo(url, alt, cls = "deck__photo") {
  if (!url) return el("div", { class: "deck__placeholder", role: "img", "aria-label": alt || "No photo yet" });
  const img = el("img", { class: cls, src: url, alt: alt || "", loading: "lazy", decoding: "async" });
  img.addEventListener("error", () => {
    img.replaceWith(el("div", { class: "deck__placeholder", role: "img", "aria-label": alt || "Photo unavailable" }));
  });
  return img;
}

/** Deterministic pastel from a string — used for avatar fallbacks. */
export function tint(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 82%)`;
}

export function avatar(url, name, cls = "avatar") {
  if (url) return el("img", { class: cls, src: url, alt: "" , loading: "lazy" });
  const initials = (name || "?").trim().slice(0, 1).toUpperCase();
  return el("div", {
    class: cls,
    "aria-hidden": "true",
    style: `background:${tint(name)};display:grid;place-items:center;font-weight:700;color:#3a2f28`,
    text: initials,
  });
}
