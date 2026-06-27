const fs = require("fs");
const path = require("path");

const CARD_NAMES = {
  CI: "Communitarian Individualism",
  ME: "Moral Equality",
  RP: "Republicanism",
  FE: "Federalism",
};

const scenarios = [
  { scenario: "Neutral middle", sliderX: 0, sliderY: 0, CI: 4, ME: 4, RP: 4, FE: 4, nihil: 4, expect: "Quiet Middle" },
  { scenario: "Synthesized core", sliderX: 0, sliderY: 0, CI: 7, ME: 7, RP: 7, FE: 7, nihil: 2, expect: "Synthesized Core" },
  { scenario: "Weak cardinals, centered slider", sliderX: 0, sliderY: 0, CI: 2, ME: 2, RP: 2, FE: 2, nihil: 3, expect: "Quiet Middle" },
  { scenario: "Mild cardinal center", sliderX: 0, sliderY: 0, CI: 5, ME: 5, RP: 5, FE: 5, nihil: 3, expect: "Quiet Middle" },
  { scenario: "Moderate cardinal center", sliderX: 0, sliderY: 0, CI: 6, ME: 6, RP: 6, FE: 6, nihil: 2, expect: "Synthesized Core" },
  { scenario: "Local Liberty", sliderX: -0.45, sliderY: -0.45, CI: 7, ME: 5, RP: 4, FE: 7, nihil: 2, expect: "Local Liberty" },
  { scenario: "Constitutional Liberty", sliderX: -0.45, sliderY: 0.45, CI: 7, ME: 5, RP: 7, FE: 4, nihil: 2, expect: "Constitutional Liberty" },
  { scenario: "Civic Equality", sliderX: 0.45, sliderY: 0.45, CI: 4, ME: 7, RP: 7, FE: 4, nihil: 2, expect: "Civic Equality" },
  { scenario: "Democratic Equality", sliderX: 0.45, sliderY: -0.45, CI: 4, ME: 7, RP: 4, FE: 7, nihil: 2, expect: "Democratic Equality" },
  { scenario: "CI high, ME low, RP slider", sliderX: 0, sliderY: 0.9, CI: 6.5, ME: 1.5, RP: 4.5, FE: 4.5, nihil: 2, expect: "Fragmented Constitutional Liberty" },
  { scenario: "ME high, CI low, RP slider", sliderX: 0, sliderY: 0.9, CI: 1.5, ME: 6.5, RP: 4.5, FE: 4.5, nihil: 2, expect: "Fragmented Civic Equality" },
  { scenario: "High nihil center", sliderX: 0, sliderY: 0, CI: 6, ME: 6, RP: 6, FE: 6, nihil: 6, expect: "Ideological Void" },
];

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function typology(s) {
  const xKey = s.adjX < 0 ? "CI" : "ME";
  const yKey = s.adjY >= 0 ? "RP" : "FE";
  const types = {
    CI_RP: { name: "Constitutional Liberty", extreme: "Managerial Liberty" },
    CI_FE: { name: "Local Liberty", extreme: "Populist Liberty" },
    ME_RP: { name: "Civic Equality", extreme: "State Equality" },
    ME_FE: { name: "Democratic Equality", extreme: "Communal Equality" },
  };
  const base = types[`${xKey}_${yKey}`] || types.ME_RP;
  const fragmented = s.cardinalCurved < 0.42 || s.centerScore < 0.45;
  const extreme = s.rnorm > 0.55;
  return {
    ...base,
    label: extreme ? base.extreme : fragmented ? `Fragmented ${base.name}` : base.name,
  };
}

function scoreScenario(input) {
  const cardScore = { CI: input.CI, ME: input.ME, RP: input.RP, FE: input.FE };
  const cardinalZ = Object.fromEntries(Object.entries(cardScore).map(([key, value]) => [key, (value - 4) / 3]));
  const cardinalAlignment = mean(Object.values(cardinalZ));
  const cardinalLinear = clamp01((cardinalAlignment + 1) / 2);
  const cardinalCurved = Math.pow(cardinalLinear, 1.8);
  const cardinalX = (input.ME - input.CI) / 6;
  const cardinalY = (input.RP - input.FE) / 6;
  const adjX = (input.sliderX + cardinalX) / 2;
  const adjY = (input.sliderY + cardinalY) / 2;
  const rnorm = Math.min(Math.hypot(adjX, adjY) / Math.SQRT2, 1);
  const centerScore = 1 - rnorm;
  const nihilGate = input.nihil >= 6 ? 0 : input.nihil >= 5 ? 0.35 : input.nihil >= 4.5 ? 0.65 : 1;
  const aiScore = Math.round(100 * clamp01(cardinalCurved * (0.35 + 0.65 * centerScore) * nihilGate));
  const dominant = Object.keys(cardScore).sort((a, b) => cardScore[b] - cardScore[a])[0];
  const s = { ...input, cardScore, cardinalAlignment, cardinalLinear, cardinalCurved, cardinalX, cardinalY, adjX, adjY, rnorm, centerScore, nihilGate, aiScore, dominant };
  const CENTRAL = rnorm < 0.30;
  const WHOLE = cardinalCurved > 0.60;
  const label = input.nihil >= 6 ? "Ideological Void" : CENTRAL && WHOLE ? "Synthesized Core" : CENTRAL ? "Quiet Middle" : typology(s).label;
  return { ...s, label, dominantName: CARD_NAMES[dominant] };
}

const rows = scenarios.map((scenario) => {
  const scored = scoreScenario(scenario);
  const passed = scored.label === scenario.expect;
  return {
    scenario: scenario.scenario,
    expected: scenario.expect,
    actual: scored.label,
    pass: passed,
    score: scored.aiScore,
    x: scored.adjX.toFixed(4),
    y: scored.adjY.toFixed(4),
    center_score: scored.centerScore.toFixed(4),
    cardinal_alignment: scored.cardinalAlignment.toFixed(4),
    cardinal_curved: scored.cardinalCurved.toFixed(4),
    cardinal_x: scored.cardinalX.toFixed(4),
    cardinal_y: scored.cardinalY.toFixed(4),
    nihil_gate: scored.nihilGate.toFixed(2),
    dominant: scored.dominant,
    dominant_name: scored.dominantName,
  };
});

const headers = Object.keys(rows[0]);
const escapeCsv = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\r\n");
const output = path.join(process.cwd(), "validation-scenarios.csv");
fs.writeFileSync(output, csv, "utf8");

console.table(rows.map(({ scenario, expected, actual, pass, score, x, y }) => ({ scenario, expected, actual, pass, score, x, y })));
const failures = rows.filter((row) => !row.pass);
if (failures.length) {
  console.error(`Validation failed for ${failures.length} scenario(s). See ${output}`);
  process.exit(1);
}
console.log(`Validation passed. Wrote ${output}`);
