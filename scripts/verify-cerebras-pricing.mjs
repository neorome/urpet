import { CEREBRAS_PRICING } from "../lib/cerebras-pricing.js";

const response = await fetch(CEREBRAS_PRICING.source, {
  headers: { accept: "application/json" },
  signal: AbortSignal.timeout(10_000)
});

if (!response.ok) {
  throw new Error(`Cerebras pricing endpoint returned HTTP ${response.status}. Do not enable the guide.`);
}

const model = await response.json();
const actual = {
  model: model.id,
  inputUsdPerToken: model.pricing?.prompt,
  outputUsdPerToken: model.pricing?.completion
};
const expected = {
  model: CEREBRAS_PRICING.model,
  inputUsdPerToken: CEREBRAS_PRICING.inputUsdPerToken,
  outputUsdPerToken: CEREBRAS_PRICING.outputUsdPerToken
};

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `Cerebras pricing changed. Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}. `
    + "Update the pinned rates, cost tests, and budget review before enabling the guide."
  );
}

console.log(
  `Cerebras pricing gate passed for ${actual.model}: `
  + `$${Number(actual.inputUsdPerToken) * 1_000_000}/M input, `
  + `$${Number(actual.outputUsdPerToken) * 1_000_000}/M output `
  + `(pin effective ${CEREBRAS_PRICING.effectiveDate}).`
);
