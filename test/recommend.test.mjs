/* ============================================================
   Biomate — the recommender, checked against its own claims

   Run it:   node test/recommend.test.mjs

   This exists because the scorer says things out loud. It does not
   show a percentage; it shows a SENTENCE — "near Melbourne", "about
   your pace". A wrong number is a bad ranking, but a wrong sentence
   is a lie printed on a card, so the sentences are what this file
   guards hardest.

   Check 1 is a real bug this file was written to catch. The area test
   ended with `area.includes(place)`, and when a hike had no
   location_name, `place` was "" — and area.includes("") is ALWAYS
   true. Every unplaced hike scored the full area weight and claimed
   to be near you, including ones whose region said Alpine NP.

   No test framework — Node, one file, no dependencies.
   ============================================================ */

import { scoreHike, rank, searchHikes } from "../js/recommend.js";

const out = [];
const ok = (name, cond, detail) => out.push(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);

const me = { id: "me", home_area: "Melbourne", experience: "beginner",
             prefs: { interests: ["photography"] } };
const friends = new Set(["friendA"]);
const ctx = (goingBy = {}) => ({ me, friends, goingBy });
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/* ---- 1. the false "near you" ---- */
const nowhere = scoreHike({ id: "x", tags: [], difficulty: "moderate" }, ctx());
ok("a hike with no location is not 'near' anywhere",
   nowhere.score === 0 && !nowhere.reasons.some((r) => r.startsWith("near")),
   `score ${nowhere.score}, reasons [${nowhere.reasons}]`);

const alpine = scoreHike({ id: "y", region: "Alpine NP", tags: [], difficulty: "moderate" }, ctx());
ok("a hike in Alpine NP is never 'near Melbourne'",
   !alpine.reasons.some((r) => r.includes("Melbourne")),
   `reasons [${alpine.reasons}]`);

/* ---- 2. ...without breaking the case the reverse test exists for ---- */
const wide = scoreHike({ id: "z", location_name: "Melbourne", tags: [], difficulty: "moderate" },
                       { ...ctx(), me: { ...me, home_area: "Melbourne, VIC" } });
ok("home 'Melbourne, VIC' still matches a hike at 'Melbourne'",
   wide.reasons.some((r) => r.includes("Melbourne")), `reasons [${wide.reasons}]`);

/* ---- 3. fit outranks social pressure ---- */
const easyLocal  = { id: "h1", location_name: "Melbourne", region: "VIC", difficulty: "easy",
                     tags: ["photography"], proposed_date: inDays(4) };
const hardAlpine = { id: "h2", location_name: "Mt Feathertop", region: "Alpine NP", difficulty: "hard",
                     tags: ["photography"], proposed_date: inDays(4) };
const goingBy = { h1: [], h2: ["friendA", "someoneElse"] };
const a = scoreHike(easyLocal, ctx(goingBy)).score;
const b = scoreHike(hardAlpine, ctx(goingBy)).score;
ok("a beginner is not pushed onto hard ground by a friend alone",
   a > b, `easy local ${a} vs hard alpine with a friend ${b}`);

/* ---- 4. every reason is a sentence, never a number ---- */
const allReasons = [...scoreHike(easyLocal, ctx(goingBy)).reasons,
                    ...scoreHike(hardAlpine, ctx(goingBy)).reasons];
ok("no reason ever contains a score or a percentage",
   !allReasons.some((r) => /\d+\s*%|score|match\b/i.test(r)), `[${allReasons}]`);

/* ---- 5. ranking is stable on ties ---- */
const tied = [{ id: "t1" }, { id: "t2" }, { id: "t3" }];
const once = rank(tied, ctx()).map((r) => r.hike.id).join(",");
const twice = rank(tied, ctx()).map((r) => r.hike.id).join(",");
ok("tied hikes keep their arrival order, every render",
   once === "t1,t2,t3" && once === twice, once);

/* ---- 6. search is AND, not OR ---- */
const pool = [
  { id: "a", title: "Photography walk", location_name: "Melbourne", tags: ["photography"] },
  { id: "b", title: "Photography walk", location_name: "Sydney",    tags: ["photography"] },
  { id: "c", title: "Trail run",        location_name: "Melbourne", tags: ["running"] },
];
ok("'photo melbourne' matches only the hike that is both",
   searchHikes(pool, "photo melbourne").map((h) => h.id).join(",") === "a");
ok("an empty query returns everything, not nothing",
   searchHikes(pool, "   ").length === 3);

console.log(out.join("\n"));
console.log(out.some((l) => l.startsWith("FAIL")) ? "\nFAILED" : "\nall good");
process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
