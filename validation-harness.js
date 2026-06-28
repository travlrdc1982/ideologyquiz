// Validation harness for the distance-from-ideal model.
// score = closeness to the all-7 ideal; radius (distance from center) = the score deficit;
// direction = which tensional value pulls you off equilibrium. Nihilism = abyss gate only.
const fs = require("fs");
const path = require("path");

const CARD_NAMES = { CI: "Communitarian Individualism", ME: "Moral Equality", RP: "Republicanism", FE: "Federalism" };
const clamp01 = v => Math.max(0, Math.min(1, v));

function model(input) {
  const { sliderX: X, sliderY: Y, CI, ME, RP, FE, nihil } = input;
  const cardinalX = (ME - CI) / 6, cardinalY = (RP - FE) / 6;
  const dCI = (7 - CI) / 6, dME = (7 - ME) / 6, dRP = (7 - RP) / 6, dFE = (7 - FE) / 6;
  const D = Math.min(1, Math.sqrt((dCI * dCI + dME * dME + dRP * dRP + dFE * dFE + X * X + Y * Y) / 6));
  const Lx = X + cardinalX, Ly = Y + cardinalY;
  const rejectsFrame = nihil >= 6;
  const score = rejectsFrame ? 0 : Math.round(100 * clamp01(1 - Math.pow(D, 1.4)));
  const label = rejectsFrame ? "ALIENATED"
    : score >= 85 ? "AMERICAN IDEOLOGUE"
    : score >= 70 ? "AMERICAN PATRIOT"
    : score >= 50 ? "AMERICAN SKEPTIC"
    : "DETACHED REJECTOR";
  const xKey = Lx < 0 ? "CI" : "ME", yKey = Ly >= 0 ? "RP" : "FE";
  const T = { CI_RP: "Constitutional Liberty", CI_FE: "Local Liberty", ME_RP: "Civic Equality", ME_FE: "Democratic Equality" };
  const family = T[`${xKey}_${yKey}`];
  const title = rejectsFrame ? "The Center Void" : D < 0.22 ? "The Synthesized Core" : family;
  const lean = Math.hypot(Lx, Ly) < 0.1 ? "(balanced)" : Math.abs(Lx) >= Math.abs(Ly) ? (Lx < 0 ? "Liberty" : "Equality") : (Ly > 0 ? "National" : "Democratic");
  const dominant = ["CI", "ME", "RP", "FE"].sort((a, b) => ({ CI, ME, RP, FE }[b]) - ({ CI, ME, RP, FE }[a]))[0];
  return { D: +D.toFixed(3), score, label, title, family, pulledToward: lean, dominant: CARD_NAMES[dominant] };
}

const scenarios = [
  { s: "Ideal 7,7,7,7 middle", sliderX: 0, sliderY: 0, CI: 7, ME: 7, RP: 7, FE: 7, nihil: 2 },
  { s: "6,6,6,6 middle", sliderX: 0, sliderY: 0, CI: 6, ME: 6, RP: 6, FE: 6, nihil: 2 },
  { s: "5,5,5,5 middle", sliderX: 0, sliderY: 0, CI: 5, ME: 5, RP: 5, FE: 5, nihil: 2 },
  { s: "4,4,4,4 middle", sliderX: 0, sliderY: 0, CI: 4, ME: 4, RP: 4, FE: 4, nihil: 2 },
  { s: "Under-hold ME 7,1,7,7", sliderX: 0, sliderY: 0, CI: 7, ME: 1, RP: 7, FE: 7, nihil: 2 },
  { s: "Liberty slider, full cardinals", sliderX: -1, sliderY: 0, CI: 7, ME: 7, RP: 7, FE: 7, nihil: 2 },
  { s: "Equality lean", sliderX: 0.45, sliderY: 0.2, CI: 4, ME: 7, RP: 6, FE: 4, nihil: 2 },
  { s: "Hollow & extreme 2,2,2,2 + lean", sliderX: -0.6, sliderY: -0.6, CI: 3, ME: 1, RP: 1, FE: 3, nihil: 3 },
  { s: "High nihilism (abyss)", sliderX: 0, sliderY: 0, CI: 6, ME: 6, RP: 6, FE: 6, nihil: 6 },
];

const rows = scenarios.map(sc => ({ scenario: sc.s, ...model(sc) }));
console.table(rows.map(r => ({ scenario: r.scenario, D: r.D, score: r.score, label: r.label.replace("AMERICAN ", "").replace("DETACHED ", ""), title: r.title.replace("The ", ""), pulled: r.pulledToward })));

// ---- invariants ----
const m = o => model(o);
const checks = [];
const ck = (name, ok) => checks.push({ check: name, pass: ok });
ck("ideal scores 100 + Synthesized Core", m(scenarios[0]).score === 100 && m(scenarios[0]).title === "The Synthesized Core");
ck("5,5,5,5 scores higher than 4,4,4,4", m(scenarios[2]).score > m(scenarios[3]).score);
ck("under-holding ME pulls toward Liberty", m(scenarios[4]).pulledToward === "Liberty");
ck("high nihilism -> ALIENATED / Void", m(scenarios[8]).label === "ALIENATED" && m(scenarios[8]).title === "The Center Void");
// monotonic: score strictly decreases as D increases (radius == score deficit)
const grid = [];
for (let d = 0; d <= 1.0001; d += 0.1) grid.push({ sliderX: 0, sliderY: 0, CI: 7 - d * 6, ME: 7 - d * 6, RP: 7 - d * 6, FE: 7 - d * 6, nihil: 2 });
let mono = true;
for (let i = 1; i < grid.length; i++) if (m(grid[i]).score > m(grid[i - 1]).score) mono = false;
ck("score decreases monotonically as you leave center", mono);
console.table(checks);

const headers = Object.keys(rows[0]);
const esc = v => { const t = v == null ? "" : String(v); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
fs.writeFileSync(path.join(process.cwd(), "validation-scenarios.csv"),
  [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\r\n"), "utf8");

const failed = checks.filter(c => !c.pass);
if (failed.length) { console.error(`FAILED ${failed.length} invariant(s)`); process.exit(1); }
console.log("All invariants pass.");
